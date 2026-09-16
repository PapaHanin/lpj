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
} from '../types';
import { INITIAL_PROFILE, INITIAL_TRANSACTIONS } from '../utils/calculations';
import { getClosingDateForMonth } from '../utils/dateUtils';
import { INITIAL_ABSEN_DATA, DEFAULT_ABSEN_MINGGU_2 } from '../utils/bahanTukangUtils';

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

  // Daftar Barang/Belanja State (Subnavigasi: Bahan & Tukang)
  activeSubTabDaftarBarang: SubTabDaftarBarang;
  absenTukangList: AbsenMingguanTukang[];
  selectedAbsenWeekId: string;
  customBahanList: CustomBahanItem[];

  // Print & Toast States
  isPrintModalOpen: boolean;
  printModalDocTitle: string;
  toast: ToastNotification | null;

  // Actions
  setProfile: (profile: Partial<ProjectProfile>) => void;
  setSelectedMonthFilter: (filter: string) => void;
  setReportingMonth: (bulan: string, tahun: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
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

  // Actions untuk Daftar Barang & Absen Tukang
  setActiveSubTabDaftarBarang: (subTab: SubTabDaftarBarang) => void;
  setSelectedAbsenWeekId: (id: string) => void;
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
    upahHarian: number
  ) => void;
  updatePekerjaInfo: (
    absenId: string,
    pekerjaId: string,
    updated: Partial<PekerjaTukang>
  ) => void;
  deletePekerjaFromAbsen: (absenId: string, pekerjaId: string) => void;
  addNewAbsenWeek: (weekNum: number, tanggal?: string) => void;
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

      // State Daftar Barang/Belanja
      activeSubTabDaftarBarang: 'bahan',
      absenTukangList: INITIAL_ABSEN_DATA,
      selectedAbsenWeekId: 'absen-minggu-2',
      customBahanList: [],

      isPrintModalOpen: false,
      printModalDocTitle: 'Buku Kas Umum (BKU)',
      toast: null,

      setProfile: (updatedProfile) =>
        set((state) => ({
          profile: { ...state.profile, ...updatedProfile },
        })),

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

      addTransaction: (newTxData) =>
        set((state) => {
          const newTx: Transaction = {
            ...newTxData,
            id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            createdAt: new Date().toISOString(),
          };
          return {
            transactions: [...state.transactions, newTx],
            isTransactionModalOpen: false,
            transactionToEdit: null,
          };
        }),

      updateTransaction: (id, updatedData) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updatedData } : tx
          ),
          isTransactionModalOpen: false,
          transactionToEdit: null,
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
          selectedTransactionIdForKwitansi:
            state.selectedTransactionIdForKwitansi === id
              ? state.transactions.find((tx) => tx.id !== id)?.id || null
              : state.selectedTransactionIdForKwitansi,
        })),

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
          absenTukangList: INITIAL_ABSEN_DATA,
          selectedAbsenWeekId: 'absen-minggu-2',
          customBahanList: [],
        }),

      // Reducers Daftar Barang / Belanja & Absen Tukang
      setActiveSubTabDaftarBarang: (subTab) =>
        set({ activeSubTabDaftarBarang: subTab }),

      setSelectedAbsenWeekId: (id) =>
        set({ selectedAbsenWeekId: id }),

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

      addPekerjaToAbsen: (absenId, kategori, nama, upahHarian) =>
        set((state) => {
          const newPekerja: PekerjaTukang = {
            id: `pkr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            kategori,
            nama: nama.trim() || (kategori === 'TUKANG' ? 'Tukang Baru' : 'Knek Baru'),
            hariKerja: { minggu: 0, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
            upahHarian,
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

      addNewAbsenWeek: (weekNum, tanggal) =>
        set((state) => {
          const newId = `absen-minggu-${weekNum}-${Date.now()}`;
          // Template pekerja diambil dari minggu sebelumnya atau default
          const basePekerja = state.absenTukangList[0]?.pekerja || DEFAULT_ABSEN_MINGGU_2.pekerja;
          const clonedPekerja: PekerjaTukang[] = basePekerja.map((p, idx) => ({
            ...p,
            id: `pkr-w${weekNum}-${idx + 1}-${Date.now()}`,
            // reset attendance default to full week or copy
            hariKerja: { minggu: 0, senin: 1, selasa: 1, rabu: 1, kamis: 1, jumat: 1, sabtu: 1 },
          }));

          const newWeek: AbsenMingguanTukang = {
            id: newId,
            proyek: state.profile.judulPekerjaan ? state.profile.judulPekerjaan.substring(0, 40) + '...' : 'Rehabilitasi Sekolah',
            lokasi: `${state.profile.alamat}, ${state.profile.kabupaten}`,
            mingguKe: weekNum,
            hariTanggal: tanggal || `Sabtu, ${weekNum * 7} ${state.profile.bulanLaporan || '2026'}`,
            pekerja: clonedPekerja,
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
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState && persistedState.transactions) {
          persistedState.transactions = persistedState.transactions.map((tx: any) => {
            if (tx.id === 'tx-2' && (tx.penerimaan === 160848000 || tx.pengeluaran === 160848000)) {
              return { ...tx, penerimaan: 395455000, pengeluaran: 395455000 };
            }
            return tx;
          });
        }
        return persistedState;
      },
    }
  )
);
