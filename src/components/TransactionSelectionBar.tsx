import React from 'react';
import {
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Sparkles,
  X,
  CheckSquare,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { Transaction } from '../types';

interface TransactionSelectionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  transactionsInCurrentView?: Transaction[];
}

export const TransactionSelectionBar: React.FC<TransactionSelectionBarProps> = ({
  selectedIds,
  onClearSelection,
  transactionsInCurrentView = [],
}) => {
  const {
    transactions,
    deleteMultipleTransactions,
    openTransactionModal,
    openSwapRenumberModal,
    swapTransactionNomorBukti,
    showToast,
  } = useLpjStore();

  if (selectedIds.length === 0) return null;

  // Derive selected transaction objects
  const selectedTxs = transactions.filter((t) => selectedIds.includes(t.id));
  const singleTx = selectedTxs.length === 1 ? selectedTxs[0] : null;

  // For moving up / down in the current view
  const currentViewList =
    transactionsInCurrentView.length > 0 ? transactionsInCurrentView : transactions;
  const singleIndexInView = singleTx
    ? currentViewList.findIndex((t) => t.id === singleTx.id)
    : -1;
  const canMoveUp = singleIndexInView > 0;
  const canMoveDown =
    singleIndexInView >= 0 && singleIndexInView < currentViewList.length - 1;

  const handleEdit = () => {
    if (!singleTx) return;
    openTransactionModal(singleTx);
  };

  const handleDelete = () => {
    const count = selectedIds.length;
    const msg =
      count === 1
        ? `Hapus transaksi "${selectedTxs[0]?.uraian}"?`
        : `Apakah Anda yakin ingin menghapus ${count} transaksi yang dipilih? Data yang dihapus tidak dapat dikembalikan.`;

    if (window.confirm(msg)) {
      deleteMultipleTransactions(selectedIds);
      showToast({
        type: 'info',
        title: 'Transaksi Dihapus',
        message: `${count} transaksi berhasil dihapus dari pembukuan.`,
      });
      onClearSelection();
    }
  };

  const handleMoveUp = () => {
    if (!singleTx || !canMoveUp) return;
    const targetAboveTx = currentViewList[singleIndexInView - 1];
    if (!targetAboveTx) return;

    swapTransactionNomorBukti(singleTx.id, targetAboveTx.id, {
      swapPositions: true,
      swapDates: singleTx.tanggal !== targetAboveTx.tanggal,
    });

    showToast({
      type: 'success',
      title: 'Pindah ke Atas',
      message: `"${singleTx.uraian.slice(0, 24)}..." dipindahkan ke atas & nomor BKU diselaraskan.`,
    });
  };

  const handleMoveDown = () => {
    if (!singleTx || !canMoveDown) return;
    const targetBelowTx = currentViewList[singleIndexInView + 1];
    if (!targetBelowTx) return;

    swapTransactionNomorBukti(singleTx.id, targetBelowTx.id, {
      swapPositions: true,
      swapDates: singleTx.tanggal !== targetBelowTx.tanggal,
    });

    showToast({
      type: 'success',
      title: 'Pindah ke Bawah',
      message: `"${singleTx.uraian.slice(0, 24)}..." dipindahkan ke bawah & nomor BKU diselaraskan.`,
    });
  };

  const handleSwapTwo = () => {
    if (selectedIds.length === 2) {
      openSwapRenumberModal(selectedIds[0], selectedIds[1]);
    } else if (singleTx) {
      openSwapRenumberModal(singleTx.id);
    } else {
      openSwapRenumberModal();
    }
  };

  return (
    <div
      id="floating-transaction-selection-bar"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#1e0730]/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-400/50 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm animate-bounce-short max-w-[95vw] print:hidden"
    >
      {/* Count Badge */}
      <div className="flex items-center gap-2 bg-purple-900/80 border border-purple-600 px-3 py-1.5 rounded-xl">
        <CheckSquare className="w-4 h-4 text-amber-400" />
        <span className="font-black text-amber-300 whitespace-nowrap">
          {selectedIds.length} Transaksi Dipilih
        </span>
      </div>

      <div className="h-5 w-px bg-purple-700/60 hidden sm:block" />

      {/* Action Buttons */}
      <div className="flex items-center flex-wrap gap-1.5">
        {/* Edit (Active when 1 is selected) */}
        {singleTx && (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
            title="Edit transaksi yang dicentang"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        )}

        {/* Move Up (Active when 1 is selected) */}
        {singleTx && (
          <button
            type="button"
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            className="flex items-center gap-1 bg-purple-800 hover:bg-purple-700 text-purple-100 font-bold px-2.5 py-1.5 rounded-lg border border-purple-600/70 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            title="Pindah baris ke atas & tukar nomor BKU dengan baris di atasnya"
          >
            <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Ke Atas</span>
          </button>
        )}

        {/* Move Down (Active when 1 is selected) */}
        {singleTx && (
          <button
            type="button"
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            className="flex items-center gap-1 bg-purple-800 hover:bg-purple-700 text-purple-100 font-bold px-2.5 py-1.5 rounded-lg border border-purple-600/70 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            title="Pindah baris ke bawah & tukar nomor BKU dengan baris di bawahnya"
          >
            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Ke Bawah</span>
          </button>
        )}

        {/* Swap BKU Numbers */}
        <button
          type="button"
          onClick={handleSwapTwo}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-purple-950 font-black px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
          title={
            selectedIds.length === 2
              ? `Tukar nomor BKU antara 2 transaksi terpilih (${selectedTxs[0]?.nomorBukti || 'Tanpa No'} ⇄ ${selectedTxs[1]?.nomorBukti || 'Tanpa No'})`
              : 'Tukar nomor BKU dengan transaksi lain'
          }
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>
            {selectedIds.length === 2
              ? `Tukar Nomor BKU (${selectedTxs[0]?.nomorBukti || '-'} ⇄ ${selectedTxs[1]?.nomorBukti || '-'})`
              : 'Tukar Nomor BKU'}
          </span>
        </button>

        {/* Renumber BKU Automatically */}
        <button
          type="button"
          onClick={() => openSwapRenumberModal()}
          className="flex items-center gap-1 bg-purple-700 hover:bg-purple-600 text-amber-300 font-bold px-3 py-1.5 rounded-lg border border-amber-400/40 transition active:scale-95 cursor-pointer"
          title="Urutkan ulang nomor BKU secara otomatis tanpa merubah manual satu per satu"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Urutkan Ulang Otomatis</span>
        </button>

        {/* Delete Transactions */}
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
          title={`Hapus ${selectedIds.length} transaksi yang dipilih`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus ({selectedIds.length})</span>
        </button>
      </div>

      {/* Clear Selection Button */}
      <button
        type="button"
        onClick={onClearSelection}
        className="ml-auto p-1.5 text-purple-300 hover:text-white hover:bg-purple-800 rounded-lg transition cursor-pointer"
        title="Batalkan Pilihan (Hilangkan semua centang)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
