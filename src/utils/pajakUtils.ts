import { PajakRowItem, Transaction, JenisPajak, ProjectProfile } from '../types';
import {
  formatToSlashDate,
  extractMonthAndYear,
  getClosingDateForMonth,
  getFirstDateForMonth,
  BULAN_LIST,
} from './dateUtils';
import {
  sortTransactionsChronologically,
  groupTransactionsByMonthlyBooks,
} from './calculations';

/**
 * PANDUAN PERPAJAKAN P2SP (SWAKELOLA REVITALISASI / DAK FISIK SEKOLAH)
 * Berdasarkan Materi Resmi KPP Pratama Palu ("Aspek Perpajakan Bagi Program Revitalisasi Sekolah"):
 *
 * 1. P2SP BUKAN PEMUNGUT PAJAK:
 *    - P2SP BUKAN Pemungut PPh Pasal 22 (Slide 15 & Slide 32 Kasus 2).
 *    - P2SP BUKAN Pemungut PPN (Slide 15 & Slide 32 Kasus 2).
 *    -> Pembelian bahan material (semen, pasir, kayu, bata, besi, cat, APD, dll.) oleh P2SP
 *       TIDAK dipungut PPh 22 maupun PPN oleh sekolah/P2SP (Pajak = Rp 0).
 *
 * 2. UPAH TUKANG / TENAGA KERJA LEPAS HARIAN (Slide 21 & 26):
 *    - Upah bruto harian <= Rp 450.000 / hari: TER Harian = 0% (PPh 21 = Rp 0 / Nihil).
 *    - Karena upah tukang swakelola rata-rata Rp 120.000 - Rp 250.000 / hari (di bawah Rp 450.000),
 *       maka UPAH TUKANG BEBAS PPh 21 (Pajak = Rp 0).
 *    - Upah harian > Rp 450.000 s.d Rp 2.500.000: TER Harian = 0,5%.
 *
 * 3. KEWAJIBAN PEMOTONGAN PAJAK OLEH P2SP:
 *    a. PPh Final Pasal 4 Ayat (2) - Jasa Konstruksi (Slide 43 - 45):
 *       - Jasa Perencana Konstruksi & Pengawas Konstruksi: 4% (tanpa sertifikasi) / 3,5% (bersertifikat).
 *       - Pekerjaan Pelaksanaan Konstruksi Fisik diborongkan ke pihak ketiga/mandor borong: 4% (atau 1,75% kualifikasi kecil).
 *       - Sewa Tanah dan/atau Bangunan: 10%.
 *    b. PPh Pasal 23 (Slide 33 - 35):
 *       - Sewa Harta/Peralatan (sewa molen cor, excavator, kendaraan pick-up/truk angkutan): 2%.
 *       - Jasa teknik, jasa perbaikan / pemeliharaan non-konstruksi: 2%.
 *    c. PPh Pasal 21 Honorarium (Slide 25, 27, 28):
 *       - Honorarium PNS Golongan I & II: 0%.
 *       - Honorarium PNS Golongan III: 5% (PPh 21 Final).
 *       - Honorarium PNS Golongan IV: 15% (PPh 21 Final).
 *       - Honorarium Tenaga Ahli / Konsultan Bukan Pegawai Non-PNS: 2,5% (50% x 5% ber-NPWP).
 *
 * 4. ATURAN BUKU PEMBANTU PAJAK:
 *    - HANYA transaksi belanja yang benar-benar ada potongan/pungutan pajak yang dicatat di Buku Pembantu Pajak.
 *    - Belanja tanpa pajak (material toko swakelola biasa, upah tukang <= 450rb/hari) TIDAK BOLEH masuk ke Buku Pembantu Pajak.
 */

export interface TaxPresetDef {
  id: string;
  label: string;
  persen: number;
  keterangan: string;
  dasarHukum: string;
}

