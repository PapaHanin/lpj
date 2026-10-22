import { PajakRowItem, Transaction, JenisPajak } from '../types';
import { formatToSlashDate } from './dateUtils';
import { sortTransactionsChronologically } from './calculations';

/**
 * Data contoh persis seperti gambar yang diupload user (dengan tanggal DD/MM/YYYY)
 */
export const SAMPLE_IMAGE_PAJAK_ROWS: PajakRowItem[] = [
  {
    id: 'pjk-img-1',
    tanggal: '01/08/2026',
    nomorBukti: 'SP2D-001',
    uraian: 'Saldo Awal Kas (pengambilan pertama)',
    penerimaan: 1000000000,
    pengeluaran: 0,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-2',
    tanggal: '01/08/2026',
    nomorBukti: 'KW-001',
    uraian: 'Belanja Semen',
    penerimaan: 0,
    pengeluaran: 3774000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-3',
    tanggal: '01/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPN Belanja Semen',
    penerimaan: 374000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPN',
  },
  {
    id: 'pjk-img-4',
    tanggal: '01/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPN Belanja semen',
    penerimaan: 0,
    pengeluaran: 374000,
    isTaxRow: true,
    jenisPajak: 'PPN',
  },
  {
    id: 'pjk-img-5',
    tanggal: '01/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 22 Belanja semen',
    penerimaan: 51000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
  },
  {
    id: 'pjk-img-6',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 22 Belanja semen',
    penerimaan: 0,
    pengeluaran: 51000,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
  },
  {
    id: 'pjk-img-7',
    tanggal: '03/08/2026',
    nomorBukti: 'KW-002',
    uraian: 'Pembelian alat Tulis',
    penerimaan: 0,
    pengeluaran: 3000000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-8',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Diterima PPN Pembelian alat tulis',
    penerimaan: 330000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPN',
  },
  {
    id: 'pjk-img-9',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Dibayarkan PPN Belanja alat tulis',
    penerimaan: 0,
    pengeluaran: 330000,
    isTaxRow: true,
    jenisPajak: 'PPN',
  },
  {
    id: 'pjk-img-10',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Diterima PPh 22 Belanja alat tulis',
    penerimaan: 45000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
  },
  {
    id: 'pjk-img-11',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 22 Belanja alat Tulis',
    penerimaan: 0,
    pengeluaran: 45000,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
  },
  {
    id: 'pjk-img-12',
    tanggal: '06/08/2026',
    nomorBukti: 'KW-003',
    uraian: 'Membayar upah an. Wasito',
    penerimaan: 0,
    pengeluaran: 20000000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-13',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Diterima PPh 21 an. Warsito',
    penerimaan: 1000000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 21',
  },
  {
    id: 'pjk-img-14',
    tanggal: '06/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 21 an. wasito',
    penerimaan: 0,
    pengeluaran: 1000000,
    isTaxRow: true,
    jenisPajak: 'PPh 21',
  },
  {
    id: 'pjk-img-15',
    tanggal: '08/08/2026',
    nomorBukti: 'KW-004',
    uraian: 'Biaya Perencana',
    penerimaan: 0,
    pengeluaran: 20000000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-16',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Diterima Pph Perencana (4%)',
    penerimaan: 800000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
  },
  {
    id: 'pjk-img-17',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Dibayarkan Pph perencana (4%)',
    penerimaan: 0,
    pengeluaran: 800000,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
  },
  {
    id: 'pjk-img-18',
    tanggal: '08/08/2026',
    nomorBukti: 'KW-005',
    uraian: 'Biaya Pengawas (70%)',
    penerimaan: 0,
    pengeluaran: 10000000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-19',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Diterima Pph Pengawas (4%)',
    penerimaan: 400000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
  },
  {
    id: 'pjk-img-20',
    tanggal: '',
    nomorBukti: '',
    uraian: 'Dibayarkan Pph Pengawas (4%)',
    penerimaan: 0,
    pengeluaran: 400000,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
  },
  {
    id: 'pjk-img-21',
    tanggal: '10/08/2026',
    nomorBukti: 'KW-006',
    uraian: 'Biaya Pengelolaan',
    penerimaan: 0,
    pengeluaran: 2100000,
    isTaxRow: false,
  },
];

