import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ActiveTab,
  ProjectProfile,
  Transaction,
  TransactionJenis,
  TransactionMetode,
  SubTabDaftarBarang,
  AbsenMingguanTukang,
  CustomBahanItem,
  HariKerjaRecord,
  PekerjaTukang,
  KategoriPekerja,
  BangunanProyek,
} from '../types';
import {
  INITIAL_PROFILE,
  INITIAL_TRANSACTIONS,
  sortTransactionsChronologically,
} from '../utils/calculations';
import { getClosingDateForMonth, extractMonthAndYear, BULAN_LIST, indonesianDateToIso } from '../utils/dateUtils';
import { parseBkuNumber, formatBkuNumber, getHarmonizedDateForBku } from '../utils/bkuUtils';
import {
  INITIAL_ABSEN_DATA,
  DEFAULT_ABSEN_MINGGU_2,
  DEFAULT_ABSEN_MINGGU_4,
  INITIAL_BANGUNAN_LIST,
} from '../utils/bahanTukangUtils';

export interface ModalPreset {
  metode?: TransactionMetode;
  jenis?: TransactionJenis;
  withSubItems?: boolean;
  uraian?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  actionDownloadName?: string;
}

interface LpjState {
  profile: ProjectProfile;
  transactions: Transaction[];
  activeTab: ActiveTab;
  selectedTransactionIdForKwitansi: string | null;
  selectedMonthFilter: string; // 'ALL' or e.g. 'Agustus 2026', 'September 2026'
  isTransactionModalOpen: boolean;
  isProfileModalOpen: boolean;
  transactionToEdit: Transaction | null;
  modalPreset: ModalPreset | null;

  // Modal Tukar & Urutkan Ulang Nomor BKU
  isSwapRenumberModalOpen: boolean;
  swapRenumberInitialTxIds: [string, string] | null;
  swapRenumberDefaultTab?: 'shift' | 'swap' | 'renumber' | null;

  // Bangunan Proyek & Daftar Barang/Belanja State
  bangunanList: BangunanProyek[];
  selectedBangunanId: string;
  activeSubTabDaftarBarang: SubTabDaftarBarang;
  absenTukangList: AbsenMingguanTukang[];
  selectedAbsenWeekId: string;
  formatRekapTukang: '1_minggu' | '2_minggu';
  selectedSubWeek: 1 | 2;
  customBahanList: CustomBahanItem[];

  // Print & Toast States
  isPrintModalOpen: boolean;
  printModalDocTitle: string;
  toast: ToastNotification | null;

  // Actions
  setProfile: (profile: Partial<ProjectProfile>) => void;
  setSelectedMonthFilter: (filter: string) => void;
  setReportingMonth: (bulan: string, tahun: string) => void;
  addTransaction: (
    tx: Omit<Transaction, 'id' | 'createdAt'>,
    options?: { shiftSubsequentBku?: boolean }
  ) => void;
  updateTransaction: (
    id: string,
    tx: Partial<Transaction>,
    options?: { shiftSubsequentBku?: boolean }
  ) => void;
  deleteTransaction: (id: string) => void;
  deleteMultipleTransactions: (ids: string[]) => void;
  moveTransaction: (id: string, direction: 'up' | 'down', swapNomorBukti?: boolean) => void;
  swapTransactionNomorBukti: (
    idA: string,
    idB: string,
    options?: { swapDates?: boolean; swapPositions?: boolean }
  ) => void;
  insertAndShiftBku: (params: {
    targetTxId: string;
    newNomorBukti: string;
    shiftSubsequent?: boolean;
    sortChronologically?: boolean;
    autoHarmonizeDate?: boolean;
  }) => void;
  harmonizeAllBkuDates: () => void;
  renumberBku: (params?: {
    prefix?: string;
    startNumber?: number;
    padDigits?: number;
    monthKey?: string;
    onlyExpenses?: boolean;
  }) => void;
  openSwapRenumberModal: (
    txIdA?: string,
    txIdB?: string,
    defaultTab?: 'shift' | 'swap' | 'renumber'
  ) => void;
  closeSwapRenumberModal: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedTransactionForKwitansi: (id: string) => void;
  openTransactionModal: (tx?: Transaction, preset?: ModalPreset) => void;
  closeTransactionModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  openPrintModal: (docTitle?: string) => void;
  closePrintModal: () => void;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  clearToast: () => void;
  resetToInitialData: () => void;