export const OFFICIAL_P2SP_TAX_PRESETS: TaxPresetDef[] = [
  {
    id: 'ppn_pph22_toko_diatas_2jt',
    label: 'PPN 11% + PPh 22 1,5% (Material Toko / Kayu > Rp 2 Jt)',
    persen: 12.5,
    keterangan: 'Pajak material toko, kayu, semen, besi, dll. untuk pembelanjaan di atas Rp 2.000.000',
    dasarHukum: 'UU HPP (PPN 11%) & PMK 59/2022 (PPh 22 1,5%)',
  },
  {
    id: 'pph4_perencana_pengawas',
    label: 'PPh Final Ps 4(2) Perencana / Pengawas (4%)',
    persen: 4,
    keterangan: 'Jasa konsultan perencana & pengawas konstruksi tanpa sertifikasi usaha (Slide 45)',
    dasarHukum: 'PP 9/2022 Ps 3 ayat 1 huruf d',
  },
  {
    id: 'pph4_konstruksi_borongan',
    label: 'PPh Final Ps 4(2) Jasa Konstruksi Fisik (4%)',
    persen: 4,
    keterangan: 'Pekerjaan konstruksi fisik diborongkan pihak ketiga tanpa sertifikasi (Slide 45)',
    dasarHukum: 'PP 9/2022 Ps 3 ayat 1 huruf c',
  },
  {
    id: 'pph4_konstruksi_kecil',
    label: 'PPh Final Ps 4(2) Kualifikasi Kecil (1,75%)',
    persen: 1.75,
    keterangan: 'Pelaksana konstruksi yang memiliki sertifikat badan usaha kecil (Slide 45)',
    dasarHukum: 'PP 9/2022 Ps 3 ayat 1 huruf a',
  },
  {
    id: 'pph23_sewa_alat',
    label: 'PPh Pasal 23 Sewa Alat / Molen / Angkutan (2%)',
    persen: 2,
    keterangan: 'Sewa molen cor, alat berat, pick-up angkutan material (Slide 33-35)',
    dasarHukum: 'UU PPh Ps 23 ayat 1 huruf c',
  },
  {
    id: 'pph21_bukan_pegawai',
    label: 'PPh 21 Tenaga Ahli / Fasilitator Non-PNS (2,5%)',
    persen: 2.5,
    keterangan: 'Imbalan bukan pegawai: 50% x tarif Ps 17 (5%) = 2,5% (Slide 27)',
    dasarHukum: 'PMK 168/2023 Ps 10 ayat 2',
  },
  {
    id: 'pph21_honor_pns_gol3',
    label: 'PPh 21 Honorarium PNS Golongan III (5%)',
    persen: 5,
    keterangan: 'Honorarium tim pelaksana / narasumber PNS Golongan III (Slide 28)',
    dasarHukum: 'PP 80/2010 Ps 4 ayat 2',
  },
  {
    id: 'pph21_honor_pns_gol4',
    label: 'PPh 21 Honorarium PNS Golongan IV (15%)',
    persen: 15,
    keterangan: 'Honorarium tim pelaksana / narasumber PNS Golongan IV (Slide 28)',
    dasarHukum: 'PP 80/2010 Ps 4 ayat 2',
  },
  {
    id: 'pph21_tukang_tinggi',
    label: 'PPh 21 Upah Tukang > Rp 450.000/hari (TER 0,5%)',
    persen: 0.5,
    keterangan: 'Khusus tukang yang upah hariannya melebihi Rp 450.000 / hari (Slide 21 & 26)',
    dasarHukum: 'PP 58/2023 & PMK 168/2023',
  },
  {
    id: 'ppn_pkp_11',
    label: 'PPN 11% (Khusus Rekanan Toko PKP)',
    persen: 11,
    keterangan: 'Khusus toko rekanan berstatus PKP atas nama sekolah (Slide 38)',
    dasarHukum: 'UU PPN No. 7/2021',
  },
  {
    id: 'pph22_instansi_1_5',
    label: 'PPh 22 1,5% (Khusus Belanja Instansi > Rp 2 Jt)',
    persen: 1.5,
    keterangan: 'Khusus pembelanjaan barang di atas Rp 2.000.000 atas nama sekolah negeri (Slide 31)',
    dasarHukum: 'PMK 231/2019 & PMK 59/2022',
  },
];

/**
 * Data contoh persis seperti dokumen resmi yang hanya menampilkan belanja berpajak
 */