/**
 * Menghasilkan baris-baris BKU Pajak secara otomatis dari daftar transaksi LPJ sekolah.
 * Mengikuti pola gambar:
 * - Saldo Awal Kas (pengambilan pertama)
 * - Transaksi Belanja + Diterima/Dibayarkan PPN & PPh 22
 * - Transaksi Perencana/Pengawas + Diterima/Dibayarkan PPh (4%)
 * - Transaksi Upah + Diterima/Dibayarkan PPh 21
 */
export function generatePajakRowsFromTransactions(transactions: Transaction[]): PajakRowItem[] {
  const sorted = sortTransactionsChronologically(transactions);
  const rows: PajakRowItem[] = [];

  // Cari transaksi pengambilan / tarik tunai atau penerimaan tahap 1 sebagai Saldo Awal Kas
  const tarikTunaiTxs = sorted.filter((t) => t.metode === 'TARIK_TUNAI');
  const bankInflowTxs = sorted.filter((t) => t.metode === 'BANK' && t.jenis === 'PENERIMAAN');

  if (tarikTunaiTxs.length > 0) {
    tarikTunaiTxs.forEach((t, idx) => {
      const nominal = t.penerimaan || t.pengeluaran;
      rows.push({
        id: `pjk-init-${t.id}`,
        tanggal: formatToSlashDate(t.tanggal),
        nomorBukti: t.nomorBukti || `SP2D-00${idx + 1}`,
        uraian:
          idx === 0
            ? `Saldo Awal Kas (${t.uraian.toLowerCase()})`
            : t.uraian,
        penerimaan: nominal,
        pengeluaran: 0,
        isTaxRow: false,
        linkedTxId: t.id,
      });
    });
  } else if (bankInflowTxs.length > 0) {
    bankInflowTxs.forEach((t, idx) => {
      rows.push({
        id: `pjk-init-${t.id}`,
        tanggal: formatToSlashDate(t.tanggal),
        nomorBukti: t.nomorBukti || `SP2D-00${idx + 1}`,
        uraian: `Saldo Awal Kas (${t.uraian})`,
        penerimaan: t.penerimaan,
        pengeluaran: 0,
        isTaxRow: false,
        linkedTxId: t.id,
      });
    });
  }

  // Loop semua transaksi pengeluaran
  const expenseTxs = sorted.filter(
    (t) => t.metode !== 'TARIK_TUNAI' && t.jenis === 'PENGELUARAN' && t.pengeluaran > 0
  );

  expenseTxs.forEach((t) => {
    const tgl = formatToSlashDate(t.tanggal);
    const uLower = t.uraian.toLowerCase();
    const nominal = t.pengeluaran;

    // Baris Induk Pengeluaran
    rows.push({
      id: `pjk-tx-${t.id}`,
      tanggal: tgl,
      nomorBukti: t.nomorBukti || '',
      uraian: t.uraian,
      penerimaan: 0,
      pengeluaran: nominal,
      isTaxRow: false,
      linkedTxId: t.id,
    });

    // 1. Jika Perencana atau Pengawas -> PPh 4%
    if (uLower.includes('perencana') || uLower.includes('pengawas') || uLower.includes('konsultan')) {
      const pph4 = Math.round(nominal * 0.04);
      const labelPajak = uLower.includes('pengawas') && !uLower.includes('perencana')
        ? 'Pengawas (4%)'
        : 'Perencana (4%)';
      rows.push(
        {
          id: `pjk-tax-in-${t.id}-pph4`,
          tanggal: tgl,
          nomorBukti: '',
          uraian: `Diterima PPh ${labelPajak}`,
          penerimaan: pph4,
          pengeluaran: 0,
          isTaxRow: true,
          jenisPajak: 'PPh Pasal 4(2)',
          linkedTxId: t.id,
        },
        {
          id: `pjk-tax-out-${t.id}-pph4`,
          tanggal: tgl,
          nomorBukti: '',
          uraian: `Dibayarkan PPh ${labelPajak}`,
          penerimaan: 0,
          pengeluaran: pph4,
          isTaxRow: true,
          jenisPajak: 'PPh Pasal 4(2)',
          linkedTxId: t.id,
        }
      );
    }
    // 2. Jika Upah / Tukang / Fasilitator -> PPh 21 (5%)
    else if (
      uLower.includes('upah') ||
      uLower.includes('tukang') ||
      uLower.includes('fasilitator')
    ) {
      const pph21 = Math.round(nominal * 0.05);
      const namaTarget = t.penerima ? `an. ${t.penerima}` : t.uraian;
      rows.push(
        {
          id: `pjk-tax-in-${t.id}-pph21`,
          tanggal: tgl,
          nomorBukti: '',
          uraian: `Diterima PPh 21 ${namaTarget}`,
          penerimaan: pph21,
          pengeluaran: 0,
          isTaxRow: true,
          jenisPajak: 'PPh 21',
          linkedTxId: t.id,
        },
        {
          id: `pjk-tax-out-${t.id}-pph21`,
          tanggal: tgl,
          nomorBukti: '',
          uraian: `Dibayarkan PPh 21 ${namaTarget}`,
          penerimaan: 0,
          pengeluaran: pph21,
          isTaxRow: true,
          jenisPajak: 'PPh 21',
          linkedTxId: t.id,
        }
      );
    }
    // 3. Jika Belanja Barang / Material Toko / Alat Tulis (Nominal >= 2.000.000) -> PPN (11%) & PPh 22 (1.5%)
    else if (
      nominal >= 2000000 &&
      (uLower.includes('belanja') ||
        uLower.includes('pembelanjaan') ||
        uLower.includes('pembelian') ||
        uLower.includes('material') ||
        uLower.includes('semen') ||
        uLower.includes('alat tulis'))
    ) {
      const ppn = Math.round(nominal * 0.11);
      const pph22 = Math.round(nominal * 0.015);

      rows.push(
        {
          id: `pjk-tax-in-${t.id}-ppn`,
          tanggal: tgl,
          nomorBukti: '',
          uraian: `Diterima PPN ${t.uraian}`,
          penerimaan: ppn,
          pengeluaran: 0,
          isTaxRow: true,
          jenisPajak: 'PPN',
          linkedTxId: t.id,
        },
        {
          id: `pjk-tax-out-${t.id}-ppn`,
          tanggal: tgl,
          nomorBukti: '',
          uraian: `Dibayarkan PPN ${t.uraian}`,
          penerimaan: 0,
          pengeluaran: ppn,
          isTaxRow: true,
          jenisPajak: 'PPN',
          linkedTxId: t.id,
        },
        {
          id: `pjk-tax-in-${t.id}-pph22`,
          tanggal: tgl,
          nomorBukti: '',
          uraian: `Diterima PPh 22 ${t.uraian}`,
          penerimaan: pph22,
          pengeluaran: 0,
          isTaxRow: true,
          jenisPajak: 'PPh 22',
          linkedTxId: t.id,
        },
        {
          id: `pjk-tax-out-${t.id}-pph22`,
          tanggal: '',
          nomorBukti: '',
          uraian: `Dibayarkan PPh 22 ${t.uraian}`,
          penerimaan: 0,
          pengeluaran: pph22,
          isTaxRow: true,
          jenisPajak: 'PPh 22',
          linkedTxId: t.id,
        }
      );
    }
  });

  return rows;
}

