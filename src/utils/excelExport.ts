import * as XLSX from 'xlsx';
import { ProjectProfile, Transaction } from '../types';
import { groupTransactionsByMonthlyBooks, isTarikTunaiOrSp2d } from './calculations';
import { formatRupiahBulat, terbilangRupiah } from './terbilang';
import {
  formatToSlashDate,
  indonesianDateToIso,
  getFirstDateForMonth,
} from './dateUtils';
import { groupPajakRowsByMonthlyBooks } from './pajakUtils';
import { useLpjStore } from '../store/lpjStore';
import {
  extractDaftarBahan,
  calculateUpahJumlah,
  calculateTotalHari,
  calculateTotalHariForWeek,
  calculateUpahJumlahForWeek,
  formatDayCell,
  formatTotalHari,
  HARI_KERJA_2_MINGGU,
  getDayValue,
  getKodeMtp,
} from './bahanTukangUtils';

function extractBuktiNum(noBukti: string | undefined | null): number {
  if (!noBukti) return 999999;
  const match = noBukti.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
}

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
    // SHEET 1: BK UMUM (Format Resmi 7 Kolom: No, Tanggal, Uraian, No. Bukti, Penerimaan, Pengeluaran, Saldo)
    // ==========================================
    const sheet1Rows: (string | number)[][] = [];
    const monthlyPajakGroups = groupPajakRowsByMonthlyBooks(store.pajakRows || [], transactions, profile, true);

    let runningCumulativeSaldoExcel = 0;

    monthlyGroups.forEach((group, gIdx) => {
      const isFirstMonth = gIdx === 0;
      const prevMonthSaldo = runningCumulativeSaldoExcel;

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

      // Header 7 Kolom Resmi Sesuai Screenshot
      sheet1Rows.push([
        'No',
        'Tanggal',
        'Uraian',
        'No. Bukti',
        'Penerimaan (Rp)',
        'Pengeluaran (Rp)',
        'Saldo (Rp)',
      ]);

      // Siapkan baris transaksi terpadu (Bank, Tunai, dan Pajak)
      interface ExcelBkuRow {
        sortDate: string;
        tanggal: string;
        uraian: string;
        nomorBukti: string;
        penerimaan: number;
        pengeluaran: number;
        isInitial?: boolean;
        isTax?: boolean;
      }

      const rowsForMonth: ExcelBkuRow[] = [];

      // 1. Sisa saldo bulan lalu
      if (!isFirstMonth) {
        const prevGroupName = monthlyGroups[gIdx - 1]?.monthName || '';
        const firstDateStr = getFirstDateForMonth(group.monthName, group.year);
        rowsForMonth.push({
          sortDate: indonesianDateToIso(firstDateStr) || `${group.year}-01-01`,
          tanggal: formatToSlashDate(firstDateStr),
          uraian: `Sisa Saldo Bulan ${prevGroupName}`,
          nomorBukti: '-',
          penerimaan: prevMonthSaldo,
          pengeluaran: 0,
          isInitial: true,
        });
      }

      // 2. Transaksi Operasional
      const showTarikTunai = Boolean(profile.tampilkanTarikTunaiDiBku);
      const posisiTarikTunai = profile.posisiTarikTunaiDiBku || 'penerimaan';

      // 2. Kumpulkan Baris Pajak Bulan Ini
      const matchingPajak = monthlyPajakGroups.find((pg) => pg.monthKey === group.monthKey);
      const taxRowsThisMonth = (matchingPajak?.rows || []).filter(
        (pRow) => pRow.isTax && !pRow.isInitialRow
      );
      const usedTaxRowIds = new Set<string>();

      // 3. Urutkan Transaksi Utama Bulan Ini secara Kronologis & Nomor Bukti (KW-006, KW-007, KW-008)
      const sortedTransactions = [...group.transactions].sort((a, b) => {
        const dateA = indonesianDateToIso(a.tanggal) || '9999-99-99';
        const dateB = indonesianDateToIso(b.tanggal) || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const isFundingA = a.metode === 'BANK' && (a.jenis === 'PENERIMAAN' || a.penerimaan > 0);
        const isFundingB = b.metode === 'BANK' && (b.jenis === 'PENERIMAAN' || b.penerimaan > 0);
        if (isFundingA && !isFundingB) return -1;
        if (!isFundingA && isFundingB) return 1;

        const isTarikA = isTarikTunaiOrSp2d(a);
        const isTarikB = isTarikTunaiOrSp2d(b);
        if (isTarikA && !isTarikB) return -1;
        if (!isTarikA && isTarikB) return 1;

        const numA = extractBuktiNum(a.nomorBukti);
        const numB = extractBuktiNum(b.nomorBukti);
        if (numA !== numB) return numA - numB;

        return a.id.localeCompare(b.id);
      });

      // 4. Susun Baris BKU: Setiap belanja KW langsung diikuti pajak miliknya masing-masing
      sortedTransactions.forEach((t) => {
        const isSp2d = isTarikTunaiOrSp2d(t);
        const tDate = formatToSlashDate(t.tanggal);
        const sortDate = indonesianDateToIso(t.tanggal) || '9999-99-99';

        if (isSp2d) {
          const nominal = t.penerimaan > 0 ? t.penerimaan : t.pengeluaran > 0 ? t.pengeluaran : 0;
          if (showTarikTunai) {
            rowsForMonth.push({
              sortDate,
              tanggal: tDate,
              uraian: 'Penarikan tunai dari rekening Bank (untuk Kas Tunai)',
              nomorBukti: t.nomorBukti || 'BB-001',
              penerimaan: 0,
              pengeluaran: nominal,
            });
            rowsForMonth.push({
              sortDate,
              tanggal: tDate,
              uraian: 'Penerimaan kas tunai dari penarikan Bank',
              nomorBukti: t.nomorBukti || 'SP2D-001',
              penerimaan: nominal,
              pengeluaran: 0,
            });
          }
        } else if (t.metode === 'BANK' && (t.jenis === 'PENERIMAAN' || t.penerimaan > 0)) {
          rowsForMonth.push({
            sortDate,
            tanggal: tDate,
            uraian: t.uraian,
            nomorBukti: t.nomorBukti || 'SP2D-001',
            penerimaan: t.penerimaan,
            pengeluaran: 0,
          });
        } else if (t.metode === 'BANK' && (t.jenis === 'PENGELUARAN' || t.pengeluaran > 0)) {
          rowsForMonth.push({
            sortDate,
            tanggal: tDate,
            uraian: t.uraian,
            nomorBukti: t.nomorBukti || 'BB-001',
            penerimaan: 0,
            pengeluaran: t.pengeluaran,
          });
        } else if (t.metode === 'TUNAI' && (t.jenis === 'PENGELUARAN' || t.pengeluaran > 0)) {
          rowsForMonth.push({
            sortDate,
            tanggal: tDate,
            uraian: t.uraian,
            nomorBukti: t.nomorBukti || 'KW-001',
            penerimaan: 0,
            pengeluaran: t.pengeluaran,
          });
        } else if (t.metode === 'TUNAI' && (t.jenis === 'PENERIMAAN' || t.penerimaan > 0)) {
          rowsForMonth.push({
            sortDate,
            tanggal: tDate,
            uraian: t.uraian,
            nomorBukti: t.nomorBukti || 'BKT-001',
            penerimaan: t.penerimaan,
            pengeluaran: 0,
          });
        }

        // Tepat di bawah belanja ini: sisipkan pajak terkait
        const linkedTaxes = taxRowsThisMonth.filter((pRow) => {
          if (usedTaxRowIds.has(pRow.id)) return false;
          if (pRow.linkedTxId && pRow.linkedTxId === t.id) return true;
          if (t.nomorBukti && pRow.nomorBukti && pRow.nomorBukti.trim() === t.nomorBukti.trim()) return true;
          return false;
        });

        if (linkedTaxes.length > 0) {
          const potonganList = linkedTaxes.filter((p) => p.penerimaan > 0);
          potonganList.forEach((pRow) => {
            usedTaxRowIds.add(pRow.id);
            const pDate = formatToSlashDate(pRow.tanggal);
            const pSortDate = indonesianDateToIso(pRow.tanggal) || sortDate;
            rowsForMonth.push({
              sortDate: pSortDate,
              tanggal: pDate,
              uraian: pRow.uraian,
              nomorBukti: pRow.nomorBukti || t.nomorBukti || '-',
              penerimaan: pRow.penerimaan,
              pengeluaran: 0,
              isTax: true,
            });
          });

          const setoranList = linkedTaxes.filter((p) => p.pengeluaran > 0);
          setoranList.forEach((pRow) => {
            usedTaxRowIds.add(pRow.id);
            const pDate = formatToSlashDate(pRow.tanggal);
            const pSortDate = indonesianDateToIso(pRow.tanggal) || sortDate;
            rowsForMonth.push({
              sortDate: pSortDate,
              tanggal: pDate,
              uraian: pRow.uraian,
              nomorBukti: pRow.nomorBukti || 'BPN-001',
              penerimaan: 0,
              pengeluaran: pRow.pengeluaran,
              isTax: true,
            });
          });
        }
      });

      // Sisipkan baris pajak mandiri jika ada
      const unlinkedTaxes = taxRowsThisMonth.filter((p) => !usedTaxRowIds.has(p.id));
      unlinkedTaxes.forEach((pRow) => {
        const pDate = formatToSlashDate(pRow.tanggal);
        const pSortDate = indonesianDateToIso(pRow.tanggal) || '9999-99-99';
        if (pRow.penerimaan > 0) {
          rowsForMonth.push({
            sortDate: pSortDate,
            tanggal: pDate,
            uraian: pRow.uraian,
            nomorBukti: pRow.nomorBukti || '-',
            penerimaan: pRow.penerimaan,
            pengeluaran: 0,
            isTax: true,
          });
        }
        if (pRow.pengeluaran > 0) {
          rowsForMonth.push({
            sortDate: pSortDate,
            tanggal: pDate,
            uraian: pRow.uraian,
            nomorBukti: pRow.nomorBukti || 'BPN-001',
            penerimaan: 0,
            pengeluaran: pRow.pengeluaran,
            isTax: true,
          });
        }
      });

      const finalExcelRows: ExcelBkuRow[] = rowsForMonth;

      let runningSaldo = 0;
      let monthTotPenerimaan = 0;
      let monthTotPengeluaran = 0;

      finalExcelRows.forEach((r, idx) => {
        if (r.isInitial) {
          runningSaldo = r.penerimaan;
        } else {
          runningSaldo += r.penerimaan - r.pengeluaran;
          monthTotPenerimaan += r.penerimaan;
          monthTotPengeluaran += r.pengeluaran;
        }

        sheet1Rows.push([
          idx + 1,
          r.tanggal,
          r.uraian,
          r.nomorBukti,
          r.penerimaan > 0 ? r.penerimaan : '-',
          r.pengeluaran > 0 ? r.pengeluaran : '-',
          runningSaldo,
        ]);
      });

      runningCumulativeSaldoExcel = runningSaldo;

      const totalPenerimaanSheet = isFirstMonth ? monthTotPenerimaan : prevMonthSaldo + monthTotPenerimaan;
      const totalPengeluaranSheet = monthTotPengeluaran;

      // Baris Bawah: JUMLAH
      sheet1Rows.push([
        '',
        '',
        'JUMLAH',
        '',
        totalPenerimaanSheet,
        totalPengeluaranSheet,
        runningCumulativeSaldoExcel,
      ]);

      const tglTutup = formatToSlashDate(group.tanggalTutupBuku);
      sheet1Rows.push(['']);
      sheet1Rows.push([`Pada hari ini : ${tglTutup} Buku Kas Umum ditutup dengan keadaan/posisi Buku sebagai berikut :`]);
      sheet1Rows.push(['Saldo Buku Kas Umum', '', '', '', '', '', runningCumulativeSaldoExcel]);
      sheet1Rows.push(['Terdiri dari :']);
      sheet1Rows.push(['1. Saldo Bank', '', '', '', '', '', group.summary.saldoBank]);
      sheet1Rows.push(['2. Saldo Kas Tunai', '', '', '', '', '', group.summary.saldoTunai]);
      const taxSaldoMonth = matchingPajak ? matchingPajak.saldoAkhirPajak : 0;
      if (taxSaldoMonth !== 0) {
        sheet1Rows.push(['3. Saldo Kas Pajak (Belum Disetor)', '', '', '', '', '', taxSaldoMonth]);
      }
      sheet1Rows.push(['Jumlah (Bank + Tunai + Pajak)', '', '', '', '', '', group.summary.saldoBank + group.summary.saldoTunai + taxSaldoMonth]);
      sheet1Rows.push(['Perbedaan', '', '', '', '', '', 0]);
      sheet1Rows.push(['']);

      // 3 Tanda Tangan: Kepala Sekolah, Ketua P2S, Bendahara
      sheet1Rows.push(['Mengetahui,', '', '', 'Ketua P2SP', '', `${profile.tempatPelunasan || profile.kabupaten || 'Palasa'}, ${tglTutup}`, '']);
      sheet1Rows.push([`Kepala ${profile.namaSekolah || 'Sekolah'}`, '', '', '', '', 'Bendahara', '']);
      sheet1Rows.push(['', '', '', '', '', '', '']);
      sheet1Rows.push(['', '', '', '', '', '', '']);
      sheet1Rows.push([
        profile.namaKepalaSekolah, '', '',
        profile.namaKetuaP2S || profile.namaPanitia || 'Ketua P2SP', '',
        profile.namaBendahara, ''
      ]);
      sheet1Rows.push([
        `NIP. ${profile.nipKepalaSekolah}`, '', '',
        '-', '',
        `NIP. ${profile.nipBendahara}`, ''
      ]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    ws1['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 42 },
      { wch: 16 },
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
        'URAIAN',
        'NO. BUKTI',
        'PENERIMAAN (Rp)',
        'PENGELUARAN (Rp)',
        'SALDO (Rp)',
      ]);
      sheet2Rows.push(['1', '2', '3', '4', '5', '6', '7']);

      group.bkuTunai.rows.forEach((r) => {
        if (r.isInitialRow) {
          sheet2Rows.push([
            r.no,
            formatToSlashDate(r.tanggal),
            r.uraian,
            '-',
            r.penerimaan > 0 ? r.penerimaan : '',
            '',
            r.saldo,
          ]);
          return;
        }

        sheet2Rows.push([
          r.nomorBukti ? r.no : '',
          formatToSlashDate(r.tanggal),
          r.uraian,
          r.nomorBukti || '',
          r.penerimaan > 0 ? r.penerimaan : '',
          r.pengeluaran > 0 ? r.pengeluaran : '',
          r.saldo,
        ]);
      });

      const tglTutup = formatToSlashDate(group.tanggalTutupBuku);
      sheet2Rows.push([
        'JUMLAH',
        '',
        '',
        '',
        group.bkuTunai.totalPenerimaan,
        group.bkuTunai.totalPengeluaran,
        group.bkuTunai.saldoAkhir,
      ]);
      sheet2Rows.push(['']);
      sheet2Rows.push([`Pada hari ini : ${tglTutup}`]);
      sheet2Rows.push([
        'Buku Kas Pembantu Tunai ditutup dengan keadaan/posisi Buku sebagai berikut :',
      ]);
      sheet2Rows.push(['Sisa Saldo Kas Tunai', `: Rp ${group.summary.saldoTunai.toLocaleString('id-ID')}`]);
      sheet2Rows.push(['Terbilang', `: ${terbilangRupiah(group.summary.saldoTunai)}`]);
      sheet2Rows.push(['']);
      // 3 Tanda Tangan: Kepala Sekolah, Ketua P2S, Bendahara
      sheet2Rows.push(['Mengetahui,', '', 'Ketua P2SP', '', `${profile.tempatPelunasan || profile.kabupaten || 'Palasa'}, ${tglTutup}`, '', '']);
      sheet2Rows.push([`Kepala ${profile.namaSekolah || 'Sekolah'}`, '', '', '', 'Bendahara', '', '']);
      sheet2Rows.push(['', '', '', '', '', '', '']);
      sheet2Rows.push(['', '', '', '', '', '', '']);
      sheet2Rows.push([
        profile.namaKepalaSekolah, '',
        profile.namaKetuaP2S || profile.namaPanitia || 'Ketua P2SP', '',
        profile.namaBendahara, '', ''
      ]);
      sheet2Rows.push([
        `NIP. ${profile.nipKepalaSekolah}`, '',
        '-', '',
        `NIP. ${profile.nipBendahara}`, '', ''
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    ws2['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 42 },
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
          formatToSlashDate(r.tanggal),
          r.uraian,
          r.nomorBukti || '',
          r.debet > 0 ? r.debet : '',
          r.kredit > 0 ? r.kredit : '',
          r.saldo,
        ]);
      });

      const tglTutup = formatToSlashDate(group.tanggalTutupBuku);
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
      sheet3Rows.push([`Pada hari ini : ${tglTutup}`]);
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
    // SHEET 4: BKU PAJAK (Sesuai Gambar format_bku_pajak_d1c829d3.png + 3 Tanda Tangan)
    // ==========================================
    let runningSaldoPajak = 0;
    let totalTerimaPajak = 0;
    let totalKeluarPajak = 0;
    const pajakRowsComputed = (store.pajakRows || []).map((row, idx) => {
      const terima = Number(row.penerimaan) || 0;
      const keluar = Number(row.pengeluaran) || 0;
      totalTerimaPajak += terima;
      totalKeluarPajak += keluar;
      runningSaldoPajak = runningSaldoPajak + terima - keluar;
      return [
        idx + 1,
        formatToSlashDate(row.tanggal),
        row.nomorBukti || '',
        row.uraian,
        terima > 0 ? terima : '-',
        keluar > 0 ? keluar : '-',
        runningSaldoPajak > 0 ? runningSaldoPajak : '-',
      ];
    });

    const tglTutupPajak = formatToSlashDate(profile.tanggalTutupBuku || '31/08/2026');
    const sheetPajakRows: (string | number)[][] = [
      [profile.namaSekolah],
      ['BUKU KAS UMUM'],
      ['BUKU PEMBANTU PAJAK'],
      [`BULAN : ${(profile.bulanLaporan || 'AGUSTUS 2026').toUpperCase()}`],
      [],
      ['Kepala Sekolah', `: ${profile.namaKepalaSekolah}`],
      ['Bendahara Pengeluaran', `: ${profile.namaBendahara}`],
      [],
      ['No Urut', 'Tanggal', 'Nomor Bukti', 'Uraian', 'Penerimaan Rp.', 'Pengeluaran Rp.', 'Saldo Rp.'],
      ['1', '2', '3', '4', '5', '6', '7'],
      ...pajakRowsComputed,
      ['', '', '', 'JUMLAH', totalTerimaPajak, totalKeluarPajak, runningSaldoPajak],
      [],
      ['Mengetahui,', '', '', 'Ketua P2SP', '', `${profile.tempatPelunasan || profile.kabupaten || 'Palasa'}, ${tglTutupPajak}`, ''],
      [`Kepala ${profile.namaSekolah || 'Sekolah'}`, '', '', '', '', 'Bendahara', ''],
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      [
        profile.namaKepalaSekolah, '', '',
        profile.namaKetuaP2S || profile.namaPanitia || 'Ketua P2SP', '',
        profile.namaBendahara, ''
      ],
      [
        `NIP. ${profile.nipKepalaSekolah}`, '', '',
        '', '',
        `NIP. ${profile.nipBendahara}`, ''
      ],
    ];

    const wsPajak = XLSX.utils.aoa_to_sheet(sheetPajakRows);
    wsPajak['!cols'] = [
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 52 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPajak, 'BKU PAJAK');

    // ==========================================
    // SHEET 5: CETAK KWITANSI
    // ==========================================
    const kwitansiTx =
      selectedKwitansiTx ||
      transactions.find((t) => t.nomorBukti === 'BKU 38') ||
      transactions.find((t) => t.pengeluaran > 0 && t.nomorBukti);

    const kwitansiNominal = kwitansiTx ? kwitansiTx.pengeluaran : 0;
    const kwitansiTerbilang = terbilangRupiah(kwitansiNominal);
    const kwitansiTgl = formatToSlashDate(kwitansiTx?.tanggal || profile.tanggalTutupBuku);

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
        `Lunas Bayar : Lunas  ${kwitansiTgl}`,
        '',
        kwitansiTgl,
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

    // ==========================================
    // SHEET 6: DAFTAR BAHAN
    // ==========================================
    const allBahanItems = [
      ...extractDaftarBahan(transactions, true),
      ...store.customBahanList,
    ];
    const totalBahanSum = allBahanItems.reduce((acc, b) => acc + b.total, 0);

    const sheet5Rows: (string | number)[][] = [
      ['DAFTAR BAHAN'],
      [`NAMA SEKOLAH / PROYEK : ${profile.namaSekolah}`],
      [`BULAN LAPORAN          : ${profile.bulanLaporan}`],
      [],
      ['No.', 'Nama Barang', 'Satuan', 'Harga', 'Total'],
      ...allBahanItems.map((item, idx) => [
        idx + 1,
        item.namaBarang,
        item.satuanDisplay,
        item.harga,
        item.total,
      ]),
      ['', 'Jumlah Total', '', '', totalBahanSum],
    ];

    const ws5 = XLSX.utils.aoa_to_sheet(sheet5Rows);
    ws5['!cols'] = [
      { wch: 6 },
      { wch: 38 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws5, 'DAFTAR BAHAN');

    // ==========================================
    // SHEET 7 & 8: UPAH MINGGUAN (FORMAT BARU) & 2 MINGGUAN
    // ==========================================
    const activeAbsen =
      store.absenTukangList.find((w) => w.id === store.selectedAbsenWeekId) ||
      store.absenTukangList[0];

    if (activeAbsen) {
      const totalUpah = activeAbsen.pekerja.reduce(
        (sum, p) => sum + calculateUpahJumlah(p),
        0
      );

      const pekerjaan = activeAbsen.proyek || profile.judulPekerjaan || 'Pekerjaan Bangunan';
      const namaSekolah = profile.namaSekolah || activeAbsen.namaSekolah || 'NAMA SEKOLAH';
      const alamat = profile.alamat
        ? `${profile.alamat}${profile.kecamatan ? ', ' + profile.kecamatan : ''}${profile.kabupaten ? ', ' + profile.kabupaten : ''}`
        : (activeAbsen.lokasi || '-');
      const periodeKe = activeAbsen.periodeKe || activeAbsen.mingguKe || 1;
      const mggStart = (periodeKe - 1) * 2 + 1;
      const mggEnd = periodeKe * 2;
      const pertanggal = formatToSlashDate(activeAbsen.hariTanggal || '14/08/2026 s.d 27/08/2026');
      const namaKepalaSekolah = profile.namaKepalaSekolah || activeAbsen.namaKepalaSekolah || 'Nama Kepala Sekolah';
      const nipKepalaSekolah = profile.nipKepalaSekolah || activeAbsen.nipKepalaSekolah || '-';
      const namaBendahara = profile.namaBendahara || activeAbsen.namaBendahara || 'Nama Bendahara';
      const nipBendahara = profile.nipBendahara || activeAbsen.nipBendahara || '-';
      const namaKetuaP2SP = profile.namaKetuaP2S || profile.namaPanitia || 'Ketua P2SP';
      const namaPelaksana = profile.namaPelaksana || activeAbsen.namaPelaksana || 'Pelaksana';

      // SHEET 7: UPAH MINGGUAN (Sesuai format_upah_tukang_e7129d51.png)
      const totalHari1Mgg = activeAbsen.pekerja.reduce(
        (sum, p) => sum + calculateTotalHariForWeek(p.hariKerja, 1),
        0
      );
      const totalUpah1Mgg = activeAbsen.pekerja.reduce(
        (sum, p) => sum + calculateUpahJumlahForWeek(p, 1),
        0
      );

      const sheet7Rows: (string | number)[][] = [
        ['UPAH MINGGUAN'],
        [],
        ['', '', 'Tempat Tinggal', '', '', '', '', ''],
        [
          'No',
          'Nama',
          'Dalam Desa',
          'Luar Desa',
          'M/T/P',
          'Hari Kerja',
          'Upah Perhari',
          'Tanda Tangan/Cap jempol',
        ],
        ...activeAbsen.pekerja.map((p, idx) => [
          idx + 1,
          p.nama,
          p.tempatTinggal !== 'luar_desa' ? '✓' : '',
          p.tempatTinggal === 'luar_desa' ? '✓' : '',
          getKodeMtp(p),
          calculateTotalHariForWeek(p.hariKerja, 1),
          p.upahHarian,
          p.paraf && !/^\d+$/.test(p.paraf.trim()) ? p.paraf : '',
        ]),
        [
          'Jumlah',
          '',
          '',
          '',
          '',
          totalHari1Mgg,
          totalUpah1Mgg,
          '',
        ],
        [],
        ['Catatan:', '', '', '', '', `Tanggal : ${formatToSlashDate(profile.tanggalTutupBuku || '20/08/2026')}`, '', ''],
        ['M', 'Mandor', '', '', '', '', '', ''],
        ['T', 'Tukang', '', '', '', '', '', ''],
        ['P', 'Pekerja', '', '', '', '', '', ''],
        [],
        ['', '', '', 'Mengetahui', '', '', '', ''],
        ['Ketua P2SP', '', '', 'Pelaksana', '', '', 'Bendahara', ''],
        [],
        [],
        [],
        [namaKetuaP2SP, '', '', namaPelaksana, '', '', namaBendahara, ''],
      ];

      const ws7 = XLSX.utils.aoa_to_sheet(sheet7Rows);
      ws7['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
        {
          s: { r: 4 + activeAbsen.pekerja.length, c: 0 },
          e: { r: 4 + activeAbsen.pekerja.length, c: 4 },
        },
      ];
      ws7['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(wb, ws7, 'UPAH MINGGUAN');

      // SHEET 8: REKAP UPAH 2 MINGGU
      const sheet6Rows: (string | number)[][] = [
        ['REKAPITULASI UPAH KERJA DUA MINGGUAN'],
        [],
        ['PEKERJAAN', `:\t${pekerjaan}`],
        ['NAMA SEKOLAH', `:\t${namaSekolah}`],
        ['ALAMAT', `:\t${alamat}`],
        ['PERIODE (2 MINGGU) KE', `:\t${periodeKe} (Minggu ke-${mggStart} s.d ${mggEnd})`],
        ['PERTANGGAL', `:\t${pertanggal}`],
        [],
        [
          'NO.',
          'NAMA TUKANG',
          'TENAGA KERJA',
          'MINGGU I (HARI 1 - 7)',
          '',
          '',
          '',
          '',
          '',
          '',
          'MINGGU II (HARI 8 - 14)',
          '',
          '',
          '',
          '',
          '',
          '',
          'JUMLAH',
          '',
          '',
          'PARAF',
        ],
        [
          '',
          '',
          '',
          'I',
          'II',
          'III',
          'IV',
          'V',
          'VI',
          'VII',
          'I',
          'II',
          'III',
          'IV',
          'V',
          'VI',
          'VII',
          'TENAGA',
          'UPAH/HARI',
          'UPAH 2 MGG',
          '',
        ],
        [
          '',
          '',
          '',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'Org/2Mgg',
          '(Rp.)',
          '(Rp.)',
          '',
        ],
        ...activeAbsen.pekerja.map((p, idx) => [
          idx + 1,
          p.nama,
          p.tenagaKerja || p.kategori,
          ...HARI_KERJA_2_MINGGU.map((col) =>
            formatDayCell(getDayValue(p.hariKerja, col.key))
          ),
          formatTotalHari(calculateTotalHari(p.hariKerja)),
          p.upahHarian,
          calculateUpahJumlah(p),
          p.paraf || `${idx + 1}`,
        ]),
        [
          'JUMLAH UPAH 2 MINGGU (Rp.)',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          totalUpah,
          '',
        ],
        [],
        ['Mengetahui;', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Lunas Bayar,'],
        ['Kepala Sekolah,', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bendahara,'],
        [],
        [],
        [],
        [namaKepalaSekolah, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', namaBendahara],
        [`NIP.${nipKepalaSekolah.replace(/\s+/g, '')}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `NIP.${nipBendahara.replace(/\s+/g, '')}`],
      ];

      const ws6 = XLSX.utils.aoa_to_sheet(sheet6Rows);
      ws6['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } },
        { s: { r: 8, c: 0 }, e: { r: 10, c: 0 } },
        { s: { r: 8, c: 1 }, e: { r: 10, c: 1 } },
        { s: { r: 8, c: 2 }, e: { r: 10, c: 2 } },
        { s: { r: 8, c: 3 }, e: { r: 8, c: 9 } },
        { s: { r: 8, c: 10 }, e: { r: 8, c: 16 } },
        { s: { r: 8, c: 17 }, e: { r: 8, c: 19 } },
        { s: { r: 8, c: 20 }, e: { r: 10, c: 20 } },
        {
          s: { r: 11 + activeAbsen.pekerja.length, c: 0 },
          e: { r: 11 + activeAbsen.pekerja.length, c: 18 },
        },
      ];
      ws6['!cols'] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 16 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 12 },
        { wch: 16 },
        { wch: 18 },
        { wch: 8 },
      ];
      XLSX.utils.book_append_sheet(wb, ws6, 'REKAP UPAH 2 MINGGU');
    }

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
