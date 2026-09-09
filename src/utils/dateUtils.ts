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

export const HARI_LIST = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

/**
 * Format ISO date string (YYYY-MM-DD) or Date to "DD [Nama Bulan] YYYY"
 */
export function formatToIndonesianDate(input: string | Date): string {
  if (!input) return '';
  let dateObj: Date;

  if (typeof input === 'string') {
    // If it's already "16 Agustus 2026", return as is
    if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(input.trim())) {
      return input.trim();
    }
    dateObj = new Date(input);
  } else {
    dateObj = input;
  }

  if (isNaN(dateObj.getTime())) return String(input);

  const day = dateObj.getDate();
  const monthName = BULAN_LIST[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${day} ${monthName} ${year}`;
}

/**
 * Convert Indonesian date "16 Agustus 2026" to ISO "2026-08-16"
 */
export function indonesianDateToIso(str: string): string {
  if (!str) return '';
  const trimmed = str.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const monthName = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);

    const monthIndex = BULAN_LIST.findIndex(
      (m) => m.toLowerCase() === monthName
    );

    if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
      const padDay = day < 10 ? `0${day}` : `${day}`;
      const padMonth = monthIndex + 1 < 10 ? `0${monthIndex + 1}` : `${monthIndex + 1}`;
      return `${year}-${padMonth}-${padDay}`;
    }
  }

  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return '';
}

/**
 * Get closing date for month (e.g. "Senin, 31 Agustus 2026")
 */
export function getClosingDateForMonth(monthName: string, yearStr: string | number): string {
  const year = typeof yearStr === 'string' ? parseInt(yearStr, 10) || 2026 : yearStr;
  const monthIdx = BULAN_LIST.findIndex(
    (m) => m.toLowerCase() === monthName.trim().toLowerCase()
  );

  if (monthIdx === -1) {
    return `Akhir Bulan ${monthName} ${year}`;
  }

  // Day 0 of next month is the last day of this month
  const lastDayObj = new Date(year, monthIdx + 1, 0);
  const dayName = HARI_LIST[lastDayObj.getDay()];
  const lastDate = lastDayObj.getDate();

  return `${dayName}, ${lastDate} ${BULAN_LIST[monthIdx]} ${year}`;
}

/**
 * Extract Month and Year from a date string (handles "16 Agustus 2026", "2026-08-16", etc.)
 */
export function extractMonthAndYear(tanggal: string): { month: string; year: number } | null {
  if (!tanggal) return null;
  const trimmed = tanggal.trim();

  // Try "DD [Bulan] YYYY"
  for (const m of BULAN_LIST) {
    if (new RegExp(`\\b${m}\\b`, 'i').test(trimmed)) {
      const yearMatch = trimmed.match(/\b(20\d{2})\b/);
      return {
        month: m,
        year: yearMatch ? parseInt(yearMatch[1], 10) : 2026,
      };
    }
  }

  // Try ISO date YYYY-MM-DD
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
