import { Transaction } from '../types';
import { indonesianDateToIso } from './dateUtils';
import { sortTransactionsChronologically } from './calculations';
import { ParsedBku, parseBkuNumber, formatBkuNumber } from './bkuParser';

export type { ParsedBku };
export { parseBkuNumber, formatBkuNumber };

/**
 * Suggest optimal BKU number based on transaction date.
 * Perfect for cases where user missed a transaction in August after already recording September!
 */
export function suggestBkuForDate(
  transactions: Transaction[],
  dateStr: string,
  excludeTxId?: string
): {
  suggestedNo: string;
  suggestedNum: number;
  prefix: string;
  padLength: number;
  conflictsWithExisting: boolean;
  explanation: string;
} {
  const defaultPrefix = 'BKU ';
  const defaultPad = 2;

  const validTxs = transactions.filter((t) => t.id !== excludeTxId);
  const sorted = sortTransactionsChronologically(validTxs);
  const targetIso = indonesianDateToIso(dateStr) || '9999-99-99';

  // Find transactions before or on target date that have a BKU number
  const txsBeforeOrOn = sorted.filter((t) => {
    const iso = indonesianDateToIso(t.tanggal) || '9999-99-99';
    return iso <= targetIso && Boolean(parseBkuNumber(t.nomorBukti || ''));
  });

  let maxNumBefore = 0;
  let detectedPrefix = defaultPrefix;
  let detectedPad = defaultPad;

  if (txsBeforeOrOn.length > 0) {
    txsBeforeOrOn.forEach((t) => {
      const parsed = parseBkuNumber(t.nomorBukti || '');
      if (parsed) {
        if (parsed.num > maxNumBefore) {
          maxNumBefore = parsed.num;
          if (parsed.prefix) detectedPrefix = parsed.prefix;
          if (parsed.padLength > 0) detectedPad = parsed.padLength;
        }
      }
    });
  }

  const suggestedNum = maxNumBefore + 1;
  const suggestedNo = formatBkuNumber(suggestedNum, detectedPrefix, detectedPad);

  // Check if this number is already used by an existing transaction (e.g. in September or later in August)
  const existingWithSameOrHigher = validTxs.filter((t) => {
    const parsed = parseBkuNumber(t.nomorBukti || '');
    return parsed && parsed.num >= suggestedNum;
  });

  const conflictsWithExisting = existingWithSameOrHigher.some((t) => {
    const parsed = parseBkuNumber(t.nomorBukti || '');
    return parsed && parsed.num === suggestedNum;
  });

  let explanation = '';
  if (conflictsWithExisting) {
    explanation = `Nomor ${suggestedNo} sesuai urutan tanggal, namun sudah dipakai oleh transaksi lain. Fitur Auto-Geser akan memajukan (+1) nomor transaksi tersebut dan nomor-nomor setelahnya (termasuk bulan berikutnya).`;
  } else if (maxNumBefore > 0) {
    explanation = `Melanjutkan urutan kuitansi sebelumnya (${detectedPrefix}${String(maxNumBefore).padStart(detectedPad, '0')}).`;
  } else {
    explanation = `Merupakan kuitansi paling awal dalam pembukuan (BKU 01).`;
  }

  return {
    suggestedNo,
    suggestedNum,
    prefix: detectedPrefix,
    padLength: detectedPad,
    conflictsWithExisting,
    explanation,
  };
}

export interface ShiftPreviewItem {
  id: string;
  tanggal: string;
  uraian: string;
  nomorLama: string;
  nomorBaru: string;
  isTarget: boolean;
  delta: number;
}

/**
 * Calculates what will change if target transaction is set to newNomorBukti with auto-shift
 */