  // Actions untuk Bangunan Proyek
  setSelectedBangunanId: (id: string) => void;
  addBangunan: (
    nama: string,
    keterangan?: string,
    lokasi?: string,
    copyWorkersFromBangunanId?: string
  ) => string;
  updateBangunan: (id: string, updates: Partial<BangunanProyek>) => void;
  deleteBangunan: (id: string) => void;

  // Actions untuk Daftar Barang & Absen Tukang
  setActiveSubTabDaftarBarang: (subTab: SubTabDaftarBarang) => void;
  setSelectedAbsenWeekId: (id: string) => void;
  setFormatRekapTukang: (fmt: '1_minggu' | '2_minggu') => void;
  setSelectedSubWeek: (subWeek: 1 | 2) => void;
  toggleHariLibur: (absenId: string, day: keyof HariKerjaRecord) => void;
  setAllWorkersDayAttendance: (
    absenId: string,
    day: keyof HariKerjaRecord,
    val: number
  ) => void;
  updateAbsenMingguanHeader: (
    id: string,
    updated: Partial<Omit<AbsenMingguanTukang, 'pekerja'>>
  ) => void;
  updatePekerjaAttendance: (
    absenId: string,
    pekerjaId: string,
    day: keyof HariKerjaRecord,
    val: number
  ) => void;
  addPekerjaToAbsen: (
    absenId: string,
    kategori: KategoriPekerja,
    nama: string,
    upahHarian: number,
    tenagaKerja?: string
  ) => void;
  updatePekerjaInfo: (
    absenId: string,
    pekerjaId: string,
    updated: Partial<PekerjaTukang>
  ) => void;
  deletePekerjaFromAbsen: (absenId: string, pekerjaId: string) => void;
  addNewAbsenWeek: (weekNum: number, tanggal?: string, targetBangunanId?: string) => void;
  addCustomBahan: (item: Omit<CustomBahanItem, 'id'>) => void;
  deleteCustomBahan: (id: string) => void;
}

