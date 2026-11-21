/** Tiny colour helpers for procedural art (hex in, hex/rgba out). */

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix toward white (amt > 0) or black (amt < 0). `amt` in -1..1. */
export function shade(hex: string, amt: number): string {
  const target = amt >= 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amt));
  return `#${toRgb(hex)
    .map((c) => Math.round(c + (target - c) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
