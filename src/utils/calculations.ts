import { ProjectProfile, Transaction } from '../types';

export interface BkuRow {
  no: number | string;
  tanggal: string;
  uraian: string;
  nomorBukti: string;
  penerimaan: number;
  pengeluaran: number;
  saldo: number;
  transaction: Transaction;
}

export interface BkuTunaiRow {
  no: number | string;
  tanggal: string;
  uraian: string;
  nomorBukti: string;
  penerimaan: number;
  pengeluaran: number;
  saldo: number;
  transaction: Transaction;
  isParent?: boolean;
}

export interface BkBankRow {
  no: number | string;
  tanggal: string;
  uraian: string;
  nomorBukti: string;
  debet: number;
  kredit: number;
  saldo: number;
  transaction: Transaction;
}

export interface SummaryStats {
  totalPenerimaan: number;
  totalPengeluaran: number;
  saldoKumulatif: number;
  saldoBank: number;
  saldoTunai: number;
  persentaseRealisasi: number;
}

export const INITIAL_PROFILE: ProjectProfile = {
  namaSekolah: 'SD INPRES 2 PALASA',
  alamat: 'Jl. Trans Sulawesi Desa Palasa Lambori',
  kecamatan: 'KEC. PALASA',
  kabupaten: 'KAB. PARIGI MOUTONG',
  provinsi: 'SULAWESI TENGAH',
  tahunAnggaran: '2026',
  bulanLaporan: 'AGUSTUS 2026',
  tanggalTutupBuku: 'Senin, 31 Agustus 2026',
  judulPekerjaan:
    'REHABILITASI RUANGAN KELAS 1, RUANG KELAS 2, RUANG KELAS 3, RUANG KELAS 4, RUANG KELAS 5, RUANG KELAS 6, RUANG ADMINISTRASI, TOILET SISWA 1, PEMBANGUNAN TOILET SISWA & PENATAAN LINGKUNGAN.',
  namaKepalaSekolah: 'NI KETUT SUKERTI, S.Pd.SD',
  nipKepalaSekolah: '19680505 198803 2 009',
  namaBendahara: 'MOH. RIZAL DAUDO',
  nipBendahara: '-',
  namaPanitia: 'PANITIA PEMBANGUNAN SEKOLAH',
  tempatPelunasan: 'Palasa',
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    tanggal: '11 Agustus 2026',
    uraian: 'DANA MASUK DAK FISIK TAHAP 1',
    nomorBukti: '',
    metode: 'BANK',
    jenis: 'PENERIMAAN',
    penerimaan: 692031455,
    pengeluaran: 0,
    penerima: 'KAS DAERAH / KEMENDIKBUD',
  },
  {
    id: 'tx-2',
    tanggal: '15 Agustus 2026',
    uraian: 'PENARIKAN DANA TAHAP 1',
    nomorBukti: '',
    metode: 'TARIK_TUNAI',
    jenis: 'PENERIMAAN',
    penerimaan: 160848000,
    pengeluaran: 160848000,
    penerima: 'BENDAHARA SEKOLAH',
  },
  {
    id: 'tx-3',
    tanggal: '16 Agustus 2026',
    uraian: 'Belanja Spanduk Papan Proyek',
    nomorBukti: 'BKU 01',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 50000,
    penerima: 'Percetakan Media Grafika',
  },
  {
    id: 'tx-4',
    tanggal: '16 Agustus 2026',
    uraian: 'Bayar Pemasangan Spanduk',
    nomorBukti: 'BKU 02',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 250000,
    penerima: 'Tukang Ilham',
  },
  {
    id: 'tx-5',
    tanggal: '16 Agustus 2026',
    uraian: 'Pembongkaran Dan Pembersihan Rehab Ruang Kelas 6 ruang, ruang administrasi dan Toilet siswa',
    nomorBukti: 'BKU 03',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 2500000,
    penerima: 'Kelompok Kerja Pembersihan',
  },
  {
    id: 'tx-6',
    tanggal: '16 Agustus 2026',
    uraian: 'Bayar Perencana & Pengawasan',
    nomorBukti: 'BKU 04',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 15550000,
    penerima: 'CV. Cipta Graha Mandiri',
  },
  {
    id: 'tx-7',
    tanggal: '16 Agustus 2026',
    uraian: 'Belanja Material Pasir & Kayu',
    nomorBukti: 'BKU 05',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 3900000,
    penerima: 'TB. Sumber Jaya',
    subItems: [
      {
        id: 'sub-7-1',
        nama: 'Pasir Kasar',
        volume: 1.0,
        satuan: 'Ret',
        hargaSatuan: 900000,
        subtotal: 900000,
      },
      {
        id: 'sub-7-2',
        nama: 'Kayu Lata 5x5',
        volume: 1.0,
        satuan: 'Kbk',
        hargaSatuan: 3000000,
        subtotal: 3000000,
      },
    ],
  },
  {
    id: 'tx-8',
    tanggal: '17 Agustus 2026',
    uraian: 'Pembelanjaan Pasir Cor',
    nomorBukti: 'BKU 06',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 7500000,
    penerima: 'Depo Pasir Palasa',
    subItems: [
      {
        id: 'sub-8-1',
        nama: 'Pasir Cor',
        volume: 10,
        satuan: 'Ret',
        hargaSatuan: 750000,
        subtotal: 7500000,
      },
    ],
  },
  {
    id: 'tx-9',
    tanggal: '18 Agustus 2026',
    uraian: 'Pembelanjaan batu kali pondasi',
    nomorBukti: 'BKU 07',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 7500000,
    penerima: 'UD. Batu Alam',
    subItems: [
      {
        id: 'sub-9-1',
        nama: 'Batu kali pondasi',
        volume: 10,
        satuan: 'Ret',
        hargaSatuan: 750000,
        subtotal: 7500000,
      },
    ],
  },
  {
    id: 'tx-10',
    tanggal: '18 Agustus 2026',
    uraian: 'Belanja Bahan Material Toko',
    nomorBukti: 'BKU 08',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 7620000,
    penerima: 'Toko Besi & Semen Lancar',
  },
  {
    id: 'tx-11',
    tanggal: '19 Agustus 2026',
    uraian: 'Belanja Bahan Material Toko',
    nomorBukti: 'BKU 09',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 17500000,
    penerima: 'TB. Berkah Bangunan',
  },
  {
    id: 'tx-12',
    tanggal: '19 Agustus 2026',
    uraian: 'Pembelanjaan Batu Bata Merah',
    nomorBukti: 'BKU 10',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 10030000,
    penerima: 'Pabrik Bata Lambori',
  },
  {
    id: 'tx-13',
    tanggal: '22 Agustus 2026',
    uraian: 'Bayar Fasilitator Teknik',
    nomorBukti: 'BKU 12',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 6668000,
    penerima: 'MOH. RIZAL DAUDO',
  },
  {
    id: 'tx-14',
    tanggal: '29 Agustus 2026',
    uraian: 'Bayar Panjar Upah Tukang Tahap 1',
    nomorBukti: 'BKU 13',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 35000000,
    penerima: 'Tukang Ahmad & Tim',
  },
  {
    id: 'tx-15',
    tanggal: '30 Agustus 2026',
    uraian: 'Biaya Fasilitator Manajemen',
    nomorBukti: 'BKU 38',
    metode: 'TUNAI',
    jenis: 'PENGELUARAN',
    penerimaan: 0,
    pengeluaran: 8001000,
    penerima: 'Fasilitator DAK Kabupaten',
  },
];

