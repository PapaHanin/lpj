import { useLpjStore } from '../store/lpjStore';

/**
 * Robust print helper:
 * 1. Sets clean document.title for browser print PDF filename.
 * 2. Attempts window.print() inside try/catch (since sandboxed iframes can block it).
 * 3. Shows the in-app Print Assistant Modal so users have a clear visual control,
 *    can re-trigger print, view shortcuts (Ctrl+P), or open in a clean tab if iframe restricts modals.
 */
export function triggerPrint(docTitle?: string) {
  const store = useLpjStore.getState();
  const title =
    docTitle ||
    (store.activeTab === 'bku'
      ? 'Buku Kas Umum (BKU)'
      : store.activeTab === 'bku-tunai'
      ? 'Buku Kas Tunai (BKU Tunai)'
      : store.activeTab === 'bk-bank'
      ? 'Buku Kas Bank (BK Bank)'
      : store.activeTab === 'kwitansi'
      ? 'Kwitansi Pengeluaran'
      : 'Laporan Pertanggungjawaban DAK Fisik');

  // Set document title temporarily for PDF naming
  const originalTitle = document.title;
  const cleanSchool = store.profile.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_');
  document.title = `${cleanSchool}_${title.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Notify user immediately
  store.showToast({
    type: 'info',
    title: 'Mempersiapkan Cetak Dokumen',
    message: `Menyiapkan format cetak untuk ${title}.`,
  });

  // Open the Print Assistant Modal so user always has interactive visual controls
  store.openPrintModal(title);

  // Attempt native browser print
  setTimeout(() => {
    try {
      window.print();
    } catch (err) {
      console.warn('Browser print dialog was restricted by iframe environment:', err);
      store.showToast({
        type: 'warning',
        title: 'Dialog Cetak Perlu Konfirmasi',
        message:
          'Jika preview browser memblokir jendela cetak otomatis, gunakan tombol Cetak di panel atau tekan Ctrl+P.',
      });
    } finally {
      // Revert title after print dialog closes
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    }
  }, 100);
}
