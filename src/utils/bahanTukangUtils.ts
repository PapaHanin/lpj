import {
  Transaction,
  CustomBahanItem,
  AbsenMingguanTukang,
  HariKerjaRecord,
  PekerjaTukang,
  BangunanProyek,
} from '../types';

export const INITIAL_BANGUNAN_LIST: BangunanProyek[] = [
  {
    id: 'bangunan-1',
    nama: 'Pembangunan Laboratorium Komputer dan UKS',
    kode: 'BG-01',
    lokasi: '',
    keterangan: 'Pembangunan Laboratorium Komputer beserta UKS',
  },
  {
    id: 'bangunan-2',
    nama: 'Pembangunan Ruang Perpustakaan',
    kode: 'BG-02',
    lokasi: '',
    keterangan: 'Pembangunan Ruang Perpustakaan Sekolah Beserta Perabotnya',
  },
  {
    id: 'bangunan-3',
    nama: 'Rehabilitasi Ruang Kelas',
    kode: 'BG-03',
    lokasi: '',
    keterangan: 'Rehabilitasi Ruang Kelas Belajar (RKB)',
  },
];

export interface HariKerjaColDef {
  key: keyof HariKerjaRecord;
  weekGroup: 1 | 2;
  dayIndex: number;
  roman: string;
  label: string;
  short: string;
  dayName: string;
}

export const HARI_KERJA_2_MINGGU: HariKerjaColDef[] = [
  // MINGGU I
  { key: 'm1_1', weekGroup: 1, dayIndex: 1, roman: 'I', label: 'Hari I (Mgg 1)', short: 'I', dayName: 'Senin' },
  { key: 'm1_2', weekGroup: 1, dayIndex: 2, roman: 'II', label: 'Hari II (Mgg 1)', short: 'II', dayName: 'Selasa' },
  { key: 'm1_3', weekGroup: 1, dayIndex: 3, roman: 'III', label: 'Hari III (Mgg 1)', short: 'III', dayName: 'Rabu' },
  { key: 'm1_4', weekGroup: 1, dayIndex: 4, roman: 'IV', label: 'Hari IV (Mgg 1)', short: 'IV', dayName: 'Kamis' },
  { key: 'm1_5', weekGroup: 1, dayIndex: 5, roman: 'V', label: 'Hari V (Mgg 1)', short: 'V', dayName: 'Jumat' },
  { key: 'm1_6', weekGroup: 1, dayIndex: 6, roman: 'VI', label: 'Hari VI (Mgg 1)', short: 'VI', dayName: 'Sabtu' },
  { key: 'm1_7', weekGroup: 1, dayIndex: 7, roman: 'VII', label: 'Hari VII (Mgg 1)', short: 'VII', dayName: 'Minggu' },

  // MINGGU II
  { key: 'm2_1', weekGroup: 2, dayIndex: 8, roman: 'I', label: 'Hari I (Mgg 2)', short: 'I', dayName: 'Senin' },
  { key: 'm2_2', weekGroup: 2, dayIndex: 9, roman: 'II', label: 'Hari II (Mgg 2)', short: 'II', dayName: 'Selasa' },
  { key: 'm2_3', weekGroup: 2, dayIndex: 10, roman: 'III', label: 'Hari III (Mgg 2)', short: 'III', dayName: 'Rabu' },
  { key: 'm2_4', weekGroup: 2, dayIndex: 11, roman: 'IV', label: 'Hari IV (Mgg 2)', short: 'IV', dayName: 'Kamis' },
  { key: 'm2_5', weekGroup: 2, dayIndex: 12, roman: 'V', label: 'Hari V (Mgg 2)', short: 'V', dayName: 'Jumat' },
  { key: 'm2_6', weekGroup: 2, dayIndex: 13, roman: 'VI', label: 'Hari VI (Mgg 2)', short: 'VI', dayName: 'Sabtu' },
  { key: 'm2_7', weekGroup: 2, dayIndex: 14, roman: 'VII', label: 'Hari VII (Mgg 2)', short: 'VII', dayName: 'Minggu' },
];

