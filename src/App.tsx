import React from 'react';
import { useLpjStore } from './store/lpjStore';
import { SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { BkuGeneralView } from './components/BkuGeneralView';
import { BkuTunaiView } from './components/BkuTunaiView';
import { BkBankView } from './components/BkBankView';
import { CetakKwitansiView } from './components/CetakKwitansiView';
import { TransactionModal } from './components/TransactionModal';
import { ProfileModal } from './components/ProfileModal';
import { PrintAssistantModal } from './components/PrintAssistantModal';
import { ToastNotification } from './components/ToastNotification';

export default function App() {
  const { activeTab, profile } = useLpjStore();

  return (
    <div className="min-h-screen bg-[#180526] text-slate-100 selection:bg-amber-400 selection:text-purple-950 font-sans relative print:bg-white print:text-black">
      {/* Background Purple + Yellow Ambient Glow (Non-distracting) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden print:hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-purple-800/15 rounded-full blur-3xl" />
      </div>

      {/* Locked Left Sidebar Navigation */}
      <SidebarNav />

      {/* Main Content Area (Offset for lg:w-64 fixed sidebar) */}
      <div className="lg:pl-64 print:pl-0 flex flex-col min-h-screen relative z-10 print:m-0 print:p-0">
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 print:p-0 print:m-0 print:max-w-none">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'bku' && <BkuGeneralView />}
          {activeTab === 'bku-tunai' && <BkuTunaiView />}
          {activeTab === 'bk-bank' && <BkBankView />}
          {activeTab === 'kwitansi' && <CetakKwitansiView />}
        </main>

        {/* Bottom Footer in Purple & Yellow Style (Hidden during Print) */}
        <footer className="bg-[#12031e]/90 border-t border-amber-400/20 py-4 mt-auto print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-purple-300">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-amber-400">Ah Beres</span>
              <span>•</span>
              <span className="text-purple-200">Aplikasi LPJ DAK Fisik Pembangunan & Rehab Sekolah</span>
            </div>
            <div>
              <span className="text-amber-300/90 font-medium">
                {profile.namaSekolah} • TA {profile.tahunAnggaran}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Modals & Notifications */}
      <TransactionModal />
      <ProfileModal />
      <PrintAssistantModal />
      <ToastNotification />
    </div>
  );
}
