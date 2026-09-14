import * as XLSX from 'xlsx';
import { ProjectProfile, Transaction } from '../types';
import { groupTransactionsByMonthlyBooks } from './calculations';
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
      message: 'Sedang menyusun lembar kerja LPJ DAK per bulan lengkap dengan tutup buku & tanda tangan...',
    });

    const wb = XLSX.utils.book_new();
    const monthlyGroups = groupTransactionsByMonthlyBooks(transactions, profile);

    // ==========================================
    // SHEET 1: BK UMUM (Per Bulan Tutup Buku)
    // ==========================================
    const sheet1Rows: (string | number)[][] = [];

    monthlyGroups.forEach((group, gIdx) => {
      if (gIdx > 0) {
        sheet1Rows.push(['']);
        sheet1Rows.push(['']);
        sheet1Rows.push(['-------------------------------------------------------------------------------------------------------------']);
        sheet1Rows.push(['']);
      }

      sheet1Rows.push(['BUKU KAS UMUM']);
      sheet1Rows.push([profile.judulPekerjaan]);
      sheet1Rows.push([`Bulan : ${group.label}`]);
      sheet1Rows.push(['']);
      sheet1Rows.push(['NAMA SEKOLAH', `: ${profile.namaSekolah}`]);
      sheet1Rows.push(['ALAMAT', `: ${profile.alamat}`]);
      sheet1Rows.push(['KECAMATAN', `: ${profile.kecamatan}`]);
      sheet1Rows.push(['KABUPATEN', `: ${profile.kabupaten}`]);
      sheet1Rows.push(['']);
      sheet1Rows.push([
        'NO.',
        'TANGGAL',
        'URAIAN TRANSAKSI',
        'No. Bukti',
        'PENERIMAAN (Rp)',
        'PENGELUARAN (Rp)',
        'SALDO (Rp)',
      ]);
      sheet1Rows.push(['1', '2', '3', '4', '5', '6', '7']);

      group.bku.rows.forEach((r) => {
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
        group.bku.totalPenerimaan,
        group.bku.totalPengeluaran,
        group.bku.saldoAkhir,
      ]);
      sheet1Rows.push(['']);
      sheet1Rows.push([`Pada hari ini : ${group.tanggalTutupBuku}`]);
      sheet1Rows.push([
        'Buku Kas Umum ditutup dengan keadaan/posisi Buku sebagai berikut :',
      ]);
      sheet1Rows.push(['Sisa Saldo Bank', `: Rp ${group.summary.saldoBank.toLocaleString('id-ID')}`]);
      sheet1Rows.push(['Sisa Saldo Kas Tunai', `: Rp ${group.summary.saldoTunai.toLocaleString('id-ID')}`]);
      sheet1Rows.push(['Jumlah', `: Rp ${group.summary.saldoKumulatif.toLocaleString('id-ID')}`]);
      sheet1Rows.push(['']);
      sheet1Rows.push(['', '', profile.namaPanitia]);
      sheet1Rows.push(['', '', '']);
      sheet1Rows.push(['Kepala Sekolah', '', '', '', 'Dibuat Oleh Bendahara']);
      sheet1Rows.push(['', '', '', '', '']);
      sheet1Rows.push(['', '', '', '', '']);
      sheet1Rows.push([profile.namaKepalaSekolah, '', '', '', profile.namaBendahara]);
      sheet1Rows.push([`NIP. ${profile.nipKepalaSekolah}`, '', '', '', `NIP. ${profile.nipBendahara}`]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
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
    // SHEET 2: BKU TUNAI (Per Bulan Tutup Buku)
    // ==========================================
    const sheet2Rows: (string | number)[][] = [];

    monthlyGroups.forEach((group, gIdx) => {
      if (gIdx > 0) {
        sheet2Rows.push(['']);
        sheet2Rows.push(['']);
        sheet2Rows.push(['-------------------------------------------------------------------------------------------------------------']);
        sheet2Rows.push(['']);
      }

      sheet2Rows.push(['BUKU KAS TUNAI']);
      sheet2Rows.push([profile.judulPekerjaan]);
      sheet2Rows.push([`Bulan : ${group.label}`]);
      sheet2Rows.push(['']);
      sheet2Rows.push(['NAMA SEKOLAH', `: ${profile.namaSekolah}`]);
      sheet2Rows.push(['ALAMAT', `: ${profile.alamat}`]);
      sheet2Rows.push(['KECAMATAN', `: ${profile.kecamatan}`]);
      sheet2Rows.push(['KABUPATEN', `: ${profile.kabupaten}`]);
      sheet2Rows.push(['']);
      sheet2Rows.push([
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
      ]);
      sheet2Rows.push(['1', '2', '3a', '3b', '3c', '3d', '4', '5', '6', '7']);

      group.bkuTunai.rows.forEach((r) => {
        if (r.isInitialRow) {
          sheet2Rows.push([
            r.no,
            r.tanggal,
            r.uraian,
            '',
            '',
            '',
            '',
            r.penerimaan > 0 ? r.penerimaan : '',
            '',
            r.saldo,
          ]);
          return;
        }

        const hasSub = Boolean(r.transaction.subItems && r.transaction.subItems.length > 0);

        sheet2Rows.push([
          r.nomorBukti ? r.no : '',
          r.tanggal,
          r.uraian,
          '',
          '',
          '',
          r.nomorBukti || '',
          r.penerimaan > 0 ? r.penerimaan : '',
          hasSub ? '' : r.pengeluaran > 0 ? r.pengeluaran : '',
          r.saldo,
        ]);

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
        group.bkuTunai.totalPenerimaan,
        group.bkuTunai.totalPengeluaran,
        group.bkuTunai.saldoAkhir,
      ]);
      sheet2Rows.push(['']);
      sheet2Rows.push([`Pada hari ini : ${group.tanggalTutupBuku}`]);
      sheet2Rows.push([
        'Buku Kas Pembantu Tunai ditutup dengan keadaan/posisi Buku sebagai berikut :',
      ]);
      sheet2Rows.push(['Sisa Saldo Kas Tunai', `: Rp ${group.summary.saldoTunai.toLocaleString('id-ID')}`]);
      sheet2Rows.push(['Terbilang', `: ${terbilangRupiah(group.summary.saldoTunai)}`]);
      sheet2Rows.push(['']);
      sheet2Rows.push(['', '', profile.namaPanitia]);
      sheet2Rows.push(['Kepala Sekolah', '', '', '', '', '', '', '', 'Bendahara']);
      sheet2Rows.push(['', '', '', '', '', '', '', '', '']);
      sheet2Rows.push(['', '', '', '', '', '', '', '', '']);
      sheet2Rows.push([profile.namaKepalaSekolah, '', '', '', '', '', '', '', profile.namaBendahara]);
      sheet2Rows.push([`NIP. ${profile.nipKepalaSekolah}`, '', '', '', '', '', '', '', `NIP. ${profile.nipBendahara}`]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
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
    // SHEET 3: BK BANK (Per Bulan Tutup Buku)
    // ==========================================
    const sheet3Rows: (string | number)[][] = [];

    monthlyGroups.forEach((group, gIdx) => {
      if (gIdx > 0) {
        sheet3Rows.push(['']);
        sheet3Rows.push(['']);
        sheet3Rows.push(['-------------------------------------------------------------------------------------------------------------']);
        sheet3Rows.push(['']);
      }

      sheet3Rows.push(['BUKU KAS BANK']);
      sheet3Rows.push([`Bulan : ${group.label}`]);
      sheet3Rows.push(['']);
      sheet3Rows.push(['Nama Sekolah', `: ${profile.namaSekolah}`]);
      sheet3Rows.push(['Alamat', `: ${profile.alamat}`]);
      sheet3Rows.push(['Kabupaten', `: ${profile.kabupaten}`]);
      sheet3Rows.push(['Provinsi', `: ${profile.provinsi}`]);
      sheet3Rows.push(['Tahun Anggaran', `: ${profile.tahunAnggaran}`]);
      sheet3Rows.push(['']);
      sheet3Rows.push(['NO', 'Tanggal', 'URAIAN', 'Nomor Bukti', 'Debet (Rp)', 'Kredit (Rp)', 'Saldo (Rp)']);
      sheet3Rows.push(['1', '2', '3', '4', '5', '6', '7']);

      group.bkBank.rows.forEach((r) => {
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
        group.bkBank.totalDebet,
        group.bkBank.totalKredit,
        group.bkBank.saldoAkhir,
      ]);
      sheet3Rows.push(['']);
      sheet3Rows.push([`Pada hari ini : ${group.tanggalTutupBuku}`]);
      sheet3Rows.push([
        'Buku Kas Bank ditutup dengan keadaan/posisi Buku sebagai berikut :',
      ]);
      sheet3Rows.push(['Sisa Saldo Bank', `: Rp ${group.summary.saldoBank.toLocaleString('id-ID')}`]);
      sheet3Rows.push(['Terbilang', `: ${terbilangRupiah(group.summary.saldoBank)}`]);
      sheet3Rows.push(['']);
      sheet3Rows.push(['', '', profile.namaPanitia]);
      sheet3Rows.push(['Kepala Sekolah', '', '', '', 'Bendahara']);
      sheet3Rows.push(['', '', '', '', '']);
      sheet3Rows.push(['', '', '', '', '']);
      sheet3Rows.push([profile.namaKepalaSekolah, '', '', '', profile.namaBendahara]);
      sheet3Rows.push([`NIP. ${profile.nipKepalaSekolah}`, '', '', '', `NIP. ${profile.nipBendahara}`]);
    });

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
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

    store.showToast({
      type: 'success',
      title: 'File Excel LPJ Siap!',
      message: `File ${fileName} berhasil dibuat dengan pemisahan tutup buku per bulan.`,
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