export const HARI_KERJA_KEYS = HARI_KERJA_2_MINGGU;

/**
 * Helper to get day value safely from 2-week record or legacy record
 */
export function getDayValue(h: HariKerjaRecord | undefined, colKey: keyof HariKerjaRecord): number {
  if (!h) return 0;
  if (h[colKey] !== undefined) {
    return Number(h[colKey]) || 0;
  }
  // Migration fallback from 1-week format:
  const legacyMap: Record<string, keyof HariKerjaRecord> = {
    m1_1: 'senin',
    m1_2: 'selasa',
    m1_3: 'rabu',
    m1_4: 'kamis',
    m1_5: 'jumat',
    m1_6: 'sabtu',
    m1_7: 'minggu',
    m2_1: 'senin',
    m2_2: 'selasa',
    m2_3: 'rabu',
    m2_4: 'kamis',
    m2_5: 'jumat',
    m2_6: 'sabtu',
    m2_7: 'minggu',
  };
  const leg = legacyMap[colKey as string];
  if (leg && h[leg] !== undefined) {
    return Number(h[leg]) || 0;
  }
  return 0;
}

/**
 * Default Absen Periode 1 (2 Minggu Pertama: Minggu 1 & 2)
 */
export const DEFAULT_ABSEN_MINGGU_4: AbsenMingguanTukang = {
  id: 'absen-minggu-4',
  bangunanId: 'bangunan-1',
  proyek: 'Pembangunan Laboratorium Komputer dan UKS',
  namaSekolah: '',
  lokasi: '',
  periodeKe: 1,
  mingguKe: 1,
  hariTanggal: '14 s.d 27 Agustus 2023',
  namaKepalaSekolah: '',
  nipKepalaSekolah: '',
  namaBendahara: '',
  nipBendahara: '',
  hariLibur: ['m1_7', 'm2_7'],
  pekerja: [
    {
      id: 'tk-1',
      kategori: 'Kepala Tukang',
      tenagaKerja: 'Kepala Tukang',
      nama: 'JONI',
      hariKerja: {
        m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
        m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
      },
      upahHarian: 150000,
      paraf: '',
    },
    {
      id: 'tk-2',
      kategori: 'Tukang',
      tenagaKerja: 'Tukang',
      nama: 'RISKIATUL',
      hariKerja: {
        m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
        m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
      },
      upahHarian: 140000,
      paraf: '',
    },
    {
      id: 'tk-3',
      kategori: 'Pekerja',
      tenagaKerja: 'Pekerja',
      nama: 'ARTON K.',
      hariKerja: {
        m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
        m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
      },
      upahHarian: 100000,
      paraf: '',
    },
    {
      id: 'tk-4',
      kategori: 'Pekerja',
      tenagaKerja: 'Pekerja',
      nama: 'SUBHAN',
      hariKerja: {
        m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
        m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
      },
      upahHarian: 100000,
      paraf: '',
    },
  ],
};

export const DEFAULT_ABSEN_MINGGU_2: AbsenMingguanTukang = {
  id: 'absen-minggu-2',
  bangunanId: 'bangunan-1',
  proyek: 'Pembangunan Laboratorium Komputer dan UKS',
  namaSekolah: '',
  lokasi: '',
  periodeKe: 2,
  mingguKe: 2,
  hariTanggal: '28 Agustus s.d 10 September 2023',
  hariLibur: ['m1_7', 'm2_7'],
  pekerja: [
    {
      id: 'tk-1',
      kategori: 'Kepala Tukang',
      tenagaKerja: 'Kepala Tukang',
      nama: 'JONI',
      hariKerja: {
        m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
        m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
      },
      upahHarian: 150000,
      paraf: '',
    },
    {
      id: 'tk-2',
      kategori: 'Tukang',
      tenagaKerja: 'Tukang',
      nama: 'RISKIATUL',
      hariKerja: {
        m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
        m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
      },
      upahHarian: 140000,
      paraf: '',
    },
    {
      id: 'tk-3',
      kategori: 'Pekerja',
      tenagaKerja: 'Pekerja',
      nama: 'ARTON K.',
      hariKerja: {
        m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
        m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
      },
      upahHarian: 100000,
      paraf: '',
    },
    {
      id: 'tk-4',
      kategori: 'Pekerja',
      tenagaKerja: 'Pekerja',
      nama: 'SUBHAN',
      hariKerja: {
        m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
        m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
      },
      upahHarian: 100000,
      paraf: '',
    },
  ],
};

