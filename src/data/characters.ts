import type { CharacterDef } from '@/engine/types';

/** Original mascots inspired by Indonesian fauna. Each character's colour doubles as the player colour. */
export const CHARACTERS: CharacterDef[] = [
  { id: 'komo', name: 'Komo', emoji: '🦎', color: '#2EE59D', tagline: 'Santai, tapi semua kota kesikat.' },
  { id: 'utan', name: 'Utan', emoji: '🦧', color: '#FF8A3D', tagline: 'Investor hutan, cuan tahan lama.' },
  { id: 'cenda', name: 'Cenda', emoji: '🦜', color: '#FF4FD8', tagline: 'Paling kece se-Nusantara.' },
  { id: 'rimau', name: 'Rimau', emoji: '🐯', color: '#FFC21F', tagline: 'Auman bisnisnya bikin gentar.' },
  { id: 'bacul', name: 'Bacul', emoji: '🦏', color: '#3DA5FF', tagline: 'Pelan-pelan, asal landmark.' },
  { id: 'anoa', name: 'Ano', emoji: '🐃', color: '#B36BFF', tagline: 'Kecil-kecil cabe rawit.' },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export const BOT_NAMES = ['Bang Jago', 'Mbak Sultan', 'Kang Cuan', 'Uda Saudagar', 'Bli Investor', 'Daeng Tajir', 'Ompung Kaya', 'Cak Borong'];
