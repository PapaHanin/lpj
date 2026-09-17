import React from 'react';
import {
  FileSpreadsheet,
  Printer,
  PlusCircle,
  Settings,
  BookOpen,
  Banknote,
  Landmark,
  Receipt,
  LayoutDashboard,
  RotateCcw,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { ActiveTab } from '../types';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';

export const HeaderNav: React.FC = () => {
  const {
    profile,
    transactions,
    activeTab,
    setActiveTab,
    openTransactionModal,
    openProfileModal,
    resetToInitialData,
  } = useLpjStore();

  const handleExportExcel = () => {
    exportLpjToExcel(profile, transactions);
  };

  const handlePrint = () => {
    triggerPrint('Laporan Pertanggungjawaban (LPJ)');
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bku', label: 'BK Umum', icon: BookOpen },
    { id: 'bku-tunai', label: 'BKU Tunai', icon: Banknote },
    { id: 'bk-bank', label: 'BK Bank', icon: Landmark },
    { id: 'kwitansi', label: 'Cetak Kwitansi', icon: Receipt },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  Ah Beres
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  DAK Fisik Sekolah
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                {profile.namaSekolah} • {profile.bulanLaporan}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              id="btn-tambah-transaksi"
              onClick={() => openTransactionModal()}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Tambah Transaksi Baru"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input Transaksi</span>
            </button>

            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 py-2 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Unduh Buku Kas Excel Lengkap (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              id="btn-print-view"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-2 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Cetak Halaman Ini (Print / PDF)"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">Cetak</span>
            </button>

            <button
              id="btn-pengaturan-kop"
              onClick={openProfileModal}
              className="inline-flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-2 rounded-lg transition-all cursor-pointer"
              title="Pengaturan Kop Laporan & Identitas Proyek"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden lg:inline">Pengaturan Kop</span>
            </button>

            <button
              id="btn-reset-data"
              onClick={() => {
                if (window.confirm('Kembalikan data ke contoh standar DAK SD INPRES 2 PALASA?')) {
                  resetToInitialData();
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              title="Reset ke Contoh Standar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 py-1.5 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-bold border-b-2 border-emerald-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
