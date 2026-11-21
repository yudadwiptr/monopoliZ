/**
 * Fuzz: random legal play on both maps with 2–4 players, checking invariants after every action and
 * that replaying the emitted events (like the store does) reproduces positions, cash and ownership.
 * Per-action checks use plain assertions (vitest `expect` is too slow for ~100k actions).
 */
import { describe, expect, it } from 'vitest';
import { getMap } from '@/data/maps';
import { CHARACTERS } from '@/data/characters';
import { applyAction, createGame, listLegalActions } from './game';
import { Rng } from './rng';
import type { Action, GameEvent, GameState, TileDef } from './types';

const GAMES_PER_CASE = 50; // 2 maps × 3 player counts × 50 = 300 games
const MAX_ACTIONS = 3000;
const MAX_ROUNDS = 30;
const PURITY_EVERY = 7; // deep purity check frequency (JSON snapshot is the slow part)

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

interface View {
  positions: Record<string, number>;
  cash: Record<string, number>;
  tiles: { owner: string | null; level: number }[];
  festivalTile: number | null;
  bankrupt: Record<string, boolean>;
}

function viewOf(g: GameState): View {
  const positions: Record<string, number> = {};
  const cash: Record<string, number> = {};
  const bankrupt: Record<string, boolean> = {};
  g.players.forEach((p) => {
    positions[p.id] = p.position;
    cash[p.id] = p.cash;
    bankrupt[p.id] = p.bankrupt;
  });
  return { positions, cash, bankrupt, tiles: g.tiles.map((t) => ({ ...t })), festivalTile: g.festivalTile };
}

/** Mirrors the store's per-event view updates, asserting that each event is consistent. */
function replay(v: View, ev: GameEvent): void {
  switch (ev.type) {
    case 'move':
      assert(v.positions[ev.playerId] === ev.from, `move from mismatch ${JSON.stringify(ev)}`);
      if (ev.mode === 'walk') assert(((ev.from + ev.steps) % 32 + 32) % 32 === ev.to, 'walk steps mismatch');
      v.positions[ev.playerId] = ev.to;
      return;
    case 'transfer':
      assert(ev.amount > 0 && Number.isInteger(ev.amount), `bad transfer amount ${ev.amount}`);
      assert(ev.from !== ev.to, 'self transfer');
      if (ev.from) v.cash[ev.from] -= ev.amount;
      if (ev.to) v.cash[ev.to] += ev.amount;
      if (ev.from) assert(v.cash[ev.from] >= 0, `cash went negative mid-events ${JSON.stringify(ev)}`);
      return;
    case 'buy':
      assert(v.tiles[ev.tile].owner === null, 'buy of owned tile');
      v.tiles[ev.tile] = { owner: ev.playerId, level: ev.level };
      return;
    case 'build':
      assert(v.tiles[ev.tile].owner === ev.playerId && v.tiles[ev.tile].level === ev.from, 'build mismatch');
      v.tiles[ev.tile] = { ...v.tiles[ev.tile], level: ev.to };
      return;
    case 'acquire':
      assert(v.tiles[ev.tile].owner === ev.fromId, 'acquire owner mismatch');
      v.tiles[ev.tile] = { ...v.tiles[ev.tile], owner: ev.playerId };
      return;
    case 'sell':
      ev.tiles.forEach((t) => {
        assert(v.tiles[t].owner === ev.playerId, 'sell of foreign tile');
        v.tiles[t] = { owner: null, level: 0 };
      });
      if (v.festivalTile !== null && ev.tiles.includes(v.festivalTile)) v.festivalTile = null;
      return;
    case 'force_sale':
      assert(v.tiles[ev.tile].owner === ev.ownerId, 'force_sale owner mismatch');
      v.tiles[ev.tile] = { owner: null, level: 0 };
      if (v.festivalTile === ev.tile) v.festivalTile = null;
      return;
    case 'festival':
      v.festivalTile = ev.tile;
      return;
    case 'bankrupt': {
      const ft = v.festivalTile;
      if (ft !== null && v.tiles[ft]?.owner === ev.playerId) v.festivalTile = null;
      v.tiles = v.tiles.map((t) => (t.owner === ev.playerId ? { owner: null, level: 0 } : t));
      v.bankrupt[ev.playerId] = true;
      return;
    }
    default:
      return;
  }
}

function sameView(a: View, b: View): string | null {
  for (const id of Object.keys(b.cash)) {
    if (a.cash[id] !== b.cash[id]) return `cash ${id}: events ${a.cash[id]} vs state ${b.cash[id]}`;
    if (a.positions[id] !== b.positions[id]) return `position ${id}: ${a.positions[id]} vs ${b.positions[id]}`;
    if (a.bankrupt[id] !== b.bankrupt[id]) return `bankrupt ${id}`;
  }
  for (let i = 0; i < b.tiles.length; i++) {
    if (a.tiles[i].owner !== b.tiles[i].owner || a.tiles[i].level !== b.tiles[i].level) {
      return `tile ${i}: ${JSON.stringify(a.tiles[i])} vs ${JSON.stringify(b.tiles[i])}`;
    }
  }
  if (a.festivalTile !== b.festivalTile) return `festival ${a.festivalTile} vs ${b.festivalTile}`;
  return null;
}

