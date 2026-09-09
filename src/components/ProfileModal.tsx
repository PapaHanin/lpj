import React, { useState, useEffect } from 'react';
import { X, Check, Building2, UserCheck, Calendar, RotateCcw } from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { ProjectProfile } from '../types';
import { INITIAL_PROFILE } from '../utils/calculations';
import { BULAN_LIST, getClosingDateForMonth, extractMonthAndYear } from '../utils/dateUtils';

export const ProfileModal: React.FC = () => {
  const { isProfileModalOpen, closeProfileModal, profile, setProfile } = useLpjStore();

  const [form, setForm] = useState<ProjectProfile>(profile);
  const [selectedBulan, setSelectedBulan] = useState<string>('Agustus');
  const [selectedTahun, setSelectedTahun] = useState<string>('2026');

  useEffect(() => {
    if (isProfileModalOpen) {
      setForm(profile);
      const parsed = extractMonthAndYear(profile.bulanLaporan);
      if (parsed) {
        setSelectedBulan(parsed.month);
        setSelectedTahun(String(parsed.year));
      }
    }
  }, [isProfileModalOpen, profile]);

  if (!isProfileModalOpen) return null;

  const handleChange = (field: keyof ProjectProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMonthOrYearChange = (newBulan: string, newTahun: string) => {
    setSelectedBulan(newBulan);
    setSelectedTahun(newTahun);
    const bulanLaporanStr = `${newBulan.toUpperCase()} ${newTahun}`;
    const autoClosing = getClosingDateForMonth(newBulan, newTahun);

    setForm((prev) => ({
      ...prev,
      bulanLaporan: bulanLaporanStr,
      tahunAnggaran: newTahun,
      tanggalTutupBuku: autoClosing,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(form);
    closeProfileModal();
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset identitas proyek ke data contoh bawaan?')) {
      setForm(INITIAL_PROFILE);
      const parsed = extractMonthAndYear(INITIAL_PROFILE.bulanLaporan);
      if (parsed) {
        setSelectedBulan(parsed.month);
        setSelectedTahun(String(parsed.year));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-amber-400 text-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r from-[#1c052b] via-[#2a073f] to-[#1c052b] text-white border-b-2 border-amber-400 sticky top-0 z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                Pengaturan Kop Laporan & Identitas Proyek
              </h2>
            </div>
            <p className="text-xs text-purple-200 mt-1 font-medium">
              Data ini otomatis dicetak pada kop BKU Umum, BKU Tunai, BK Bank, dan lembar Kwitansi resmi.
            </p>
          </div>
          <button
            onClick={closeProfileModal}
            className="p-2 text-purple-200 hover:text-white hover:bg-purple-800/60 rounded-xl transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 bg-white">
          {/* Bagian 1: Identitas Sekolah */}
          <div className="space-y-3 bg-purple-950/5 p-4 rounded-2xl border border-purple-200">
            <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-200 pb-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              1. Identitas Satuan Pendidikan (Sekolah)
            </h3>

            <div>
              <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                Nama Sekolah
              </label>
              <input
                type="text"
                value={form.namaSekolah}
                onChange={(e) => handleChange('namaSekolah', e.target.value)}
                placeholder="SD INPRES 2 PALASA"
                className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={form.kecamatan}
                  onChange={(e) => handleChange('kecamatan', e.target.value)}
                  placeholder="KEC. PALASA"
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Kabupaten
                </label>
                <input
                  type="text"
                  value={form.kabupaten}
                  onChange={(e) => handleChange('kabupaten', e.target.value)}
                  placeholder="KAB. PARIGI MOUTONG"
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Alamat Sekolah
                </label>
                <input
                  type="text"
                  value={form.alamat}
                  onChange={(e) => handleChange('alamat', e.target.value)}
                  placeholder="Jl. Trans Sulawesi Desa Palasa Lambori"
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Provinsi
                </label>
                <input
                  type="text"
                  value={form.provinsi}
                  onChange={(e) => handleChange('provinsi', e.target.value)}
                  placeholder="SULAWESI TENGAH"
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* Bagian 2: Kegiatan Pekerjaan & Periode (Semua Bulan) */}
          <div className="space-y-3 bg-purple-950/5 p-4 rounded-2xl border border-purple-200">
            <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-200 pb-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              2. Kegiatan Pekerjaan & Pemilihan Bulan Laporan (Semua Bulan)
            </h3>

            <div>
              <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                Judul Pekerjaan / Kegiatan (Muncul di Kop Surat)
              </label>
              <textarea
                rows={3}
                value={form.judulPekerjaan}
                onChange={(e) => handleChange('judulPekerjaan', e.target.value)}
                className="w-full text-xs font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden leading-relaxed"
                required
              />
            </div>

            {/* Selector Bulan & Tahun */}
            <div className="bg-amber-400/20 border-2 border-amber-400 p-3 rounded-xl space-y-2">
              <span className="text-xs font-black text-purple-950 uppercase">
                Pilih Bulan & Tahun Periode Pembukuan:
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-900 mb-1">
                    Bulan Laporan
                  </label>
                  <select
                    value={selectedBulan}
                    onChange={(e) => handleMonthOrYearChange(e.target.value, selectedTahun)}
                    className="w-full text-sm font-black text-slate-950 bg-white border-2 border-purple-900/40 rounded-xl px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400"
                  >
                    {BULAN_LIST.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-900 mb-1">
                    Tahun Anggaran
                  </label>
                  <input
                    type="number"
                    value={selectedTahun}
                    onChange={(e) => handleMonthOrYearChange(selectedBulan, e.target.value)}
                    placeholder="2026"
                    className="w-full text-sm font-black font-mono text-slate-950 bg-white border-2 border-purple-900/40 rounded-xl px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Teks Bulan Laporan (Kop)
                </label>
                <input
                  type="text"
                  value={form.bulanLaporan}
                  onChange={(e) => handleChange('bulanLaporan', e.target.value)}
                  placeholder="AGUSTUS 2026"
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Tanggal Penutupan Buku
                </label>
                <input
                  type="text"
                  value={form.tanggalTutupBuku}
                  onChange={(e) => handleChange('tanggalTutupBuku', e.target.value)}
                  placeholder="Senin, 31 Agustus 2026"
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* Bagian 3: Pejabat Penandatangan */}
          <div className="space-y-3 bg-purple-950/5 p-4 rounded-2xl border border-purple-200">
            <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-200 pb-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              3. Pejabat Penandatangan & Panitia
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={form.namaKepalaSekolah}
                  onChange={(e) => handleChange('namaKepalaSekolah', e.target.value)}
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={form.nipKepalaSekolah}
                  onChange={(e) => handleChange('nipKepalaSekolah', e.target.value)}
                  className="w-full text-sm font-bold font-mono text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Nama Bendahara
                </label>
                <input
                  type="text"
                  value={form.namaBendahara}
                  onChange={(e) => handleChange('namaBendahara', e.target.value)}
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  NIP Bendahara
                </label>
                <input
                  type="text"
                  value={form.nipBendahara}
                  onChange={(e) => handleChange('nipBendahara', e.target.value)}
                  className="w-full text-sm font-bold font-mono text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Nama Panitia Pembangunan / Tim Pelaksana
                </label>
                <input
                  type="text"
                  value={form.namaPanitia}
                  onChange={(e) => handleChange('namaPanitia', e.target.value)}
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1">
                  Kota / Tempat Penandatanganan
                </label>
                <input
                  type="text"
                  value={form.tempatPelunasan}
                  onChange={(e) => handleChange('tempatPelunasan', e.target.value)}
                  placeholder="Palasa"
                  className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/30 rounded-xl px-3.5 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-purple-100">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center space-x-1 text-xs font-bold text-purple-900 hover:text-purple-950 hover:bg-purple-100 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Contoh Bawaan</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={closeProfileModal}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-purple-950 bg-white hover:bg-purple-50 border-2 border-purple-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs sm:text-sm font-black text-purple-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center space-x-1.5 border border-amber-300"
              >
                <Check className="w-4 h-4 text-purple-950" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
