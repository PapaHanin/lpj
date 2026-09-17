import { useLpjStore } from '../store/lpjStore';

/**
 * Robust print helper:
 * 1. Focuses active window.
 * 2. Sets clean document.title for browser print PDF filename.
 * 3. Immediately triggers window.print() cleanly without popping up blocking modals.
 * 4. Falls back to Print Assistant Modal only if the browser/iframe restricts native printing.
 */
export function triggerPrint(docTitle?: string, showModalFallbackOnError: boolean = true) {
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
      : store.activeTab === 'daftar-barang'
      ? store.activeSubTabDaftarBarang === 'bahan'
        ? 'Daftar Bahan Material Belanja'
        : 'Absen Harian Tukang'
      : 'Laporan Pertanggungjawaban DAK Fisik');

  // Set document title temporarily for PDF naming
  const originalTitle = document.title;
  const cleanSchool = (store.profile.namaSekolah || 'LPJ_DAK').replace(/[^a-zA-Z0-9]/g, '_');
  document.title = `${cleanSchool}_${title.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Focus window before print
  try {
    window.focus();
  } catch {
    // ignore
  }

  // Attempt direct native browser print
  try {
    window.print();
  } catch (err) {
    console.warn('Browser print dialog blocked or failed:', err);
    if (showModalFallbackOnError) {
      store.openPrintModal(title);
      store.showToast({
        type: 'warning',
        title: 'Dialog Cetak Terbatas',
        message:
          'Preview browser membatasi jendela cetak otomatis. Gunakan shortcut Ctrl+P atau buka di tab baru.',
      });
    }
  } finally {
    // Revert title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 3000);
  }
}