export const SAMPLE_IMAGE_PAJAK_ROWS: PajakRowItem[] = [
  // 1. KW-004: Bayar Perencana & Pengawasan (PPh Final 4(2) 4%)
  {
    id: 'pjk-tx-tx-6',
    tanggal: '16/08/2026',
    nomorBukti: 'KW-004',
    uraian: 'Bayar Perencana & Pengawasan',
    penerimaan: 0,
    pengeluaran: 15550000,
    isTaxRow: false,
    linkedTxId: 'tx-6',
  },
  {
    id: 'pjk-tax-in-tx-6-0',
    tanggal: '16/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh Pasal 4(2) Perencana & Pengawas (4%) Bayar Perencana & Pengawasan',
    penerimaan: 622000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
    linkedTxId: 'tx-6',
  },
  {
    id: 'pjk-tax-out-tx-6-0',
    tanggal: '16/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh Pasal 4(2) Perencana & Pengawas (4%) Bayar Perencana & Pengawasan',
    penerimaan: 0,
    pengeluaran: 622000,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
    linkedTxId: 'tx-6',
  },

  // 2. KW-005: Belanja Material Pasir & Kayu (Kayu > Rp 2 Jt kena PPN 11% + PPh 22 1,5%, Pasir Bebas)
  {
    id: 'pjk-tx-tx-7',
    tanggal: '16/08/2026',
    nomorBukti: 'KW-005',
    uraian: 'Belanja Material Pasir & Kayu',
    penerimaan: 0,
    pengeluaran: 3900000,
    isTaxRow: false,
    linkedTxId: 'tx-7',
  },
  {
    id: 'pjk-tax-in-tx-7-0',
    tanggal: '16/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPN (11%) Belanja Material Pasir & Kayu (Kayu Lata)',
    penerimaan: 330000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPN',
    linkedTxId: 'tx-7',
  },
  {
    id: 'pjk-tax-out-tx-7-0',
    tanggal: '16/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPN (11%) Belanja Material Pasir & Kayu (Kayu Lata)',
    penerimaan: 0,
    pengeluaran: 330000,
    isTaxRow: true,
    jenisPajak: 'PPN',
    linkedTxId: 'tx-7',
  },
  {
    id: 'pjk-tax-in-tx-7-1',
    tanggal: '16/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 22 (1,5%) Belanja Material Pasir & Kayu (Kayu Lata)',
    penerimaan: 45000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
    linkedTxId: 'tx-7',
  },
  {
    id: 'pjk-tax-out-tx-7-1',
    tanggal: '16/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 22 (1,5%) Belanja Material Pasir & Kayu (Kayu Lata)',
    penerimaan: 0,
    pengeluaran: 45000,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
    linkedTxId: 'tx-7',
  },

  // 3. KW-008: Belanja Bahan Material Toko (> Rp 2 Jt kena PPN 11% + PPh 22 1,5%)
  {
    id: 'pjk-tx-tx-10',
    tanggal: '18/08/2026',
    nomorBukti: 'KW-008',
    uraian: 'Belanja Bahan Material Toko',
    penerimaan: 0,
    pengeluaran: 7620000,
    isTaxRow: false,
    linkedTxId: 'tx-10',
  },
  {
    id: 'pjk-tax-in-tx-10-0',
    tanggal: '18/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPN (11%) Belanja Bahan Material Toko',
    penerimaan: 838200,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPN',
    linkedTxId: 'tx-10',
  },
  {
    id: 'pjk-tax-out-tx-10-0',
    tanggal: '18/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPN (11%) Belanja Bahan Material Toko',
    penerimaan: 0,
    pengeluaran: 838200,
    isTaxRow: true,
    jenisPajak: 'PPN',
    linkedTxId: 'tx-10',
  },
  {
    id: 'pjk-tax-in-tx-10-1',
    tanggal: '18/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 22 (1,5%) Belanja Bahan Material Toko',
    penerimaan: 114300,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
    linkedTxId: 'tx-10',
  },
  {
    id: 'pjk-tax-out-tx-10-1',
    tanggal: '18/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 22 (1,5%) Belanja Bahan Material Toko',
    penerimaan: 0,
    pengeluaran: 114300,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
    linkedTxId: 'tx-10',
  },

  // 4. KW-009: Belanja Bahan Material Toko (> Rp 2 Jt kena PPN 11% + PPh 22 1,5%)
  {
    id: 'pjk-tx-tx-11',
    tanggal: '19/08/2026',
    nomorBukti: 'KW-009',
    uraian: 'Belanja Bahan Material Toko',
    penerimaan: 0,
    pengeluaran: 17500000,
    isTaxRow: false,
    linkedTxId: 'tx-11',
  },
  {
    id: 'pjk-tax-in-tx-11-0',
    tanggal: '19/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPN (11%) Belanja Bahan Material Toko',
    penerimaan: 1925000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPN',
    linkedTxId: 'tx-11',
  },
  {
    id: 'pjk-tax-out-tx-11-0',
    tanggal: '19/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPN (11%) Belanja Bahan Material Toko',
    penerimaan: 0,
    pengeluaran: 1925000,
    isTaxRow: true,
    jenisPajak: 'PPN',
    linkedTxId: 'tx-11',
  },
  {
    id: 'pjk-tax-in-tx-11-1',
    tanggal: '19/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 22 (1,5%) Belanja Bahan Material Toko',
    penerimaan: 262500,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
    linkedTxId: 'tx-11',
  },
  {
    id: 'pjk-tax-out-tx-11-1',
    tanggal: '19/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 22 (1,5%) Belanja Bahan Material Toko',
    penerimaan: 0,
    pengeluaran: 262500,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
    linkedTxId: 'tx-11',
  },

  // 5. KW-011: Bayar Fasilitator Teknik (PPh 21 2,5%)
  {
    id: 'pjk-tx-tx-13',
    tanggal: '22/08/2026',
    nomorBukti: 'KW-011',
    uraian: 'Bayar Fasilitator Teknik',
    penerimaan: 0,
    pengeluaran: 6668000,
    isTaxRow: false,
    linkedTxId: 'tx-13',
  },
  {
    id: 'pjk-tax-in-tx-13-0',
    tanggal: '22/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 21 Fasilitator / Tenaga Ahli (2,5%) Bayar Fasilitator Teknik',
    penerimaan: 166700,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 21',
    linkedTxId: 'tx-13',
  },
  {
    id: 'pjk-tax-out-tx-13-0',
    tanggal: '22/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 21 Fasilitator / Tenaga Ahli (2,5%) Bayar Fasilitator Teknik',
    penerimaan: 0,
    pengeluaran: 166700,
    isTaxRow: true,
    jenisPajak: 'PPh 21',
    linkedTxId: 'tx-13',
  },

  // 6. KW-013: Biaya Fasilitator Manajemen (PPh 21 2,5%)
  {
    id: 'pjk-tx-tx-15',
    tanggal: '30/08/2026',
    nomorBukti: 'KW-013',
    uraian: 'Biaya Fasilitator Manajemen',
    penerimaan: 0,
    pengeluaran: 8001000,
    isTaxRow: false,
    linkedTxId: 'tx-15',
  },
  {
    id: 'pjk-tax-in-tx-15-0',
    tanggal: '30/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 21 Fasilitator / Tenaga Ahli (2,5%) Biaya Fasilitator Manajemen',
    penerimaan: 200025,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 21',
    linkedTxId: 'tx-15',
  },
  {
    id: 'pjk-tax-out-tx-15-0',
    tanggal: '30/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 21 Fasilitator / Tenaga Ahli (2,5%) Biaya Fasilitator Manajemen',
    penerimaan: 0,
    pengeluaran: 200025,
    isTaxRow: true,
    jenisPajak: 'PPh 21',
    linkedTxId: 'tx-15',
  },
  // CATATAN:
  // - Upah tukang (KW-002, KW-003, KW-012) = BEBAS PAJAK (TIDAK MASUK BKU PAJAK).
  // - Material Pasir & Batu (KW-006 Pasir Cor, KW-007 Batu kali pondasi, KW-010 Batu bata) = BEBAS PAJAK (TIDAK MASUK BKU PAJAK).
  // - Belanja material toko/kayu > Rp 2 Juta (KW-005, KW-008, KW-009) = KENA PPN (11%) + PPh 22 (1,5%).
];

