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
  Hash,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { groupTransactionsByMonthlyBooks, getJenisBiaya } from '../utils/calculations';
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
            Buku Kas Umum (BKU) - Format Resmi 2 Sisi (Penerimaan & Pengeluaran)
          </h2>
          <p className="text-xs text-purple-200/90">
            Sesuai format resmi: Kolom Penerimaan (1-4) & Pengeluaran (5-9), Tutup Buku Kas, dan 3 Tanda Tangan (Kepala Sekolah, Ketua P2S, Bendahara).
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
            title="Ganti Profil & Pejabat Penandatangan"
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

      {/* Render Each Month Sheet */}
      {groupsToRender.map((group, gIdx) => {
        // Build 2-sided items (Penerimaan on left, Pengeluaran on right)
        interface PenerimaanItem {
          id: string;
          tanggal: string;
          uraian: string;
          nomorBukti: string;
          jumlah: number;
          isInitial?: boolean;
          transaction?: Transaction;
        }

        interface PengeluaranItem {
          id: string;
          tanggal: string;
          uraian: string;
          nomorBukti: string;
          jenisBiaya: string;
          jumlah: number;
          transaction: Transaction;
        }

        const penerimaanItems: PenerimaanItem[] = [];

        // Saldo Kas Umum Bulan Lalu jika bukan bulan pertama
        if (!group.isFirstMonth && group.bku.initialRow) {
          penerimaanItems.push({
            id: `initial-${group.monthKey}`,
            tanggal: group.bku.initialRow.tanggal,
            uraian: group.bku.initialRow.uraian,
            nomorBukti: '-',
            jumlah: group.bku.initialRow.saldo,
            isInitial: true,
            transaction: group.bku.initialRow.transaction,
          });
        }

        // Transaksi Penerimaan dalam bulan ini (tidak termasuk transfer internal tarik tunai)
        group.transactions.forEach((t) => {
          if (t.jenis === 'PENERIMAAN' && t.metode !== 'TARIK_TUNAI') {
            penerimaanItems.push({
              id: t.id,
              tanggal: t.tanggal,
              uraian: t.uraian,
              nomorBukti: t.nomorBukti || '-',
              jumlah: t.penerimaan,
              transaction: t,
            });
          }
        });

        // Transaksi Pengeluaran dalam bulan ini (belanja riil)
        const pengeluaranItems: PengeluaranItem[] = [];
        group.transactions.forEach((t) => {
          if (t.jenis === 'PENGELUARAN' || (t.metode !== 'TARIK_TUNAI' && t.pengeluaran > 0)) {
            pengeluaranItems.push({
              id: t.id,
              tanggal: t.tanggal,
              uraian: t.uraian,
              nomorBukti: t.nomorBukti || '',
              jenisBiaya: t.jenisBiaya || getJenisBiaya(t),
              jumlah: t.pengeluaran,
              transaction: t,
            });
          }
        });

        const maxRows = Math.max(penerimaanItems.length, pengeluaranItems.length, 8);
        const totalPenerimaan = penerimaanItems.reduce((acc, p) => acc + p.jumlah, 0);
        const totalPengeluaran = pengeluaranItems.reduce((acc, q) => acc + q.jumlah, 0);
        const saldoKasUmum = totalPenerimaan - totalPengeluaran;

        return (
          <div
            key={group.monthKey}
            className={`bg-white rounded-xl shadow-xs border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full text-black sheet-paper ${
              gIdx > 0 ? 'mt-8 print:mt-0 print:break-before-page' : ''
            }`}
          >
            {/* Kop Judul Laporan Sesuai Screenshot 1 */}
            <div className="text-center space-y-0.5 mb-5 text-black">
              <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                BUKU KAS UMUM
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-black">
                Bulan : {group.label}
              </p>
            </div>

            {/* Tabel BKU Format 2 Sisi Sesuai Screenshot 1 */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-black text-black font-sans">
                <thead>
                  {/* Tier 1 Header: Penerimaan vs Pengeluaran */}
                  <tr className="bg-slate-100 font-bold text-center text-black">
                    <th
                      colSpan={4}
                      className="border border-black py-2 px-2 text-center text-black font-bold uppercase tracking-wider bg-slate-100"
                    >
                      Penerimaan
                    </th>
                    <th
                      colSpan={5}
                      className="border border-black py-2 px-2 text-center text-black font-bold uppercase tracking-wider bg-slate-100"
                    >
                      Pengeluaran
                    </th>
                    <th className="border border-black py-2 px-1 w-20 text-center print:hidden bg-[#220738] text-white font-medium text-[11px]">
                      Aksi
                    </th>
                  </tr>

                  {/* Tier 2 Header: 9 Kolom Resmi */}
                  <tr className="bg-white font-bold text-center text-black">
                    {/* Penerimaan */}
                    <th className="border border-black py-2 px-2 w-24 text-center text-black">
                      Tanggal
                    </th>
                    <th className="border border-black py-2 px-2 text-left text-black min-w-[150px]">
                      Uraian
                    </th>
                    <th className="border border-black py-2 px-2 w-20 text-center text-black">
                      No. Bukti
                    </th>
                    <th className="border border-black py-2 px-2 w-28 text-right text-black">
                      Jumlah (Rp.)
                    </th>

                    {/* Pengeluaran */}
                    <th className="border border-black py-2 px-2 w-24 text-center text-black">
                      Tanggal
                    </th>
                    <th className="border border-black py-2 px-2 text-left text-black min-w-[170px]">
                      Uraian
                    </th>
                    <th className="border border-black py-2 px-2 w-20 text-center text-black">
                      No. Bukti
                    </th>
                    <th className="border border-black py-2 px-2 w-20 text-center text-black">
                      Jenis Biaya
                    </th>
                    <th className="border border-black py-2 px-2 w-28 text-right text-black">
                      Jumlah (Rp.)
                    </th>

                    <th className="border border-black py-2 px-1 print:hidden bg-purple-900/30 text-[10px]"></th>
                  </tr>

                  {/* Tier 3: Nomor Kolom 1 s/d 9 Sesuai Gambar */}
                  <tr className="bg-slate-50 text-center text-[10px] text-black font-bold">
                    <th className="border border-black py-0.5">1</th>
                    <th className="border border-black py-0.5">2</th>
                    <th className="border border-black py-0.5">3</th>
                    <th className="border border-black py-0.5">4</th>
                    <th className="border border-black py-0.5">5</th>
                    <th className="border border-black py-0.5">6</th>
                    <th className="border border-black py-0.5">7</th>
                    <th className="border border-black py-0.5">8</th>
                    <th className="border border-black py-0.5">9</th>
                    <th className="border border-black py-0.5 print:hidden"></th>
                  </tr>
                </thead>

                <tbody>
                  {Array.from({ length: maxRows }).map((_, idx) => {
                    const p = penerimaanItems[idx];
                    const q = pengeluaranItems[idx];

                    return (
                      <tr
                        key={`bku-row-${group.monthKey}-${idx}`}
                        className="hover:bg-slate-50 transition text-black font-sans"
                      >
                        {/* Kolom 1: Tanggal Penerimaan */}
                        <td className="border border-black py-1.5 px-2 text-center whitespace-nowrap">
                          {p ? p.tanggal : ''}
                        </td>

                        {/* Kolom 2: Uraian Penerimaan */}
                        <td className="border border-black py-1.5 px-2 text-left">
                          {p ? (
                            <span className={p.isInitial ? 'font-bold italic text-purple-950' : 'font-medium'}>
                              {p.uraian}
                            </span>
                          ) : (
                            ''
                          )}
                        </td>

                        {/* Kolom 3: No. Bukti Penerimaan */}
                        <td className="border border-black py-1.5 px-2 text-center font-mono font-medium">
                          {p ? p.nomorBukti : ''}
                        </td>

                        {/* Kolom 4: Jumlah Penerimaan */}
                        <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                          {p ? formatRupiah(p.jumlah, false) : ''}
                        </td>

                        {/* Kolom 5: Tanggal Pengeluaran */}
                        <td className="border border-black py-1.5 px-2 text-center whitespace-nowrap">
                          {q ? q.tanggal : ''}
                        </td>

                        {/* Kolom 6: Uraian Pengeluaran */}
                        <td className="border border-black py-1.5 px-2 text-left">
                          {q ? (
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium">{q.uraian}</span>
                              {!q.transaction.subItems?.length && null}
                              {q.transaction.subItems && q.transaction.subItems.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('bku-tunai')}
                                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200 transition shrink-0 print:hidden cursor-pointer"
                                  title="Lihat rincian di Kas Tunai"
                                >
                                  {q.transaction.subItems.length} item
                                </button>
                              )}
                            </div>
                          ) : (
                            ''
                          )}
                        </td>

                        {/* Kolom 7: No. Bukti Pengeluaran */}
                        <td className="border border-black py-1.5 px-2 text-center font-mono font-bold">
                          {q ? q.nomorBukti : ''}
                        </td>

                        {/* Kolom 8: Jenis Biaya Pengeluaran Sesuai Gambar */}
                        <td className="border border-black py-1.5 px-2 text-center font-medium">
                          {q ? q.jenisBiaya : ''}
                        </td>

                        {/* Kolom 9: Jumlah Pengeluaran */}
                        <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                          {q ? formatRupiah(q.jumlah, false) : ''}
                        </td>

                        {/* Aksi Baris (Screen Only) */}
                        <td className="border border-black py-1.5 px-1 text-center print:hidden">
                          {q?.transaction && (
                            <div className="flex items-center justify-center space-x-1">
                              {q.transaction.pengeluaran > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedTransactionForKwitansi(q.transaction.id);
                                    setActiveTab('kwitansi');
                                  }}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="Cetak Kwitansi"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => openTransactionModal(q.transaction)}
                                className="p-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                title="Edit Baris"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Hapus transaksi "${q.uraian}"?`)) {
                                    deleteTransaction(q.transaction.id);
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

                  {/* Baris Bawah 1: Total Pengeluaran (III) */}
                  <tr className="font-bold text-black bg-white">
                    <td className="border border-black py-1.5 px-2"></td>
                    <td className="border border-black py-1.5 px-2"></td>
                    <td className="border border-black py-1.5 px-2"></td>
                    <td className="border border-black py-1.5 px-2"></td>

                    <td colSpan={4} className="border border-black py-1.5 px-3 text-left font-bold text-black">
                      Total Pengeluaran
                    </td>
                    <td className="border border-black py-1.5 px-2 text-right font-mono font-bold text-black">
                      <div>{formatRupiah(totalPengeluaran, false)}</div>
                      <div className="text-[10px] font-normal italic text-slate-700">III</div>
                    </td>
                    <td className="border border-black py-1.5 px-1 print:hidden"></td>
                  </tr>

                  {/* Baris Bawah 2: Saldo Kas Umum (IV = I - III) */}
                  <tr className="font-bold text-black bg-white">
                    <td className="border border-black py-1.5 px-2"></td>
                    <td className="border border-black py-1.5 px-2"></td>
                    <td className="border border-black py-1.5 px-2"></td>
                    <td className="border border-black py-1.5 px-2"></td>

                    <td colSpan={4} className="border border-black py-1.5 px-3 text-left font-bold text-black">
                      Saldo Kas Umum
                    </td>
                    <td className="border border-black py-1.5 px-2 text-right font-mono font-bold text-black">
                      <div>{formatRupiah(saldoKasUmum, false)}</div>
                      <div className="text-[10px] font-normal italic text-slate-700 leading-tight">
                        IV (saldo buku Kas Umum = I - III)
                      </div>
                    </td>
                    <td className="border border-black py-1.5 px-1 print:hidden"></td>
                  </tr>

                  {/* Baris Bawah 3: Total Penerimaan Penyeimbang (I & II) */}
                  <tr className="font-bold text-black bg-white">
                    <td colSpan={3} className="border border-black py-1.5 px-3 text-left font-bold text-black">
                      Total Penerimaan
                    </td>
                    <td className="border border-black py-1.5 px-2 text-right font-mono font-bold text-black">
                      <div>{formatRupiah(totalPenerimaan, false)}</div>
                      <div className="text-[9.5px] font-normal italic text-slate-700 leading-tight">
                        I = (Total Penjumlahan di kolom 4 dipindahkan ke kolom II)
                      </div>
                    </td>

                    <td colSpan={4} className="border border-black py-1.5 px-3 text-left font-bold text-black">
                      Total Penerimaan
                    </td>
                    <td className="border border-black py-1.5 px-2 text-right font-mono font-bold text-black">
                      <div>{formatRupiah(totalPengeluaran + saldoKasUmum, false)}</div>
                      <div className="text-[9.5px] font-normal italic text-slate-700 leading-tight">
                        II (penjumlahan III + IV) sama dengan jumlah I
                      </div>
                    </td>
                    <td className="border border-black py-1.5 px-1 print:hidden"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian Bawah: Penutupan Kas Sesuai Format Kotak di Screenshot 1 */}
            <div className="mt-5 text-xs text-black space-y-2 font-sans break-inside-avoid">
              <p className="font-normal text-black">
                Pada hari ini : <strong className="font-bold">{group.tanggalTutupBuku.split(',')[0] || 'Senin'}</strong> Tanggal{' '}
                <strong className="font-bold">{group.tanggalTutupBuku}</strong> Buku Kas Umum ditutup dengan keadaan/posisi Buku sebagai berikut :
              </p>

              <table className="w-full max-w-xl border-collapse border border-black text-xs font-sans mt-2">
                <tbody>
                  <tr className="border border-black">
                    <td className="border border-black py-1.5 px-3 font-bold w-3/5 text-black">
                      Saldo Buku Kas Umum
                    </td>
                    <td className="border border-black py-1.5 px-3 font-mono font-bold text-right w-2/5 text-black">
                      Rp {formatRupiah(group.summary.saldoKumulatif, false)}
                    </td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black py-2 px-3 text-black">
                      <div className="font-bold mb-1">Terdiri dari :</div>
                      <div className="flex justify-between pl-3 py-0.5 font-medium">
                        <span>1. Saldo Bank</span>
                        <span className="font-mono">: Rp {formatRupiah(group.summary.saldoBank, false)}</span>
                      </div>
                      <div className="flex justify-between pl-3 py-0.5 font-medium">
                        <span>2. Saldo Kas Tunai</span>
                        <span className="font-mono">: Rp {formatRupiah(group.summary.saldoTunai, false)}</span>
                      </div>
                      <div className="italic text-[11px] text-slate-700 pl-3 pt-1">
                        (diisi penjumlahan saldo bank dan saldo kas tunai)
                      </div>
                    </td>
                    <td className="border border-black py-2 px-3 font-mono font-bold text-right align-bottom text-black">
                      Rp {formatRupiah(group.summary.saldoBank + group.summary.saldoTunai, false)}
                    </td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black py-1.5 px-3 font-bold text-black">
                      Perbedaan
                    </td>
                    <td className="border border-black py-1.5 px-3 font-mono font-bold text-right text-black">
                      {group.summary.saldoKumulatif - (group.summary.saldoBank + group.summary.saldoTunai) === 0
                        ? 'Rp 0 (Nihil)'
                        : `Rp ${formatRupiah(group.summary.saldoKumulatif - (group.summary.saldoBank + group.summary.saldoTunai), false)}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Kolom 3 Tanda Tangan: Mengetahui Kepala Sekolah, Ketua P2S, Bendahara Sesuai Screenshot 1 */}
            <div className="mt-8 text-xs text-black break-inside-avoid">
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
            </div>
          </div>
        );
      })}

      {/* Floating Selection Bar for bulk operations */}
      <TransactionSelectionBar
        selectedIds={selectedTxIds}
        onClearSelection={() => setSelectedTxIds([])}
        transactionsInCurrentView={transactions}
      />
    </div>
  );
};