export function calculateBkuRows(transactions: Transaction[]): {
  rows: BkuRow[];
  totalPenerimaan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
} {
  let runningSaldo = 0;
  let totalPenerimaan = 0;
  let totalPengeluaran = 0;

  const rows: BkuRow[] = transactions.map((t, idx) => {
    runningSaldo += t.penerimaan - t.pengeluaran;
    totalPenerimaan += t.penerimaan;
    totalPengeluaran += t.pengeluaran;

    return {
      no: idx + 1,
      tanggal: t.tanggal,
      uraian: t.uraian,
      nomorBukti: t.nomorBukti,
      penerimaan: t.penerimaan,
      pengeluaran: t.pengeluaran,
      saldo: runningSaldo,
      transaction: t,
    };
  });

  return {
    rows,
    totalPenerimaan,
    totalPengeluaran,
    saldoAkhir: runningSaldo,
  };
}

export function calculateBkuTunaiRows(transactions: Transaction[]): {
  rows: BkuTunaiRow[];
  totalPenerimaan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
} {
  // Hanya transaksi yang melibatkan Kas Tunai (TARIK_TUNAI dan TUNAI)
  const tunaiTransactions = transactions.filter(
    (t) => t.metode === 'TUNAI' || t.metode === 'TARIK_TUNAI'
  );

  let runningSaldo = 0;
  let totalPenerimaan = 0;
  let totalPengeluaran = 0;

  const rows: BkuTunaiRow[] = [];
  let noCounter = 1;

  tunaiTransactions.forEach((t) => {
    // Jika TARIK_TUNAI: uang masuk ke kas fisik tunai
    const penerimaanTunai = t.metode === 'TARIK_TUNAI' ? t.penerimaan : t.jenis === 'PENERIMAAN' ? t.penerimaan : 0;
    // Jika belanja tunai biasa
    const pengeluaranTunai = t.metode === 'TUNAI' && t.jenis === 'PENGELUARAN' ? t.pengeluaran : 0;

    runningSaldo += penerimaanTunai - pengeluaranTunai;
    totalPenerimaan += penerimaanTunai;
    totalPengeluaran += pengeluaranTunai;

    rows.push({
      no: noCounter++,
      tanggal: t.tanggal,
      uraian: t.uraian,
      nomorBukti: t.nomorBukti,
      penerimaan: penerimaanTunai,
      pengeluaran: pengeluaranTunai,
      saldo: runningSaldo,
      transaction: t,
      isParent: Boolean(t.subItems && t.subItems.length > 0),
    });
  });

  return {
    rows,
    totalPenerimaan,
    totalPengeluaran,
    saldoAkhir: runningSaldo,
  };
}