export interface DetectedTaxItem {
  jenisPajak: JenisPajak;
  label: string;
  persen: number;
  nominal: number;
  keterangan: string;
}

/**
 * Memeriksa apakah suatu transaksi atau subItem adalah Upah Tukang / Pekerja.
 * Upah tukang swakelola dikecualikan dari BKU Pajak (Pajak = Rp 0).
 */
export function isUpahTukang(t: Transaction): boolean {
  if (t.jenisBiaya === 'Upah' || (t.jenisBiaya as string) === 'UPAH') return true;
  const penerima = (t.penerima || '').toLowerCase();
  if (
    penerima.includes('tukang') ||
    penerima.includes('pekerja') ||
    penerima.includes('mandor') ||
    penerima.includes('kelompok kerja')
  ) {
    return true;
  }
  const uLower = (t.uraian || '').toLowerCase();
  const upahKeywords = [
    'upah',
    'tukang',
    'ongkos kerja',
    'ongkos tukang',
    'bayar pemasangan',
    'pembersihan',
    'pembongkaran',
    'pekerja',
    'kepala tukang',
  ];
  return upahKeywords.some((k) => uLower.includes(k));
}

/**
 * Memeriksa apakah suatu nama barang/material adalah Pasir atau Batu (Galian C) yang bebas pajak BKU.
 */
export function isPasirOrBatuItem(itemName: string): boolean {
  const n = (itemName || '').toLowerCase();
  const exemptKeywords = [
    'pasir',
    'batu kali',
    'batu pondasi',
    'batu pecah',
    'batu belah',
    'batu bata',
    'bata merah',
    'batu alam',
    'batu split',
    'split',
    'kerikil',
    'sirtu',
    'timbunan',
    'tanah timbun',
    'tanah urug',
    'galian c',
  ];
  return exemptKeywords.some((k) => n.includes(k));
}

/**
 * Deteksi kewajiban pajak transaksi belanja berdasarkan aturan khusus BKU Pajak:
 * 1. Upah tukang: Bebas pajak / Tidak dimasukkan ke BKU Pajak (Pajak = Rp 0).
 * 2. Material Pasir & Batu: Bebas pajak / Tidak dimasukkan ke BKU Pajak (Pajak = Rp 0).
 * 3. Selain itu (seperti material toko, kayu, semen, besi, cat, dll.):
 *    - Belanja > Rp 2.000.000: Dikenakan PPN (11%) + PPh 22 (1,5%).
 *    - Belanja <= Rp 2.000.000: Bebas pajak (Pajak = Rp 0).
 * 4. Jasa Perencana / Pengawas: PPh Final 4(2) sebesar 4%.
 * 5. Sewa Alat / Molen: PPh 23 sebesar 2%.
 * 6. Fasilitator / Tenaga Ahli Non-PNS: PPh 21 sebesar 2,5%.
 */
