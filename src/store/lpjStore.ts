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
import { INITIAL_PROFILE, INITIAL_TRANSACTIONS } from '../utils/calculations';
import { getClosingDateForMonth } from '../utils/dateUtils';
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

  // Bangunan Proyek & Daftar Barang/Belanja State
  bangunanList: BangunanProyek[];
  selectedBangunanId: string;
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

      // State Bangunan & Daftar Barang/Belanja
      bangunanList: INITIAL_BANGUNAN_LIST,
      selectedBangunanId: 'bangunan-1',
      activeSubTabDaftarBarang: 'bahan',
      absenTukangList: INITIAL_ABSEN_DATA,
      selectedAbsenWeekId: 'absen-minggu-4',
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
            paraf: `${nextIndex}`,
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
            paraf: `${idx + 1}`,
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
