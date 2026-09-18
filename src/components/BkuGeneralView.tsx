import React, { useMemo, useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Pencil,
  Trash2,
  Receipt,
  Calendar,
  Layers,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { groupTransactionsByMonthlyBooks } from '../utils/calculations';
import { formatRupiah } from '../utils/terbilang';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';
import { TransactionSelectionBar } from './TransactionSelectionBar';
import { Transaction } from '../types';

export const BkuGeneralView: React.FC = () => {
  const {
    profile,
    transactions,
    openTransactionModal,
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
    triggerPrint('Buku Kas Umum (BKU)');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Ribbon - Hidden in Print (Purple + Yellow) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#220738] p-4 rounded-2xl border border-amber-400/30 text-white shadow-lg print:hidden">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            Buku Kas Umum (BKU) - Tutup Buku & Tanda Tangan Per Bulan
          </h2>
          <p className="text-xs text-purple-200/90">
            Setiap bulan memiliki penutupan buku kas mandiri, saldo sisa bulan sebelumnya, serta kolom tanda tangan Kepala Sekolah dan Bendahara.
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
            onClick={openProfileModal}
            className="flex items-center space-x-1 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            title="Ganti Profil & Bulan Laporan"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Pengaturan Profil</span>
          </button>
          <button
            onClick={() => openSwapRenumberModal()}
            className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            title="Tukar nomor BKU atau urutkan ulang nomor BKU otomatis"
          >
            <ArrowLeftRight className="w-4 h-4 text-purple-900" />
            <span>Urutkan & Tukar BKU</span>
          </button>
          <button
            onClick={() => openTransactionModal()}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Transaksi</span>
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
            <span>Cetak BKU</span>
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
                Format Penutupan Buku Bulanan Aktif:
              </span>{' '}
              <span className="text-purple-900">
                Terdeteksi {monthlyGroups.length} periode bulan ({monthlyGroups.map((g) => g.label).join(', ')}). Setiap bulan ditutup otomatis dengan saldo kas bank, kas tunai, dan tanda tangan lengkap.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Render Each Month as Its Own Dedicated Sheet */}
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
              BUKU KAS UMUM
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

          {/* Tabel BKU */}
          <div className="overflow-x-auto">
            {(() => {
              const nonInitialRows = group.bku.rows.filter((r) => !r.isInitialRow);
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
                        NO.
                      </th>
                      <th className="border border-slate-900 py-2.5 px-3 w-32 text-black font-black">
                        TANGGAL
                      </th>
                      <th className="border border-slate-900 py-2.5 px-4 text-left text-black font-black">
                        URAIAN TRANSAKSI
                      </th>
                      <th className="border border-slate-900 py-2.5 px-3 w-28 text-black font-black">
                        No. Bukti
                      </th>
                      <th className="border border-slate-900 py-2.5 px-3 w-36 text-right text-black font-black">
                        PENERIMAAN (Rp)
                      </th>
                      <th className="border border-slate-900 py-2.5 px-3 w-36 text-right text-black font-black">
                        PENGELUARAN (Rp)
                      </th>
                      <th className="border border-slate-900 py-2.5 px-3 w-36 text-right text-black font-black">
                        SALDO (Rp)
                      </th>
                      <th className="border border-slate-900 py-2.5 px-2 w-28 text-center print:hidden">
                        Aksi
                      </th>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-center text-[11px] text-slate-800">
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

                  {/* Baris Transaksi */}
                  <tbody>
                    {group.bku.rows.map((row, idx) => {
                      const isSelected =
                        !row.isInitialRow && selectedTxIds.includes(row.transaction.id);

                      const currentIndexInNonInitial = !row.isInitialRow
                        ? nonInitialRows.findIndex(
                            (r) => r.transaction.id === row.transaction.id
                          )
                        : -1;
                      const canMoveUp = currentIndexInNonInitial > 0;
                      const canMoveDown =
                        currentIndexInNonInitial >= 0 &&
                        currentIndexInNonInitial < nonInitialRows.length - 1;

                      return (
                        <tr
                          key={
                            row.isInitialRow
                              ? `initial-${group.monthKey}`
                              : row.transaction.id
                          }
                          className={`hover:bg-slate-50 transition ${
                            row.isInitialRow
                              ? 'bg-amber-50/50 font-bold'
                              : isSelected
                              ? 'bg-amber-100/70 border-l-4 border-l-amber-500 font-semibold ring-1 ring-amber-300 inset'
                              : idx % 2 === 1
                              ? 'bg-slate-50/40'
                              : 'bg-white'
                          }`}
                        >
                          {/* Kotak Centang (Screen only) */}
                          <td className="border border-slate-900 py-2 px-1 text-center print:hidden">
                            {!row.isInitialRow ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(row.transaction.id)}
                                className="w-4 h-4 text-purple-900 rounded cursor-pointer align-middle accent-purple-800"
                                title="Centang untuk edit / hapus / tukar nomor BKU"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">-</span>
                            )}
                          </td>

                          <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold text-black">
                            {row.no}
                          </td>
                          <td className="border border-slate-900 py-2 px-3 whitespace-nowrap font-medium text-black">
                            {row.tanggal}
                          </td>
                          <td className="border border-slate-900 py-2 px-4 font-bold text-black">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={
                                  row.isInitialRow ? 'font-black italic text-purple-950' : ''
                                }
                              >
                                {row.uraian}
                              </span>
                              {row.isInitialRow && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 border border-amber-400 print:hidden">
                                  Saldo Sisa Bulan Lalu
                                </span>
                              )}
                              {!row.isInitialRow &&
                                row.transaction.subItems &&
                                row.transaction.subItems.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('bku-tunai')}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 border border-purple-300 hover:bg-purple-200 transition shrink-0 print:hidden cursor-pointer"
                                    title="Lihat rincian belanja transaksi ini di lembar Kas Tunai"
                                  >
                                    <Layers className="w-3 h-3 text-purple-800" />
                                    <span>
                                      {row.transaction.subItems.length} Rincian di Kas Tunai
                                    </span>
                                  </button>
                                )}
                            </div>
                          </td>
                          <td className="border border-slate-900 py-2 px-3 text-center font-mono font-bold text-black">
                            {row.nomorBukti || ''}
                          </td>
                          <td className="border border-slate-900 py-2 px-3 text-right font-mono font-bold text-black">
                            {row.penerimaan > 0 ? formatRupiah(row.penerimaan, false) : ''}
                          </td>
                          <td className="border border-slate-900 py-2 px-3 text-right font-mono font-bold text-black">
                            {row.pengeluaran > 0 ? formatRupiah(row.pengeluaran, false) : ''}
                          </td>
                          <td className="border border-slate-900 py-2 px-3 text-right font-mono font-bold text-black">
                            {formatRupiah(row.saldo, false)}
                          </td>

                          {/* Actions (Screen only) */}
                          <td className="border border-slate-900 py-2 px-1 text-center print:hidden">
                            {!row.isInitialRow && (
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

                                {/* Tukar Nomor BKU */}
                                <button
                                  type="button"
                                  onClick={() => openSwapRenumberModal(row.transaction.id)}
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
                                  title="Edit Baris"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(`Hapus transaksi "${row.uraian}"?`)
                                    ) {
                                      deleteTransaction(row.transaction.id);
                                    }
                                  }}
                                  className="p-1 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Baris Total / JUMLAH */}
                    <tr className="bg-slate-100 font-bold text-black text-xs">
                      <td className="border border-slate-900 py-2.5 px-1 print:hidden bg-slate-100"></td>
                      <td
                        className="border border-slate-900 py-2.5 px-2 text-center text-black font-black"
                        colSpan={4}
                      >
                        JUMLAH
                      </td>
                  <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-black">
                    <div>{formatRupiah(group.bku.totalPenerimaan, false)}</div>
                    <div className="text-[9px] font-normal text-emerald-800 print:hidden font-sans">
                      {group.isFirstMonth ? 'Dana masuk rekening' : 'Akumulasi penerimaan'}
                    </div>
                  </td>
                  <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-rose-700">
                    <div>{formatRupiah(group.bku.totalPengeluaran, false)}</div>
                    <div className="text-[9px] font-normal text-rose-800 print:hidden font-sans">
                      {group.isFirstMonth ? 'Total belanja riil' : 'Akumulasi belanja'}
                    </div>
                  </td>
                  <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-emerald-950">
                    <div>{formatRupiah(group.bku.saldoAkhir, false)}</div>
                    <div className="text-[9px] font-normal text-slate-600 print:hidden font-sans">
                      Sisa Kas Umum ({group.monthName})
                    </div>
                  </td>
                  <td className="border border-slate-900 py-2.5 px-2 print:hidden"></td>
                </tr>
              </tbody>
            </table>
              );
            })()}
          </div>

          {/* Bagian Bawah: Penutupan Kas Per Bulan (Tutup Buku) */}
          <div className="mt-6 pt-4 border-t border-slate-300 text-xs text-black space-y-2">
            <p className="font-bold text-black">
              Pada hari ini : {group.tanggalTutupBuku}
            </p>
            <p className="font-bold text-black">
              Buku Kas Umum ditutup dengan keadaan/posisi Buku sebagai berikut :
            </p>

            <div className="w-full max-w-md space-y-1 pl-4 pt-1 font-mono text-black">
              <div className="flex justify-between text-black">
                <span className="text-black font-semibold">Sisa Saldo Bank</span>
                <span className="font-bold text-black">: {formatRupiah(group.summary.saldoBank)}</span>
              </div>
              <div className="flex justify-between text-black">
                <span className="text-black font-semibold">Sisa Saldo Kas Tunai</span>
                <span className="font-bold text-black">: {formatRupiah(group.summary.saldoTunai)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-1 font-bold text-black">
                <span className="text-black font-bold">Jumlah</span>
                <span className="font-black text-black">: {formatRupiah(group.summary.saldoKumulatif)}</span>
              </div>
            </div>
          </div>

          {/* Kolom Tanda Tangan: Kepala Sekolah & Bendahara */}
          <div className="mt-10 text-xs text-black break-inside-avoid">
            <p className="text-center font-bold uppercase tracking-wider mb-6 text-black">
              {profile.namaPanitia}
            </p>
            <div className="grid grid-cols-2 gap-8 text-center">
              <div className="space-y-20">
                <p className="font-bold text-black">Kepala Sekolah</p>
                <div>
                  <p className="font-bold underline uppercase tracking-wide text-black">
                    {profile.namaKepalaSekolah}
                  </p>
                  <p className="font-mono text-black font-semibold">
                    NIP. {profile.nipKepalaSekolah}
                  </p>
                </div>
              </div>

              <div className="space-y-20">
                <p className="font-bold text-black">Dibuat Oleh Bendahara</p>
                <div>
                  <p className="font-bold underline uppercase tracking-wide text-black">
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
