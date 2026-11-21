// Isolated dev server for eyeballing the animated <Logo/> (own cache dir, own port).
//   npx vite --config scripts/brand/preview/vite.config.mjs   → http://localhost:5288/scripts/brand/preview/logo.html
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));

export default defineConfig({
  root,
  cacheDir: fileURLToPath(new URL('../.vite-cache', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('../../../src', import.meta.url)) } },
  server: { port: 5288, strictPort: true },
});