export const INITIAL_ABSEN_DATA: AbsenMingguanTukang[] = [
  DEFAULT_ABSEN_MINGGU_4,
  DEFAULT_ABSEN_MINGGU_2,
];

/**
 * Menghitung total hari kerja (angka) dari record 2 minggu (14 hari)
 */
export function calculateTotalHari(h: HariKerjaRecord | undefined): number {
  if (!h) return 0;
  let total = 0;
  for (const col of HARI_KERJA_2_MINGGU) {
    total += getDayValue(h, col.key);
  }
  return total;
}

/**
 * Menghitung total hari kerja Minggu I saja
 */
export function calculateTotalHariM1(h: HariKerjaRecord | undefined): number {
  if (!h) return 0;
  let total = 0;
  for (const col of HARI_KERJA_2_MINGGU.filter((c) => c.weekGroup === 1)) {
    total += getDayValue(h, col.key);
  }
  return total;
}

/**
 * Menghitung total hari kerja Minggu II saja
 */
export function calculateTotalHariM2(h: HariKerjaRecord | undefined): number {
  if (!h) return 0;
  let total = 0;
  for (const col of HARI_KERJA_2_MINGGU.filter((c) => c.weekGroup === 2)) {
    total += getDayValue(h, col.key);
  }
  return total;
}

/**
 * Format tampilan angka hari kerja untuk tabel absen O/H:
 * 1 -> "1,00"
 * 0.5 -> "0,50"
 * 0 -> "-"
 */
