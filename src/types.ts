export interface SubItem {
  id: string;
  nama: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  subtotal: number;
}

export type TransactionMetode = 'TUNAI' | 'BANK' | 'TARIK_TUNAI';
export type TransactionJenis = 'PENERIMAAN' | 'PENGELUARAN';

export interface Transaction {
  id: string;
  tanggal: string; // e.g. "2026-08-16" or "16 Agustus 2026"
  uraian: string;
  nomorBukti: string; // e.g. "BKU 01", "201", etc.
  metode: TransactionMetode;
  jenis: TransactionJenis;
  penerimaan: number;
  pengeluaran: number;
  penerima?: string; // Nama pihak ketiga / penerima dana
  subItems?: SubItem[];
  keterangan?: string;
  createdAt?: string;
}

export interface ProjectProfile {
  namaSekolah: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  tahunAnggaran: string;
  bulanLaporan: string;
  tanggalTutupBuku: string;
  judulPekerjaan: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  namaBendahara: string;
  nipBendahara: string;
  namaPanitia: string;
  tempatPelunasan: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'bku'
  | 'bku-tunai'
  | 'bk-bank'
  | 'kwitansi'
  | 'daftar-barang'
  | 'input';

export type SubTabDaftarBarang = 'bahan' | 'tukang';

export interface CustomBahanItem {
  id: string;
  namaBarang: string;
  satuanDisplay: string; // Kolom "Satuan" diisi jumlah total + satuan e.g. "50 Sak"
  volume: number;
  namaSatuan: string;
  harga: number;
  total: number;
}

export type KategoriPekerja = 'TUKANG' | 'KNEK';

export interface HariKerjaRecord {
  minggu: number; // 1, 0.5, 0
  senin: number;
  selasa: number;
  rabu: number;
  kamis: number;
  jumat: number;
  sabtu: number;
}

export interface PekerjaTukang {
  id: string;
  kategori: KategoriPekerja;
  nama: string;
  hariKerja: HariKerjaRecord;
  upahHarian: number;
}

export interface AbsenMingguanTukang {
  id: string;
  proyek: string;
  lokasi: string;
  mingguKe: number;
  hariTanggal: string;
  pekerja: PekerjaTukang[];
}
