import { Transaction, PajakRowItem } from '../types';
import { BkuTunaiRow, BkBankRow } from './calculations';
import { ComputedPajakRow } from './pajakUtils';

/**
 * Normalisasi string query untuk pencarian case-insensitive & trim
 */
function cleanQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Helper untuk memeriksa apakah suatu nilai cocok dengan query
 */
function textMatches(val: string | number | undefined | null, q: string): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).toLowerCase();
  if (str.includes(q)) return true;

  // Jika nilai berupa angka atau berisi angka, bandingkan juga dengan format angka tanpa titik/koma
  if (typeof val === 'number') {
    const rawNumber = String(val);
    const formattedId = val.toLocaleString('id-ID');
    if (rawNumber.includes(q) || formattedId.includes(q)) return true;
  }
  return false;
}

/**
 * Memeriksa apakah suatu transaksi cocok dengan kata kunci pencarian
 */
export function matchesTransaction(tx: Transaction | undefined | null, query: string): boolean {
  if (!tx) return false;
  if (!query || !query.trim()) return true;

  const q = cleanQuery(query);

  if (textMatches(tx.uraian, q)) return true;
  if (textMatches(tx.nomorBukti, q)) return true;
  if (textMatches(tx.tanggal, q)) return true;
  if (textMatches(tx.jenisBiaya, q)) return true;
  if (textMatches(tx.metode, q)) return true;
  if (textMatches(tx.jenis, q)) return true;
  if (textMatches(tx.penerimaan, q)) return true;
  if (textMatches(tx.pengeluaran, q)) return true;

  // Cek ke dalam sub-items (rincian nota belanja)
  if (Array.isArray(tx.subItems)) {
    for (const sub of tx.subItems) {
      if (textMatches(sub.nama, q)) return true;
      if (textMatches(sub.satuan, q)) return true;
      if (textMatches(sub.volume, q)) return true;
      if (textMatches(sub.hargaSatuan, q)) return true;
      if (textMatches(sub.subtotal, q)) return true;
    }
  }

  return false;
}

/**
 * Memeriksa apakah baris BKU Tunai cocok dengan kata kunci pencarian
 */
export function matchesBkuTunaiRow(row: BkuTunaiRow, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (row.isInitialRow) return false; // Saldo awal dicocokkan terpisah jika diperlukan

  const q = cleanQuery(query);
  if (textMatches(row.uraian, q)) return true;
  if (textMatches(row.nomorBukti, q)) return true;
  if (textMatches(row.tanggal, q)) return true;
  if (textMatches(row.penerimaan, q)) return true;
  if (textMatches(row.pengeluaran, q)) return true;
  if (textMatches(row.saldo, q)) return true;

  return matchesTransaction(row.transaction, query);
}

/**
 * Memeriksa apakah baris BK Bank cocok dengan kata kunci pencarian
 */
export function matchesBkBankRow(row: BkBankRow, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (row.isInitialRow) return false;

  const q = cleanQuery(query);
  if (textMatches(row.uraian, q)) return true;
  if (textMatches(row.nomorBukti, q)) return true;
  if (textMatches(row.tanggal, q)) return true;
  if (textMatches(row.debet, q)) return true;
  if (textMatches(row.kredit, q)) return true;
  if (textMatches(row.saldo, q)) return true;

  return matchesTransaction(row.transaction, query);
}

/**
 * Memeriksa apakah baris BKU Pajak cocok dengan kata kunci pencarian
 */
export function matchesPajakRow(
  row: ComputedPajakRow | PajakRowItem,
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const q = cleanQuery(query);
  if (textMatches(row.uraian, q)) return true;
  if (textMatches(row.nomorBukti, q)) return true;
  if (textMatches(row.tanggal, q)) return true;
  if (textMatches(row.penerimaan, q)) return true;
  if (textMatches(row.pengeluaran, q)) return true;
  if (textMatches(row.jenisPajak, q)) return true;

  return false;
}