export function formatDayCell(val: number): string {
  if (val === 1) return '1,00';
  if (val === 0.5) return '0,50';
  if (val === 0) return '-';
  return val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format desimal dengan koma dan 2 angka di belakang koma (contoh: 7,00 atau 150.000,00)
 */
export function formatDecimal(val: number): string {
  return val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format total hari kerja Org/Mgg
 */
export function formatTotalHari(total: number): string {
  if (total === 0) return '-';
  return total.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Menghitung upah jumlah per pekerja (2 minggu)
 */
export function calculateUpahJumlah(pekerja: PekerjaTukang): number {
  const totalHari = calculateTotalHari(pekerja.hariKerja);
  return Math.round(totalHari * pekerja.upahHarian);
}

/**
 * Menghitung upah jumlah per pekerja untuk Minggu I (1 minggu)
 */
export function calculateUpahJumlahM1(pekerja: PekerjaTukang): number {
  const totalHari = calculateTotalHariM1(pekerja.hariKerja);
  return Math.round(totalHari * pekerja.upahHarian);
}

/**
 * Menghitung upah jumlah per pekerja untuk Minggu II (1 minggu)
 */
export function calculateUpahJumlahM2(pekerja: PekerjaTukang): number {
  const totalHari = calculateTotalHariM2(pekerja.hariKerja);
  return Math.round(totalHari * pekerja.upahHarian);
}

/**
 * Menghitung upah jumlah per pekerja berdasarkan sub-minggu (1 atau 2)
 */
export function calculateUpahJumlahForWeek(pekerja: PekerjaTukang, weekSub: 1 | 2): number {
  return weekSub === 1 ? calculateUpahJumlahM1(pekerja) : calculateUpahJumlahM2(pekerja);
}

/**
 * Menghitung total hari berdasarkan sub-minggu (1 atau 2)
 */
export function calculateTotalHariForWeek(h: HariKerjaRecord | undefined, weekSub: 1 | 2): number {
  return weekSub === 1 ? calculateTotalHariM1(h) : calculateTotalHariM2(h);
}

/**
 * Helper to clean and format material names cleanly
 */
function cleanMaterialName(str: string): string {
  let cleaned = str
    .replace(/^(?:belanja|beli|pembelian|pengadaan|material|biaya|ongkos)\s+/i, '')
    .replace(/\b(?:lagi|tambahan|tahap\s*\d+|tahap\s*satu|tahap\s*dua)\b/gi, '')
    .replace(/^[-\s:.,]+|[-\s:.,]+$/g, '')
    .trim();

  if (!cleaned) return str.trim();
  // Capitalize each word
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeUnit(unitStr: string): string {
  const u = unitStr.toLowerCase().trim();
  if (['trek', 'truk', 'truck'].includes(u)) return 'Trek';
  if (['ret', 'rit'].includes(u)) return 'Ret';
  if (['sak', 'zak'].includes(u)) return 'Sak';
  if (['kbk', 'kubik', 'm3'].includes(u)) return 'Kbk';
  if (['btg', 'batang'].includes(u)) return 'Batang';
  if (['lbr', 'lembar'].includes(u)) return 'Lembar';
  if (['dos', 'dus'].includes(u)) return 'Dus';
  if (['kg', 'kilo', 'kilogram'].includes(u)) return 'Kg';
  if (['bh', 'buah'].includes(u)) return 'Buah';
  if (['klg', 'kaleng'].includes(u)) return 'Kaleng';
  if (['rol', 'roll'].includes(u)) return 'Roll';
  if (['m', 'meter'].includes(u)) return 'Meter';
  return unitStr.charAt(0).toUpperCase() + unitStr.slice(1);
}

/**
 * Ekstraksi & Agregasi Daftar Bahan Otomatis dari Buku Kas Tunai
 * Sesuai permintaan user:
 * "untuk daftar bahan, saya ingin diambil dari buku kas tunai seperti belanja pasir 3 trek tanggal 9
 * kemudian tanggal 15 ada belanjja pasir lagi 10 trek otomatis bahan pasir yang ada di daftar bahan
 * jadi 13 trek dengan jumlah total harga 13 trek juga seperti itu."
 */
export function extractDaftarBahan(
  transactions: Transaction[],
  aggregateByName: boolean = true
): CustomBahanItem[] {
  const rawItems: {
    namaBarang: string;
    volume: number;
    namaSatuan: string;
    harga: number;
    total: number;
  }[] = [];

  // Filter transaksi BUKU KAS TUNAI saja (pengeluaran tunai)
  const bkuTunaiExpenses = transactions.filter(
    (tx) => tx.metode === 'TUNAI' && tx.jenis === 'PENGELUARAN' && tx.pengeluaran > 0
  );

  bkuTunaiExpenses.forEach((tx) => {
    // Abaikan pengeluaran non-material seperti panjar, honor, administrasi, dll.
    const uraianLower = tx.uraian.toLowerCase();
    if (
      uraianLower.includes('panjar') ||
      uraianLower.includes('fasilitator') ||
      uraianLower.includes('perencana') ||
      uraianLower.includes('pengawasan') ||
      uraianLower.includes('upah tukang') ||
      uraianLower.includes('bayar tukang') ||
      uraianLower.includes('pembersihan') ||
      uraianLower.includes('pemasangan spanduk')
    ) {
      return;
    }

    // Kasus 1: Transaksi memiliki rincian sub-items barang/material
    if (tx.subItems && tx.subItems.length > 0) {
      tx.subItems.forEach((sub) => {
        const cleanName = cleanMaterialName(sub.nama);
        const vol = Number(sub.volume) || 1;
        const satuan = normalizeUnit(sub.satuan.trim() || 'Unit');
        const harga = Number(sub.hargaSatuan) || 0;
        const total = Number(sub.subtotal) || vol * harga;

        rawItems.push({
          namaBarang: cleanName,
          volume: vol,
          namaSatuan: satuan,
          harga,
          total,
        });
      });
    } else {
      // Kasus 2: Transaksi tanpa subItems, deteksi volume, satuan, dan nama dari uraian
      // Contoh: "Belanja pasir 3 trek", "Belanja pasir 10 trek", "Semen 50 sak"
      const qtyUnitRegex =
        /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(trek|truk|truck|ret|rit|sak|zak|m3|meter|m|kubik|kbk|batang|btg|lembar|lbr|dus|dos|kg|kilo|buah|bh|unit|roll|rol|kaleng|klg|paket|pkt|lonjor)\b/i;
      const match = tx.uraian.match(qtyUnitRegex);

      if (match) {
        const parsedVol = parseFloat(match[1].replace(',', '.'));
        const vol = isNaN(parsedVol) || parsedVol <= 0 ? 1 : parsedVol;
        const satuan = normalizeUnit(match[2]);

        // Hapus potongan volume dan satuan dari uraian untuk mendapatkan nama barang murni
        const uraianWithoutQty = tx.uraian.replace(match[0], ' ');
        const cleanName = cleanMaterialName(uraianWithoutQty);
        const total = tx.pengeluaran;
        const harga = Math.round(total / vol);

        rawItems.push({
          namaBarang: cleanName || 'Material Belanja',
          volume: vol,
          namaSatuan: satuan,
          harga,
          total,
        });
      } else {
        // Belanja material tanpa format volume eksplisit
        const cleanName = cleanMaterialName(tx.uraian);
        rawItems.push({
          namaBarang: cleanName || tx.uraian.trim(),
          volume: 1,
          namaSatuan: 'Paket',
          harga: tx.pengeluaran,
          total: tx.pengeluaran,
        });
      }
    }
  });

  if (!aggregateByName) {
    return rawItems.map((item, idx) => ({
      id: `raw-${idx + 1}`,
      namaBarang: item.namaBarang,
      volume: item.volume,
      namaSatuan: item.namaSatuan,
      satuanDisplay: `${item.volume.toLocaleString('id-ID')} ${item.namaSatuan}`,
      harga: item.harga,
      total: item.total,
    }));
  }

  // Agregasi barang berdasarkan nama barang & satuan yang sama
  // e.g., Pasir 3 trek + Pasir 10 trek => Pasir 13 Trek
  const map = new Map<
    string,
    {
      namaBarang: string;
      totalVolume: number;
      namaSatuan: string;
      totalBiaya: number;
      hargaSatuanTerakhir: number;
    }
  >();

  rawItems.forEach((item) => {
    // Normalisasi kunci pencocokan (contoh: "pasir__trek")
    const key = `${item.namaBarang.toLowerCase()}__${item.namaSatuan.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        namaBarang: item.namaBarang,
        totalVolume: item.volume,
        namaSatuan: item.namaSatuan,
        totalBiaya: item.total,
        hargaSatuanTerakhir: item.harga,
      });
    } else {
      existing.totalVolume += item.volume;
      existing.totalBiaya += item.total;
      existing.hargaSatuanTerakhir = item.harga || existing.hargaSatuanTerakhir;
    }
  });

  return Array.from(map.values()).map((v, idx) => {
    // Sesuai instruksi: di kolom "Satuan", diisi jumlah total volume + satuannya
    // Contoh: "13 Trek", "50 Sak", "1 Kbk", dll.
    const satuanDisplay = `${v.totalVolume.toLocaleString('id-ID')} ${v.namaSatuan}`;
    const harga =
      v.totalVolume > 0 ? Math.round(v.totalBiaya / v.totalVolume) : v.hargaSatuanTerakhir;

    return {
      id: `agg-${idx + 1}`,
      namaBarang: v.namaBarang,
      volume: v.totalVolume,
      namaSatuan: v.namaSatuan,
      satuanDisplay,
      harga,
      total: v.totalBiaya,
    };
  });
}
