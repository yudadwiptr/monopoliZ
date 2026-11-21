#!/usr/bin/env node
// MonopoliZ brand + SEO asset generator.
//
//   cd scripts/brand && npm install      (once; tooling lives only in this folder)
//   node scripts/brand/generate.mjs      (from the project root, or `npm run generate` here)
//
// Options:
//   --preview <dir>   also write large PNG previews of the SVG logos into <dir>
//   --seo-only        only rewrite robots.txt / sitemap.xml / site.webmanifest (no native deps needed)
//
// Outputs (all under /public): brand/logo-white.svg, brand/logo-blue.svg, favicon.svg, favicon.ico,
// favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png,
// og-image.png, site.webmanifest, robots.txt, sitemap.xml — and the path block inside
// src/ui/common/Logo.tsx (between the `<brand-paths>` markers).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PUBLIC = join(ROOT, 'public');
const LOGO_TSX = join(ROOT, 'src/ui/common/Logo.tsx');

const BRAND = '#3A8CD6';
const INK = '#0B1026';

const args = process.argv.slice(2);
const previewDir = args.includes('--preview') ? resolve(args[args.indexOf('--preview') + 1]) : null;
const seoOnly = args.includes('--seo-only');

function write(rel, data) {
  const file = join(PUBLIC, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log('  ✓ public/' + rel.replace(/\\/g, '/'));
}

/** VITE_SITE_URL from the root .env files (same precedence idea as Vite: .env.production wins). */
function siteUrl() {
  let url = process.env.VITE_SITE_URL ?? '';
  if (!url) {
    for (const name of ['.env.production.local', '.env.production', '.env.local', '.env']) {
      const file = join(ROOT, name);
      if (!existsSync(file)) continue;
      const m = readFileSync(file, 'utf8').match(/^\s*VITE_SITE_URL\s*=\s*["']?([^"'\r\n#]+)/m);
      if (m) {
        url = m[1].trim();
        break;
      }
    }
  }
  if (!url) throw new Error('VITE_SITE_URL is not set (add it to the root .env)');
  return url.replace(/\/+$/, '');
}

function writeSeoFiles() {
  const url = siteUrl();
  const today = new Date().toISOString().slice(0, 10);
  write('robots.txt', `# MonopoliZ — semua crawler dipersilakan main\nUser-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`);
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
  );
  const manifest = {
    id: './',
    name: 'MonopoliZ',
    short_name: 'MonopoliZ',
    description: 'Monopoli Nusantara zaman now — beli kota, bangun landmark, kuasai Indonesia! Main gratis di browser.',
    lang: 'id',
    dir: 'ltr',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    orientation: 'any',
    background_color: INK,
    theme_color: BRAND,
    categories: ['games', 'entertainment'],
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
  write('site.webmanifest', JSON.stringify(manifest, null, 2) + '\n');
}

writeSeoFiles();
if (seoOnly) process.exit(0);

// ---------------------------------------------------------------- graphics
const { Resvg } = await import('@resvg/resvg-js');
const { default: pngToIco } = await import('png-to-ico');
const { fonts } = await import('./lib/fonts.mjs');
const { buildLogo, buildMark, normalise } = await import('./lib/logo.mjs');
const { toD, transform, bbox } = await import('./lib/geom.mjs');
const { ogImageSvg } = await import('./lib/og.mjs');

const anton = fonts.anton();
const logo = normalise(buildLogo(anton), 2);

const png = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, shapeRendering: 2, background: 'rgba(0,0,0,0)' })
    .render()
    .asPng();

/** Logo parts as <path> elements (separate elements: overlapping parts must not cancel out). */
function logoPaths(precision = 2) {
  const letters = [...logo.letters.map((l) => l.path), logo.z].map((p) => toD(p, precision)).join('');
  return [letters, toD(logo.swoosh, precision), toD(logo.hook, precision), toD(logo.house, precision), toD(logo.die, precision)]
    .map((d) => `<path d="${d}"/>`)
    .join('');
}
const W = +logo.w.toFixed(2);
const H = +logo.h.toFixed(2);

// ---- logo-white.svg (transparent, tight)
const logoWhite = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${Math.round(W * 2)}" height="${Math.round(H * 2)}" role="img" aria-label="MonopoliZ"><title>MonopoliZ</title><g fill="#fff">${logoPaths()}</g></svg>\n`;
write('brand/logo-white.svg', logoWhite);

// ---- logo-blue.svg (square, brand blue, centred like the client's artwork)
const SQ = 1000;
const lk = (SQ * 0.82) / W;
const logoBlue = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SQ} ${SQ}" width="${SQ}" height="${SQ}" role="img" aria-label="MonopoliZ"><title>MonopoliZ</title><rect width="${SQ}" height="${SQ}" fill="${BRAND}"/><g transform="translate(${((SQ - W * lk) / 2).toFixed(2)} ${((SQ - H * lk) / 2).toFixed(2)}) scale(${lk.toFixed(5)})" fill="#fff">${logoPaths()}</g></svg>\n`;
write('brand/logo-blue.svg', logoBlue);

// ---- icon marks
/**
 * @param size   canvas size
 * @param bg     'rounded' (transparent corners) | 'full' (opaque square)
 * @param box    fraction of the canvas the mark may occupy
 */
