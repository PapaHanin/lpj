import React, { useEffect } from 'react';
import { useLpjStore } from '../store/lpjStore';
import { formatRupiah } from '../utils/calculations';
import {
  Receipt,
  X,
  ShoppingBag,
  Calendar,
  Hash,
  Store,
  Wallet,
  Copy,
  Printer,
  Edit3,
  Boxes,
  Check,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const NotaDetailModal: React.FC = () => {
  const {
    isNotaDetailModalOpen,
    selectedTransactionForNotaModal,
    closeNotaModal,
    openTransactionModal,
    setSelectedTransactionForKwitansi,
    setActiveTab,
    setActiveSubTabDaftarBarang,
    showToast,
  } = useLpjStore();

  const [copied, setCopied] = React.useState(false);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotaDetailModalOpen) {
        closeNotaModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotaDetailModalOpen, closeNotaModal]);

  if (!isNotaDetailModalOpen || !selectedTransactionForNotaModal) {
    return null;
  }

  const tx = selectedTransactionForNotaModal;
  const subItems = tx.subItems || [];
  const totalSubItemsRp = subItems.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const nominalTotal = tx.pengeluaran > 0 ? tx.pengeluaran : tx.penerimaan > 0 ? tx.penerimaan : totalSubItemsRp;

  const handleCopyClipboard = () => {
    if (subItems.length === 0) return;
    const header = `RINCIAN NOTA BELANJA - [${tx.nomorBukti || 'BUKTI'}]\nUraian: ${tx.uraian}\nTanggal: ${tx.tanggal}\nToko/Penerima: ${tx.penerima || '-'}\nTotal: ${formatRupiah(nominalTotal)}\n\nDAFTAR BARANG:`;
    const rows = subItems.map(
      (it, idx) =>
        `${idx + 1}. ${it.nama}: ${it.volume} ${it.satuan} x ${formatRupiah(it.hargaSatuan)} = ${formatRupiah(it.subtotal)}`
    );
    const textToCopy = `${header}\n${rows.join('\n')}\n\nTotal Belanja: ${formatRupiah(nominalTotal)}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      showToast({
        type: 'success',
        title: 'Rincian Berhasil Disalin',
        message: `${subItems.length} item nota belanja berhasil disalin ke clipboard.`,
      });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleEditTransaction = () => {
    closeNotaModal();
    openTransactionModal(tx);
  };

  const handleGoToKwitansi = () => {
    setSelectedTransactionForKwitansi(tx.id);
    setActiveTab('kwitansi');
    closeNotaModal();
    showToast({
      type: 'info',
      title: 'Kwitansi Terpilih',
      message: `Menampilkan kwitansi resmi untuk ${tx.nomorBukti || tx.uraian}.`,
    });
  };

  const handleGoToDaftarBahan = () => {
    setActiveTab('daftar-barang');
    setActiveSubTabDaftarBarang('bahan');
    closeNotaModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeNotaModal();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-amber-400/80 w-full max-w-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-900 transition-all">
        {/* Header Ribbon (Deep Purple + Amber Gold) */}
        <div className="bg-gradient-to-r from-[#2a0845] via-[#200536] to-[#160326] px-5 py-4 sm:px-6 sm:py-5 text-white flex items-center justify-between border-b-2 border-amber-400/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold shadow-md ring-2 ring-amber-300/60 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Rincian Barang Belanja
                </span>
                {tx.nomorBukti && (
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-amber-400 text-purple-950 shadow-xs">
                    {tx.nomorBukti}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 tracking-tight line-clamp-1">
                {tx.uraian}
              </h2>
            </div>
          </div>

          <button
            onClick={closeNotaModal}
            className="w-8 h-8 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white flex items-center justify-center transition border border-purple-700/60 cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/70">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-purple-700" />
                <span>Tanggal Belanja</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                {tx.tanggal}
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1">
                <Store className="w-3.5 h-3.5 text-amber-600" />
                <span>Toko / Rekanan</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={tx.penerima || '-'}>
                {tx.penerima || 'Toko Material / Penyedia'}
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Metode Pembayaran</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">
                {tx.metode === 'TUNAI' ? (
                  <span className="text-amber-800 font-black">Kas Tunai</span>
                ) : (
                  <span className="text-purple-900 font-black">Kas Bank</span>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-3 rounded-2xl border border-amber-300 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 mb-1">
                <Receipt className="w-3.5 h-3.5 text-amber-700" />
                <span>Total Belanja Nota</span>
              </div>
              <div className="text-sm sm:text-base font-extrabold text-purple-950 font-mono">
                {formatRupiah(nominalTotal)}
              </div>
            </div>
          </div>

          {/* SubItems Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-purple-950/5 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-purple-900" />
                <span className="text-xs sm:text-sm font-extrabold text-purple-950">
                  Daftar Barang yang Dibelanjakan ({subItems.length} Jenis Barang)
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                {subItems.length} Item Nota
              </span>
            </div>

            {subItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] sm:text-xs uppercase tracking-wide">
                      <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">No</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Nama Barang / Material</th>
                      <th className="py-2.5 px-3 text-center w-24 border-r border-slate-200">Volume</th>
                      <th className="py-2.5 px-3 text-center w-24 border-r border-slate-200">Satuan</th>
                      <th className="py-2.5 px-3 text-right w-32 border-r border-slate-200">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right w-36">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subItems.map((item, idx) => {
                      const sharePercent =
                        nominalTotal > 0 ? ((item.subtotal / nominalTotal) * 100).toFixed(1) : '0';
                      return (
                        <tr key={item.id || idx} className="hover:bg-amber-50/40 transition">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200 bg-slate-50/50">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 border-r border-slate-200">
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {item.nama}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <span>Porsi belanja: {sharePercent}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold font-mono text-purple-950 border-r border-slate-200 bg-purple-50/30">
                            {item.volume.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-700 border-r border-slate-200">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold">
                              {item.satuan}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                            {formatRupiah(item.hargaSatuan)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-purple-950 bg-amber-50/30">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-100/70 border-t-2 border-amber-300 font-extrabold text-purple-950">
                      <td colSpan={5} className="py-3 px-4 text-right text-xs sm:text-sm uppercase tracking-wide">
                        Total Akumulasi Nota Belanja :
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm sm:text-base font-black text-purple-950">
                        {formatRupiah(nominalTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  Transaksi ini belum memiliki rincian item per barang.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Belanja ini dicatat dengan nominal gelondongan ({formatRupiah(nominalTotal)}). Anda bisa merinci barang-barang belanjanya agar otomatis masuk ke Daftar Rekap Bahan & Material DAK.
                </p>
                <button
                  onClick={handleEditTransaction}
                  className="mt-3 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Tambah Rincian Barang di Transaksi Ini</span>
                </button>
              </div>
            )}
          </div>

          {/* Tips Info Box */}
          <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-purple-900">
            <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-purple-950">Otomatis Terhubung ke Lampiran DAK Fisik:</span>
              <p className="text-purple-800 text-[11px] leading-relaxed">
                Semua item barang pada nota ini otomatis tersinkronisasi ke tab <strong>"Daftar Barang / Rekap Bahan Material"</strong>. Di sana, material yang sama akan diakumulasikan volumenya dan dapat diexport ke Excel atau dicetak secara utuh.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100/90 px-5 py-3.5 sm:px-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyClipboard}
              disabled={subItems.length === 0}
              className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer border ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Salin daftar barang belanja ke clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-purple-700" />}
              <span>{copied ? 'Tersalin!' : 'Salin Rincian'}</span>
            </button>

            <button
              onClick={handleGoToKwitansi}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs cursor-pointer"
              title="Lihat dan cetak lembar kwitansi untuk transaksi ini"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Cetak Kwitansi</span>
            </button>

            <button
              onClick={handleGoToDaftarBahan}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs cursor-pointer"
              title="Buka rekapitulasi master bahan material proyek"
            >
              <Boxes className="w-3.5 h-3.5 text-purple-700" />
              <span>Rekap Semua Bahan</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleEditTransaction}
              className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer border border-amber-300"
              title="Edit belanja / tambah atau ubah barang belanja nota ini"
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-950" />
              <span>Edit / Tambah Barang</span>
            </button>

            <button
              onClick={closeNotaModal}
              className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
