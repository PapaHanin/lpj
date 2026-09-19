import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowLeftRight,
  Sparkles,
  Hash,
  Calendar,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  Search,
  Zap,
  Info,
  Layers,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { formatRupiah } from '../utils/terbilang';
import { sortTransactionsChronologically } from '../utils/calculations';
import { extractMonthAndYear, BULAN_LIST } from '../utils/dateUtils';
import {
  suggestBkuForDate,
  calculateBkuShiftPreview,
  parseBkuNumber,
  formatBkuNumber,
} from '../utils/bkuUtils';

export const SwapAndRenumberModal: React.FC = () => {
  const {
    isSwapRenumberModalOpen,
    closeSwapRenumberModal,
    swapRenumberInitialTxIds,
    swapRenumberDefaultTab,
    transactions,
    swapTransactionNomorBukti,
    insertAndShiftBku,
    renumberBku,
    harmonizeAllBkuDates,
    showToast,
  } = useLpjStore();

  const [activeTab, setActiveTab] = useState<'shift' | 'swap' | 'renumber'>('shift');

  // Chronologically sorted list of transactions
  const sortedTransactions = useMemo(
    () => sortTransactionsChronologically(transactions),
    [transactions]
  );

  // TAB 1 (Ganti & Sisip BKU) State
  const [selectedShiftTxId, setSelectedShiftTxId] = useState<string>('');
  const [newBkuInput, setNewBkuInput] = useState<string>('');
  const [shiftSubsequent, setShiftSubsequent] = useState<boolean>(true);
  const [sortChronologically, setSortChronologically] = useState<boolean>(true);
  const [autoHarmonizeDate, setAutoHarmonizeDate] = useState<boolean>(true);
  const [shiftSearchQuery, setShiftSearchQuery] = useState<string>('');
  const [suggestionNote, setSuggestionNote] = useState<string | null>(null);

  // TAB 2 (Swap) State
  const [selectedTxAId, setSelectedTxAId] = useState<string>('');
  const [selectedTxBId, setSelectedTxBId] = useState<string>('');
  const [swapDates, setSwapDates] = useState<boolean>(true);

  // TAB 3 (Renumber) State
  const [prefix, setPrefix] = useState<string>('BKU ');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [padDigits, setPadDigits] = useState<number>(2);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL');
  const [onlyExpenses, setOnlyExpenses] = useState<boolean>(true);

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

  // Handle initialization when modal opens
  useEffect(() => {
    if (isSwapRenumberModalOpen) {
      // Pick initial tab
      if (swapRenumberDefaultTab) {
        setActiveTab(swapRenumberDefaultTab);
      } else if (
        swapRenumberInitialTxIds &&
        swapRenumberInitialTxIds[0] &&
        swapRenumberInitialTxIds[1]
      ) {
        setActiveTab('swap');
      } else {
        setActiveTab('shift');
      }

      // Initialize Shift Tab
      const targetId = swapRenumberInitialTxIds?.[0];
      if (targetId) {
        setSelectedShiftTxId(targetId);
        const tx = transactions.find((t) => t.id === targetId);
        if (tx) {
          setNewBkuInput(tx.nomorBukti || '');
          // Auto calculate date suggestion for this transaction
          const sugg = suggestBkuForDate(transactions, tx.tanggal, tx.id);
          setSuggestionNote(sugg.explanation);
        }
      } else {
        // Default to first transaction without BKU or last expense
        const defaultTx =
          transactions.find((t) => !t.nomorBukti && t.pengeluaran > 0) ||
          sortedTransactions[0];
        if (defaultTx) {
          setSelectedShiftTxId(defaultTx.id);
          setNewBkuInput(defaultTx.nomorBukti || '');
        }
      }

      // Initialize Swap Tab
      if (swapRenumberInitialTxIds && swapRenumberInitialTxIds.length > 0) {
        setSelectedTxAId(swapRenumberInitialTxIds[0] || '');
        setSelectedTxBId(swapRenumberInitialTxIds[1] || '');
      } else {
        const expenses = transactions.filter((t) => t.pengeluaran > 0);
        if (expenses.length >= 2) {
          setSelectedTxAId(expenses[0].id);
          setSelectedTxBId(expenses[1].id);
        }
      }
    }
  }, [
    isSwapRenumberModalOpen,
    swapRenumberInitialTxIds,
    swapRenumberDefaultTab,
    transactions,
    sortedTransactions,
  ]);

  // Current selected transaction for Shift tab
  const shiftTargetTx = useMemo(
    () => transactions.find((t) => t.id === selectedShiftTxId),
    [transactions, selectedShiftTxId]
  );

  // When selectedShiftTxId changes manually in dropdown
  const handleSelectShiftTx = (id: string) => {
    setSelectedShiftTxId(id);
    const tx = transactions.find((t) => t.id === id);
    if (tx) {
      setNewBkuInput(tx.nomorBukti || '');
      const sugg = suggestBkuForDate(transactions, tx.tanggal, tx.id);
      setSuggestionNote(sugg.explanation);
    }
  };

  // Suggest BKU for the selected shift transaction based on its date
  const handleApplyDateSuggestion = () => {
    if (!shiftTargetTx) return;
    const sugg = suggestBkuForDate(transactions, shiftTargetTx.tanggal, shiftTargetTx.id);
    setNewBkuInput(sugg.suggestedNo);
    setShiftSubsequent(true);
    setSuggestionNote(sugg.explanation);
    showToast({
      type: 'info',
      title: 'Nomor BKU Disarankan',
      message: `Berdasarkan tanggal ${shiftTargetTx.tanggal}, nomor yang tepat adalah ${sugg.suggestedNo}.`,
    });
  };

  // Live preview for Shift / Insert
  const shiftPreview = useMemo(() => {
    if (!selectedShiftTxId || !newBkuInput.trim()) {
      return {
        targetTx: shiftTargetTx,
        formattedTargetNo: newBkuInput,
        previewList: [],
        shiftedCount: 0,
        hasCollisionWithoutShift: false,
      };
    }
    return calculateBkuShiftPreview(
      transactions,
      selectedShiftTxId,
      newBkuInput,
      shiftSubsequent
    );
  }, [transactions, selectedShiftTxId, newBkuInput, shiftSubsequent, shiftTargetTx]);

  // Execute Shift / Insert
  const handleExecuteShift = () => {
    if (!selectedShiftTxId) {
      alert('Pilih transaksi yang ingin diganti atau disisipkan nomor BKU-nya.');
      return;
    }
    if (!newBkuInput.trim()) {
      alert('Masukkan nomor BKU baru yang diinginkan (misal: BKU 05).');
      return;
    }

    insertAndShiftBku({
      targetTxId: selectedShiftTxId,
      newNomorBukti: newBkuInput.trim(),
      shiftSubsequent,
      sortChronologically,
      autoHarmonizeDate,
    });

    const shiftCount = shiftPreview.shiftedCount;
    showToast({
      type: 'success',
      title: 'Nomor BKU Berhasil Disisipkan',
      message:
        shiftCount > 0
          ? `Nomor ${shiftPreview.formattedTargetNo} berhasil diterapkan pada "${shiftTargetTx?.uraian.slice(0, 25)}...", dan ${shiftCount} transaksi setelahnya otomatis digeser maju (+1).`
          : `Nomor ${shiftPreview.formattedTargetNo} berhasil diterapkan pada transaksi terpilih.`,
    });

    closeSwapRenumberModal();
  };

  // Swap Tab handlers
  const txA = transactions.find((t) => t.id === selectedTxAId);
  const txB = transactions.find((t) => t.id === selectedTxBId);

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

  // Renumber Tab Preview
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
      message: `Sebanyak ${renumberPreview.length} transaksi berhasil diberi nomor BKU urut otomatis dari awal sampai akhir.`,
    });

    closeSwapRenumberModal();
  };

  // Preset: Urutkan Lintas Bulan (Agustus -> September)
  const handlePresetCrossMonth = () => {
    setSelectedMonthKey('ALL');
    setStartNumber(1);
    setPrefix('BKU ');
    setPadDigits(2);
    setOnlyExpenses(true);
    showToast({
      type: 'info',
      title: 'Mode Lintas Bulan Aktif',
      message:
        'Siap mengurutkan seluruh transaksi dari bulan terawal (Agustus) hingga akhir (September) berdasarkan tanggal.',
    });
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
              <Hash className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Pengaturan & Urutan Nomor BKU</span>
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-purple-950 px-2 py-0.5 rounded-md">
                  Fleksibel
                </span>
              </h2>
              <p className="text-xs text-purple-200">
                Ganti/sisipkan transaksi terlewat, tukar nomor, atau urutkan otomatis lintas bulan.
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

        {/* Tab Navigation (3 Tabs) */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1 sm:gap-2 overflow-x-auto">
          {/* TAB 1: Ganti & Sisipkan BKU */}
          <button
            type="button"
            onClick={() => setActiveTab('shift')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'shift'
                ? 'border-purple-800 text-purple-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-purple-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-purple-700" />
            <span>Ganti & Sisipkan BKU (Auto-Geser)</span>
          </button>

          {/* TAB 2: Tukar Nomor BKU */}
          <button
            type="button"
            onClick={() => setActiveTab('swap')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'swap'
                ? 'border-purple-800 text-purple-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-purple-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
            <span>Tukar Nomor BKU (Swap)</span>
          </button>

          {/* TAB 3: Urutkan Ulang Otomatis */}
          <button
            type="button"
            onClick={() => setActiveTab('renumber')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'renumber'
                ? 'border-purple-800 text-purple-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-purple-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            <span>Urutkan Semua (Auto Renumber)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-slate-800 text-xs sm:text-sm">
          {/* =========================================================
              TAB 1: GANTI & SISIPKAN BKU (AUTO-GESER LINTAS BULAN)
             ========================================================= */}
          {activeTab === 'shift' && (
            <div className="space-y-4">
              {/* Highlight Banner for Late/Missed Transactions */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-purple-50 border-2 border-amber-300/80 rounded-xl text-xs text-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-purple-950 font-black">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Solusi Transaksi Terlewat (Contoh: Nota Agustus Ditemukan Setelah Input September)</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed pl-6">
                  Jika ada transaksi bulan lalu yang baru diinput padahal Anda sudah membuat transaksi bulan berikutnya, pilih transaksi tersebut di bawah dan tentukan nomor BKU-nya. Sistem akan <b>menyisipkan nomor tersebut dan otomatis menggeser (+1)</b> semua nomor BKU transaksi berikutnya tanpa merusak pembukuan!
                </p>
              </div>

              {/* 1. Pilih Transaksi */}
              <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-purple-950 uppercase tracking-wide">
                    1. Pilih Transaksi yang Ingin Diganti / Disisipkan
                  </label>
                  <span className="text-[11px] font-bold text-slate-500">
                    Total {sortedTransactions.length} Transaksi
                  </span>
                </div>

                {/* Filter / Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={shiftSearchQuery}
                    onChange={(e) => setShiftSearchQuery(e.target.value)}
                    placeholder="Cari transaksi berdasarkan uraian, tanggal, atau nomor BKU..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-black focus:ring-2 focus:ring-purple-600 focus:border-purple-600 placeholder:text-slate-400"
                  />
                </div>

                <select
                  value={selectedShiftTxId}
                  onChange={(e) => handleSelectShiftTx(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-black focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                >
                  <option value="">-- Pilih Transaksi --</option>
                  {sortedTransactions
                    .filter((t) => {
                      if (!shiftSearchQuery.trim()) return true;
                      const q = shiftSearchQuery.toLowerCase();
                      return (
                        t.uraian.toLowerCase().includes(q) ||
                        t.tanggal.toLowerCase().includes(q) ||
                        (t.nomorBukti || '').toLowerCase().includes(q)
                      );
                    })
                    .map((t) => (
                      <option key={`opt-shift-${t.id}`} value={t.id}>
                        [{t.nomorBukti || 'Tanpa No'}] {t.tanggal} - {t.uraian.slice(0, 45)} (
                        {formatRupiah(t.pengeluaran || t.penerimaan)})
                      </option>
                    ))}
                </select>

                {shiftTargetTx && (
                  <div className="bg-white p-2.5 rounded-lg border border-purple-200 text-xs flex justify-between items-center shadow-2xs">
                    <div>
                      <span className="font-mono font-bold text-purple-950 bg-purple-100 px-2 py-0.5 rounded mr-2">
                        {shiftTargetTx.nomorBukti || 'Tanpa No'}
                      </span>
                      <span className="text-slate-600 font-semibold">{shiftTargetTx.tanggal}</span>
                      <p className="font-bold text-slate-900 mt-0.5">{shiftTargetTx.uraian}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-700 shrink-0 ml-2">
                      {formatRupiah(shiftTargetTx.pengeluaran || shiftTargetTx.penerimaan)}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Nomor BKU Baru & Tombol Rekomendasi */}
              <div className="border border-slate-300 rounded-xl p-3.5 bg-white space-y-2.5">
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide">
                  2. Tentukan Nomor BKU Baru untuk Transaksi Ini
                </label>

                <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newBkuInput}
                      onChange={(e) => {
                        setNewBkuInput(e.target.value);
                        setSuggestionNote(null);
                      }}
                      placeholder="Contoh: BKU 05 atau 05"
                      className="w-full text-xs sm:text-sm font-black font-mono border-2 border-purple-900/40 rounded-lg p-2.5 bg-white text-black focus:ring-2 focus:ring-amber-400 focus:border-amber-500"
                    />
                  </div>

                  {/* Tombol Rekomendasi Berdasarkan Tanggal */}
                  <button
                    type="button"
                    onClick={handleApplyDateSuggestion}
                    disabled={!shiftTargetTx}
                    className="shrink-0 flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs px-3.5 py-2.5 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Analisis urutan tanggal dan sarankan nomor BKU yang pas"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-950" />
                    <span>Sarankan Sesuai Tanggal</span>
                  </button>
                </div>

                {suggestionNote && (
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-[11px] text-purple-900 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
                    <span>{suggestionNote}</span>
                  </div>
                )}
              </div>

              {/* 3. Pengaturan Pergeseran */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shiftSubsequent}
                    onChange={(e) => setShiftSubsequent(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-purple-900 border-slate-300 rounded focus:ring-purple-600"
                  />
                  <div>
                    <span className="font-bold text-xs text-purple-950">
                      Otomatis geser maju (+1) nomor BKU transaksi berikutnya
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Transaksi yang sudah memiliki nomor sama atau lebih besar (baik di bulan ini maupun bulan setelahnya) akan bergeser +1 sehingga tidak ada nomor kuitansi ganda.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={sortChronologically}
                    onChange={(e) => setSortChronologically(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-purple-900 border-slate-300 rounded focus:ring-purple-600"
                  />
                  <div>
                    <span className="font-bold text-xs text-purple-950">
                      Selaraskan posisi urutan pembukuan secara kronologis
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Memastikan urutan baris di BKU tersusun rapi otomatis mengikuti nomor BKU dan periode bulan.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={autoHarmonizeDate}
                    onChange={(e) => setAutoHarmonizeDate(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-purple-900 border-slate-300 rounded focus:ring-purple-600"
                  />
                  <div>
                    <span className="font-bold text-xs text-purple-950">
                      Sesuaikan tanggal transaksi otomatis mengikuti nomor BKU baru (Disarankan)
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Jika transaksi memiliki tanggal yang tidak sinkron (misal: BKU 06 ber-tanggal 30 Agustus padahal BKU 05 tanggal 16 Agustus), sistem otomatis menyesuaikan tanggal agar selaras dengan nomor BKU sekitarnya.
                    </p>
                  </div>
                </label>
              </div>

              {/* 4. Pratinjau Interaktif Perubahan */}
              {shiftPreview.previewList.length > 0 && (
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 p-2.5 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-700" />
                      <span>Pratinjau Dampak Perubahan</span>
                    </span>
                    <span className="text-[11px] text-purple-900 font-black bg-purple-100 px-2 py-0.5 rounded">
                      {shiftPreview.shiftedCount > 0
                        ? `1 disisipkan + ${shiftPreview.shiftedCount} digeser (+1)`
                        : '1 diperbarui'}
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] sticky top-0">
                        <tr>
                          <th className="py-1.5 px-3">Tanggal</th>
                          <th className="py-1.5 px-3">Uraian</th>
                          <th className="py-1.5 px-3 text-center">Nomor Lama</th>
                          <th className="py-1.5 px-3 text-center font-bold text-purple-950">
                            Nomor Baru
                          </th>
                          <th className="py-1.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shiftPreview.previewList.map((item) => (
                          <tr
                            key={`shift-prev-${item.id}`}
                            className={`transition ${
                              item.isTarget
                                ? 'bg-emerald-50/80 font-semibold'
                                : 'bg-amber-50/40 hover:bg-amber-50/70'
                            }`}
                          >
                            <td className="py-1.5 px-3 text-slate-600 whitespace-nowrap">
                              {item.tanggal}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-slate-900 truncate max-w-[180px]">
                              {item.uraian}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-slate-500">
                              {item.nomorLama}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono font-bold text-purple-950">
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  item.isTarget
                                    ? 'bg-emerald-200 text-emerald-950 border border-emerald-400 font-black'
                                    : 'bg-purple-100 text-purple-900'
                                }`}
                              >
                                {item.nomorBaru}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-center whitespace-nowrap">
                              {item.isTarget ? (
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Disisipkan
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded">
                                  Geser +1
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 2: TUKAR NOMOR BKU (SWAP)
             ========================================================= */}
          {activeTab === 'swap' && (
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
          )}

          {/* =========================================================
              TAB 3: URUTKAN ULANG SEMUA BULAN (AUTO RENUMBER)
             ========================================================= */}
          {activeTab === 'renumber' && (
            <div className="space-y-4">
              {/* Preset Button Quick Action */}
              <div className="p-3 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mode Pintar: Urutkan Kronologis Lintas Bulan</span>
                  </div>
                  <p className="text-[11px] text-purple-200 mt-0.5">
                    Otomatis menyusun urutan dari Agustus hingga September dari tanggal nota paling awal ke paling akhir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePresetCrossMonth}
                  className="bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  ⚡ Terapkan Semua Bulan
                </button>
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
                  <span className="text-[11px] text-purple-900 font-bold">
                    {renumberPreview.filter((p) => p.willChange).length} nomor akan diperbarui
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] sticky top-0">
                      <tr>
                        <th className="py-1.5 px-3">No</th>
                        <th className="py-1.5 px-3">Tanggal</th>
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
                          <td className="py-1.5 px-3 text-slate-600 whitespace-nowrap">
                            {item.tanggal}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-800 truncate max-w-[180px]">
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

              {/* Harmonize Dates Action */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-1.5 font-black text-xs text-purple-950">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sinkronisasi Kronologis Tanggal & Nomor BKU</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Otomatis merapikan semua tanggal transaksi agar urutan tanggal dan nomor BKU selaras secara bertahap tanpa tanggal yang mundur.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    harmonizeAllBkuDates();
                    showToast({
                      type: 'success',
                      title: 'Tanggal & Urutan Diselaraskan',
                      message: 'Semua tanggal transaksi berhasil diselaraskan mengikuti urutan nomor BKU!',
                    });
                  }}
                  className="shrink-0 px-3 py-1.5 bg-white border border-purple-300 hover:bg-purple-100 text-purple-900 font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer"
                >
                  ⚡ Selaraskan Tanggal Semua BKU
                </button>
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

          {activeTab === 'shift' && (
            <button
              type="button"
              onClick={handleExecuteShift}
              disabled={!selectedShiftTxId || !newBkuInput.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-amber-300 text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 border border-amber-400/40"
            >
              <Hash className="w-4 h-4 text-amber-400" />
              <span>
                {shiftPreview.shiftedCount > 0
                  ? `Terapkan BKU & Geser ${shiftPreview.shiftedCount} Nomor (+1)`
                  : 'Terapkan Nomor BKU'}
              </span>
            </button>
          )}

          {activeTab === 'swap' && (
            <button
              type="button"
              onClick={handleExecuteSwap}
              disabled={!selectedTxAId || !selectedTxBId || selectedTxAId === selectedTxBId}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Tukar Nomor BKU Sekarang</span>
            </button>
          )}

          {activeTab === 'renumber' && (
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
