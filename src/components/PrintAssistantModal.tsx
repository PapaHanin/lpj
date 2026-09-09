import React from 'react';
import { Printer, ExternalLink, FileSpreadsheet, X, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { exportLpjToExcel } from '../utils/excelExport';

export const PrintAssistantModal: React.FC = () => {
  const {
    isPrintModalOpen,
    closePrintModal,
    printModalDocTitle,
    profile,
    transactions,
    selectedTransactionIdForKwitansi,
  } = useLpjStore();

  if (!isPrintModalOpen) return null;

  const handlePrintAgain = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Print blocked by iframe:', err);
    }
  };

  const handleExportExcel = () => {
    const selectedTx =
      transactions.find((t) => t.id === selectedTransactionIdForKwitansi) || null;
    exportLpjToExcel(profile, transactions, selectedTx);
  };

  return (
    <div
      id="print-assistant-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/80 backdrop-blur-sm animate-in fade-in duration-150 print:hidden"
    >
      <div className="bg-[#1b052d] border-2 border-amber-400/40 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={closePrintModal}
          className="absolute top-4 right-4 p-2 text-purple-300 hover:text-white rounded-xl hover:bg-purple-900/60 transition"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center shadow-lg shadow-amber-400/20 ring-2 ring-amber-300">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider bg-amber-400/20 px-2 py-0.5 rounded-md border border-amber-400/30">
              Pusat Kontrol Cetak
            </span>
            <h3 className="text-lg font-black text-white mt-0.5">
              {printModalDocTitle}
            </h3>
          </div>
        </div>

        {/* Informative Explanation */}
        <div className="bg-purple-900/50 border border-amber-400/25 rounded-2xl p-4 mb-5 space-y-2">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-100 leading-relaxed">
              Jika jendela cetak browser tidak muncul otomatis (karena pembatasan frame preview), pilih opsi di bawah ini untuk mencetak dokumen:
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-amber-300 font-mono bg-purple-950/70 p-2 rounded-xl border border-amber-400/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Shortcut cepat: Tekan <strong>Ctrl + P</strong> (atau <strong>Cmd + P</strong> di Mac)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Action 1: Print Native Dialog */}
          <button
            onClick={handlePrintAgain}
            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 font-black rounded-2xl shadow-lg shadow-amber-400/25 transition active:scale-95 cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <Printer className="w-5 h-5" />
              <span className="text-sm">Buka Dialog Cetak Browser Sekarang</span>
            </div>
            <span className="text-xs bg-purple-950 text-amber-300 px-2.5 py-1 rounded-xl">
              Cetak
            </span>
          </button>

          {/* Action 2: Open in New Tab (Iframe-Free) */}
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closePrintModal}
            className="w-full flex items-center justify-between p-3.5 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/40 rounded-2xl transition active:scale-95 cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <ExternalLink className="w-5 h-5 text-amber-400 group-hover:scale-110 transition" />
              <div className="text-left">
                <p className="text-xs font-bold text-white">Buka di Tab Baru (Layar Penuh)</p>
                <p className="text-[11px] text-purple-200">Bebas batasan frame & 100% dialog cetak aktif</p>
              </div>
            </div>
            <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-2 py-1 rounded-xl border border-amber-400/30">
              Buka Tab
            </span>
          </a>

          {/* Action 3: Export to Excel */}
          <button
            onClick={() => {
              handleExportExcel();
              closePrintModal();
            }}
            className="w-full flex items-center justify-between p-3 bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-700/60 rounded-2xl transition active:scale-95 cursor-pointer text-xs font-bold"
          >
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Atau Unduh Versi Excel Lengkap (.xlsx)</span>
            </div>
            <span className="text-emerald-400 text-[11px]">4 Sheet</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-purple-800/60 flex justify-end">
          <button
            onClick={closePrintModal}
            className="px-4 py-2 bg-purple-900/50 hover:bg-purple-800 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    </div>
  );
};
