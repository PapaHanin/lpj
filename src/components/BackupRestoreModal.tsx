import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  FolderDown,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import {
  createBackupPayload,
  downloadBackupJson,
  validateBackupPayload,
  getStorageEstimatedSize,
  BackupDataPayload,
} from '../utils/backupStorage';
import { exportLpjToExcel } from '../utils/excelExport';
import { formatRupiahBulat } from '../utils/terbilang';
import { calculateSummary } from '../utils/calculations';

export const BackupRestoreModal: React.FC = () => {
  const {
    isBackupModalOpen,
    closeBackupModal,
    profile,
    transactions,
    bangunanList,
    absenTukangList,
    customBahanList,
    restoreBackupData,
    showToast,
  } = useLpjStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'guide'>('backup');
  const [dragActive, setDragActive] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<BackupDataPayload | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isBackupModalOpen) return null;

  const storageInfo = getStorageEstimatedSize();
  const summary = calculateSummary(transactions);

  const handleDownloadBackup = () => {
    try {
      const payload = createBackupPayload({
        profile,
        transactions,
        bangunanList,
        absenTukangList,
        customBahanList,
      });
      const filename = downloadBackupJson(payload);
      showToast({
        type: 'success',
        title: 'Cadangan Berhasil Diunduh!',
        message: `Berkas "${filename}" telah disimpan di folder Download Anda. Simpan berkas ini dengan aman sebelum membersihkan cache.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Gagal Membuat Cadangan',
        message: err.message || 'Terjadi kesalahan saat memproses data.',
      });
    }
  };

  const handleFileSelected = (file: File) => {
    setUploadError(null);
    setPreviewPayload(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateBackupPayload(parsed);

        if (!result.valid || !result.payload) {
          setUploadError(result.error || 'Format berkas tidak sesuai.');
          setIsProcessing(false);
          return;
        }

        setPreviewPayload(result.payload);
        setIsProcessing(false);
      } catch (err: any) {
        setUploadError('Gagal membaca berkas JSON: ' + (err.message || 'Format tidak valid.'));
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setUploadError('Gagal membaca berkas dari perangkat.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmRestore = () => {
    if (!previewPayload) return;

    const confirmed = window.confirm(
      `Peringatan: Pemulihan data akan mengganti data saat ini dengan data dari cadangan "${previewPayload.metadata.namaSekolah}" (${previewPayload.metadata.totalTransactions} transaksi). Lanjutkan?`
    );

    if (!confirmed) return;

    const success = restoreBackupData(previewPayload);
    if (success) {
      showToast({
        type: 'success',
        title: 'Data Berhasil Dipulihkan!',
        message: `Seluruh transaksi dan profil "${previewPayload.metadata.namaSekolah}" telah dipulihkan 100%.`,
      });
      closeBackupModal();
    } else {
      showToast({
        type: 'error',
        title: 'Gagal Memulihkan Data',
        message: 'Format data tidak dapat diterapkan.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-amber-400 text-slate-900 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r from-[#1c052b] via-[#2a073f] to-[#1c052b] text-white border-b-2 border-amber-400 sticky top-0 z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  Penyimpanan & Cadangan Data
                </h2>
                <span className="bg-amber-400 text-purple-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Backup & Restore
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Amankan data pembukuan Anda sebelum membersihkan cache browser
              </p>
            </div>
          </div>
          <button
            onClick={closeBackupModal}
            className="p-2 text-purple-200 hover:text-white hover:bg-purple-900/60 rounded-xl transition cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'backup'
                ? 'border-amber-500 text-purple-950 border-b-amber-500'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>1. Cadangkan (.json)</span>
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'restore'
                ? 'border-amber-500 text-purple-950 border-b-amber-500'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>2. Pulihkan / Restore</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'guide'
                ? 'border-amber-500 text-purple-950 border-b-amber-500'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>3. Panduan Clear Cache</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Status Bar */}
          <div className="bg-gradient-to-r from-purple-50 via-amber-50/50 to-emerald-50 rounded-2xl p-4 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-900 text-amber-300 flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-950">
                  Status Penyimpanan Browser
                </p>
                <p className="text-xs text-slate-700 font-semibold">
                  {profile.namaSekolah} • {transactions.length} Transaksi • Ukuran ~{storageInfo.estimatedKb}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Tersimpan Otomatis (Lokal)
              </span>
            </div>
          </div>

          {/* TAB 1: CADANGKAN (BACKUP) */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              <div className="bg-amber-50/60 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-800 space-y-1">
                  <p className="font-bold text-amber-950">
                    Kenapa Harus Mengunduh Cadangan Sebelum Clear Cache?
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    Aplikasi ini menyimpan data secara lokal di browser Anda untuk kecepatan & privasi.
                    Jika Anda memilih <strong>"Hapus Cookie dan Data Situs"</strong> saat clear cache di browser,
                    penyimpanan lokal akan ikut terhapus. Dengan mengunduh berkas cadangan ini, data Anda <strong>100% aman</strong> dan bisa dipulihkan kapan pun!
                  </p>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download JSON Backup Card */}
                <div className="bg-white border-2 border-emerald-500/40 rounded-2xl p-5 hover:border-emerald-500 transition shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <Download className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        Rekomendasi Utama
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Cadangkan Data Sistem (.json)
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Menyimpan seluruh data: Profil sekolah, seluruh kuitansi & BKU ({transactions.length} transaksi), pembagian gedung, serta daftar absen tukang.
                    </p>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1 font-mono">
                      <div>• Sekolah: {profile.namaSekolah}</div>
                      <div>• Total BKU: {transactions.length} baris</div>
                      <div>• Total Dana: {formatRupiahBulat(summary.totalPenerimaan)}</div>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadBackup}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Cadangan (.json)</span>
                  </button>
                </div>

                {/* Export Excel Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-400 transition shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-amber-700" />
                      </div>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                        Arsip Laporan
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Ekspor Laporan Excel (.xlsx)
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Unduh 4 lembar kerja resmi: Dashboard, Buku Kas Umum (BKU), BKU Tunai, dan Buku Pembantu Bank lengkap dengan rumus otomatis.
                    </p>
                    <p className="text-[11px] text-slate-500 italic">
                      Cocok untuk dicetak, ditandatangani, dan diserahkan ke Dinas Pendidikan.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      exportLpjToExcel(profile, transactions);
                      showToast({
                        type: 'info',
                        title: 'Mengunduh Excel',
                        message: 'Berkas Excel LPJ sedang diproses dan diunduh.',
                      });
                    }}
                    className="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-amber-300 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span>Unduh Excel Lengkap (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Tips Penyimpanan Aman */}
              <div className="bg-purple-950 text-white rounded-2xl p-4 sm:p-5 border border-amber-400/40">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs sm:text-sm text-amber-300">
                      Tips Tempat Penyimpanan Berkas Cadangan:
                    </h4>
                    <ul className="text-xs text-purple-100/90 space-y-1.5 list-disc list-inside">
                      <li>
                        Simpan berkas <code>.json</code> yang baru diunduh ke <strong>Google Drive</strong> atau <strong>Flashdisk</strong>.
                      </li>
                      <li>
                        Beri nama tanggal atau periode, misal: <code>BACKUP_LPJ_AGUSTUS_2026.json</code>.
                      </li>
                      <li>
                        Kapan pun Anda berganti komputer, membuka di HP, atau setelah membersihkan cache, cukup klik tab <strong>"Pulihkan / Restore"</strong> dan pilih berkas tersebut.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PULIHKAN (RESTORE) */}
          {activeTab === 'restore' && (
            <div className="space-y-5">
              <div className="text-xs text-slate-600">
                Unggah berkas cadangan <code>.json</code> yang pernah Anda unduh sebelumnya untuk mengembalikan seluruh data transaksi, kop laporan, dan absensi tukang.
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? 'border-amber-500 bg-amber-50/70'
                    : 'border-slate-300 hover:border-amber-500 bg-slate-50/60 hover:bg-amber-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">
                    Klik untuk memilih berkas cadangan (.json)
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    atau seret & lepas (drag and drop) berkas ke area ini
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Gagal memuat berkas:</span> {uploadError}
                  </div>
                </div>
              )}

              {/* Preview Box */}
              {previewPayload && (
                <div className="bg-emerald-50/70 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-black text-sm text-emerald-950">
                        Berkas Cadangan Valid & Siap Dipulihkan
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      Versi {previewPayload.version}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 text-[10px] block">Sekolah:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {previewPayload.metadata.namaSekolah}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 text-[10px] block">Jumlah Transaksi:</span>
                      <span className="font-bold text-slate-900 block">
                        {previewPayload.metadata.totalTransactions} Transaksi
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 text-[10px] block">Tahun / Periode:</span>
                      <span className="font-bold text-slate-900 block truncate">
                        {previewPayload.metadata.bulanLaporan || previewPayload.metadata.tahunAnggaran || '-'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 text-[10px] block">Waktu Cadangan:</span>
                      <span className="font-bold text-slate-900 block truncate">
                        {previewPayload.exportedAt ? new Date(previewPayload.exportedAt).toLocaleDateString('id-ID') : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setPreviewPayload(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleConfirmRestore}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Terapkan & Pulihkan Data Sekarang</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PANDUAN CARA AMAN CLEAR CACHE */}
          {activeTab === 'guide' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-950 space-y-1">
                  <p className="font-bold">
                    Perbedaan Penting Antara "Cache Gambar" dan "Data Situs / Storage"
                  </p>
                  <p className="text-blue-900 leading-relaxed">
                    Browser memiliki 2 jenis data penyimpanan sementara:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                    <li>
                      <strong>1. Cache Gambar & File (Cached images and files):</strong> Berisi foto, ikon, dan berkas tampilan agar web memuat lebih cepat. <em>AMAN dihapus kapan pun tanpa menghilangkan data input Anda!</em>
                    </li>
                    <li>
                      <strong>2. Cookie dan Data Situs (Cookies & other site data):</strong> Berisi penyimpanan lokal (Local Storage) akun dan data ketikan Anda. <em>Jika ini dicentang, pembukuan lokal Anda akan terhapus.</em>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step-by-step clear cache */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Langkah Aman Membersihkan Cache di Google Chrome & Microsoft Edge:
                </h3>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-xs">
                    <span className="w-6 h-6 rounded-full bg-purple-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">Unduh Cadangan Terlebih Dahulu (Safety First)</p>
                      <p className="text-slate-600 mt-0.5">
                        Buka tab <strong>"1. Cadangkan (.json)"</strong> dan klik <strong>"Unduh Cadangan (.json)"</strong>. Berkas ini adalah jaminan 100% data Anda tidak akan hilang.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-xs">
                    <span className="w-6 h-6 rounded-full bg-purple-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">Buka Menu Hapus Data Penjelajahan</p>
                      <p className="text-slate-600 mt-0.5">
                        Tekan kombinasi tombol keyboard: <kbd className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[11px] font-mono">Ctrl</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[11px] font-mono">Shift</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[11px] font-mono">Delete</kbd> (atau buka Pengaturan Browser &rarr; Privasi & Keamanan &rarr; Hapus Data Penjelajahan).
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-amber-400/60 rounded-xl p-3 flex items-start gap-3 shadow-xs bg-amber-50/20">
                    <span className="w-6 h-6 rounded-full bg-purple-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </span>
                    <div className="space-y-1">
                      <p className="font-extrabold text-slate-900">Pilih Centang yang Tepat (SANGAT PENTING):</p>
                      <div className="space-y-1 mt-1 font-mono text-[11px]">
                        <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>✅ CENTANG: "Gambar dan file dalam cache" (Cached images & files)</span>
                        </div>
                        <div className="text-rose-600 font-bold flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>❌ JANGAN CENTANG: "Cookie dan data situs lainnya" (Cookies & other site data)</span>
                        </div>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1">
                        Dengan hanya mencentang Cache Gambar, browser Anda akan tetap bersih, loading kembali cepat, tetapi transaksi BKU tetap utuh!
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-xs">
                    <span className="w-6 h-6 rounded-full bg-purple-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      4
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">Klik "Hapus data / Clear data"</p>
                      <p className="text-slate-600 mt-0.5">
                        Setelah selesai, muat ulang (refresh) halaman aplikasi ini. Semua data pembukuan Anda tetap aman.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-b-3xl">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Format berkas cadangan kompatibel dengan semua versi Ah Beres.</span>
          </div>
          <button
            onClick={closeBackupModal}
            className="px-5 py-2 text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
