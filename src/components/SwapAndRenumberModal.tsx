import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowLeftRight,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
  Hash,
  Calendar,
  Check,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { formatRupiah } from '../utils/terbilang';
import { sortTransactionsChronologically } from '../utils/calculations';
import { extractMonthAndYear, BULAN_LIST } from '../utils/dateUtils';

export const SwapAndRenumberModal: React.FC = () => {
  const {
    isSwapRenumberModalOpen,
    closeSwapRenumberModal,
    swapRenumberInitialTxIds,
    transactions,
    swapTransactionNomorBukti,
    renumberBku,
    showToast,
  } = useLpjStore();

  const [activeTab, setActiveTab] = useState<'swap' | 'renumber'>('swap');

  // Swap tab state
  const [selectedTxAId, setSelectedTxAId] = useState<string>('');
  const [selectedTxBId, setSelectedTxBId] = useState<string>('');
  const [swapDates, setSwapDates] = useState<boolean>(true);

  // Renumber tab state
  const [prefix, setPrefix] = useState<string>('BKU ');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [padDigits, setPadDigits] = useState<number>(2);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL');
  const [onlyExpenses, setOnlyExpenses] = useState<boolean>(true);

  // Initialize selected IDs when modal opens
  useEffect(() => {
    if (isSwapRenumberModalOpen) {
      if (swapRenumberInitialTxIds && swapRenumberInitialTxIds.length > 0) {
        setSelectedTxAId(swapRenumberInitialTxIds[0] || '');
        setSelectedTxBId(swapRenumberInitialTxIds[1] || '');
        setActiveTab('swap');
      } else {
        // Default to first two expense transactions if available
        const expenses = transactions.filter((t) => t.pengeluaran > 0);
        if (expenses.length >= 2) {
          setSelectedTxAId(expenses[0].id);
          setSelectedTxBId(expenses[1].id);
        }
      }
    }
  }, [isSwapRenumberModalOpen, swapRenumberInitialTxIds, transactions]);

  // Chronologically sorted list of transactions
  const sortedTransactions = useMemo(
    () => sortTransactionsChronologically(transactions),
    [transactions]
  );

  // Available months for filtering
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    sortedTransactions.forEach((t) => {
      const my = extractMonthAndYear(t.tanggal);
      const mName = my?.month || 'Agustus';
      const yr = my?.year || 2026;
      const mIdx = BULAN_LIST.findIndex((m) => m.toLowerCase() === mName.toLowerCase());
      const padM = String(mIdx >= 0 ? mIdx + 1 : 8).padStart(2, '0');
      const key = `${yr}-${padM}`;
      map.set(key, `${mName} ${yr}`);
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [sortedTransactions]);

  const txA = transactions.find((t) => t.id === selectedTxAId);
  const txB = transactions.find((t) => t.id === selectedTxBId);

  // Live preview for auto-renumber
  const renumberPreview = useMemo(() => {
    let counter = startNumber;
    const previewList: {
      id: string;
      tanggal: string;
      uraian: string;
      nomorLama: string;
      nomorBaru: string;
      willChange: boolean;
    }[] = [];

    sortedTransactions.forEach((tx) => {
      if (selectedMonthKey !== 'ALL') {
        const my = extractMonthAndYear(tx.tanggal);
        const mName = my?.month || 'Agustus';
        const yr = my?.year || 2026;
        const mIdx = BULAN_LIST.findIndex((m) => m.toLowerCase() === mName.toLowerCase());
        const padM = String(mIdx >= 0 ? mIdx + 1 : 8).padStart(2, '0');
        const key = `${yr}-${padM}`;
        if (key !== selectedMonthKey) return;
      }

      const isExpense = tx.pengeluaran > 0 && tx.metode !== 'TARIK_TUNAI';
      const hasExistingNo = Boolean(tx.nomorBukti && tx.nomorBukti.trim().length > 0);

      if ((onlyExpenses && isExpense) || (!onlyExpenses && hasExistingNo)) {
        const numStr = String(counter).padStart(padDigits, '0');
        const newNo = `${prefix}${numStr}`;
        previewList.push({
          id: tx.id,
          tanggal: tx.tanggal,
          uraian: tx.uraian,
          nomorLama: tx.nomorBukti || '(Kosong)',
          nomorBaru: newNo,
          willChange: (tx.nomorBukti || '') !== newNo,
        });
        counter++;
      }
    });

    return previewList;
  }, [sortedTransactions, selectedMonthKey, onlyExpenses, startNumber, padDigits, prefix]);

  const handleExecuteSwap = () => {
    if (!selectedTxAId || !selectedTxBId) {
      alert('Pilih dua transaksi yang ingin ditukar nomor BKU-nya.');
      return;
    }
    if (selectedTxAId === selectedTxBId) {
      alert('Pilih dua transaksi yang berbeda.');
      return;
    }

    const noA = txA?.nomorBukti || 'Tanpa No';
    const noB = txB?.nomorBukti || 'Tanpa No';

    swapTransactionNomorBukti(selectedTxAId, selectedTxBId, {
      swapDates,
      swapPositions: true,
    });

    showToast({
      type: 'success',
      title: 'Nomor BKU Berhasil Ditukar',
      message: `Nomor BKU berhasil ditukar antara "${txA?.uraian.slice(0, 25)}..." (${noA} ⇄ ${noB}).`,
    });

    closeSwapRenumberModal();
  };

  const handleExecuteRenumber = () => {
    if (renumberPreview.length === 0) {
      alert('Tidak ada transaksi yang cocok untuk penomoran ulang.');
      return;
    }

    const confirmMsg = `Urutkan ulang nomor BKU untuk ${renumberPreview.length} transaksi? Penomoran akan dimulai dari "${prefix}${String(startNumber).padStart(padDigits, '0')}".`;
    if (!window.confirm(confirmMsg)) return;

    renumberBku({
      prefix,
      startNumber,
      padDigits,
      monthKey: selectedMonthKey,
      onlyExpenses,
    });

    showToast({
      type: 'success',
      title: 'Nomor BKU Berhasil Diurutkan Ulang',
      message: `Sebanyak ${renumberPreview.length} transaksi berhasil diberi nomor BKU urut otomatis.`,
    });

    closeSwapRenumberModal();
  };

  if (!isSwapRenumberModalOpen) return null;

  return (
    <div
      id="swap-renumber-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div
        id="swap-renumber-modal-card"
        className="bg-white rounded-2xl shadow-2xl border-2 border-purple-900/40 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-[#220738] p-4 sm:p-5 text-white flex items-center justify-between border-b border-amber-400/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shrink-0">
              <ArrowLeftRight className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Pengaturan & Urutan Nomor BKU</span>
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-purple-950 px-2 py-0.5 rounded-md">
                  Fleksibel
                </span>
              </h2>
              <p className="text-xs text-purple-200">
                Tukar nomor BKU antar transaksi atau urutkan ulang otomatis tanpa edit manual.
              </p>
            </div>
          </div>
          <button
            onClick={closeSwapRenumberModal}
            className="text-purple-200 hover:text-white p-1.5 hover:bg-purple-800/80 rounded-lg transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('swap')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'swap'
                ? 'border-purple-800 text-purple-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-purple-900'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-amber-600" />
            <span>Tukar Nomor BKU (Swap)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('renumber')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'renumber'
                ? 'border-purple-800 text-purple-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-purple-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-700" />
            <span>Urutkan Ulang Otomatis (Auto Renumber)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-slate-800 text-xs sm:text-sm">
          {activeTab === 'swap' ? (
            /* TAB 1: TUKAR NOMOR BKU */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-300/80 rounded-xl text-xs text-amber-950 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Pilih dua baris transaksi di bawah ini. Nomor BKU dan posisinya di tabel pembukuan akan saling bertukar secara instan.
                </span>
              </div>

              {/* Transaksi A */}
              <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 space-y-2">
                <label className="block text-xs font-bold text-purple-950 uppercase tracking-wide">
                  1. Transaksi Pertama
                </label>
                <select
                  value={selectedTxAId}
                  onChange={(e) => setSelectedTxAId(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-black focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                >
                  <option value="">-- Pilih Transaksi Pertama --</option>
                  {sortedTransactions.map((t) => (
                    <option key={`opt-a-${t.id}`} value={t.id}>
                      [{t.nomorBukti || 'Tanpa No'}] {t.tanggal} - {t.uraian.slice(0, 50)} ({formatRupiah(t.pengeluaran || t.penerimaan)})
                    </option>
                  ))}
                </select>
                {txA && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-purple-950 bg-purple-100 px-2 py-0.5 rounded mr-2">
                        {txA.nomorBukti || 'Tanpa No'}
                      </span>
                      <span className="text-slate-600">{txA.tanggal}</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{txA.uraian}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-700 shrink-0">
                      {formatRupiah(txA.pengeluaran || txA.penerimaan)}
                    </span>
                  </div>
                )}
              </div>

              {/* Swap Visual Indicator */}
              <div className="flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-900 border border-purple-300 flex items-center justify-center shadow-xs">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
              </div>

              {/* Transaksi B */}
              <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 space-y-2">
                <label className="block text-xs font-bold text-purple-950 uppercase tracking-wide">
                  2. Transaksi Kedua
                </label>
                <select
                  value={selectedTxBId}
                  onChange={(e) => setSelectedTxBId(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-black focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                >
                  <option value="">-- Pilih Transaksi Kedua --</option>
                  {sortedTransactions.map((t) => (
                    <option key={`opt-b-${t.id}`} value={t.id}>
                      [{t.nomorBukti || 'Tanpa No'}] {t.tanggal} - {t.uraian.slice(0, 50)} ({formatRupiah(t.pengeluaran || t.penerimaan)})
                    </option>
                  ))}
                </select>
                {txB && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-purple-950 bg-purple-100 px-2 py-0.5 rounded mr-2">
                        {txB.nomorBukti || 'Tanpa No'}
                      </span>
                      <span className="text-slate-600">{txB.tanggal}</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{txB.uraian}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-700 shrink-0">
                      {formatRupiah(txB.pengeluaran || txB.penerimaan)}
                    </span>
                  </div>
                )}
              </div>

              {/* Option: Swap Dates */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={swapDates}
                    onChange={(e) => setSwapDates(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-purple-900 border-slate-300 rounded focus:ring-purple-600"
                  />
                  <div>
                    <span className="font-bold text-xs text-purple-950">
                      Tukar juga tanggal transaksi jika berbeda
                    </span>
                    <p className="text-[11px] text-purple-800/80">
                      Direkomendasikan agar urutan tanggal tetap selaras dan sesuai audit pembukuan kronologis.
                    </p>
                  </div>
                </label>
              </div>

              {/* Preview Hasil Tukar */}
              {txA && txB && (
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 text-xs space-y-1">
                  <div className="font-bold text-slate-700 uppercase tracking-wide">
                    Pratinjau Hasil Penukaran:
                  </div>
                  <div className="text-slate-900">
                    • <b>{txA.uraian.slice(0, 30)}...</b> akan mendapatkan nomor:{' '}
                    <span className="font-mono font-bold text-purple-900 bg-purple-200/70 px-1.5 py-0.5 rounded">
                      {txB.nomorBukti || 'Tanpa No'}
                    </span>
                  </div>
                  <div className="text-slate-900">
                    • <b>{txB.uraian.slice(0, 30)}...</b> akan mendapatkan nomor:{' '}
                    <span className="font-mono font-bold text-purple-900 bg-purple-200/70 px-1.5 py-0.5 rounded">
                      {txA.nomorBukti || 'Tanpa No'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: URUTKAN ULANG NOMOR BKU OTOMATIS */
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-950 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <span>
                  Fitur ini menomori ulang seluruh bukti transaksi pengeluaran secara berurutan (misal: BKU 01, BKU 02, BKU 03...) sesuai urutan tabel saat ini. Anda tidak perlu mengedit satu per satu secara manual.
                </span>
              </div>

              {/* Configuration Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Awalan / Prefix
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="BKU "
                    className="w-full text-xs sm:text-sm font-mono border border-slate-300 rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-purple-600"
                  />
                  <span className="text-[10px] text-slate-500">Contoh: "BKU " atau "KWT "</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mulai dari Angka
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-xs sm:text-sm font-mono border border-slate-300 rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-purple-600"
                  />
                  <span className="text-[10px] text-slate-500">Standar dimulai dari 1</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Format Digit
                  </label>
                  <select
                    value={padDigits}
                    onChange={(e) => setPadDigits(parseInt(e.target.value, 10))}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-purple-600"
                  >
                    <option value={2}>2 Digit (01, 02, 03...)</option>
                    <option value={1}>1 Digit (1, 2, 3...)</option>
                    <option value={3}>3 Digit (001, 002, 003...)</option>
                  </select>
                </div>
              </div>

              {/* Filter Bulan & Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilihan Periode Bulan
                  </label>
                  <select
                    value={selectedMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="ALL">Semua Bulan ({sortedTransactions.length} transaksi)</option>
                    {availableMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                    <input
                      type="checkbox"
                      checked={onlyExpenses}
                      onChange={(e) => setOnlyExpenses(e.target.checked)}
                      className="w-4 h-4 text-purple-900 border-slate-300 rounded focus:ring-purple-600"
                    />
                    <span className="font-medium text-slate-800">
                      Hanya beri nomor pada Belanja/Pengeluaran
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-2.5 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Pratinjau Urutan ({renumberPreview.length} Transaksi)</span>
                  <span className="text-[11px] text-purple-900">
                    {renumberPreview.filter((p) => p.willChange).length} nomor akan diperbarui
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] sticky top-0">
                      <tr>
                        <th className="py-1.5 px-3">No</th>
                        <th className="py-1.5 px-3">Uraian Transaksi</th>
                        <th className="py-1.5 px-3 text-center">Nomor Lama</th>
                        <th className="py-1.5 px-3 text-center font-bold text-purple-950">
                          Nomor Baru
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {renumberPreview.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition ${
                            item.willChange ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-1.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-medium text-slate-800 truncate max-w-[200px]">
                            {item.uraian}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono text-slate-500">
                            {item.nomorLama}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono font-bold text-purple-900">
                            {item.nomorBaru}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeSwapRenumberModal}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Batal
          </button>

          {activeTab === 'swap' ? (
            <button
              type="button"
              onClick={handleExecuteSwap}
              disabled={!selectedTxAId || !selectedTxBId || selectedTxAId === selectedTxBId}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Tukar Nomor BKU Sekarang</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExecuteRenumber}
              disabled={renumberPreview.length === 0}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-900 to-purple-800 hover:from-purple-800 hover:to-purple-700 text-amber-300 text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 border border-amber-400/40"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Terapkan Penomoran Baru ({renumberPreview.length} Item)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
