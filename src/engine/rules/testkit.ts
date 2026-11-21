/**
 * Test helpers for engine unit tests (not used by the app at runtime).
 */
import { CHARACTERS } from '@/data/characters';
import { wrap } from '@/data/layout';
import { applyAction, createGame } from '../game';
import { rollDie } from '../rng';
import type { Action, ApplyResult, GameEvent, GameState, PlayerState } from '../types';

export interface NewGameOptions {
  players?: number;
  mapId?: string;
  seed?: number;
  maxRounds?: number | null;
  startCash?: number;
  salary?: number;
}

export function newGame(opts: NewGameOptions = {}): GameState {
  const n = opts.players ?? 2;
  return createGame({
    mapId: opts.mapId ?? 'nusantara',
    players: Array.from({ length: n }, (_, i) => ({
      name: `Pemain ${i + 1}`,
      characterId: CHARACTERS[i].id,
      isBot: false,
      botLevel: 'sedang' as const,
    })),
    startCash: opts.startCash ?? 2000,
    salary: opts.salary ?? 200,
    maxRounds: opts.maxRounds === undefined ? 25 : opts.maxRounds,
    seed: opts.seed ?? 42,
  });
}

const diceCache = new Map<string, number>();

/** An rng state whose next two (unbiased) dice are exactly d1, d2. */
export function diceSeed(d1: number, d2: number): number {
  const key = `${d1}-${d2}`;
  const hit = diceCache.get(key);
  if (hit !== undefined) return hit;
  for (let seed = 1; seed < 1_000_000; seed++) {
    const h = { rng: seed };
    if (rollDie(h) === d1 && rollDie(h) === d2) {
      diceCache.set(key, seed);
      return seed;
    }
  }
  throw new Error('no seed found');
}

/** Rigs the next ROLL (without power) to produce d1, d2. Mutates and returns the state. */
export function withDice(state: GameState, d1: number, d2: number): GameState {
  state.rng = diceSeed(d1, d2);
  return state;
}

export function act(state: GameState, action: Action): ApplyResult {
  return applyAction(state, action);
}

/** Positions the current player so that rolling d1+d2 lands on `target`, rigs the dice and rolls. */
export function rollTo(state: GameState, target: number, d1 = 1, d2 = 2): ApplyResult {
  const p = state.players[state.current];
  p.position = wrap(target - (d1 + d2));
  withDice(state, d1, d2);
  return applyAction(state, { type: 'ROLL' });
}

export function own(state: GameState, tile: number, playerId: string, level = 0): void {
  state.tiles[tile] = { owner: playerId, level };
}

export function player(state: GameState, id: string): PlayerState {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new Error(`no player ${id}`);
  return p;
}

export function ofType<T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

/** Forces the next card drawn to be `cardId`. */
export function topCard(state: GameState, cardId: string): void {
  state.deck = [cardId, ...state.deck.filter((c) => c !== cardId)];
}

/** Sum of transfer amounts into (positive) / out of (negative) a player from a list of events. */
export function netCash(events: GameEvent[], playerId: string): number {
  let net = 0;
  for (const e of ofType(events, 'transfer')) {
    if (e.to === playerId) net += e.amount;
    if (e.from === playerId) net -= e.amount;
  }
  return net;
}
