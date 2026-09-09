import React from 'react';
import {
  Wallet,
  TrendingUp,
  Landmark,
  Banknote,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  FileText,
  Printer,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { calculateSummary } from '../utils/calculations';
import { formatRupiah, formatRupiahBulat } from '../utils/terbilang';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';

export const DashboardView: React.FC = () => {
  const {
    profile,
    transactions,
    setActiveTab,
    openTransactionModal,
    setSelectedTransactionForKwitansi,
    openProfileModal,
  } = useLpjStore();

  const summary = calculateSummary(transactions);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner Project (Purple + Yellow Theme) */}
      <div className="bg-gradient-to-r from-[#2e094c] via-[#3b1260] to-[#1e0533] text-white rounded-2xl p-6 sm:p-8 shadow-xl border-2 border-amber-400/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-purple-950 text-xs font-extrabold px-3 py-1 rounded-full shadow-xs">
                DAK Fisik Bidang Pendidikan {profile.tahunAnggaran}
              </span>
              <span className="text-amber-300/70 text-xs">•</span>
              <span className="text-amber-200 text-xs flex items-center gap-1 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Bulan Laporan: {profile.bulanLaporan}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              {profile.namaSekolah}
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed line-clamp-2">
              {profile.judulPekerjaan}
            </p>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-purple-200/80 pt-1">
              <span>{profile.alamat}</span>
              <span>•</span>
              <span>Kec. {profile.kecamatan}</span>
              <span>•</span>
              <span>Kab. {profile.kabupaten}</span>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col items-center sm:items-end gap-2.5 shrink-0">
            <button
              onClick={() => openTransactionModal()}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-purple-950" />
              <span>Input Transaksi Baru</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportLpjToExcel(profile, transactions)}
                className="flex items-center space-x-2 bg-purple-900/80 hover:bg-purple-800 text-amber-300 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-amber-400/40 transition active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Download Excel</span>
              </button>
              <button
                onClick={() => triggerPrint('Ringkasan LPJ DAK Fisik')}
                className="flex items-center space-x-2 bg-purple-900/80 hover:bg-purple-800 text-purple-200 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-purple-700 hover:border-amber-400/50 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards (Purple + Yellow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dana Masuk */}
        <div className="bg-[#220738] rounded-2xl p-5 border border-amber-400/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Total Dana Diterima
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
              {formatRupiahBulat(summary.totalPenerimaan)}
            </div>
            <p className="text-xs text-purple-200 mt-1">Setoran Rekening Bank DAK</p>
          </div>
        </div>

        {/* Realisasi Belanja */}
        <div className="bg-[#220738] rounded-2xl p-5 border border-amber-400/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Realisasi Belanja
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-400/30">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-rose-300 tracking-tight font-mono">
              {formatRupiahBulat(summary.totalPengeluaran)}
            </div>
            <div className="flex items-center space-x-2 mt-1.5">
              <div className="w-full bg-purple-950 rounded-full h-2 overflow-hidden border border-purple-800">
                <div
                  className="bg-amber-400 h-2 rounded-full"
                  style={{ width: `${summary.persentaseRealisasi}%` }}
                />
              </div>
              <span className="text-xs font-black text-amber-300 whitespace-nowrap">
                {summary.persentaseRealisasi.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Saldo Rekening Bank */}
        <div className="bg-[#220738] rounded-2xl p-5 border border-amber-400/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Sisa Saldo Bank
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-sky-300 tracking-tight font-mono">
              {formatRupiahBulat(summary.saldoBank)}
            </div>
            <p className="text-xs text-purple-200 mt-1">Di Rekening Giro/Tabungan DAK</p>
          </div>
        </div>

        {/* Sisa Saldo Kas Tunai */}
        <div className="bg-[#220738] rounded-2xl p-5 border border-amber-400/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Sisa Kas Tunai
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight font-mono">
              {formatRupiahBulat(summary.saldoTunai)}
            </div>
            <p className="text-xs text-purple-200 mt-1">Pegang di Bendahara Sekolah</p>
          </div>
        </div>
      </div>

      {/* Saldo Kumulatif Box & Quick Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posisi Penutupan Kas */}
        <div className="bg-[#220738] rounded-2xl p-6 border-2 border-amber-400/30 shadow-lg text-white">
          <div className="flex items-center justify-between border-b border-purple-800 pb-3 mb-4">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              Posisi Penutupan Kas Terkini
            </h2>
            <span className="text-[11px] font-bold text-purple-950 bg-amber-400 px-2 py-0.5 rounded-md shadow-xs">
              Balance
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs sm:text-sm py-1.5 border-b border-purple-900/60">
              <span className="text-purple-200">Sisa Saldo Bank:</span>
              <span className="font-bold font-mono text-sky-300">
                {formatRupiah(summary.saldoBank)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm py-1.5 border-b border-purple-900/60">
              <span className="text-purple-200">Sisa Saldo Kas Tunai:</span>
              <span className="font-bold font-mono text-amber-300">
                {formatRupiah(summary.saldoTunai)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm py-2.5 bg-amber-400 text-purple-950 px-3.5 rounded-xl font-black shadow-md">
              <span className="font-bold">Total Saldo Kumulatif:</span>
              <span className="font-black font-mono text-base">
                {formatRupiah(summary.saldoKumulatif)}
              </span>
            </div>
          </div>

          {/* Pejabat Penandatangan Mini Card */}
          <div className="mt-5 pt-4 border-t border-purple-800/80 text-xs space-y-2">
            <div className="flex justify-between text-purple-200">
              <span>Kepala Sekolah:</span>
              <span className="font-bold text-white text-right">
                {profile.namaKepalaSekolah}
              </span>
            </div>
            <div className="flex justify-between text-purple-200">
              <span>Bendahara DAK:</span>
              <span className="font-bold text-white text-right">
                {profile.namaBendahara}
              </span>
            </div>
            <button
              onClick={openProfileModal}
              className="mt-3 w-full py-2 text-center text-xs font-bold text-amber-300 hover:text-purple-950 hover:bg-amber-400 rounded-xl border border-amber-400/40 transition active:scale-95 cursor-pointer"
            >
              Ubah Data Pejabat / Kop Proyek
            </button>
          </div>
        </div>

        {/* Quick Nav Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setActiveTab('bku')}
            className="group bg-[#220738] p-5 rounded-2xl border border-amber-400/25 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-400/10 transition-all cursor-pointer flex flex-col justify-between text-white"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-purple-950 transition border border-amber-400/30">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition">Buku Kas Umum (BKU)</h3>
              <p className="text-xs text-purple-200/90 mt-1">
                Laporan gabungan penerimaan DAK & realisasi pengeluaran fisik secara kronologis lengkap dengan saldo berjalan.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition">
              <span>Buka BKU Lengkap</span>
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('bku-tunai')}
            className="group bg-[#220738] p-5 rounded-2xl border border-amber-400/25 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-400/10 transition-all cursor-pointer flex flex-col justify-between text-white"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-purple-950 transition border border-amber-400/30">
                <Banknote className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition">BKU Pembantu Tunai</h3>
              <p className="text-xs text-purple-200/90 mt-1">
                Buku kas khusus transaksi fisik tunai lengkap dengan rincian sub-nota material (Pasir, Semen, Kayu, Upah).
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition">
              <span>Buka BKU Tunai</span>
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('bk-bank')}
            className="group bg-[#220738] p-5 rounded-2xl border border-amber-400/25 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-400/10 transition-all cursor-pointer flex flex-col justify-between text-white"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-purple-950 transition border border-sky-400/30">
                <Landmark className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition">Buku Kas Bank</h3>
              <p className="text-xs text-purple-200/90 mt-1">
                Laporan mutasi rekening bank (Setoran DAK, penarikan dana bertahap ke kas tunai, dan saldo bank).
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition">
              <span>Buka BK Bank</span>
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('kwitansi')}
            className="group bg-[#220738] p-5 rounded-2xl border border-amber-400/25 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-400/10 transition-all cursor-pointer flex flex-col justify-between text-white"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-purple-950 transition border border-amber-400/30">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition">Cetak Kwitansi Otomatis</h3>
              <p className="text-xs text-purple-200/90 mt-1">
                Pilih nomor BKU dan cetak lembar kwitansi resmi tanda tangan 3 pihak dengan terbilang rupiah otomatis tanpa error.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition">
              <span>Pilih & Cetak Kwitansi</span>
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Preview */}
      <div className="bg-[#220738] rounded-2xl border border-amber-400/30 shadow-xl overflow-hidden text-white">
        <div className="p-4 sm:p-5 border-b border-purple-800/80 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Transaksi Terakhir
            </h2>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Total {transactions.length} baris pembukuan tercatat
            </p>
          </div>
          <button
            onClick={() => setActiveTab('bku')}
            className="text-xs font-bold text-amber-300 hover:text-purple-950 hover:bg-amber-400 bg-purple-900/80 border border-amber-400/30 px-3 py-1.5 rounded-lg transition"
          >
            Lihat Semua di BKU →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-purple-950/80 text-amber-300 border-b border-purple-800 uppercase text-[11px] font-bold">
              <tr>
                <th className="py-2.5 px-4">No. Bukti</th>
                <th className="py-2.5 px-4">Tanggal</th>
                <th className="py-2.5 px-4">Uraian Transaksi</th>
                <th className="py-2.5 px-4 text-right">Pengeluaran</th>
                <th className="py-2.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/60">
              {transactions.slice(-6).reverse().map((tx) => (
                <tr key={tx.id} className="hover:bg-purple-900/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-300">
                    {tx.nomorBukti || '-'}
                  </td>
                  <td className="py-3 px-4 text-purple-200 whitespace-nowrap">
                    {tx.tanggal}
                  </td>
                  <td className="py-3 px-4 text-white font-medium">
                    <div>{tx.uraian}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-300">
                    {tx.pengeluaran > 0 ? formatRupiah(tx.pengeluaran) : '-'}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {tx.pengeluaran > 0 && (
                      <button
                        onClick={() => {
                          setSelectedTransactionForKwitansi(tx.id);
                          setActiveTab('kwitansi');
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-purple-950 bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-md transition active:scale-95"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Kwitansi</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
