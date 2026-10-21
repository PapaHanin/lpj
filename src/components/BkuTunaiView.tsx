import React, { useMemo, useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Pencil,
  Trash2,
  Receipt,
  Layers,
  Calendar,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Hash,
  Eye,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { groupTransactionsByMonthlyBooks } from '../utils/calculations';
import { formatRupiah, terbilangRupiah } from '../utils/terbilang';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';
import { TransactionSelectionBar } from './TransactionSelectionBar';
import { Transaction } from '../types';

export const BkuTunaiView: React.FC = () => {
  const {
    profile,
    transactions,
    openTransactionModal,
    openNotaModal,
    deleteTransaction,
    setSelectedTransactionForKwitansi,
    setActiveTab,
    openProfileModal,
    openSwapRenumberModal,
    swapTransactionNomorBukti,
    showToast,
  } = useLpjStore();

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [showSubDetails, setShowSubDetails] = useState<boolean>(false);
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());
  const [signatureFormat, setSignatureFormat] = useState<'3_pihak' | '2_pihak'>('3_pihak');

  const toggleExpandTx = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const monthlyGroups = useMemo(
    () => groupTransactionsByMonthlyBooks(transactions, profile),
    [transactions, profile]
  );

  const groupsToRender = useMemo(() => {
    if (selectedMonthKey === 'ALL') {
      return monthlyGroups;
    }
    const filtered = monthlyGroups.filter((g) => g.monthKey === selectedMonthKey);
    return filtered.length > 0 ? filtered : monthlyGroups;
  }, [monthlyGroups, selectedMonthKey]);

  const handlePrint = () => {
    triggerPrint('Buku Kas Tunai (BKU Tunai)');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Action Header Ribbon (Purple + Yellow) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#220738] p-4 rounded-2xl border border-amber-400/30 text-white shadow-lg print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              Buku Pembantu Kas Tunai (BPKT)
            </h2>
            <span className="bg-amber-400 text-purple-950 text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              Format Gambar Resmi (7 Kolom & 3 Tanda Tangan)
            </span>
          </div>
          <p className="text-xs text-purple-200/90 mt-0.5">
            Sesuai format gambar: No, Tanggal, Uraian, No. Bukti, Penerimaan, Pengeluaran, Saldo (Kolom 1 s/d 7), baris JUMLAH, dan 3 tanda tangan lengkap (Kepala Sekolah, Ketua P2S, Bendahara).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {monthlyGroups.length > 1 && (
            <div className="flex items-center gap-1 bg-purple-950/80 p-1 rounded-xl border border-amber-400/30">
              <button
                onClick={() => setSelectedMonthKey('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedMonthKey === 'ALL'
                    ? 'bg-amber-400 text-purple-950 shadow-sm'
                    : 'text-purple-200 hover:bg-purple-800'
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
                      ? 'bg-amber-400 text-purple-950 shadow-sm'
                      : 'text-purple-200 hover:bg-purple-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setSignatureFormat((prev) => (prev === '3_pihak' ? '2_pihak' : '3_pihak'))}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
            title="Ganti format tanda tangan: 3 Tanda Tangan (Sesuai Gambar) atau 2 Tanda Tangan"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{signatureFormat === '3_pihak' ? '3 Tanda Tangan (Resmi Gambar)' : '2 Tanda Tangan'}</span>
          </button>

          <button
            onClick={openProfileModal}
            className="flex items-center space-x-1 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            title="Ganti Profil & Bulan Laporan"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Pengaturan Profil</span>
          </button>
          <button
            onClick={() => openSwapRenumberModal(undefined, undefined, 'shift')}
            className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            title="Ganti nomor BKU, sisipkan kuitansi terlewat, atau tukar nomor BKU otomatis"
          >
            <Hash className="w-4 h-4 text-purple-900" />
            <span>Ganti & Urutkan BKU</span>
          </button>
          <button
            onClick={() =>
              openTransactionModal(undefined, {
                metode: 'TUNAI',
                jenis: 'PENGELUARAN',
                withSubItems: true,
              })
            }
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer border border-amber-300 ring-2 ring-amber-300/50"
            title="Input Belanja Baru & Rincian Barang di Kas Tunai (Otomatis Masuk ke Kas Umum)"
          >
            <PlusCircle className="w-4 h-4 text-purple-950" />
            <span>+ Input Belanja</span>
          </button>
          <button
            onClick={() => setShowSubDetails((prev) => !prev)}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer border ${
              showSubDetails
                ? 'bg-amber-400 text-purple-950 border-amber-300 shadow-sm'
                : 'bg-purple-900/80 hover:bg-purple-800 text-purple-200 border-purple-700'
            }`}
            title="Tampilkan atau sembunyikan semua rincian barang nota belanja di tabel"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>{showSubDetails ? 'Sembunyikan Semua Item' : 'Tampilkan Semua Item Nota'}</span>
          </button>
          <button
            onClick={() => exportLpjToExcel(profile, transactions)}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-medium px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Cetak BKU Tunai</span>
          </button>
        </div>
      </div>

      {/* Info Banner on Multiple Months */}
      {monthlyGroups.length > 1 && (
        <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-3.5 text-slate-900 flex items-center justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-purple-950">
                Format Penutupan Buku Kas Tunai Bulanan Aktif:
              </span>{' '}
              <span className="text-purple-900">
                Tiap periode bulan ({monthlyGroups.map((g) => g.label).join(', ')}) dipisahkan secara rapi dengan sisa saldo tunai awal, tabel belanja rincian, tutup buku pada akhir bulan, dan tanda tangan lengkap.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Render Each Month Sheet */}
      {groupsToRender.map((group, gIdx) => (
        <div
          key={group.monthKey}
          className={`bg-white rounded-xl shadow-xs border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full text-black sheet-paper ${
            gIdx > 0 ? 'mt-8 print:mt-0 print:break-before-page' : ''
          }`}
        >
          {/* Kop Judul Laporan */}
          <div className="text-center space-y-1 mb-6 border-b-2 border-slate-900 pb-4 text-black">
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-black">
              BUKU KAS PEMBANTU TUNAI
            </h1>
            <h2 className="text-xs sm:text-sm font-bold uppercase text-black max-w-4xl mx-auto leading-snug">
              {profile.judulPekerjaan}
            </h2>
            <p className="text-xs font-bold text-black uppercase">
              Bulan : {group.label}
            </p>
          </div>

          {/* Profil Metadata Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-8 text-xs font-semibold text-black mb-6">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 font-bold shrink-0 text-black">NAMA SEKOLAH</span>
                <span className="shrink-0 mr-2 text-black">:</span>
                <span className="font-bold text-black">{profile.namaSekolah}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold shrink-0 text-black">ALAMAT</span>
                <span className="shrink-0 mr-2 text-black">:</span>
                <span className="text-black font-medium">{profile.alamat}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 font-bold shrink-0 text-black">KECAMATAN</span>
                <span className="shrink-0 mr-2 text-black">:</span>
                <span className="font-bold text-black">{profile.kecamatan}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold shrink-0 text-black">KABUPATEN</span>
                <span className="shrink-0 mr-2 text-black">:</span>
                <span className="font-bold text-black">{profile.kabupaten}</span>
              </div>
            </div>
          </div>

          {/* Tabel BKU Tunai (Format Sesuai Screenshot 3) */}
          <div className="overflow-x-auto">
            {(() => {
              const nonInitialRows = group.bkuTunai.rows.filter((r) => !r.isInitialRow);
              const groupTxIds = nonInitialRows.map((r) => r.transaction.id);
              const isAllGroupSelected =
                groupTxIds.length > 0 &&
                groupTxIds.every((id) => selectedTxIds.includes(id));

              const toggleSelectAllGroup = () => {
                if (isAllGroupSelected) {
                  setSelectedTxIds((prev) =>
                    prev.filter((id) => !groupTxIds.includes(id))
                  );
                } else {
                  setSelectedTxIds((prev) =>
                    Array.from(new Set([...prev, ...groupTxIds]))
                  );
                }
              };

              const handleToggleSelect = (id: string) => {
                setSelectedTxIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((item) => item !== id)
                    : [...prev, id]
                );
              };

              const handleMoveRowUp = (currTx: Transaction, prevTx?: Transaction) => {
                if (!prevTx) return;
                swapTransactionNomorBukti(currTx.id, prevTx.id, {
                  swapPositions: true,
                  swapDates: currTx.tanggal !== prevTx.tanggal,
                });
                showToast({
                  type: 'success',
                  title: 'Pindah Baris ke Atas',
                  message: `"${currTx.uraian.slice(0, 24)}..." dipindahkan ke atas & nomor BKU diselaraskan.`,
                });
              };

              const handleMoveRowDown = (currTx: Transaction, nextTx?: Transaction) => {
                if (!nextTx) return;
                swapTransactionNomorBukti(currTx.id, nextTx.id, {
                  swapPositions: true,
                  swapDates: currTx.tanggal !== nextTx.tanggal,
                });
                showToast({
                  type: 'success',
                  title: 'Pindah Baris ke Bawah',
                  message: `"${currTx.uraian.slice(0, 24)}..." dipindahkan ke bawah & nomor BKU diselaraskan.`,
                });
              };

              return (
                <table className="w-full text-xs border-collapse border border-slate-900 text-black">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center text-black">
                      <th className="border border-slate-900 py-2 px-1 w-10 text-center print:hidden bg-[#220738] text-white select-none">
                        <input
                          type="checkbox"
                          title="Pilih Semua Transaksi Bulan Ini"
                          checked={isAllGroupSelected}
                          onChange={toggleSelectAllGroup}
                          className="w-4 h-4 text-purple-900 rounded cursor-pointer align-middle accent-amber-400"
                        />
                      </th>
                      <th className="border border-slate-900 py-2.5 px-2 w-12 text-black font-black">
                        No
                      </th>
                      <th className="border border-slate-900 py-2.5 px-2 w-28 text-black font-black">
                        Tanggal
                      </th>
                      <th className="border border-slate-900 py-2.5 px-3 text-left min-w-[220px] text-black font-black">
                        Uraian
                      </th>
                      <th className="border border-slate-900 py-2.5 px-2 w-24 text-center text-black font-black">
                        No Bukti
                      </th>
                      <th className="border border-slate-900 py-2.5 px-2.5 w-32 text-right text-black font-black">
                        Penerimaan (Rp)
                      </th>
                      <th className="border border-slate-900 py-2.5 px-2.5 w-32 text-right text-black font-black">
                        Pengeluaran (Rp)
                      </th>
                      <th className="border border-slate-900 py-2.5 px-2.5 w-32 text-right text-black font-black">
                        Saldo (Rp)
                      </th>
                      <th className="border border-slate-900 py-2.5 px-1 w-28 text-center print:hidden">
                        Aksi
                      </th>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-center text-[10px] text-slate-800">
                      <th className="border border-slate-900 py-1 print:hidden bg-purple-950/20"></th>
                      <th className="border border-slate-900 py-1 text-black font-serif italic">1</th>
                      <th className="border border-slate-900 py-1 text-black font-serif italic">2</th>
                      <th className="border border-slate-900 py-1 text-black font-serif italic">3</th>
                      <th className="border border-slate-900 py-1 text-black font-serif italic">4</th>
                      <th className="border border-slate-900 py-1 text-black font-serif italic">5</th>
                      <th className="border border-slate-900 py-1 text-black font-serif italic">6</th>
                      <th className="border border-slate-900 py-1 text-black font-serif italic">7</th>
                      <th className="border border-slate-900 py-1 print:hidden"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {group.bkuTunai.rows.map((row) => {
                      if (row.isInitialRow) {
                        return (
                          <tr
                            key={`initial-tunai-${group.monthKey}`}
                            className="bg-amber-50/60 font-bold text-black"
                          >
                            <td className="border border-slate-900 py-2 px-1 text-center print:hidden bg-amber-100/50 text-slate-400 font-mono text-[10px]">
                              -
                            </td>
                            <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold text-black">
                              {row.no}
                            </td>
                            <td className="border border-slate-900 py-2 px-2 whitespace-nowrap text-black font-medium text-center">
                              {row.tanggal}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 font-black italic text-purple-950">
                              {row.uraian}
                              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-400 print:hidden not-italic">
                                Saldo Awal Kas Tunai
                              </span>
                            </td>
                            <td className="border border-slate-900 py-2 px-2 text-center text-slate-400 font-mono">-</td>
                            <td className="border border-slate-900 py-2 px-2.5 text-right font-mono font-bold text-black">
                              {formatRupiah(row.penerimaan, false)}
                            </td>
                            <td className="border border-slate-900 py-2 px-2.5 text-right text-slate-400 font-mono">-</td>
                            <td className="border border-slate-900 py-2 px-2.5 text-right font-mono font-bold text-black">
                              {formatRupiah(row.saldo, false)}
                            </td>
                            <td className="border border-slate-900 py-2 px-1 print:hidden"></td>
                          </tr>
                        );
                      }

                      const hasSub =
                        row.transaction.subItems && row.transaction.subItems.length > 0;
                      const isSelected = selectedTxIds.includes(row.transaction.id);

                      const currentIndexInNonInitial = nonInitialRows.findIndex(
                        (r) => r.transaction.id === row.transaction.id
                      );
                      const canMoveUp = currentIndexInNonInitial > 0;
                      const canMoveDown =
                        currentIndexInNonInitial >= 0 &&
                        currentIndexInNonInitial < nonInitialRows.length - 1;

                      return (
                        <React.Fragment key={row.transaction.id}>
                          {/* Baris Utama Transaksi */}
                          <tr
                            className={`hover:bg-slate-50 text-black transition ${
                              isSelected
                                ? 'bg-amber-100/70 border-l-4 border-l-amber-500 font-semibold ring-1 ring-amber-300 inset'
                                : hasSub
                                ? 'bg-amber-50/20 font-bold'
                                : 'bg-white'
                            }`}
                          >
                            {/* Kotak Centang (Screen only) */}
                            <td className="border border-slate-900 py-2 px-1 text-center print:hidden">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(row.transaction.id)}
                                className="w-4 h-4 text-purple-900 rounded cursor-pointer align-middle accent-purple-800"
                                title="Centang untuk edit / hapus / tukar nomor BKU"
                              />
                            </td>

                            <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold text-black">
                              {row.no}
                            </td>
                            <td className="border border-slate-900 py-2 px-2 whitespace-nowrap text-black font-medium text-center">
                              {row.tanggal}
                            </td>
                            <td className="border border-slate-900 py-2 px-3 font-bold text-black">
                              <div>
                                <span>{row.uraian}</span>
                                {hasSub && (
                                  <div className="mt-1 space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap print:hidden">
                                      {/* Tombol Utama Klik Lihat Item Nota (Membuka Modal Penuh) */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openNotaModal(row.transaction);
                                        }}
                                        className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 inline-flex items-center gap-1.5 transition shadow-xs hover:shadow-sm cursor-pointer group active:scale-95 ring-1 ring-amber-300/60"
                                        title="Klik untuk melihat daftar barang belanja nota ini"
                                      >
                                        <Eye className="w-3 h-3 text-amber-800 group-hover:text-black transition" />
                                        <span>{row.transaction.subItems?.length} item nota</span>
                                        <span className="text-[9px] bg-amber-400 text-purple-950 px-1 py-0.2 rounded font-black">
                                          Lihat
                                        </span>
                                      </button>

                                      {/* Tombol Buka/Tutup Tabel Rincian di Baris */}
                                      <button
                                        type="button"
                                        onClick={(e) => toggleExpandTx(row.transaction.id, e)}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 inline-flex items-center gap-0.5 transition cursor-pointer"
                                        title={
                                          showSubDetails || expandedTxIds.has(row.transaction.id)
                                            ? 'Tutup rincian tabel di baris ini'
                                            : 'Buka rincian tabel di baris ini'
                                        }
                                      >
                                        {showSubDetails || expandedTxIds.has(row.transaction.id) ? (
                                          <>
                                            <ChevronUp className="w-3 h-3 text-purple-900" />
                                            <span>Tutup</span>
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="w-3 h-3 text-purple-900" />
                                            <span>Rincian</span>
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {/* Tabel Rincian Barang Belanja (Inline Table) */}
                                    {(showSubDetails || expandedTxIds.has(row.transaction.id)) &&
                                      row.transaction.subItems && (
                                        <div className="mt-1.5 text-[11px] font-normal text-slate-900 bg-white p-2 rounded-xl border border-amber-300 shadow-xs print:hidden">
                                          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-200">
                                            <span className="font-extrabold text-purple-950 flex items-center gap-1 text-[11px]">
                                              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                                              Barang Belanja ({row.transaction.subItems.length} item):
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openNotaModal(row.transaction);
                                              }}
                                              className="text-[10px] font-extrabold text-purple-900 hover:text-purple-950 flex items-center gap-0.5 underline cursor-pointer"
                                            >
                                              <span>Buka Layar Penuh</span>
                                              <ExternalLink className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                          <table className="w-full text-left text-[11px] border border-slate-200 rounded overflow-hidden">
                                            <thead>
                                              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                                <th className="py-1 px-1.5 text-center w-6">No</th>
                                                <th className="py-1 px-2">Nama Barang / Material</th>
                                                <th className="py-1 px-1.5 text-center">Vol & Satuan</th>
                                                <th className="py-1 px-2 text-right">Harga Satuan</th>
                                                <th className="py-1 px-2 text-right">Subtotal</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {row.transaction.subItems.map((sub, sIdx) => (
                                                <tr key={sub.id || sIdx} className="hover:bg-amber-50/50">
                                                  <td className="py-1 px-1.5 text-center text-slate-500 font-mono">
                                                    {sIdx + 1}
                                                  </td>
                                                  <td className="py-1 px-2 font-bold text-slate-900">
                                                    {sub.nama}
                                                  </td>
                                                  <td className="py-1 px-1.5 text-center text-slate-800 font-medium">
                                                    {sub.volume} {sub.satuan}
                                                  </td>
                                                  <td className="py-1 px-2 text-right font-mono text-slate-700">
                                                    {formatRupiah(sub.hargaSatuan)}
                                                  </td>
                                                  <td className="py-1 px-2 text-right font-mono font-bold text-purple-950 bg-amber-50/30">
                                                    {formatRupiah(sub.subtotal)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold text-black">
                              {row.nomorBukti || ''}
                            </td>
                            <td className="border border-slate-900 py-2 px-2.5 text-right font-mono font-bold text-black">
                              {row.penerimaan > 0 ? formatRupiah(row.penerimaan, false) : ''}
                            </td>
                            <td className="border border-slate-900 py-2 px-2.5 text-right font-mono font-bold text-black">
                              {row.pengeluaran > 0 ? formatRupiah(row.pengeluaran, false) : ''}
                            </td>
                            <td className="border border-slate-900 py-2 px-2.5 text-right font-mono font-bold text-black">
                              {formatRupiah(row.saldo, false)}
                            </td>

                            {/* Actions */}
                            <td className="border border-slate-900 py-2 px-1 text-center print:hidden">
                              <div className="flex items-center justify-center space-x-1">
                                {/* Pindah ke Atas */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveRowUp(
                                      row.transaction,
                                      nonInitialRows[currentIndexInNonInitial - 1]?.transaction
                                    )
                                  }
                                  disabled={!canMoveUp}
                                  className="p-1 text-slate-600 hover:text-purple-900 hover:bg-purple-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                                  title="Pindah ke Atas & selaraskan nomor BKU dengan baris di atasnya"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>

                                {/* Pindah ke Bawah */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveRowDown(
                                      row.transaction,
                                      nonInitialRows[currentIndexInNonInitial + 1]?.transaction
                                    )
                                  }
                                  disabled={!canMoveDown}
                                  className="p-1 text-slate-600 hover:text-purple-900 hover:bg-purple-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                                  title="Pindah ke Bawah & selaraskan nomor BKU dengan baris di bawahnya"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Ganti / Sisipkan Nomor BKU (Auto-Geser) */}
                                <button
                                  type="button"
                                  onClick={() => openSwapRenumberModal(row.transaction.id, undefined, 'shift')}
                                  className="p-1 text-purple-800 hover:text-purple-950 hover:bg-purple-100 rounded transition cursor-pointer"
                                  title="Ganti nomor BKU baris ini & otomatis geser nomor setelahnya"
                                >
                                  <Hash className="w-3.5 h-3.5 text-purple-700" />
                                </button>

                                {/* Tukar Nomor BKU */}
                                <button
                                  type="button"
                                  onClick={() => openSwapRenumberModal(row.transaction.id, undefined, 'swap')}
                                  className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded transition cursor-pointer"
                                  title="Tukar Nomor BKU dengan transaksi lain"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>

                                {row.pengeluaran > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedTransactionForKwitansi(row.transaction.id);
                                      setActiveTab('kwitansi');
                                    }}
                                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer"
                                    title="Cetak Kwitansi"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openTransactionModal(row.transaction)}
                                  className="p-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                  title="Edit Transaksi & Rincian"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Hapus transaksi "${row.uraian}"?`)) {
                                      deleteTransaction(row.transaction.id);
                                    }
                                  }}
                                  className="p-1 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}

                    {/* Baris Total / JUMLAH */}
                    <tr className="bg-slate-100 font-bold text-black text-xs">
                      <td className="border border-slate-900 py-2.5 px-1 print:hidden bg-slate-100"></td>
                      <td className="border border-slate-900 py-2.5 px-3 text-center text-black font-black" colSpan={4}>
                        JUMLAH
                      </td>
                      <td className="border border-slate-900 py-2.5 px-2.5 text-right font-mono font-black text-black">
                        {formatRupiah(group.bkuTunai.totalPenerimaan, false)}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-2.5 text-right font-mono font-black text-rose-700">
                        {formatRupiah(group.bkuTunai.totalPengeluaran, false)}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-2.5 text-right font-mono font-black text-emerald-950">
                        {formatRupiah(group.bkuTunai.saldoAkhir, false)}
                      </td>
                      <td className="border border-slate-900 py-2.5 px-1 print:hidden"></td>
                    </tr>
              </tbody>
            </table>
              );
            })()}
          </div>

          {/* Bagian Bawah: Penutupan Kas Tunai Per Bulan (Tutup Buku) */}
          <div className="mt-6 pt-4 border-t border-slate-300 text-xs text-black space-y-2">
            <p className="font-bold text-black">
              Pada hari ini : {group.tanggalTutupBuku}
            </p>
            <p className="font-bold text-black">
              Buku Kas Pembantu Tunai ditutup dengan keadaan/posisi Buku sebagai berikut :
            </p>

            <div className="w-full max-w-lg space-y-1 pl-4 pt-1 text-black">
              <div className="flex justify-between font-mono text-black">
                <span className="text-black font-semibold">Sisa Saldo Kas Tunai</span>
                <span className="font-bold text-black">: {formatRupiah(group.summary.saldoTunai)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1 text-[11px] italic font-serif text-slate-700">
                <span className="font-sans font-normal text-slate-700">Terbilang</span>
                <span className="text-right pl-2">: {terbilangRupiah(group.summary.saldoTunai)}</span>
              </div>
            </div>
          </div>

          {/* Kolom Tanda Tangan Sesuai Format Gambar */}
          <div className="mt-10 text-xs text-black break-inside-avoid">
            {signatureFormat === '3_pihak' ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Kiri: Mengetahui Kepala Sekolah */}
                <div className="flex flex-col justify-between h-36">
                  <div>
                    <p className="font-normal text-black">Mengetahui,</p>
                    <p className="font-bold text-black">Kepala {profile.namaSekolah || 'Sekolah'}</p>
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
                    <p className="text-[11px] text-slate-600 font-normal">
                      {profile.namaPanitia || 'Panitia Pembangunan Sekolah'}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase text-black">
                      {profile.namaKetuaP2S || profile.namaPanitia || 'Nama Ketua P2S'}
                    </p>
                  </div>
                </div>

                {/* Kanan: Tanggal & Bendahara */}
                <div className="flex flex-col justify-between h-36">
                  <div>
                    <p className="font-normal text-black">
                      {profile.tempatPelunasan || profile.kabupaten || 'Palasa'}, {group.tanggalTutupBuku}
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
            ) : (
              <div className="grid grid-cols-2 gap-8 text-center">
                {/* Kiri: Mengetahui Kepala Sekolah */}
                <div className="flex flex-col justify-between h-36">
                  <div>
                    <p className="font-normal text-black">Mengetahui,</p>
                    <p className="font-bold text-black">Kepala {profile.namaSekolah || 'Sekolah'}</p>
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

                {/* Kanan: Tanggal & Bendahara */}
                <div className="flex flex-col justify-between h-36">
                  <div>
                    <p className="font-normal text-black">
                      {profile.tempatPelunasan || profile.kabupaten || 'Palasa'}, {group.tanggalTutupBuku}
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
            )}
          </div>
        </div>
      ))}

      {/* Floating Selection Bar for bulk operations */}
      <TransactionSelectionBar
        selectedIds={selectedTxIds}
        onClearSelection={() => setSelectedTxIds([])}
        transactionsInCurrentView={transactions}
      />
    </div>
  );
};
