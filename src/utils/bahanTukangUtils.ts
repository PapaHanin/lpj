import { Transaction, CustomBahanItem, AbsenMingguanTukang, HariKerjaRecord, PekerjaTukang } from '../types';

export const DEFAULT_ABSEN_MINGGU_2: AbsenMingguanTukang = {
  id: 'absen-minggu-2',
  proyek: 'Klinik Bersalin',
  lokasi: 'Tungturunan, Cianjur.',
  mingguKe: 2,
  hariTanggal: 'Sabtu, 16 Februari 2019',
  pekerja: [
    // Kelompok Tukang
    {
      id: 'tk-1',
      kategori: 'TUKANG',
      nama: 'Soden',
      hariKerja: { minggu: 1, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
      upahHarian: 125000,
    },
    {
      id: 'tk-2',
      kategori: 'TUKANG',
      nama: 'Kepet',
      hariKerja: { minggu: 1, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
      upahHarian: 110000,
    },
    {
      id: 'tk-3',
      kategori: 'TUKANG',
      nama: 'Daman',
      hariKerja: { minggu: 1, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
      upahHarian: 110000,
    },
    {
      id: 'tk-4',
      kategori: 'TUKANG',
      nama: 'Riki',
      hariKerja: { minggu: 1, senin: 1, selasa: 1, rabu: 1, kamis: 0.5, jumat: 1, sabtu: 1 },
      upahHarian: 110000,
    },
    {
      id: 'tk-5',
      kategori: 'TUKANG',
      nama: 'Pecut',
      hariKerja: { minggu: 0, senin: 0, selasa: 0, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
      upahHarian: 110000,
    },
    // Kelompok Knek
    {
      id: 'kn-1',
      kategori: 'KNEK',
      nama: 'Diki',
      hariKerja: { minggu: 0, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
      upahHarian: 80000,
    },
    {
      id: 'kn-2',
      kategori: 'KNEK',
      nama: 'Yusup',
      hariKerja: { minggu: 0, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 0, sabtu: 1 },
      upahHarian: 80000,
    },
    {
      id: 'kn-3',
      kategori: 'KNEK',
      nama: 'Ian',
      hariKerja: { minggu: 1, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
      upahHarian: 80000,
    },
    {
      id: 'kn-4',
      kategori: 'KNEK',
      nama: 'Dadang',
      hariKerja: { minggu: 0, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
      upahHarian: 80000,
    },
  ],
};

export const INITIAL_ABSEN_DATA: AbsenMingguanTukang[] = [DEFAULT_ABSEN_MINGGU_2];

/**
 * Menghitung total hari kerja (angka) dari record 7 hari
 */
export function calculateTotalHari(h: HariKerjaRecord): number {
  return (
    (h.minggu || 0) +
    (h.senin || 0) +
    (h.selasa || 0) +
    (h.rabu || 0) +
    (h.kamis || 0) +
    (h.jumat || 0) +
    (h.sabtu || 0)
  );
}

/**
 * Format tampilan angka hari kerja untuk tabel absen:
 * 1 -> "1"
 * 0.5 -> "½"
 * 0 -> "-"
 */
export function formatDayCell(val: number): string {
  if (val === 1) return '1';
  if (val === 0.5) return '½';
  return '-';
}

/**
 * Format total hari kerja:
 * 6.5 -> "6 ½"
 * 0.5 -> "½"
 * 7 -> "7"
 */
export function formatTotalHari(total: number): string {
  if (total === 0) return '-';
  if (total % 1 === 0.5) {
    const intPart = Math.floor(total);
    return intPart > 0 ? `${intPart} ½` : '½';
  }
  return total.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

/**
 * Menghitung upah jumlah per pekerja
 */
export function calculateUpahJumlah(pekerja: PekerjaTukang): number {
  const totalHari = calculateTotalHari(pekerja.hariKerja);
  return Math.round(totalHari * pekerja.upahHarian);
}

/**
 * Ekstraksi & Agregasi Daftar Bahan Otomatis dari Transaksi LPJ
 * Sesuai permintaan user: "tolong jumlah total saja yang diisi disatuannya itu, total yang sudah saya input"
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

  transactions.forEach((tx) => {
    // Abaikan penerimaan dan penarikan tunai
    if (tx.jenis !== 'PENGELUARAN' || tx.metode === 'TARIK_TUNAI') return;

    // Jika transaksi memiliki rincian sub-items barang/material
    if (tx.subItems && tx.subItems.length > 0) {
      tx.subItems.forEach((sub) => {
        rawItems.push({
          namaBarang: sub.nama.trim(),
          volume: Number(sub.volume) || 1,
          namaSatuan: sub.satuan.trim() || 'Unit',
          harga: sub.hargaSatuan || 0,
          total: sub.subtotal || sub.volume * sub.hargaSatuan || 0,
        });
      });
    } else if (
      // Jika belanja tanpa subItems tapi merupakan belanja material
      tx.pengeluaran > 0 &&
      !tx.uraian.toLowerCase().includes('panjar') &&
      !tx.uraian.toLowerCase().includes('fasilitator') &&
      !tx.uraian.toLowerCase().includes('perencana') &&
      !tx.uraian.toLowerCase().includes('pengawasan')
    ) {
      rawItems.push({
        namaBarang: tx.uraian.trim(),
        volume: 1,
        namaSatuan: 'Paket',
        harga: tx.pengeluaran,
        total: tx.pengeluaran,
      });
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

  // Agregasi barang berdasarkan nama barang yang sama
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
    const key = item.namaBarang.toLowerCase();
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
    // Contoh: "10 Ret", "50 Sak", "1 Kbk", dll.
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
