export interface ParsedBku {
  prefix: string;
  num: number;
  suffix: string;
  padLength: number;
}

/**
 * Parses a BKU or receipt number into prefix, integer, suffix, and pad length.
 * Examples:
 * - "BKU 05" -> { prefix: "BKU ", num: 5, suffix: "", padLength: 2 }
 * - "BKU 5"  -> { prefix: "BKU ", num: 5, suffix: "", padLength: 1 }
 * - "05"     -> { prefix: "", num: 5, suffix: "", padLength: 2 }
 * - "05/BKU/2026" -> { prefix: "", num: 5, suffix: "/BKU/2026", padLength: 2 }
 */
export function parseBkuNumber(nomorBukti: string): ParsedBku | null {
  if (!nomorBukti || typeof nomorBukti !== 'string') return null;
  const trimmed = nomorBukti.trim();
  if (!trimmed) return null;

  // Regex to extract prefix, digits, suffix
  const match = trimmed.match(/^(.*?)(\d+)(.*)$/);
  if (!match) return null;

  const prefix = match[1];
  const numStr = match[2];
  const suffix = match[3];
  const num = parseInt(numStr, 10);

  if (isNaN(num)) return null;

  return {
    prefix,
    num,
    suffix,
    padLength: numStr.length,
  };
}

/**
 * Format BKU number with prefix and padding
 */
export function formatBkuNumber(
  num: number,
  prefix: string = 'BKU ',
  padLength: number = 2,
  suffix: string = ''
): string {
  const pad = Math.max(padLength, 2);
  const numStr = String(num).padStart(pad, '0');
  return `${prefix}${numStr}${suffix}`;
}
