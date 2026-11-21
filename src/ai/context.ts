/**
 * Per-decision context: everything the bot heuristics need, computed once and memoised lazily.
 */
import { liquidationValue, taxFor, tollAt } from '@/engine/economy';
import { defsOf, mapOf } from '@/engine/selectors';
import type { BotLevel, GameState, KeepCard, MapDef, PlayerState, TileDef } from '@/engine/types';
import { BOARD_SIZE } from '@/data/layout';
import { RANDOM_SUM_PROB, MIN_SUM, MAX_SUM } from './dice';
import { botRng, type Rng } from './rng';

export interface BotProfile {
  /** How much an opponent's monopoly progress counts against us (denial / blocking). */
  denialWeight: number;
  /** Max number of future rounds of toll income considered when investing. */
  horizonCap: number;
}

export const PROFILES: Record<BotLevel, BotProfile> = {
  mudah: { denialWeight: 0.2, horizonCap: 6 },
  sedang: { denialWeight: 1, horizonCap: 8 },
  sulit: { denialWeight: 1.3, horizonCap: 10 },
};

/** Rounds assumed left when the game has no round limit. */
const UNLIMITED_HORIZON = 12;

export interface BotContext {
  readonly state: GameState;
  readonly map: MapDef;
  readonly defs: TileDef[];
  readonly me: PlayerState;
  /** Active (non-bankrupt) opponents. */
  readonly opponents: PlayerState[];
  readonly level: BotLevel;
  readonly profile: BotProfile;
  readonly rng: Rng;
  readonly salary: number;
  /** Rounds of future income worth counting (≥ 1). */
  readonly horizon: number;
  hasCard(card: KeepCard): boolean;
  /** What I pay when landing on each tile right now (opponent toll or tax). */
  landingCost(tile: number): number;
  /** Cash I could raise by selling everything. */
  liquidation(): number;
  /** Probability that at least one opponent lands on `tile` during their next turn (summed over opponents). */
  opponentNextLanding(tile: number): number;
}

export function makeContext(state: GameState, salt = 'decide'): BotContext {
  const map = mapOf(state);
  const defs = defsOf(state);
  const me = state.players[state.current];
  const opponents = state.players.filter((p) => p.id !== me.id && !p.bankrupt);
  const level: BotLevel = me.botLevel ?? 'sedang';
  const profile = PROFILES[level] ?? PROFILES.sedang;
  const maxRounds = state.config.maxRounds;
  const roundsLeft = maxRounds == null ? UNLIMITED_HORIZON : Math.max(1, maxRounds - state.round + 1);
  const horizon = Math.max(1, Math.min(profile.horizonCap, roundsLeft));

  let costTable: number[] | null = null;
  let liq: number | null = null;
  let oppLanding: number[] | null = null;

  const ctx: BotContext = {
    state,
    map,
    defs,
    me,
    opponents,
    level,
    profile,
    rng: botRng(state, salt),
    salary: state.config.salary,
    horizon,
    hasCard: (card) => me.cards.includes(card),
    landingCost(tile) {
      if (!costTable) {
        const tax = taxFor(defs, state.tiles, me.id);
        costTable = defs.map((d, i) => {
          if (d.kind === 'tax') return tax;
          const owner = state.tiles[i]?.owner;
          if (!owner || owner === me.id) return 0;
          return tollAt(defs, state.tiles, i, state.festivalTile);
        });
      }
      return costTable[((tile % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE] ?? 0;
    },
    liquidation() {
      if (liq === null) liq = liquidationValue(defs, state.tiles, me.id);
      return liq;
    },
    opponentNextLanding(tile) {
      if (!oppLanding) {
        const acc = new Array<number>(BOARD_SIZE).fill(0);
        for (const o of opponents) {
          // Stuck on the island → only doubles (1/6) move them; a pending flight → anywhere (spread thin).
          const moveChance = o.islandTurns > 0 ? 1 / 6 : 1;
          if (o.pendingFlight) {
            for (let i = 0; i < BOARD_SIZE; i++) acc[i] += 1 / BOARD_SIZE;
            continue;
          }
          for (let s = MIN_SUM; s <= MAX_SUM; s++) {
            acc[(o.position + s) % BOARD_SIZE] += RANDOM_SUM_PROB[s] * moveChance;
          }
        }
        oppLanding = acc;
      }
      return oppLanding[((tile % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE] ?? 0;
    },
  };
  return ctx;
}
