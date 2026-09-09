import React from 'react';
import {
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Pencil,
  Trash2,
  Receipt,
  Layers,
  Calendar,
} from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';
import { calculateBkuTunaiRows } from '../utils/calculations';
import { formatRupiah } from '../utils/terbilang';
import { exportLpjToExcel } from '../utils/excelExport';
import { triggerPrint } from '../utils/printHelper';

export const BkuTunaiView: React.FC = () => {
  const {
    profile,
    transactions,
    openTransactionModal,
    deleteTransaction,
    setSelectedTransactionForKwitansi,
    setActiveTab,
    openProfileModal,
  } = useLpjStore();

  const bkuTunai = calculateBkuTunaiRows(transactions);

  const handlePrint = () => {
    triggerPrint('Buku Kas Tunai (BKU Tunai)');
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Action Header Ribbon (Purple + Yellow) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#220738] p-4 rounded-2xl border border-amber-400/30 text-white shadow-lg print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              Buku Kas Pembantu Tunai (BKU Tunai)
            </h2>
            <span className="bg-amber-400 text-purple-950 text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <Layers className="w-3 h-3" />
              Kolom Rincian Barang Lengkap
            </span>
          </div>
          <p className="text-xs text-purple-200/90 mt-0.5">
            Menampilkan kolom khusus Nama Barang, Volume, Satuan, dan Harga Satuan (Pasir, Semen, Kayu, Upah, dll) persis format dinas.
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
            <span>+ Input Belanja & Rincian</span>
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

      {/* Banner Informasi Sinkronisasi Otomatis Kas Tunai ke Kas Umum */}
      <div className="bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-4 text-slate-900 flex items-start gap-3.5 shadow-xs print:hidden">
        <div className="p-2 bg-emerald-600 text-white rounded-xl font-bold shrink-0 mt-0.5 shadow-xs">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-sm text-emerald-950">
              Sinkronisasi Otomatis Kas Tunai ➔ Kas Umum (BKU)
            </h3>
            <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Aktif Otomatis
            </span>
          </div>
          <p className="text-emerald-900 font-medium mt-1 leading-relaxed">
            Setiap kali Anda menginput belanja di Kas Tunai ini dengan rincian barang (volume, satuan, dan harga), sistem akan <strong>otomatis menginput ke Buku Kas Umum (BKU)</strong> sebesar <strong>jumlah total belanjanya saja (tanpa rincian item)</strong>. Saldo kas umum Anda akan langsung terpotong secara rapi dan seimbang tanpa perlu input ulang.
          </p>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full text-black sheet-paper">
        {/* Kop Judul */}
        <div className="text-center space-y-1 mb-6 border-b-2 border-slate-900 pb-4 text-black">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-black">
            BUKU KAS TUNAI
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

        {/* Tabel BKU Tunai dengan Kolom Barang (Persis Screenshot 3) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-900 text-xs text-black">
            <thead>
              {/* Header Baris 1 */}
              <tr className="bg-slate-100 text-black text-center font-bold">
                <th rowSpan={2} className="border border-slate-900 py-2 px-1.5 w-10 text-black font-bold">
                  NO.
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-2.5 w-24 text-black font-bold">
                  TANGGAL
                </th>
                <th colSpan={4} className="border border-slate-900 py-1.5 px-3 text-black font-bold">
                  URAIAN TRANSAKSI & RINCIAN BARANG
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-2 w-20 text-black font-bold">
                  NO. BUKTI
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-2.5 w-28 text-right text-black font-bold">
                  PENERIMAAN (Rp)
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-2.5 w-28 text-right text-black font-bold">
                  PENGELUARAN (Rp)
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-2.5 w-32 text-right text-black font-bold">
                  SALDO (Rp)
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-1.5 w-16 text-center print:hidden text-black font-bold">
                  Aksi
                </th>
              </tr>

              {/* Header Baris 2 (Sub-Kolom Uraian) */}
              <tr className="bg-slate-100 text-black text-center font-bold text-[11px]">
                <th className="border border-slate-900 py-1.5 px-3 min-w-[170px] text-black font-bold">
                  NAMA BARANG / URAIAN
                </th>
                <th className="border border-slate-900 py-1.5 px-2 w-14 text-black font-bold">
                  VOL
                </th>
                <th className="border border-slate-900 py-1.5 px-2 w-16 text-black font-bold">
                  SATUAN
                </th>
                <th className="border border-slate-900 py-1.5 px-2.5 w-28 text-right text-black font-bold">
                  HARGA SATUAN (Rp)
                </th>
              </tr>

              {/* Header Baris 3 (Nomor Urut Kolom Standar Dinas) */}
              <tr className="bg-slate-100 text-black text-center font-bold italic text-[11px]">
                <th className="border border-slate-900 py-0.5 text-black font-bold">1</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">2</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">3a</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">3b</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">3c</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">3d</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">4</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">5</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">6</th>
                <th className="border border-slate-900 py-0.5 text-black font-bold">7</th>
                <th className="border border-slate-900 py-0.5 print:hidden text-black font-bold">-</th>
              </tr>
            </thead>

            <tbody>
              {bkuTunai.rows.map((row) => {
                const hasSub = Boolean(row.transaction.subItems && row.transaction.subItems.length > 0);

                return (
                  <React.Fragment key={row.transaction.id}>
                    {/* Baris Transaksi Utama */}
                    <tr className="hover:bg-slate-50 transition bg-white text-black">
                      <td className="border border-slate-900 py-2 px-1 text-center font-mono font-bold text-black">
                        {row.nomorBukti ? row.no : ''}
                      </td>
                      <td className="border border-slate-900 py-2 px-2 whitespace-nowrap text-black font-semibold">
                        {row.tanggal}
                      </td>
                      {/* Uraian Transaksi Utama Membentang di 4 Sub-Kolom */}
                      <td colSpan={4} className="border border-slate-900 py-2 px-3 font-bold text-black">
                        {row.uraian}
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
                      {/* Action buttons (screen only) */}
                      <td className="border border-slate-900 py-2 px-1 text-center print:hidden">
                        <div className="flex items-center justify-center space-x-1">
                          {row.pengeluaran > 0 && (
                            <button
                              onClick={() => {
                                setSelectedTransactionForKwitansi(row.transaction.id);
                                setActiveTab('kwitansi');
                              }}
                              className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
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

                    {/* Sub-Rows Rincian Barang (Sesuai Screenshot 3) */}
                    {hasSub &&
                      row.transaction.subItems?.map((item) => (
                        <tr key={item.id} className="bg-slate-50/60 hover:bg-amber-50/40 text-black transition">
                          <td className="border border-slate-900 py-1.5 px-1 text-black"></td>
                          <td className="border border-slate-900 py-1.5 px-2 text-black"></td>
                          {/* 1. Nama Barang */}
                          <td className="border border-slate-900 py-1.5 px-3 pl-6 font-bold text-black">
                            {item.nama}
                          </td>
                          {/* 2. Volume */}
                          <td className="border border-slate-900 py-1.5 px-2 text-center font-mono font-bold text-black">
                            {typeof item.volume === 'number'
                              ? item.volume.toLocaleString('id-ID', {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 2,
                                })
                              : item.volume}
                          </td>
                          {/* 3. Satuan */}
                          <td className="border border-slate-900 py-1.5 px-2 text-center font-bold text-black">
                            {item.satuan}
                          </td>
                          {/* 4. Harga Satuan */}
                          <td className="border border-slate-900 py-1.5 px-2.5 text-right font-mono font-bold text-black">
                            {formatRupiah(item.hargaSatuan, false)}
                          </td>
                          {/* No Bukti */}
                          <td className="border border-slate-900 py-1.5 px-2 text-black"></td>
                          {/* Penerimaan */}
                          <td className="border border-slate-900 py-1.5 px-2.5 text-black"></td>
                          {/* Pengeluaran per Sub-Item */}
                          <td className="border border-slate-900 py-1.5 px-2.5 text-right font-mono text-black font-bold">
                            {formatRupiah(item.subtotal, false)}
                          </td>
                          {/* Saldo */}
                          <td className="border border-slate-900 py-1.5 px-2.5 text-black"></td>
                          <td className="border border-slate-900 py-1.5 px-1 print:hidden"></td>
                        </tr>
                      ))}

                    {/* Baris "Jumlah Nota" (Sesuai Screenshot 3) */}
                    {hasSub && (
                      <tr className="bg-slate-100/80 font-bold text-black">
                        <td className="border border-slate-900 py-1.5 px-1 text-black"></td>
                        <td className="border border-slate-900 py-1.5 px-2 text-black"></td>
                        <td colSpan={4} className="border border-slate-900 py-1.5 px-3 pl-6 italic font-bold text-black">
                          Jumlah Nota
                        </td>
                        <td className="border border-slate-900 py-1.5 px-2 text-black"></td>
                        <td className="border border-slate-900 py-1.5 px-2.5 text-black"></td>
                        <td className="border border-slate-900 py-1.5 px-2.5 text-right font-mono font-black text-black">
                          {formatRupiah(row.pengeluaran, false)}
                        </td>
                        <td className="border border-slate-900 py-1.5 px-2.5 text-black"></td>
                        <td className="border border-slate-900 py-1.5 px-1 print:hidden"></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Baris Total / JUMLAH */}
              <tr className="bg-slate-100 font-bold text-black text-xs">
                <td className="border border-slate-900 py-2.5 px-3 text-center text-black font-black" colSpan={6}>
                  JUMLAH
                </td>
                <td className="border border-slate-900 py-2.5 px-2 text-black"></td>
                <td className="border border-slate-900 py-2.5 px-2.5 text-right font-mono font-black text-black">
                  {formatRupiah(bkuTunai.totalPenerimaan, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-2.5 text-right font-mono font-black text-rose-700">
                  {formatRupiah(bkuTunai.totalPengeluaran, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-2.5 text-right font-mono font-black text-emerald-950">
                  {formatRupiah(bkuTunai.saldoAkhir, false)}
                </td>
                <td className="border border-slate-900 py-2.5 px-1 print:hidden"></td>
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