export function calculateBkBankRows(transactions: Transaction[]): {
  rows: BkBankRow[];
  totalDebet: number;
  totalKredit: number;
  saldoAkhir: number;
} {
  // Transaksi yang melibatkan Rekening Bank (BANK atau TARIK_TUNAI)
  const bankTransactions = transactions.filter(
    (t) => t.metode === 'BANK' || t.metode === 'TARIK_TUNAI'
  );

  let runningSaldo = 0;
  let totalDebet = 0;
  let totalKredit = 0;

  const rows: BkBankRow[] = [];
  let noCounter = 1;

  bankTransactions.forEach((t) => {
    let debet = 0;
    let kredit = 0;

    if (t.metode === 'BANK') {
      if (t.jenis === 'PENERIMAAN') {
        debet = t.penerimaan;
      } else {
        kredit = t.pengeluaran;
      }
    } else if (t.metode === 'TARIK_TUNAI') {
      // Penarikan tunai mengurangi saldo bank (Kredit Bank)
      kredit = t.pengeluaran;
    }

    runningSaldo += debet - kredit;
    totalDebet += debet;
    totalKredit += kredit;

    rows.push({
      no: noCounter++,
      tanggal: t.tanggal,
      uraian: t.uraian,
      nomorBukti: t.nomorBukti,
      debet,
      kredit,
      saldo: runningSaldo,
      transaction: t,
    });
  });

  return {
    rows,
    totalDebet,
    totalKredit,
    saldoAkhir: runningSaldo,
  };
}

export function calculateSummary(transactions: Transaction[]): SummaryStats {
  const bku = calculateBkuRows(transactions);
  const bank = calculateBkBankRows(transactions);
  const tunai = calculateBkuTunaiRows(transactions);

  // Realisasi belanja = semua pengeluaran real (bukan transfer internal)
  const totalRealisasi = transactions.reduce((acc, t) => {
    if (t.metode === 'TUNAI' && t.jenis === 'PENGELUARAN') {
      return acc + t.pengeluaran;
    }
    if (t.metode === 'BANK' && t.jenis === 'PENGELUARAN') {
      return acc + t.pengeluaran;
    }
    return acc;
  }, 0);

  // Total pagu / penerimaan murni (dana DAK masuk)
  const totalPagu = transactions.reduce((acc, t) => {
    if (t.metode === 'BANK' && t.jenis === 'PENERIMAAN') {
      return acc + t.penerimaan;
    }
    return acc;
  }, 0);

  const persentase = totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;

  return {
    totalPenerimaan: totalPagu,
    totalPengeluaran: totalRealisasi,
    saldoKumulatif: bku.saldoAkhir,
    saldoBank: bank.saldoAkhir,
    saldoTunai: tunai.saldoAkhir,
    persentaseRealisasi: Math.min(100, Math.max(0, persentase)),
  };
}