/**
 * Menghitung nominal pajak otomatis dari nilai belanja:
 * - PPN (11%)        = Nilai Belanja x 11% (contoh: 3.000.000 x 11% = 330.000)
 * - PPh 22 (1,5%)    = Nilai Belanja x 1,5% (contoh: 3.000.000 x 1,5% = 45.000)
 * - PPh 23 (2%)      = Nilai Belanja x 2% (contoh: 3.000.000 x 2% = 60.000)
 * - PPh 21 (5%)      = Nilai Belanja x 5% (contoh: 3.000.000 x 5% = 150.000)
 * - PPh 4% / 4(2)    = Nilai Belanja x 4% (contoh: 3.000.000 x 4% = 120.000)
 * - Pajak Daerah 10% = Nilai Belanja x 10%
 */
export function hitungPajakDariBruto(
  nominalBelanja: number,
  jenis: JenisPajak | string,
  useDpp100Per111: boolean = false
): number {
  if (!nominalBelanja || nominalBelanja <= 0) return 0;
  const base = useDpp100Per111
    ? Math.round((nominalBelanja * 100) / 111)
    : nominalBelanja;

  switch (jenis) {
    case 'PPN':
      return Math.round(base * 0.11);
    case 'PPh 22':
      return Math.round(base * 0.015);
    case 'PPh 23':
      return Math.round(base * 0.02);
    case 'PPh 21':
      return Math.round(base * 0.05);
    case 'PPh 4%':
    case 'PPh Pasal 4(2)':
    case 'PPh Pasal 4 Ayat 2':
      return Math.round(base * 0.04);
    case 'Pajak Daerah':
      return Math.round(base * 0.1);
    default:
      return Math.round(base * 0.11);
  }
}

