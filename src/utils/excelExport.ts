import * as XLSX from 'xlsx';
import { ProjectProfile, Transaction } from '../types';
import {
  calculateBkBankRows,
  calculateBkuRows,
  calculateBkuTunaiRows,
  calculateSummary,
} from './calculations';
import { formatRupiahBulat, terbilangRupiah } from './terbilang';
import { useLpjStore } from '../store/lpjStore';

export function exportLpjToExcel(
  profile: ProjectProfile,
  transactions: Transaction[],
  selectedKwitansiTx?: Transaction | null
) {
  try {
    const store = useLpjStore.getState();
    store.showToast({
      type: 'info',
      title: 'Memproses Ekspor Excel',
      message: 'Sedang menyusun 4 lembar kerja LPJ DAK...',
    });

    const wb = XLSX.utils.book_new();

  const summary = calculateSummary(transactions);

  // ==========================================
  // SHEET 1: BK UMUM
  // ==========================================
  const bkuData = calculateBkuRows(transactions);
  const sheet1Rows: (string | number)[][] = [
    ['BUKU KAS UMUM'],
    [profile.judulPekerjaan],
    [`Bulan : ${profile.bulanLaporan}`],
    [''],
    ['NAMA SEKOLAH', `: ${profile.namaSekolah}`],
    ['ALAMAT', `: ${profile.alamat}`],
    ['KECAMATAN', `: ${profile.kecamatan}`],
    ['KABUPATEN', `: ${profile.kabupaten}`],
    [''],
    [
      'NO.',
      'TANGGAL',
      'URAIAN TRANSAKSI',
      'No. Bukti',
      'PENERIMAAN (Rp)',
      'PENGELUARAN (Rp)',
      'SALDO (Rp)',
    ],
    ['1', '2', '3', '4', '5', '6', '7'],
  ];

  bkuData.rows.forEach((r) => {
    sheet1Rows.push([
      r.no,
      r.tanggal,
      r.uraian,
      r.nomorBukti || '',
      r.penerimaan > 0 ? r.penerimaan : '',
      r.pengeluaran > 0 ? r.pengeluaran : '',
      r.saldo,
    ]);
  });

  sheet1Rows.push([
    '',
    '',
    'JUMLAH',
    '',
    bkuData.totalPenerimaan,
    bkuData.totalPengeluaran,
    bkuData.saldoAkhir,
  ]);
  sheet1Rows.push(['']);
  sheet1Rows.push([`Pada hari ini : ${profile.tanggalTutupBuku}`]);
  sheet1Rows.push([
    'Buku Kas Umum ditutup dengan keadaan/posisi Buku sebagai berikut :',
  ]);
  sheet1Rows.push(['Sisa Saldo Bank', `: Rp ${summary.saldoBank.toLocaleString('id-ID')}`]);
  sheet1Rows.push(['Sisa Saldo Kas Tunai', `: Rp ${summary.saldoTunai.toLocaleString('id-ID')}`]);
  sheet1Rows.push(['Jumlah', `: Rp ${summary.saldoKumulatif.toLocaleString('id-ID')}`]);
  sheet1Rows.push(['']);
  sheet1Rows.push(['', '', profile.namaPanitia]);
  sheet1Rows.push(['', '', '']);
  sheet1Rows.push(['Kepala Sekolah', '', '', '', 'Dibuat Oleh Bendahara']);
  sheet1Rows.push(['', '', '', '', '']);
  sheet1Rows.push(['', '', '', '', '']);
  sheet1Rows.push([profile.namaKepalaSekolah, '', '', '', profile.namaBendahara]);
  sheet1Rows.push([`NIP. ${profile.nipKepalaSekolah}`, '', '', '', `NIP. ${profile.nipBendahara}`]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);

  // Injeksi Rumus Excel Dinamis BKU: Saldo = Saldo Sebelumnya + Penerimaan - Pengeluaran (Sesuai =M13+K15-L15)
  bkuData.rows.forEach((r, i) => {
    const rNum = 12 + i;
    if (i === 0) {
      ws1['G' + rNum] = { t: 'n', f: `E${rNum}-F${rNum}`, v: r.saldo, z: '#,##0.00' };
    } else {
      ws1['G' + rNum] = { t: 'n', f: `G${rNum - 1}+E${rNum}-F${rNum}`, v: r.saldo, z: '#,##0.00' };
    }
    if (r.penerimaan > 0) {
      ws1['E' + rNum] = { t: 'n', v: r.penerimaan, z: '#,##0.00' };
    }
    if (r.pengeluaran > 0) {
      ws1['F' + rNum] = { t: 'n', v: r.pengeluaran, z: '#,##0.00' };
    }
  });

  const totalRow1 = 12 + bkuData.rows.length;
  ws1['E' + totalRow1] = { t: 'n', f: `SUM(E12:E${totalRow1 - 1})`, v: bkuData.totalPenerimaan, z: '#,##0.00' };
  ws1['F' + totalRow1] = { t: 'n', f: `SUM(F12:F${totalRow1 - 1})`, v: bkuData.totalPengeluaran, z: '#,##0.00' };
  ws1['G' + totalRow1] = { t: 'n', f: `G${totalRow1 - 1}`, v: bkuData.saldoAkhir, z: '#,##0.00' };

  ws1['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 45 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'BK UMUM');

  // ==========================================
  // SHEET 2: BKU TUNAI (Kolom Rincian Barang Lengkap)
  // ==========================================
  const tunaiData = calculateBkuTunaiRows(transactions);
  const sheet2Rows: (string | number)[][] = [
    ['BUKU KAS TUNAI'],
    [profile.judulPekerjaan],
    [`Bulan : ${profile.bulanLaporan}`],
    [''],
    ['NAMA SEKOLAH', `: ${profile.namaSekolah}`],
    ['ALAMAT', `: ${profile.alamat}`],
    ['KECAMATAN', `: ${profile.kecamatan}`],
    ['KABUPATEN', `: ${profile.kabupaten}`],
    [''],
    [
      'NO.',
      'TANGGAL',
      'NAMA BARANG / URAIAN',
      'VOL',
      'SATUAN',
      'HARGA SATUAN (Rp)',
      'NO. BUKTI',
      'PENERIMAAN (Rp)',
      'PENGELUARAN (Rp)',
      'SALDO (Rp)',
    ],
    ['1', '2', '3a', '3b', '3c', '3d', '4', '5', '6', '7'],
  ];

  tunaiData.rows.forEach((r) => {
    const hasSub = Boolean(r.transaction.subItems && r.transaction.subItems.length > 0);

    // Baris Induk Transaksi
    sheet2Rows.push([
      r.nomorBukti ? r.no : '',
      r.tanggal,
      r.uraian,
      '',
      '',
      '',
      r.nomorBukti || '',
      r.penerimaan > 0 ? r.penerimaan : '',
      r.pengeluaran > 0 ? r.pengeluaran : '',
      r.saldo,
    ]);

    // Sub-items per kolom jika ada (Pasir, Kayu, Upah, dll)
    if (hasSub && r.transaction.subItems) {
      r.transaction.subItems.forEach((item) => {
        sheet2Rows.push([
          '',
          '',
          item.nama,
          item.volume,
          item.satuan,
          item.hargaSatuan,
          '',
          '',
          item.subtotal,
          '',
        ]);
      });

      // Baris Jumlah Nota
      sheet2Rows.push([
        '',
        '',
        'Jumlah Nota',
        '',
        '',
        '',
        '',
        '',
        r.pengeluaran,
        '',
      ]);
    }
  });

  sheet2Rows.push([
    '',
    '',
    'JUMLAH',
    '',
    '',
    '',
    '',
    tunaiData.totalPenerimaan,
    tunaiData.totalPengeluaran,
    tunaiData.saldoAkhir,
  ]);
  sheet2Rows.push(['']);
  sheet2Rows.push(['Kepala Sekolah', '', '', '', '', '', '', '', 'Bendahara']);
  sheet2Rows.push(['', '', '', '', '', '', '', '', '']);
  sheet2Rows.push(['', '', '', '', '', '', '', '', '']);
  sheet2Rows.push([profile.namaKepalaSekolah, '', '', '', '', '', '', '', profile.namaBendahara]);
  sheet2Rows.push([`NIP. ${profile.nipKepalaSekolah}`, '', '', '', '', '', '', '', `NIP. ${profile.nipBendahara}`]);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);

  // Injeksi Rumus Excel Dinamis BKU TUNAI: Saldo = Saldo Sebelumnya + Penerimaan - Pengeluaran
  let currRow2 = 12;
  let prevTxRow2: number | null = null;
  tunaiData.rows.forEach((r) => {
    const txRow = currRow2;
    const hasSub = Boolean(r.transaction.subItems && r.transaction.subItems.length > 0);

    if (prevTxRow2 === null) {
      ws2['J' + txRow] = { t: 'n', f: `H${txRow}-I${txRow}`, v: r.saldo, z: '#,##0.00' };
    } else {
      ws2['J' + txRow] = { t: 'n', f: `J${prevTxRow2}+H${txRow}-I${txRow}`, v: r.saldo, z: '#,##0.00' };
    }

    if (r.penerimaan > 0) {
      ws2['H' + txRow] = { t: 'n', v: r.penerimaan, z: '#,##0.00' };
    }
    if (r.pengeluaran > 0) {
      ws2['I' + txRow] = { t: 'n', v: r.pengeluaran, z: '#,##0.00' };
    }

    prevTxRow2 = txRow;
    currRow2++;

    if (hasSub && r.transaction.subItems) {
      const firstSub = currRow2;
      r.transaction.subItems.forEach((item) => {
        const subRow = currRow2;
        ws2['I' + subRow] = { t: 'n', f: `D${subRow}*F${subRow}`, v: item.subtotal, z: '#,##0.00' };
        currRow2++;
      });
      const lastSub = currRow2 - 1;
      const notaRow = currRow2;
      ws2['I' + notaRow] = { t: 'n', f: `SUM(I${firstSub}:I${lastSub})`, v: r.pengeluaran, z: '#,##0.00' };
      currRow2++;
    }
  });

  const totalRow2 = currRow2;
  ws2['H' + totalRow2] = { t: 'n', f: `SUM(H12:H${totalRow2 - 1})`, v: tunaiData.totalPenerimaan, z: '#,##0.00' };
  ws2['I' + totalRow2] = { t: 'n', f: `SUM(I12:I${totalRow2 - 1})`, v: tunaiData.totalPengeluaran, z: '#,##0.00' };
  if (prevTxRow2 !== null) {
    ws2['J' + totalRow2] = { t: 'n', f: `J${prevTxRow2}`, v: tunaiData.saldoAkhir, z: '#,##0.00' };
  }

  ws2['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 35 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'BKU TUNAI');

  // ==========================================
  // SHEET 3: BK BANK
  // ==========================================
  const bankData = calculateBkBankRows(transactions);
  const sheet3Rows: (string | number)[][] = [
    ['BUKU KAS BANK'],
    [`Bulan : ${profile.bulanLaporan}`],
    [''],
    ['Nama Sekolah', `: ${profile.namaSekolah}`],
    ['Alamat', `: ${profile.alamat}`],
    ['Kabupaten', `: ${profile.kabupaten}`],
    ['Provinsi', `: ${profile.provinsi}`],
    ['Tahun Anggaran', `: ${profile.tahunAnggaran}`],
    [''],
    ['NO', 'Tanggal', 'URAIAN', 'Nomor Bukti', 'Debet (Rp)', 'Kredit (Rp)', 'Saldo (Rp)'],
    ['1', '2', '3', '4', '5', '6', '7'],
  ];

  bankData.rows.forEach((r) => {
    sheet3Rows.push([
      r.no,
      r.tanggal,
      r.uraian,
      r.nomorBukti || '',
      r.debet > 0 ? r.debet : '',
      r.kredit > 0 ? r.kredit : '',
      r.saldo,
    ]);
  });

  sheet3Rows.push([
    '',
    '',
    'JUMLAH',
    '',
    bankData.totalDebet,
    bankData.totalKredit,
    bankData.saldoAkhir,
  ]);
  sheet3Rows.push(['']);
  sheet3Rows.push(['Kepala Sekolah', '', '', '', 'Bendahara']);
  sheet3Rows.push(['', '', '', '', '']);
  sheet3Rows.push(['', '', '', '', '']);
  sheet3Rows.push([profile.namaKepalaSekolah, '', '', '', profile.namaBendahara]);
  sheet3Rows.push([`NIP. ${profile.nipKepalaSekolah}`, '', '', '', `NIP. ${profile.nipBendahara}`]);

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);

  // Injeksi Rumus Excel Dinamis BK BANK: Saldo = Saldo Sebelumnya + Debet - Kredit
  bankData.rows.forEach((r, i) => {
    const rNum = 12 + i;
    if (i === 0) {
      ws3['G' + rNum] = { t: 'n', f: `E${rNum}-F${rNum}`, v: r.saldo, z: '#,##0.00' };
    } else {
      ws3['G' + rNum] = { t: 'n', f: `G${rNum - 1}+E${rNum}-F${rNum}`, v: r.saldo, z: '#,##0.00' };
    }
    if (r.debet > 0) {
      ws3['E' + rNum] = { t: 'n', v: r.debet, z: '#,##0.00' };
    }
    if (r.kredit > 0) {
      ws3['F' + rNum] = { t: 'n', v: r.kredit, z: '#,##0.00' };
    }
  });

  const totalRow3 = 12 + bankData.rows.length;
  ws3['E' + totalRow3] = { t: 'n', f: `SUM(E12:E${totalRow3 - 1})`, v: bankData.totalDebet, z: '#,##0.00' };
  ws3['F' + totalRow3] = { t: 'n', f: `SUM(F12:F${totalRow3 - 1})`, v: bankData.totalKredit, z: '#,##0.00' };
  ws3['G' + totalRow3] = { t: 'n', f: `G${totalRow3 - 1}`, v: bankData.saldoAkhir, z: '#,##0.00' };
  ws3['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 40 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'BK BANK');

  // ==========================================
  // SHEET 4: CETAK KWITANSI
  // ==========================================
  const kwitansiTx =
    selectedKwitansiTx ||
    transactions.find((t) => t.nomorBukti === 'BKU 38') ||
    transactions.find((t) => t.pengeluaran > 0 && t.nomorBukti);

  const kwitansiNominal = kwitansiTx ? kwitansiTx.pengeluaran : 0;
  const kwitansiTerbilang = terbilangRupiah(kwitansiNominal);

  const sheet4Rows: (string | number)[][] = [
    ['', '', 'KWITANSI', '', ''],
    [''],
    ['Nomor BKU', `: ${kwitansiTx?.nomorBukti || 'BKU 01'}`],
    [''],
    ['Sudah Terima Dari', `: Bendahara DAK ${profile.namaSekolah}`],
    [''],
    ['Jumlah Uang Terbilang', `: ${kwitansiTerbilang}`],
    [''],
    ['Untuk Pembayaran', `: ${kwitansiTx?.uraian || '-'}`],
    [''],
    ['Jumlah', `: ${formatRupiahBulat(kwitansiNominal)}`],
    [''],
    [''],
    [
      'Setuju Bayar :',
      '',
      `Lunas Bayar : Lunas  ${kwitansiTx?.tanggal || profile.tanggalTutupBuku}`,
      '',
      kwitansiTx?.tanggal || profile.tanggalTutupBuku,
    ],
    ['Kepala Sekolah', '', 'Bendahara', '', 'Yang Menerima'],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    [
      profile.namaKepalaSekolah,
      '',
      profile.namaBendahara,
      '',
      kwitansiTx?.penerima || '..................................',
    ],
    [
      `NIP. ${profile.nipKepalaSekolah}`,
      '',
      `NIP. ${profile.nipBendahara}`,
      '',
      kwitansiTx?.penerima ? '' : 'Nama Jelas & TTD',
    ],
  ];

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows);
  ws4['!cols'] = [
    { wch: 22 },
    { wch: 4 },
    { wch: 35 },
    { wch: 4 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, ws4, 'CETAK KWITANSI');

  // Generate binary output
    const cleanSchoolName = profile.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `LPJ_DAK_${cleanSchoolName}_${profile.bulanLaporan.replace(/\s+/g, '_')}.xlsx`;

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const blobUrl = URL.createObjectURL(blob);
    let downloaded = false;

    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      downloaded = true;
      setTimeout(() => {
        document.body.removeChild(link);
      }, 1000);
    } catch (downloadErr) {
      console.warn('Auto download blocked by browser iframe:', downloadErr);
    }

    // Always inform user and provide direct fallback link
    store.showToast({
      type: 'success',
      title: 'File Excel LPJ Siap!',
      message: `File ${fileName} berhasil dibuat.`,
      actionUrl: blobUrl,
      actionLabel: downloaded ? 'Unduh Lagi' : 'Klik di Sini untuk Unduh',
      actionDownloadName: fileName,
    });
  } catch (error) {
    console.error('Failed to generate Excel file:', error);
    const store = useLpjStore.getState();
    store.showToast({
      type: 'error',
      title: 'Gagal Membuat Excel',
      message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyusun file Excel.',
    });
  }
}
