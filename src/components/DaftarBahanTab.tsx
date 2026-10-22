import React, { useState, useMemo } from 'react';
import { useLpjStore } from '../store/lpjStore';
import { extractDaftarBahan, cleanMaterialName } from '../utils/bahanTukangUtils';
import { formatRupiah } from '../utils/calculations';
import { triggerPrint } from '../utils/printHelper';
import {
  Boxes,
  Search,
  Plus,
  Printer,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  Edit3,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CustomBahanItem } from '../types';

export const DaftarBahanTab: React.FC = () => {
  const {
    transactions,
    customBahanList,
    addCustomBahan,
    deleteCustomBahan,
    batchUpdateMaterialPrice,
    profile,
    showToast,
  } = useLpjStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [aggregateMode, setAggregateMode] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding manual bahan
  const [newNama, setNewNama] = useState('');
  const [newVolume, setNewVolume] = useState<number>(1);
  const [newSatuan, setNewSatuan] = useState('Sak');
  const [newHarga, setNewHarga] = useState<number>(0);

  // State for Edit Harga Material modal
  const [editModalItem, setEditModalItem] = useState<CustomBahanItem | null>(null);
  const [editNewHarga, setEditNewHarga] = useState<number>(0);
  const [editScope, setEditScope] = useState<'all' | 'specific_month'>('all');
  const [editMonthKey, setEditMonthKey] = useState<string>('');

  // Auto extracted bahan from transactions
  const autoBahan = useMemo(() => {
    return extractDaftarBahan(transactions, aggregateMode);
  }, [transactions, aggregateMode]);

  // Combined with custom items
  const allBahan = useMemo(() => {
    const combined = [...autoBahan, ...customBahanList];
    if (!searchQuery.trim()) return combined;
    const q = searchQuery.toLowerCase();
    return combined.filter(
      (b) =>
        b.namaBarang.toLowerCase().includes(q) ||
        b.satuanDisplay.toLowerCase().includes(q)
    );
  }, [autoBahan, customBahanList, searchQuery]);

  // Grand Total of All Bahan
  const totalBiayaBahan = useMemo(() => {
    return allBahan.reduce((acc, item) => acc + item.total, 0);
  }, [allBahan]);

  // Calculate affected transactions when editing material price
  const affectedTransactions = useMemo(() => {
    if (!editModalItem) return [];
    const targetClean = cleanMaterialName(editModalItem.namaBarang).toLowerCase();

    const results: {
      txId: string;
      nomorBukti: string;
      tanggal: string;
      monthKey: string;
      uraian: string;
      isSubItem: boolean;
      volume: number;
      satuan: string;
      oldHarga: number;
      oldTotal: number;
      newTotal: number;
    }[] = [];

    transactions.forEach((tx) => {
      if (tx.subItems && tx.subItems.length > 0) {
        tx.subItems.forEach((sub) => {
          const subClean = cleanMaterialName(sub.nama).toLowerCase();
          if (
            subClean === targetClean ||
            subClean.includes(targetClean) ||
            targetClean.includes(subClean)
          ) {
            const vol = Number(sub.volume) || 1;
            const oldH = Number(sub.hargaSatuan) || 0;
            const mKey = tx.tanggal && tx.tanggal.length >= 7 ? tx.tanggal.slice(0, 7) : '';
            results.push({
              txId: tx.id,
              nomorBukti: tx.nomorBukti,
              tanggal: tx.tanggal,
              monthKey: mKey,
              uraian: sub.nama,
              isSubItem: true,
              volume: vol,
              satuan: sub.satuan || 'Satuan',
              oldHarga: oldH,
              oldTotal: vol * oldH,
              newTotal: vol * (editNewHarga || 0),
            });
          }
        });
      } else {
        const uraianClean = cleanMaterialName(tx.uraian).toLowerCase();
        if (
          uraianClean === targetClean ||
          uraianClean.includes(targetClean) ||
          targetClean.includes(uraianClean)
        ) {
          const mKey = tx.tanggal && tx.tanggal.length >= 7 ? tx.tanggal.slice(0, 7) : '';
          results.push({
            txId: tx.id,
            nomorBukti: tx.nomorBukti,
            tanggal: tx.tanggal,
            monthKey: mKey,
            uraian: tx.uraian,
            isSubItem: false,
            volume: 1,
            satuan: 'Item',
            oldHarga: tx.pengeluaran,
            oldTotal: tx.pengeluaran,
            newTotal: editNewHarga || 0,
          });
        }
      }
    });

    return results;
  }, [editModalItem, transactions, editNewHarga]);

  // List of distinct months in affected transactions
  const availableMonths = useMemo(() => {
    const setM = new Set<string>();
    affectedTransactions.forEach((t) => {
      if (t.monthKey) setM.add(t.monthKey);
    });
    if (setM.size === 0) {
      transactions.forEach((tx) => {
        if (tx.tanggal && tx.tanggal.length >= 7) {
          setM.add(tx.tanggal.slice(0, 7));
        }
      });
    }
    return Array.from(setM).sort();
  }, [affectedTransactions, transactions]);

  const formatMonthName = (mKey: string) => {
    if (!mKey) return 'Bulan Tidak Terdefinisi';
    const parts = mKey.split('-');
    if (parts.length < 2) return mKey;
    const y = parts[0];
    const m = parts[1];
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const idx = parseInt(m, 10) - 1;
    return `${monthNames[idx] || m} ${y}`;
  };

  const handleOpenEditModal = (item: CustomBahanItem) => {
    setEditModalItem(item);
    setEditNewHarga(item.harga || 0);
    setEditScope('all');
    // Default selected month to the latest available or profile
    const latestMonth =
      availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : '';
    setEditMonthKey(latestMonth);
  };

  const handleApplyPriceChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem) return;

    if (editNewHarga <= 0) {
      showToast({
        title: 'Input Tidak Valid',
        message: 'Masukkan harga satuan yang valid (lebih dari 0).',
        type: 'warning',
      });
      return;
    }

    const affectedCount = batchUpdateMaterialPrice({
      namaBarang: editModalItem.namaBarang,
      newHarga: editNewHarga,
      scope: editScope,
      monthKey: editScope === 'specific_month' ? editMonthKey : undefined,
    });

    const scopeLabel =
      editScope === 'specific_month'
        ? `di bulan ${formatMonthName(editMonthKey)}`
        : 'di seluruh transaksi (BKU Umum, Kas Tunai & Kwitansi)';

    showToast({
      title: 'Harga Berhasil Diperbarui',
      message: `Berhasil memperbarui harga "${editModalItem.namaBarang}" menjadi ${formatRupiah(
        editNewHarga
      )} ${scopeLabel}! (${affectedCount} transaksi disesuaikan)`,
      type: 'success',
    });

    setEditModalItem(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) return;

    const total = (newVolume || 0) * (newHarga || 0);
    // Kolom "Satuan" diisi jumlah total + satuan sesuai instruksi user
    const satuanDisplay = `${(newVolume || 0).toLocaleString('id-ID')} ${newSatuan.trim()}`;

    addCustomBahan({
      namaBarang: newNama.trim(),
      volume: newVolume,
      namaSatuan: newSatuan.trim(),
      satuanDisplay,
      harga: newHarga,
      total,
    });

    setNewNama('');
    setNewVolume(1);
    setNewHarga(0);
    setIsAddModalOpen(false);
  };

  const handlePrintBahan = () => {
    triggerPrint('Daftar Bahan Material Belanja DAK');
  };

  const handleExportExcelBahan = () => {
    const dataForSheet = [
      ['DAFTAR BAHAN'],
      [`Proyek / Sekolah: ${profile.namaSekolah}`],
      [`Bulan: ${profile.bulanLaporan}`],
      [],
      ['No.', 'Nama Barang', 'Satuan', 'Harga', 'Total'],
      ...allBahan.map((item, idx) => [
        idx + 1,
        item.namaBarang,
        item.satuanDisplay,
        item.harga,
        item.total,
      ]),
      ['', 'Jumlah Total', '', '', totalBiayaBahan],
    ];

    const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
    // Set column widths
    ws['!cols'] = [
      { wch: 6 },
      { wch: 38 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Bahan');
    XLSX.writeFile(wb, `DAFTAR_BAHAN_${profile.namaSekolah.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Controls & Toolbar (Hidden on print) */}
      <div className="bg-[#240838] border border-amber-400/20 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        {/* Left Search & Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama bahan / material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#180526] border border-purple-800/60 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center bg-[#180526] rounded-lg p-0.5 border border-purple-800/40 text-xs">
            <button
              onClick={() => setAggregateMode(true)}
              className={`px-3 py-1 rounded-md transition font-medium ${
                aggregateMode
                  ? 'bg-amber-400 text-purple-950 font-bold'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Agregasi Total
            </button>
            <button
              onClick={() => setAggregateMode(false)}
              className={`px-3 py-1 rounded-md transition font-medium ${
                !aggregateMode
                  ? 'bg-amber-400 text-purple-950 font-bold'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Semua Nota
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-purple-800/50 hover:bg-purple-700/60 border border-purple-500/40 text-purple-100 rounded-lg transition font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Tambah Bahan</span>
          </button>

          <button
            onClick={handleExportExcelBahan}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-500/40 text-emerald-200 rounded-lg transition font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handlePrintBahan}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-lg transition font-bold shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Info Banner: Penjelasan Kolom Satuan */}
      <div className="bg-amber-400/10 border border-amber-400/25 rounded-lg p-3 text-xs text-amber-200/90 flex items-start space-x-2.5 print:hidden">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-amber-300">Format Sesuai Format Excel DAK:</strong> Kolom{' '}
          <span className="font-semibold text-white underline">Satuan</span> otomatis terisi{' '}
          <span className="font-semibold text-white">jumlah total volume yang sudah diinput</span>{' '}
          beserta satuannya (contoh: <em>10 Ret</em>, <em>50 Sak</em>, <em>1 Kbk</em>) yang
          dihitung dari transaksi pengeluaran dan sub-nota belanja material.
        </p>
      </div>

      {/* Printable Paper / Sheet (Styled exactly like Screenshot 2026-09-16 083346.png) */}
      <div className="sheet-paper bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-300 print:shadow-none print:border-none print:m-0">
        {/* Yellow Header Banner: DAFTAR BAHAN */}
        <div className="bg-[#FFEB3B] text-slate-900 font-black text-center py-2 px-4 border-b-2 border-slate-400 uppercase tracking-wider text-base md:text-lg">
          DAFTAR BAHAN
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-400 text-xs sm:text-sm">
            {/* Dark Blue / Teal Table Header (Matching Screenshot) */}
            <thead>
              <tr className="bg-[#0b4d75] text-white font-bold divide-x divide-cyan-700">
                <th className="py-2.5 px-3 text-center w-14 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-center space-x-1">
                    <span>No.</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-4 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-between">
                    <span>Nama Barang</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-4 text-center w-36 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-center space-x-1">
                    <span>Satuan</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right w-36 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-end space-x-1">
                    <span>Harga</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right w-40 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-end space-x-1">
                    <span>Total</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center w-36 font-extrabold border-b border-cyan-800 print:hidden">
                  Aksi
                </th>
              </tr>
            </thead>
            {/* Alternating soft-blue and white stripes as shown in screenshot */}
            <tbody className="divide-y divide-slate-300">
              {allBahan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 italic">
                    Belum ada data bahan/material yang diinput.
                  </td>
                </tr>
              ) : (
                allBahan.map((item, index) => {
                  const isStripe = index % 2 === 1;
                  return (
                    <tr
                      key={item.id}
                      className={`divide-x divide-slate-300 hover:bg-amber-50/70 transition-colors ${
                        isStripe ? 'bg-[#d9edf7]' : 'bg-white'
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-700 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-2 px-4 text-slate-900 font-semibold">
                        {item.namaBarang}
                      </td>
                      {/* Kolom Satuan yang diisi jumlah total + satuan */}
                      <td className="py-2 px-4 text-center font-bold text-slate-800">
                        <span className="inline-block px-2 py-0.5 rounded bg-white/70 border border-slate-300 text-xs text-slate-900 font-bold">
                          {item.satuanDisplay}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-slate-800">
                        {formatRupiah(item.harga)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-950">
                        {formatRupiah(item.total)}
                      </td>
                      <td className="py-2 px-3 text-center print:hidden">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title={`Ubah harga ${item.namaBarang} di semua transaksi BKU/Kas Tunai`}
                            className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded flex items-center space-x-1 shadow-sm transition active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-950" />
                            <span>Ubah Harga</span>
                          </button>
                          {item.id.startsWith('custom-') && (
                            <button
                              onClick={() => deleteCustomBahan(item.id)}
                              title="Hapus bahan manual"
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Minimal 10 rows filled with empty light stripes like Excel sheet in photo */}
              {allBahan.length < 10 &&
                Array.from({ length: 10 - allBahan.length }).map((_, i) => {
                  const virtualIdx = allBahan.length + i;
                  const isStripe = virtualIdx % 2 === 1;
                  return (
                    <tr
                      key={`empty-${i}`}
                      className={`divide-x divide-slate-200 h-8 ${
                        isStripe ? 'bg-[#d9edf7]/60' : 'bg-white'
                      }`}
                    >
                      <td className="py-1 px-3 text-center text-slate-400 text-xs">
                        {virtualIdx + 1}
                      </td>
                      <td className="py-1 px-4"></td>
                      <td className="py-1 px-4"></td>
                      <td className="py-1 px-4"></td>
                      <td className="py-1 px-4"></td>
                      <td className="py-1 px-2 print:hidden"></td>
                    </tr>
                  );
                })}
            </tbody>

            {/* Total Footer Row */}
            <tfoot>
              <tr className="bg-[#f1f5f9] font-bold text-slate-900 border-t-2 border-slate-400 divide-x divide-slate-300">
                <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider font-extrabold text-xs sm:text-sm">
                  TOTAL JUMLAH BAHAN
                </td>
                <td className="py-3 px-4 text-center text-xs font-bold text-slate-700">
                  {allBahan.length} Macam Bahan
                </td>
                <td className="py-3 px-4 text-right text-xs text-slate-500 italic">
                  Akumulasi
                </td>
                <td className="py-3 px-4 text-right font-mono font-extrabold text-sm sm:text-base text-blue-900 bg-amber-100/70">
                  {formatRupiah(totalBiayaBahan)}
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Print Signature Footer (Visible on Screen Preview & Print) */}
        <div className="mt-4 p-6 text-xs text-slate-800 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-8 break-inside-avoid">
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah / Penanggung Jawab</p>
            <div className="h-16 sm:h-20" />
            <p className="font-bold underline">{profile.namaKepalaSekolah}</p>
            <p>NIP. {profile.nipKepalaSekolah}</p>
          </div>
          <div className="text-center">
            <p>{profile.tempatPelunasan || 'Palasa'}, {profile.tanggalTutupBuku || '31 Agustus 2026'}</p>
            <p className="font-bold">Panitia Pembangunan / Bendahara</p>
            <div className="h-16 sm:h-20" />
            <p className="font-bold underline">{profile.namaBendahara}</p>
            <p>NIP. {profile.nipBendahara || '-'}</p>
          </div>
        </div>
      </div>

      {/* Modal Tambah Bahan Manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#210633] border border-amber-400/40 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <h3 className="text-base font-bold text-amber-300 flex items-center space-x-2 mb-4">
              <Boxes className="w-5 h-5 text-amber-400" />
              <span>Tambah Bahan Material Manual</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Nama Barang / Material
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Semen Gresik 50kg, Cat Tembok, Kayu..."
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-purple-200 font-medium mb-1">
                    Volume / Jumlah
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={newVolume}
                    onChange={(e) => setNewVolume(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-purple-200 font-medium mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sak, Ret, M3, Bh, Lbr..."
                    value={newSatuan}
                    onChange={(e) => setNewSatuan(e.target.value)}
                    className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Harga Satuan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newHarga}
                  onChange={(e) => setNewHarga(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* Preview Total */}
              <div className="bg-[#140320] p-3 rounded-lg border border-purple-900/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-purple-300">Format Kolom Satuan:</div>
                  <div className="font-bold text-amber-300">
                    {newVolume} {newSatuan}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-purple-300">Total Biaya:</div>
                  <div className="font-mono font-bold text-emerald-300">
                    {formatRupiah((newVolume || 0) * (newHarga || 0))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs shadow-md"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit / Sesuaikan Harga Material */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#210633] border border-amber-400/50 rounded-2xl w-full max-w-2xl p-6 text-white shadow-2xl relative my-8">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-purple-800/60 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-amber-300 flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-amber-400" />
                  <span>Ubah / Sesuaikan Harga Material</span>
                </h3>
                <p className="text-xs text-purple-300 mt-1">
                  Menyesuaikan harga satuan <strong className="text-white underline">{editModalItem.namaBarang}</strong> pada transaksi BKU Umum, Buku Kas Tunai, Kwitansi, dan Daftar Bahan.
                </p>
              </div>
              <button
                onClick={() => setEditModalItem(null)}
                className="text-purple-400 hover:text-white p-1 rounded-lg text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyPriceChange} className="space-y-4 text-xs">
              {/* Saran Akuntansi / SPJ DAK Fisik (Box Info) */}
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3.5 space-y-2 text-amber-200">
                <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Saran Penting Pemeriksaan SPJ / DAK Fisik:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-amber-100/90 pl-1">
                  <li>
                    <strong className="text-amber-300">Nota Bulan Lalu (Agustus):</strong> Bukti fisik kuitansi & faktur toko riil di bulan Agustus tertera <strong>Rp 78.000</strong>. Secara aturan pemeriksaan SPJ, kuitansi bulan lalu sebaiknya <strong>tetap dipertahankan Rp 78.000</strong> agar nominal di pembukuan sama persis dengan bukti fisik kuitansi asli yang diarsip.
                  </li>
                  <li>
                    <strong className="text-amber-300">Belanja Bulan Berjalan (Oktober):</strong> Kenaikan harga menjadi <strong>Rp 84.000</strong> sah diterapkan untuk transaksi belanja baru di bulan Oktober. Anda bisa memilih opsi <em>"Hanya Transaksi di Bulan Tertentu"</em> di bawah.
                  </li>
                  <li>
                    <strong className="text-amber-300">Opsi Otomatis Semua Transaksi:</strong> Namun jika Anda dan tim sepakat ingin menyamakan seluruh harga semen di seluruh transaksi secara otomatis, Anda bisa memilih <em>"Semua Transaksi Sekaligus"</em>.
                  </li>
                </ul>
              </div>

              {/* Input Harga Baru */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#160424] p-4 rounded-xl border border-purple-800/60">
                <div>
                  <label className="block text-purple-300 font-medium mb-1">
                    Harga Satuan Saat Ini
                  </label>
                  <div className="font-mono text-base font-bold text-slate-300 bg-purple-950/60 px-3 py-2 rounded-lg border border-purple-800/40">
                    {formatRupiah(editModalItem.harga)}
                  </div>
                </div>

                <div>
                  <label className="block text-amber-300 font-bold mb-1">
                    Harga Satuan Baru (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 font-mono font-bold">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editNewHarga}
                      onChange={(e) => setEditNewHarga(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#11021b] border border-amber-400/80 rounded-lg pl-10 pr-3 py-2 text-white font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Contoh: 84000"
                    />
                  </div>
                </div>
              </div>

              {/* Opsi Cakupan Pembaruan */}
              <div className="space-y-2">
                <label className="block text-purple-200 font-bold">
                  Pilih Cakupan Pembaruan Transaksi:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opsi A: Hanya Bulan Tertentu */}
                  <label
                    className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                      editScope === 'specific_month'
                        ? 'bg-amber-400/15 border-amber-400 text-white'
                        : 'bg-[#180526] border-purple-800/60 text-purple-200 hover:border-purple-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editScope"
                      checked={editScope === 'specific_month'}
                      onChange={() => setEditScope('specific_month')}
                      className="mt-1 accent-amber-400"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="font-bold flex items-center space-x-1.5 text-amber-300">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Hanya Bulan Tertentu (Disarankan)</span>
                      </div>
                      <p className="text-[11px] text-purple-300 leading-normal">
                        Hanya mengubah harga transaksi di bulan yang dipilih (misal: belanja Oktober). Nota bulan Agustus tetap aman dengan harga Rp 78.000.
                      </p>

                      {editScope === 'specific_month' && (
                        <div className="pt-2">
                          <label className="block text-[11px] font-semibold text-amber-200 mb-1">
                            Pilih Bulan Transaksi:
                          </label>
                          <select
                            value={editMonthKey}
                            onChange={(e) => setEditMonthKey(e.target.value)}
                            className="w-full bg-[#11021b] border border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          >
                            {availableMonths.map((mKey) => (
                              <option key={mKey} value={mKey}>
                                {formatMonthName(mKey)} ({mKey})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Opsi B: Semua Transaksi Sekaligus */}
                  <label
                    className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                      editScope === 'all'
                        ? 'bg-amber-400/15 border-amber-400 text-white'
                        : 'bg-[#180526] border-purple-800/60 text-purple-200 hover:border-purple-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editScope"
                      checked={editScope === 'all'}
                      onChange={() => setEditScope('all')}
                      className="mt-1 accent-amber-400"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="font-bold flex items-center space-x-1.5 text-amber-300">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Semua Transaksi Sekaligus (Massal)</span>
                      </div>
                      <p className="text-[11px] text-purple-300 leading-normal">
                        Otomatis mengubah harga di <strong>seluruh bulan</strong> (Agustus, September, Oktober, dll.) di BKU Umum, Kas Tunai & Kwitansi.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Pratinjau Transaksi Terkena Dampak */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-purple-300">
                  <span className="font-semibold text-purple-200">
                    Pratinjau Transaksi Terkena Dampak ({
                      editScope === 'specific_month'
                        ? affectedTransactions.filter((t) => t.monthKey === editMonthKey).length
                        : affectedTransactions.length
                    } Transaksi):
                  </span>
                  <span className="text-[11px] text-amber-300">
                    {editScope === 'specific_month' ? `Filter: ${formatMonthName(editMonthKey)}` : 'Semua Bulan'}
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto rounded-lg border border-purple-800/50 bg-[#160424]">
                  {affectedTransactions.length === 0 ? (
                    <div className="p-4 text-center text-purple-400 italic text-xs">
                      Tidak ditemukan transaksi belanja material terkait di BKU/Kas Tunai (atau hanya terdaftar manual).
                    </div>
                  ) : (
                    <table className="w-full text-left text-[11px] divide-y divide-purple-900/60">
                      <thead className="bg-[#12021d] text-purple-300 font-semibold sticky top-0">
                        <tr>
                          <th className="py-1.5 px-2">No. Bukti / Tgl</th>
                          <th className="py-1.5 px-2">Uraian / Qty</th>
                          <th className="py-1.5 px-2 text-right">Harga Lama</th>
                          <th className="py-1.5 px-2 text-right">Harga Baru</th>
                          <th className="py-1.5 px-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-900/40">
                        {affectedTransactions.map((tx, idx) => {
                          const isIncluded =
                            editScope === 'all' || tx.monthKey === editMonthKey;
                          return (
                            <tr
                              key={`${tx.txId}-${idx}`}
                              className={`transition ${
                                isIncluded
                                  ? 'bg-amber-400/5 text-purple-100 font-medium'
                                  : 'opacity-40 text-purple-400 bg-transparent'
                              }`}
                            >
                              <td className="py-1.5 px-2 font-mono whitespace-nowrap">
                                <div className="text-white font-bold">{tx.nomorBukti}</div>
                                <div className="text-[10px] text-purple-400">{tx.tanggal}</div>
                              </td>
                              <td className="py-1.5 px-2">
                                <div className="truncate max-w-[160px] text-purple-200">
                                  {tx.uraian}
                                </div>
                                <div className="text-[10px] text-amber-300 font-semibold">
                                  {tx.volume} {tx.satuan}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono text-purple-300">
                                <div>{formatRupiah(tx.oldHarga)}</div>
                                <div className="text-[10px] text-purple-400">
                                  Total: {formatRupiah(tx.oldTotal)}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono text-emerald-400 font-bold">
                                <div>{formatRupiah(editNewHarga)}</div>
                                <div className="text-[10px] text-emerald-300">
                                  Total: {formatRupiah(tx.volume * editNewHarga)}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                {isIncluded ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-500/40">
                                    Diupdate
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-purple-900/30 text-purple-400">
                                    Dilewati
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-purple-800/60">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="px-4 py-2 rounded-lg bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold shadow-lg flex items-center space-x-2 transition active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-purple-950" />
                  <span>Terapkan Perubahan Harga</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
