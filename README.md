# Ah Beres - Sistem LPJ Keuangan Proyek Revitalisasi & DAK Fisik Sekolah

Aplikasi Pembuat Laporan Pertanggungjawaban (LPJ) Keuangan Proyek Swakelola Pembangunan dan Rehabilitasi Ruang Sekolah sesuai petunjuk teknis (Bimtek) Keuangan & Perpajakan Ditjen PAUD, Dikdas, dan Dikmen Kemendikbudristek 2026.

---

## 🌟 Fitur Utama

1. **Buku Kas Umum (BKU) Terpadu 7 Kolom**:
   - Format standar: *No | Tanggal | Uraian | No. Bukti | Penerimaan (Rp) | Pengeluaran (Rp) | Saldo*.
   - Mengintegrasikan seluruh transaksi kas tunai, transaksi rekening bank, dan kas pajak secara kronologis.
   - Penutupan kas bulanan (Tutup Buku) dengan rekonsiliasi kas opname otomatis (Saldo BKU = Saldo Bank + Saldo Tunai + Sisa Pajak, Selisih Rp 0 / Nihil).
   - Format 3 tanda tangan: Kepala Sekolah, Ketua P2S (Panitia Pembangunan Sekolah), dan Bendahara.

2. **Buku Pembantu Lengkap**:
   - **Buku Pembantu Kas Tunai**: Pencatatan uang tunai brankas sekolah, penarikan bank, belanja material toko, upah tukang, dan operasional.
   - **Buku Pembantu Bank**: Pencatatan mutasi rekening giro/tabungan sekolah, penerimaan SP2D bantuan tahap I & II, penarikan tunai, dan transfer bank ke rekanan.
   - **Buku Pembantu Pajak**:
     - Otomatisasi pemotongan dan penyetoran pajak sesuai aturan Bimtek 2026.
     - DPP Nilai Lain ($100/111 \times \text{Nilai Belanja}$), PPN 11%, PPh Pasal 22 (1,5%), PPh Pasal 4 ayat 2 (4%), PPh Pasal 21 (2,5%).
     - **Bebas Pajak**: Belanja pasir, batu kali, dan upah tukang harian $\le$ Rp 450.000/hari otomatis dibebaskan dari potongan pajak.
     - Bukti setor resmi dengan nomor NTPN / BPN.
     - Tampilan bersih (*clean*) jika tidak terdapat transaksi pajak pada bulan berjalan.

3. **Manajemen Transaksi & Nota**:
   - Input transaksi belanja lengkap dengan sub-item rincian nota belanja (kuantitas, satuan, harga satuan).
   - Fitur pencarian cepat (*real-time search*) di setiap buku kas.
   - Penomoran otomatis No. Bukti BKU, Kwitansi (KW), Buku Bank (BB), dan Bank Persepsi Negara (BPN).
   - Tukar dan geser urutan transaksi dengan mudah.

4. **Kwitansi & Berita Acara**:
   - Pembuatan dan cetak kwitansi pembayaran resmi per transaksi pengeluaran.
   - Generator Berita Acara Serah Terima Barang / Belanja Material.

5. **Ekspor & Cetak**:
   - Cetak langsung siap cetak ke format PDF / Kertas (A4 / Folio / F4) dengan CSS print styling rapi.
   - Ekspor Excel (`.xlsx`) multi-sheet resmi (BKU Umum, Buku Bank, Kas Tunai, BKU Pajak, Rekapitulasi).

---

## 🚀 Persyaratan Sistem

- **Node.js**: versi 18.x atau 20.x atau lebih baru
- **NPM**: versi 9.x atau lebih baru

---

## 💻 Panduan Menjalankan Secara Lokal

1. **Clone repositori**:
   ```bash
   git clone https://github.com/USERNAME/REPO_NAME.git
   cd REPO_NAME
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan development server**:
   ```bash
   npm run dev
   ```
   Buka browser di `http://localhost:3000`.

4. **Build untuk production**:
   ```bash
   npm run build
   ```

5. **Jalankan hasil build**:
   ```bash
   npm start
   ```

---

## 🌐 Cara Hosting ke GitHub & Deployment

### Langkah 1: Push ke Repositori GitHub Anda

1. Buat repositori baru di [GitHub](https://github.com/new), misalnya beri nama `lpj-ah-beres`.
2. Di komputer Anda (terminal folder proyek):
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi aplikasi LPJ Ah Beres Bimtek 2026"
   git branch -M main
   git remote add origin https://github.com/USERNAME/lpj-ah-beres.git
   git push -u origin main
   ```
   *(Ganti `USERNAME` dengan username GitHub Anda).*

---

### Langkah 2: Pilihan Hosting Gratis

#### Opsi 1: Vercel (Sangat Direkomendasikan - 1 Klik Deploy)
1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik **"Add New..."** -> **"Project"**.
3. Pilih repositori `lpj-ah-beres` yang baru saja Anda push.
4. Framework Preset akan otomatis terdeteksi sebagai **Vite**.
5. Klik **"Deploy"**. Aplikasi Anda langsung online dalam 1 menit dengan URL gratis `https://lpj-ah-beres.vercel.app`!

#### Opsi 2: Netlify
1. Buka [netlify.com](https://www.netlify.com) dan hubungkan dengan GitHub.
2. Pilih repositori `lpj-ah-beres`.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Klik **"Deploy site"**.

#### Opsi 3: Render / Railway / Cloud Run (Full-Stack Support)
Jika ingin menjalankan backend Node.js (`server.ts`):
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- Port otomatis dideteksi dari `process.env.PORT` atau default `3000`.

---

## 📂 Struktur Proyek

```
├── public/                 # Aset statis & logo
├── src/
│   ├── components/         # Komponen UI utama
│   │   ├── BkuGeneralView.tsx     # Tampilan 7 kolom BKU Umum
│   │   ├── BkuTunaiView.tsx       # Buku Kas Tunai
│   │   ├── BkBankView.tsx         # Buku Bank
│   │   ├── BkuPajakView.tsx       # Buku Pajak Bimtek 2026
│   │   ├── KwitansiView.tsx       # Cetak Kwitansi
│   │   ├── TransactionModal.tsx   # Modal Input Transaksi
│   │   └── ProfileModal.tsx       # Pengaturan Sekolah & Panitia
│   ├── store/              # State Management (Zustand + LocalStorage persist)
│   ├── utils/              # Logika perhitungan, tanggal, ekspor Excel, pajak Bimtek
│   ├── types.ts            # Definisi tipe data TypeScript
│   ├── App.tsx             # Root Component & Navigasi Tab
│   └── main.tsx            # Entry Point React
├── server.ts               # Express Server & Proxy Production
├── package.json            # Konfigurasi dependensi & scripts
└── vite.config.ts          # Konfigurasi build Vite & Tailwind CSS
```

---

## 🔒 Privasi & Keamanan Data

Aplikasi ini menggunakan penyimpanan **Browser LocalStorage** (`lpj-storage-dak-fisik-v1`) secara otomatis dan aman di browser pengguna. Data keuangan sekolah Anda tersimpan secara lokal di perangkat Anda tanpa risiko bocor ke server luar, dan Anda dapat mengekspornya kapan saja ke format Excel (`.xlsx`) sebagai arsip cadangan.

---

## 📄 Lisensi

MIT License - Bebas digunakan dan dikembangkan untuk keperluan pelaporan keuangan sekolah dan panitia pembangunan.
