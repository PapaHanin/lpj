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
  jenisBiaya?: string; // e.g. "Bahan", "Upah", "Alat", "Operasional"
  subItems?: SubItem[];
  keterangan?: string;
  createdAt?: string;
}

export type PosisiTarikTunaiBku = 'penerimaan' | 'pengeluaran' | 'kedua_sisi';

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
  namaKetuaP2S?: string;
  namaPelaksana?: string;
  tempatPelunasan: string;
  tampilkanTarikTunaiDiBku?: boolean;
  posisiTarikTunaiDiBku?: PosisiTarikTunaiBku;
}

export type ActiveTab =
  | 'dashboard'
  | 'bku'
  | 'bku-tunai'
  | 'bk-bank'
  | 'bku-pajak'
  | 'kwitansi'
  | 'daftar-barang'
  | 'input';

export type SubTabDaftarBarang = 'bahan' | 'tukang';

export type JenisPajak =
  | 'PPN'
  | 'PPh 22'
  | 'PPN + PPh 22'
  | 'PPh 21'
  | 'PPh 23'
  | 'PPh 4%'
  | 'PPh Pasal 4(2)'
  | 'Pajak Daerah';

export interface PajakRowItem {
  id: string;
  tanggal: string; // e.g. "01/08/2026"
  nomorBukti: string; // e.g. "BKU 01", "KW-001", "SP2D-001"
  uraian: string;
  penerimaan: number;
  pengeluaran: number;
  isTaxRow?: boolean;
  jenisPajak?: JenisPajak;
  linkedTxId?: string;
}

export interface CustomBahanItem {
  id: string;
  namaBarang: string;
  satuanDisplay: string; // Kolom "Satuan" diisi jumlah total + satuan e.g. "50 Sak"
  volume: number;
  namaSatuan: string;
  harga: number;
  total: number;
}

export type KategoriPekerja = 'Mandor' | 'Kepala Tukang' | 'Tukang' | 'Pekerja' | 'Knek' | 'TUKANG' | 'KNEK' | string;

export interface HariKerjaRecord {
  // Minggu I (Hari 1 s.d 7)
  m1_1?: number; // Hari I
  m1_2?: number; // Hari II
  m1_3?: number; // Hari III
  m1_4?: number; // Hari IV
  m1_5?: number; // Hari V
  m1_6?: number; // Hari VI
  m1_7?: number; // Hari VII

  // Minggu II (Hari 8 s.d 14)
  m2_1?: number; // Hari I
  m2_2?: number; // Hari II
  m2_3?: number; // Hari III
  m2_4?: number; // Hari IV
  m2_5?: number; // Hari V
  m2_6?: number; // Hari VI
  m2_7?: number; // Hari VII

  // Legacy single-week keys for backward-compatibility
  minggu?: number;
  senin?: number;
  selasa?: number;
  rabu?: number;
  kamis?: number;
  jumat?: number;
  sabtu?: number;
}

export interface PekerjaTukang {
  id: string;
  kategori: KategoriPekerja;
  tenagaKerja?: string; // e.g. "Mandor", "Kepala Tukang", "Tukang", "Pekerja"
  kodeMtp?: 'M' | 'T' | 'P'; // M = Mandor, T = Tukang, P = Pekerja
  tempatTinggal?: 'dalam_desa' | 'luar_desa'; // Tempat tinggal: Dalam Desa / Luar Desa
  nama: string;
  hariKerja: HariKerjaRecord;
  upahHarian: number;
  paraf?: string;
}

export interface BangunanProyek {
  id: string;
  nama: string;         // e.g. "Pembangunan Laboratorium Komputer dan UKS"
  kode?: string;        // e.g. "BG-01"
  lokasi?: string;      // ALAMAT
  keterangan?: string;  // Keterangan / jenis pekerjaan bangunan
  createdAt?: string;
}

export interface AbsenMingguanTukang {
  id: string;
  bangunanId?: string;  // ID Bangunan yang dikerjakan
  proyek: string;       // PEKERJAAN
  namaSekolah?: string; // NAMA SEKOLAH
  lokasi: string;       // ALAMAT
  periodeKe?: number;   // PERIODE (2 MINGGU) KE (1, 2, 3...)
  mingguKe: number;     // MINGGU KE (atau nomor periode 2-mingguan)
  hariTanggal: string;  // PERTANGGAL (e.g. "19/08/2026 s.d 26/08/2026")
  pekerja: PekerjaTukang[];
  hariLibur?: string[];
  namaKepalaSekolah?: string;
  nipKepalaSekolah?: string;
  namaBendahara?: string;
  nipBendahara?: string;
  namaKetuaP2S?: string;
  namaPelaksana?: string;
}


