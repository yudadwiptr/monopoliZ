/**
 * Bot-vs-bot simulation against the real engine: 200 full games, every bot action must be legal and every
 * game must finish. Also reports win rates by difficulty (sulit must clearly beat mudah head-to-head).
 */
import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '@/data/characters';
import { DEFAULT_SALARY, DEFAULT_START_CASH } from '@/engine/economy';
import { applyAction, createGame } from '@/engine/game';
import type { BotLevel, GameConfig, GameState, WinReason } from '@/engine/types';
import { decideBotAction, isLegalAction, planBotAction } from './bot';
import { mulberry32 } from './rng';

const MAX_ACTIONS_PER_GAME = 30_000;
const LEVELS: BotLevel[] = ['mudah', 'sedang', 'sulit'];

interface GameResult {
  levels: BotLevel[];
  winnerSeat: number;
  reason: WinReason;
  rounds: number;
  actions: number;
}

function config(levels: BotLevel[], mapId: string, seed: number): GameConfig {
  return {
    mapId,
    players: levels.map((botLevel, i) => ({
      name: `${botLevel}-${i + 1}`,
      characterId: CHARACTERS[i].id,
      isBot: true,
      botLevel,
    })),
    startCash: DEFAULT_START_CASH,
    salary: DEFAULT_SALARY,
    maxRounds: 30,
    seed,
  };
}

function playGame(levels: BotLevel[], mapId: string, seed: number): GameResult {
  let state: GameState = createGame(config(levels, mapId, seed));
  let actions = 0;
  while (!state.winner && state.pending.kind !== 'game_over') {
    if (++actions > MAX_ACTIONS_PER_GAME) throw new Error(`game ${seed} did not finish (${mapId}, ${levels.join('/')})`);
    const planned = planBotAction(state);
    if (!isLegalAction(state, planned)) {
      throw new Error(`bot planned illegal ${JSON.stringify(planned)} for ${JSON.stringify(state.pending)}`);
    }
    // The public entry point must agree with the raw plan (no silent fallbacks).
    const action = decideBotAction(state);
    expect(action).toEqual(planned);
    try {
      state = applyAction(state, action).state;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `engine rejected ${JSON.stringify(action)} for ${JSON.stringify(state.pending)} ` +
          `(seed ${seed}, ${mapId}, ${levels.join('/')}): ${msg}`,
      );
    }
  }
  const winner = state.winner;
  if (!winner) throw new Error(`game ${seed} ended without a winner`);
  return {
    levels,
    winnerSeat: state.players.findIndex((p) => p.id === winner.playerId),
    reason: winner.reason,
    rounds: state.round,
    actions,
  };
}

/** 200 games: 60 sulit-vs-mudah duels, 40 sulit-vs-sedang duels, 100 mixed 2–4 player tables. */
function schedule(): { levels: BotLevel[]; mapId: string; seed: number }[] {
  const rng = mulberry32(777);
  const out: { levels: BotLevel[]; mapId: string; seed: number }[] = [];
  for (let g = 0; g < 200; g++) {
    const mapId = g % 2 === 0 ? 'nusantara' : 'jabodetabek';
    let levels: BotLevel[];
    if (g < 60) levels = g % 4 < 2 ? ['sulit', 'mudah'] : ['mudah', 'sulit'];
    else if (g < 100) levels = g % 4 < 2 ? ['sulit', 'sedang'] : ['sedang', 'sulit'];
    else {
      const n = 2 + (g % 3);
      levels = Array.from({ length: n }, () => rng.pick(LEVELS));
    }
    out.push({ levels, mapId, seed: 1000 + g });
  }
  return out;
}

describe('bot vs bot simulation (real engine)', () => {
  it('plays 200 full games with only legal actions and reports win rates', () => {
    const results = schedule().map((g) => playGame(g.levels, g.mapId, g.seed));
    expect(results).toHaveLength(200);

    const seats: Record<BotLevel, number> = { mudah: 0, sedang: 0, sulit: 0 };
    const wins: Record<BotLevel, number> = { mudah: 0, sedang: 0, sulit: 0 };
    const reasons: Partial<Record<WinReason, number>> = {};
    for (const r of results) {
      r.levels.forEach((l) => seats[l]++);
      wins[r.levels[r.winnerSeat]]++;
      reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
    }
    const duel = (a: BotLevel, b: BotLevel) => {
      const games = results.filter((r) => r.levels.length === 2 && r.levels.includes(a) && r.levels.includes(b));
      const aWins = games.filter((r) => r.levels[r.winnerSeat] === a).length;
      return { games: games.length, aWins, rate: aWins / Math.max(1, games.length) };
    };
    const sulitVsMudah = duel('sulit', 'mudah');
    const sulitVsSedang = duel('sulit', 'sedang');
    const mixed = results.slice(100);
    const mixedSeats: Record<BotLevel, number> = { mudah: 0, sedang: 0, sulit: 0 };
    const mixedWins: Record<BotLevel, number> = { mudah: 0, sedang: 0, sulit: 0 };
    for (const r of mixed) {
      r.levels.forEach((l) => mixedSeats[l]++);
      mixedWins[r.levels[r.winnerSeat]]++;
    }
    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
    const lines = [
      `games: ${results.length}, avg rounds ${(results.reduce((s, r) => s + r.rounds, 0) / results.length).toFixed(1)}, ` +
        `avg actions ${(results.reduce((s, r) => s + r.actions, 0) / results.length).toFixed(0)}`,
      `win reasons: ${JSON.stringify(reasons)}`,
      `sulit vs mudah (duels): ${sulitVsMudah.aWins}/${sulitVsMudah.games} = ${pct(sulitVsMudah.rate)}`,
      `sulit vs sedang (duels): ${sulitVsSedang.aWins}/${sulitVsSedang.games} = ${pct(sulitVsSedang.rate)}`,
      ...LEVELS.map(
        (l) =>
          `${l}: overall ${wins[l]}/${seats[l]} seats; mixed tables ${mixedWins[l]} wins / ${mixedSeats[l]} seats ` +
          `(${pct(mixedWins[l] / Math.max(1, mixedSeats[l]))} per seat)`,
      ),
    ];
    console.log(`\n[bot sim]\n${lines.join('\n')}\n`);

    expect(sulitVsMudah.rate).toBeGreaterThanOrEqual(0.65);
    expect(sulitVsSedang.rate).toBeGreaterThanOrEqual(0.5);
  }, 900_000);
});
