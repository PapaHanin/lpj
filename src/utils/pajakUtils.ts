import { PajakRowItem, Transaction, JenisPajak } from '../types';
import { formatToSlashDate } from './dateUtils';
import { sortTransactionsChronologically } from './calculations';

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
  {
    id: 'pjk-img-1',
    tanggal: '01/08/2026',
    nomorBukti: 'SP2D-001',
    uraian: 'Saldo Awal Kas Pajak (pengambilan pertama)',
    penerimaan: 1000000000,
    pengeluaran: 0,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-2',
    tanggal: '01/08/2026',
    nomorBukti: 'KW-001',
    uraian: 'Belanja Semen (Toko Rekanan PKP)',
    penerimaan: 0,
    pengeluaran: 3774000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-3',
    tanggal: '01/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPN Belanja Semen (11%)',
    penerimaan: 374000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPN',
  },
  {
    id: 'pjk-img-4',
    tanggal: '01/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPN Belanja semen (11%)',
    penerimaan: 0,
    pengeluaran: 374000,
    isTaxRow: true,
    jenisPajak: 'PPN',
  },
  {
    id: 'pjk-img-5',
    tanggal: '01/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 22 Belanja semen (1,5%)',
    penerimaan: 51000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
  },
  {
    id: 'pjk-img-6',
    tanggal: '01/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 22 Belanja semen (1,5%)',
    penerimaan: 0,
    pengeluaran: 51000,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
  },
  {
    id: 'pjk-img-7',
    tanggal: '03/08/2026',
    nomorBukti: 'KW-002',
    uraian: 'Pembelian Alat Tulis Kantor (Toko PKP > Rp 2 Jt)',
    penerimaan: 0,
    pengeluaran: 3000000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-8',
    tanggal: '03/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPN Pembelian alat tulis (11%)',
    penerimaan: 330000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPN',
  },
  {
    id: 'pjk-img-9',
    tanggal: '03/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPN Belanja alat tulis (11%)',
    penerimaan: 0,
    pengeluaran: 330000,
    isTaxRow: true,
    jenisPajak: 'PPN',
  },
  {
    id: 'pjk-img-10',
    tanggal: '03/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 22 Belanja alat tulis (1,5%)',
    penerimaan: 45000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
  },
  {
    id: 'pjk-img-11',
    tanggal: '03/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 22 Belanja alat tulis (1,5%)',
    penerimaan: 0,
    pengeluaran: 45000,
    isTaxRow: true,
    jenisPajak: 'PPh 22',
  },
  {
    id: 'pjk-img-12',
    tanggal: '06/08/2026',
    nomorBukti: 'KW-003',
    uraian: 'Membayar Upah Tenaga Teknis Ahli an. Wasito',
    penerimaan: 0,
    pengeluaran: 20000000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-13',
    tanggal: '06/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh 21 an. Wasito (5%)',
    penerimaan: 1000000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh 21',
  },
  {
    id: 'pjk-img-14',
    tanggal: '06/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh 21 an. Wasito (5%)',
    penerimaan: 0,
    pengeluaran: 1000000,
    isTaxRow: true,
    jenisPajak: 'PPh 21',
  },
  {
    id: 'pjk-img-15',
    tanggal: '08/08/2026',
    nomorBukti: 'KW-004',
    uraian: 'Biaya Perencana Konstruksi',
    penerimaan: 0,
    pengeluaran: 20000000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-16',
    tanggal: '08/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh Pasal 4(2) Perencana (4%)',
    penerimaan: 800000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
  },
  {
    id: 'pjk-img-17',
    tanggal: '08/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh Pasal 4(2) Perencana (4%)',
    penerimaan: 0,
    pengeluaran: 800000,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
  },
  {
    id: 'pjk-img-18',
    tanggal: '08/08/2026',
    nomorBukti: 'KW-005',
    uraian: 'Biaya Pengawas Konstruksi (70%)',
    penerimaan: 0,
    pengeluaran: 10000000,
    isTaxRow: false,
  },
  {
    id: 'pjk-img-19',
    tanggal: '08/08/2026',
    nomorBukti: '',
    uraian: 'Diterima PPh Pasal 4(2) Pengawas (4%)',
    penerimaan: 400000,
    pengeluaran: 0,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
  },
  {
    id: 'pjk-img-20',
    tanggal: '08/08/2026',
    nomorBukti: '',
    uraian: 'Dibayarkan PPh Pasal 4(2) Pengawas (4%)',
    penerimaan: 0,
    pengeluaran: 400000,
    isTaxRow: true,
    jenisPajak: 'PPh Pasal 4(2)',
  },
  // CATATAN: Transaksi tanpa pajak (misal Biaya Pengelolaan tanpa potongan pajak)
  // TIDAK DIMASUKKAN ke Buku Pembantu Pajak sesuai permintaan user & aturan perpajakan!
];