export const useLpjStore = create<LpjState>()(
  persist(
    (set) => ({
      profile: INITIAL_PROFILE,
      transactions: INITIAL_TRANSACTIONS,
      activeTab: 'dashboard',
      selectedTransactionIdForKwitansi: 'tx-15', // Defaults to BKU 38
      selectedMonthFilter: 'ALL',
      isTransactionModalOpen: false,
      isProfileModalOpen: false,
      transactionToEdit: null,
      modalPreset: null,
      isSwapRenumberModalOpen: false,
      swapRenumberInitialTxIds: null,
      swapRenumberDefaultTab: 'shift',

      // State Bangunan & Daftar Barang/Belanja
      bangunanList: INITIAL_BANGUNAN_LIST,
      selectedBangunanId: 'bangunan-1',
      activeSubTabDaftarBarang: 'bahan',
      absenTukangList: INITIAL_ABSEN_DATA,
      selectedAbsenWeekId: 'absen-minggu-4',
      formatRekapTukang: '2_minggu',
      selectedSubWeek: 1,
      customBahanList: [],

      isPrintModalOpen: false,
      printModalDocTitle: 'Buku Kas Umum (BKU)',
      toast: null,

      setProfile: (updatedProfile) =>
        set((state) => {
          const nextProfile = { ...state.profile, ...updatedProfile };
          return {
            profile: nextProfile,
            // Sync school and signatories to all absen periods
            absenTukangList: state.absenTukangList.map((week) => ({
              ...week,
              namaSekolah: nextProfile.namaSekolah,
              namaKepalaSekolah: nextProfile.namaKepalaSekolah,
              nipKepalaSekolah: nextProfile.nipKepalaSekolah,
              namaBendahara: nextProfile.namaBendahara,
              nipBendahara: nextProfile.nipBendahara,
            })),
          };
        }),

      setSelectedMonthFilter: (filter) =>
        set({ selectedMonthFilter: filter }),

      setReportingMonth: (bulan, tahun) =>
        set((state) => {
          const bulanUpper = bulan.toUpperCase();
          const bulanLaporan = `${bulanUpper} ${tahun}`;
          const tanggalTutupBuku = getClosingDateForMonth(bulan, tahun);
          return {
            profile: {
              ...state.profile,
              bulanLaporan,
              tahunAnggaran: tahun,
              tanggalTutupBuku,
            },
            selectedMonthFilter: bulanLaporan,
          };
        }),

      addTransaction: (newTxData, options) =>
        set((state) => {
          const newTx: Transaction = {
            ...newTxData,
            id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            createdAt: new Date().toISOString(),
          };

          let currentTxs = [...state.transactions];

          if (options?.shiftSubsequentBku && newTx.nomorBukti) {
            const parsed = parseBkuNumber(newTx.nomorBukti);
            if (parsed) {
              const targetNum = parsed.num;
              const prefix = parsed.prefix || 'BKU ';
              const padLength = Math.max(parsed.padLength, 2);

              currentTxs = currentTxs.map((t) => {
                const p = parseBkuNumber(t.nomorBukti || '');
                if (p && p.num >= targetNum) {
                  const nextNum = p.num + 1;
                  const newNo = formatBkuNumber(
                    nextNum,
                    p.prefix || prefix,
                    Math.max(p.padLength, padLength),
                    p.suffix
                  );
                  return { ...t, nomorBukti: newNo };
                }
                return t;
              });
            }
          }

          const allTxs = sortTransactionsChronologically([...currentTxs, newTx]);

          return {
            transactions: allTxs,
            isTransactionModalOpen: false,
            transactionToEdit: null,
          };
        }),

      updateTransaction: (id, updatedData, options) =>
        set((state) => {
          let currentTxs = [...state.transactions];

          if (options?.shiftSubsequentBku && updatedData.nomorBukti) {
            const parsed = parseBkuNumber(updatedData.nomorBukti);
            if (parsed) {
              const targetNum = parsed.num;
              const prefix = parsed.prefix || 'BKU ';
              const padLength = Math.max(parsed.padLength, 2);

              currentTxs = currentTxs.map((t) => {
                if (t.id === id) return t;
                const p = parseBkuNumber(t.nomorBukti || '');
                if (p && p.num >= targetNum) {
                  const nextNum = p.num + 1;
                  const newNo = formatBkuNumber(
                    nextNum,
                    p.prefix || prefix,
                    Math.max(p.padLength, padLength),
                    p.suffix
                  );
                  return { ...t, nomorBukti: newNo };
                }
                return t;
              });
            }
          }

          const updatedList = currentTxs.map((tx) =>
            tx.id === id ? { ...tx, ...updatedData } : tx
          );

          const allTxs = sortTransactionsChronologically(updatedList);

          return {
            transactions: allTxs,
            isTransactionModalOpen: false,
            transactionToEdit: null,
          };
        }),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
          selectedTransactionIdForKwitansi:
            state.selectedTransactionIdForKwitansi === id
              ? state.transactions.find((tx) => tx.id !== id)?.id || null
              : state.selectedTransactionIdForKwitansi,
        })),

      deleteMultipleTransactions: (ids) =>
        set((state) => {
          const idSet = new Set(ids);
          const remaining = state.transactions.filter((tx) => !idSet.has(tx.id));
          const nextSelectedKwitansi = idSet.has(state.selectedTransactionIdForKwitansi || '')
            ? remaining.find((tx) => tx.pengeluaran > 0)?.id || null
            : state.selectedTransactionIdForKwitansi;

          return {
            transactions: remaining,
            selectedTransactionIdForKwitansi: nextSelectedKwitansi,
          };
        }),

      moveTransaction: (id, direction, swapNomorBukti = true) =>
        set((state) => {
          const currentIndex = state.transactions.findIndex((t) => t.id === id);
          if (currentIndex === -1) return state;

          const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
          if (targetIndex < 0 || targetIndex >= state.transactions.length) {
            return state;
          }

          const currentTx = state.transactions[currentIndex];
          const targetTx = state.transactions[targetIndex];
          const newTransactions = [...state.transactions];

          if (swapNomorBukti) {
            const tempNo = currentTx.nomorBukti;
            const targetNo = targetTx.nomorBukti;
            const tempTanggal = currentTx.tanggal;
            const targetTanggal = targetTx.tanggal;
            const shouldSwapDate = tempTanggal !== targetTanggal;

            newTransactions[currentIndex] = {
              ...targetTx,
              nomorBukti: tempNo,
              tanggal: shouldSwapDate ? tempTanggal : targetTx.tanggal,
            };
            newTransactions[targetIndex] = {
              ...currentTx,
              nomorBukti: targetNo,
              tanggal: shouldSwapDate ? targetTanggal : currentTx.tanggal,
            };
          } else {
            newTransactions[currentIndex] = targetTx;
            newTransactions[targetIndex] = currentTx;
          }

          return { transactions: newTransactions };
        }),

      swapTransactionNomorBukti: (idA, idB, options) =>
        set((state) => {
          const idxA = state.transactions.findIndex((t) => t.id === idA);
          const idxB = state.transactions.findIndex((t) => t.id === idB);
          if (idxA === -1 || idxB === -1) return state;

          const txA = state.transactions[idxA];
          const txB = state.transactions[idxB];
          const swapDates = options?.swapDates ?? false;
          const swapPositions = options?.swapPositions ?? true;

          const newTxA = {
            ...txA,
            nomorBukti: txB.nomorBukti,
            tanggal: swapDates ? txB.tanggal : txA.tanggal,
          };
          const newTxB = {
            ...txB,
            nomorBukti: txA.nomorBukti,
            tanggal: swapDates ? txA.tanggal : txB.tanggal,
          };

          const newTransactions = [...state.transactions];

          if (swapPositions) {
            newTransactions[idxA] = newTxB;
            newTransactions[idxB] = newTxA;
          } else {
            newTransactions[idxA] = newTxA;
            newTransactions[idxB] = newTxB;
          }

          return { transactions: newTransactions };
        }),

      insertAndShiftBku: ({
        targetTxId,
        newNomorBukti,
        shiftSubsequent = true,
        sortChronologically = true,
        autoHarmonizeDate = false,
      }) =>
        set((state) => {
          const targetTx = state.transactions.find((t) => t.id === targetTxId);
          if (!targetTx) return state;

          const parsed = parseBkuNumber(newNomorBukti);
          if (!parsed) {
            const updated = state.transactions.map((t) =>
              t.id === targetTxId ? { ...t, nomorBukti: newNomorBukti } : t
            );
            return {
              transactions: sortChronologically
                ? sortTransactionsChronologically(updated)
                : updated,
            };
          }

          const targetNum = parsed.num;
          const prefix = parsed.prefix || 'BKU ';
          const padLength = Math.max(parsed.padLength, 2);
          const suffix = parsed.suffix || '';
          const formattedTargetNo = formatBkuNumber(targetNum, prefix, padLength, suffix);

          let updatedList = state.transactions.map((t) => {
            if (t.id === targetTxId) {
              return { ...t, nomorBukti: formattedTargetNo };
            }
            if (shiftSubsequent) {
              const p = parseBkuNumber(t.nomorBukti || '');
              if (p && p.num >= targetNum) {
                const nextNum = p.num + 1;
                const nextNo = formatBkuNumber(
                  nextNum,
                  p.prefix || prefix,
                  Math.max(p.padLength, padLength),
                  p.suffix
                );
                return { ...t, nomorBukti: nextNo };
              }
            }
            return t;
          });

          if (autoHarmonizeDate) {
            const harmonizedDate = getHarmonizedDateForBku(
              state.transactions.filter((t) => t.id !== targetTxId),
              targetNum,
              targetTx.tanggal
            );
            updatedList = updatedList.map((t) =>
              t.id === targetTxId ? { ...t, tanggal: harmonizedDate } : t
            );
          }

          if (sortChronologically) {
            updatedList = sortTransactionsChronologically(updatedList);
          }

          return { transactions: updatedList };
        }),

      harmonizeAllBkuDates: () =>
        set((state) => {
          // Sort by BKU sequence
          const sorted = sortTransactionsChronologically(state.transactions);
          let lastIso = '0000-00-00';
          let lastDateStr = '';

          const harmonized = sorted.map((tx) => {
            const parsed = parseBkuNumber(tx.nomorBukti || '');
            if (!parsed) {
              const currentIso = indonesianDateToIso(tx.tanggal) || '9999-99-99';
              if (currentIso > lastIso) {
                lastIso = currentIso;
                lastDateStr = tx.tanggal;
              }
              return tx;
            }

            const currentIso = indonesianDateToIso(tx.tanggal) || '9999-99-99';
            // If current date is backwards compared to preceding BKU in the sequence,
            // harmonize forward so dates never regress!
            if (currentIso < lastIso && lastDateStr) {
              return { ...tx, tanggal: lastDateStr };
            }

            lastIso = currentIso;
            lastDateStr = tx.tanggal;
            return tx;
          });

          return { transactions: sortTransactionsChronologically(harmonized) };
        }),

      renumberBku: (params) =>
        set((state) => {
          const prefix = params?.prefix !== undefined ? params.prefix : 'BKU ';
          const startNumber = params?.startNumber !== undefined ? params.startNumber : 1;
          const padDigits = params?.padDigits !== undefined ? params.padDigits : 2;
          const monthKey = params?.monthKey;
          const onlyExpenses = params?.onlyExpenses !== false;

          let counter = startNumber;
          const sorted = sortTransactionsChronologically(state.transactions);
          const updatedMap = new Map<string, string>();

          sorted.forEach((tx) => {
            if (monthKey && monthKey !== 'ALL') {
              const my = extractMonthAndYear(tx.tanggal);
              const monthName = my?.month || 'Agustus';
              const year = my?.year || 2026;
              const monthIdx = BULAN_LIST.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
              const padMonth = String(monthIdx >= 0 ? monthIdx + 1 : 8).padStart(2, '0');
              const txMonthKey = `${year}-${padMonth}`;
              if (txMonthKey !== monthKey) return;
            }

            const isExpense = tx.pengeluaran > 0 && tx.metode !== 'TARIK_TUNAI';
            const hasExistingNo = Boolean(tx.nomorBukti && tx.nomorBukti.trim().length > 0);

            if ((onlyExpenses && isExpense) || (!onlyExpenses && hasExistingNo)) {
              const numStr = String(counter).padStart(padDigits, '0');
              const newNo = `${prefix}${numStr}`;
              updatedMap.set(tx.id, newNo);
              counter++;
            }
          });

          const newTransactions = sortTransactionsChronologically(
            state.transactions.map((tx) => {
              if (updatedMap.has(tx.id)) {
                return { ...tx, nomorBukti: updatedMap.get(tx.id)! };
              }
              return tx;
            })
          );

          return { transactions: newTransactions };
        }),

      openSwapRenumberModal: (txIdA, txIdB, defaultTab) =>
        set({
          isSwapRenumberModalOpen: true,
          swapRenumberInitialTxIds:
            txIdA && txIdB ? [txIdA, txIdB] : txIdA ? [txIdA, ''] : null,
          swapRenumberDefaultTab: defaultTab || (txIdA && !txIdB ? 'shift' : txIdA && txIdB ? 'swap' : 'shift'),
        }),

      closeSwapRenumberModal: () =>
        set({
          isSwapRenumberModalOpen: false,
          swapRenumberInitialTxIds: null,
        }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setSelectedTransactionForKwitansi: (id) =>
        set({ selectedTransactionIdForKwitansi: id }),

      openTransactionModal: (tx, preset) =>
        set({
          isTransactionModalOpen: true,
          transactionToEdit: tx || null,
          modalPreset: preset || null,
        }),

      closeTransactionModal: () =>
        set({
          isTransactionModalOpen: false,
          transactionToEdit: null,
          modalPreset: null,
        }),

      openProfileModal: () => set({ isProfileModalOpen: true }),
      closeProfileModal: () => set({ isProfileModalOpen: false }),

      openPrintModal: (docTitle) =>
        set((state) => ({
          isPrintModalOpen: true,
          printModalDocTitle:
            docTitle ||
            (state.activeTab === 'bku'
              ? 'Buku Kas Umum (BKU)'
              : state.activeTab === 'bku-tunai'
              ? 'Buku Kas Tunai (BKU Tunai)'
              : state.activeTab === 'bk-bank'
              ? 'Buku Kas Bank (BK Bank)'
              : state.activeTab === 'kwitansi'
              ? 'Kwitansi Pengeluaran'
              : 'Laporan Pertanggungjawaban DAK Fisik'),
        })),

      closePrintModal: () => set({ isPrintModalOpen: false }),

      showToast: (toastData) =>
        set({
          toast: {
            ...toastData,
            id: `toast-${Date.now()}`,
          },
        }),

      clearToast: () => set({ toast: null }),

      resetToInitialData: () =>
        set({
          profile: INITIAL_PROFILE,
          transactions: INITIAL_TRANSACTIONS,
          selectedTransactionIdForKwitansi: 'tx-15',
          bangunanList: INITIAL_BANGUNAN_LIST,
          selectedBangunanId: 'bangunan-1',
          absenTukangList: INITIAL_ABSEN_DATA,
          selectedAbsenWeekId: 'absen-minggu-4',
          customBahanList: [],
        }),

      // Reducer Bangunan Proyek
      setSelectedBangunanId: (id) =>
        set((state) => {
          const weeksForBangunan = state.absenTukangList.filter(
            (w) => (w.bangunanId || 'bangunan-1') === id
          );
          return {
            selectedBangunanId: id,
            selectedAbsenWeekId: weeksForBangunan[0]?.id || state.selectedAbsenWeekId,
          };
        }),

      addBangunan: (nama, keterangan, lokasi, copyWorkersFromBangunanId) => {
        let newId = '';
        set((state) => {
          const count = state.bangunanList.length + 1;
          newId = `bangunan-${Date.now()}`;
          const newBangunan: BangunanProyek = {
            id: newId,
            nama: nama.trim(),
            kode: `BG-${String(count).padStart(2, '0')}`,
            keterangan: keterangan?.trim() || `Pekerjaan ${nama.trim()}`,
            lokasi:
              lokasi?.trim() ||
              `${state.profile.alamat || ''}, ${state.profile.kabupaten || ''}`,
            createdAt: new Date().toISOString(),
          };

          // Ambil daftar pekerja tukang dari donor atau default
          let donorWorkers: PekerjaTukang[] = [];
          if (copyWorkersFromBangunanId) {
            const donorWeek = state.absenTukangList.find(
              (w) => (w.bangunanId || 'bangunan-1') === copyWorkersFromBangunanId
            );
            if (donorWeek && donorWeek.pekerja && donorWeek.pekerja.length > 0) {
              donorWorkers = donorWeek.pekerja;
            }
          }
          if (donorWorkers.length === 0) {
            donorWorkers = DEFAULT_ABSEN_MINGGU_4.pekerja;
          }

          const clonedPekerja: PekerjaTukang[] = donorWorkers.map((p, idx) => ({
            ...p,
            id: `pkr-${newId}-${idx + 1}-${Date.now()}`,
            hariKerja: { minggu: 1, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
            paraf: `${idx + 1}`,
          }));

          const firstWeekId = `absen-${newId}-m1-${Date.now()}`;
          const firstWeek: AbsenMingguanTukang = {
            id: firstWeekId,
            bangunanId: newId,
            proyek: newBangunan.nama,
            namaSekolah: state.profile.namaSekolah,
            lokasi:
              newBangunan.lokasi ||
              `${state.profile.alamat}, ${state.profile.kabupaten}`,
            mingguKe: 1,
            hariTanggal: `Minggu ke-1 (${state.profile.bulanLaporan || '2023'})`,
            pekerja: clonedPekerja,
            namaKepalaSekolah: state.profile.namaKepalaSekolah,
            nipKepalaSekolah: state.profile.nipKepalaSekolah,
            namaBendahara: state.profile.namaBendahara,
            nipBendahara: state.profile.nipBendahara,
            hariLibur: [],
          };

          return {
            bangunanList: [...state.bangunanList, newBangunan],
            selectedBangunanId: newId,
            absenTukangList: [...state.absenTukangList, firstWeek],
            selectedAbsenWeekId: firstWeekId,
          };
        });
        return newId;
      },

      updateBangunan: (id, updates) =>
        set((state) => ({
          bangunanList: state.bangunanList.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
          absenTukangList: state.absenTukangList.map((w) => {
            if ((w.bangunanId || 'bangunan-1') !== id) return w;
            return {
              ...w,
              proyek: updates.nama !== undefined ? updates.nama : w.proyek,
              lokasi:
                updates.lokasi !== undefined
                  ? updates.lokasi || w.lokasi
                  : w.lokasi,
            };
          }),
        })),

      deleteBangunan: (id) =>
        set((state) => {
          if (state.bangunanList.length <= 1) {
            return state;
          }
          const remaining = state.bangunanList.filter((b) => b.id !== id);
          const nextSelectedId = remaining[0].id;
          const nextWeeks = state.absenTukangList.filter(
            (w) => (w.bangunanId || 'bangunan-1') === nextSelectedId
          );
          return {
            bangunanList: remaining,
            selectedBangunanId: nextSelectedId,
            absenTukangList: state.absenTukangList.filter(
              (w) => (w.bangunanId || 'bangunan-1') !== id
            ),
            selectedAbsenWeekId: nextWeeks[0]?.id || state.selectedAbsenWeekId,
          };
        }),

      // Reducers Daftar Barang / Belanja & Absen Tukang
      setActiveSubTabDaftarBarang: (subTab) =>
        set({ activeSubTabDaftarBarang: subTab }),

      setSelectedAbsenWeekId: (id) =>
        set({ selectedAbsenWeekId: id }),

      setFormatRekapTukang: (fmt) =>
        set({ formatRekapTukang: fmt }),

      setSelectedSubWeek: (subWeek) =>
        set({ selectedSubWeek: subWeek }),

      toggleHariLibur: (absenId, day) =>
        set((state) => ({
          absenTukangList: state.absenTukangList.map((week) => {
            if (week.id !== absenId) return week;
            const currentLibur = week.hariLibur || [];
            const isLibur = currentLibur.includes(day);
            const nextLibur = isLibur
              ? currentLibur.filter((d) => d !== day)
              : [...currentLibur, day];
            return {
              ...week,
              hariLibur: nextLibur,
            };
          }),
        })),

      setAllWorkersDayAttendance: (absenId, day, val) =>
        set((state) => ({
          absenTukangList: state.absenTukangList.map((week) => {
            if (week.id !== absenId) return week;
            return {
              ...week,
              pekerja: week.pekerja.map((p) => ({
                ...p,
                hariKerja: {
                  ...p.hariKerja,
                  [day]: val,
                },
              })),
            };
          }),
        })),

      updateAbsenMingguanHeader: (id, updated) =>
        set((state) => ({
          absenTukangList: state.absenTukangList.map((week) =>
            week.id === id ? { ...week, ...updated } : week
          ),
        })),

      updatePekerjaAttendance: (absenId, pekerjaId, day, val) =>
        set((state) => ({
          absenTukangList: state.absenTukangList.map((week) => {
            if (week.id !== absenId) return week;
            return {
              ...week,
              pekerja: week.pekerja.map((p) => {
                if (p.id !== pekerjaId) return p;
                return {
                  ...p,
                  hariKerja: {
                    ...p.hariKerja,
                    [day]: val,
                  },
                };
              }),
            };
          }),
        })),

      addPekerjaToAbsen: (absenId, kategori, nama, upahHarian, tenagaKerja) =>
        set((state) => {
          const currentWeek = state.absenTukangList.find((w) => w.id === absenId);
          const nextIndex = (currentWeek?.pekerja.length || 0) + 1;
          const newPekerja: PekerjaTukang = {
            id: `pkr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            kategori,
            tenagaKerja: tenagaKerja || kategori,
            nama: (nama.trim() || `Pekerja ${nextIndex}`).toUpperCase(),
            hariKerja: {
              m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
              m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
              senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1, minggu: 0,
            },
            upahHarian,
            paraf: '',
          };
          return {
            absenTukangList: state.absenTukangList.map((week) => {
              if (week.id !== absenId) return week;
              return {
                ...week,
                pekerja: [...week.pekerja, newPekerja],
              };
            }),
          };
        }),

      updatePekerjaInfo: (absenId, pekerjaId, updated) =>
        set((state) => ({
          absenTukangList: state.absenTukangList.map((week) => {
            if (week.id !== absenId) return week;
            return {
              ...week,
              pekerja: week.pekerja.map((p) =>
                p.id === pekerjaId ? { ...p, ...updated } : p
              ),
            };
          }),
        })),

      deletePekerjaFromAbsen: (absenId, pekerjaId) =>
        set((state) => ({
          absenTukangList: state.absenTukangList.map((week) => {
            if (week.id !== absenId) return week;
            return {
              ...week,
              pekerja: week.pekerja.filter((p) => p.id !== pekerjaId),
            };
          }),
        })),

      addNewAbsenWeek: (weekNum, tanggal, targetBangunanId) =>
        set((state) => {
          const activeBangunanId =
            targetBangunanId || state.selectedBangunanId || 'bangunan-1';
          const activeBangunan =
            state.bangunanList.find((b) => b.id === activeBangunanId) ||
            state.bangunanList[0];
          const newId = `absen-${activeBangunanId}-p${weekNum}-${Date.now()}`;

          // Ambil pekerja dari periode sebelumnya di bangunan yang sama, atau fallback
          const weeksInBangunan = state.absenTukangList.filter(
            (w) => (w.bangunanId || 'bangunan-1') === activeBangunanId
          );
          const lastWeek =
            weeksInBangunan[weeksInBangunan.length - 1] || weeksInBangunan[0];
          const basePekerja =
            lastWeek?.pekerja || DEFAULT_ABSEN_MINGGU_4.pekerja;

          const clonedPekerja: PekerjaTukang[] = basePekerja.map((p, idx) => ({
            ...p,
            id: `pkr-p${weekNum}-${idx + 1}-${Date.now()}`,
            hariKerja: {
              m1_1: 1, m1_2: 1, m1_3: 1, m1_4: 1, m1_5: 1, m1_6: 1, m1_7: 0,
              m2_1: 1, m2_2: 1, m2_3: 1, m2_4: 1, m2_5: 1, m2_6: 1, m2_7: 0,
              senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1, minggu: 0,
            },
            paraf: '',
          }));

          const mggStart = (weekNum - 1) * 2 + 1;
          const mggEnd = weekNum * 2;

          const newWeek: AbsenMingguanTukang = {
            id: newId,
            bangunanId: activeBangunanId,
            proyek:
              activeBangunan?.nama ||
              state.profile.judulPekerjaan ||
              'Pekerjaan Bangunan',
            lokasi:
              activeBangunan?.lokasi ||
              `${state.profile.alamat}, ${state.profile.kabupaten}`,
            periodeKe: weekNum,
            mingguKe: weekNum,
            hariTanggal:
              tanggal ||
              `Periode ${weekNum} (Minggu ${mggStart} s.d ${mggEnd}) - ${state.profile.bulanLaporan || '2023'}`,
            pekerja: clonedPekerja,
            namaSekolah: state.profile.namaSekolah,
            namaKepalaSekolah: state.profile.namaKepalaSekolah,
            nipKepalaSekolah: state.profile.nipKepalaSekolah,
            namaBendahara: state.profile.namaBendahara,
            nipBendahara: state.profile.nipBendahara,
            hariLibur: ['m1_7', 'm2_7'],
          };

          return {
            absenTukangList: [...state.absenTukangList, newWeek],
            selectedAbsenWeekId: newId,
          };
        }),

      addCustomBahan: (item) =>
        set((state) => ({
          customBahanList: [
            ...state.customBahanList,
            {
              ...item,
              id: `custom-bhn-${Date.now()}`,
            },
          ],
        })),

      deleteCustomBahan: (id) =>
        set((state) => ({
          customBahanList: state.customBahanList.filter((b) => b.id !== id),
        })),
    }),
    {
      name: 'ah-beres-lpj-storage-v2',
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState && persistedState.transactions) {
          persistedState.transactions = persistedState.transactions.map((tx: any) => {
            if (tx.id === 'tx-2' && (tx.penerimaan === 160848000 || tx.pengeluaran === 160848000)) {
              return { ...tx, penerimaan: 395455000, pengeluaran: 395455000 };
            }
            return tx;
          });
        }
        if (persistedState) {
          if (!Array.isArray(persistedState.bangunanList) || persistedState.bangunanList.length === 0) {
            persistedState.bangunanList = INITIAL_BANGUNAN_LIST;
          }
          if (!persistedState.selectedBangunanId) {
            persistedState.selectedBangunanId = 'bangunan-1';
          }
          if (Array.isArray(persistedState.absenTukangList)) {
            const seen = new Set<string>();
            const deduplicated: AbsenMingguanTukang[] = [];
            for (const week of persistedState.absenTukangList) {
              if (week && week.id && !seen.has(week.id)) {
                seen.add(week.id);
                if (!week.bangunanId) {
                  week.bangunanId = 'bangunan-1';
                }
                deduplicated.push(week);
              }
            }
            if (!seen.has('absen-minggu-4')) {
              deduplicated.unshift(DEFAULT_ABSEN_MINGGU_4);
            }
            persistedState.absenTukangList = deduplicated;
            if (!persistedState.selectedAbsenWeekId || persistedState.selectedAbsenWeekId === 'absen-minggu-2') {
              persistedState.selectedAbsenWeekId = 'absen-minggu-4';
            }
          }
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!Array.isArray(state.bangunanList) || state.bangunanList.length === 0) {
            state.bangunanList = INITIAL_BANGUNAN_LIST;
          }
          if (!state.selectedBangunanId) {
            state.selectedBangunanId = 'bangunan-1';
          }
          if (Array.isArray(state.absenTukangList)) {
            const seen = new Set<string>();
            let hasDuplicates = false;
            const deduplicated: AbsenMingguanTukang[] = [];
            for (const week of state.absenTukangList) {
              if (week && week.id) {
                if (seen.has(week.id)) {
                  hasDuplicates = true;
                } else {
                  seen.add(week.id);
                  if (!week.bangunanId) {
                    week.bangunanId = 'bangunan-1';
                    hasDuplicates = true;
                  }
                  deduplicated.push(week);
                }
              }
            }
            if (!seen.has('absen-minggu-4')) {
              deduplicated.unshift(DEFAULT_ABSEN_MINGGU_4);
              hasDuplicates = true;
            }
            if (hasDuplicates) {
              state.absenTukangList = deduplicated;
            }
            if (!state.selectedAbsenWeekId || state.selectedAbsenWeekId === 'absen-minggu-2') {
              state.selectedAbsenWeekId = 'absen-minggu-4';
            }
          }
        }
      },
    }
  )
);
