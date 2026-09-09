import React from 'react';
import {
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Pencil,
  Trash2,
  Receipt,
  Calendar,
  Layers,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { calculateBkuRows, calculateSummary } from '../utils/calculations';
import { formatRupiah, formatRupiahBulat } from '../utils/terbilang';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';

export const BkuGeneralView: React.FC = () => {
  const {
    profile,
    transactions,
    openTransactionModal,
    deleteTransaction,
    setSelectedTransactionForKwitansi,
    setActiveTab,
    openProfileModal,
  } = useLpjStore();

  const bku = calculateBkuRows(transactions);
  const summary = calculateSummary(transactions);

  const handlePrint = () => {
    triggerPrint('Buku Kas Umum (BKU)');
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Action Ribbon - Hidden in Print (Purple + Yellow) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#220738] p-4 rounded-2xl border border-amber-400/30 text-white shadow-lg print:hidden">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            Buku Kas Umum (BKU) - Gabungan Bank & Tunai
          </h2>
          <p className="text-xs text-purple-200/90">
            Menampilkan pergerakan kas masuk dan keluar secara kronologis beserta saldo kumulatif berjalan.
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

      {/* Printable Sheet Container */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full text-black sheet-paper">
        {/* Kop Judul Laporan */}
        <div className="text-center space-y-1 mb-6 border-b-2 border-slate-900 pb-4 text-black">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-black">
            BUKU KAS UMUM
          </h1>
          <h2 className="text-xs sm:text-sm font-bold uppercase text-black max-w-4xl mx-auto leading-snug">
            {profile.judulPekerjaan}
          </h2>
          <p className="text-xs font-bold text-black">
            Bulan : {profile.bulanLaporan}
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
              <span className="text-black font-medium">{profile.kecamatan}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold shrink-0 text-black">KABUPATEN</span>
              <span className="shrink-0 mr-2 text-black">:</span>
              <span className="text-black font-medium">{profile.kabupaten}</span>
            </div>
          </div>
        </div>

        {/* Tabel BKU Format Standar Dinas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-900 text-xs text-black">
            {/* Header Kolom */}
            <thead>
              <tr className="bg-slate-100 text-black text-center font-bold">
                <th className="border border-slate-900 py-2.5 px-2 w-12 text-black font-bold">NO.</th>
                <th className="border border-slate-900 py-2.5 px-3 w-28 text-black font-bold">TANGGAL</th>
                <th className="border border-slate-900 py-2.5 px-4 text-black font-bold">URAIAN TRANSAKSI</th>
                <th className="border border-slate-900 py-2.5 px-3 w-24 text-black font-bold">No. Bukti</th>
                <th className="border border-slate-900 py-2.5 px-3 w-32 text-right text-black font-bold">
                  PENERIMAAN (Rp)
                </th>
                <th className="border border-slate-900 py-2.5 px-3 w-32 text-right text-black font-bold">
                  PENGELUARAN (Rp)
                </th>
                <th className="border border-slate-900 py-2.5 px-3 w-36 text-right text-black font-bold">
                  SALDO (Rp)
                </th>
                <th className="border border-slate-900 py-2.5 px-2 w-20 text-center print:hidden text-black font-bold">
                  Aksi
                </th>
              </tr>
              {/* Nomor Kolom Standar Excel */}
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

            {/* Baris Transaksi */}
            <tbody>
              {bku.rows.map((row, idx) => (
                <tr
                  key={row.transaction.id}
                  className={`hover:bg-slate-50 transition ${
                    idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  <td className="border border-slate-900 py-2 px-2 text-center font-mono font-bold text-black">
                    {row.nomorBukti ? row.no : ''}
                  </td>
                  <td className="border border-slate-900 py-2 px-3 whitespace-nowrap font-medium text-black">
                    {row.tanggal}
                  </td>
                  <td className="border border-slate-900 py-2 px-4 font-bold text-black">
                    <div className="flex items-center justify-between gap-2">
                      <span>{row.uraian}</span>
                      {row.transaction.subItems && row.transaction.subItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('bku-tunai')}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 border border-purple-300 hover:bg-purple-200 transition shrink-0 print:hidden cursor-pointer"
                          title="Lihat rincian belanja transaksi ini di lembar Kas Tunai"
                        >
                          <Layers className="w-3 h-3 text-purple-800" />
                          <span>{row.transaction.subItems.length} Rincian di Kas Tunai</span>
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
                    <div className="flex items-center justify-center space-x-1">
                      {row.pengeluaran > 0 && (
                        <button
                          onClick={() => {
                            setSelectedTransactionForKwitansi(row.transaction.id);
                            setActiveTab('kwitansi');
                          }}
                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                          title="Cetak Kwitansi"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                  {formatRupiah(bku.totalPenerimaan, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-rose-700">
                  {formatRupiah(bku.totalPengeluaran, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-emerald-950">
                  {formatRupiah(bku.saldoAkhir, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-2 print:hidden"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bagian Bawah: Penutupan Kas Terkini */}
        <div className="mt-6 pt-4 border-t border-slate-300 text-xs text-black space-y-2">
          <p className="font-bold text-black">
            Pada hari ini : {profile.tanggalTutupBuku}
          </p>
          <p className="font-bold text-black">
            Buku Kas Umum ditutup dengan keadaan/posisi Buku sebagai berikut :
          </p>

          <div className="w-full max-w-md space-y-1 pl-4 pt-1 font-mono text-black">
            <div className="flex justify-between text-black">
              <span className="text-black font-semibold">Sisa Saldo Bank</span>
              <span className="font-bold text-black">: {formatRupiah(summary.saldoBank)}</span>
            </div>
            <div className="flex justify-between text-black">
              <span className="text-black font-semibold">Sisa Saldo Kas Tunai</span>
              <span className="font-bold text-black">: {formatRupiah(summary.saldoTunai)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-900 pt-1 font-bold text-black">
              <span className="text-black font-bold">Jumlah</span>
              <span className="font-black text-black">: {formatRupiah(summary.saldoKumulatif)}</span>
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
    </div>
  );
};
