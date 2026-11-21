// Open Graph / social share card (1200×630) composed as SVG, text converted to paths.
import { toD } from './geom.mjs';

const W = 1200;
const H = 630;

/** Simple white glyphs (24×24) drawn for the city chips. Original artwork. */
const ICONS = {
  // Monas — obelisk with the golden flame
  monas: `<path d="M12 1.3c1.7 1.7 2 3.2.1 4.8-1.9-1.6-1.6-3.1-.1-4.8Z"/><rect x="9.4" y="6.4" width="5.2" height="1.6" rx=".6"/><path d="M10.9 8.4h2.2l.8 9.6h-3.8Z"/><path d="M6.6 18.4h10.8l1.6 2.2H5Z"/><rect x="3.4" y="21" width="17.2" height="1.8" rx=".6"/>`,
  // Candi bentar — Balinese split gate
  gapura: `<path d="M3 22.6V18h1.1v-3.6h1.5V10.6h2V7.2h1.8V4h1.6v18.6Z"/><path d="M21 22.6V18h-1.1v-3.6h-1.5V10.6h-2V7.2h-1.8V4h-1.6v18.6Z"/>`,
  // Karst islands over waves
  pulau: `<path d="M3.2 15c0-5.4 2.5-8 5.3-8s5 2.6 5 8Z"/><path d="M12.6 15c0-3.4 1.8-5 4.1-5s4.1 1.6 4.1 5Z"/><path d="M2 18.6q2.5-2 5 0t5 0 5 0 5 0" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/><path d="M4.5 22q2.5-2 5 0t5 0 5 0" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>`,
  // Stupa on terraces
  stupa: `<path d="M11.2 1.8h1.6l.6 4.4h-2.8Z"/><path d="M5.6 15c0-5.2 2.9-8.2 6.4-8.2s6.4 3 6.4 8.2Z"/><rect x="4" y="15.9" width="16" height="2.5" rx=".7"/><rect x="2.4" y="19.4" width="19.2" height="2.8" rx=".7"/>`,
  // Pinisi boat
  kapal: `<path d="M11.4 2.6v12.2H4.6Z"/><path d="M12.8 4.6v10.2h6.4Z"/><path d="M2.4 16.2h19.2l-2.8 5.2H5.4Z"/>`,
};

const CHIPS = [
  { label: 'Jakarta', icon: 'monas' },
  { label: 'Bali', icon: 'gapura' },
  { label: 'Raja Ampat', icon: 'pulau' },
  { label: 'Borobudur', icon: 'stupa' },
  { label: 'Labuan Bajo', icon: 'kapal' },
];

function textPath(font, text, size, x, y, align = 'left') {
  const w = font.getAdvanceWidth(text, size);
  const ox = align === 'center' ? x - w / 2 : x;
  return { d: font.getPath(text, ox, y, size).toPathData(2), w };
}

/**
 * @param logo normalised logo (see logo.mjs#normalise)
 * @param f { fredoka700, fredoka600, jakarta600 } opentype fonts
 * @param logoPathsSvg the white logo paths markup in logo units
 */
export function ogImageSvg(logo, f, logoPathsSvg) {
  const logoW = 780;
  const k = logoW / logo.w;
  const lx = (W - logoW) / 2;
  const ly = 56;
  const logoBottom = ly + logo.h * k;

  const tagSize = 54;
  const tagY = logoBottom + 78;
  const tag = textPath(f.fredoka700, 'Monopoli Nusantara Zaman Now', tagSize, W / 2, tagY, 'center');

  // city chips
  const chipH = 50;
  const chipY = tagY + 34;
  const fs = 23;
  const padL = 14;
  const iconS = 24;
  const gapIcon = 9;
  const padR = 20;
  const gap = 14;
  const measured = CHIPS.map((c) => {
    const tw = f.fredoka600.getAdvanceWidth(c.label, fs);
    return { ...c, tw, w: padL + iconS + gapIcon + tw + padR };
  });
  const rowW = measured.reduce((a, c) => a + c.w, 0) + gap * (measured.length - 1);
  let cx = (W - rowW) / 2;
  const chips = measured
    .map((c) => {
      const x = cx;
      cx += c.w + gap;
      const t = textPath(f.fredoka600, c.label, fs, x + padL + iconS + gapIcon, chipY + chipH / 2 + fs * 0.36);
      return `<g>
  <rect x="${x}" y="${chipY}" width="${c.w.toFixed(1)}" height="${chipH}" rx="${chipH / 2}" fill="#0B1026" fill-opacity="0.22" stroke="#fff" stroke-opacity="0.38" stroke-width="1.6"/>
  <g transform="translate(${x + padL} ${chipY + (chipH - iconS) / 2})" fill="#fff">${ICONS[c.icon]}</g>
  <path d="${t.d}" fill="#fff"/>
</g>`;
    })
    .join('\n');

  const foot = textPath(
    f.jakarta600,
    '2–4 pemain  •  Lawan teman atau bot  •  Langsung main di browser',
    20,
    W / 2,
    chipY + chipH + 46,
    'center',
  );

  // "GRATIS" sticker (top-right)
  const st = { x: 1084, y: 112, r: 66 };
  const s1 = textPath(f.fredoka700, 'MAIN', 22, 0, -12, 'center');
  const s2 = textPath(f.fredoka700, 'GRATIS!', 30, 0, 20, 'center');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#55A8EE"/>
    <stop offset="0.45" stop-color="#3A8CD6"/>
    <stop offset="1" stop-color="#1C5290"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.38" r="0.55">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
    <stop offset="0.6" stop-color="#0B1026" stop-opacity="0"/>
    <stop offset="1" stop-color="#0B1026" stop-opacity="0.35"/>
  </radialGradient>
  <pattern id="kawung" width="80" height="80" patternUnits="userSpaceOnUse">
    <g fill="none" stroke="#fff" stroke-width="1.6">
      <ellipse cx="40" cy="20" rx="10" ry="17"/>
      <ellipse cx="40" cy="60" rx="10" ry="17"/>
      <ellipse cx="20" cy="40" rx="17" ry="10"/>
      <ellipse cx="60" cy="40" rx="17" ry="10"/>
      <circle cx="40" cy="40" r="3"/>
      <circle cx="0" cy="0" r="3"/><circle cx="80" cy="0" r="3"/><circle cx="0" cy="80" r="3"/><circle cx="80" cy="80" r="3"/>
    </g>
  </pattern>
  <radialGradient id="fadeG" cx="0.5" cy="0.42" r="0.62">
    <stop offset="0" stop-color="#fff" stop-opacity="0.25"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </radialGradient>
  <mask id="fade"><rect width="${W}" height="${H}" fill="url(#fadeG)"/></mask>
  <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0B1026" flood-opacity="0.35"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#kawung)" opacity="0.11" mask="url(#fade)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
<g filter="url(#shadow)">
  <g transform="translate(${lx} ${ly}) scale(${k.toFixed(5)})" fill="#fff">${logoPathsSvg}</g>
  <path d="${tag.d}" fill="#fff"/>
</g>
${chips}
<path d="${foot.d}" fill="#fff" fill-opacity="0.8"/>
<g transform="translate(${st.x} ${st.y}) rotate(12)">
  <circle r="${st.r + 5}" fill="#0B1026" fill-opacity="0.25" cy="5"/>
  <circle r="${st.r}" fill="#FFC21F"/>
  <circle r="${st.r - 7}" fill="none" stroke="#0B1026" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="4 5"/>
  <path d="${s1.d}" fill="#0B1026"/>
  <path d="${s2.d}" fill="#0B1026"/>
</g>
</svg>`;
}
