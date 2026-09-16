import React, { useState, useMemo } from 'react';
import { useLpjStore } from '../store/lpjStore';
import { extractDaftarBahan } from '../utils/bahanTukangUtils';
import { formatRupiah } from '../utils/calculations';
import {
  Boxes,
  Search,
  Plus,
  Printer,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const DaftarBahanTab: React.FC = () => {
  const { transactions, customBahanList, addCustomBahan, deleteCustomBahan, profile } =
    useLpjStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [aggregateMode, setAggregateMode] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding manual bahan
  const [newNama, setNewNama] = useState('');
  const [newVolume, setNewVolume] = useState<number>(1);
  const [newSatuan, setNewSatuan] = useState('Sak');
  const [newHarga, setNewHarga] = useState<number>(0);

  // Auto extracted bahan from transactions
  const autoBahan = useMemo(() => {
    return extractDaftarBahan(transactions, aggregateMode);
  }, [transactions, aggregateMode]);

  // Combined with custom items
  const allBahan = useMemo(() => {
    const combined = [...autoBahan, ...customBahanList];
    if (!searchQuery.trim()) return combined;
    const q = searchQuery.toLowerCase();
    return combined.filter(
      (b) =>
        b.namaBarang.toLowerCase().includes(q) ||
        b.satuanDisplay.toLowerCase().includes(q)
    );
  }, [autoBahan, customBahanList, searchQuery]);

  // Grand Total of All Bahan
  const totalBiayaBahan = useMemo(() => {
    return allBahan.reduce((acc, item) => acc + item.total, 0);
  }, [allBahan]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) return;

    const total = (newVolume || 0) * (newHarga || 0);
    // Kolom "Satuan" diisi jumlah total + satuan sesuai instruksi user
    const satuanDisplay = `${(newVolume || 0).toLocaleString('id-ID')} ${newSatuan.trim()}`;

    addCustomBahan({
      namaBarang: newNama.trim(),
      volume: newVolume,
      namaSatuan: newSatuan.trim(),
      satuanDisplay,
      harga: newHarga,
      total,
    });

    setNewNama('');
    setNewVolume(1);
    setNewHarga(0);
    setIsAddModalOpen(false);
  };

  const handlePrintBahan = () => {
    window.print();
  };

  const handleExportExcelBahan = () => {
    const dataForSheet = [
      ['DAFTAR BAHAN'],
      [`Proyek / Sekolah: ${profile.namaSekolah}`],
      [`Bulan: ${profile.bulanLaporan}`],
      [],
      ['No.', 'Nama Barang', 'Satuan', 'Harga', 'Total'],
      ...allBahan.map((item, idx) => [
        idx + 1,
        item.namaBarang,
        item.satuanDisplay,
        item.harga,
        item.total,
      ]),
      ['', 'Jumlah Total', '', '', totalBiayaBahan],
    ];

    const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
    // Set column widths
    ws['!cols'] = [
      { wch: 6 },
      { wch: 38 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Bahan');
    XLSX.writeFile(wb, `DAFTAR_BAHAN_${profile.namaSekolah.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Controls & Toolbar (Hidden on print) */}
      <div className="bg-[#240838] border border-amber-400/20 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        {/* Left Search & Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama bahan / material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#180526] border border-purple-800/60 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center bg-[#180526] rounded-lg p-0.5 border border-purple-800/40 text-xs">
            <button
              onClick={() => setAggregateMode(true)}
              className={`px-3 py-1 rounded-md transition font-medium ${
                aggregateMode
                  ? 'bg-amber-400 text-purple-950 font-bold'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Agregasi Total
            </button>
            <button
              onClick={() => setAggregateMode(false)}
              className={`px-3 py-1 rounded-md transition font-medium ${
                !aggregateMode
                  ? 'bg-amber-400 text-purple-950 font-bold'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Semua Nota
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-purple-800/50 hover:bg-purple-700/60 border border-purple-500/40 text-purple-100 rounded-lg transition font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Tambah Bahan</span>
          </button>

          <button
            onClick={handleExportExcelBahan}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-500/40 text-emerald-200 rounded-lg transition font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handlePrintBahan}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-lg transition font-bold shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Info Banner: Penjelasan Kolom Satuan */}
      <div className="bg-amber-400/10 border border-amber-400/25 rounded-lg p-3 text-xs text-amber-200/90 flex items-start space-x-2.5 print:hidden">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-amber-300">Format Sesuai Format Excel DAK:</strong> Kolom{' '}
          <span className="font-semibold text-white underline">Satuan</span> otomatis terisi{' '}
          <span className="font-semibold text-white">jumlah total volume yang sudah diinput</span>{' '}
          beserta satuannya (contoh: <em>10 Ret</em>, <em>50 Sak</em>, <em>1 Kbk</em>) yang
          dihitung dari transaksi pengeluaran dan sub-nota belanja material.
        </p>
      </div>

      {/* Printable Paper / Sheet (Styled exactly like Screenshot 2026-09-16 083346.png) */}
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-300 print:shadow-none print:border-none print:m-0">
        {/* Yellow Header Banner: DAFTAR BAHAN */}
        <div className="bg-[#FFEB3B] text-slate-900 font-black text-center py-2 px-4 border-b-2 border-slate-400 uppercase tracking-wider text-base md:text-lg">
          DAFTAR BAHAN
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-400 text-xs sm:text-sm">
            {/* Dark Blue / Teal Table Header (Matching Screenshot) */}
            <thead>
              <tr className="bg-[#0b4d75] text-white font-bold divide-x divide-cyan-700">
                <th className="py-2.5 px-3 text-center w-14 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-center space-x-1">
                    <span>No.</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-4 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-between">
                    <span>Nama Barang</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-4 text-center w-36 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-center space-x-1">
                    <span>Satuan</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right w-36 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-end space-x-1">
                    <span>Harga</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-4 text-right w-40 font-extrabold border-b border-cyan-800">
                  <div className="flex items-center justify-end space-x-1">
                    <span>Total</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </div>
                </th>
                <th className="py-2.5 px-2 text-center w-12 font-medium border-b border-cyan-800 print:hidden">
                  Aksi
                </th>
              </tr>
            </thead>
            {/* Alternating soft-blue and white stripes as shown in screenshot */}
            <tbody className="divide-y divide-slate-300">
              {allBahan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 italic">
                    Belum ada data bahan/material yang diinput.
                  </td>
                </tr>
              ) : (
                allBahan.map((item, index) => {
                  const isStripe = index % 2 === 1;
                  return (
                    <tr
                      key={item.id}
                      className={`divide-x divide-slate-300 hover:bg-amber-50/70 transition-colors ${
                        isStripe ? 'bg-[#d9edf7]' : 'bg-white'
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-700 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-2 px-4 text-slate-900 font-semibold">
                        {item.namaBarang}
                      </td>
                      {/* Kolom Satuan yang diisi jumlah total + satuan */}
                      <td className="py-2 px-4 text-center font-bold text-slate-800">
                        <span className="inline-block px-2 py-0.5 rounded bg-white/70 border border-slate-300 text-xs text-slate-900 font-bold">
                          {item.satuanDisplay}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-slate-800">
                        {formatRupiah(item.harga)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-950">
                        {formatRupiah(item.total)}
                      </td>
                      <td className="py-2 px-2 text-center print:hidden">
                        {item.id.startsWith('custom-') && (
                          <button
                            onClick={() => deleteCustomBahan(item.id)}
                            title="Hapus bahan manual"
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Minimal 10 rows filled with empty light stripes like Excel sheet in photo */}
              {allBahan.length < 10 &&
                Array.from({ length: 10 - allBahan.length }).map((_, i) => {
                  const virtualIdx = allBahan.length + i;
                  const isStripe = virtualIdx % 2 === 1;
                  return (
                    <tr
                      key={`empty-${i}`}
                      className={`divide-x divide-slate-200 h-8 ${
                        isStripe ? 'bg-[#d9edf7]/60' : 'bg-white'
                      }`}
                    >
                      <td className="py-1 px-3 text-center text-slate-400 text-xs">
                        {virtualIdx + 1}
                      </td>
                      <td className="py-1 px-4"></td>
                      <td className="py-1 px-4"></td>
                      <td className="py-1 px-4"></td>
                      <td className="py-1 px-4"></td>
                      <td className="py-1 px-2 print:hidden"></td>
                    </tr>
                  );
                })}
            </tbody>

            {/* Total Footer Row */}
            <tfoot>
              <tr className="bg-[#f1f5f9] font-bold text-slate-900 border-t-2 border-slate-400 divide-x divide-slate-300">
                <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider font-extrabold text-xs sm:text-sm">
                  TOTAL JUMLAH BAHAN
                </td>
                <td className="py-3 px-4 text-center text-xs font-bold text-slate-700">
                  {allBahan.length} Macam Bahan
                </td>
                <td className="py-3 px-4 text-right text-xs text-slate-500 italic">
                  Akumulasi
                </td>
                <td className="py-3 px-4 text-right font-mono font-extrabold text-sm sm:text-base text-blue-900 bg-amber-100/70">
                  {formatRupiah(totalBiayaBahan)}
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Print Signature Footer (Only printed) */}
        <div className="hidden print:grid grid-cols-2 gap-8 p-6 text-xs text-slate-800 border-t border-slate-300 mt-4">
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah / Penanggung Jawab</p>
            <div className="h-20" />
            <p className="font-bold underline">{profile.namaKepalaSekolah}</p>
            <p>NIP. {profile.nipKepalaSekolah}</p>
          </div>
          <div className="text-center">
            <p>{profile.tempatPelunasan || 'Palasa'}, {profile.tanggalTutupBuku || '31 Agustus 2026'}</p>
            <p className="font-bold">Panitia Pembangunan / Bendahara</p>
            <div className="h-20" />
            <p className="font-bold underline">{profile.namaBendahara}</p>
            <p>NIP. {profile.nipBendahara || '-'}</p>
          </div>
        </div>
      </div>

      {/* Modal Tambah Bahan Manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#210633] border border-amber-400/40 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <h3 className="text-base font-bold text-amber-300 flex items-center space-x-2 mb-4">
              <Boxes className="w-5 h-5 text-amber-400" />
              <span>Tambah Bahan Material Manual</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Nama Barang / Material
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Semen Gresik 50kg, Cat Tembok, Kayu..."
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-purple-200 font-medium mb-1">
                    Volume / Jumlah
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={newVolume}
                    onChange={(e) => setNewVolume(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-purple-200 font-medium mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sak, Ret, M3, Bh, Lbr..."
                    value={newSatuan}
                    onChange={(e) => setNewSatuan(e.target.value)}
                    className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-200 font-medium mb-1">
                  Harga Satuan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newHarga}
                  onChange={(e) => setNewHarga(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#160424] border border-purple-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* Preview Total */}
              <div className="bg-[#140320] p-3 rounded-lg border border-purple-900/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-purple-300">Format Kolom Satuan:</div>
                  <div className="font-bold text-amber-300">
                    {newVolume} {newSatuan}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-purple-300">Total Biaya:</div>
                  <div className="font-mono font-bold text-emerald-300">
                    {formatRupiah((newVolume || 0) * (newHarga || 0))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs shadow-md"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
