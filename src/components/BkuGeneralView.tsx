import React, { useMemo, useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Pencil,
  Trash2,
  Receipt,
  Calendar,
  Hash,
  Eye,
  CheckCircle2,
  Landmark,
  Wallet,
  FileText,
  BadgePercent,
  Search,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import {
  groupTransactionsByMonthlyBooks,
  getJenisBiaya,
  isTarikTunaiOrSp2d,
} from '../utils/calculations';
import { groupPajakRowsByMonthlyBooks } from '../utils/pajakUtils';
import { formatRupiah } from '../utils/terbilang';
import {
  formatToSlashDate,
  indonesianDateToIso,
  getFirstDateForMonth,
} from '../utils/dateUtils';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';
import { TransactionSelectionBar } from './TransactionSelectionBar';
import { Transaction, PajakRowItem } from '../types';
import { BkuSearchBar, HighlightMatch, SearchActiveBanner } from './BkuSearchBar';
import { matchesTransaction } from '../utils/searchHelpers';

export interface UnifiedBkuItem {
  id: string;
  no: number;
  tanggal: string; // dd/mm/yy or dd/mm/yyyy
  sortDate: string; // YYYY-MM-DD
  uraian: string;
  nomorBukti: string;
  penerimaan: number;
  pengeluaran: number;
  saldo: number;
  source: 'INITIAL' | 'BANK' | 'TUNAI' | 'PAJAK' | 'TARIK_TUNAI';
  isInitial?: boolean;
  isTaxRow?: boolean;
  isTarikTunai?: boolean;
  transaction?: Transaction;
  pajakRow?: PajakRowItem;
}

function extractBuktiNum(noBukti: string | undefined | null): number {
  if (!noBukti) return 999999;
  const match = noBukti.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
}

export const BkuGeneralView: React.FC = () => {
  const {
    profile,
    transactions,
    pajakRows,
    openTransactionModal,
    openNotaModal,
    deleteTransaction,
    setSelectedTransactionForKwitansi,
    setActiveTab,
    openProfileModal,
    openSwapRenumberModal,
    toggleTampilkanTarikTunaiDiBku,
  } = useLpjStore();

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Group transaksi operasional bulanan
  const monthlyGroups = useMemo(
    () => groupTransactionsByMonthlyBooks(transactions, profile),
    [transactions, profile]
  );

  // 2. Group transaksi pajak bulanan untuk digabungkan ke BKU Umum
  const monthlyPajakGroups = useMemo(
    () => groupPajakRowsByMonthlyBooks(pajakRows, transactions, profile, true),
    [pajakRows, transactions, profile]
  );

  // 3. Bangun baris BKU 7 kolom terpadu (Bank, Tunai & Pajak) per bulan
  const computedUnifiedMonthGroups = useMemo(() => {
    let runningCumulativeSaldo = 0;

    return monthlyGroups.map((group, gIdx) => {
      const isFirstMonth = gIdx === 0;
      const prevMonthSaldo = runningCumulativeSaldo;
      const items: UnifiedBkuItem[] = [];

      // A. Baris Sisa Saldo Bulan Lalu jika bukan bulan pertama
      if (!isFirstMonth) {
        const prevGroupName = monthlyGroups[gIdx - 1]?.monthName || '';
        const firstDateStr = getFirstDateForMonth(group.monthName, group.year);
        items.push({
          id: `initial-${group.monthKey}`,
          no: 1,
          tanggal: formatToSlashDate(firstDateStr),
          sortDate: indonesianDateToIso(firstDateStr) || `${group.year}-01-01`,
          uraian: `Sisa Saldo Bulan ${prevGroupName}`,
          nomorBukti: '-',
          penerimaan: prevMonthSaldo,
          pengeluaran: 0,
          saldo: prevMonthSaldo,
          source: 'INITIAL',
          isInitial: true,
        });
      }

      // B. Kumpulkan Baris Pajak Bulan Ini
      const matchingPajakGroup = monthlyPajakGroups.find(
        (pg) => pg.monthKey === group.monthKey
      );
      const taxRowsThisMonth = (matchingPajakGroup?.rows || []).filter(
        (pRow) => pRow.isTax && !pRow.isInitialRow
      );
      const usedTaxRowIds = new Set<string>();

      // C. Urutkan Transaksi Utama Bulan Ini secara Kronologis dan Berurutan Sesuai Nomor Bukti (KW-006, KW-007, KW-008)
      const sortedTransactions = [...group.transactions].sort((a, b) => {
        const dateA = indonesianDateToIso(a.tanggal) || '9999-99-99';
        const dateB = indonesianDateToIso(b.tanggal) || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        // Pada tanggal sama: Penerimaan dana DAK/SP2D masuk lebih dulu
        const isFundingA = a.metode === 'BANK' && (a.jenis === 'PENERIMAAN' || a.penerimaan > 0);
        const isFundingB = b.metode === 'BANK' && (b.jenis === 'PENERIMAAN' || b.penerimaan > 0);
        if (isFundingA && !isFundingB) return -1;
        if (!isFundingA && isFundingB) return 1;

        // Tarik tunai sebelum belanja tunai
        const isTarikA = isTarikTunaiOrSp2d(a);
        const isTarikB = isTarikTunaiOrSp2d(b);
        if (isTarikA && !isTarikB) return -1;
        if (!isTarikA && isTarikB) return 1;

        // Belanja diurutkan secara numerik sesuai No. Bukti (misal KW-006, KW-007, KW-008)
        const numA = extractBuktiNum(a.nomorBukti);
        const numB = extractBuktiNum(b.nomorBukti);
        if (numA !== numB) return numA - numB;

        return a.id.localeCompare(b.id);
      });

      const showTarikTunai = Boolean(profile.tampilkanTarikTunaiDiBku);

      // D. Susun Baris BKU: Setiap belanja KW langsung diikuti pajak pemotongan & penyetoran miliknya
      sortedTransactions.forEach((t) => {
        const isSp2d = isTarikTunaiOrSp2d(t);
        const tDate = formatToSlashDate(t.tanggal);
        const sortDate = indonesianDateToIso(t.tanggal) || '9999-99-99';

        if (isSp2d) {
          const nominal =
            t.penerimaan > 0 ? t.penerimaan : t.pengeluaran > 0 ? t.pengeluaran : 0;
          if (showTarikTunai) {
            // Sisi 1: Pengeluaran dari Rekening Bank (BB-...)
            items.push({
              id: `${t.id}-tarik-bank`,
              no: 0,
              tanggal: tDate,
              sortDate,
              uraian: `Penarikan tunai dari rekening Bank (untuk Kas Tunai)`,
              nomorBukti: t.nomorBukti || 'BB-001',
              penerimaan: 0,
              pengeluaran: nominal,
              saldo: 0,
              source: 'TARIK_TUNAI',
              isTarikTunai: true,
              transaction: t,
            });
            // Sisi 2: Penerimaan di Kas Tunai (SP2D-... / BKT-...)
            items.push({
              id: `${t.id}-masuk-tunai`,
              no: 0,
              tanggal: tDate,
              sortDate,
              uraian: `Penerimaan kas tunai dari penarikan Bank`,
              nomorBukti: t.nomorBukti || 'SP2D-001',
              penerimaan: nominal,
              pengeluaran: 0,
              saldo: 0,
              source: 'TARIK_TUNAI',
              isTarikTunai: true,
              transaction: t,
            });
          }
        } else if (t.metode === 'BANK' && (t.jenis === 'PENERIMAAN' || t.penerimaan > 0)) {
          // Dana Masuk Bank (e.g. SP2D Dana Revitalisasi / DAK Fisik)
          items.push({
            id: t.id,
            no: 0,
            tanggal: tDate,
            sortDate,
            uraian: t.uraian,
            nomorBukti: t.nomorBukti || 'SP2D-001',
            penerimaan: t.penerimaan,
            pengeluaran: 0,
            saldo: 0,
            source: 'BANK',
            transaction: t,
          });
        } else if (t.metode === 'BANK' && (t.jenis === 'PENGELUARAN' || t.pengeluaran > 0)) {
          // Belanja transfer bank (e.g. transfer ke toko/penyedia material BB-...)
          items.push({
            id: t.id,
            no: 0,
            tanggal: tDate,
            sortDate,
            uraian: t.uraian,
            nomorBukti: t.nomorBukti || 'BB-001',
            penerimaan: 0,
            pengeluaran: t.pengeluaran,
            saldo: 0,
            source: 'BANK',
            transaction: t,
          });
        } else if (t.metode === 'TUNAI' && (t.jenis === 'PENGELUARAN' || t.pengeluaran > 0)) {
          // Belanja tunai (e.g. material KW-... / upah tukang KW-...)
          items.push({
            id: t.id,
            no: 0,
            tanggal: tDate,
            sortDate,
            uraian: t.uraian,
            nomorBukti: t.nomorBukti || 'KW-001',
            penerimaan: 0,
            pengeluaran: t.pengeluaran,
            saldo: 0,
            source: 'TUNAI',
            transaction: t,
          });
        } else if (t.metode === 'TUNAI' && (t.jenis === 'PENERIMAAN' || t.penerimaan > 0)) {
          // Penerimaan tunai lainnya
          items.push({
            id: t.id,
            no: 0,
            tanggal: tDate,
            sortDate,
            uraian: t.uraian,
            nomorBukti: t.nomorBukti || 'BKT-001',
            penerimaan: t.penerimaan,
            pengeluaran: 0,
            saldo: 0,
            source: 'TUNAI',
            transaction: t,
          });
        }

        // Tepat di bawah transaksi belanja ini: sisipkan baris pajaknya masing-masing (jangan dipisah)
        const linkedTaxes = taxRowsThisMonth.filter((pRow) => {
          if (usedTaxRowIds.has(pRow.id)) return false;
          if (pRow.linkedTxId && pRow.linkedTxId === t.id) return true;
          if (t.nomorBukti && pRow.nomorBukti && pRow.nomorBukti.trim() === t.nomorBukti.trim()) return true;
          return false;
        });

        if (linkedTaxes.length > 0) {
          // 1. Potongan Pajak (Penerimaan Kas Pajak)
          const potonganList = linkedTaxes.filter((p) => p.penerimaan > 0);
          potonganList.forEach((pRow) => {
            usedTaxRowIds.add(pRow.id);
            const pDate = formatToSlashDate(pRow.tanggal);
            const pSortDate = indonesianDateToIso(pRow.tanggal) || sortDate;
            items.push({
              id: `pjk-in-${pRow.id}`,
              no: 0,
              tanggal: pDate,
              sortDate: pSortDate,
              uraian: pRow.uraian,
              nomorBukti: pRow.nomorBukti || t.nomorBukti || '-',
              penerimaan: pRow.penerimaan,
              pengeluaran: 0,
              saldo: 0,
              source: 'PAJAK',
              isTaxRow: true,
              pajakRow: pRow,
            });
          });

          // 2. Penyetoran Pajak ke Kas Negara via BPN/NTPN (Pengeluaran Kas Pajak)
          const setoranList = linkedTaxes.filter((p) => p.pengeluaran > 0);
          setoranList.forEach((pRow) => {
            usedTaxRowIds.add(pRow.id);
            const pDate = formatToSlashDate(pRow.tanggal);
            const pSortDate = indonesianDateToIso(pRow.tanggal) || sortDate;
            items.push({
              id: `pjk-out-${pRow.id}`,
              no: 0,
              tanggal: pDate,
              sortDate: pSortDate,
              uraian: pRow.uraian,
              nomorBukti: pRow.nomorBukti || 'BPN-001',
              penerimaan: 0,
              pengeluaran: pRow.pengeluaran,
              saldo: 0,
              source: 'PAJAK',
              isTaxRow: true,
              pajakRow: pRow,
            });
          });
        }
      });

      // Sisipkan baris pajak lainnya yang tidak tertaut ke transaksi tertentu jika ada
      const unlinkedTaxes = taxRowsThisMonth.filter((p) => !usedTaxRowIds.has(p.id));
      unlinkedTaxes.forEach((pRow) => {
        const pDate = formatToSlashDate(pRow.tanggal);
        const pSortDate = indonesianDateToIso(pRow.tanggal) || '9999-99-99';
        if (pRow.penerimaan > 0) {
          items.push({
            id: `pjk-in-${pRow.id}`,
            no: 0,
            tanggal: pDate,
            sortDate: pSortDate,
            uraian: pRow.uraian,
            nomorBukti: pRow.nomorBukti || '-',
            penerimaan: pRow.penerimaan,
            pengeluaran: 0,
            saldo: 0,
            source: 'PAJAK',
            isTaxRow: true,
            pajakRow: pRow,
          });
        }
        if (pRow.pengeluaran > 0) {
          items.push({
            id: `pjk-out-${pRow.id}`,
            no: 0,
            tanggal: pDate,
            sortDate: pSortDate,
            uraian: pRow.uraian,
            nomorBukti: pRow.nomorBukti || 'BPN-001',
            penerimaan: 0,
            pengeluaran: pRow.pengeluaran,
            saldo: 0,
            source: 'PAJAK',
            isTaxRow: true,
            pajakRow: pRow,
          });
        }
      });

      const finalRows: UnifiedBkuItem[] = items;

      // E. Hitung Saldo Berjalan Otomatis & Penomoran Baris 1 s/d N
      let runningSaldo = 0;
      let monthTotalPenerimaan = 0;
      let monthTotalPengeluaran = 0;

      finalRows.forEach((row, idx) => {
        row.no = idx + 1;
        if (row.isInitial) {
          runningSaldo = row.penerimaan;
        } else {
          runningSaldo += row.penerimaan - row.pengeluaran;
          monthTotalPenerimaan += row.penerimaan;
          monthTotalPengeluaran += row.pengeluaran;
        }
        row.saldo = runningSaldo;
      });

      runningCumulativeSaldo = runningSaldo;

      const totalPenerimaanSheet = isFirstMonth
        ? monthTotalPenerimaan
        : prevMonthSaldo + monthTotalPenerimaan;
      const totalPengeluaranSheet = monthTotalPengeluaran;
      const saldoAkhirSheet = runningCumulativeSaldo;

      // Sisa saldo pajak yang belum disetor bulan ini jika ada
      const taxSaldoMonth = matchingPajakGroup ? matchingPajakGroup.saldoAkhirPajak : 0;

      return {
        ...group,
        rows: finalRows,
        totalPenerimaanSheet,
        totalPengeluaranSheet,
        saldoAkhirSheet,
        taxSaldoMonth,
      };
    });
  }, [monthlyGroups, monthlyPajakGroups, profile]);

  // Filter pencarian
  const totalMatches = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase().trim();
    let count = 0;
    computedUnifiedMonthGroups.forEach((g) => {
      g.rows.forEach((r) => {
        if (
          r.uraian.toLowerCase().includes(q) ||
          r.nomorBukti.toLowerCase().includes(q) ||
          r.tanggal.includes(q) ||
          (r.transaction && matchesTransaction(r.transaction, q))
        ) {
          count++;
        }
      });
    });
    return count;
  }, [computedUnifiedMonthGroups, searchQuery]);

  const groupsToRender = useMemo(() => {
    if (selectedMonthKey === 'ALL') {
      return computedUnifiedMonthGroups;
    }
    const filtered = computedUnifiedMonthGroups.filter(
      (g) => g.monthKey === selectedMonthKey
    );
    return filtered.length > 0 ? filtered : computedUnifiedMonthGroups;
  }, [computedUnifiedMonthGroups, selectedMonthKey]);

  const handlePrint = () => {
    triggerPrint('Buku Kas Umum (BKU)');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Ribbon - Hidden in Print (Deep Navy + Amber) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1b324d] p-4 rounded-2xl border border-sky-400/30 text-white shadow-lg print:hidden">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            Buku Kas Umum (BKU) — Format Resmi 7 Kolom
          </h2>
          <p className="text-xs text-sky-200/90 mt-0.5">
            Sesuai format resmi: Mencatat seluruh transaksi dari Kas Tunai, Bank, dan Pajak secara kronologis dengan kode bukti dan rumus saldo otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {monthlyGroups.length > 1 && (
            <div className="flex items-center gap-1 bg-[#102236] p-1 rounded-xl border border-sky-400/30">
              <button
                onClick={() => setSelectedMonthKey('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedMonthKey === 'ALL'
                    ? 'bg-amber-400 text-sky-950 shadow-sm'
                    : 'text-sky-200 hover:bg-sky-800'
                }`}
              >
                Semua Bulan ({monthlyGroups.length})
              </button>
              {monthlyGroups.map((g) => (
                <button
                  key={g.monthKey}
                  onClick={() => setSelectedMonthKey(g.monthKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedMonthKey === g.monthKey
                      ? 'bg-amber-400 text-sky-950 shadow-sm'
                      : 'text-sky-200 hover:bg-sky-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {/* Kolom Pencarian BKU */}
          <BkuSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalMatches={totalMatches}
            onClear={() => setSearchQuery('')}
            placeholder="Cari transaksi BKU (uraian, no bukti, nominal)..."
          />

          <button
            onClick={openProfileModal}
            className="flex items-center space-x-1 bg-sky-900/80 hover:bg-sky-800 text-amber-300 border border-sky-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            title="Ganti Profil & Pejabat Penandatangan / Pengaturan Kop"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Pengaturan Kop</span>
          </button>

          <button
            onClick={toggleTampilkanTarikTunaiDiBku}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer border ${
              profile.tampilkanTarikTunaiDiBku
                ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400 shadow-md'
                : 'bg-sky-950/80 hover:bg-sky-900 text-sky-200 border-sky-700/60'
            }`}
            title="Klik untuk Mengaktifkan / Menonaktifkan Transaksi Tarik Tunai di BKU Umum"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                profile.tampilkanTarikTunaiDiBku
                  ? 'bg-amber-300 animate-pulse'
                  : 'bg-sky-400'
              }`}
            />
            <span>
              Tarik Tunai: {profile.tampilkanTarikTunaiDiBku ? 'AKTIF' : 'NON-AKTIF'}
            </span>
          </button>

          <button
            onClick={() => openSwapRenumberModal(undefined, undefined, 'shift')}
            className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-sky-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            title="Ganti nomor BKU, sisipkan kuitansi terlewat, atau tukar nomor BKU otomatis"
          >
            <Hash className="w-4 h-4 text-sky-900" />
            <span>Ganti & Urutkan BKU</span>
          </button>

          <button
            onClick={() => openTransactionModal()}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-sky-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Transaksi</span>
          </button>

          <button
            onClick={() => exportLpjToExcel(profile, transactions)}
            className="flex items-center space-x-1.5 bg-sky-900/80 hover:bg-sky-800 text-amber-300 border border-sky-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-700 text-xs font-medium px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Cetak BKU</span>
          </button>
        </div>
      </div>

      {/* Banner Filter Pencarian Aktif */}
      <SearchActiveBanner
        query={searchQuery}
        totalMatches={totalMatches}
        onClear={() => setSearchQuery('')}
        label="transaksi BKU"
      />

      {/* Render Lembar BKU Bulanan */}
      {groupsToRender.map((group, gIdx) => {
        const isSearching = Boolean(searchQuery.trim());
        const displayRows = isSearching
          ? group.rows.filter((r) => {
              const q = searchQuery.toLowerCase().trim();
              return (
                r.uraian.toLowerCase().includes(q) ||
                r.nomorBukti.toLowerCase().includes(q) ||
                r.tanggal.includes(q) ||
                (r.transaction && matchesTransaction(r.transaction, q))
              );
            })
          : group.rows;

        return (
          <div
            key={group.monthKey}
            className={`bg-white rounded-xl shadow-sm border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full text-black sheet-paper ${
              gIdx > 0 ? 'mt-8 print:mt-0 print:break-before-page' : ''
            }`}
          >
            {/* Kop Judul Laporan Sesuai Screenshot */}
            <div className="text-center space-y-1 mb-5 text-black">
              <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                BUKU KAS UMUM
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-black">
                Bulan : {group.label}
              </p>
            </div>

            {/* Tabel BKU Format 7 Kolom Kronologis Sesuai Screenshot & Bimtek */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-black text-black font-sans">
                <thead>
                  {/* Header 7 Kolom Sesuai Screenshot 2026-11-11 055259 */}
                  <tr className="bg-[#1e5373] text-white font-bold text-center">
                    <th className="border border-black py-2.5 px-2 w-12 text-center text-white font-bold">
                      No
                    </th>
                    <th className="border border-black py-2.5 px-2 w-24 text-center text-white font-bold whitespace-nowrap">
                      Tanggal
                    </th>
                    <th className="border border-black py-2.5 px-3 text-left text-white font-bold min-w-[240px]">
                      Uraian
                    </th>
                    <th className="border border-black py-2.5 px-2 w-24 text-center text-white font-bold whitespace-nowrap">
                      No. Bukti
                    </th>
                    <th className="border border-black py-2.5 px-2 w-36 text-right text-white font-bold whitespace-nowrap">
                      Penerimaan (Rp)
                    </th>
                    <th className="border border-black py-2.5 px-2 w-36 text-right text-white font-bold whitespace-nowrap">
                      Pengeluaran (Rp)
                    </th>
                    <th className="border border-black py-2.5 px-2 w-36 text-right text-white font-bold whitespace-nowrap">
                      Saldo
                    </th>
                    <th className="border border-black py-2.5 px-1 w-20 text-center print:hidden bg-[#102236] text-white font-medium text-[11px]">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {isSearching && displayRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="border border-black py-8 text-center text-slate-500 italic bg-amber-50/40"
                      >
                        Tidak ada transaksi pada bulan {group.label} yang cocok dengan kata kunci "{searchQuery}"
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((item) => {
                      const isTax = item.isTaxRow;
                      const isInitial = item.isInitial;
                      const isTarik = item.isTarikTunai;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-sky-50/40 transition text-black font-sans"
                        >
                          {/* Kolom 1: No */}
                          <td className="border border-black py-1.5 px-2 text-center font-medium">
                            {item.no}
                          </td>

                          {/* Kolom 2: Tanggal (dd/mm/yy) */}
                          <td className="border border-black py-1.5 px-2 text-center whitespace-nowrap font-mono">
                            <HighlightMatch text={item.tanggal} query={searchQuery} />
                          </td>

                          {/* Kolom 3: Uraian */}
                          <td className="border border-black py-1.5 px-3 text-left">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={
                                    isInitial
                                      ? 'font-bold italic text-sky-950'
                                      : 'font-medium text-black'
                                  }
                                >
                                  <HighlightMatch text={item.uraian} query={searchQuery} />
                                </span>

                                {isTarik && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 print:border-black print:text-black">
                                    Tarik Tunai
                                  </span>
                                )}

                                {isTax && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 print:border-black print:text-black">
                                    Pajak
                                  </span>
                                )}

                                {item.source === 'BANK' && !isTax && !isInitial && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300 print:hidden">
                                    Bank
                                  </span>
                                )}
                              </div>

                              {/* Tombol Item Nota Belanja */}
                              {item.transaction?.subItems && item.transaction.subItems.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openNotaModal(item.transaction!)}
                                  className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 hover:border-amber-400 transition shrink-0 print:hidden cursor-pointer flex items-center gap-1 shadow-xs group active:scale-95"
                                  title="Klik untuk melihat rincian barang belanja nota ini"
                                >
                                  <Eye className="w-3 h-3 text-amber-800 group-hover:text-black transition" />
                                  <span>{item.transaction.subItems.length} item nota</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Kolom 4: No. Bukti */}
                          <td className="border border-black py-1.5 px-2 text-center font-mono font-bold whitespace-nowrap">
                            <HighlightMatch text={item.nomorBukti} query={searchQuery} />
                          </td>

                          {/* Kolom 5: Penerimaan (Rp) */}
                          <td className="border border-black py-1.5 px-2 text-right font-mono font-bold whitespace-nowrap bg-sky-50/20">
                            {item.penerimaan > 0 ? formatRupiah(item.penerimaan, false) : ''}
                          </td>

                          {/* Kolom 6: Pengeluaran (Rp) */}
                          <td className="border border-black py-1.5 px-2 text-right font-mono font-bold whitespace-nowrap">
                            {item.pengeluaran > 0 ? formatRupiah(item.pengeluaran, false) : ''}
                          </td>

                          {/* Kolom 7: Saldo (Warna hijau persis screenshot) */}
                          <td className="border border-black py-1.5 px-2 text-right font-mono font-bold whitespace-nowrap bg-[#e2f0d9]">
                            {formatRupiah(item.saldo, false)}
                          </td>

                          {/* Kolom Aksi (Screen Only) */}
                          <td className="border border-black py-1.5 px-1 text-center print:hidden">
                            {item.transaction ? (
                              <div className="flex items-center justify-center space-x-1">
                                {item.transaction.pengeluaran > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedTransactionForKwitansi(item.transaction!.id);
                                      setActiveTab('kwitansi');
                                    }}
                                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer"
                                    title="Cetak Kwitansi"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openTransactionModal(item.transaction)}
                                  className="p-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                  title="Edit Baris"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Hapus transaksi "${item.uraian}"?`)) {
                                      deleteTransaction(item.transaction!.id);
                                    }
                                  }}
                                  className="p-1 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : item.isTaxRow ? (
                              <button
                                onClick={() => setActiveTab('bku-pajak')}
                                className="text-[10px] text-purple-700 hover:text-purple-900 font-bold underline px-1 py-0.5 rounded cursor-pointer"
                                title="Buka di BKU Pembantu Pajak"
                              >
                                BKU Pajak
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Baris Bawah: JUMLAH Sesuai Screenshot */}
                  <tr className="font-bold text-black bg-white">
                    <td
                      colSpan={3}
                      className="border border-black py-2 px-3 text-center font-bold text-black uppercase tracking-wider"
                    >
                      Jumlah
                    </td>
                    <td className="border border-black py-2 px-2 text-center font-mono"></td>
                    <td className="border border-black py-2 px-2 text-right font-mono font-bold text-black bg-sky-50/40">
                      {formatRupiah(group.totalPenerimaanSheet, false)}
                    </td>
                    <td className="border border-black py-2 px-2 text-right font-mono font-bold text-black">
                      {formatRupiah(group.totalPengeluaranSheet, false)}
                    </td>
                    <td className="border border-black py-2 px-2 text-right font-mono font-bold text-black bg-[#e2f0d9]">
                      {formatRupiah(group.saldoAkhirSheet, false)}
                    </td>
                    <td className="border border-black py-2 px-1 print:hidden bg-slate-100"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian Bawah: Penutupan Kas Sesuai Format Kotak & Bimtek Slide 22 */}
            <div className="mt-6 text-xs text-black space-y-2 font-sans break-inside-avoid">
              <p className="font-normal text-black">
                Pada hari ini :{' '}
                <strong className="font-bold">
                  {group.tanggalTutupBuku.split(',')[0] || 'Senin'}
                </strong>{' '}
                Tanggal <strong className="font-bold">{group.tanggalTutupBuku}</strong>{' '}
                Buku Kas Umum ditutup dengan keadaan/posisi Buku sebagai berikut :
              </p>

              <table className="w-full max-w-xl border-collapse border border-black text-xs font-sans mt-2">
                <tbody>
                  <tr className="border border-black">
                    <td className="border border-black py-1.5 px-3 font-bold w-3/5 text-black">
                      Saldo Buku Kas Umum
                    </td>
                    <td className="border border-black py-1.5 px-3 font-mono font-bold text-right w-2/5 text-black bg-[#e2f0d9]/40">
                      Rp {formatRupiah(group.saldoAkhirSheet, false)}
                    </td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black py-2 px-3 text-black">
                      <div className="font-bold mb-1">Terdiri dari :</div>
                      <div className="flex justify-between pl-3 py-0.5 font-medium">
                        <span>1. Saldo Bank</span>
                        <span className="font-mono">
                          : Rp {formatRupiah(group.summary.saldoBank, false)}
                        </span>
                      </div>
                      <div className="flex justify-between pl-3 py-0.5 font-medium">
                        <span>2. Saldo Kas Tunai</span>
                        <span className="font-mono">
                          : Rp {formatRupiah(group.summary.saldoTunai, false)}
                        </span>
                      </div>
                      {group.taxSaldoMonth !== 0 && (
                        <div className="flex justify-between pl-3 py-0.5 font-medium text-purple-900">
                          <span>3. Saldo Pajak (Belum Disetor)</span>
                          <span className="font-mono">
                            : Rp {formatRupiah(group.taxSaldoMonth, false)}
                          </span>
                        </div>
                      )}
                      <div className="italic text-[11px] text-slate-700 pl-3 pt-1">
                        (diisi penjumlahan saldo bank, saldo kas tunai
                        {group.taxSaldoMonth !== 0 ? ', dan saldo kas pajak' : ''})
                      </div>
                    </td>
                    <td className="border border-black py-2 px-3 font-mono font-bold text-right align-bottom text-black">
                      Rp{' '}
                      {formatRupiah(
                        group.summary.saldoBank +
                          group.summary.saldoTunai +
                          group.taxSaldoMonth,
                        false
                      )}
                    </td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black py-1.5 px-3 font-bold text-black">
                      Perbedaan
                    </td>
                    <td className="border border-black py-1.5 px-3 font-mono font-bold text-right text-black font-semibold text-emerald-800">
                      {group.saldoAkhirSheet -
                        (group.summary.saldoBank +
                          group.summary.saldoTunai +
                          group.taxSaldoMonth) ===
                      0
                        ? 'Rp 0 (Nihil / Cocok)'
                        : `Rp ${formatRupiah(
                            group.saldoAkhirSheet -
                              (group.summary.saldoBank +
                                group.summary.saldoTunai +
                                group.taxSaldoMonth),
                            false
                          )}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Kolom 3 Tanda Tangan: Mengetahui Kepala Sekolah, Ketua P2S, Bendahara */}
            <div className="mt-8 text-xs text-black break-inside-avoid">
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Kiri: Mengetahui Kepala Sekolah */}
                <div className="flex flex-col justify-between h-36">
                  <div>
                    <p className="font-normal text-black">Mengetahui,</p>
                    <p className="font-bold text-black">
                      Kepala {profile.namaSekolah || 'Sekolah'}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase text-black">
                      {profile.namaKepalaSekolah}
                    </p>
                    <p className="font-mono text-black font-semibold">
                      NIP. {profile.nipKepalaSekolah}
                    </p>
                  </div>
                </div>

                {/* Tengah: Ketua P2S */}
                <div className="flex flex-col justify-between h-36">
                  <div>
                    <p className="font-bold text-black">Ketua P2S</p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase text-black">
                      {profile.namaKetuaP2S ||
                        profile.namaPanitia ||
                        'Nama Ketua P2S'}
                    </p>
                  </div>
                </div>

                {/* Kanan: Tanggal & Bendahara */}
                <div className="flex flex-col justify-between h-36">
                  <div>
                    <p className="font-normal text-black">
                      {profile.tempatPelunasan ||
                        profile.kabupaten ||
                        'Palasa'}
                      , {group.tanggalTutupBuku}
                    </p>
                    <p className="font-bold text-black">Bendahara</p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase text-black">
                      {profile.namaBendahara}
                    </p>
                    <p className="font-mono text-black font-semibold">
                      NIP. {profile.nipBendahara}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Selection Bar for bulk operations */}
      <TransactionSelectionBar
        selectedIds={selectedTxIds}
        onClearSelection={() => setSelectedTxIds([])}
        transactionsInCurrentView={transactions}
      />
    </div>
  );
};
