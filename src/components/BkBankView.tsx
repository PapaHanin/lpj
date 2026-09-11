import React from 'react';
import {
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Pencil,
  Trash2,
  Landmark,
  Calendar,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { calculateBkBankRows } from '../utils/calculations';
import { formatRupiah, formatRupiahBulat } from '../utils/terbilang';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';

export const BkBankView: React.FC = () => {
  const {
    profile,
    transactions,
    openTransactionModal,
    deleteTransaction,
    openProfileModal,
  } = useLpjStore();

  const bkBank = calculateBkBankRows(transactions);

  const handlePrint = () => {
    triggerPrint('Buku Kas Bank (BK Bank)');
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Action Header Ribbon (Purple + Yellow) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#220738] p-4 rounded-2xl border border-amber-400/30 text-white shadow-lg print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              Buku Kas Bank (BK Bank)
            </h2>
            <span className="bg-amber-400 text-purple-950 text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <Landmark className="w-3 h-3" />
              Rekening DAK Fisik
            </span>
          </div>
          <p className="text-xs text-purple-200/90 mt-0.5">
            Khusus mutasi rekening bank (Setoran DAK, bunga bank, pajak, dan penarikan dana bertahap ke kas tunai).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openProfileModal}
            className="flex items-center space-x-1 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            title="Ganti Bulan Laporan"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Bulan: {profile.bulanLaporan}</span>
          </button>
          <button
            onClick={() => openTransactionModal(undefined, { metode: 'BANK', jenis: 'PENERIMAAN', uraian: 'Dana Masuk DAK Fisik' })}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            title="Tambah Penerimaan Dana Masuk ke Rekening Bank"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Dana Masuk Bank</span>
          </button>
          <button
            onClick={() => openTransactionModal(undefined, { metode: 'TARIK_TUNAI', jenis: 'PENERIMAAN', uraian: 'Penarikan Dana dari Rekening Bank' })}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            title="Tambah Penarikan Tunai dari Rekening Bank"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Tarik Tunai Bank</span>
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
            <span>Cetak BK Bank</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full text-black sheet-paper">
        {/* Kop Judul */}
        <div className="text-center space-y-1 mb-6 border-b-2 border-slate-900 pb-4 text-black">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-black">
            BUKU KAS BANK
          </h1>
          <p className="text-xs font-bold text-black">
            Bulan : {profile.bulanLaporan}
          </p>
        </div>

        {/* Profil Metadata Header (Sesuai Screenshot 3) */}
        <div className="text-xs font-semibold text-black mb-6 space-y-1 max-w-lg">
          <div className="flex">
            <span className="w-36 font-bold shrink-0 text-black">Nama Sekolah</span>
            <span className="shrink-0 mr-2 text-black">:</span>
            <span className="font-bold text-black">{profile.namaSekolah}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-bold shrink-0 text-black">Alamat</span>
            <span className="shrink-0 mr-2 text-black">:</span>
            <span className="text-black font-medium">{profile.alamat}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-bold shrink-0 text-black">Kabupaten</span>
            <span className="shrink-0 mr-2 text-black">:</span>
            <span className="text-black font-medium">{profile.kabupaten}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-bold shrink-0 text-black">Provinsi</span>
            <span className="shrink-0 mr-2 text-black">:</span>
            <span className="text-black font-medium">{profile.provinsi}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-bold shrink-0 text-black">Tahun Anggaran</span>
            <span className="shrink-0 mr-2 text-black">:</span>
            <span className="font-bold text-black">{profile.tahunAnggaran}</span>
          </div>
        </div>

        {/* Banner Rumus Saldo Kas Bank Berjalan */}
        <div className="mb-4 bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-700 text-white font-black text-[11px] shrink-0">
              fx
            </span>
            <div>
              <span className="font-bold text-emerald-950">Aturan Pencatatan BK Bank: </span>
              <span className="font-semibold text-emerald-900 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                Khusus mutasi rekening: Dana Masuk Rekening (Debet) & Penarikan Tunai dari Bank (Kredit). Saldo [7] = Saldo Sebelumnya + Debet [5] - Kredit [6].
              </span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-800 font-medium">
            Sesuai Rumus Excel: <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">=G(prev)+E-F</code>.
          </div>
        </div>

        {/* Tabel BK Bank */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-900 text-xs text-black">
            <thead>
              <tr className="bg-slate-100 text-black text-center font-bold">
                <th className="border border-slate-900 py-2.5 px-2 w-12 text-black font-bold">NO</th>
                <th className="border border-slate-900 py-2.5 px-3 w-32 text-black font-bold">Tanggal</th>
                <th className="border border-slate-900 py-2.5 px-4 text-black font-bold">URAIAN</th>
                <th className="border border-slate-900 py-2.5 px-3 w-28 text-black font-bold">Nomor Bukti</th>
                <th className="border border-slate-900 py-2.5 px-3 w-36 text-right text-black font-bold">
                  Debet (Rp)
                </th>
                <th className="border border-slate-900 py-2.5 px-3 w-36 text-right text-black font-bold">
                  Kredit (Rp)
                </th>
                <th className="border border-slate-900 py-2.5 px-3 w-36 text-right text-black font-bold">
                  <div>Saldo (Rp)</div>
                  <div className="text-[10px] font-normal text-slate-600 print:hidden font-mono">[7]=[prev]+[5]-[6]</div>
                </th>
                <th className="border border-slate-900 py-2.5 px-2 w-16 text-center print:hidden text-black font-bold">
                  Aksi
                </th>
              </tr>
              <tr className="bg-slate-100 text-black text-center font-bold italic text-[11px]">
                <th className="border border-slate-900 py-1 text-black font-bold">1</th>
                <th className="border border-slate-900 py-1 text-black font-bold">2</th>
                <th className="border border-slate-900 py-1 text-black font-bold">3</th>
                <th className="border border-slate-900 py-1 text-black font-bold">4</th>
                <th className="border border-slate-900 py-1 text-black font-bold">5</th>
                <th className="border border-slate-900 py-1 text-black font-bold">6</th>
                <th className="border border-slate-900 py-1 text-black font-bold">7</th>
                <th className="border border-slate-900 py-1 print:hidden text-black font-bold">-</th>
              </tr>
            </thead>

            <tbody>
              {bkBank.rows.map((row) => (
                <tr key={row.transaction.id} className="hover:bg-slate-50 transition bg-white text-black">
                  <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold text-black">
                    {row.no}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 whitespace-nowrap text-black font-medium">
                    {row.tanggal}
                  </td>
                  <td className="border border-slate-900 py-2 px-4 font-bold text-black">
                    {row.uraian}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 text-center font-mono font-bold text-black">
                    {row.nomorBukti || '-'}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 text-right font-mono font-bold text-black">
                    {row.debet > 0 ? formatRupiah(row.debet, false) : '-'}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 text-right font-mono font-bold text-rose-700">
                    {row.kredit > 0 ? formatRupiah(row.kredit, false) : '-'}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 text-right font-mono font-black text-black">
                    {formatRupiah(row.saldo, false)}
                  </td>
                  <td className="border border-slate-900 py-2 px-1 text-center print:hidden">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => openTransactionModal(row.transaction)}
                        className="p-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Baris"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Hapus transaksi "${row.uraian}"?`)) {
                            deleteTransaction(row.transaction.id);
                          }
                        }}
                        className="p-1 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Baris Total / JUMLAH */}
              <tr className="bg-slate-100 font-bold text-black text-xs">
                <td className="border border-slate-900 py-2.5 px-2 text-center text-black font-black" colSpan={4}>
                  JUMLAH
                </td>
                <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-black">
                  {formatRupiah(bkBank.totalDebet, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-rose-700">
                  {formatRupiah(bkBank.totalKredit, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-sky-950">
                  {formatRupiah(bkBank.saldoAkhir, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-2 print:hidden"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kolom Tanda Tangan */}
        <div className="mt-10 text-xs text-black break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div className="space-y-20">
              <p className="font-bold text-black">Kepala Sekolah</p>
              <div>
                <p className="font-bold underline uppercase tracking-wide text-black">
                  {profile.namaKepalaSekolah}
                </p>
                <p className="font-mono text-black font-bold">
                  NIP. {profile.nipKepalaSekolah}
                </p>
              </div>
            </div>

            <div className="space-y-20">
              <p className="font-bold text-black">Bendahara</p>
              <div>
                <p className="font-bold underline uppercase tracking-wide text-black">
                  {profile.namaBendahara}
                </p>
                <p className="font-mono text-black font-bold">
                  NIP. {profile.nipBendahara}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
