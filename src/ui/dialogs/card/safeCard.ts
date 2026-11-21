import { getCard } from '@/data/cards';
import type { CardDef } from '@/engine/types';

const FALLBACK: CardDef = {
  id: 'unknown',
  title: 'Kartu Misterius',
  text: 'Tulisannya luntur kena hujan… yang penting gas terus!',
  emoji: '❓',
  tone: 'neutral',
  effect: { type: 'gain', amount: 0 },
  copies: 0,
};

/** getCard() throws on unknown ids; UI should never crash over a bad id. */
export function safeCard(id: string): CardDef {
  try {
    return getCard(id);
  } catch {
    return { ...FALLBACK, id };
  }
}