export function detectTaxForTransaction(t: Transaction): DetectedTaxItem[] {
  // Transaksi tarik tunai atau penerimaan bukan objek pajak belanja
  if (t.metode === 'TARIK_TUNAI' || t.jenis === 'PENERIMAAN' || !t.pengeluaran || t.pengeluaran <= 0) {
    return [];
  }

  const uLower = (t.uraian || '').toLowerCase();
  const nominal = t.pengeluaran;
  const items: DetectedTaxItem[] = [];

  // ATURAN 1: UPAH TUKANG TIDAK DIBERIKAN PAJAK (BEBAS PAJAK / JANGAN MASUK BKU PAJAK)
  if (isUpahTukang(t)) {
    return [];
  }

  // ATURAN 2: JASA KONSULTAN PERENCANA & PENGAWAS KONSTRUKSI (PPh Final 4(2) 4%)
  if (
    uLower.includes('perencana') ||
    uLower.includes('pengawas') ||
    uLower.includes('konsultan') ||
    uLower.includes('gambar kerja') ||
    uLower.includes('rencana anggaran')
  ) {
    const persen = 4;
    const nominalPajak = Math.round(nominal * 0.04);
    const label = uLower.includes('pengawas') && !uLower.includes('perencana')
      ? 'PPh Pasal 4(2) Pengawas (4%)'
      : 'PPh Pasal 4(2) Perencana (4%)';

    items.push({
      jenisPajak: 'PPh Pasal 4(2)',
      label,
      persen,
      nominal: nominalPajak,
      keterangan: 'PPh Final Pasal 4(2) Jasa Konsultan Konstruksi 4%',
    });
    return items;
  }

  // ATURAN 3: SEWA ALAT / MOLEN / KENDARAAN (PPh 23 2%)
  if (
    uLower.includes('sewa molen') ||
    uLower.includes('sewa alat') ||
    uLower.includes('sewa mesin') ||
    uLower.includes('sewa pick up') ||
    uLower.includes('sewa pickup') ||
    uLower.includes('sewa truk') ||
    uLower.includes('sewa kendaraan')
  ) {
    const persen = 2;
    const nominalPajak = Math.round(nominal * 0.02);
    items.push({
      jenisPajak: 'PPh 23',
      label: 'PPh Pasal 23 Sewa Alat (2%)',
      persen,
      nominal: nominalPajak,
      keterangan: 'PPh Pasal 23 Sewa Harta/Peralatan 2%',
    });
    return items;
  }

  // ATURAN 4: BORONGAN FISIK PIHAK KETIGA / KONTRAKTOR (PPh Final 4(2) 4%)
  if (
    uLower.includes('borongan') ||
    uLower.includes('subkon') ||
    uLower.includes('kontraktor') ||
    uLower.includes('pihak ketiga')
  ) {
    const persen = 4;
    const nominalPajak = Math.round(nominal * 0.04);
    items.push({
      jenisPajak: 'PPh Pasal 4(2)',
      label: 'PPh Final Borongan Konstruksi (4%)',
      persen,
      nominal: nominalPajak,
      keterangan: 'PPh Final Pasal 4(2) Pelaksanaan Konstruksi 4%',
    });
    return items;
  }

  // ATURAN 5: HONOR FASILITATOR / TENAGA AHLI BUKAN PEGAWAI (PPh 21 2,5%)
  if (
    uLower.includes('fasilitator') ||
    uLower.includes('tenaga ahli') ||
    uLower.includes('tim teknis') ||
    uLower.includes('narasumber')
  ) {
    const persen = 2.5;
    const nominalPajak = Math.round(nominal * 0.025);
    items.push({
      jenisPajak: 'PPh 21',
      label: 'PPh 21 Fasilitator / Tenaga Ahli (2,5%)',
      persen,
      nominal: nominalPajak,
      keterangan: 'PPh 21 Imbalan Tenaga Ahli Bukan Pegawai (2,5%)',
    });
    return items;
  }

  // ATURAN 6: MATERIAL PASIR & BATU TIDAK DIBERIKAN PAJAK
  // DAN SELAIN ITU (MATERIAL TOKO, KAYU, SEMEN, BESI, DLL.) DIKENAKAN PPN (11%) + PPh 22 (1,5%) JIKA BELANJA > RP 2 JUTA
  let taxableNominal = 0;
  let hasOtherGoods = false;

  if (t.subItems && t.subItems.length > 0) {
    // Jika ada rincian subItems: pisahkan item pasir & batu (bebas) dengan material lainnya
    let taxableSum = 0;
    t.subItems.forEach((sub) => {
      const isExempt = isPasirOrBatuItem(sub.nama) || /upah|tukang|ongkos/i.test(sub.nama);
      if (!isExempt) {
        hasOtherGoods = true;
        taxableSum += sub.subtotal || 0;
      }
    });

    // Jika seluruh subItem adalah pasir/batu/upah, tidak kena pajak
    if (!hasOtherGoods) {
      return [];
    }
    taxableNominal = taxableSum;
  } else {
    // Tanpa subItems: periksa uraian transaksi
    const isExemptPasirOrBatu = isPasirOrBatuItem(t.uraian);
    const hasTaxableKeyword =
      uLower.includes('kayu') ||
      uLower.includes('toko') ||
      uLower.includes('material toko') ||
      uLower.includes('semen') ||
      uLower.includes('besi') ||
      uLower.includes('cat') ||
      uLower.includes('seng') ||
      uLower.includes('keramik') ||
      uLower.includes('pipa') ||
      uLower.includes('triplek') ||
      uLower.includes('spanduk') ||
      uLower.includes('atk') ||
      uLower.includes('papan') ||
      uLower.includes('baut') ||
      uLower.includes('paku');

    // Jika uraian murni pasir atau batu tanpa material toko/kayu, bebas pajak
    if (isExemptPasirOrBatu && !hasTaxableKeyword) {
      return [];
    }

    taxableNominal = nominal;
  }

  // Batas nominal belanja toko/kayu/material: DI ATAS 2 JUTA (> Rp 2.000.000)
  if (taxableNominal > 2_000_000) {
    const ppn = Math.round(taxableNominal * 0.11);
    const pph22 = Math.round(taxableNominal * 0.015);

    // 1. PPN 11%
    items.push({
      jenisPajak: 'PPN',
      label: 'PPN (11%)',
      persen: 11,
      nominal: ppn,
      keterangan: 'PPN 11% Belanja Material Toko/Kayu > Rp 2 Jt',
    });

    // 2. PPh Pasal 22 (1,5%)
    items.push({
      jenisPajak: 'PPh 22',
      label: 'PPh 22 (1,5%)',
      persen: 1.5,
      nominal: pph22,
      keterangan: 'PPh Pasal 22 (1,5%) Belanja Material Toko/Kayu > Rp 2 Jt',
    });

    return items;
  }

  // Belanja <= Rp 2.000.000 bebas pajak
  return [];
}

/**
 * Menghasilkan baris-baris BKU Pajak secara otomatis HANYA dari transaksi yang ada pajaknya!
 * Transaksi belanja tanpa pajak (material toko swakelola biasa, upah tukang <= 450rb/hari)
 * DIKECUALIKAN / TIDAK DIMASUKKAN ke Buku Pembantu Pajak.
 */