export interface DetectedTaxItem {
  jenisPajak: JenisPajak;
  label: string;
  persen: number;
  nominal: number;
  keterangan: string;
}

/**
 * Deteksi kewajiban pajak transaksi belanja berdasarkan materi perpajakan P2SP KPP Pratama.
 * Mengembalikan array pajak (kosong jika tidak ada pajak / bebas pajak).
 */
export function detectTaxForTransaction(t: Transaction): DetectedTaxItem[] {
  // Transaksi tarik tunai atau penerimaan bukan objek pajak belanja
  if (t.metode === 'TARIK_TUNAI' || t.jenis === 'PENERIMAAN' || !t.pengeluaran || t.pengeluaran <= 0) {
    return [];
  }

  const uLower = (t.uraian || '').toLowerCase();
  const nominal = t.pengeluaran;
  const items: DetectedTaxItem[] = [];

  // 1. Jasa Perencana / Pengawas Konstruksi -> PPh Final Pasal 4(2) sebesar 4% (Slide 45)
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
      keterangan: 'PPh Final Pasal 4(2) Jasa Konsultan Konstruksi 4% (Slide 45)',
    });
    return items;
  }

  // 2. Sewa Alat / Molen Cor / Mesin / Kendaraan Angkut -> PPh Pasal 23 sebesar 2% (Slide 33-35)
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
      keterangan: 'PPh Pasal 23 Sewa Harta/Peralatan 2% (Slide 33-35)',
    });
    return items;
  }

  // 3. Pekerjaan Borongan Konstruksi Fisik oleh pihak ketiga / mandor borong -> PPh Final Pasal 4(2) 4% (Slide 45)
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
      keterangan: 'PPh Final Pasal 4(2) Pelaksanaan Konstruksi Tanpa Sertifikat 4% (Slide 45)',
    });
    return items;
  }

  // 4. Honor Fasilitator Teknik / Manajemen / Tenaga Ahli Non-PNS -> PPh 21 Bukan Pegawai 2,5% (Slide 27)
  if (
    uLower.includes('fasilitator') ||
    uLower.includes('tenaga ahli') ||
    uLower.includes('tim teknis') ||
    uLower.includes('narasumber')
  ) {
    // Tarif PPh 21 Bukan Pegawai: 50% x 5% = 2,5%
    const persen = 2.5;
    const nominalPajak = Math.round(nominal * 0.025);
    items.push({
      jenisPajak: 'PPh 21',
      label: 'PPh 21 Fasilitator / Tenaga Ahli (2,5%)',
      persen,
      nominal: nominalPajak,
      keterangan: 'PPh 21 Imbalan Tenaga Ahli Bukan Pegawai (50% x 5% = 2,5%) (Slide 27)',
    });
    return items;
  }

  // 5. Belanja Rekanan Toko yang secara eksplisit bertanda PKP
  if (uLower.includes('pkp') || uLower.includes('ppn')) {
    const ppn = Math.round(nominal * 0.11);
    items.push({
      jenisPajak: 'PPN',
      label: 'PPN Toko Rekanan PKP (11%)',
      persen: 11,
      nominal: ppn,
      keterangan: 'PPN Rekanan PKP 11% (Slide 38)',
    });
    return items;
  }

  // 6. UPAH TUKANG SWAKELOLA HARIAN (Slide 21 & 26):
  // Upah per orang per hari rata-rata Rp 120.000 - Rp 200.000 (di bawah batas Rp 450.000/hari).
  // Sesuai aturan PP 58/2023 & PMK 168/2023: TER Harian = 0%, PPh 21 = Rp 0 (BEBAS PAJAK).
  // Maka TIDAK ADA PAJAK untuk upah tukang harian biasa!

  // 7. BELANJA MATERIAL TOKO SWAKELOLA (Slide 15 & Slide 32 Kasus 2):
  // P2SP BUKAN Pemungut PPh 22 dan BUKAN Pemungut PPN!
  // Maka belanja material toko biasa oleh P2SP TIDAK DIPOTONG PAJAK oleh sekolah (Pajak = Rp 0).

  // Semua belanja lainnya yang bebas pajak mengembalikan array kosong [].
  return items;
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
