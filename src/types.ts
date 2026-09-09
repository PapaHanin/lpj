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

export type ActiveTab = 'dashboard' | 'bku' | 'bku-tunai' | 'bk-bank' | 'kwitansi' | 'input';
