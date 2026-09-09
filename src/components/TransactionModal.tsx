import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Calendar,
  Check,
  Sparkles,
  Receipt,
  Layers,
  Info,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { SubItem, TransactionJenis, TransactionMetode } from '../types';
import { formatRupiah, terbilangRupiah } from '../utils/terbilang';
import {
  formatToIndonesianDate,
  indonesianDateToIso,
  extractMonthAndYear,
  BULAN_LIST,
} from '../utils/dateUtils';

export const TransactionModal: React.FC = () => {
  const {
    isTransactionModalOpen,
    closeTransactionModal,
    addTransaction,
    updateTransaction,
    transactionToEdit,
    modalPreset,
    transactions,
    profile,
  } = useLpjStore();

  const [tanggal, setTanggal] = useState('');
  const [isoDate, setIsoDate] = useState('');
  const [uraian, setUraian] = useState('');
  const [nomorBukti, setNomorBukti] = useState('');
  const [metode, setMetode] = useState<TransactionMetode>('TUNAI');
  const [jenis, setJenis] = useState<TransactionJenis>('PENGELUARAN');
  const [manualNominal, setManualNominal] = useState<number>(0);
  const [penerima, setPenerima] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [hasSubItems, setHasSubItems] = useState(false);
  const [subItems, setSubItems] = useState<SubItem[]>([]);

  // Suggest next BKU number
  const getNextBkuSuggestion = () => {
    const bkuNumbers = transactions
      .map((t) => {
        const match = t.nomorBukti.match(/BKU\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n) && n > 0);

    const maxBku = bkuNumbers.length > 0 ? Math.max(...bkuNumbers) : 0;
    const nextNum = maxBku + 1;
    return `BKU ${nextNum < 10 ? '0' + nextNum : nextNum}`;
  };

  // Derive active month & year for quick date suggestions
  const activeMonthInfo = () => {
    const fromProfile = extractMonthAndYear(profile.bulanLaporan);
    if (fromProfile) return fromProfile;
    const now = new Date();
    return {
      month: BULAN_LIST[now.getMonth()],
      year: now.getFullYear(),
    };
  };

  useEffect(() => {
    if (transactionToEdit) {
      setTanggal(transactionToEdit.tanggal);
      setIsoDate(indonesianDateToIso(transactionToEdit.tanggal));
      setUraian(transactionToEdit.uraian);
      setNomorBukti(transactionToEdit.nomorBukti || '');
      setMetode(transactionToEdit.metode);
      setJenis(transactionToEdit.jenis);
      setPenerima(transactionToEdit.penerima || '');
      setKeterangan(transactionToEdit.keterangan || '');

      const isSub = Boolean(transactionToEdit.subItems && transactionToEdit.subItems.length > 0);
      setHasSubItems(isSub);
      setSubItems(transactionToEdit.subItems || []);

      const nominalVal =
        transactionToEdit.jenis === 'PENERIMAAN'
          ? transactionToEdit.penerimaan
          : transactionToEdit.pengeluaran;
      setManualNominal(nominalVal);
    } else {
      // Default new transaction based on active reporting month and optional modalPreset
      const info = activeMonthInfo();
      const defaultDateStr = `15 ${info.month} ${info.year}`;
      setTanggal(defaultDateStr);
      setIsoDate(indonesianDateToIso(defaultDateStr));
      setUraian(modalPreset?.uraian || '');
      setNomorBukti(getNextBkuSuggestion());
      setMetode(modalPreset?.metode || 'TUNAI');
      setJenis(modalPreset?.jenis || 'PENGELUARAN');
      setManualNominal(0);
      setPenerima('');
      setKeterangan('');

      const wantsSub = Boolean(modalPreset?.withSubItems);
      setHasSubItems(wantsSub);
      if (wantsSub) {
        setSubItems([
          {
            id: `sub-${Date.now()}-1`,
            nama: '',
            volume: 1,
            satuan: 'Ret',
            hargaSatuan: 0,
            subtotal: 0,
          },
        ]);
      } else {
        setSubItems([]);
      }
    }
  }, [transactionToEdit, isTransactionModalOpen, modalPreset]);

  // Handle native HTML date picker change
  const handleIsoDateChange = (isoVal: string) => {
    setIsoDate(isoVal);
    if (isoVal) {
      const formatted = formatToIndonesianDate(isoVal);
      setTanggal(formatted);
    }
  };

  // Handle manual text date change
  const handleTextDateChange = (textVal: string) => {
    setTanggal(textVal);
    const convertedIso = indonesianDateToIso(textVal);
    if (convertedIso) {
      setIsoDate(convertedIso);
    }
  };

  // Sub-items calculation
  const subItemsTotal = subItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const totalNominal = hasSubItems ? subItemsTotal : manualNominal;

  const handleAddSubItem = () => {
    const newItem: SubItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      nama: '',
      volume: 1,
      satuan: 'Ret',
      hargaSatuan: 0,
      subtotal: 0,
    };
    setSubItems([...subItems, newItem]);
    setHasSubItems(true);
  };

  const handleUpdateSubItem = (
    index: number,
    field: keyof SubItem,
    value: string | number
  ) => {
    const updated = [...subItems];
    const current = { ...updated[index], [field]: value };

    if (field === 'volume' || field === 'hargaSatuan') {
      const vol = typeof current.volume === 'number' ? current.volume : parseFloat(String(current.volume)) || 0;
      const harga = typeof current.hargaSatuan === 'number' ? current.hargaSatuan : parseFloat(String(current.hargaSatuan)) || 0;
      current.subtotal = vol * harga;
    }

    updated[index] = current;
    setSubItems(updated);
  };

  const handleRemoveSubItem = (index: number) => {
    const updated = subItems.filter((_, i) => i !== index);
    setSubItems(updated);
    if (updated.length === 0) {
      setHasSubItems(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!uraian.trim()) {
      alert('Mohon isi uraian transaksi.');
      return;
    }

    if (totalNominal <= 0) {
      alert('Nominal transaksi harus lebih dari 0.');
      return;
    }

    let penerimaan = 0;
    let pengeluaran = 0;

    if (metode === 'TARIK_TUNAI') {
      penerimaan = totalNominal;
      pengeluaran = totalNominal;
    } else if (jenis === 'PENERIMAAN') {
      penerimaan = totalNominal;
      pengeluaran = 0;
    } else {
      penerimaan = 0;
      pengeluaran = totalNominal;
    }

    const payload = {
      tanggal,
      uraian,
      nomorBukti,
      metode,
      jenis,
      penerimaan,
      pengeluaran,
      penerima,
      keterangan,
      subItems: hasSubItems ? subItems : undefined,
    };

    if (transactionToEdit) {
      updateTransaction(transactionToEdit.id, payload);
    } else {
      addTransaction(payload);
    }
  };

  if (!isTransactionModalOpen) return null;

  const currentMonthInfo = activeMonthInfo();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-amber-400">
        {/* Header (Purple + Yellow) */}
        <div className="flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r from-[#1b052b] via-[#28083e] to-[#1b052b] text-white border-b-2 border-amber-400 sticky top-0 z-20">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                {transactionToEdit
                  ? 'Edit Transaksi Pembukuan'
                  : hasSubItems && metode === 'TUNAI'
                  ? 'Input Belanja Kas Tunai (+ Rincian Barang)'
                  : 'Input Transaksi Cepat'}
              </h2>
            </div>
            <p className="text-xs text-purple-200/95 mt-1 font-medium">
              {hasSubItems && metode === 'TUNAI'
                ? 'Rincian disimpan di Kas Tunai. Nilai total belanja otomatis masuk ke Buku Kas Umum (BKU).'
                : 'Otomatis masuk ke BKU Umum, BKU Tunai / Bank, dan lembar Kwitansi resmi.'}
            </p>
          </div>
          <button
            onClick={closeTransactionModal}
            className="p-2 text-purple-200 hover:text-white hover:bg-purple-800/60 rounded-xl transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 bg-white text-slate-950">
          {/* Banner Sinkronisasi Otomatis Kas Tunai ke Kas Umum */}
          {metode === 'TUNAI' && jenis === 'PENGELUARAN' && (
            <div className="bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <div className="p-2 bg-emerald-600 text-white rounded-xl font-bold shrink-0 mt-0.5 shadow-xs">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-950 text-sm">
                    Sinkronisasi Otomatis ke Kas Umum (BKU)
                  </span>
                  <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Otomatis Aktif
                  </span>
                </div>
                <p className="text-emerald-900 font-medium mt-1 leading-relaxed">
                  {hasSubItems
                    ? `Rincian barang (volume, satuan, harga) akan dicatat lengkap di Kas Tunai. Sedangkan di Buku Kas Umum (BKU), sistem otomatis mencatat nama belanja dan JUMLAH TOTALNYA SAJA (${formatRupiah(totalNominal)}) tanpa rincian.`
                    : `Transaksi tunai ini otomatis tercatat di Kas Tunai dan Buku Kas Umum (BKU) sebesar nominal transaksi.`}
                </p>
              </div>
            </div>
          )}

          {/* Baris 1: Metode & Jenis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-950/5 p-4 rounded-2xl border border-purple-200">
            <div>
              <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-2">
                Metode Pembukuan
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMetode('TUNAI')}
                  className={`py-2.5 px-2 text-xs font-black rounded-xl border-2 transition text-center cursor-pointer ${
                    metode === 'TUNAI'
                      ? 'bg-amber-400 text-purple-950 border-amber-500 shadow-md ring-2 ring-amber-300'
                      : 'bg-white border-purple-200 text-purple-950 hover:bg-purple-50 font-bold'
                  }`}
                >
                  Kas Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setMetode('BANK')}
                  className={`py-2.5 px-2 text-xs font-black rounded-xl border-2 transition text-center cursor-pointer ${
                    metode === 'BANK'
                      ? 'bg-purple-900 text-amber-300 border-purple-700 shadow-md ring-2 ring-purple-500'
                      : 'bg-white border-purple-200 text-purple-950 hover:bg-purple-50 font-bold'
                  }`}
                >
                  Bank
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMetode('TARIK_TUNAI');
                    setUraian('PENARIKAN DANA DARI BANK KE KAS TUNAI');
                    setNomorBukti('');
                  }}
                  className={`py-2.5 px-2 text-xs font-black rounded-xl border-2 transition text-center cursor-pointer ${
                    metode === 'TARIK_TUNAI'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-purple-950 border-amber-500 shadow-md ring-2 ring-amber-300'
                      : 'bg-white border-purple-200 text-purple-950 hover:bg-purple-50 font-bold'
                  }`}
                >
                  Tarik Tunai
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-2">
                Jenis Transaksi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={metode === 'TARIK_TUNAI'}
                  onClick={() => setJenis('PENGELUARAN')}
                  className={`py-2.5 px-3 text-xs font-black rounded-xl border-2 transition text-center cursor-pointer ${
                    metode === 'TARIK_TUNAI'
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                      : jenis === 'PENGELUARAN'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300'
                      : 'bg-white border-purple-200 text-purple-950 hover:bg-purple-50 font-bold'
                  }`}
                >
                  Pengeluaran (Kredit)
                </button>
                <button
                  type="button"
                  disabled={metode === 'TARIK_TUNAI'}
                  onClick={() => setJenis('PENERIMAAN')}
                  className={`py-2.5 px-3 text-xs font-black rounded-xl border-2 transition text-center cursor-pointer ${
                    metode === 'TARIK_TUNAI'
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                      : jenis === 'PENERIMAAN'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                      : 'bg-white border-purple-200 text-purple-950 hover:bg-purple-50 font-bold'
                  }`}
                >
                  Penerimaan (Debet)
                </button>
              </div>
            </div>
          </div>

          {/* Baris 2: Tanggal & No Bukti */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>Tanggal Transaksi</span>
                <span className="text-[11px] font-bold text-purple-700">Semua Bulan Didukung</span>
              </label>
              <div className="flex gap-2">
                {/* HTML5 Date picker to choose any month & day easily */}
                <input
                  type="date"
                  value={isoDate}
                  onChange={(e) => handleIsoDateChange(e.target.value)}
                  className="w-11 px-1 py-2.5 bg-purple-50 border-2 border-purple-900/30 rounded-xl cursor-pointer text-purple-950 font-bold hover:bg-purple-100 transition"
                  title="Pilih tanggal dari kalender"
                />
                {/* Text format "16 Agustus 2026" */}
                <input
                  type="text"
                  value={tanggal}
                  onChange={(e) => handleTextDateChange(e.target.value)}
                  placeholder={`Contoh: 15 ${currentMonthInfo.month} ${currentMonthInfo.year}`}
                  className="w-full text-sm font-black text-slate-950 bg-white border-2 border-purple-900/40 rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Dynamic quick date buttons based on active month */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] font-bold text-slate-500">Cepat:</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = `01 ${currentMonthInfo.month} ${currentMonthInfo.year}`;
                    setTanggal(d);
                    setIsoDate(indonesianDateToIso(d));
                  }}
                  className="text-[11px] font-bold text-purple-900 bg-purple-100 hover:bg-amber-300 hover:text-purple-950 px-2 py-0.5 rounded-md transition"
                >
                  Awal Bulan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = `15 ${currentMonthInfo.month} ${currentMonthInfo.year}`;
                    setTanggal(d);
                    setIsoDate(indonesianDateToIso(d));
                  }}
                  className="text-[11px] font-bold text-purple-900 bg-purple-100 hover:bg-amber-300 hover:text-purple-950 px-2 py-0.5 rounded-md transition"
                >
                  Tengah Bulan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d = formatToIndonesianDate(now);
                    setTanggal(d);
                    setIsoDate(indonesianDateToIso(d));
                  }}
                  className="text-[11px] font-black text-purple-950 bg-amber-300 hover:bg-amber-400 px-2 py-0.5 rounded-md transition"
                >
                  Hari Ini
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1.5">
                Nomor Bukti BKU
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nomorBukti}
                  onChange={(e) => setNomorBukti(e.target.value)}
                  placeholder="Contoh: BKU 05"
                  className="w-full text-sm font-black text-slate-950 bg-white border-2 border-purple-900/40 rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden font-mono placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setNomorBukti(getNextBkuSuggestion())}
                  className="shrink-0 text-xs font-black text-purple-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
                  title="Gunakan nomor urut BKU berikutnya"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto BKU</span>
                </button>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Kosongkan jika penerimaan DAK Bank atau Tarik Tunai.
              </p>
            </div>
          </div>

          {/* Baris 3: Uraian Transaksi */}
          <div>
            <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1.5">
              Uraian Transaksi
            </label>
            <input
              type="text"
              value={uraian}
              onChange={(e) => setUraian(e.target.value)}
              placeholder="Contoh: Belanja Material Pasir & Kayu / Bayar Upah Tukang Tahap 1"
              className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/40 rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden placeholder:text-slate-400"
              required
            />
          </div>

          {/* Baris 4: Penerima / Fasilitator */}
          <div>
            <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1.5">
              Penerima / Pihak Ketiga (Toko / Tukang / Fasilitator)
            </label>
            <input
              type="text"
              value={penerima}
              onChange={(e) => setPenerima(e.target.value)}
              placeholder="Contoh: Toko Bangunan Berkah / Moh. Rizal Daudo / Tukang Ahmad"
              className="w-full text-sm font-bold text-slate-950 bg-white border-2 border-purple-900/40 rounded-xl px-3.5 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden placeholder:text-slate-400"
            />
          </div>

          {/* Pilihan Format Belanja: Format Nota (Rincian) vs Nominal Langsung */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-black text-purple-950 uppercase tracking-wide">
                Format Input Belanja
              </label>
              <div className="flex rounded-xl p-1 bg-purple-950/10 border border-purple-200 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setHasSubItems(true);
                    if (subItems.length === 0) {
                      handleAddSubItem();
                    }
                  }}
                  className={`py-1.5 px-3 text-xs font-black rounded-lg transition text-center cursor-pointer flex items-center gap-1.5 ${
                    hasSubItems
                      ? 'bg-amber-400 text-purple-950 shadow-xs border border-amber-500'
                      : 'text-purple-900 hover:bg-white/60 font-bold'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5 text-purple-950" />
                  <span>Format Nota (Rincian Barang)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHasSubItems(false)}
                  className={`py-1.5 px-3 text-xs font-black rounded-lg transition text-center cursor-pointer flex items-center gap-1.5 ${
                    !hasSubItems
                      ? 'bg-purple-900 text-amber-300 shadow-xs border border-purple-800'
                      : 'text-purple-900 hover:bg-white/60 font-bold'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-300" />
                  <span>Nominal Langsung (Satu Total)</span>
                </button>
              </div>
            </div>

            {hasSubItems ? (
              <div className="bg-purple-950/5 p-4 sm:p-5 rounded-2xl border-2 border-purple-300/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <Calculator className="w-4 h-4 text-amber-500" />
                      Rincian Barang Belanja (Khusus Kas Tunai)
                    </span>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Input item barang belanja (misal: Pasir Kasar, Kayu, Upah). Nilai total nota otomatis masuk ke Buku Kas Umum.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubItem}
                    className="inline-flex items-center space-x-1.5 text-xs font-black text-purple-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 px-3.5 py-2 rounded-xl border border-amber-400 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Baris Barang</span>
                  </button>
                </div>

                {subItems.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 text-[11px] font-black text-amber-300 bg-[#220738] p-2.5 rounded-xl uppercase tracking-wider">
                      <div className="col-span-5 sm:col-span-5">Nama Barang / Pekerjaan</div>
                      <div className="col-span-2 text-center">Volume</div>
                      <div className="col-span-2 text-center">Satuan</div>
                      <div className="col-span-2 text-right">Harga Satuan (Rp)</div>
                      <div className="col-span-1 text-center">Hapus</div>
                    </div>

                    {/* Sub-item rows */}
                    {subItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-purple-200 shadow-xs"
                      >
                        <div className="col-span-5 sm:col-span-5">
                          <input
                            type="text"
                            value={item.nama}
                            onChange={(e) => handleUpdateSubItem(idx, 'nama', e.target.value)}
                            placeholder="Contoh: Pasir Kasar / Kayu 5x5"
                            className="w-full text-xs font-bold text-slate-950 bg-white border border-purple-300 rounded-lg px-2.5 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.volume}
                            onChange={(e) => handleUpdateSubItem(idx, 'volume', parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-black text-slate-950 bg-white border border-purple-300 rounded-lg px-2 py-2 text-center font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={item.satuan}
                            onChange={(e) => handleUpdateSubItem(idx, 'satuan', e.target.value)}
                            placeholder="Ret / Kbk / Zak / Ls"
                            className="w-full text-xs font-bold text-slate-950 bg-white border border-purple-300 rounded-lg px-2 py-2 text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            value={item.hargaSatuan || ''}
                            onChange={(e) => handleUpdateSubItem(idx, 'hargaSatuan', parseInt(e.target.value, 10) || 0)}
                            placeholder="900000"
                            className="w-full text-xs font-black text-slate-950 bg-white border border-purple-300 rounded-lg px-2 py-2 text-right font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400"
                            required
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSubItem(idx)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                            title="Hapus baris barang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2.5 border-t-2 border-purple-200 flex justify-between items-center bg-[#220738] text-white p-3 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase text-amber-300">
                          Total Rincian Nota (Jumlah Belanja):
                        </span>
                        <span className="text-[10px] text-purple-200">
                          *Total ini yang otomatis masuk ke Buku Kas Umum (BKU)
                        </span>
                      </div>
                      <span className="font-mono font-black text-amber-400 text-sm sm:text-base">
                        {formatRupiah(subItemsTotal)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-purple-300 rounded-xl bg-white/50">
                    <p className="text-xs font-bold text-purple-950 mb-2">
                      Belum ada baris barang yang ditambahkan
                    </p>
                    <button
                      type="button"
                      onClick={handleAddSubItem}
                      className="inline-flex items-center space-x-1 text-xs font-black text-purple-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris Pertama</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-purple-950/5 p-4 rounded-2xl border-2 border-purple-200">
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wide mb-1.5">
                  Nominal Transaksi (Rp)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-purple-950 font-black text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={manualNominal || ''}
                    onChange={(e) => setManualNominal(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full text-base font-black font-mono text-slate-950 pl-11 pr-4 py-2.5 bg-white border-2 border-purple-900/40 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:outline-hidden placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Terbilang Live Preview Card (Purple + Yellow) */}
          <div className="bg-gradient-to-r from-[#1c052c] to-[#28073e] p-4 sm:p-5 rounded-2xl border-2 border-amber-400 shadow-md text-white">
            <div className="flex flex-wrap items-center justify-between text-xs text-amber-300 font-bold mb-1.5 gap-2">
              <span className="uppercase tracking-wider">Jumlah Uang Terbilang (Otomatis & Akurat):</span>
              <span className="font-mono font-black text-amber-400 text-sm sm:text-base bg-purple-950/80 px-2.5 py-1 rounded-lg border border-amber-400/40">
                {formatRupiah(totalNominal)}
              </span>
            </div>
            <p className="text-xs sm:text-sm italic text-white font-semibold leading-relaxed">
              "{terbilangRupiah(totalNominal)}"
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t-2 border-purple-100">
            <button
              type="button"
              onClick={closeTransactionModal}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-purple-950 bg-white hover:bg-purple-50 border-2 border-purple-200 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-black text-purple-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center space-x-1.5 border border-amber-300"
            >
              <Check className="w-4 h-4 text-purple-950" />
              <span>{transactionToEdit ? 'Simpan Perubahan' : 'Tambahkan ke Pembukuan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
