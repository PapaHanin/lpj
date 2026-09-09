/**
 * Konversi angka rupiah ke huruf terbilang bahasa Indonesia standar
 * Mendukung hingga triliunan tanpa error #NAME?
 * Contoh: 8.001.000 -> "Delapan Juta Satu Ribu Rupiah"
 */

const BILANGAN = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

export function angkaKeKata(nilai: number, isSubthousandAfterMillion: boolean = false): string {
  const n = Math.floor(Math.abs(nilai));

  if (n < 12) {
    return BILANGAN[n];
  }
  if (n < 20) {
    return `${BILANGAN[n - 10]} Belas`;
  }
  if (n < 100) {
    const sisa = n % 10;
    return `${BILANGAN[Math.floor(n / 10)]} Puluh ${sisa > 0 ? BILANGAN[sisa] : ''}`.trim();
  }
  if (n < 200) {
    const sisa = n - 100;
    return `Seratus ${sisa > 0 ? angkaKeKata(sisa, isSubthousandAfterMillion) : ''}`.trim();
  }
  if (n < 1000) {
    const sisa = n % 100;
    return `${BILANGAN[Math.floor(n / 100)]} Ratus ${sisa > 0 ? angkaKeKata(sisa, isSubthousandAfterMillion) : ''}`.trim();
  }
  if (n < 2000) {
    const sisa = n - 1000;
    // Jika berdiri sendiri contoh 1.000 -> "Seribu", tapi jika setelah jutaan contoh 8.001.000 -> "Satu Ribu"
    const prefix = isSubthousandAfterMillion ? 'Satu Ribu' : 'Seribu';
    return `${prefix} ${sisa > 0 ? angkaKeKata(sisa, false) : ''}`.trim();
  }
  if (n < 1000000) {
    const ribuan = Math.floor(n / 1000);
    const sisa = n % 1000;
    return `${angkaKeKata(ribuan, false)} Ribu ${sisa > 0 ? angkaKeKata(sisa, false) : ''}`.trim();
  }
  if (n < 1000000000) {
    const jutaan = Math.floor(n / 1000000);
    const sisa = n % 1000000;
    // Tandai jika sisa ribuan berada di kisaran 1000 - 1999 setelah jutaan agar menghasilkan "Satu Ribu"
    const sisaText = sisa > 0 ? angkaKeKata(sisa, sisa >= 1000 && sisa < 2000) : '';
    return `${angkaKeKata(jutaan, false)} Juta ${sisaText}`.trim();
  }
  if (n < 1000000000000) {
    const milyaran = Math.floor(n / 1000000000);
    const sisa = n % 1000000000;
    return `${angkaKeKata(milyaran, false)} Milyar ${sisa > 0 ? angkaKeKata(sisa, false) : ''}`.trim();
  }
  if (n < 1000000000000000) {
    const triliunan = Math.floor(n / 1000000000000);
    const sisa = n % 1000000000000;
    return `${angkaKeKata(triliunan, false)} Triliun ${sisa > 0 ? angkaKeKata(sisa, false) : ''}`.trim();
  }

  return n.toString();
}

export function terbilangRupiah(nominal: number): string {
  if (!nominal || isNaN(nominal) || nominal === 0) {
    return 'Nol Rupiah';
  }
  const hasil = angkaKeKata(nominal);
  // Pastikan spasi ganda dibersihkan
  const cleaned = hasil.replace(/\s+/g, ' ').trim();
  return `${cleaned} Rupiah`;
}

export function formatRupiah(nominal: number, denganRp = true): string {
  if (nominal === undefined || nominal === null || isNaN(nominal)) {
    return denganRp ? 'Rp 0,00' : '0,00';
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(nominal);

  return denganRp ? `Rp ${formatted}` : formatted;
}

export function formatRupiahBulat(nominal: number, denganRp = true): string {
  if (nominal === undefined || nominal === null || isNaN(nominal)) {
    return denganRp ? 'Rp 0' : '0';
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(nominal);

  return denganRp ? `Rp ${formatted}` : formatted;
}