export function generatePajakRowsFromTransactions(
  transactions: Transaction[],
  options?: {
    includeParentBelanjaRow?: boolean;
    includeInitialCashRow?: boolean;
  }
): PajakRowItem[] {
  const sorted = sortTransactionsChronologically(transactions);
  const rows: PajakRowItem[] = [];
  const includeParent = options?.includeParentBelanjaRow ?? true;
  const includeInitial = options?.includeInitialCashRow ?? false;

  // Hanya jika diinginkan: baris saldo awal pajak
  if (includeInitial) {
    const firstTarik = sorted.find((t) => t.metode === 'TARIK_TUNAI');
    if (firstTarik) {
      rows.push({
        id: `pjk-init-${firstTarik.id}`,
        tanggal: formatToSlashDate(firstTarik.tanggal),
        nomorBukti: firstTarik.nomorBukti || 'SP2D-001',
        uraian: `Saldo Awal Kas Pajak (${firstTarik.uraian})`,
        penerimaan: firstTarik.penerimaan || firstTarik.pengeluaran,
        pengeluaran: 0,
        isTaxRow: false,
        linkedTxId: firstTarik.id,
      });
    }
  }

  // Loop transaksi pengeluaran belanja
  const expenseTxs = sorted.filter(
    (t) => t.metode !== 'TARIK_TUNAI' && t.jenis === 'PENGELUARAN' && t.pengeluaran > 0
  );

  expenseTxs.forEach((t) => {
    const taxItems = detectTaxForTransaction(t);

    // KRUSIAL: HANYA BELANJA YANG MEMILIKI PAJAK YANG DIMASUKKAN!
    // Jika tidak ada kewajiban pajak (pajak Rp 0), lewati transaksi ini!
    if (!taxItems || taxItems.length === 0) {
      return;
    }

    const tgl = formatToSlashDate(t.tanggal);
    const nominalBelanja = t.pengeluaran;

    // Baris Induk Belanja yang Dikenai Pajak
    if (includeParent) {
      rows.push({
        id: `pjk-tx-${t.id}`,
        tanggal: tgl,
        nomorBukti: t.nomorBukti || '',
        uraian: t.uraian,
        penerimaan: 0,
        pengeluaran: nominalBelanja,
        isTaxRow: false,
        linkedTxId: t.id,
      });
    }

    // Baris Pajak Diterima (Penerimaan) & Pajak Dibayarkan/Disetor (Pengeluaran)
    taxItems.forEach((tax, taxIdx) => {
      // 1. Diterima Potongan Pajak
      rows.push({
        id: `pjk-tax-in-${t.id}-${taxIdx}`,
        tanggal: tgl,
        nomorBukti: '',
        uraian: `Diterima ${tax.label} ${t.uraian}`,
        penerimaan: tax.nominal,
        pengeluaran: 0,
        isTaxRow: true,
        jenisPajak: tax.jenisPajak,
        linkedTxId: t.id,
      });

      // 2. Dibayarkan / Disetorkan ke Kas Negara
      rows.push({
        id: `pjk-tax-out-${t.id}-${taxIdx}`,
        tanggal: tgl,
        nomorBukti: '',
        uraian: `Dibayarkan ${tax.label} ${t.uraian}`,
        penerimaan: 0,
        pengeluaran: tax.nominal,
        isTaxRow: true,
        jenisPajak: tax.jenisPajak,
        linkedTxId: t.id,
      });
    });
  });

  return rows;
}

/**
 * Filter untuk memastikan hanya baris yang berpajak yang tampil di BKU Pajak.
 * Menyingkirkan baris transaksi belanja yang tidak memiliki pemotongan/pungutan pajak (nominal pajak Rp 0).
 */
export function filterOnlyTaxableRows(rows: PajakRowItem[]): PajakRowItem[] {
  if (!rows || rows.length === 0) return [];

  // Kumpulkan semua linkedTxId yang memiliki baris pajak dengan penerimaan/pengeluaran > 0
  const taxableTxIds = new Set<string>();
  rows.forEach((r) => {
    const isTax =
      r.isTaxRow ||
      /^(diterima|dibayarkan|dipungut|disetor|ppn|pph)/i.test(r.uraian.trim());
    if (isTax && ((r.penerimaan || 0) > 0 || (r.pengeluaran || 0) > 0)) {
      if (r.linkedTxId) taxableTxIds.add(r.linkedTxId);
    }
  });

  // Filter baris
  return rows.filter((r, idx) => {
    const isTax =
      r.isTaxRow ||
      /^(diterima|dibayarkan|dipungut|disetor|ppn|pph)/i.test(r.uraian.trim());

    // Baris pajak asli selalu disertakan jika nominalnya > 0
    if (isTax) {
      return (r.penerimaan || 0) > 0 || (r.pengeluaran || 0) > 0;
    }

    // Jika baris saldo awal di baris pertama
    if (idx === 0 && (r.uraian.toLowerCase().includes('saldo awal') || r.penerimaan > 0)) {
      return true;
    }

    // Jika memiliki linkedTxId yang terbukti punya baris pajak
    if (r.linkedTxId && taxableTxIds.has(r.linkedTxId)) {
      return true;
    }

    // Jika baris induk tanpa linkedTxId, cek apakah baris berikutnya adalah baris pajak yang merujuk belanja ini
    const nextRow = rows[idx + 1];
    if (
      nextRow &&
      (nextRow.isTaxRow || /^(diterima|dipungut)/i.test(nextRow.uraian.trim())) &&
      ((nextRow.penerimaan || 0) > 0 || (nextRow.pengeluaran || 0) > 0)
    ) {
      return true;
    }

    // Jika tidak ada pajak sama sekali, buang dari Buku Pembantu Pajak!
    return false;
  });
}

