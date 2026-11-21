import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);

function load(pkgFile) {
  const buf = readFileSync(require.resolve(pkgFile));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

export const fonts = {
  anton: () => load('@fontsource/anton/files/anton-latin-400-normal.woff'),
  fredoka: (w = 700) => load(`@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff`),
  jakarta: (w = 700) => load(`@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${w}-normal.woff`),
};
