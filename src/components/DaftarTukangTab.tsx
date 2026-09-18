import React, { useState, useMemo, useEffect } from 'react';
import { useLpjStore } from '../store/lpjStore';
import {
  calculateTotalHari,
  calculateTotalHariForWeek,
  calculateUpahJumlahForWeek,
  formatDayCell,
  formatDecimal,
  calculateUpahJumlah,
  HARI_KERJA_2_MINGGU,
  getDayValue,
  DEFAULT_ABSEN_MINGGU_4,
} from '../utils/bahanTukangUtils';
import { terbilangRupiah } from '../utils/terbilang';
import { triggerPrint } from '../utils/printHelper';
import {
  Users,
  Plus,
  Printer,
  Calendar,
  CalendarDays,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Info,
  ChevronDown,
  Check,
  RotateCcw,
  Building2,
  Building,
  SlidersHorizontal,
  FolderPlus,
  CheckCheck,
  Settings,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { HariKerjaRecord, PekerjaTukang, BangunanProyek } from '../types';

export const DaftarTukangTab: React.FC = () => {
  const {
    profile,
    setProfile,
    openProfileModal,
    bangunanList,
    selectedBangunanId,
    setSelectedBangunanId,
    addBangunan,
    updateBangunan,
    deleteBangunan,
    absenTukangList,
    selectedAbsenWeekId,
    setSelectedAbsenWeekId,
    formatRekapTukang,
    setFormatRekapTukang,
    selectedSubWeek,
    setSelectedSubWeek,
    toggleHariLibur,
    setAllWorkersDayAttendance,
    updateAbsenMingguanHeader,
    updatePekerjaAttendance,
    addPekerjaToAbsen,
    updatePekerjaInfo,
    deletePekerjaFromAbsen,
    addNewAbsenWeek,
    showToast,
  } = useLpjStore();

  // Active building object
  const currentBangunan: BangunanProyek = useMemo(() => {
    return (
      bangunanList.find((b) => b.id === selectedBangunanId) ||
      bangunanList[0] || {
        id: 'bangunan-1',
        nama: 'Pembangunan Laboratorium Komputer dan UKS',
        kode: 'BG-01',
        lokasi: profile.alamat ? `${profile.alamat}, ${profile.kabupaten}` : '',
        keterangan: 'Pekerjaan Laboratorium Komputer dan UKS',
      }
    );
  }, [bangunanList, selectedBangunanId, profile]);

  // Ensure strictly unique weeks list by ID
  const uniqueAbsenTukangList = useMemo(() => {
    const seen = new Set<string>();
    const result: typeof absenTukangList = [];
    for (const week of absenTukangList) {
      if (week && week.id && !seen.has(week.id)) {
        seen.add(week.id);
        result.push(week);
      }
    }
    return result;
  }, [absenTukangList]);

  // Weeks belonging strictly to the currently selected building
  const weeksForCurrentBangunan = useMemo(() => {
    const list = uniqueAbsenTukangList.filter(
      (w) => (w.bangunanId || 'bangunan-1') === currentBangunan.id
    );
    return list.length > 0 ? list : uniqueAbsenTukangList;
  }, [uniqueAbsenTukangList, currentBangunan.id]);

  // Auto-sync selected week to be one belonging to this building
  useEffect(() => {
    if (weeksForCurrentBangunan.length > 0) {
      const exists = weeksForCurrentBangunan.some(
        (w) => w.id === selectedAbsenWeekId
      );
      if (!exists) {
        setSelectedAbsenWeekId(weeksForCurrentBangunan[0].id);
      }
    }
  }, [weeksForCurrentBangunan, selectedAbsenWeekId, setSelectedAbsenWeekId]);

  // Clean any duplicated IDs from store if present in browser localStorage
  useEffect(() => {
    const seen = new Set<string>();
    let hasDup = false;
    for (const w of absenTukangList) {
      if (seen.has(w.id)) {
        hasDup = true;
        break;
      }
      seen.add(w.id);
    }
    if (hasDup) {
      useLpjStore.setState((state) => {
        const s = new Set<string>();
        return {
          absenTukangList: state.absenTukangList.filter((w) => {
            if (!w || !w.id || s.has(w.id)) return false;
            s.add(w.id);
            return true;
          }),
        };
      });
    }
  }, [absenTukangList]);

  // Auto-clean any numeric paraf ('1', '2', etc.) so the paraf column stays an empty space for manual signatures
  useEffect(() => {
    let hasNumericParaf = false;
    for (const w of absenTukangList) {
      if (w.pekerja.some((p) => p.paraf && /^\d+$/.test(p.paraf.trim()))) {
        hasNumericParaf = true;
        break;
      }
    }
    if (hasNumericParaf) {
      useLpjStore.setState((state) => ({
        absenTukangList: state.absenTukangList.map((w) => ({
          ...w,
          pekerja: w.pekerja.map((p) => ({
            ...p,
            paraf: p.paraf && /^\d+$/.test(p.paraf.trim()) ? '' : p.paraf || '',
          })),
        })),
      }));
    }
  }, [absenTukangList]);

  useEffect(() => {
    if (!selectedAbsenWeekId || selectedAbsenWeekId === 'absen-minggu-2') {
      setSelectedAbsenWeekId('absen-minggu-4');
    }
  }, [selectedAbsenWeekId, setSelectedAbsenWeekId]);

  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [newWorkerNama, setNewWorkerNama] = useState('');
  const [newWorkerTenagaKerja, setNewWorkerTenagaKerja] = useState('Pekerja');
  const [newWorkerUpah, setNewWorkerUpah] = useState<number>(100000);

  // Modal Bangunan Baru State
  const [isAddBangunanOpen, setIsAddBangunanOpen] = useState(false);
  const [newBangunanNama, setNewBangunanNama] = useState('');
  const [newBangunanLokasi, setNewBangunanLokasi] = useState('');
  const [newBangunanKeterangan, setNewBangunanKeterangan] = useState('');
  const [newBangunanDonorId, setNewBangunanDonorId] = useState('');

  // Modal Kelola Bangunan State
  const [isManageBangunanOpen, setIsManageBangunanOpen] = useState(false);
  const [editingBangunanId, setEditingBangunanId] = useState<string | null>(null);
  const [editBangunanNama, setEditBangunanNama] = useState('');
  const [editBangunanLokasi, setEditBangunanLokasi] = useState('');
  const [editBangunanKeterangan, setEditBangunanKeterangan] = useState('');

  // Editing Worker State
  const [editingWorker, setEditingWorker] = useState<{
    id: string;
    nama: string;
    tenagaKerja: string;
    upahHarian: number;
    paraf?: string;
  } | null>(null);

  // Currently selected week data
  const currentAbsen = useMemo(() => {
    const found = uniqueAbsenTukangList.find((w) => w.id === selectedAbsenWeekId);
    if (found) return found;
    const week4 = uniqueAbsenTukangList.find((w) => w.id === 'absen-minggu-4');
    if (week4) return week4;
    return uniqueAbsenTukangList[0] || DEFAULT_ABSEN_MINGGU_4;
  }, [uniqueAbsenTukangList, selectedAbsenWeekId]);

  // Derived metadata for 2-week period - STRICTLY prioritize data entered in Pengaturan (profile)
  const pekerjaan = currentBangunan.nama || profile.judulPekerjaan || currentAbsen.proyek || 'Pekerjaan Bangunan';
  const namaSekolah = profile.namaSekolah || currentAbsen.namaSekolah || 'NAMA SEKOLAH';
  const alamat = profile.alamat
    ? `${profile.alamat}${profile.kecamatan ? `, ${profile.kecamatan}` : ''}${profile.kabupaten ? `, ${profile.kabupaten}` : ''}`
    : (currentBangunan.lokasi || currentAbsen.lokasi || '-');
  const periodeKe = currentAbsen.periodeKe || currentAbsen.mingguKe || 1;
  const mggStart = (periodeKe - 1) * 2 + 1;
  const mggEnd = periodeKe * 2;
  const pertanggal = currentAbsen.hariTanggal || `Periode ${periodeKe} (Minggu ${mggStart} s.d ${mggEnd})`;

  const namaKepalaSekolah = profile.namaKepalaSekolah || currentAbsen.namaKepalaSekolah || 'Nama Kepala Sekolah';
  const nipKepalaSekolah = profile.nipKepalaSekolah || currentAbsen.nipKepalaSekolah || '-';
  const namaBendahara = profile.namaBendahara || currentAbsen.namaBendahara || 'Nama Bendahara';
  const nipBendahara = profile.nipBendahara || currentAbsen.nipBendahara || '-';

  // Grand Total of Wages for the 2-week period
  const grandTotalUpah = useMemo(() => {
    if (!currentAbsen) return 0;
    return currentAbsen.pekerja.reduce((sum, p) => sum + calculateUpahJumlah(p), 0);
  }, [currentAbsen]);

  // 1-Week vs 2-Week calculations & state
  const is1Week = formatRekapTukang === '1_minggu';
  const currentSubWeek = (selectedSubWeek as 1 | 2) || 1;
  const activeWeekNum = currentSubWeek === 1 ? mggStart : mggEnd;
  const activeWeekCols = useMemo(() => {
    return HARI_KERJA_2_MINGGU.filter((h) => h.weekGroup === currentSubWeek);
  }, [currentSubWeek]);

  // Grand Total for 1-Week format
  const grandTotalUpah1Minggu = useMemo(() => {
    if (!currentAbsen) return 0;
    return currentAbsen.pekerja.reduce(
      (sum, p) => sum + calculateUpahJumlahForWeek(p, currentSubWeek),
      0
    );
  }, [currentAbsen, currentSubWeek]);

  // Active Grand Total depending on format
  const activeGrandTotal = is1Week ? grandTotalUpah1Minggu : grandTotalUpah;

  const pertanggal1Week = useMemo(() => {
    if (currentAbsen.hariTanggal) {
      return `${currentAbsen.hariTanggal} (Minggu ke-${activeWeekNum})`;
    }
    return `Minggu ke-${activeWeekNum}`;
  }, [currentAbsen.hariTanggal, activeWeekNum]);

  // Cycle Attendance: 1,00 -> 0,50 -> 0 (-) -> 1,00
  const handleToggleAttendance = (
    pekerjaId: string,
    day: keyof HariKerjaRecord,
    currentVal: number
  ) => {
    if (!currentAbsen) return;
    let nextVal = 1;
    if (currentVal === 1) nextVal = 0.5;
    else if (currentVal === 0.5) nextVal = 0;
    else nextVal = 1;

    updatePekerjaAttendance(currentAbsen.id, pekerjaId, day, nextVal);
  };

  const handleAddWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAbsen || !newWorkerNama.trim()) return;

    addPekerjaToAbsen(
      currentAbsen.id,
      newWorkerTenagaKerja,
      newWorkerNama.trim(),
      newWorkerUpah,
      newWorkerTenagaKerja
    );

    setNewWorkerNama('');
    setIsAddWorkerOpen(false);
  };

  const handleSaveEditWorker = () => {
    if (!currentAbsen || !editingWorker) return;
    updatePekerjaInfo(currentAbsen.id, editingWorker.id, {
      nama: editingWorker.nama.toUpperCase(),
      upahHarian: editingWorker.upahHarian,
      kategori: editingWorker.tenagaKerja,
      tenagaKerja: editingWorker.tenagaKerja,
      paraf: editingWorker.paraf,
    });
    setEditingWorker(null);
  };

  const handleAddBangunanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBangunanNama.trim()) return;
    addBangunan(
      newBangunanNama.trim(),
      newBangunanKeterangan.trim(),
      newBangunanLokasi.trim(),
      newBangunanDonorId || undefined
    );
    showToast({
      type: 'success',
      title: 'Bangunan Disimpan',
      message: `Bangunan "${newBangunanNama.trim()}" berhasil dibuat dan siap diisi daftar upah tukang.`,
    });
    setNewBangunanNama('');
    setNewBangunanLokasi('');
    setNewBangunanKeterangan('');
    setIsAddBangunanOpen(false);
  };

  const handleStartEditBangunan = (b: BangunanProyek) => {
    setEditingBangunanId(b.id);
    setEditBangunanNama(b.nama);
    setEditBangunanLokasi(b.lokasi || '');
    setEditBangunanKeterangan(b.keterangan || '');
  };

  const handleSaveEditBangunan = () => {
    if (!editingBangunanId || !editBangunanNama.trim()) return;
    updateBangunan(editingBangunanId, {
      nama: editBangunanNama.trim(),
      lokasi: editBangunanLokasi.trim(),
      keterangan: editBangunanKeterangan.trim(),
    });
    showToast({
      type: 'success',
      title: 'Bangunan Diperbarui',
      message: `Data bangunan "${editBangunanNama.trim()}" telah disimpan.`,
    });
    setEditingBangunanId(null);
  };

  const handleDeleteBangunan = (id: string, nama: string) => {
    if (bangunanList.length <= 1) {
      alert('Tidak dapat menghapus. Minimal harus ada 1 bangunan dalam sistem.');
      return;
    }
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus bangunan "${nama}" beserta seluruh daftar upah tukang di dalamnya?`
      )
    ) {
      return;
    }
    deleteBangunan(id);
    showToast({
      type: 'info',
      title: 'Bangunan Dihapus',
      message: `Bangunan "${nama}" telah dihapus.`,
    });
  };

  const handleCreateNewWeek = () => {
    const maxPeriodeNum = weeksForCurrentBangunan.reduce(
      (max, w) => Math.max(max, w.periodeKe || w.mingguKe || 0),
      0
    );
    const nextPeriodeNum = maxPeriodeNum + 1;
    addNewAbsenWeek(nextPeriodeNum, undefined, currentBangunan.id);
    showToast({
      type: 'success',
      title: 'Periode 2 Minggu Dibuat',
      message: `Periode ke-${nextPeriodeNum} (Minggu ${(nextPeriodeNum - 1) * 2 + 1} & ${nextPeriodeNum * 2}) untuk ${currentBangunan.nama} berhasil ditambahkan.`,
    });
  };

  const handleFillFullAttendance = () => {
    if (!currentAbsen) return;

    if (is1Week) {
      if (
        !confirm(
          `Isi semua pekerja dengan kehadiran penuh 6 hari kerja untuk Minggu ke-${activeWeekNum} (Hari I s.d VI = 1,00, Hari VII = -)?`
        )
      )
        return;

      const weekLiburKey = currentSubWeek === 1 ? 'm1_7' : 'm2_7';
      useLpjStore.setState((state) => ({
        absenTukangList: state.absenTukangList.map((w) => {
          if (w.id !== currentAbsen.id) return w;
          const currentLibur = w.hariLibur || [];
          const updatedLibur = currentLibur.includes(weekLiburKey as any)
            ? currentLibur
            : [...currentLibur, weekLiburKey as any];
          return {
            ...w,
            hariLibur: updatedLibur,
            pekerja: w.pekerja.map((p) => {
              const updatedHari = { ...p.hariKerja };
              if (currentSubWeek === 1) {
                updatedHari.m1_1 = 1;
                updatedHari.m1_2 = 1;
                updatedHari.m1_3 = 1;
                updatedHari.m1_4 = 1;
                updatedHari.m1_5 = 1;
                updatedHari.m1_6 = 1;
                updatedHari.m1_7 = 0;
              } else {
                updatedHari.m2_1 = 1;
                updatedHari.m2_2 = 1;
                updatedHari.m2_3 = 1;
                updatedHari.m2_4 = 1;
                updatedHari.m2_5 = 1;
                updatedHari.m2_6 = 1;
                updatedHari.m2_7 = 0;
              }
              return { ...p, hariKerja: updatedHari };
            }),
          };
        }),
      }));
      showToast({
        type: 'success',
        title: 'Kehadiran Diisi Penuh',
        message: `Seluruh pekerja diset hadir penuh 6 hari kerja untuk Minggu ke-${activeWeekNum}.`,
      });
      return;
    }

    if (
      !confirm(
        'Isi semua pekerja dengan kehadiran penuh 12 hari (Minggu I & II Hari I s.d VI = 1,00, Hari VII = -)?'
      )
    )
      return;
    useLpjStore.setState((state) => ({
      absenTukangList: state.absenTukangList.map((w) => {
        if (w.id !== currentAbsen.id) return w;
        return {
          ...w,
          hariLibur: ['m1_7', 'm2_7'],
          pekerja: w.pekerja.map((p) => ({
            ...p,
            hariKerja: {
              m1_1: 1,
              m1_2: 1,
              m1_3: 1,
              m1_4: 1,
              m1_5: 1,
              m1_6: 1,
              m1_7: 0,
              m2_1: 1,
              m2_2: 1,
              m2_3: 1,
              m2_4: 1,
              m2_5: 1,
              m2_6: 1,
              m2_7: 0,
              senin: 1,
              selasa: 1,
              rabu: 1,
              kamis: 1,
              jumat: 1,
              sabtu: 1,
              minggu: 0,
            },
          })),
        };
      }),
    }));
    showToast({
      type: 'success',
      title: 'Kehadiran Diisi Penuh',
      message: 'Seluruh pekerja diset hadir penuh 12 hari kerja (2 minggu).',
    });
  };

  const handleResetToScreenshotDefault = () => {
    if (
      !confirm(
        'Kembalikan format Rekapitulasi Upah Kerja ke susunan standar (Periode 1 - 4 Tukang)? Nama sekolah dan pejabat akan tetap menggunakan data Pengaturan Profil Anda.'
      )
    )
      return;
    useLpjStore.setState((state) => ({
      absenTukangList: [
        {
          ...DEFAULT_ABSEN_MINGGU_4,
          namaSekolah: state.profile.namaSekolah,
          namaKepalaSekolah: state.profile.namaKepalaSekolah,
          nipKepalaSekolah: state.profile.nipKepalaSekolah,
          namaBendahara: state.profile.namaBendahara,
          nipBendahara: state.profile.nipBendahara,
        },
        ...state.absenTukangList.filter((w) => w.id !== 'absen-minggu-4'),
      ],
      selectedAbsenWeekId: 'absen-minggu-4',
    }));
  };

  // Export to Excel: Supports 1-Week or 2-Week formats based on user preference
  const handleExportExcelAbsen = () => {
    if (!currentAbsen) return;

    if (is1Week) {
      const dataRows: (string | number)[][] = [
        ['REKAPITULASI UPAH KERJA MINGGUAN'],
        [],
        ['PEKERJAAN', `:\t${pekerjaan}`],
        ['NAMA SEKOLAH', `:\t${namaSekolah}`],
        ['ALAMAT', `:\t${alamat}`],
        ['PERIODE (MINGGU) KE', `:\t${activeWeekNum}`],
        ['PERTANGGAL', `:\t${pertanggal1Week}`],
        [],
        [
          'NO.',
          'NAMA TUKANG',
          'TENAGA KERJA',
          'HARI KERJA (SENIN - MINGGU)',
          '',
          '',
          '',
          '',
          '',
          '',
          'JUMLAH',
          '',
          '',
          'PARAF',
        ],
        [
          '',
          '',
          '',
          'I',
          'II',
          'III',
          'IV',
          'V',
          'VI',
          'VII',
          'TENAGA',
          'UPAH/HARI',
          'UPAH 1 MGG',
          '',
        ],
        [
          '',
          '',
          '',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'O/H',
          'Org/Mgg',
          '(Rp.)',
          '(Rp.)',
          '',
        ],
        ...currentAbsen.pekerja.map((p, idx) => {
          const totalHari = calculateTotalHariForWeek(p.hariKerja, currentSubWeek);
          const upah1Minggu = calculateUpahJumlahForWeek(p, currentSubWeek);
          return [
            idx + 1,
            p.nama,
            p.tenagaKerja || p.kategori,
            ...activeWeekCols.map((col) =>
              formatDayCell(getDayValue(p.hariKerja, col.key))
            ),
            formatDecimal(totalHari),
            formatDecimal(p.upahHarian),
            formatDecimal(upah1Minggu),
            p.paraf && !/^\d+$/.test(p.paraf.trim()) ? p.paraf : '',
          ];
        }),
        [
          'JUMLAH UPAH SATU MINGGU (Rp.)',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          formatDecimal(grandTotalUpah1Minggu),
          '',
        ],
        [],
        ['Mengetahui;', '', '', '', '', '', '', '', '', '', 'Lunas Bayar,'],
        ['Kepala Sekolah,', '', '', '', '', '', '', '', '', '', 'Bendahara,'],
        [],
        [],
        [],
        [namaKepalaSekolah, '', '', '', '', '', '', '', '', '', namaBendahara],
        [
          `NIP.${nipKepalaSekolah.replace(/\s+/g, '')}`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `NIP.${nipBendahara.replace(/\s+/g, '')}`,
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
        { s: { r: 8, c: 0 }, e: { r: 10, c: 0 } },
        { s: { r: 8, c: 1 }, e: { r: 10, c: 1 } },
        { s: { r: 8, c: 2 }, e: { r: 10, c: 2 } },
        { s: { r: 8, c: 3 }, e: { r: 8, c: 9 } },
        { s: { r: 8, c: 10 }, e: { r: 8, c: 12 } },
        { s: { r: 8, c: 13 }, e: { r: 10, c: 13 } },
        {
          s: { r: 11 + currentAbsen.pekerja.length, c: 0 },
          e: { r: 11 + currentAbsen.pekerja.length, c: 11 },
        },
      ];
      ws['!cols'] = [
        { wch: 6 }, // NO.
        { wch: 22 }, // NAMA TUKANG
        { wch: 18 }, // TENAGA KERJA
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 },
        { wch: 6 }, // 7 Hari
        { wch: 12 }, // TENAGA Org/Mgg
        { wch: 16 }, // UPAH/HARI (Rp.)
        { wch: 18 }, // UPAH 1 MGG (Rp.)
        { wch: 14 }, // PARAF (Ruang Tanda Tangan)
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Upah Mgg ${activeWeekNum}`);
      const safeBangunanName = (currentBangunan.nama || 'BANGUNAN')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 25);
      XLSX.writeFile(
        wb,
        `REKAPITULASI_UPAH_1_MINGGU_${safeBangunanName}_Mgg${activeWeekNum}.xlsx`
      );
      return;
    }

    const dataRows: (string | number)[][] = [
      ['REKAPITULASI UPAH KERJA DUA MINGGUAN'],
      [],
      ['PEKERJAAN', `:\t${pekerjaan}`],
      ['NAMA SEKOLAH', `:\t${namaSekolah}`],
      ['ALAMAT', `:\t${alamat}`],
      ['PERIODE (2 MINGGU) KE', `:\t${periodeKe} (Minggu ke-${mggStart} s.d ${mggEnd})`],
      ['PERTANGGAL', `:\t${pertanggal}`],
      [],
      [
        'NO.',
        'NAMA TUKANG',
        'TENAGA KERJA',
        'MINGGU I (HARI 1 - 7)',
        '',
        '',
        '',
        '',
        '',
        '',
        'MINGGU II (HARI 8 - 14)',
        '',
        '',
        '',
        '',
        '',
        '',
        'JUMLAH',
        '',
        '',
        'PARAF',
      ],
      [
        '',
        '',
        '',
        'I',
        'II',
        'III',
        'IV',
        'V',
        'VI',
        'VII',
        'I',
        'II',
        'III',
        'IV',
        'V',
        'VI',
        'VII',
        'TENAGA',
        'UPAH/HARI',
        'UPAH 2 MGG',
        '',
      ],
      [
        '',
        '',
        '',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'O/H',
        'Org/2Mgg',
        '(Rp.)',
        '(Rp.)',
        '',
      ],
      ...currentAbsen.pekerja.map((p, idx) => {
        const totalHari = calculateTotalHari(p.hariKerja);
        const upah2Minggu = calculateUpahJumlah(p);
        return [
          idx + 1,
          p.nama,
          p.tenagaKerja || p.kategori,
          ...HARI_KERJA_2_MINGGU.map((col) =>
            formatDayCell(getDayValue(p.hariKerja, col.key))
          ),
          formatDecimal(totalHari),
          formatDecimal(p.upahHarian),
          formatDecimal(upah2Minggu),
          p.paraf && !/^\d+$/.test(p.paraf.trim()) ? p.paraf : '',
        ];
      }),
      [
        'JUMLAH UPAH DUA MINGGU (Rp.)',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        formatDecimal(grandTotalUpah),
        '',
      ],
      [],
      ['Mengetahui;', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Lunas Bayar,'],
      ['Kepala Sekolah,', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bendahara,'],
      [],
      [],
      [],
      [namaKepalaSekolah, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', namaBendahara],
      [`NIP.${nipKepalaSekolah.replace(/\s+/g, '')}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `NIP.${nipBendahara.replace(/\s+/g, '')}`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(dataRows);

    // Merge ranges matching the 2-week period format
    ws['!merges'] = [
      // Title
      { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } },
      // Header Table Merges:
      // NO.
      { s: { r: 8, c: 0 }, e: { r: 10, c: 0 } },
      // NAMA TUKANG
      { s: { r: 8, c: 1 }, e: { r: 10, c: 1 } },
      // TENAGA KERJA
      { s: { r: 8, c: 2 }, e: { r: 10, c: 2 } },
      // MINGGU I (Cols 3..9)
      { s: { r: 8, c: 3 }, e: { r: 8, c: 9 } },
      // MINGGU II (Cols 10..16)
      { s: { r: 8, c: 10 }, e: { r: 8, c: 16 } },
      // JUMLAH (Cols 17..19)
      { s: { r: 8, c: 17 }, e: { r: 8, c: 19 } },
      // PARAF
      { s: { r: 8, c: 20 }, e: { r: 10, c: 20 } },
      // Total Row: JUMLAH UPAH DUA MINGGU (Cols 0..18)
      {
        s: { r: 11 + currentAbsen.pekerja.length, c: 0 },
        e: { r: 11 + currentAbsen.pekerja.length, c: 18 },
      },
    ];

    ws['!cols'] = [
      { wch: 6 },  // NO.
      { wch: 20 }, // NAMA TUKANG
      { wch: 16 }, // TENAGA KERJA
      // MINGGU I
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
      // MINGGU II
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
      // JUMLAH
      { wch: 12 }, // TENAGA Org/2Mgg
      { wch: 16 }, // UPAH/HARI (Rp.)
      { wch: 18 }, // UPAH 2 MGG (Rp.)
      { wch: 14 }, // PARAF (Ruang Tanda Tangan)
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Upah P${periodeKe}`);
    const safeBangunanName = (currentBangunan.nama || 'BANGUNAN')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 25);
    XLSX.writeFile(wb, `REKAPITULASI_UPAH_2_MINGGU_${safeBangunanName}_P${periodeKe}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Bangunan Proyek Selection & Management (Non-Printable) */}
      <div className="bg-gradient-to-r from-[#2c0944] via-[#210633] to-[#1a0429] border border-amber-400/40 rounded-2xl p-4 sm:p-5 shadow-2xl print:hidden space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
                  Daftar Upah Tukang per Bangunan
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {bangunanList.length} Bangunan Tersimpan
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Setiap bangunan memiliki daftar upah dan absen pekerja mingguan tersendiri yang tersimpan otomatis.
              </p>
            </div>
          </div>

          {/* Action buttons: Tambah Bangunan & Kelola */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setNewBangunanNama('');
                setNewBangunanLokasi(profile.alamat ? `${profile.alamat}, ${profile.kabupaten || ''}` : '');
                setNewBangunanKeterangan('');
                setNewBangunanDonorId(currentBangunan.id);
                setIsAddBangunanOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-extrabold rounded-xl shadow-md transition transform active:scale-95 cursor-pointer"
              title="Buat daftar upah untuk bangunan baru"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Bangunan Baru</span>
            </button>

            <button
              onClick={() => setIsManageBangunanOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 rounded-xl transition font-medium cursor-pointer"
              title="Kelola nama bangunan, lokasi, atau hapus"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-300" />
              <span>Kelola Bangunan ({bangunanList.length})</span>
            </button>
          </div>
        </div>

        {/* Building Selector Pills / Quick Switcher */}
        <div className="pt-2 border-t border-purple-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-purple-300 font-semibold flex items-center space-x-1">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>Bangunan Aktif:</span>
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full">
            {bangunanList.map((b) => {
              const isSelected = b.id === currentBangunan.id;
              const weekCount = uniqueAbsenTukangList.filter(
                (w) => (w.bangunanId || 'bangunan-1') === b.id
              ).length;

              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBangunanId(b.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-400 text-purple-950 border-amber-300 shadow-lg font-bold'
                      : 'bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border-purple-800/80'
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isSelected ? 'bg-purple-950/20 text-purple-950 font-bold' : 'bg-purple-800/60 text-amber-300'
                    }`}
                  >
                    {b.kode || 'BG'}
                  </span>
                  <span className="truncate max-w-[240px]">{b.nama}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-purple-950/25 text-purple-950 font-bold' : 'bg-purple-800/40 text-purple-300'
                    }`}
                  >
                    {weekCount} Periode
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Week Toolbar for the selected building (Non-Printable) */}
      <div className="bg-[#240838]/90 border border-purple-800/60 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl print:hidden">
        {/* Left: Week Selector & Week Add for Current Building */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-purple-300 font-bold flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Pilih Periode (2 Minggu):</span>
          </label>

          <div className="relative">
            <select
              value={selectedAbsenWeekId}
              onChange={(e) => setSelectedAbsenWeekId(e.target.value)}
              className="appearance-none bg-[#160424] border border-purple-700/80 rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
            >
              {weeksForCurrentBangunan.map((week, idx) => {
                const pNum = week.periodeKe || week.mingguKe || idx + 1;
                const mStart = (pNum - 1) * 2 + 1;
                const mEnd = pNum * 2;
                return (
                  <option key={`${week.id}-${idx}`} value={week.id}>
                    Periode {pNum} (Minggu {mStart} & {mEnd}) - {week.hariTanggal || '2 Minggu'}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-purple-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleCreateNewWeek}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-purple-800/70 hover:bg-purple-700 text-purple-200 rounded-lg transition border border-purple-600/50 cursor-pointer font-semibold"
            title={`Tambah Periode 2 Minggu Baru untuk ${currentBangunan.nama}`}
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Periode (2 Minggu)</span>
          </button>

          <button
            onClick={handleFillFullAttendance}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs bg-purple-900/60 hover:bg-purple-800 text-amber-300 rounded-lg transition border border-purple-700/50 cursor-pointer"
            title={
              is1Week
                ? `Set semua tukang hadir penuh 6 hari kerja untuk Minggu ke-${activeWeekNum}`
                : 'Set semua tukang hadir penuh 12 hari kerja (Hari 1 s/d 6 tiap minggu)'
            }
          >
            <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {is1Week
                ? `Isi Hadir (Mgg ${activeWeekNum})`
                : 'Isi Hadir Penuh (12 Hari)'}
            </span>
          </button>

          <button
            onClick={handleResetToScreenshotDefault}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs bg-purple-900/40 hover:bg-purple-800 text-purple-300 rounded-lg transition border border-purple-700/40 cursor-pointer"
            title="Kembalikan data ke contoh standar"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Format Standar</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openProfileModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-purple-900/80 hover:bg-purple-800 text-amber-300 rounded-lg transition border border-amber-400/40 cursor-pointer font-bold shadow-xs"
            title="Buka Pengaturan Sekolah, Kepala Sekolah & Bendahara"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Pengaturan</span>
          </button>

          <button
            onClick={() => setIsEditHeaderOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-lg transition border border-purple-700/60 cursor-pointer"
            title="Edit Data Pekerjaan, Sekolah, Alamat & Penandatangan"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Header & TTD</span>
          </button>

          <button
            onClick={() => setIsAddWorkerOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition font-bold shadow-sm cursor-pointer"
            title="Tambah Pekerja ke Rekapitulasi"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Pekerja</span>
          </button>

          <button
            onClick={handleExportExcelAbsen}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 rounded-lg transition border border-emerald-600/50 cursor-pointer"
            title={
              is1Week
                ? `Export Excel Rekapitulasi Upah 1 Minggu (Minggu ${activeWeekNum})`
                : 'Export Excel Rekapitulasi Upah 2 Mingguan'
            }
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() =>
              triggerPrint(
                is1Week
                  ? `Rekapitulasi Upah Kerja 1 Minggu - ${currentBangunan.nama} - Minggu ${activeWeekNum}`
                  : `Rekapitulasi Upah Kerja 2 Minggu - ${currentBangunan.nama} - Periode ${periodeKe}`
              )
            }
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-lg transition font-extrabold shadow-sm cursor-pointer active:scale-95"
            title={
              is1Week
                ? 'Cetak format A4 / Simpan PDF Rekapitulasi Upah 1 Minggu'
                : 'Cetak format A4 / Simpan PDF Rekapitulasi Upah 2 Mingguan'
            }
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Section 2B: Format Selector Bar (Pilihan Format 1 Minggu / 2 Minggu) */}
      <div className="bg-gradient-to-r from-[#1b0328] via-[#28063b] to-[#1b0328] border-2 border-amber-400/70 rounded-xl p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
            <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
            <span>PILIH FORMAT REKAPITULASI:</span>
          </span>

          {/* Toggle 1 Minggu vs 2 Minggu */}
          <div className="inline-flex rounded-lg p-1 bg-purple-950/90 border border-purple-700/70 shadow-inner">
            <button
              type="button"
              onClick={() => setFormatRekapTukang('1_minggu')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                formatRekapTukang === '1_minggu'
                  ? 'bg-amber-400 text-purple-950 shadow-md ring-1 ring-amber-300 font-extrabold'
                  : 'text-purple-300 hover:text-white hover:bg-purple-900/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Format 1 Mingguan (7 Hari)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormatRekapTukang('2_minggu')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                formatRekapTukang === '2_minggu'
                  ? 'bg-amber-400 text-purple-950 shadow-md ring-1 ring-amber-300 font-extrabold'
                  : 'text-purple-300 hover:text-white hover:bg-purple-900/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Format 2 Mingguan (14 Hari)</span>
            </button>
          </div>
        </div>

        {/* Sub-week switcher when 1 Mingguan is active */}
        {is1Week ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-amber-200 font-semibold">Tampilkan Minggu:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-purple-950/90 border border-cyan-400/60 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedSubWeek(1)}
                className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  currentSubWeek === 1
                    ? 'bg-cyan-400 text-purple-950 shadow-sm font-extrabold'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                Minggu Ke-{mggStart} (Minggu I)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubWeek(2)}
                className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  currentSubWeek === 2
                    ? 'bg-cyan-400 text-purple-950 shadow-sm font-extrabold'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                Minggu Ke-{mggEnd} (Minggu II)
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-purple-300 hidden lg:flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>
              Format Aktif: <strong className="text-amber-300">14 Hari Kerja</strong> (Minggu {mggStart} & {mggEnd})
            </span>
          </div>
        )}
      </div>

      {/* Information Tip & Holiday Setting Bar */}
      <div className="bg-[#1f0630] border border-purple-700/40 rounded-xl p-3 text-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-md print:hidden">
        <div className="flex items-center space-x-2 text-purple-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {is1Week ? (
              <>
                <strong>Format 1 Minggu (7 Hari Kerja - Minggu Ke-{activeWeekNum}):</strong> Klik langsung sel kehadiran untuk mengubah: <span className="text-amber-300 font-bold">1,00</span> → <span className="text-cyan-300 font-bold">0,50</span> → <span className="text-red-400 font-bold">-</span>.
              </>
            ) : (
              <>
                <strong>Periode 2 Minggu (14 Hari):</strong> Terbagi atas <strong>Minggu I (Hari 1-7)</strong> dan <strong>Minggu II (Hari 8-14)</strong>. Klik langsung sel kehadiran untuk mengubah: <span className="text-amber-300 font-bold">1,00</span> → <span className="text-cyan-300 font-bold">0,50</span> → <span className="text-red-400 font-bold">-</span>.
              </>
            )}
          </span>
        </div>

        {/* Holiday toggling */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[11px] text-purple-300 font-semibold">Tandai Libur:</span>
          
          {is1Week ? (
            <div className="flex items-center space-x-1 bg-purple-950/60 px-2 py-1 rounded-lg border border-purple-800/40">
              <span className="text-[10px] text-cyan-300 font-bold mr-1">Mgg {activeWeekNum}:</span>
              {activeWeekCols.map((h) => {
                const isLibur = (currentAbsen.hariLibur || []).includes(h.key);
                return (
                  <button
                    key={h.key}
                    onClick={() => toggleHariLibur(currentAbsen.id, h.key)}
                    className={`w-5 h-5 rounded text-[9px] font-bold transition flex items-center justify-center cursor-pointer ${
                      isLibur
                        ? 'bg-red-600 text-white ring-1 ring-red-400'
                        : 'bg-purple-900/80 text-purple-200 hover:bg-purple-800'
                    }`}
                    title={`Minggu ${activeWeekNum} Hari ${h.roman} (${h.dayName}): Klik untuk tandai libur`}
                  >
                    {h.roman}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-1 bg-purple-950/60 px-2 py-1 rounded-lg border border-purple-800/40">
                <span className="text-[10px] text-amber-300 font-bold mr-1">M-I:</span>
                {HARI_KERJA_2_MINGGU.filter((h) => h.weekGroup === 1).map((h) => {
                  const isLibur = (currentAbsen.hariLibur || []).includes(h.key);
                  return (
                    <button
                      key={h.key}
                      onClick={() => toggleHariLibur(currentAbsen.id, h.key)}
                      className={`w-5 h-5 rounded text-[9px] font-bold transition flex items-center justify-center cursor-pointer ${
                        isLibur
                          ? 'bg-red-600 text-white ring-1 ring-red-400'
                          : 'bg-purple-900/80 text-purple-200 hover:bg-purple-800'
                      }`}
                      title={`Minggu I Hari ${h.roman} (${h.dayName}): Klik untuk tandai libur`}
                    >
                      {h.roman}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center space-x-1 bg-purple-950/60 px-2 py-1 rounded-lg border border-purple-800/40">
                <span className="text-[10px] text-cyan-300 font-bold mr-1">M-II:</span>
                {HARI_KERJA_2_MINGGU.filter((h) => h.weekGroup === 2).map((h) => {
                  const isLibur = (currentAbsen.hariLibur || []).includes(h.key);
                  return (
                    <button
                      key={h.key}
                      onClick={() => toggleHariLibur(currentAbsen.id, h.key)}
                      className={`w-5 h-5 rounded text-[9px] font-bold transition flex items-center justify-center cursor-pointer ${
                        isLibur
                          ? 'bg-red-600 text-white ring-1 ring-red-400'
                          : 'bg-purple-900/80 text-purple-200 hover:bg-purple-800'
                      }`}
                      title={`Minggu II Hari ${h.roman} (${h.dayName}): Klik untuk tandai libur`}
                    >
                      {h.roman}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profile Synchronization Notice Bar */}
      <div className="bg-[#1a0428] border border-purple-800/60 rounded-xl px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2.5 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-purple-200">
          <div className="flex items-center space-x-1.5 font-bold text-amber-300">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="uppercase">{namaSekolah}</span>
          </div>
          <div className="text-purple-300 text-[11px] flex items-center gap-1">
            <span className="text-purple-400">Kepala Sekolah:</span>
            <strong className="text-white">{namaKepalaSekolah}</strong>
            {nipKepalaSekolah && nipKepalaSekolah !== '-' && (
              <span className="font-mono text-purple-300">({nipKepalaSekolah})</span>
            )}
          </div>
          <div className="text-purple-300 text-[11px] flex items-center gap-1">
            <span className="text-purple-400">Bendahara:</span>
            <strong className="text-white">{namaBendahara}</strong>
            {nipBendahara && nipBendahara !== '-' && (
              <span className="font-mono text-purple-300">({nipBendahara})</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Sesuai Pengaturan</span>
          </span>
          <button
            onClick={openProfileModal}
            className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-400/15 hover:bg-amber-400/25 px-2.5 py-1 rounded-lg border border-amber-400/40 transition cursor-pointer"
          >
            <Settings className="w-3 h-3 text-amber-400" />
            <span>Ubah di Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet: 1-Week or 2-Week Format */}
      <div className="sheet-paper bg-white text-black font-sans rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-300 print:shadow-none print:border-none print:m-0 print:p-0">
        {/* Document Title */}
        <div className="text-center mb-6">
          <h2 className="text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-black border-b-2 border-black pb-1 inline-block">
            {is1Week
              ? 'REKAPITULASI UPAH KERJA MINGGUAN'
              : 'REKAPITULASI UPAH KERJA DUA MINGGUAN'}
          </h2>
          <p className="text-xs text-slate-700 mt-1 font-semibold">
            {is1Week
              ? `(PERIODE: MINGGU KE-${activeWeekNum})`
              : `(PERIODE DUA MINGGU: MINGGU KE-${mggStart} S.D. KE-${mggEnd})`}
          </p>
        </div>

        {/* Project Metadata Section (Top-Left Aligned with Colon Alignment like Excel Sheet) */}
        <div className="text-xs sm:text-[13px] leading-relaxed mb-4 font-sans text-black">
          <table className="border-none text-left">
            <tbody>
              <tr>
                <td className="font-semibold pr-3 py-0.5 whitespace-nowrap text-black">
                  PEKERJAAN
                </td>
                <td className="pr-2 py-0.5 text-black">:</td>
                <td className="py-0.5 text-black font-normal">{pekerjaan}</td>
              </tr>
              <tr>
                <td className="font-semibold pr-3 py-0.5 whitespace-nowrap text-black">
                  NAMA SEKOLAH
                </td>
                <td className="pr-2 py-0.5 text-black">:</td>
                <td className="py-0.5 text-black font-bold uppercase">
                  {namaSekolah}
                </td>
              </tr>
              <tr>
                <td className="font-semibold pr-3 py-0.5 whitespace-nowrap text-black">
                  ALAMAT
                </td>
                <td className="pr-2 py-0.5 text-black">:</td>
                <td className="py-0.5 text-black font-normal">{alamat}</td>
              </tr>
              <tr>
                <td className="font-semibold pr-3 py-0.5 whitespace-nowrap text-black">
                  {is1Week ? 'PERIODE (MINGGU) KE' : 'PERIODE (2 MINGGU) KE'}
                </td>
                <td className="pr-2 py-0.5 text-black">:</td>
                <td className="py-0.5 text-black font-bold">
                  {is1Week ? (
                    activeWeekNum
                  ) : (
                    <>
                      {periodeKe}{' '}
                      <span className="font-normal text-slate-700">
                        (Minggu ke-{mggStart} s.d {mggEnd})
                      </span>
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-semibold pr-3 py-0.5 whitespace-nowrap text-black">
                  PERTANGGAL
                </td>
                <td className="pr-2 py-0.5 text-black">:</td>
                <td className="py-0.5 text-black font-normal">
                  {is1Week ? pertanggal1Week : pertanggal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table Structure: Supports 1-Week (7 Days) and 2-Week (14 Days) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs sm:text-[13px] text-black font-sans">
            <thead>
              {/* Header Tier 1 */}
              <tr className="border-b border-black font-bold bg-white text-black text-center">
                <th
                  rowSpan={3}
                  className="border border-black px-1.5 py-1 text-center w-7 align-middle"
                >
                  NO.
                </th>
                <th
                  rowSpan={3}
                  className="border border-black px-2 py-1 text-center min-w-[130px] align-middle"
                >
                  NAMA TUKANG
                </th>
                <th
                  rowSpan={3}
                  className="border border-black px-1.5 py-1 text-center min-w-[95px] align-middle"
                >
                  TENAGA KERJA
                </th>

                {is1Week ? (
                  <th
                    colSpan={7}
                    className="border border-black py-1 px-1 text-center font-bold tracking-wide bg-slate-100/80"
                  >
                    HARI KERJA (SENIN - MINGGU)
                  </th>
                ) : (
                  <>
                    <th
                      colSpan={7}
                      className="border border-black py-1 px-1 text-center font-bold tracking-wide bg-slate-100/80"
                    >
                      MINGGU I (HARI 1 - 7)
                    </th>
                    <th
                      colSpan={7}
                      className="border border-black py-1 px-1 text-center font-bold tracking-wide bg-slate-200/70"
                    >
                      MINGGU II (HARI 8 - 14)
                    </th>
                  </>
                )}

                <th
                  colSpan={3}
                  className="border border-black py-1 px-1 text-center font-bold tracking-wide bg-slate-100/80"
                >
                  JUMLAH
                </th>
                <th
                  rowSpan={3}
                  className="border border-black px-2 py-1 text-center min-w-[75px] sm:min-w-[90px] w-20 sm:w-24 align-middle font-bold tracking-wide"
                >
                  PARAF
                </th>
                <th
                  rowSpan={3}
                  className="border border-black px-1.5 py-1 text-center w-10 align-middle print:hidden bg-slate-50"
                >
                  AKSI
                </th>
              </tr>

              {/* Header Tier 2 */}
              <tr className="border-b border-black font-bold bg-white text-black text-center">
                {is1Week ? (
                  // 1-Week Days: I s.d VII
                  activeWeekCols.map((h) => {
                    const isLibur = (currentAbsen.hariLibur || []).includes(h.key);
                    return (
                      <th
                        key={h.key}
                        onClick={() => toggleHariLibur(currentAbsen.id, h.key)}
                        className={`border border-black py-1 px-0.5 w-7 text-center cursor-pointer transition select-none ${
                          isLibur
                            ? 'bg-red-50 text-red-700'
                            : 'hover:bg-slate-100 bg-slate-100/50'
                        }`}
                        title={`Minggu ${activeWeekNum} Hari ${h.roman} (${h.dayName}): Klik untuk tandai libur`}
                      >
                        {h.roman}
                      </th>
                    );
                  })
                ) : (
                  // 2-Week Days: Minggu I & Minggu II
                  <>
                    {HARI_KERJA_2_MINGGU.filter((h) => h.weekGroup === 1).map((h) => {
                      const isLibur = (currentAbsen.hariLibur || []).includes(h.key);
                      return (
                        <th
                          key={h.key}
                          onClick={() => toggleHariLibur(currentAbsen.id, h.key)}
                          className={`border border-black py-1 px-0.5 w-7 text-center cursor-pointer transition select-none ${
                            isLibur
                              ? 'bg-red-50 text-red-700'
                              : 'hover:bg-slate-100 bg-slate-100/50'
                          }`}
                          title={`Minggu I Hari ${h.roman} (${h.dayName}): Klik untuk tandai libur`}
                        >
                          {h.roman}
                        </th>
                      );
                    })}
                    {HARI_KERJA_2_MINGGU.filter((h) => h.weekGroup === 2).map((h) => {
                      const isLibur = (currentAbsen.hariLibur || []).includes(h.key);
                      return (
                        <th
                          key={h.key}
                          onClick={() => toggleHariLibur(currentAbsen.id, h.key)}
                          className={`border border-black py-1 px-0.5 w-7 text-center cursor-pointer transition select-none ${
                            isLibur
                              ? 'bg-red-50 text-red-700'
                              : 'hover:bg-slate-100 bg-slate-200/50'
                          }`}
                          title={`Minggu II Hari ${h.roman} (${h.dayName}): Klik untuk tandai libur`}
                        >
                          {h.roman}
                        </th>
                      );
                    })}
                  </>
                )}

                {/* Jumlah sub headers */}
                <th className="border border-black py-1 px-1 text-center min-w-[65px]">
                  TENAGA
                </th>
                <th className="border border-black py-1 px-1.5 text-center min-w-[90px]">
                  UPAH/HARI
                </th>
                <th className="border border-black py-1 px-1.5 text-center min-w-[105px]">
                  {is1Week ? 'UPAH 1 MGG' : 'UPAH 2 MGG'}
                </th>
              </tr>

              {/* Header Tier 3 (Units: O/H, Org/Mgg or Org/2Mgg, (Rp.)) */}
              <tr className="border-b border-black font-semibold bg-white text-black text-center text-[10px]">
                {is1Week
                  ? activeWeekCols.map((h) => (
                      <th
                        key={`unit-${h.key}`}
                        className="border border-black py-0.5 px-0.5 text-center font-normal"
                      >
                        O/H
                      </th>
                    ))
                  : HARI_KERJA_2_MINGGU.map((h) => (
                      <th
                        key={`unit-${h.key}`}
                        className="border border-black py-0.5 px-0.5 text-center font-normal"
                      >
                        O/H
                      </th>
                    ))}
                <th className="border border-black py-0.5 px-1 text-center font-normal">
                  {is1Week ? 'Org/Mgg' : 'Org/2Mgg'}
                </th>
                <th className="border border-black py-0.5 px-1 text-center font-normal">
                  (Rp.)
                </th>
                <th className="border border-black py-0.5 px-1 text-center font-normal">
                  (Rp.)
                </th>
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {currentAbsen.pekerja.map((worker, idx) => {
                const totalHari2Minggu = calculateTotalHari(worker.hariKerja);
                const totalHari1Minggu = calculateTotalHariForWeek(
                  worker.hariKerja,
                  currentSubWeek
                );
                const upah2Minggu = calculateUpahJumlah(worker);
                const upah1Minggu = calculateUpahJumlahForWeek(
                  worker,
                  currentSubWeek
                );

                const activeTotalHari = is1Week
                  ? totalHari1Minggu
                  : totalHari2Minggu;
                const activeUpahPekerja = is1Week ? upah1Minggu : upah2Minggu;
                const rowNum = idx + 1;

                return (
                  <tr
                    key={`${worker.id}-${idx}`}
                    className="border-b border-black hover:bg-amber-50/30 transition-colors"
                  >
                    {/* NO. */}
                    <td className="border border-black py-1 px-1 text-center font-normal">
                      {rowNum}
                    </td>

                    {/* NAMA TUKANG */}
                    <td className="border border-black py-1 px-2 text-left font-normal uppercase whitespace-nowrap">
                      {worker.nama}
                    </td>

                    {/* TENAGA KERJA */}
                    <td className="border border-black py-1 px-1.5 text-left whitespace-nowrap">
                      {worker.tenagaKerja || worker.kategori}
                    </td>

                    {/* Day Columns */}
                    {is1Week
                      ? activeWeekCols.map((h) => {
                          const dayVal = getDayValue(worker.hariKerja, h.key);
                          const isLibur = (currentAbsen.hariLibur || []).includes(
                            h.key
                          );

                          return (
                            <td
                              key={h.key}
                              onClick={() =>
                                handleToggleAttendance(worker.id, h.key, dayVal)
                              }
                              className={`border border-black py-1 px-0.5 text-center font-normal cursor-pointer select-none transition ${
                                isLibur
                                  ? 'bg-red-50/60 text-red-700 hover:bg-red-100'
                                  : 'hover:bg-amber-100/70'
                              }`}
                              title={`Klik untuk ubah kehadiran ${worker.nama} (${h.label}): ${formatDayCell(dayVal)}`}
                            >
                              {formatDayCell(dayVal)}
                            </td>
                          );
                        })
                      : HARI_KERJA_2_MINGGU.map((h) => {
                          const dayVal = getDayValue(worker.hariKerja, h.key);
                          const isLibur = (currentAbsen.hariLibur || []).includes(
                            h.key
                          );

                          return (
                            <td
                              key={h.key}
                              onClick={() =>
                                handleToggleAttendance(worker.id, h.key, dayVal)
                              }
                              className={`border border-black py-1 px-0.5 text-center font-normal cursor-pointer select-none transition ${
                                isLibur
                                  ? 'bg-red-50/60 text-red-700 hover:bg-red-100'
                                  : h.weekGroup === 2
                                  ? 'bg-slate-50/60 hover:bg-amber-100/70'
                                  : 'hover:bg-amber-100/70'
                              }`}
                              title={`Klik untuk ubah kehadiran ${worker.nama} (${h.label}): ${formatDayCell(dayVal)}`}
                            >
                              {formatDayCell(dayVal)}
                            </td>
                          );
                        })}

                    {/* TENAGA (Org/Mgg or Org/2Mgg) */}
                    <td className="border border-black py-1 px-1 text-center font-normal">
                      {formatDecimal(activeTotalHari)}
                    </td>

                    {/* UPAH/HARI (Rp.) */}
                    <td className="border border-black py-1 px-1.5 text-right font-normal tabular-nums whitespace-nowrap">
                      {formatDecimal(worker.upahHarian)}
                    </td>

                    {/* UPAH JUMLAH (Rp.) */}
                    <td className="border border-black py-1 px-2 text-right font-normal tabular-nums whitespace-nowrap">
                      {formatDecimal(activeUpahPekerja)}
                    </td>

                    {/* PARAF: Ruang kosong untuk tanda tangan tukang (tanpa angka) */}
                    <td className="border border-black py-2.5 sm:py-3 px-2 text-center font-normal min-w-[75px] sm:min-w-[90px] w-20 sm:w-24 h-11 print:h-12">
                      {/* Sengaja dikosongkan untuk tanda tangan / paraf fisik tukang */}
                      {worker.paraf && !/^\d+$/.test(worker.paraf.trim()) ? worker.paraf : ''}
                    </td>

                    {/* AKSI (print:hidden) */}
                    <td className="border border-black py-1 px-1 text-center print:hidden bg-slate-50/70">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingWorker({
                              id: worker.id,
                              nama: worker.nama,
                              tenagaKerja: worker.tenagaKerja || worker.kategori,
                              upahHarian: worker.upahHarian,
                              paraf: worker.paraf,
                            })
                          }
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition cursor-pointer"
                          title="Edit nama, jabatan, upah"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `Hapus pekerja ${worker.nama} dari daftar periode ini?`
                              )
                            ) {
                              deletePekerjaFromAbsen(currentAbsen.id, worker.id);
                            }
                          }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition cursor-pointer"
                          title="Hapus pekerja"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Bottom Total Row: JUMLAH UPAH (Rp.) */}
              <tr className="border-t-2 border-black font-bold bg-white text-black">
                <td
                  colSpan={is1Week ? 12 : 19}
                  className="border border-black py-2 px-3 text-center uppercase tracking-wider font-bold"
                >
                  {is1Week
                    ? 'JUMLAH UPAH SATU MINGGU (Rp.)'
                    : 'JUMLAH UPAH DUA MINGGU (Rp.)'}
                </td>
                <td className="border border-black py-2 px-2 text-right font-bold tabular-nums whitespace-nowrap">
                  {formatDecimal(activeGrandTotal)}
                </td>
                <td className="border border-black py-2 px-1 text-center"></td>
                <td className="border border-black py-2 px-1 print:hidden bg-slate-50"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terbilang Box below table */}
        <div className="mt-3 p-2.5 border border-black/40 bg-slate-50 text-xs sm:text-[13px] text-black">
          <span className="font-bold">Terbilang: </span>
          <span className="italic font-medium">
            {terbilangRupiah(activeGrandTotal)}
          </span>
        </div>

        {/* Signatures Section: 2 Columns */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-xs sm:text-[13px] text-black font-sans break-inside-avoid">
          {/* Left Column: Mengetahui; Kepala Sekolah */}
          <div className="text-left pl-2">
            <p>Mengetahui;</p>
            <p>Kepala Sekolah,</p>
            <div className="h-16 sm:h-20" />
            <p className="font-bold underline uppercase">{namaKepalaSekolah}</p>
            <p className="tabular-nums">NIP.{nipKepalaSekolah.replace(/\s+/g, '')}</p>
          </div>

          {/* Right Column: Lunas Bayar, Bendahara */}
          <div className="text-left pl-8 sm:pl-16">
            <p>Lunas Bayar,</p>
            <p>Bendahara,</p>
            <div className="h-16 sm:h-20" />
            <p className="font-bold underline uppercase">{namaBendahara}</p>
            <p className="tabular-nums">NIP.{nipBendahara.replace(/\s+/g, '')}</p>
          </div>
        </div>
      </div>

      {/* Modal Edit Header & Signatures */}
      {isEditHeaderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#210633] border border-amber-400/40 rounded-2xl w-full max-w-lg p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-amber-300 flex items-center space-x-2 mb-4">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <span>Edit Data Rekapitulasi & Penandatangan</span>
            </h3>

            {/* Sync notice inside modal */}
            <div className="bg-purple-950/80 border border-purple-700/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs mb-3">
              <div className="flex items-center space-x-2 text-purple-200">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Nama Sekolah, Kepala Sekolah & Bendahara terhubung ke <strong>Pengaturan Profil</strong>.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditHeaderOpen(false);
                  openProfileModal();
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-sm transition"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Buka Pengaturan</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Pekerjaan
                </label>
                <input
                  type="text"
                  value={currentAbsen.proyek || currentBangunan.nama}
                  onChange={(e) =>
                    updateAbsenMingguanHeader(currentAbsen.id, { proyek: e.target.value })
                  }
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Nama Sekolah (Terhubung ke Pengaturan)
                </label>
                <input
                  type="text"
                  value={profile.namaSekolah || currentAbsen.namaSekolah || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateAbsenMingguanHeader(currentAbsen.id, { namaSekolah: val });
                    setProfile({ namaSekolah: val });
                  }}
                  placeholder="Nama Sekolah dari Pengaturan"
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Alamat Proyek / Sekolah
                </label>
                <input
                  type="text"
                  value={currentAbsen.lokasi || profile.alamat || ''}
                  onChange={(e) =>
                    updateAbsenMingguanHeader(currentAbsen.id, { lokasi: e.target.value })
                  }
                  placeholder="Alamat Proyek"
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-purple-200 font-medium mb-1">
                    Periode (2 Minggu) Ke
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentAbsen.periodeKe || currentAbsen.mingguKe || 1}
                    onChange={(e) => {
                      const pVal = parseInt(e.target.value) || 1;
                      updateAbsenMingguanHeader(currentAbsen.id, {
                        periodeKe: pVal,
                        mingguKe: pVal,
                      });
                    }}
                    className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <p className="text-[10px] text-purple-400 mt-0.5">
                    Mencakup Minggu ke-{((currentAbsen.periodeKe || currentAbsen.mingguKe || 1) - 1) * 2 + 1} s.d {(currentAbsen.periodeKe || currentAbsen.mingguKe || 1) * 2}
                  </p>
                </div>
                <div>
                  <label className="block text-purple-200 font-medium mb-1">
                    Pertanggal (Rentang 14 Hari)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 14 s.d 27 Agustus 2023"
                    value={currentAbsen.hariTanggal}
                    onChange={(e) =>
                      updateAbsenMingguanHeader(currentAbsen.id, {
                        hariTanggal: e.target.value,
                      })
                    }
                    className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="border-t border-purple-800/60 pt-3">
                <h4 className="text-amber-300 font-bold mb-2">Penandatangan Laporan (Terhubung ke Pengaturan):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] text-purple-300 font-semibold">Kepala Sekolah:</p>
                    <input
                      type="text"
                      placeholder="Nama Kepala Sekolah"
                      value={profile.namaKepalaSekolah || currentAbsen.namaKepalaSekolah || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateAbsenMingguanHeader(currentAbsen.id, { namaKepalaSekolah: val });
                        setProfile({ namaKepalaSekolah: val });
                      }}
                      className="w-full bg-[#160424] border border-purple-800 rounded px-2.5 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      placeholder="NIP Kepala Sekolah"
                      value={profile.nipKepalaSekolah || currentAbsen.nipKepalaSekolah || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateAbsenMingguanHeader(currentAbsen.id, { nipKepalaSekolah: val });
                        setProfile({ nipKepalaSekolah: val });
                      }}
                      className="w-full bg-[#160424] border border-purple-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] text-purple-300 font-semibold">Bendahara:</p>
                    <input
                      type="text"
                      placeholder="Nama Bendahara"
                      value={profile.namaBendahara || currentAbsen.namaBendahara || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateAbsenMingguanHeader(currentAbsen.id, { namaBendahara: val });
                        setProfile({ namaBendahara: val });
                      }}
                      className="w-full bg-[#160424] border border-purple-800 rounded px-2.5 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      placeholder="NIP Bendahara"
                      value={profile.nipBendahara || currentAbsen.nipBendahara || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateAbsenMingguanHeader(currentAbsen.id, { nipBendahara: val });
                        setProfile({ nipBendahara: val });
                      }}
                      className="w-full bg-[#160424] border border-purple-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditHeaderOpen(false)}
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs shadow-md cursor-pointer"
                >
                  Selesai Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Pekerja Baru */}
      {isAddWorkerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#210633] border border-amber-400/40 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <h3 className="text-base font-bold text-amber-300 flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Tambah Pekerja ke Rekapitulasi</span>
            </h3>

            <form onSubmit={handleAddWorkerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Nama Pekerja (Nama Tukang)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: JONI, RISKIATUL, ARTON K."
                  value={newWorkerNama}
                  onChange={(e) => setNewWorkerNama(e.target.value)}
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 uppercase"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Tenaga Kerja (Jabatan / Peran)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['Kepala Tukang', 'Tukang', 'Pekerja'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setNewWorkerTenagaKerja(role);
                        if (role === 'Kepala Tukang') setNewWorkerUpah(150000);
                        else if (role === 'Tukang') setNewWorkerUpah(140000);
                        else setNewWorkerUpah(100000);
                      }}
                      className={`py-2 rounded-lg font-bold border text-xs transition ${
                        newWorkerTenagaKerja === role
                          ? 'bg-amber-400 text-purple-950 border-amber-400 shadow-md'
                          : 'bg-[#160424] text-purple-300 border-purple-800'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newWorkerTenagaKerja}
                  onChange={(e) => setNewWorkerTenagaKerja(e.target.value)}
                  placeholder="Atau ketik peran lain..."
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Upah / Hari (Rp.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={newWorkerUpah}
                  onChange={(e) => setNewWorkerUpah(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
                <p className="text-[11px] text-purple-300 mt-1">
                  Sesuai screenshot: Kepala Tukang Rp 150rb, Tukang Rp 140rb, Pekerja Rp 100rb.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddWorkerOpen(false)}
                  className="px-4 py-2 rounded-lg bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs shadow-md cursor-pointer"
                >
                  Tambahkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Data Pekerja */}
      {editingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#210633] border border-amber-400/40 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <h3 className="text-base font-bold text-amber-300 flex items-center space-x-2 mb-4">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <span>Edit Data Pekerja: {editingWorker.nama}</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Nama Tukang
                </label>
                <input
                  type="text"
                  value={editingWorker.nama}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, nama: e.target.value })
                  }
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 uppercase"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Tenaga Kerja (Jabatan / Peran)
                </label>
                <input
                  type="text"
                  value={editingWorker.tenagaKerja}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, tenagaKerja: e.target.value })
                  }
                  placeholder="Kepala Tukang / Tukang / Pekerja"
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Upah / Hari (Rp.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editingWorker.upahHarian}
                  onChange={(e) =>
                    setEditingWorker({
                      ...editingWorker,
                      upahHarian: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Catatan / Paraf (Opsional)
                </label>
                <input
                  type="text"
                  value={editingWorker.paraf || ''}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, paraf: e.target.value })
                  }
                  placeholder="Kosongkan untuk ruang tanda tangan tukang"
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white font-mono"
                />
                <p className="text-[11px] text-purple-300 mt-1">
                  Biarkan kosong agar kolom PARAF menjadi ruang kosong untuk tanda tangan tukang (tanpa angka).
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  className="px-4 py-2 rounded-lg bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditWorker}
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Bangunan Baru */}
      {isAddBangunanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#210633] border border-amber-400/50 rounded-2xl w-full max-w-lg p-6 text-white shadow-2xl relative">
            <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-purple-800/60">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Tambah Bangunan / Gedung Baru
                </h3>
                <p className="text-xs text-purple-300">
                  Daftar upah tukang akan tersimpan terpisah untuk bangunan ini.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddBangunanSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-purple-200 font-semibold mb-1">
                  Nama Bangunan / Gedung Pekerjaan <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembangunan Ruang Kelas Baru (RKB)"
                  value={newBangunanNama}
                  onChange={(e) => setNewBangunanNama(e.target.value)}
                  className="w-full bg-[#160424] border border-purple-700/80 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-semibold mb-1">
                  Lokasi / Alamat Pengerjaan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: JL. NELAYAN DUSUN 1 BAMBANIPA, DESA PALASA"
                  value={newBangunanLokasi}
                  onChange={(e) => setNewBangunanLokasi(e.target.value)}
                  className="w-full bg-[#160424] border border-purple-700/80 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-semibold mb-1">
                  Keterangan Pekerjaan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pekerjaan Pembangunan Gedung 2 Ruang"
                  value={newBangunanKeterangan}
                  onChange={(e) => setNewBangunanKeterangan(e.target.value)}
                  className="w-full bg-[#160424] border border-purple-700/80 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="bg-[#180327] border border-purple-800/80 rounded-xl p-3 space-y-2">
                <label className="block text-purple-200 font-semibold">
                  Opsi Cepat: Salin Daftar Tukang & Upah Awal
                </label>
                <p className="text-[11px] text-purple-300">
                  Secara otomatis menyalin nama mandor, kepala tukang, tukang, dan upah harian dari bangunan yang sudah ada:
                </p>
                <div className="relative">
                  <select
                    value={newBangunanDonorId}
                    onChange={(e) => setNewBangunanDonorId(e.target.value)}
                    className="w-full appearance-none bg-[#240838] border border-purple-700 rounded-lg px-3 py-2 pr-8 text-xs font-medium text-white focus:outline-none focus:border-amber-400"
                  >
                    {bangunanList.map((b) => (
                      <option key={b.id} value={b.id}>
                        Salin dari: {b.nama} ({b.kode || 'BG'})
                      </option>
                    ))}
                    <option value="">Gunakan template umum tukang standar</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-purple-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-purple-800/60">
                <button
                  type="button"
                  onClick={() => setIsAddBangunanOpen(false)}
                  className="px-4 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 font-medium cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-bold shadow-md cursor-pointer transition"
                >
                  Simpan & Mulai Buat Upah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Bangunan */}
      {isManageBangunanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#210633] border border-purple-700/80 rounded-2xl w-full max-w-2xl p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-purple-800/60 mb-4">
              <div className="flex items-center space-x-2.5">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Kelola Daftar Bangunan / Proyek
                  </h3>
                  <p className="text-xs text-purple-300">
                    Total {bangunanList.length} bangunan tersimpan di aplikasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageBangunanOpen(false)}
                className="text-purple-300 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-purple-900/50"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {bangunanList.map((b) => {
                const isCurrentActive = b.id === currentBangunan.id;
                const isEditingThis = editingBangunanId === b.id;
                const weeksCount = uniqueAbsenTukangList.filter(
                  (w) => (w.bangunanId || 'bangunan-1') === b.id
                ).length;

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition ${
                      isCurrentActive
                        ? 'bg-amber-400/10 border-amber-400/50'
                        : 'bg-[#180327] border-purple-800/70'
                    }`}
                  >
                    {isEditingThis ? (
                      <div className="space-y-3">
                        <div className="font-bold text-amber-300">Edit Data Bangunan:</div>
                        <div>
                          <label className="block text-purple-300 mb-1">Nama Bangunan:</label>
                          <input
                            type="text"
                            value={editBangunanNama}
                            onChange={(e) => setEditBangunanNama(e.target.value)}
                            className="w-full bg-[#120220] border border-purple-700 rounded px-3 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-purple-300 mb-1">Lokasi:</label>
                          <input
                            type="text"
                            value={editBangunanLokasi}
                            onChange={(e) => setEditBangunanLokasi(e.target.value)}
                            className="w-full bg-[#120220] border border-purple-700 rounded px-3 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-purple-300 mb-1">Keterangan:</label>
                          <input
                            type="text"
                            value={editBangunanKeterangan}
                            onChange={(e) => setEditBangunanKeterangan(e.target.value)}
                            className="w-full bg-[#120220] border border-purple-700 rounded px-3 py-1.5 text-white"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingBangunanId(null)}
                            className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800 text-purple-300 rounded-lg"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditBangunan}
                            className="px-4 py-1.5 bg-amber-400 text-purple-950 font-bold rounded-lg"
                          >
                            Simpan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-purple-800 text-amber-300 font-mono text-[11px] font-bold">
                              {b.kode || 'BG'}
                            </span>
                            <span className="font-bold text-white text-sm">
                              {b.nama}
                            </span>
                            {isCurrentActive && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                                Aktif Saat Ini
                              </span>
                            )}
                          </div>
                          <p className="text-purple-300 text-[11px] mt-1">
                            Lokasi: {b.lokasi || '-'}
                          </p>
                          <div className="flex items-center space-x-2 mt-1 text-[11px] text-purple-300">
                            <span className="text-amber-300 font-semibold">
                              {weeksCount} minggu upah tersimpan
                            </span>
                            {b.keterangan && <span>• {b.keterangan}</span>}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {!isCurrentActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBangunanId(b.id);
                                setIsManageBangunanOpen(false);
                              }}
                              className="px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-purple-100 rounded-lg font-medium"
                            >
                              Pilih
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditBangunan(b)}
                            className="p-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-lg"
                            title="Edit nama / lokasi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {bangunanList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBangunan(b.id, b.nama)}
                              className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg"
                              title="Hapus bangunan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-purple-800/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsManageBangunanOpen(false);
                  setNewBangunanNama('');
                  setNewBangunanLokasi(profile.alamat ? `${profile.alamat}, ${profile.kabupaten || ''}` : '');
                  setNewBangunanKeterangan('');
                  setNewBangunanDonorId(currentBangunan.id);
                  setIsAddBangunanOpen(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold rounded-xl text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bangunan Baru</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManageBangunanOpen(false)}
                className="px-4 py-2 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
