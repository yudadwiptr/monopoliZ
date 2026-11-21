import type { MapDef } from '@/engine/types';
import { NUSANTARA } from './nusantara';
import { JABODETABEK } from './jabodetabek';

const KULINER: MapDef = {
  id: 'kuliner',
  name: 'Kuliner Nusantara',
  tagline: 'Rendang, gudeg, papeda — kuasai rasa!',
  description: 'Peta bertema kuliner khas daerah. Segera hadir!',
  theme: {
    background: 'radial-gradient(1200px 800px at 50% 35%, #5E2A1B 0%, #2A0F0B 55%, #120505 100%)',
    boardSurface: '#3A1A12',
    accent: '#FFB020',
    emblem: '🍛',
  },
  groups: [],
  tiles: [],
  locked: true,
};

const DEWATA: MapDef = {
  id: 'dewata',
  name: 'Pulau Dewata',
  tagline: 'Pantai, pura, dan senja',
  description: 'Kuasai Kuta, Ubud, sampai Uluwatu. Segera hadir!',
  theme: {
    background: 'radial-gradient(1200px 800px at 50% 35%, #0F5E57 0%, #062A2E 55%, #021214 100%)',
    boardSurface: '#0B3A3A',
    accent: '#45E3D6',
    emblem: '🌺',
  },
  groups: [],
  tiles: [],
  locked: true,
};

/** All maps, including locked "segera hadir" ones (shown in the map picker but not playable). */
export const MAPS: MapDef[] = [NUSANTARA, JABODETABEK, KULINER, DEWATA];

export function getMap(id: string): MapDef {
  const m = MAPS.find((x) => x.id === id && !x.locked);
  if (!m) throw new Error(`Unknown or locked map: ${id}`);
  return m;
}

export function playableMaps(): MapDef[] {
  return MAPS.filter((m) => !m.locked);
}
