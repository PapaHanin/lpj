import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  ArrowUp,
  ArrowDown,
  Calculator,
  Check,
  X,
  FileText,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLpjStore } from '../store/lpjStore';
import { PajakRowItem, JenisPajak } from '../types';
import { formatToSlashDate } from '../utils/dateUtils';
import { hitungPajakDariBruto } from '../utils/pajakUtils';
import { triggerPrint } from '../utils/printHelper';
import { terbilangRupiah } from '../utils/terbilang';

export const BkuPajakView: React.FC = () => {
  const {
    profile,
    transactions,
    pajakRows,
    addPajakRow,
    updatePajakRow,
    deletePajakRow,
    movePajakRow,
    syncPajakFromTransactions,
    loadSamplePajakRows,
    openProfileModal,
    showToast,
  } = useLpjStore();

  // Daftar transaksi dari BKU Tunai (pengeluaran tunai) untuk dipilih langsung
  const bkuTunaiTransactions = useMemo(() => {
    const tunaiExpenses = transactions.filter(
      (t) => t.metode === 'TUNAI' && t.pengeluaran > 0
    );
    if (tunaiExpenses.length > 0) return tunaiExpenses;
    return transactions.filter((t) => t.pengeluaran > 0);
  }, [transactions]);

  // Modal Tambah Baris / Paket Pajak
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'paket_otomatis' | 'baris_tunggal'>('paket_otomatis');
  const [selectedBkuTunaiTxId, setSelectedBkuTunaiTxId] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState('01/08/2026');
  const [formNomorBukti, setFormNomorBukti] = useState('');
  const [formUraian, setFormUraian] = useState('Pembelian Bahan matrial Bangunan (Nota Terlampir)');
  const [formNominalBelanja, setFormNominalBelanja] = useState<number>(3000000);
  const [formJenisPajak, setFormJenisPajak] = useState<JenisPajak>('PPN');
  const [formNominalPajak, setFormNominalPajak] = useState<number>(
    hitungPajakDariBruto(3000000, 'PPN')
  );
  const [formNominalPajakKedua, setFormNominalPajakKedua] = useState<number>(
    hitungPajakDariBruto(3000000, 'PPh 22')
  );
  const [formSudahDibayar, setFormSudahDibayar] = useState<boolean>(true);
  const [formTampilkanBarisBelanja, setFormTampilkanBarisBelanja] = useState<boolean>(true);

  // Single row fields
  const [singlePenerimaan, setSinglePenerimaan] = useState<number>(0);
  const [singlePengeluaran, setSinglePengeluaran] = useState<number>(0);
  const [singleIsTaxRow, setSingleIsTaxRow] = useState<boolean>(true);

  // Editing Row State
  const [editingRow, setEditingRow] = useState<PajakRowItem | null>(null);

  // Calculate rows with running tax balance matching format_bku_pajak_d1c829d3.png
  const computedRows = useMemo(() => {
    let runningSaldoPajak = 0;
    let totalPenerimaanPajak = 0;
    let totalPengeluaranPajak = 0;
    let totalBelanjaBruto = 0;

    const list = pajakRows.map((row, idx) => {
      const tanggalFormatted = formatToSlashDate(row.tanggal);
      const isTax =
        row.isTaxRow !== undefined
          ? row.isTaxRow
          : /^(diterima|dibayarkan|dipungut|disetor|ppn|pph)/i.test(row.uraian.trim());

      if (isTax) {
        runningSaldoPajak += (row.penerimaan || 0) - (row.pengeluaran || 0);
        totalPenerimaanPajak += row.penerimaan || 0;
        totalPengeluaranPajak += row.pengeluaran || 0;
      } else {
        totalBelanjaBruto += row.pengeluaran || 0;
      }

      return {
        ...row,
        noUrut: idx + 1,
        tanggalFormatted,
        isTax,
        saldo: isTax ? runningSaldoPajak : 0,
      };
    });

    return {
      rows: list,
      totalPenerimaanPajak,
      totalPengeluaranPajak,
      totalBelanjaBruto,
      saldoAkhirPajak: runningSaldoPajak,
    };
  }, [pajakRows]);

  const handleNominalBelanjaChange = (val: number, jenis: JenisPajak = formJenisPajak) => {
    setFormNominalBelanja(val);
    if (jenis === 'PPN + PPh 22') {
      setFormNominalPajak(hitungPajakDariBruto(val, 'PPN'));
      setFormNominalPajakKedua(hitungPajakDariBruto(val, 'PPh 22'));
    } else {
      setFormNominalPajak(hitungPajakDariBruto(val, jenis));
    }
  };

  const handleJenisPajakChange = (jenis: JenisPajak) => {
    setFormJenisPajak(jenis);
    if (jenis === 'PPN + PPh 22') {
      setFormNominalPajak(hitungPajakDariBruto(formNominalBelanja, 'PPN'));
      setFormNominalPajakKedua(hitungPajakDariBruto(formNominalBelanja, 'PPh 22'));
    } else {
      setFormNominalPajak(hitungPajakDariBruto(formNominalBelanja, jenis));
    }
  };

  // Saat user memilih transaksi dari BKU Tunai
  const handleSelectBkuTunaiTransaction = (txId: string) => {
    setSelectedBkuTunaiTxId(txId);
    if (!txId) return;
    const found = transactions.find((t) => t.id === txId);
    if (!found) return;

    const cleanTgl = formatToSlashDate(found.tanggal);
    const nilai = found.pengeluaran || found.penerimaan || 0;
    const uLower = found.uraian.toLowerCase();

    // Deteksi otomatis jenis pajak yang cocok berdasarkan uraian BKU Tunai
    let suggestedJenis: JenisPajak = formJenisPajak;
    if (uLower.includes('perencana') || uLower.includes('pengawas') || uLower.includes('konsultan')) {
      suggestedJenis = 'PPh 4%';
    } else if (uLower.includes('upah') || uLower.includes('tukang') || uLower.includes('fasilitator')) {
      suggestedJenis = 'PPh 21';
    }

    setFormTanggal(cleanTgl);
    setFormNomorBukti(found.nomorBukti || '');
    setFormUraian(found.uraian);
    setFormNominalBelanja(nilai);
    setFormJenisPajak(suggestedJenis);

    if (suggestedJenis === 'PPN + PPh 22') {
      setFormNominalPajak(hitungPajakDariBruto(nilai, 'PPN'));
      setFormNominalPajakKedua(hitungPajakDariBruto(nilai, 'PPh 22'));
    } else {
      setFormNominalPajak(hitungPajakDariBruto(nilai, suggestedJenis));
      setFormNominalPajakKedua(hitungPajakDariBruto(nilai, 'PPh 22'));
    }
  };

  // Jika user memilih uraian dari datalist ketik cepat
  const handleUraianInputChange = (val: string) => {
    setFormUraian(val);
    const matchedTx = bkuTunaiTransactions.find(
      (t) => t.uraian.toLowerCase() === val.trim().toLowerCase()
    );
    if (matchedTx) {
      setSelectedBkuTunaiTxId(matchedTx.id);
      setFormTanggal(formatToSlashDate(matchedTx.tanggal));
      setFormNomorBukti(matchedTx.nomorBukti || '');
      const nilai = matchedTx.pengeluaran || 0;
      handleNominalBelanjaChange(nilai, formJenisPajak);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDate = formatToSlashDate(formTanggal);
    const cleanUraian = formUraian.trim() || 'Pembelian Bahan matrial Bangunan (Nota Terlampir)';

    if (addMode === 'paket_otomatis') {
      // 1. Baris Pembelian / Belanja (opsional jika dicentang)
      if (formTampilkanBarisBelanja) {
        addPajakRow({
          tanggal: cleanDate,
          nomorBukti: formNomorBukti.trim(),
          uraian: cleanUraian,
          penerimaan: 0,
          pengeluaran: formNominalBelanja,
          isTaxRow: false,
        });
      }

      if (formJenisPajak === 'PPN + PPh 22') {
        // PPN 11%
        addPajakRow({
          tanggal: cleanDate,
          nomorBukti: '',
          uraian: `Diterima PPN ${cleanUraian}`,
          penerimaan: formNominalPajak,
          pengeluaran: 0,
          jenisPajak: 'PPN',
          isTaxRow: true,
        });
        if (formSudahDibayar) {
          addPajakRow({
            tanggal: cleanDate,
            nomorBukti: '',
            uraian: `Dibayarkan PPN ${cleanUraian}`,
            penerimaan: 0,
            pengeluaran: formNominalPajak,
            jenisPajak: 'PPN',
            isTaxRow: true,
          });
        }
        // PPh 22 (1,5%)
        addPajakRow({
          tanggal: cleanDate,
          nomorBukti: '',
          uraian: `Diterima PPh 22 ${cleanUraian}`,
          penerimaan: formNominalPajakKedua,
          pengeluaran: 0,
          jenisPajak: 'PPh 22',
          isTaxRow: true,
        });
        if (formSudahDibayar) {
          addPajakRow({
            tanggal: cleanDate,
            nomorBukti: '',
            uraian: `Dibayarkan PPh 22 ${cleanUraian}`,
            penerimaan: 0,
            pengeluaran: formNominalPajakKedua,
            jenisPajak: 'PPh 22',
            isTaxRow: true,
          });
        }
      } else {
        const labelPajak =
          formJenisPajak === 'PPh Pasal 4(2)' ? 'PPh 4%' : formJenisPajak;
        // 2. Baris Diterima Pajak
        addPajakRow({
          tanggal: cleanDate,
          nomorBukti: '',
          uraian: `Diterima ${labelPajak} ${cleanUraian}`,
          penerimaan: formNominalPajak,
          pengeluaran: 0,
          jenisPajak: formJenisPajak,
          isTaxRow: true,
        });
        // 3. Baris Dibayarkan Pajak (opsional jika langsung lunas/disetor)
        if (formSudahDibayar) {
          addPajakRow({
            tanggal: cleanDate,
            nomorBukti: '',
            uraian: `Dibayarkan ${labelPajak} ${cleanUraian}`,
            penerimaan: 0,
            pengeluaran: formNominalPajak,
            jenisPajak: formJenisPajak,
            isTaxRow: true,
          });
        }
      }

      showToast({
        type: 'success',
        title: 'Transaksi Pajak Ditambahkan',
        message: `Berhasil menambahkan pajak ${formJenisPajak} untuk "${cleanUraian}" (${cleanDate}).`,
      });
    } else {
      addPajakRow({
        tanggal: cleanDate,
        nomorBukti: formNomorBukti.trim(),
        uraian: cleanUraian,
        penerimaan: singlePenerimaan,
        pengeluaran: singlePengeluaran,
        isTaxRow: singleIsTaxRow,
      });
      showToast({
        type: 'success',
        title: 'Baris BKU Pajak Ditambahkan',
        message: `Baris "${cleanUraian}" berhasil ditambahkan ke Buku Pembantu Pajak.`,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    updatePajakRow(editingRow.id, {
      tanggal: formatToSlashDate(editingRow.tanggal),
      nomorBukti: editingRow.nomorBukti,
      uraian: editingRow.uraian,
      penerimaan: Number(editingRow.penerimaan) || 0,
      pengeluaran: Number(editingRow.pengeluaran) || 0,
      isTaxRow: editingRow.isTaxRow,
    });
    setEditingRow(null);
    showToast({
      type: 'success',
      title: 'Baris Pajak Diperbarui',
      message: 'Perubahan data pada Buku Pembantu Pajak berhasil disimpan.',
    });
  };

  const handleExportExcelPajak = () => {
    const aoa: (string | number)[][] = [
      [profile.namaSekolah],
      ['BUKU KAS UMUM'],
      ['BUKU PEMBANTU PAJAK'],
      [`BULAN : ${profile.bulanLaporan}`],
      [],
      ['Kepala Sekolah', `: ${profile.namaKepalaSekolah}`],
      ['Bendahara Pengeluaran', `: ${profile.namaBendahara}`],
      [],
      [
        'No Urut',
        'Tanggal',
        'Nomor Bukti',
        'Uraian',
        'Penerimaan Rp.',
        'Pengeluaran Rp.',
        'Saldo Rp.',
      ],
      ...computedRows.rows.map((r) => [
        r.noUrut,
        r.tanggalFormatted,
        r.nomorBukti || '',
        r.uraian,
        r.penerimaan > 0 ? `Rp ${r.penerimaan.toLocaleString('id-ID')}` : 'Rp -',
        r.pengeluaran > 0 ? `Rp ${r.pengeluaran.toLocaleString('id-ID')}` : 'Rp -',
        r.saldo > 0 ? `Rp ${r.saldo.toLocaleString('id-ID')}` : 'Rp -',
      ]),
      [
        '',
        '',
        '',
        'JUMLAH PAJAK (DITERIMA / DIBAYARKAN)',
        `Rp ${computedRows.totalPenerimaanPajak.toLocaleString('id-ID')}`,
        `Rp ${computedRows.totalPengeluaranPajak.toLocaleString('id-ID')}`,
        computedRows.saldoAkhirPajak > 0
          ? `Rp ${computedRows.saldoAkhirPajak.toLocaleString('id-ID')}`
          : 'Rp -',
      ],
      [],
      [
        `Pada hari ini : ${formatToSlashDate(profile.tanggalTutupBuku)} Buku Pembantu Pajak ditutup dengan posisi saldo pajak sebesar : Rp ${computedRows.saldoAkhirPajak.toLocaleString('id-ID')} (${terbilangRupiah(computedRows.saldoAkhirPajak)})`,
      ],
      [],
      [
        'Mengetahui,',
        '',
        '',
        'Ketua P2SP',
        '',
        `${profile.tempatPelunasan || 'Palasa'}, ${formatToSlashDate(profile.tanggalTutupBuku)}`,
        '',
      ],
      [
        `Kepala ${profile.namaSekolah}`,
        '',
        '',
        '',
        '',
        'Bendahara',
        '',
      ],
      [],
      [],
      [],
      [
        profile.namaKepalaSekolah,
        '',
        '',
        profile.namaKetuaP2S || profile.namaPanitia || 'Ketua P2SP',
        '',
        profile.namaBendahara,
        '',
      ],
      [
        `NIP. ${profile.nipKepalaSekolah}`,
        '',
        '',
        '-',
        '',
        `NIP. ${profile.nipBendahara}`,
        '',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    ];
    ws['!cols'] = [
      { wch: 9 },
      { wch: 13 },
      { wch: 15 },
      { wch: 46 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BKU PAJAK');
    const safeSchool = profile.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `BKU_PAJAK_${safeSchool}_${profile.bulanLaporan.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Ribbon - Hidden in Print */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#220738] p-4 rounded-2xl border border-amber-400/30 text-white shadow-lg print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              Buku Pembantu Pajak (BKU Pajak)
            </h2>
            <span className="bg-amber-400 text-purple-950 text-[11px] font-black px-2 py-0.5 rounded-md shadow-xs">
              Format Resmi Gambar (7 Kolom + 3 TTD)
            </span>
          </div>
          <p className="text-xs text-purple-200/90 mt-0.5">
            Pencatatan pemungutan dan penyetoran pajak (PPN, PPh 21, PPh 22, PPh 23, PPh Pasal 4 Ayat 2) lengkap dengan tanda tangan Kepala Sekolah, Ketua P2SP & Bendahara.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAddMode('paket_otomatis');
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-purple-950" />
            <span>+ Tambah Pajak / Belanja</span>
          </button>

          <button
            onClick={() => {
              if (
                window.confirm(
                  'Sinkronkan Buku Pembantu Pajak otomatis dari daftar belanja material pada BKU?'
                )
              ) {
                syncPajakFromTransactions();
                showToast({
                  type: 'success',
                  title: 'BKU Pajak Disinkronkan',
                  message:
                    'Data Buku Pembantu Pajak berhasil dibuat otomatis dari transaksi belanja BKU.',
                });
              }
            }}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            title="Hitung otomatis PPN dari transaksi belanja material di BKU"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Sinkron dari BKU</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Muat contoh format BKU Pajak sesuai gambar yang diupload?')) {
                loadSamplePajakRows();
                showToast({
                  type: 'info',
                  title: 'Contoh Gambar Dimuat',
                  message: 'Tabel BKU Pajak diatur sesuai contoh gambar yang diupload.',
                });
              }
            }}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-semibold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Contoh Gambar</span>
          </button>

          <button
            onClick={openProfileModal}
            className="flex items-center space-x-1 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Pengaturan Kop</span>
          </button>

          <button
            onClick={handleExportExcelPajak}
            className="flex items-center space-x-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => triggerPrint('Buku Pembantu Pajak (BKU Pajak)')}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Cetak BKU Pajak</span>
          </button>
        </div>
      </div>

      {/* Printable Official Sheet matching format_bku_pajak_d1c829d3.png */}
      <div className="bg-white rounded-xl shadow-md border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full text-black sheet-paper font-sans">
        {/* Centered Header Titles matching Screenshot */}
        <div className="text-center space-y-0.5 mb-5 text-black">
          <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide text-black">
            {profile.namaSekolah}
          </h1>
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide text-black">
            BUKU KAS UMUM
          </h2>
          <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide text-black">
            BUKU PEMBANTU PAJAK
          </h3>
          <p className="text-xs sm:text-sm font-bold uppercase text-black">
            BULAN : {profile.bulanLaporan}
          </p>
        </div>

        {/* Left Metadata: Kepala Sekolah & Bendahara Pengeluaran */}
        <div className="mb-3 text-xs sm:text-[13px] print:text-[11px] text-black font-semibold">
          <table className="border-none">
            <tbody>
              <tr>
                <td className="pr-4 py-0.5 font-semibold text-black">Kepala Sekolah</td>
                <td className="pr-2 py-0.5 font-semibold text-black">:</td>
                <td className="py-0.5 font-semibold text-black">{profile.namaKepalaSekolah}</td>
              </tr>
              <tr>
                <td className="pr-4 py-0.5 font-semibold text-black">Bendahara Pengeluaran</td>
                <td className="pr-2 py-0.5 font-semibold text-black">:</td>
                <td className="py-0.5 font-semibold text-black">{profile.namaBendahara}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Main 7-Column Table matching format_bku_pajak_d1c829d3.png */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse border border-black text-xs sm:text-[12.5px] print:text-[10.5px] text-black">
            <thead>
              <tr className="bg-white text-black font-bold text-center">
                <th className="border border-black py-2 px-1.5 w-12 align-middle">
                  No<br />Urut
                </th>
                <th className="border border-black py-2 px-2 w-24 align-middle">
                  Tanggal
                </th>
                <th className="border border-black py-2 px-2 w-28 align-middle">
                  Nomor Bukti
                </th>
                <th className="border border-black py-2 px-3 text-center align-middle">
                  Uraian
                </th>
                <th className="border border-black py-2 px-2.5 w-36 align-middle">
                  Penerimaan<br />Rp.
                </th>
                <th className="border border-black py-2 px-2.5 w-36 align-middle">
                  Pengeluaran<br />Rp.
                </th>
                <th className="border border-black py-2 px-2.5 w-36 align-middle">
                  Saldo<br />Rp.
                </th>
                <th className="border border-black py-2 px-2 w-24 align-middle print:hidden bg-slate-100">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {computedRows.rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className="hover:bg-amber-50/40 transition-colors text-black"
                >
                  {/* No Urut */}
                  <td className="border border-black py-1 px-1.5 text-center font-mono">
                    {r.noUrut}
                  </td>

                  {/* Tanggal (DD/MM/YYYY) */}
                  <td className="border border-black py-1 px-2 text-center font-mono whitespace-nowrap">
                    {r.tanggalFormatted}
                  </td>

                  {/* Nomor Bukti */}
                  <td className="border border-black py-1 px-2 text-center font-mono whitespace-nowrap">
                    {r.nomorBukti || ''}
                  </td>

                  {/* Uraian */}
                  <td className="border border-black py-1 px-2.5 text-left">
                    {r.uraian}
                  </td>

                  {/* Penerimaan Rp. (Rp on left, nominal or - on right) */}
                  <td className="border border-black py-1 px-2 font-mono whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <span>Rp</span>
                      <span>
                        {r.penerimaan > 0 ? r.penerimaan.toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                  </td>

                  {/* Pengeluaran Rp. */}
                  <td className="border border-black py-1 px-2 font-mono whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <span>Rp</span>
                      <span>
                        {r.pengeluaran > 0 ? r.pengeluaran.toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                  </td>

                  {/* Saldo Rp. */}
                  <td className="border border-black py-1 px-2 font-mono whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <span>Rp</span>
                      <span>
                        {r.saldo > 0 ? r.saldo.toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                  </td>

                  {/* Aksi (Hidden in Print) */}
                  <td className="border border-black py-1 px-1.5 text-center print:hidden bg-slate-50/80 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => movePajakRow(r.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                        title="Geser ke atas"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePajakRow(r.id, 'down')}
                        disabled={idx === computedRows.rows.length - 1}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                        title="Geser ke bawah"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRow({ ...r })}
                        className="p-1 rounded hover:bg-blue-100 text-blue-700 cursor-pointer"
                        title="Edit baris ini"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus baris "${r.uraian}"?`)) {
                            deletePajakRow(r.id);
                          }
                        }}
                        className="p-1 rounded hover:bg-rose-100 text-rose-700 cursor-pointer"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Summary Footer Row */}
              <tr className="bg-slate-50 print:bg-white font-bold text-black border-t-2 border-black">
                <td
                  colSpan={4}
                  className="border border-black py-1.5 px-3 text-center uppercase tracking-wide"
                >
                  JUMLAH PAJAK (PENERIMAAN & PENGELUARAN PAJAK)
                </td>
                <td className="border border-black py-1.5 px-2 font-mono whitespace-nowrap">
                  <div className="flex items-center justify-between gap-1">
                    <span>Rp</span>
                    <span>
                      {computedRows.totalPenerimaanPajak > 0
                        ? computedRows.totalPenerimaanPajak.toLocaleString('id-ID')
                        : '-'}
                    </span>
                  </div>
                </td>
                <td className="border border-black py-1.5 px-2 font-mono whitespace-nowrap">
                  <div className="flex items-center justify-between gap-1">
                    <span>Rp</span>
                    <span>
                      {computedRows.totalPengeluaranPajak > 0
                        ? computedRows.totalPengeluaranPajak.toLocaleString('id-ID')
                        : '-'}
                    </span>
                  </div>
                </td>
                <td className="border border-black py-1.5 px-2 font-mono whitespace-nowrap">
                  <div className="flex items-center justify-between gap-1">
                    <span>Rp</span>
                    <span>
                      {computedRows.saldoAkhirPajak > 0
                        ? computedRows.saldoAkhirPajak.toLocaleString('id-ID')
                        : '-'}
                    </span>
                  </div>
                </td>
                <td className="border border-black py-1.5 px-1 print:hidden bg-slate-100"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3 Signatures Block: Kepala Sekolah, Ketua P2SP, Bendahara (Sesuai BKU Umum/Tunai) */}
        <div className="mt-8 pt-4 text-xs sm:text-[13px] print:text-[11px] break-inside-avoid page-break-inside-avoid text-black">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Pihak 1: Kepala Sekolah */}
            <div>
              <p className="font-semibold text-black">Mengetahui,</p>
              <p className="font-bold text-black mb-16">
                Kepala {profile.namaSekolah || 'Sekolah'}
              </p>
              <p className="font-bold underline uppercase text-black leading-tight">
                {profile.namaKepalaSekolah}
              </p>
              <p className="text-black font-medium">
                NIP. {profile.nipKepalaSekolah}
              </p>
            </div>

            {/* Pihak 2: Ketua P2SP */}
            <div>
              <p className="font-semibold text-transparent select-none">.</p>
              <p className="font-bold text-black mb-16">Ketua P2SP</p>
              <p className="font-bold underline uppercase text-black leading-tight">
                {profile.namaKetuaP2S || profile.namaPanitia || '....................................'}
              </p>
              <p className="text-black font-medium">-</p>
            </div>

            {/* Pihak 3: Bendahara */}
            <div>
              <p className="font-semibold text-black">
                {profile.tempatPelunasan || profile.kabupaten || 'Palasa'},{' '}
                {formatToSlashDate(profile.tanggalTutupBuku)}
              </p>
              <p className="font-bold text-black mb-16">Bendahara</p>
              <p className="font-bold underline uppercase text-black leading-tight">
                {profile.namaBendahara}
              </p>
              <p className="text-black font-medium">
                NIP. {profile.nipBendahara}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tambah Paket / Baris Pajak */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-amber-400 text-slate-900 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-900" />
                <h3 className="text-base font-black text-purple-950">
                  Tambah Transaksi Buku Pembantu Pajak
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-purple-950/10 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setAddMode('paket_otomatis')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  addMode === 'paket_otomatis'
                    ? 'bg-purple-950 text-amber-300 shadow-xs'
                    : 'text-purple-950 hover:bg-white/60'
                }`}
              >
                Paket Belanja + Pajak Otomatis
              </button>
              <button
                type="button"
                onClick={() => setAddMode('baris_tunggal')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  addMode === 'baris_tunggal'
                    ? 'bg-purple-950 text-amber-300 shadow-xs'
                    : 'text-purple-950 hover:bg-white/60'
                }`}
              >
                Input 1 Baris Manual
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              {/* Pilihan Cepat dari BKU Tunai */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-3">
                <label className="block font-black text-purple-950 mb-1">
                  Pilih Transaksi dari BKU Tunai (Otomatis Isi Uraian & Nilai Belanja)
                </label>
                <select
                  value={selectedBkuTunaiTxId}
                  onChange={(e) => handleSelectBkuTunaiTransaction(e.target.value)}
                  className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white cursor-pointer"
                >
                  <option value="">-- Pilih dari Daftar Transaksi BKU Tunai ({bkuTunaiTransactions.length} transaksi) --</option>
                  {bkuTunaiTransactions.map((tx, idx) => (
                    <option key={tx.id} value={tx.id}>
                      {idx + 1}. [{formatToSlashDate(tx.tanggal)}] {tx.uraian} — Rp {tx.pengeluaran.toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-purple-800 mt-1 font-medium">
                  Pilih transaksi di atas agar Tanggal, No. Bukti, Uraian, dan Nilai Belanja terisi otomatis tanpa mengetik ulang.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Tanggal (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    placeholder="11/08/2026"
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Nomor Bukti (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formNomorBukti}
                    onChange={(e) => setFormNomorBukti(e.target.value)}
                    placeholder="KW-001 / BKU 02 / Kosongkan"
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Uraian Transaksi (Bisa Pilih dari List BKU Tunai atau Ketik Manual)
                </label>
                <input
                  type="text"
                  required
                  list="bku-tunai-uraian-list"
                  value={formUraian}
                  onChange={(e) => handleUraianInputChange(e.target.value)}
                  placeholder="Klik 2x untuk melihat daftar uraian BKU Tunai atau ketik..."
                  className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
                <datalist id="bku-tunai-uraian-list">
                  {bkuTunaiTransactions.map((tx) => (
                    <option
                      key={tx.id}
                      value={tx.uraian}
                      label={`${formatToSlashDate(tx.tanggal)} — Rp ${tx.pengeluaran.toLocaleString('id-ID')}`}
                    />
                  ))}
                </datalist>
              </div>

              {addMode === 'paket_otomatis' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">
                        Nilai Belanja (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={formNominalBelanja}
                        onChange={(e) =>
                          handleNominalBelanjaChange(Number(e.target.value) || 0)
                        }
                        className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">
                        Jenis Pajak
                      </label>
                      <select
                        value={formJenisPajak}
                        onChange={(e) =>
                          handleJenisPajakChange(e.target.value as JenisPajak)
                        }
                        className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white cursor-pointer"
                      >
                        <option value="PPN">PPN (11%)</option>
                        <option value="PPh 22">PPh Pasal 22 (1,5%)</option>
                        <option value="PPN + PPh 22">PPN (11%) + PPh 22 (1,5%) Sekaligus</option>
                        <option value="PPh 4%">PPh 4% / Pasal 4 Ayat 2 (4%)</option>
                        <option value="PPh 23">PPh Pasal 23 (2%)</option>
                        <option value="PPh 21">PPh Pasal 21 (5%)</option>
                        <option value="Pajak Daerah">Pajak Daerah (10%)</option>
                      </select>
                    </div>
                  </div>

                  {formJenisPajak === 'PPN + PPh 22' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-purple-950 mb-1">
                          Nominal PPN 11% (Rp)
                        </label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={formNominalPajak}
                          onChange={(e) => setFormNominalPajak(Number(e.target.value) || 0)}
                          className="w-full border-2 border-amber-400 bg-amber-50/50 rounded-xl px-3 py-2 font-mono font-black text-purple-950"
                        />
                        <span className="text-[10px] text-slate-500">
                          11% × Rp {formNominalBelanja.toLocaleString('id-ID')} = Rp {Math.round(formNominalBelanja * 0.11).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div>
                        <label className="block font-bold text-purple-950 mb-1">
                          Nominal PPh 22 1,5% (Rp)
                        </label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={formNominalPajakKedua}
                          onChange={(e) => setFormNominalPajakKedua(Number(e.target.value) || 0)}
                          className="w-full border-2 border-amber-400 bg-amber-50/50 rounded-xl px-3 py-2 font-mono font-black text-purple-950"
                        />
                        <span className="text-[10px] text-slate-500">
                          1,5% × Rp {formNominalBelanja.toLocaleString('id-ID')} = Rp {Math.round(formNominalBelanja * 0.015).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">
                        Nominal {formJenisPajak} (Dapat Disesuaikan)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={formNominalPajak}
                        onChange={(e) => setFormNominalPajak(Number(e.target.value) || 0)}
                        className="w-full border-2 border-amber-400 bg-amber-50/50 rounded-xl px-3 py-2 font-mono font-black text-purple-950"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formTampilkanBarisBelanja}
                        onChange={(e) => setFormTampilkanBarisBelanja(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-900"
                      />
                      <span className="font-bold text-slate-800">
                        Tampilkan baris nilai belanja ("{formUraian || 'Uraian Belanja'}") di tabel BKU Pajak
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSudahDibayar}
                        onChange={(e) => setFormSudahDibayar(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-900"
                      />
                      <span className="font-bold text-slate-800">
                        Otomatis tambahkan baris "Dibayarkan {formJenisPajak}" (Saldo Pajak = Rp -)
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">
                        Penerimaan Rp.
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={singlePenerimaan}
                        onChange={(e) => setSinglePenerimaan(Number(e.target.value) || 0)}
                        className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">
                        Pengeluaran Rp.
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={singlePengeluaran}
                        onChange={(e) => setSinglePengeluaran(Number(e.target.value) || 0)}
                        className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={singleIsTaxRow}
                      onChange={(e) => setSingleIsTaxRow(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-900"
                    />
                    <span className="font-bold text-slate-800">
                      Baris ini adalah Pungutan / Setoran Pajak (Mempengaruhi Saldo Pajak)
                    </span>
                  </label>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan ke BKU Pajak</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Baris */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-400 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-black text-purple-950">
                Edit Baris BKU Pajak
              </h3>
              <button
                onClick={() => setEditingRow(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Tanggal (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRow.tanggal}
                    onChange={(e) =>
                      setEditingRow({ ...editingRow, tanggal: e.target.value })
                    }
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Nomor Bukti
                  </label>
                  <input
                    type="text"
                    value={editingRow.nomorBukti}
                    onChange={(e) =>
                      setEditingRow({ ...editingRow, nomorBukti: e.target.value })
                    }
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Uraian
                </label>
                <input
                  type="text"
                  required
                  list="bku-tunai-uraian-list-edit"
                  value={editingRow.uraian}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, uraian: e.target.value })
                  }
                  className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-bold"
                />
                <datalist id="bku-tunai-uraian-list-edit">
                  {bkuTunaiTransactions.map((tx) => (
                    <option
                      key={tx.id}
                      value={tx.uraian}
                      label={`${formatToSlashDate(tx.tanggal)} — Rp ${tx.pengeluaran.toLocaleString('id-ID')}`}
                    />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Penerimaan Rp.
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingRow.penerimaan}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        penerimaan: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Pengeluaran Rp.
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingRow.pengeluaran}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        pengeluaran: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    editingRow.isTaxRow !== undefined
                      ? editingRow.isTaxRow
                      : /^(diterima|dibayarkan|dipungut|disetor|ppn|pph)/i.test(
                          editingRow.uraian.trim()
                        )
                  }
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, isTaxRow: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-purple-900"
                />
                <span className="font-bold text-slate-800">
                  Baris Pungutan/Setoran Pajak (Hitung ke Saldo Pajak)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-black shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