/**
 * Menghitung nominal pajak otomatis dari nilai belanja berdasarkan tarif resmi:
 * - PPh Final 4% (Jasa Konstruksi / Perencana / Pengawas)
 * - PPh Final 1,75% (Jasa Konstruksi Kualifikasi Kecil)
 * - PPh 23 (2%) (Sewa Alat / Molen / Angkutan)
 * - PPh 21 (2,5%) (Tenaga Ahli Bukan Pegawai: 50% x 5%)
 * - PPh 21 (5%) (Honorarium PNS Golongan III)
 * - PPh 21 (15%) (Honorarium PNS Golongan IV)
 * - PPh 21 (0,5%) (Upah Tukang > Rp 450rb/hari)
 * - PPN (11%)
 * - PPh 22 (1,5%)
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

  const jLower = jenis.toLowerCase();

  if (jLower.includes('ppn + pph 22')) {
    return Math.round(base * 0.125);
  }
  if (jLower.includes('ppn')) {
    return Math.round(base * 0.11);
  }
  if (jLower.includes('pph 22') || jLower.includes('pph22')) {
    return Math.round(base * 0.015);
  }
  if (jLower.includes('pph 23') || jLower.includes('pph23')) {
    return Math.round(base * 0.02);
  }
  if (jLower.includes('1,75') || jLower.includes('1.75')) {
    return Math.round(base * 0.0175);
  }
  if (
    jLower.includes('pph 4%') ||
    jLower.includes('pasal 4(2)') ||
    jLower.includes('pasal 4 ayat 2') ||
    jLower.includes('4%')
  ) {
    return Math.round(base * 0.04);
  }
  if (jLower.includes('2,5') || jLower.includes('2.5') || jLower.includes('bukan pegawai')) {
    return Math.round(base * 0.025);
  }
  if (jLower.includes('gol iv') || jLower.includes('golongan iv') || jLower.includes('15%')) {
    return Math.round(base * 0.15);
  }
  if (jLower.includes('pph 21') || jLower.includes('pph21') || jLower.includes('gol iii') || jLower.includes('5%')) {
    return Math.round(base * 0.05);
  }
  if (jLower.includes('0,5') || jLower.includes('0.5')) {
    return Math.round(base * 0.005);
  }
  if (jLower.includes('daerah') || jLower.includes('10%')) {
    return Math.round(base * 0.1);
  }

  return Math.round(base * 0.04);
}

export interface ComputedPajakRow extends PajakRowItem {
  noUrut: number;
  tanggalFormatted: string;
  isTax: boolean;
  saldo: number;
  isInitialRow?: boolean;
}

export interface MonthlyPajakGroup {
  monthKey: string; // e.g. "2026-08", "2026-10"
  monthName: string; // e.g. "Agustus", "Oktober"
  year: number; // e.g. 2026
  label: string; // e.g. "Agustus 2026", "Oktober 2026"
  tanggalTutupBuku: string; // e.g. "31/08/2026", "31/10/2026"
  rows: ComputedPajakRow[];
  totalPenerimaanPajak: number;
  totalPengeluaranPajak: number;
  totalBelanjaBruto: number;
  saldoAwalPajak: number;
  saldoAkhirPajak: number;
  hasTransactions: boolean;
}

/**
  * Mengelompokkan baris BKU Pajak ke dalam buku bulanan sesuai dengan bulan-bulan berjalan di BKU Tunai.
  * Setiap bulan berjalan memiliki lembar resmi tersendiri lengkap dengan kop bulan berjalan,
  * tabel 7 kolom, saldo awal/kumulatif, tutup buku, dan 3 tanda tangan.
  */
