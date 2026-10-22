export const BULAN_LIST = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const EN_MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, januari: 0,
  feb: 1, february: 1, februari: 1,
  mar: 2, march: 2, maret: 2,
  apr: 3, april: 3,
  may: 4, mei: 4,
  jun: 5, june: 5, juni: 5,
  jul: 6, july: 6, juli: 6,
  aug: 7, august: 7, agustus: 7, agt: 7, agu: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, oktober: 9, okt: 9,
  nov: 10, november: 10, nopember: 10,
  dec: 11, december: 11, desember: 11, des: 11,
};

export const HARI_LIST = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Convert any date representation ("11 Agustus 2026", "Senin, 31 Agustus 2026",
 * "2026-08-11", "1-Aug-2025", "11/08/2026", or Date) into "DD/MM/YYYY" (e.g. "11/08/2026").
 * Also converts ranges like "19 Agustus s.d 2 September 2026" -> "19/08/2026 s.d 02/09/2026".
 */
export function formatToSlashDate(input: string | Date): string {
  if (!input) return '';

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '';
    return `${pad2(input.getDate())}/${pad2(input.getMonth() + 1)}/${input.getFullYear()}`;
  }

  const raw = String(input).trim();
  if (!raw) return '';

  // Handle date range with "s.d" or "s/d"
  if (/\bs\.?d\.?\b|\bs\/d\b/i.test(raw)) {
    const yearMatch = raw.match(/\b(20\d{2})\b/);
    const fallbackYear = yearMatch ? yearMatch[1] : '2026';
    const parts = raw.split(/\s+(?:s\.?d\.?|s\/d)\s+/i);
    if (parts.length === 2) {
      let left = parts[0].trim();
      const right = parts[1].trim();
      // If left doesn't have year, append year or month+year from right
      if (!/\b20\d{2}\b/.test(left)) {
        const rightMonthYear = extractMonthAndYear(right);
        const leftHasMonth = Object.keys(EN_MONTH_MAP).some((m) =>
          new RegExp(`\\b${m}\\b`, 'i').test(left)
        );
        if (leftHasMonth) {
          left = `${left} ${rightMonthYear?.year || fallbackYear}`;
        } else if (rightMonthYear) {
          left = `${left} ${rightMonthYear.month} ${rightMonthYear.year}`;
        }
      }
      return `${formatToSlashDate(left)} s.d ${formatToSlashDate(right)}`;
    }
  }

  // Strip optional day name prefix like "Senin, " or "Sabtu, "
  const cleaned = raw.replace(/^[A-Za-z]+,\s*/, '').trim();

  // 1. Already DD/MM/YYYY or D/M/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10);
    const y = parseInt(slashMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${pad2(d)}/${pad2(m)}/${y}`;
    }
  }

  // 2. ISO YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${pad2(d)}/${pad2(m)}/${y}`;
    }
  }

  // 3. "11 Agustus 2026" or "1-Aug-2025" or "11 Agustus"
  const textMatch = cleaned.match(/^(\d{1,2})[\s\-\/]+([A-Za-z]+)[\s\-\/]+(\d{4})$/);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const mName = textMatch[2].toLowerCase();
    const y = parseInt(textMatch[3], 10);
    const mIdx = EN_MONTH_MAP[mName];
    if (!isNaN(d) && mIdx !== undefined && !isNaN(y)) {
      return `${pad2(d)}/${pad2(mIdx + 1)}/${y}`;
    }
  }

  // 4. Fallback Date constructor
  const dateObj = new Date(cleaned);
  if (!isNaN(dateObj.getTime())) {
    return `${pad2(dateObj.getDate())}/${pad2(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;
  }

  return raw;
}

/**
 * Format ISO date string (YYYY-MM-DD) or Date or Indonesian date to "DD/MM/YYYY" (e.g. "11/08/2026")
 */
export function formatToIndonesianDate(input: string | Date): string {
  return formatToSlashDate(input);
}

/**
 * Convert date string ("11/08/2026", "16 Agustus 2026", or "2026-08-16") to ISO "2026-08-16"
 */
export function indonesianDateToIso(str: string): string {
  if (!str) return '';
  const cleaned = str.trim().replace(/^[A-Za-z]+,\s*/, '').trim();

  // 1. DD/MM/YYYY or D/M/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  // 2. Already YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return cleaned;
  }

  // 3. "16 Agustus 2026" or "1-Aug-2025"
  const parts = cleaned.split(/[\s\-]+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const monthName = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    const monthIndex = EN_MONTH_MAP[monthName];

    if (!isNaN(day) && monthIndex !== undefined && !isNaN(year)) {
      return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
    }
  }

  return '';
}

/**
 * Get closing date for month in DD/MM/YYYY format (e.g. "31/08/2026")
 */
export function getClosingDateForMonth(monthName: string, yearStr: string | number): string {
  const year = typeof yearStr === 'string' ? parseInt(yearStr, 10) || 2026 : yearStr;
  const monthIdx = BULAN_LIST.findIndex(
    (m) => m.toLowerCase() === monthName.trim().toLowerCase()
  );

  if (monthIdx === -1) {
    return `31/08/${year}`;
  }

  // Day 0 of next month is the last day of this month
  const lastDayObj = new Date(year, monthIdx + 1, 0);
  const lastDate = lastDayObj.getDate();

  return `${pad2(lastDate)}/${pad2(monthIdx + 1)}/${year}`;
}

/**
 * Get first date for month in DD/MM/YYYY format (e.g. "01/08/2026")
 */
export function getFirstDateForMonth(monthName: string, yearStr: string | number): string {
  const year = typeof yearStr === 'string' ? parseInt(yearStr, 10) || 2026 : yearStr;
  const monthIdx = BULAN_LIST.findIndex(
    (m) => m.toLowerCase() === monthName.trim().toLowerCase()
  );
  const m = monthIdx >= 0 ? monthIdx + 1 : 8;
  return `01/${pad2(m)}/${year}`;
}

/**
 * Extract Month and Year from a date string (handles "11/08/2026", "16 Agustus 2026", "2026-08-16", etc.)
 */
export function extractMonthAndYear(tanggal: string): { month: string; year: number } | null {
  if (!tanggal) return null;
  const trimmed = tanggal.trim();

  // 1. Try DD/MM/YYYY or D/M/YYYY
  const slashMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})/);
  if (slashMatch) {
    const monthIdx = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return {
        month: BULAN_LIST[monthIdx],
        year,
      };
    }
  }

  // 2. Try "DD [Bulan] YYYY" or "[Bulan] YYYY"
  for (const m of BULAN_LIST) {
    if (new RegExp(`\\b${m}\\b`, 'i').test(trimmed)) {
      const yearMatch = trimmed.match(/\b(20\d{2})\b/);
      return {
        month: m,
        year: yearMatch ? parseInt(yearMatch[1], 10) : 2026,
      };
    }
  }

  // 3. Try English short month like "1-Aug-2025"
  const enMatch = trimmed.match(/(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-](20\d{2})/);
  if (enMatch) {
    const mIdx = EN_MONTH_MAP[enMatch[2].toLowerCase()];
    const year = parseInt(enMatch[3], 10);
    if (mIdx !== undefined) {
      return {
        month: BULAN_LIST[mIdx],
        year,
      };
    }
  }

  // 4. Try ISO date YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return {
        month: BULAN_LIST[monthIdx],
        year,
      };
    }
  }

  return null;
}
