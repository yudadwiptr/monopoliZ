/**
 * Hand-built GameState fixtures for bot unit tests (no engine needed).
 */
import { CHARACTERS } from '@/data/characters';
import { BOARD_SIZE } from '@/data/layout';
import { DEFAULT_SALARY, DEFAULT_START_CASH } from '@/engine/economy';
import type { BotLevel, GameState, Pending, PlayerState, TileState } from '@/engine/types';

/** Nusantara tile indices used in tests. */
export const T = {
  START: 0,
  BANDA_ACEH: 1,
  MEDAN: 2,
  CHANCE_A: 3,
  PADANG: 4,
  TOBA: 5,
  PEKANBARU: 6,
  PALEMBANG: 7,
  ISLAND: 8,
  PONTIANAK: 9,
  IKN: 10,
  DERAWAN: 11,
  MAKASSAR: 12,
  PALU: 14,
  MANADO: 15,
  FESTIVAL: 16,
  SOLO: 17,
  YOGYA: 18,
  SEMARANG: 20,
  BOROBUDUR: 21,
  MALANG: 22,
  BANDUNG: 23,
  AIRPORT: 24,
  MATARAM: 25,
  LABUAN_BAJO: 26,
  RAJA_AMPAT: 27,
  DENPASAR: 28,
  TAX: 29,
  SURABAYA: 30,
  JAKARTA: 31,
} as const;

export interface FixtureOpts {
  mapId?: string;
  /** Overrides per seat; seat count = length (default 2 players). */
  players?: Partial<PlayerState>[];
  /** tile index → [ownerId, level] */
  owned?: Record<number, [string, number]>;
  pending?: Pending;
  current?: number;
  festivalTile?: number | null;
  round?: number;
  maxRounds?: number | null;
  turnCount?: number;
  doublesInRow?: number;
  rng?: number;
}

export function makePlayer(seat: number, over: Partial<PlayerState> = {}): PlayerState {
  const ch = CHARACTERS[seat % CHARACTERS.length];
  const level: BotLevel = over.botLevel ?? 'sulit';
  return {
    id: `p${seat + 1}`,
    name: `Bot ${seat + 1}`,
    characterId: ch.id,
    color: ch.color,
    isBot: true,
    botLevel: level,
    cash: DEFAULT_START_CASH,
    position: 0,
    laps: 1,
    bankrupt: false,
    islandTurns: 0,
    pendingFlight: false,
    cards: [],
    ...over,
  };
}

export function makeState(opts: FixtureOpts = {}): GameState {
  const seats = opts.players ?? [{}, {}];
  const players = seats.map((over, i) => makePlayer(i, over));
  const tiles: TileState[] = Array.from({ length: BOARD_SIZE }, () => ({ owner: null, level: 0 }));
  for (const [idx, [owner, level]] of Object.entries(opts.owned ?? {})) {
    tiles[Number(idx)] = { owner, level };
  }
  return {
    version: 1,
    id: 'fixture',
    mapId: opts.mapId ?? 'nusantara',
    config: {
      mapId: opts.mapId ?? 'nusantara',
      players: players.map((p) => ({ name: p.name, characterId: p.characterId, isBot: p.isBot, botLevel: p.botLevel })),
      startCash: DEFAULT_START_CASH,
      salary: DEFAULT_SALARY,
      maxRounds: opts.maxRounds === undefined ? 30 : opts.maxRounds,
      seed: 1,
    },
    players,
    tiles,
    current: opts.current ?? 0,
    round: opts.round ?? 5,
    festivalTile: opts.festivalTile ?? null,
    pending: opts.pending ?? { kind: 'roll' },
    lastDice: null,
    doublesInRow: opts.doublesInRow ?? 0,
    deck: [],
    rng: opts.rng ?? 12345,
    winner: null,
    log: [],
    logSeq: 0,
    turnCount: opts.turnCount ?? 10,
  };
}

/** Same fixture with only the bot level of the current player changed. */
export function withLevel(state: GameState, level: BotLevel): GameState {
  return {
    ...state,
    players: state.players.map((p, i) => (i === state.current ? { ...p, botLevel: level } : p)),
  };
}
