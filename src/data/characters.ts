import type { CharacterDef } from '@/engine/types';

/**
 * 8 Ikon Pion Nusantara (2D PNG Sprites dengan tatakan kayu di `public/pawns/`).
 * Setiap pion memiliki warna khas pemain, path sprite PNG transparan, dan tagline.
 */
export const CHARACTERS: CharacterDef[] = [
  {
    id: 'kucing_blangkon',
    name: 'Kucing Blangkon',
    emoji: '🐱',
    sprite: '/pawns/pawn_kucing_blangkon.png',
    color: '#FF8A3D',
    tagline: 'Meong santuy, tahu-tahu borong se-Jawa!',
  },
  {
    id: 'bajaj_oranye',
    name: 'Bajaj Oranye',
    emoji: '🛺',
    sprite: '/pawns/pawn_bajaj_oranye.png',
    color: '#FF5E3A',
    tagline: 'Ngebut selap-selip, semua properti disalip!',
  },
  {
    id: 'komodo_udeng',
    name: 'Komodo Udeng',
    emoji: '🦎',
    sprite: '/pawns/pawn_komodo_udeng.png',
    color: '#2EE59D',
    tagline: 'Santai di pantai, tapi semua kota kesikat.',
  },
  {
    id: 'ondel_ondel',
    name: 'Ondel-Ondel',
    emoji: '🎭',
    sprite: '/pawns/pawn_ondel_ondel.png',
    color: '#FF4FD8',
    tagline: 'Rame terus, sekali mampir langsung pesta!',
  },
  {
    id: 'becak',
    name: 'Becak',
    emoji: '🚲',
    sprite: '/pawns/pawn_becak.png',
    color: '#3DA5FF',
    tagline: 'Kayuh pelan-pelan, tahu-tahu jadi Landmark.',
  },
  {
    id: 'gatotkaca',
    name: 'Gatotkaca',
    emoji: '🛡️',
    sprite: '/pawns/pawn_gatotkaca.png',
    color: '#B36BFF',
    tagline: 'Otot kawat tulang besi, modal kuat anti rugi!',
  },
  {
    id: 'tumpeng',
    name: 'Tumpeng Ceria',
    emoji: '🍛',
    sprite: '/pawns/pawn_tumpeng.png',
    color: '#FFC21F',
    tagline: 'Bawa berkah dan cuan melimpah di tiap giliran.',
  },
  {
    id: 'garuda',
    name: 'Garuda Cilik',
    emoji: '🦅',
    sprite: '/pawns/pawn_garuda.png',
    color: '#14B8A6',
    tagline: 'Terbang tinggi menguasai seluruh Nusantara!',
  },
];

/** Alias eksplisit untuk config daftar 8 pion */
export const PAWNS = CHARACTERS;

const LEGACY_MAP: Record<string, string> = {
  komo: 'komodo_udeng',
  utan: 'kucing_blangkon',
  cenda: 'ondel_ondel',
  rimau: 'tumpeng',
  bacul: 'becak',
  anoa: 'gatotkaca',
};

export function getCharacter(id: string): CharacterDef {
  const mapped = LEGACY_MAP[id] ?? id;
  return CHARACTERS.find((c) => c.id === mapped) ?? CHARACTERS[0];
}

export const BOT_NAMES = [
  'Mbak Sultan',
  'Cak Borong',
  'Uda Saudagar',
  'Bang Jago',
  'Kang Cuan',
  'Bli Investor',
  'Daeng Tajir',
  'Ompung Kaya',
];
