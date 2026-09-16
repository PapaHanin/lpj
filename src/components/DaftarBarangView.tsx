import React from 'react';
import { useLpjStore } from '../store/lpjStore';
import { DaftarBahanTab } from './DaftarBahanTab';
import { DaftarTukangTab } from './DaftarTukangTab';
import {
  Boxes,
  Users,
  PackageCheck,
  Building2,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { formatRupiah } from '../utils/calculations';
import { extractDaftarBahan, calculateUpahJumlah } from '../utils/bahanTukangUtils';

export const DaftarBarangView: React.FC = () => {
  const {
    activeSubTabDaftarBarang,
    setActiveSubTabDaftarBarang,
    profile,
    transactions,
    customBahanList,
    absenTukangList,
    selectedAbsenWeekId,
  } = useLpjStore();

  // Summary counts
  const bahanList = extractDaftarBahan(transactions, true);
  const totalBahanCount = bahanList.length + customBahanList.length;
  const totalBahanRp = [...bahanList, ...customBahanList].reduce(
    (acc, b) => acc + b.total,
    0
  );

  const currentAbsen =
    absenTukangList.find((w) => w.id === selectedAbsenWeekId) ||
    absenTukangList[0];
  const totalTukangCount = currentAbsen?.pekerja.length || 0;
  const totalUpahMingguan =
    currentAbsen?.pekerja.reduce((acc, p) => acc + calculateUpahJumlah(p), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header (Hidden on Print) */}
      <div className="bg-gradient-to-r from-[#2a0845] via-[#200536] to-[#160326] border border-amber-400/30 rounded-2xl p-5 sm:p-6 shadow-xl print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1.5">
              <PackageCheck className="w-4 h-4" />
              <span>Lampiran DAK Fisik • Realisasi Belanja & Upah</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Daftar Barang / Belanja & Upah Tenaga Kerja
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 mt-1 max-w-2xl">
              Rekapitulasi resmi daftar bahan material belanja dan lembar absen harian upah tukang & knek sesuai format format SPJ DAK Fisik.
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <div className="bg-[#180526]/80 border border-amber-400/30 rounded-xl p-3 flex-1 min-w-[140px]">
              <div className="text-[11px] text-purple-300 font-medium">Bahan Material:</div>
              <div className="text-sm sm:text-base font-extrabold text-amber-300 font-mono">
                {formatRupiah(totalBahanRp)}
              </div>
              <div className="text-[10px] text-purple-400 mt-0.5">
                {totalBahanCount} Item Terdaftar
              </div>
            </div>

            <div className="bg-[#180526]/80 border border-amber-400/30 rounded-xl p-3 flex-1 min-w-[140px]">
              <div className="text-[11px] text-purple-300 font-medium">Upah Tukang (Mingguan):</div>
              <div className="text-sm sm:text-base font-extrabold text-cyan-300 font-mono">
                {formatRupiah(totalUpahMingguan)}
              </div>
              <div className="text-[10px] text-purple-400 mt-0.5">
                {totalTukangCount} Tenaga Kerja
              </div>
            </div>
          </div>
        </div>

        {/* Subnavigation Tabs */}
        <div className="mt-6 pt-4 border-t border-purple-800/40 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTabDaftarBarang('bahan')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
              activeSubTabDaftarBarang === 'bahan'
                ? 'bg-amber-400 text-purple-950 ring-2 ring-amber-300/60 font-extrabold'
                : 'bg-purple-950/60 text-purple-200 hover:bg-purple-900/60 hover:text-white border border-purple-800/50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>1. Daftar Bahan</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeSubTabDaftarBarang === 'bahan'
                  ? 'bg-purple-950 text-amber-300'
                  : 'bg-purple-900 text-purple-200'
              }`}
            >
              {totalBahanCount} Item
            </span>
          </button>

          <button
            onClick={() => setActiveSubTabDaftarBarang('tukang')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
              activeSubTabDaftarBarang === 'tukang'
                ? 'bg-amber-400 text-purple-950 ring-2 ring-amber-300/60 font-extrabold'
                : 'bg-purple-950/60 text-purple-200 hover:bg-purple-900/60 hover:text-white border border-purple-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Daftar Tukang (Absen Harian)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeSubTabDaftarBarang === 'tukang'
                  ? 'bg-purple-950 text-amber-300'
                  : 'bg-purple-900 text-purple-200'
              }`}
            >
              {totalTukangCount} Orang
            </span>
          </button>
        </div>
      </div>

      {/* Render Subtab Component */}
      <div className="print:m-0">
        {activeSubTabDaftarBarang === 'bahan' ? (
          <DaftarBahanTab />
        ) : (
          <DaftarTukangTab />
        )}
      </div>
    </div>
  );
};
