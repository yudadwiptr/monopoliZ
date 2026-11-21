# MonopoliZ 🎲🏝️

**Monopoli Nusantara zaman now** — board game properti yang serba cepat di browser. Beli kota-kota
Indonesia, bangun sampai **Landmark**, akuisisi properti lawan, dan menangkan dengan membuat lawan
bangkrut atau lewat salah satu dari tiga **Monopoli**.

- 🗺️ **Peta**: Nusantara (Banda Aceh → Jakarta, Danau Toba → Raja Ampat) dan Jabodetabek
  (Bekasi → SCBD). Peta *Kuliner Nusantara* & *Pulau Dewata* segera hadir.
- 🦎 **Karakter** fauna Nusantara: Komo, Utan, Cenda, Rimau, Bacul, Ano.
- 🤖 **Bot** 3 tingkat (Mudah / Sedang / Sulit) + mode hotseat 2–4 pemain di satu perangkat.
- 🎛️ **Gas Meter** — tahan tombol dadu untuk mengatur kekuatan lemparan.
- 🎶 Musik & efek suara bernuansa **gamelan** yang disintesis langsung (tanpa file audio).
- 💾 Simpan otomatis — tutup tab, lanjutkan kapan saja.
- 📱 Responsif: HP portrait sampai desktop lebar, kamera papan 3D atau tampak atas.

## Cara menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test engine + simulasi bot
npm run build      # build produksi ke dist/
```

URL publik untuk SEO (canonical, Open Graph, sitemap) diatur lewat `VITE_SITE_URL` di `.env`.

## Aturan singkat

| Hal | Aturan |
|---|---|
| Modal awal | Rp 2 M (bisa diatur 1,5 M / 2 M / 3 M) |
| Gaji | Rp 200 jt setiap melewati Start |
| Bangunan | Tanah → Rumah → Ruko → Hotel → **Landmark** (Hotel terbuka setelah 1 putaran; Landmark hanya dari Hotel) |
| Sewa | naik per level; petak Pesta Rakyat bikin sewa **2×** |
| Akuisisi | bayar 2× nilai investasi untuk merebut properti lawan (Landmark kebal) |
| Pulau Terdampar | dadu kembar, bayar Rp 100 jt, atau Kartu Bebas — maks 3 giliran |
| Bandara | giliran berikutnya terbang ke petak mana saja |
| Menang | lawan bangkrut, **Monopoli Wisata** (4 wisata), **Monopoli Jalur** (1 sisi papan), **Monopoli Triple Warna** (3 grup warna), atau terkaya saat batas ronde |

Spesifikasi lengkap (aturan, kontrak engine, arah desain): [`docs/SPEC.md`](docs/SPEC.md).

## Struktur

```
src/
  engine/     aturan main murni (types, economy, selectors, game) + test
  ai/         otak bot
  data/       peta, kartu Rezeki, karakter, geometri papan
  store/      zustand: replay event → animasi, bot loop, autosave
  audio/      SFX & musik gamelan generatif (Web Audio)
  ui/         common kit, board 3D, HUD, dialog keputusan, layar menu
```

Menambah peta baru: buat file di `src/data/maps/` (32 petak, 8 grup warna) lalu daftarkan di `MAPS`.

---

Game ini orisinal: nama, karakter, aset visual, dan audio dibuat khusus untuk MonopoliZ.
