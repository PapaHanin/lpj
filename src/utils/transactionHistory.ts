import { Transaction, SubItem } from '../types';

export interface HistoricalItem {
  nama: string;
  satuan: string;
  hargaSatuan: number;
  lastVolume?: number;
  count: number;
}

export interface HistoricalData {
  uniqueUraian: string[];
  uniquePenerima: string[];
  uniqueItemNames: string[];
  uniqueUnits: string[];
  itemsMap: Map<string, HistoricalItem>; // key: trimmed lowercase item name
  transactionsByUraian: Map<string, Transaction>; // key: trimmed lowercase uraian
}

/**
 * Extracts unique transactions, recipients, and items that have ACTUALLY been created
 * in the system. If a transaction or item hasn't been created yet, it will NOT be included.
 */
export function extractTransactionHistory(
  transactions: Transaction[],
  excludeTxId?: string
): HistoricalData {
  const uniqueUraianSet = new Set<string>();
  const uniquePenerimaSet = new Set<string>();
  const uniqueUnitsSet = new Set<string>();
  const itemsMap = new Map<string, HistoricalItem>();
  const transactionsByUraian = new Map<string, Transaction>();

  // Iterate in reverse (latest first) so the most recent transaction/price takes precedence
  const filtered = transactions.filter((t) => !excludeTxId || t.id !== excludeTxId);
  const reversed = [...filtered].reverse();

  for (const tx of reversed) {
    // 1. Uraian Transaksi
    if (tx.uraian && tx.uraian.trim()) {
      const uTrim = tx.uraian.trim();
      const uKey = uTrim.toLowerCase();
      uniqueUraianSet.add(uTrim);
      if (!transactionsByUraian.has(uKey)) {
        transactionsByUraian.set(uKey, tx);
      }
    }

    // 2. Penerima
    if (tx.penerima && tx.penerima.trim()) {
      uniquePenerimaSet.add(tx.penerima.trim());
    }

    // 3. Sub-Items (Belanja Barang / Upah)
    if (tx.subItems && Array.isArray(tx.subItems)) {
      for (const item of tx.subItems) {
        if (item.nama && item.nama.trim()) {
          const nameTrim = item.nama.trim();
          const nameKey = nameTrim.toLowerCase();

          const existing = itemsMap.get(nameKey);
          if (!existing) {
            itemsMap.set(nameKey, {
              nama: nameTrim,
              satuan: item.satuan ? item.satuan.trim() : '',
              hargaSatuan: item.hargaSatuan || 0,
              lastVolume: item.volume,
              count: 1,
            });
          } else {
            existing.count += 1;
            // If current existing has 0 price, adopt earlier if available
            if (existing.hargaSatuan === 0 && item.hargaSatuan > 0) {
              existing.hargaSatuan = item.hargaSatuan;
            }
            if (!existing.satuan && item.satuan) {
              existing.satuan = item.satuan.trim();
            }
          }
        }

        if (item.satuan && item.satuan.trim()) {
          uniqueUnitsSet.add(item.satuan.trim());
        }
      }
    }
  }

  return {
    uniqueUraian: Array.from(uniqueUraianSet),
    uniquePenerima: Array.from(uniquePenerimaSet),
    uniqueItemNames: Array.from(itemsMap.values()).map((it) => it.nama),
    uniqueUnits: Array.from(uniqueUnitsSet),
    itemsMap,
    transactionsByUraian,
  };
}
