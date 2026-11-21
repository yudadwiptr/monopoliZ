/**
 * Money formatting. Internal unit = juta rupiah (integer).
 *   formatRp(50)    → "Rp 50 jt"
 *   formatRp(1500)  → "Rp 1,5 M"
 *   formatRp(2000)  → "Rp 2 M"
 *   formatRp(-120)  → "-Rp 120 jt"
 */
export function formatRp(juta: number, opts: { sign?: boolean; short?: boolean } = {}): string {
  const neg = juta < 0;
  const abs = Math.abs(Math.round(juta));
  let body: string;
  if (abs >= 1000) {
    const m = abs / 1000;
    const digits = m >= 100 ? 0 : m >= 10 ? 1 : 2;
    body = `${trimZeros(m.toFixed(digits)).replace('.', ',')} M`;
  } else {
    body = `${abs} jt`;
  }
  const prefix = opts.short ? '' : 'Rp ';
  const sign = neg ? '-' : opts.sign ? '+' : '';
  return `${sign}${prefix}${body}`;
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** Full rupiah with thousands separators, e.g. 1500 → "Rp1.500.000.000". */
export function formatRpFull(juta: number): string {
  const rp = Math.round(juta) * 1_000_000;
  return `Rp${rp.toLocaleString('id-ID')}`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}`;
}
