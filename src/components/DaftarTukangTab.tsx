import React, { useState, useMemo } from 'react';
import { useLpjStore } from '../store/lpjStore';
import {
  calculateTotalHari,
  formatDayCell,
  formatTotalHari,
  calculateUpahJumlah,
} from '../utils/bahanTukangUtils';
import { formatRupiah } from '../utils/calculations';
import {
  Users,
  Plus,
  Printer,
  Calendar,
  Trash2,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  Info,
  ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { HariKerjaRecord, KategoriPekerja, PekerjaTukang } from '../types';

export const DaftarTukangTab: React.FC = () => {
  const {
    profile,
    absenTukangList,
    selectedAbsenWeekId,
    setSelectedAbsenWeekId,
    updateAbsenMingguanHeader,
    updatePekerjaAttendance,
    addPekerjaToAbsen,
    updatePekerjaInfo,
    deletePekerjaFromAbsen,
    addNewAbsenWeek,
  } = useLpjStore();

  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [addWorkerKategori, setAddWorkerKategori] = useState<KategoriPekerja>('TUKANG');
  const [newWorkerNama, setNewWorkerNama] = useState('');
  const [newWorkerUpah, setNewWorkerUpah] = useState<number>(110000);

  // Editing Worker Inline Modal
  const [editingWorker, setEditingWorker] = useState<{
    id: string;
    nama: string;
    upahHarian: number;
    kategori: KategoriPekerja;
  } | null>(null);

  // Currently selected week data
  const currentAbsen = useMemo(() => {
    return (
      absenTukangList.find((w) => w.id === selectedAbsenWeekId) ||
      absenTukangList[0] ||
      null
    );
  }, [absenTukangList, selectedAbsenWeekId]);

  // Split workers by category
  const tukangWorkers = useMemo(() => {
    return currentAbsen?.pekerja.filter((p) => p.kategori === 'TUKANG') || [];
  }, [currentAbsen]);

  const knekWorkers = useMemo(() => {
    return currentAbsen?.pekerja.filter((p) => p.kategori === 'KNEK') || [];
  }, [currentAbsen]);

  // Grand Total of Wages
  const grandTotalUpah = useMemo(() => {
    if (!currentAbsen) return 0;
    return currentAbsen.pekerja.reduce((sum, p) => sum + calculateUpahJumlah(p), 0);
  }, [currentAbsen]);

  // Toggle Day Attendance: 1 -> 0.5 -> 0 -> 1
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
      addWorkerKategori,
      newWorkerNama.trim(),
      newWorkerUpah
    );

    setNewWorkerNama('');
    setIsAddWorkerOpen(false);
  };

  const handleSaveEditWorker = () => {
    if (!currentAbsen || !editingWorker) return;
    updatePekerjaInfo(currentAbsen.id, editingWorker.id, {
      nama: editingWorker.nama,
      upahHarian: editingWorker.upahHarian,
      kategori: editingWorker.kategori,
    });
    setEditingWorker(null);
  };

  const handleCreateNewWeek = () => {
    const nextWeekNum = (currentAbsen?.mingguKe || absenTukangList.length) + 1;
    addNewAbsenWeek(nextWeekNum);
  };

  const handleExportExcelAbsen = () => {
    if (!currentAbsen) return;

    const dataRows = [
      ['ABSEN HARIAN TUKANG'],
      [],
      ['Proyek', `:\t${currentAbsen.proyek}`],
      ['Lokasi', `:\t${currentAbsen.lokasi}`],
      ['Minggu ke', `:\t${currentAbsen.mingguKe}`],
      ['Hari Tanggal', `:\t${currentAbsen.hariTanggal}`],
      [],
      [
        'No.',
        'Nama',
        'Minggu',
        'Senin',
        'Selasa',
        'Rabu',
        'Kamis',
        'Jumat',
        'Sabtu',
        'Jml Hari',
        'Upah',
        'Jumlah',
      ],
      ['', 'Tukang', '', '', '', '', '', '', '', '', '', ''],
      ...tukangWorkers.map((p, idx) => [
        idx + 1,
        p.nama,
        formatDayCell(p.hariKerja.minggu),
        formatDayCell(p.hariKerja.senin),
        formatDayCell(p.hariKerja.selasa),
        formatDayCell(p.hariKerja.rabu),
        formatDayCell(p.hariKerja.kamis),
        formatDayCell(p.hariKerja.jumat),
        formatDayCell(p.hariKerja.sabtu),
        formatTotalHari(calculateTotalHari(p.hariKerja)),
        p.upahHarian,
        calculateUpahJumlah(p),
      ]),
      ['', 'Knek', '', '', '', '', '', '', '', '', '', ''],
      ...knekWorkers.map((p, idx) => [
        idx + 1,
        p.nama,
        formatDayCell(p.hariKerja.minggu),
        formatDayCell(p.hariKerja.senin),
        formatDayCell(p.hariKerja.selasa),
        formatDayCell(p.hariKerja.rabu),
        formatDayCell(p.hariKerja.kamis),
        formatDayCell(p.hariKerja.jumat),
        formatDayCell(p.hariKerja.sabtu),
        formatTotalHari(calculateTotalHari(p.hariKerja)),
        p.upahHarian,
        calculateUpahJumlah(p),
      ]),
      ['', 'Jumlah Total', '', '', '', '', '', '', '', '', '', grandTotalUpah],
    ];

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 16 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Absen M${currentAbsen.mingguKe}`);
    XLSX.writeFile(wb, `ABSEN_TUKANG_MINGGU_${currentAbsen.mingguKe}.xlsx`);
  };

  if (!currentAbsen) {
    return <div className="p-8 text-center text-purple-300">Memuat data absen...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Top Controls Toolbar (Hidden on print) */}
      <div className="bg-[#240838] border border-amber-400/20 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        {/* Week Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-purple-300 flex items-center space-x-1.5 mr-1 font-semibold">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Pilih Minggu:</span>
          </div>
          {absenTukangList.map((week) => (
            <button
              key={week.id}
              onClick={() => setSelectedAbsenWeekId(week.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                week.id === currentAbsen.id
                  ? 'bg-amber-400 text-purple-950 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-purple-900/40 text-purple-200 hover:bg-purple-800/60 border border-purple-700/50'
              }`}
            >
              <span>Minggu {week.mingguKe}</span>
            </button>
          ))}
          <button
            onClick={handleCreateNewWeek}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-800/40 hover:bg-purple-700/50 text-amber-300 border border-dashed border-amber-400/40 transition flex items-center space-x-1"
            title="Tambah Lembar Absen Minggu Baru"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Minggu Baru</span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditHeaderOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-purple-800/50 hover:bg-purple-700/60 border border-purple-500/40 text-purple-100 rounded-lg transition font-medium"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Data Proyek</span>
          </button>

          <button
            onClick={() => {
              setAddWorkerKategori('TUKANG');
              setNewWorkerUpah(110000);
              setIsAddWorkerOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-purple-800/50 hover:bg-purple-700/60 border border-purple-500/40 text-purple-100 rounded-lg transition font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Pekerja</span>
          </button>

          <button
            onClick={handleExportExcelAbsen}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-500/40 text-emerald-200 rounded-lg transition font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-lg transition font-bold shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Tip Banner on interactive attendance */}
      <div className="bg-purple-900/30 border border-purple-600/30 rounded-lg p-3 text-xs text-purple-200 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Tips Pengisian Cepat:</strong> Klik langsung pada kotak hari kerja (Minggu s/d Sabtu) untuk mengganti status: <span className="text-amber-300 font-bold">1</span> (Hadir penuh) → <span className="text-cyan-300 font-bold">½</span> (Setengah hari) → <span className="text-slate-400 font-bold">-</span> (Libur/Tidak hadir).
          </span>
        </div>
        <div className="text-[11px] text-amber-300/80 font-mono flex-shrink-0 hidden sm:block">
          Total Upah: {formatRupiah(grandTotalUpah)}
        </div>
      </div>

      {/* Printable Sheet (EXACT MATCH of Screenshot 2026-09-16 083304.png) */}
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-300 print:shadow-none print:border-none print:m-0 print:p-2">
        {/* Document Title Header */}
        <h2 className="text-center text-lg sm:text-xl font-bold tracking-wider uppercase text-slate-900 mb-6 underline underline-offset-4 decoration-1">
          ABSEN HARIAN TUKANG
        </h2>

        {/* Project Metadata Header (2 Column / Aligned Table Format matching photo) */}
        <div className="text-xs sm:text-sm mb-5 grid grid-cols-1 sm:grid-cols-2 gap-y-1 font-serif text-slate-900">
          <div className="space-y-1">
            <div className="flex">
              <span className="w-24 sm:w-28 font-semibold">Proyek</span>
              <span>: {currentAbsen.proyek}</span>
            </div>
            <div className="flex">
              <span className="w-24 sm:w-28 font-semibold">Lokasi</span>
              <span>: {currentAbsen.lokasi}</span>
            </div>
          </div>
          <div className="space-y-1 sm:pl-8">
            <div className="flex">
              <span className="w-28 sm:w-32 font-semibold">Minggu ke</span>
              <span>: {currentAbsen.mingguKe}</span>
            </div>
            <div className="flex">
              <span className="w-28 sm:w-32 font-semibold">Hari Tanggal</span>
              <span>: {currentAbsen.hariTanggal}</span>
            </div>
          </div>
        </div>

        {/* The Exact Table from Screenshot */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse border border-slate-900 text-xs sm:text-[13px] font-sans">
            <thead>
              {/* Header Row 1 */}
              <tr className="border-b border-slate-900 font-bold bg-slate-50 text-slate-900">
                <th rowSpan={2} className="border-r border-slate-900 py-2 px-2 w-10 text-center">
                  No.
                </th>
                <th rowSpan={2} className="border-r border-slate-900 py-2 px-3 text-center min-w-[130px]">
                  Nama
                </th>
                <th colSpan={7} className="border-r border-slate-900 py-1 px-1 text-center font-bold">
                  Hari Kerja
                </th>
                <th rowSpan={2} className="border-r border-slate-900 py-2 px-2 w-14 text-center">
                  <div>Jml</div>
                  <div>Hari</div>
                </th>
                <th rowSpan={2} className="border-r border-slate-900 py-2 px-3 w-28 text-center">
                  Upah
                </th>
                <th rowSpan={2} className="border-r border-slate-900 py-2 px-3 w-32 text-center">
                  Jumlah
                </th>
                <th rowSpan={2} className="py-2 px-2 w-12 text-center print:hidden">
                  Aksi
                </th>
              </tr>

              {/* Header Row 2: Sub-columns for Days */}
              <tr className="border-b-2 border-slate-900 font-semibold bg-slate-50 text-slate-800 text-[11px] sm:text-xs">
                <th className="border-r border-slate-900 py-1.5 px-1 w-9">Minggu</th>
                <th className="border-r border-slate-900 py-1.5 px-1 w-9">Senin</th>
                <th className="border-r border-slate-900 py-1.5 px-1 w-9">Selasa</th>
                <th className="border-r border-slate-900 py-1.5 px-1 w-9">Rabu</th>
                <th className="border-r border-slate-900 py-1.5 px-1 w-9">Kamis</th>
                <th className="border-r border-slate-900 py-1.5 px-1 w-9">Jumat</th>
                <th className="border-r border-slate-900 py-1.5 px-1 w-9">Sabtu</th>
              </tr>
            </thead>

            <tbody>
              {/* CATEGORY 1: TUKANG DIVIDER ROW */}
              <tr className="border-b border-slate-900 bg-slate-100/90 font-bold text-slate-900">
                <td colSpan={12} className="py-1 text-center tracking-wider text-xs sm:text-sm">
                  Tukang
                </td>
                <td className="print:hidden"></td>
              </tr>

              {/* TUKANG WORKER ROWS */}
              {tukangWorkers.map((p, idx) => {
                const totalHari = calculateTotalHari(p.hariKerja);
                const jumlahUpah = calculateUpahJumlah(p);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-900 hover:bg-amber-50/50 transition-colors"
                  >
                    <td className="border-r border-slate-900 py-1.5 px-1 text-center font-medium">
                      {idx + 1}.
                    </td>
                    <td className="border-r border-slate-900 py-1.5 px-3 text-left font-medium text-slate-900">
                      {p.nama}
                    </td>

                    {/* Day Attendance cells (clickable to toggle) */}
                    {(['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as (keyof HariKerjaRecord)[]).map(
                      (day) => {
                        const val = p.hariKerja[day];
                        return (
                          <td
                            key={day}
                            onClick={() => handleToggleAttendance(p.id, day, val)}
                            title="Klik untuk ubah: 1 / ½ / -"
                            className="border-r border-slate-900 py-1.5 px-0.5 text-center cursor-pointer hover:bg-amber-200/60 transition select-none font-bold"
                          >
                            <span
                              className={`${
                                val === 1
                                  ? 'text-slate-900'
                                  : val === 0.5
                                  ? 'text-blue-700 font-black'
                                  : 'text-slate-400 font-normal'
                              }`}
                            >
                              {formatDayCell(val)}
                            </span>
                          </td>
                        );
                      }
                    )}

                    {/* Jml Hari */}
                    <td className="border-r border-slate-900 py-1.5 px-1 text-center font-bold text-slate-900">
                      {formatTotalHari(totalHari)}
                    </td>

                    {/* Upah Harian */}
                    <td className="border-r border-slate-900 py-1.5 px-2 text-right font-mono text-slate-900">
                      {formatRupiah(p.upahHarian)},-
                    </td>

                    {/* Jumlah Upah */}
                    <td className="border-r border-slate-900 py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                      {formatRupiah(jumlahUpah)},-
                    </td>

                    {/* Actions column */}
                    <td className="py-1 px-1 text-center print:hidden">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setEditingWorker({ ...p })}
                          title="Edit nama & upah"
                          className="p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePekerjaFromAbsen(currentAbsen.id, p.id)}
                          title="Hapus pekerja"
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Blank lines for Tukang up to 10 rows (matching photo layout) */}
              {tukangWorkers.length < 10 &&
                Array.from({ length: 10 - tukangWorkers.length }).map((_, i) => {
                  const num = tukangWorkers.length + i + 1;
                  return (
                    <tr key={`empty-tk-${num}`} className="border-b border-slate-900 h-6">
                      <td className="border-r border-slate-900 text-center text-slate-400 text-xs">
                        {num}.
                      </td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="print:hidden"></td>
                    </tr>
                  );
                })}

              {/* CATEGORY 2: KNEK DIVIDER ROW */}
              <tr className="border-b border-slate-900 bg-slate-100/90 font-bold text-slate-900">
                <td colSpan={12} className="py-1 text-center tracking-wider text-xs sm:text-sm">
                  Knek
                </td>
                <td className="print:hidden"></td>
              </tr>

              {/* KNEK WORKER ROWS */}
              {knekWorkers.map((p, idx) => {
                const totalHari = calculateTotalHari(p.hariKerja);
                const jumlahUpah = calculateUpahJumlah(p);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-900 hover:bg-amber-50/50 transition-colors"
                  >
                    <td className="border-r border-slate-900 py-1.5 px-1 text-center font-medium">
                      {idx + 1}.
                    </td>
                    <td className="border-r border-slate-900 py-1.5 px-3 text-left font-medium text-slate-900">
                      {p.nama}
                    </td>

                    {/* Day Attendance cells */}
                    {(['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as (keyof HariKerjaRecord)[]).map(
                      (day) => {
                        const val = p.hariKerja[day];
                        return (
                          <td
                            key={day}
                            onClick={() => handleToggleAttendance(p.id, day, val)}
                            title="Klik untuk ubah: 1 / ½ / -"
                            className="border-r border-slate-900 py-1.5 px-0.5 text-center cursor-pointer hover:bg-amber-200/60 transition select-none font-bold"
                          >
                            <span
                              className={`${
                                val === 1
                                  ? 'text-slate-900'
                                  : val === 0.5
                                  ? 'text-blue-700 font-black'
                                  : 'text-slate-400 font-normal'
                              }`}
                            >
                              {formatDayCell(val)}
                            </span>
                          </td>
                        );
                      }
                    )}

                    {/* Jml Hari */}
                    <td className="border-r border-slate-900 py-1.5 px-1 text-center font-bold text-slate-900">
                      {formatTotalHari(totalHari)}
                    </td>

                    {/* Upah Harian */}
                    <td className="border-r border-slate-900 py-1.5 px-2 text-right font-mono text-slate-900">
                      {formatRupiah(p.upahHarian)},-
                    </td>

                    {/* Jumlah Upah */}
                    <td className="border-r border-slate-900 py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                      {formatRupiah(jumlahUpah)},-
                    </td>

                    {/* Actions */}
                    <td className="py-1 px-1 text-center print:hidden">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setEditingWorker({ ...p })}
                          title="Edit nama & upah"
                          className="p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePekerjaFromAbsen(currentAbsen.id, p.id)}
                          title="Hapus pekerja"
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Blank lines for Knek up to 10 rows (matching photo layout) */}
              {knekWorkers.length < 10 &&
                Array.from({ length: 10 - knekWorkers.length }).map((_, i) => {
                  const num = knekWorkers.length + i + 1;
                  return (
                    <tr key={`empty-kn-${num}`} className="border-b border-slate-900 h-6">
                      <td className="border-r border-slate-900 text-center text-slate-400 text-xs">
                        {num}.
                      </td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="border-r border-slate-900"></td>
                      <td className="print:hidden"></td>
                    </tr>
                  );
                })}
            </tbody>

            {/* GRAND TOTAL BOTTOM ROW */}
            <tfoot>
              <tr className="font-bold text-slate-900 border-t-2 border-slate-900">
                <td
                  colSpan={11}
                  className="border-r border-slate-900 py-2.5 px-4 text-center font-bold tracking-wider uppercase text-xs sm:text-sm"
                >
                  Jumlah
                </td>
                <td className="border-r border-slate-900 py-2.5 px-3 text-right font-mono font-extrabold text-sm sm:text-base text-slate-950 bg-slate-50">
                  {formatRupiah(grandTotalUpah)},-
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Print Signature Section */}
        <div className="hidden print:grid grid-cols-3 gap-6 text-center text-xs text-slate-800 pt-8 mt-6 border-t border-slate-300">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah / Penanggung Jawab</p>
            <div className="h-20" />
            <p className="font-bold underline">{profile.namaKepalaSekolah}</p>
            <p>NIP. {profile.nipKepalaSekolah}</p>
          </div>
          <div>
            <p>Diperiksa Oleh,</p>
            <p className="font-bold">Ketua Panitia / Pengawas</p>
            <div className="h-20" />
            <p className="font-bold underline">{profile.namaPanitia || 'Ketua Panitia'}</p>
            <p>Panitia Pembangunan</p>
          </div>
          <div>
            <p>{currentAbsen.lokasi.split(',')[0] || profile.tempatPelunasan}, {currentAbsen.hariTanggal.split(',')[1] || currentAbsen.hariTanggal}</p>
            <p className="font-bold">Mandor / Bendahara</p>
            <div className="h-20" />
            <p className="font-bold underline">{profile.namaBendahara}</p>
            <p>NIP. {profile.nipBendahara || '-'}</p>
          </div>
        </div>
      </div>

      {/* Modal Edit Metadata Header Proyek */}
      {isEditHeaderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#210633] border border-amber-400/40 rounded-2xl w-full max-w-lg p-6 text-white shadow-2xl relative">
            <h3 className="text-base font-bold text-amber-300 flex items-center space-x-2 mb-4">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <span>Edit Data Absen Minggu {currentAbsen.mingguKe}</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Nama Proyek
                </label>
                <input
                  type="text"
                  value={currentAbsen.proyek}
                  onChange={(e) =>
                    updateAbsenMingguanHeader(currentAbsen.id, { proyek: e.target.value })
                  }
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Lokasi
                </label>
                <input
                  type="text"
                  value={currentAbsen.lokasi}
                  onChange={(e) =>
                    updateAbsenMingguanHeader(currentAbsen.id, { lokasi: e.target.value })
                  }
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-purple-200 font-medium mb-1">
                    Minggu ke
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentAbsen.mingguKe}
                    onChange={(e) =>
                      updateAbsenMingguanHeader(currentAbsen.id, {
                        mingguKe: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-purple-200 font-medium mb-1">
                    Hari Tanggal
                  </label>
                  <input
                    type="text"
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

              <div className="flex items-center justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditHeaderOpen(false)}
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs shadow-md"
                >
                  Selesai
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
              <span>Tambah Pekerja ke Absen</span>
            </h3>

            <form onSubmit={handleAddWorkerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Kategori Tenaga Kerja
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddWorkerKategori('TUKANG');
                      setNewWorkerUpah(110000);
                    }}
                    className={`py-2 rounded-lg font-bold border transition ${
                      addWorkerKategori === 'TUKANG'
                        ? 'bg-amber-400 text-purple-950 border-amber-400'
                        : 'bg-[#160424] text-purple-300 border-purple-800'
                    }`}
                  >
                    Tukang (Rp 110rb - 125rb)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddWorkerKategori('KNEK');
                      setNewWorkerUpah(80000);
                    }}
                    className={`py-2 rounded-lg font-bold border transition ${
                      addWorkerKategori === 'KNEK'
                        ? 'bg-amber-400 text-purple-950 border-amber-400'
                        : 'bg-[#160424] text-purple-300 border-purple-800'
                    }`}
                  >
                    Knek / Laden (Rp 80rb)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Nama Pekerja
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap atau panggilan tukang..."
                  value={newWorkerNama}
                  onChange={(e) => setNewWorkerNama(e.target.value)}
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Upah Harian (Rp)
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
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddWorkerOpen(false)}
                  className="px-4 py-2 rounded-lg bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs shadow-md"
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
                  Nama Pekerja
                </label>
                <input
                  type="text"
                  value={editingWorker.nama}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, nama: e.target.value })
                  }
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Kategori
                </label>
                <select
                  value={editingWorker.kategori}
                  onChange={(e) =>
                    setEditingWorker({
                      ...editingWorker,
                      kategori: e.target.value as KategoriPekerja,
                    })
                  }
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="TUKANG">Tukang</option>
                  <option value="KNEK">Knek / Laden</option>
                </select>
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Upah Harian (Rp)
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

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  className="px-4 py-2 rounded-lg bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditWorker}
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
