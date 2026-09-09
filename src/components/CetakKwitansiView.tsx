import React, { useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  CheckCircle,
  Receipt,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { formatRupiahBulat, terbilangRupiah } from '../utils/terbilang';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';

export const CetakKwitansiView: React.FC = () => {
  const {
    profile,
    transactions,
    selectedTransactionIdForKwitansi,
    setSelectedTransactionForKwitansi,
    updateTransaction,
    showToast,
  } = useLpjStore();

  // Filter transactions that have pengeluaran (receipts are issued for expenses)
  const expenseTransactions = transactions.filter((t) => t.pengeluaran > 0);

  const selectedTx =
    transactions.find((t) => t.id === selectedTransactionIdForKwitansi) ||
    expenseTransactions[0] ||
    transactions[0];

  const nominal = selectedTx ? selectedTx.pengeluaran : 0;
  const terbilangText = terbilangRupiah(nominal);

  // Editable local states for instantaneous customization
  const [customPenerima, setCustomPenerima] = useState<string>('');
  const [customTanggalLunas, setCustomTanggalLunas] = useState<string>('');

  const displayPenerima =
    customPenerima || selectedTx?.penerima || '...........................................';
  const displayTanggalLunas =
    customTanggalLunas || selectedTx?.tanggal || profile.tanggalTutupBuku;

  const handlePrint = () => {
    triggerPrint(`Kwitansi Pembayaran (${selectedTx?.nomorBukti || 'BKU'})`);
  };

  const handleSaveToTx = () => {
    if (!selectedTx) return;
    updateTransaction(selectedTx.id, {
      penerima: displayPenerima,
      tanggal: displayTanggalLunas,
    });
    showToast({
      type: 'success',
      title: 'Kwitansi Disimpan',
      message: `Penerima "${displayPenerima}" & tanggal lunas berhasil disimpan.`,
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Selector Ribbon - Screen Only (Purple + Yellow) */}
      <div className="bg-[#220738] p-4 sm:p-5 rounded-2xl border border-amber-400/30 text-white shadow-lg space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Pilih Transaksi untuk Cetak Kwitansi Resmi
              </h2>
            </div>
            <p className="text-xs text-purple-200/90 mt-0.5">
              Format lembar tanda terima sesuai standar DAK fisik dengan konversi terbilang otomatis tanpa error #NAME?.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportLpjToExcel(profile, transactions, selectedTx)}
              className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Export Sheet Kwitansi</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 text-xs font-black px-4 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kwitansi (PDF / Print)</span>
            </button>
          </div>
        </div>

        {/* Dropdown & Quick Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-purple-800/80">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-amber-300 mb-1">
              Pilih dari Daftar Bukti BKU:
            </label>
            <select
              value={selectedTx?.id || ''}
              onChange={(e) => {
                setSelectedTransactionForKwitansi(e.target.value);
                setCustomPenerima('');
                setCustomTanggalLunas('');
              }}
              className="w-full text-xs sm:text-sm font-bold border-2 border-amber-400 rounded-xl p-2.5 bg-white text-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
            >
              {expenseTransactions.map((tx) => (
                <option key={tx.id} value={tx.id} className="text-slate-950 font-bold">
                  {tx.nomorBukti ? `[${tx.nomorBukti}]` : '[NON-BKU]'} {tx.tanggal} - {tx.uraian} ({formatRupiahBulat(tx.pengeluaran)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-300 mb-1">
              Sesuaikan Nama Penerima:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPenerima}
                placeholder={selectedTx?.penerima || 'Nama penerima / pihak ketiga'}
                onChange={(e) => setCustomPenerima(e.target.value)}
                className="w-full text-xs font-bold border-2 border-amber-400 rounded-xl px-3 py-2 bg-white text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              {customPenerima && (
                <button
                  onClick={handleSaveToTx}
                  className="shrink-0 bg-amber-400 text-purple-950 hover:bg-amber-300 text-xs px-3 py-1.5 rounded-xl font-bold transition"
                  title="Simpan ke data pembukuan"
                >
                  Simpan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kwitansi Sheet (Matches Screenshot 5) */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-slate-300 p-8 sm:p-12 print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none text-black font-sans sheet-paper">
        {/* Header Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase underline underline-offset-8 decoration-2 text-black">
            KWITANSI
          </h1>
        </div>

        {/* Data Rows */}
        <div className="space-y-4 text-xs sm:text-sm md:text-base leading-relaxed text-black">
          {/* Nomor BKU */}
          <div className="flex items-start text-black">
            <span className="w-48 sm:w-56 font-bold shrink-0 text-black">Nomor BKU</span>
            <span className="shrink-0 mr-3 text-black">:</span>
            <span className="font-mono font-bold text-black">
              {selectedTx?.nomorBukti || 'BKU 01'}
            </span>
          </div>

          {/* Sudah Terima Dari */}
          <div className="flex items-start text-black">
            <span className="w-48 sm:w-56 font-bold shrink-0 text-black">Sudah Terima Dari</span>
            <span className="shrink-0 mr-3 text-black">:</span>
            <span className="font-bold uppercase text-black">
              Bendahara DAK {profile.namaSekolah}
            </span>
          </div>

          {/* Jumlah Uang Terbilang (Fixes the #NAME? error in Excel!) */}
          <div className="flex items-start py-1 text-black">
            <span className="w-48 sm:w-56 font-bold shrink-0 text-black">Jumlah Uang Terbilang</span>
            <span className="shrink-0 mr-3 text-black">:</span>
            <div className="bg-slate-50/80 print:bg-transparent border border-slate-300 print:border-none px-3 py-1.5 rounded-lg flex-1">
              <span className="font-bold italic text-black text-xs sm:text-sm">
                "{terbilangText}"
              </span>
            </div>
          </div>

          {/* Untuk Pembayaran */}
          <div className="flex items-start text-black">
            <span className="w-48 sm:w-56 font-bold shrink-0 text-black">Untuk Pembayaran</span>
            <span className="shrink-0 mr-3 text-black">:</span>
            <span className="font-semibold text-black flex-1">
              {selectedTx?.uraian || '-'}
            </span>
          </div>

          {/* Kotak Nominal Jumlah */}
          <div className="flex items-center pt-4 pb-2 text-black">
            <span className="w-48 sm:w-56 font-bold text-lg sm:text-xl shrink-0 text-black">
              Jumlah
            </span>
            <span className="shrink-0 mr-3 text-lg font-bold text-black">:</span>
            <div className="border-2 border-slate-900 bg-slate-100/60 print:bg-transparent px-5 py-2.5 rounded-lg inline-block">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-black">
                Rp {nominal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Tanda Tangan 3 Pihak (Sesuai Screenshot 5) */}
        <div className="mt-12 sm:mt-16 pt-6 border-t-2 border-slate-900 text-xs sm:text-sm break-inside-avoid text-black">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Pihak 1: Setuju Bayar (Kepala Sekolah) */}
            <div className="space-y-1">
              <p className="font-bold text-black">Setuju Bayar :</p>
              <p className="font-black uppercase tracking-wide mb-20 text-black">
                Kepala Sekolah
              </p>
              <div className="pt-16">
                <p className="font-bold underline uppercase text-black leading-tight">
                  {profile.namaKepalaSekolah}
                </p>
                <p className="font-mono text-[11px] sm:text-xs text-black font-semibold">
                  NIP. {profile.nipKepalaSekolah}
                </p>
              </div>
            </div>

            {/* Pihak 2: Lunas Bayar (Bendahara) */}
            <div className="space-y-1">
              <p className="font-bold text-black">
                Lunas Bayar : <span className="italic font-normal">Lunas</span>
              </p>
              <p className="font-black uppercase tracking-wide mb-20 text-black">
                Bendahara
              </p>
              <div className="pt-16">
                <p className="font-bold underline uppercase text-black leading-tight">
                  {profile.namaBendahara}
                </p>
                <p className="font-mono text-[11px] sm:text-xs text-black font-semibold">
                  NIP. {profile.nipBendahara}
                </p>
              </div>
            </div>

            {/* Pihak 3: Yang Menerima */}
            <div className="space-y-1">
              <p className="font-bold text-black">
                {profile.tempatPelunasan}, {displayTanggalLunas}
              </p>
              <p className="font-black uppercase tracking-wide mb-20 text-black">
                Yang Menerima
              </p>
              <div className="pt-16">
                <p className="font-bold underline text-black leading-tight">
                  {displayPenerima}
                </p>
                <p className="text-[11px] sm:text-xs text-black font-medium">
                  Tanda Tangan & Nama Terang
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