function markSvg({ size, bg, box, simple = false, die = true, radius = 0.22 }) {
  const { parts, bbox: bb } = buildMark(anton, { simple, die });
  const k = (size * box) / Math.max(bb.w, bb.h);
  const tx = (size - bb.w * k) / 2 - bb.x * k;
  const ty = (size - bb.h * k) / 2 - bb.y * k;
  const m = [k, 0, 0, k, tx, ty];
  const prec = size <= 64 ? 2 : 1;
  const paths = Object.values(parts)
    .map((p) => `<path d="${toD(transform(p, m), prec)}"/>`)
    .join('');
  const rect =
    bg === 'full'
      ? `<rect width="${size}" height="${size}" fill="url(#b)"/>`
      : `<rect width="${size}" height="${size}" rx="${+(size * radius).toFixed(2)}" fill="url(#b)"/>`;
  const grad = simple
    ? `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BRAND}"/><stop offset="1" stop-color="${BRAND}"/></linearGradient>`
    : `<linearGradient id="b" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#4A9DE6"/><stop offset="1" stop-color="#2F7CC4"/></linearGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><defs>${grad}</defs>${rect}<g fill="#fff">${paths}</g></svg>\n`;
}

const favicon = markSvg({ size: 64, bg: 'rounded', box: 0.84, simple: true, die: false, radius: 0.22 });
write('favicon.svg', favicon);

const fav = (s) => png(favicon, s);
write('favicon-32.png', fav(32));
const icoPngs = [16, 32, 48].map((s) => fav(s));
write('favicon.ico', await pngToIco(icoPngs));

const appIcon = markSvg({ size: 512, bg: 'rounded', box: 0.7 });
write('icon-192.png', png(appIcon, 192));
write('icon-512.png', png(appIcon, 512));
write('icon-maskable-512.png', png(markSvg({ size: 512, bg: 'full', box: 0.56 }), 512));
// iOS rounds the corners itself and ignores transparency → opaque, full-bleed square.
write('apple-touch-icon.png', png(markSvg({ size: 180, bg: 'full', box: 0.68 }), 180));

// ---- Open Graph card
const original = join(PUBLIC, 'brand/logo-original.png');
const og = ogImageSvg(logo, { fredoka700: fonts.fredoka(700), fredoka600: fonts.fredoka(600), jakarta600: fonts.jakarta(600) }, logoPaths());
if (existsSync(original)) console.log('  i public/brand/logo-original.png found — OG card still uses the vector recreation (crisper).');
write('og-image.png', new Resvg(og, { fitTo: { mode: 'width', value: 1200 }, background: BRAND }).render().asPng());

// ---------------------------------------------------------------- Logo.tsx path block
{
  const p = (path) => toD(path, 1);
  const block = `// <brand-paths> — generated by scripts/brand/generate.mjs; edit the generator, not these lines.
const VIEW_W = ${+W.toFixed(1)};
const VIEW_H = ${+H.toFixed(1)};
/** M O N O P O L I Z (the Z is the big one) */
const LETTERS = [
${[...logo.letters.map((l) => l.path), logo.z].map((l) => `  '${p(l)}',`).join('\n')}
] as const;
const SWOOSH = '${p(logo.swoosh)}';
const HOOK = '${p(logo.hook)}';
const HOUSE = '${p(logo.house)}';
const DIE = '${p(logo.die)}';
/** centrelines used as stroke masks for the draw-on animation */
const SWOOSH_LINE = '${p(logo.centrelines.swoosh)}';
const HOOK_LINE = '${p(logo.centrelines.hook)}';
const DIE_BOX = ${JSON.stringify(roundBox(bbox([logo.die])))};
// </brand-paths>`;
  if (existsSync(LOGO_TSX)) {
    const src = readFileSync(LOGO_TSX, 'utf8');
    const re = /\/\/ <brand-paths>[\s\S]*?\/\/ <\/brand-paths>/;
    if (re.test(src)) {
      writeFileSync(LOGO_TSX, src.replace(re, block));
      console.log('  ✓ src/ui/common/Logo.tsx (path block)');
    } else {
      console.warn('  ! Logo.tsx has no <brand-paths> markers — skipped');
    }
  }
}

function roundBox(b) {
  return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.w.toFixed(1), h: +b.h.toFixed(1) };
}

// ---------------------------------------------------------------- previews
if (previewDir) {
  mkdirSync(previewDir, { recursive: true });
  const onBlue = logoWhite.replace('<g fill="#fff">', `<rect width="100%" height="100%" fill="${BRAND}"/><g fill="#fff">`);
  const onInk = logoWhite.replace('<g fill="#fff">', `<rect width="100%" height="100%" fill="${INK}"/><g fill="#fff">`);
  writeFileSync(join(previewDir, 'logo-on-blue.png'), png(onBlue, 1600));
  writeFileSync(join(previewDir, 'logo-on-ink-small.png'), png(onInk, 220));
  writeFileSync(join(previewDir, 'logo-blue.png'), png(logoBlue, 800));
  writeFileSync(join(previewDir, 'favicon-big.png'), png(favicon, 256));
  writeFileSync(join(previewDir, 'app-icon.png'), png(appIcon, 512));
  console.log('  ✓ previews → ' + previewDir);
}

console.log('Done.');