function checkInvariants(g: GameState, defs: TileDef[]): void {
  const active = new Set(g.players.filter((p) => !p.bankrupt).map((p) => p.id));
  for (const p of g.players) {
    assert(Number.isInteger(p.cash) && p.cash >= 0, `${p.id} cash ${p.cash}`);
    assert(p.position >= 0 && p.position < 32, `${p.id} position ${p.position}`);
    assert(p.islandTurns >= 0 && p.islandTurns <= 3, `${p.id} islandTurns ${p.islandTurns}`);
    assert(new Set(p.cards).size === p.cards.length, `${p.id} duplicate cards`);
    if (p.bankrupt) assert(p.cash === 0 && p.cards.length === 0, `${p.id} bankrupt but holds stuff`);
  }
  g.tiles.forEach((t, i) => {
    const def = defs[i];
    if (t.owner === null) {
      assert(t.level === 0, `unowned tile ${i} has level`);
      return;
    }
    assert(active.has(t.owner), `tile ${i} owned by inactive ${t.owner}`);
    if (def.kind === 'tourist') assert(t.level === 0, `tourist ${i} level ${t.level}`);
    else assert(def.kind === 'city' && t.level >= 0 && t.level <= 4, `tile ${i} (${def.kind}) level ${t.level}`);
  });
  if (g.festivalTile !== null) assert(g.tiles[g.festivalTile].owner !== null, 'festival on unowned tile');
  if (g.winner) {
    assert(g.pending.kind === 'game_over', 'winner without game_over');
  } else {
    assert(g.pending.kind !== 'game_over', 'game_over without winner');
    assert(!g.players[g.current].bankrupt, 'pending belongs to a bankrupt player');
    assert(active.size >= 2, 'fewer than 2 active players but no winner');
    assert(listLegalActions(g).length > 0, `no legal actions for ${g.pending.kind}`);
  }
  assert(g.round <= MAX_ROUNDS, `round ${g.round} beyond limit`);
  assert(g.log.length <= 80, 'log not capped');
}

function playRandomGame(mapId: string, players: number, seed: number): { actions: number; state: GameState } {
  const defs = getMap(mapId).tiles;
  const rng = new Rng(seed * 7919 + players);
  let g = createGame({
    mapId,
    players: Array.from({ length: players }, (_, i) => ({
      name: `Bot ${i + 1}`,
      characterId: CHARACTERS[(seed + i) % CHARACTERS.length].id,
      isBot: true,
      botLevel: 'mudah' as const,
    })),
    startCash: 2000,
    salary: 200,
    maxRounds: MAX_ROUNDS,
    seed,
  });
  checkInvariants(g, defs);
  let actions = 0;
  while (!g.winner && actions < MAX_ACTIONS) {
    const legal = listLegalActions(g);
    let action: Action = rng.pick(legal);
    if (action.type === 'ROLL' && rng.next() < 0.5) action = { type: 'ROLL', power: rng.next() };
    const before = g;
    const snapshot = actions % PURITY_EVERY === 0 ? JSON.stringify(before) : null;
    const ctxMsg = () => `[${mapId} p${players} seed ${seed} #${actions} ${JSON.stringify(action)} on ${before.pending.kind}]`;
    let result;
    try {
      result = applyAction(before, action);
    } catch (e) {
      throw new Error(`${ctxMsg()} threw: ${(e as Error).message}`);
    }
    if (snapshot !== null) assert(JSON.stringify(before) === snapshot, `${ctxMsg()} mutated its input`);
    g = result.state;
    actions++;

    const view = viewOf(before);
    try {
      for (const ev of result.events) replay(view, ev);
      const diff = sameView(view, viewOf(g));
      assert(diff === null, `events do not match state: ${diff}`);
      checkInvariants(g, defs);
    } catch (e) {
      throw new Error(`${ctxMsg()} ${(e as Error).message}`);
    }
  }
  return { actions, state: g };
}

describe('fuzz: random legal play', () => {
  for (const mapId of ['nusantara', 'jabodetabek']) {
    for (const players of [2, 3, 4]) {
      it(`${mapId} with ${players} players always reaches a winner`, () => {
        const reasons: Record<string, number> = {};
        for (let k = 0; k < GAMES_PER_CASE; k++) {
          const seed = 1000 * players + k + (mapId === 'nusantara' ? 0 : 500);
          const { state, actions } = playRandomGame(mapId, players, seed);
          assert(state.winner, `seed ${seed} has no winner after ${actions} actions (round ${state.round})`);
          reasons[state.winner.reason] = (reasons[state.winner.reason] ?? 0) + 1;
        }
        expect(Object.values(reasons).reduce((a, b) => a + b, 0)).toBe(GAMES_PER_CASE);
      });
    }
  }
});