export function calculateBkuShiftPreview(
  transactions: Transaction[],
  targetTxId: string,
  newNomorBuktiInput: string,
  shiftSubsequent: boolean = true
): {
  targetTx: Transaction | undefined;
  formattedTargetNo: string;
  targetNum: number;
  previewList: ShiftPreviewItem[];
  shiftedCount: number;
  hasCollisionWithoutShift: boolean;
} {
  const targetTx = transactions.find((t) => t.id === targetTxId);
  const parsedInput = parseBkuNumber(newNomorBuktiInput);

  if (!parsedInput) {
    return {
      targetTx,
      formattedTargetNo: newNomorBuktiInput.trim(),
      targetNum: 0,
      previewList: [],
      shiftedCount: 0,
      hasCollisionWithoutShift: false,
    };
  }

  const prefix = parsedInput.prefix || 'BKU ';
  const padLength = Math.max(parsedInput.padLength, 2);
  const suffix = parsedInput.suffix || '';
  const targetNum = parsedInput.num;
  const formattedTargetNo = formatBkuNumber(targetNum, prefix, padLength, suffix);

  const previewList: ShiftPreviewItem[] = [];
  const otherTxs = transactions.filter((t) => t.id !== targetTxId);

  // Check collision if shiftSubsequent is false
  const hasCollisionWithoutShift = otherTxs.some((t) => {
    const p = parseBkuNumber(t.nomorBukti || '');
    return p && p.num === targetNum;
  });

  // Target item
  if (targetTx) {
    previewList.push({
      id: targetTx.id,
      tanggal: targetTx.tanggal,
      uraian: targetTx.uraian,
      nomorLama: targetTx.nomorBukti || '(Belum ada nomor)',
      nomorBaru: formattedTargetNo,
      isTarget: true,
      delta: 0,
    });
  }

  let shiftedCount = 0;

  if (shiftSubsequent) {
    // Sort others chronologically or by BKU number
    const sortedOthers = sortTransactionsChronologically(otherTxs);

    sortedOthers.forEach((t) => {
      const p = parseBkuNumber(t.nomorBukti || '');
      if (p && p.num >= targetNum) {
        const nextNum = p.num + 1;
        const newNo = formatBkuNumber(nextNum, p.prefix || prefix, Math.max(p.padLength, padLength), p.suffix);
        shiftedCount++;
        previewList.push({
          id: t.id,
          tanggal: t.tanggal,
          uraian: t.uraian,
          nomorLama: t.nomorBukti || '(Kosong)',
          nomorBaru: newNo,
          isTarget: false,
          delta: 1,
        });
      }
    });
  }

  return {
    targetTx,
    formattedTargetNo,
    targetNum,
    previewList,
    shiftedCount,
    hasCollisionWithoutShift,
  };
}

/**
 * Determines an appropriate date for a transaction given its target BKU number,
 * by looking at the transactions immediately before and after it in the BKU sequence.
 */
export function getHarmonizedDateForBku(
  transactions: Transaction[],
  targetBkuNum: number,
  fallbackDate: string
): string {
  // Filter other transactions with BKU
  const bkuTxs = transactions
    .map((t) => ({ tx: t, parsed: parseBkuNumber(t.nomorBukti || '') }))
    .filter((item): item is { tx: Transaction; parsed: ParsedBku } => Boolean(item.parsed));

  // Find preceding transaction (highest num < targetBkuNum)
  const preceding = bkuTxs
    .filter((item) => item.parsed.num < targetBkuNum)
    .sort((a, b) => b.parsed.num - a.parsed.num)[0];

  // Find succeeding transaction (lowest num > targetBkuNum)
  const succeeding = bkuTxs
    .filter((item) => item.parsed.num > targetBkuNum)
    .sort((a, b) => a.parsed.num - b.parsed.num)[0];

  const isoCurrent = indonesianDateToIso(fallbackDate);

  if (preceding && succeeding) {
    const isoPrec = indonesianDateToIso(preceding.tx.tanggal);
    const isoSucc = indonesianDateToIso(succeeding.tx.tanggal);

    // If current date already falls comfortably within [isoPrec, isoSucc], keep it!
    if (isoCurrent && isoPrec && isoSucc && isoCurrent >= isoPrec && isoCurrent <= isoSucc) {
      return fallbackDate;
    }
    // Otherwise harmonize: use preceding date (or succeeding if preceding not available)
    return preceding.tx.tanggal;
  } else if (preceding) {
    const isoPrec = indonesianDateToIso(preceding.tx.tanggal);
    if (isoCurrent && isoPrec && isoCurrent >= isoPrec) {
      return fallbackDate;
    }
    return preceding.tx.tanggal;
  } else if (succeeding) {
    const isoSucc = indonesianDateToIso(succeeding.tx.tanggal);
    if (isoCurrent && isoSucc && isoCurrent <= isoSucc) {
      return fallbackDate;
    }
    return succeeding.tx.tanggal;
  }

  return fallbackDate;
}