export function groupPajakRowsByMonthlyBooks(
  pajakRows: PajakRowItem[],
  transactions: Transaction[] = [],
  profile?: ProjectProfile,
  onlyTaxable: boolean = true
): MonthlyPajakGroup[] {
  // 1. Kumpulkan seluruh bulan berjalan dari BKU Tunai / Transaksi, Profil, dan PajakRows
  const runningMonthsMap = new Map<
    string,
    { monthName: string; year: number; label: string; tanggalTutupBuku: string }
  >();

  // Ambil semua bulan berjalan dari BKU Tunai (sesuai groupTransactionsByMonthlyBooks)
  const bkuMonthlyBooks = groupTransactionsByMonthlyBooks(transactions, profile);
  bkuMonthlyBooks.forEach((g) => {
    runningMonthsMap.set(g.monthKey, {
      monthName: g.monthName,
      year: g.year,
      label: g.label,
      tanggalTutupBuku: g.tanggalTutupBuku,
    });
  });

  // Ambil juga jika ada tanggal di pajakRows yang berada pada bulan lain
  pajakRows.forEach((r) => {
    const my = extractMonthAndYear(r.tanggal);
    if (my) {
      const mIdx = BULAN_LIST.findIndex(
        (m) => m.toLowerCase() === my.month.toLowerCase()
      );
      const pad = String(mIdx >= 0 ? mIdx + 1 : 8).padStart(2, '0');
      const key = `${my.year}-${pad}`;
      if (!runningMonthsMap.has(key)) {
        runningMonthsMap.set(key, {
          monthName: my.month,
          year: my.year,
          label: `${my.month} ${my.year}`,
          tanggalTutupBuku: getClosingDateForMonth(my.month, my.year),
        });
      }
    }
  });

  // Fallback jika belum ada data sama sekali
  if (runningMonthsMap.size === 0) {
    const profMonth = profile?.bulanLaporan || 'AGUSTUS 2026';
    const my = extractMonthAndYear(profMonth);
    const monthName = my?.month || 'Agustus';
    const year = my?.year || 2026;
    const mIdx = BULAN_LIST.findIndex(
      (m) => m.toLowerCase() === monthName.toLowerCase()
    );
    const pad = String(mIdx >= 0 ? mIdx + 1 : 8).padStart(2, '0');
    const key = `${year}-${pad}`;
    runningMonthsMap.set(key, {
      monthName,
      year,
      label: `${monthName} ${year}`,
      tanggalTutupBuku: getClosingDateForMonth(monthName, year),
    });
  }

  // Urutkan kunci bulan secara kronologis (misal 2026-08, 2026-09, 2026-10)
  const sortedMonthKeys = Array.from(runningMonthsMap.keys()).sort();

  // Filter baris sumber: hanya belanja yang ada pajaknya jika filter aktif
  const sourceRows = onlyTaxable ? filterOnlyTaxableRows(pajakRows) : pajakRows;

  const groups: MonthlyPajakGroup[] = [];
  let runningSaldoAcrossMonths = 0;

  sortedMonthKeys.forEach((key, monthIdx) => {
    const monthMeta = runningMonthsMap.get(key)!;
    const { monthName, year, label, tanggalTutupBuku } = monthMeta;
    const isFirstMonth = monthIdx === 0;
    const saldoAwalBulan = runningSaldoAcrossMonths;

    // Filter baris yang jatuh pada bulan ini
    const rowsInMonth = sourceRows.filter((r) => {
      const my = extractMonthAndYear(r.tanggal);
      if (!my) {
        return isFirstMonth;
      }
      const idx = BULAN_LIST.findIndex(
        (m) => m.toLowerCase() === my.month.toLowerCase()
      );
      const pad = String(idx >= 0 ? idx + 1 : 8).padStart(2, '0');
      return `${my.year}-${pad}` === key;
    });

    let effectiveRows = [...rowsInMonth];

    // Jika bulan ini belum memiliki baris pajak di pajakRows, namun di BKU Tunai bulan ini
    // ada transaksi belanja yang merupakan objek pajak (misal konsultan/perencana/pengawas/sewa),
    // otomatis buatkan baris pajaknya untuk bulan berjalan ini!
    if (effectiveRows.length === 0 && transactions && transactions.length > 0) {
      const txsInMonth = transactions.filter((t) => {
        const my = extractMonthAndYear(t.tanggal);
        if (!my) return false;
        const idx = BULAN_LIST.findIndex(
          (m) => m.toLowerCase() === my.month.toLowerCase()
        );
        const pad = String(idx >= 0 ? idx + 1 : 8).padStart(2, '0');
        return `${my.year}-${pad}` === key;
      });

      const autoTaxRows = generatePajakRowsFromTransactions(txsInMonth);
      if (autoTaxRows.length > 0) {
        effectiveRows = autoTaxRows;
      }
    }

    const computedRowsForMonth: ComputedPajakRow[] = [];
    let rowNo = 1;
    let monthPenerimaanPajak = 0;
    let monthPengeluaranPajak = 0;
    let monthBelanjaBruto = 0;

    // Jika ada sisa saldo pajak dari bulan sebelumnya (> 0), sertakan baris saldo awal bulan
    if (!isFirstMonth && saldoAwalBulan > 0) {
      const prevMonthName = groups[monthIdx - 1]?.monthName || '';
      const firstDateStr = getFirstDateForMonth(monthName, year);
      computedRowsForMonth.push({
        id: `pjk-init-${key}`,
        tanggal: firstDateStr,
        nomorBukti: '-',
        uraian: `Sisa Saldo Kas Pajak Bulan ${prevMonthName}`,
        penerimaan: saldoAwalBulan,
        pengeluaran: 0,
        isTaxRow: true,
        noUrut: rowNo++,
        tanggalFormatted: firstDateStr,
        isTax: true,
        saldo: runningSaldoAcrossMonths,
        isInitialRow: true,
      });
      monthPenerimaanPajak += saldoAwalBulan;
    }

    effectiveRows.forEach((row) => {
      const tanggalFormatted = formatToSlashDate(row.tanggal);
      const isTax =
        row.isTaxRow !== undefined
          ? row.isTaxRow
          : /^(diterima|dibayarkan|dipungut|disetor|ppn|pph)/i.test(row.uraian.trim());

      if (isTax) {
        runningSaldoAcrossMonths += (row.penerimaan || 0) - (row.pengeluaran || 0);
        monthPenerimaanPajak += row.penerimaan || 0;
        monthPengeluaranPajak += row.pengeluaran || 0;
      } else {
        monthBelanjaBruto += row.pengeluaran || 0;
      }

      computedRowsForMonth.push({
        ...row,
        noUrut: rowNo++,
        tanggalFormatted,
        isTax,
        saldo: isTax ? runningSaldoAcrossMonths : 0,
      });
    });

    const hasTransactions = effectiveRows.length > 0;

    groups.push({
      monthKey: key,
      monthName,
      year,
      label,
      tanggalTutupBuku,
      rows: computedRowsForMonth,
      totalPenerimaanPajak: monthPenerimaanPajak,
      totalPengeluaranPajak: monthPengeluaranPajak,
      totalBelanjaBruto: monthBelanjaBruto,
      saldoAwalPajak: saldoAwalBulan,
      saldoAkhirPajak: runningSaldoAcrossMonths,
      hasTransactions,
    });
  });

  return groups;
}

