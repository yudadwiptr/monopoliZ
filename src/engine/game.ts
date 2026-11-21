/**
 * Engine entry points.
 *  - createGame(config): fresh GameState, pending = { kind: 'roll' } for player 0, round 1.
 *  - applyAction(state, action): pure (never mutates `state`), returns next state + ordered events.
 *      Throws an Error with a human-readable Indonesian message if the action is illegal.
 *  - listLegalActions(state): representative legal actions for the current pending decision.
 *
 * Rules live in ./rules/*. Engine-only bookkeeping is stored in optional `_`-prefixed fields
 * (see EngineState in ./rules/context.ts); they are JSON-safe so saves keep working.
 */
import { buildDeck } from '@/data/cards';
import { getCharacter } from '@/data/characters';
import { getMap } from '@/data/maps';
import { BOARD_SIZE } from '@/data/layout';
import { DEFAULT_MAX_ROUNDS, DEFAULT_SALARY, DEFAULT_START_CASH } from './economy';
import { seedState, shuffle } from './rng';
import { dispatchAction } from './rules/actions';
import { log, makeCtx, rp, type EngineState } from './rules/context';
import { legalActions } from './rules/legal';
import type { Action, ApplyResult, GameConfig, GameState, MapDef, PlayerState } from './types';

export { RuleError } from './rules/context';

const SEATS = ['p1', 'p2', 'p3', 'p4'] as const;

function resolveMap(mapId: string): MapDef {
  let map: MapDef;
  try {
    map = getMap(mapId);
  } catch {
    throw new Error('Peta ini belum bisa dimainkan');
  }
  if (map.tiles.length !== BOARD_SIZE) throw new Error('Peta tidak valid');
  return map;
}

function normaliseConfig(config: GameConfig): GameConfig {
  const startCash = Number.isFinite(config.startCash) && config.startCash > 0 ? Math.round(config.startCash) : DEFAULT_START_CASH;
  const salary = Number.isFinite(config.salary) && config.salary >= 0 ? Math.round(config.salary) : DEFAULT_SALARY;
  let maxRounds: number | null;
  if (config.maxRounds === null) maxRounds = null;
  else if (Number.isFinite(config.maxRounds) && config.maxRounds > 0) maxRounds = Math.floor(config.maxRounds);
  else maxRounds = DEFAULT_MAX_ROUNDS;
  return {
    mapId: config.mapId,
    players: config.players.map((p) => ({ ...p })),
    startCash,
    salary,
    maxRounds,
    seed: seedState(config.seed ?? 1),
  };
}

export function createGame(config: GameConfig): GameState {
  if (!config || !Array.isArray(config.players)) throw new Error('Konfigurasi game tidak valid');
  const map = resolveMap(config.mapId);
  const n = config.players.length;
  if (n < 2 || n > 4) throw new Error('Jumlah pemain harus 2 sampai 4');
  const charIds = config.players.map((p) => p.characterId);
  if (new Set(charIds).size !== charIds.length) throw new Error('Tiap pemain harus pakai karakter yang beda');

  const cfg = normaliseConfig(config);
  const holder = { rng: cfg.seed ?? 1 };
  const deck = shuffle(holder, buildDeck());

  const players: PlayerState[] = cfg.players.map((setup, i) => {
    const character = getCharacter(setup.characterId);
    return {
      id: SEATS[i],
      name: setup.name?.trim() || character.name,
      characterId: setup.characterId,
      color: character.color,
      isBot: !!setup.isBot,
      botLevel: setup.botLevel ?? 'sedang',
      cash: cfg.startCash,
      position: 0,
      laps: 0,
      bankrupt: false,
      islandTurns: 0,
      pendingFlight: false,
      cards: [],
    };
  });

  const state: EngineState = {
    version: 1,
    id: `mz-${(cfg.seed ?? 1).toString(36)}-${n}`,
    mapId: map.id,
    config: cfg,
    players,
    tiles: Array.from({ length: BOARD_SIZE }, () => ({ owner: null, level: 0 })),
    current: 0,
    round: 1,
    festivalTile: null,
    pending: { kind: 'roll' },
    lastDice: null,
    doublesInRow: 0,
    deck,
    rng: holder.rng,
    winner: null,
    log: [],
    logSeq: 0,
    turnCount: 1,
    _alerts: [],
    _extraRoll: false,
  };
  const limit = cfg.maxRounds === null ? 'tanpa batas ronde' : `${cfg.maxRounds} ronde`;
  log(
    makeCtx(state),
    `🎉 Selamat datang di MonopoliZ — peta ${map.name}! Modal awal ${rp(cfg.startCash)}, ${limit}. Gas cari cuan!`,
  );
  return state;
}

export function applyAction(state: GameState, action: Action): ApplyResult {
  if (state.winner || state.pending.kind === 'game_over') throw new Error('Permainan sudah selesai');
  const next = structuredClone(state) as EngineState;
  const ctx = makeCtx(next);
  dispatchAction(ctx, action);
  return { state: next, events: ctx.events };
}

export function listLegalActions(state: GameState): Action[] {
  return legalActions(state);
}
