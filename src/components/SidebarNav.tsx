import React, { useState } from 'react';
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
  Menu,
  X,
  Sparkles,
  Building,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { ActiveTab } from '../types';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';

export const SidebarNav: React.FC = () => {
  const {
    profile,
    transactions,
    activeTab,
    selectedTransactionIdForKwitansi,
    setActiveTab,
    openTransactionModal,
    openProfileModal,
    resetToInitialData,
  } = useLpjStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleExportExcel = () => {
    const selectedTx =
      transactions.find((t) => t.id === selectedTransactionIdForKwitansi) || null;
    exportLpjToExcel(profile, transactions, selectedTx);
  };

  const handlePrint = () => {
    triggerPrint();
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Ringkasan & status' },
    { id: 'bku', label: 'BK Umum', icon: BookOpen, desc: 'Buku Kas Umum' },
    { id: 'bku-tunai', label: 'BKU Tunai', icon: Banknote, desc: 'Rincian sub-nota barang' },
    { id: 'bk-bank', label: 'BK Bank', icon: Landmark, desc: 'Rekening giro/tabungan' },
    { id: 'kwitansi', label: 'Cetak Kwitansi', icon: Receipt, desc: 'Format cetak resmi' },
  ];

  return (
    <>
      {/* Mobile Top Bar (Only visible on small screens < lg) */}
      <header className="lg:hidden bg-[#1e0730] border-b border-amber-400/30 text-white px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-purple-950 font-black shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-amber-300 leading-tight">Ah Beres</h1>
            <p className="text-[10px] text-purple-200 truncate max-w-[170px]">{profile.namaSekolah}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => openTransactionModal()}
            className="bg-amber-400 hover:bg-amber-300 text-purple-950 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Input</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-amber-300 hover:text-white rounded-lg border border-amber-400/30 transition"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-purple-950/70 backdrop-blur-xs z-30 print:hidden"
        />
      )}

      {/* Locked Left Sidebar Navigation with smooth scrollbar */}
      <aside
        id="sidebar-navigation"
        className={`fixed top-0 left-0 bottom-0 w-64 h-screen overflow-y-auto overflow-x-hidden sidebar-scroll flex flex-col justify-between z-40 bg-gradient-to-b from-[#210738] via-[#1a052b] to-[#12031e] border-r-2 border-amber-400/30 text-white shadow-2xl transition-transform duration-300 ease-in-out print:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header Branding (Purple + Yellow) */}
        <div className="p-4 border-b border-amber-400/20 bg-purple-950/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-purple-950 shadow-md shadow-amber-400/20 ring-2 ring-amber-300">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg tracking-wide text-white">Ah Beres</span>
                  <span className="bg-amber-400 text-purple-950 text-[10px] font-black px-1.5 py-0.2 rounded-full uppercase">
                    DAK
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/90 font-medium">LPJ Fisik Sekolah</p>
              </div>
            </div>

            {/* Close button on mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-purple-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* School Badge Pill with Quick Month Switch */}
          <div
            onClick={() => {
              openProfileModal();
              setMobileMenuOpen(false);
            }}
            className="mt-3 bg-purple-900/60 hover:bg-purple-900/90 border border-amber-400/30 hover:border-amber-400 rounded-xl p-2.5 flex items-center justify-between gap-2 cursor-pointer transition shadow-xs group"
            title="Klik untuk ubah bulan laporan atau identitas proyek"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-100 truncate">{profile.namaSekolah}</p>
                <p className="text-[11px] text-amber-300 font-black font-mono">Bulan: {profile.bulanLaporan}</p>
              </div>
            </div>
            <span className="text-[10px] bg-amber-400 text-purple-950 font-black px-2 py-0.5 rounded-md shrink-0 shadow-xs group-hover:bg-amber-300 transition">
              Ubah
            </span>
          </div>
        </div>

        {/* Primary Action Button (Input Transaksi) */}
        <div className="p-3 shrink-0">
          <button
            id="btn-sidebar-input-transaksi"
            onClick={() => {
              openTransactionModal();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 font-black text-xs sm:text-sm py-2.5 px-3 rounded-xl shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer border border-amber-200"
          >
            <PlusCircle className="w-4 h-4 text-purple-950" />
            <span>INPUT TRANSAKSI</span>
          </button>
        </div>

        {/* Navigation Tabs List */}
        <nav className="flex-1 px-3 py-1 space-y-1 select-none flex flex-col justify-start">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/70">
            Menu Pembukuan
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-amber-400 text-purple-950 font-black shadow-md shadow-amber-400/20 border-l-4 border-purple-950'
                    : 'text-purple-100 hover:bg-purple-900/60 hover:text-amber-300'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-purple-950' : 'text-amber-400'
                  }`}
                />
                <div className="flex-1 truncate">
                  <div className="leading-tight">{item.label}</div>
                  <div
                    className={`text-[10px] font-normal truncate ${
                      isActive ? 'text-purple-900' : 'text-purple-300/70'
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Tools & Utilities Section */}
          <div className="pt-2 border-t border-purple-800/60 mt-1 space-y-1">
            <p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/70">
              Opsi Dokumen
            </p>

            <button
              onClick={handleExportExcel}
              className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-200 hover:bg-purple-900/60 hover:text-amber-300 transition text-left cursor-pointer"
              title="Unduh 4 Sheet Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Export Excel LPJ</span>
            </button>

            <button
              onClick={handlePrint}
              className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-200 hover:bg-purple-900/60 hover:text-amber-300 transition text-left cursor-pointer"
              title="Cetak Halaman Ini"
            >
              <Printer className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={() => {
                openProfileModal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-200 hover:bg-purple-900/60 hover:text-amber-300 transition text-left cursor-pointer"
              title="Edit Kop Sekolah & Penandatangan"
            >
              <Settings className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pengaturan Kop</span>
            </button>
          </div>
        </nav>

        {/* Locked Footer (Bottom Fixed Section) */}
        <div className="p-3 border-t border-amber-400/20 bg-[#12031e] shrink-0 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-purple-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-amber-200 font-semibold">DAK Fisik 2026</span>
            </span>
            <button
              onClick={() => {
                if (window.confirm('Reset data pembukuan ke contoh standar DAK SD INPRES 2 PALASA?')) {
                  resetToInitialData();
                }
              }}
              className="text-purple-400 hover:text-rose-400 transition flex items-center gap-1"
              title="Reset data ke contoh awal"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="text-[10px] text-purple-400 text-center leading-tight">
            Standar Format DAK Fisik Kemendikbud
          </div>
        </div>
      </aside>
    </>
  );
};
