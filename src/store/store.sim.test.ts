import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BotLevel, GameConfig } from '@/engine/types';

// Minimal localStorage for the node test environment.
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};

const { useGame, viewFromState } = await import('./gameStore');

const LEVELS: BotLevel[] = ['mudah', 'sedang', 'sulit'];
const CHARS = ['komo', 'utan', 'cenda', 'rimau'];

function config(i: number): GameConfig {
  const n = 2 + (i % 3);
  return {
    mapId: i % 2 ? 'jabodetabek' : 'nusantara',
    players: Array.from({ length: n }, (_, k) => ({
      name: `Bot ${k + 1}`,
      characterId: CHARS[k],
      isBot: true,
      botLevel: LEVELS[(i + k) % 3],
    })),
    startCash: 2000,
    salary: 200,
    maxRounds: 20,
    seed: 1000 + i,
  };
}

describe('store drives full bot games without stalling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    useGame.getState().quitToMenu();
    vi.useRealTimers();
  });

  for (let i = 0; i < 12; i++) {
    it(`game #${i} reaches the results screen`, async () => {
      const errors: unknown[] = [];
      const spy = vi.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a));
      useGame.getState().startGame(config(i));
      let steps = 0;
      while (useGame.getState().screen !== 'results' && steps < 60_000) {
        const s = useGame.getState();
        if (!s.busy && s.queue.length === 0 && !s.game?.winner) {
          expect(vi.getTimerCount(), 'idle store must have a pending timer').toBeGreaterThan(0);
        }
        await vi.advanceTimersByTimeAsync(250);
        steps++;
      }
      spy.mockRestore();
      const s = useGame.getState();
      expect(s.screen).toBe('results');
      expect(s.game?.winner).toBeTruthy();
      expect(errors).toEqual([]);
      const v = viewFromState(s.game!);
      expect(s.view?.positions).toEqual(v.positions);
      expect(s.view?.cash).toEqual(v.cash);
      expect(s.view?.tiles).toEqual(v.tiles);
    });
  }
});
