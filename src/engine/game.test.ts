import { describe, expect, it } from 'vitest';
import { buildDeck } from '@/data/cards';
import { CHARACTERS, getCharacter } from '@/data/characters';
import { applyAction, createGame, listLegalActions } from './game';
import { Rng } from './rng';
import { act, newGame, ofType, own, player, rollTo, withDice } from './rules/testkit';
import { totalAssets } from './economy';
import { getMap } from '@/data/maps';
import type { Action, GameState } from './types';

const setup = (i: number) => ({ name: `P${i}`, characterId: CHARACTERS[i].id, isBot: false, botLevel: 'sedang' as const });

describe('createGame', () => {
  it('builds a fresh game', () => {
    const g = newGame({ players: 3, seed: 7 });
    expect(g.players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    g.players.forEach((p, i) => {
      expect(p.color).toBe(getCharacter(CHARACTERS[i].id).color);
      expect(p.cash).toBe(2000);
      expect(p.position).toBe(0);
      expect(p.laps).toBe(0);
      expect(p.bankrupt).toBe(false);
      expect(p.cards).toEqual([]);
    });
    expect(g.tiles).toHaveLength(32);
    expect(g.tiles.every((t) => t.owner === null && t.level === 0)).toBe(true);
    expect(g.pending).toEqual({ kind: 'roll' });
    expect(g.round).toBe(1);
    expect(g.current).toBe(0);
    expect(g.festivalTile).toBeNull();
    expect(g.winner).toBeNull();
    expect(g.log.length).toBe(1);
    expect(g.log[0].text).toMatch(/Selamat datang/);
    expect(g.deck.slice().sort()).toEqual(buildDeck().sort());
    expect(g.config.seed).toBe(7);
  });

  it('shuffles the deck deterministically from the seed', () => {
    expect(newGame({ seed: 5 }).deck).toEqual(newGame({ seed: 5 }).deck);
    expect(newGame({ seed: 5 }).deck).not.toEqual(newGame({ seed: 6 }).deck);
  });

  it('defaults the seed to 1', () => {
    const g = createGame({ mapId: 'nusantara', players: [setup(0), setup(1)], startCash: 2000, salary: 200, maxRounds: 25 });
    expect(g.config.seed).toBe(1);
  });

  it('validates the config', () => {
    const base = { mapId: 'nusantara', startCash: 2000, salary: 200, maxRounds: 25 };
    expect(() => createGame({ ...base, players: [setup(0)] })).toThrow(/2 sampai 4/);
    expect(() => createGame({ ...base, players: [0, 1, 2, 3, 4].map(setup) })).toThrow(/2 sampai 4/);
    expect(() => createGame({ ...base, players: [setup(0), setup(0)] })).toThrow(/karakter/);
    expect(() => createGame({ ...base, mapId: 'kuliner', players: [setup(0), setup(1)] })).toThrow(/Peta/);
    expect(() => createGame({ ...base, mapId: 'nope', players: [setup(0), setup(1)] })).toThrow(/Peta/);
  });

  it('supports the jabodetabek map', () => {
    const g = newGame({ mapId: 'jabodetabek' });
    expect(g.mapId).toBe('jabodetabek');
  });
});

describe('applyAction basics', () => {
  it('is pure (does not mutate the input)', () => {
    const g = newGame();
    withDice(g, 2, 3);
    const snapshot = JSON.stringify(g);
    const r = applyAction(g, { type: 'ROLL' });
    expect(JSON.stringify(g)).toBe(snapshot);
    expect(r.state).not.toBe(g);
    expect(r.state.players[0].position).toBe(5);
  });

  it('rejects illegal actions with Indonesian messages', () => {
    const g = newGame();
    expect(() => applyAction(g, { type: 'END_TURN' })).toThrow('Aksi tidak valid saat ini');
    expect(() => applyAction(g, { type: 'BUY', level: 0 })).toThrow('Aksi tidak valid saat ini');
    expect(() => applyAction(g, { type: 'SKIP' })).toThrow('Aksi tidak valid saat ini');
    expect(() => applyAction(g, { type: 'ACK' })).toThrow('Aksi tidak valid saat ini');
    expect(() => applyAction(g, { type: 'SELL', tiles: [1] })).toThrow('Aksi tidak valid saat ini');
    expect(() => applyAction(g, { type: 'PAY_ESCAPE' })).toThrow('Aksi tidak valid saat ini');
  });

  it('rejects actions after the game is over', () => {
    const g = newGame();
    g.winner = { playerId: 'p1', reason: 'bangkrut' };
    g.pending = { kind: 'game_over' };
    expect(() => applyAction(g, { type: 'ROLL' })).toThrow('Permainan sudah selesai');
    expect(listLegalActions(g)).toEqual([]);
  });

  it('a roll walks, emits dice + move, then ends the turn', () => {
    const g = newGame();
    withDice(g, 2, 3);
    const r = act(g, { type: 'ROLL' });
    expect(r.events[0]).toEqual({ type: 'dice', playerId: 'p1', dice: [2, 3], doubles: false });
    expect(r.events[1]).toEqual({ type: 'move', playerId: 'p1', from: 0, to: 5, steps: 5, mode: 'walk' });
    expect(r.state.lastDice).toEqual([2, 3]);
    // tile 5 is an unowned tourist tile → buy prompt
    expect(r.state.pending).toEqual({ kind: 'buy', tile: 5, maxLevel: 0, discount: false });
    const r2 = act(r.state, { type: 'SKIP' });
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    const r3 = act(r2.state, { type: 'END_TURN' });
    expect(r3.state.current).toBe(1);
    expect(r3.events).toEqual([{ type: 'turn_start', playerId: 'p2', round: 1 }]);
    expect(r3.state.pending).toEqual({ kind: 'roll' });
  });

  it('caps the log at 80 entries with increasing ids', () => {
    let g = newGame({ maxRounds: null });
    for (let i = 0; i < 400; i++) {
      const a: Action = listLegalActions(g)[0];
      g = applyAction(g, a).state;
      if (g.winner) break;
    }
    expect(g.logSeq).toBeGreaterThan(80);
    expect(g.log.length).toBe(80);
    for (let i = 1; i < g.log.length; i++) expect(g.log[i].id).toBe(g.log[i - 1].id + 1);
    expect(g.logSeq).toBe(g.log[g.log.length - 1].id);
  });
});

describe('dice & turns', () => {
  it('doubles grant an extra roll for the same player', () => {
    const g = newGame();
    const r = rollTo(g, 6, 3, 3); // Pekanbaru, unowned → buy prompt
    expect(r.state.doublesInRow).toBe(1);
    const r2 = act(r.state, { type: 'SKIP' });
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: true });
    const r3 = act(r2.state, { type: 'END_TURN' });
    expect(r3.state.current).toBe(0);
    expect(r3.events).toEqual([{ type: 'turn_start', playerId: 'p1', round: 1 }]);
    expect(r3.state.pending).toEqual({ kind: 'roll' });
    expect(r3.state.doublesInRow).toBe(1);
  });

  it('the third consecutive double sends the player to the island without moving', () => {
    const g = newGame();
    g.doublesInRow = 2;
    g.players[0].position = 20;
    withDice(g, 4, 4);
    const r = act(g, { type: 'ROLL' });
    const p = r.state.players[0];
    expect(p.position).toBe(8);
    expect(p.islandTurns).toBe(3);
    expect(ofType(r.events, 'move')).toEqual([{ type: 'move', playerId: 'p1', from: 20, to: 8, steps: 0, mode: 'jump' }]);
    expect(ofType(r.events, 'island')).toEqual([{ type: 'island', playerId: 'p1', turnsLeft: 3, escaped: false }]);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    expect(r.state.doublesInRow).toBe(0);
    const r2 = act(r.state, { type: 'END_TURN' });
    expect(r2.state.current).toBe(1);
  });

  it('doubles reset when the turn passes to the next player', () => {
    const g = newGame();
    const r = rollTo(g, 6, 3, 3);
    let s = act(r.state, { type: 'SKIP' }).state;
    s = act(s, { type: 'END_TURN' }).state; // extra roll p1
    s = rollTo(s, 10, 1, 2).state; // non-double
    expect(s.doublesInRow).toBe(0);
  });

  it('the gauge biases the dice sum towards the power', () => {
    const avg = (power: number) => {
      let total = 0;
      const n = 400;
      let g = newGame({ seed: 99 });
      for (let i = 0; i < n; i++) {
        g.pending = { kind: 'roll' };
        g.players[0].position = 0;
        g.doublesInRow = 0;
        const r = applyAction(g, { type: 'ROLL', power });
        const [a, b] = r.state.lastDice as [number, number];
        total += a + b;
        g = r.state;
        g.current = 0;
        g.players[0].islandTurns = 0;
        g.players[0].pendingFlight = false;
        g.players[0].cash = 2000;
        g.tiles = g.tiles.map(() => ({ owner: null, level: 0 }));
        g.festivalTile = null;
        g.winner = null;
      }
      return total / n;
    };
    const low = avg(0);
    const high = avg(1);
    expect(low).toBeLessThan(6.5);
    expect(high).toBeGreaterThan(7.5);
  });

  it('is deterministic for the same seed and actions', () => {
    const play = (seed: number) => {
      let g = newGame({ players: 3, seed });
      const rng = new Rng(1234);
      const states: string[] = [];
      for (let i = 0; i < 400 && !g.winner; i++) {
        const legal = listLegalActions(g);
        g = applyAction(g, rng.pick(legal)).state;
        states.push(JSON.stringify(g));
      }
      return states;
    };
    expect(play(77)).toEqual(play(77));
    expect(play(77)).not.toEqual(play(78));
  });
});

describe('round limit', () => {
  it('ends the game when the round limit is exceeded; richest by assets wins', () => {
    let g = newGame({ players: 3, maxRounds: 1 });
    // make p2 the richest by property
    own(g, 31, 'p2', 3);
    g.players[1].cash = 1900;
    for (let i = 0; i < 3; i++) {
      g.pending = { kind: 'end_turn', extraRoll: false };
      const r = act(g, { type: 'END_TURN' });
      g = r.state;
      if (i < 2) expect(g.winner).toBeNull();
      else {
        expect(g.winner).toEqual({ playerId: 'p2', reason: 'batas_ronde' });
        expect(g.pending).toEqual({ kind: 'game_over' });
        expect(ofType(r.events, 'game_over')).toEqual([{ type: 'game_over', winnerId: 'p2', reason: 'batas_ronde' }]);
      }
    }
    const defs = getMap(g.mapId).tiles;
    const best = Math.max(...g.players.map((p) => totalAssets(defs, g.tiles, p)));
    expect(totalAssets(defs, g.tiles, player(g, 'p2'))).toBe(best);
  });

  it('increments the round when wrapping and skips bankrupt seats', () => {
    let g = newGame({ players: 3, maxRounds: null });
    g.players[1].bankrupt = true;
    g.pending = { kind: 'end_turn', extraRoll: false };
    g = act(g, { type: 'END_TURN' }).state;
    expect(g.current).toBe(2);
    expect(g.round).toBe(1);
    g.pending = { kind: 'end_turn', extraRoll: false };
    const r = act(g, { type: 'END_TURN' });
    expect(r.state.current).toBe(0);
    expect(r.state.round).toBe(2);
    expect(r.events[0]).toEqual({ type: 'turn_start', playerId: 'p1', round: 2 });
  });
});

describe('listLegalActions', () => {
  const kinds = (g: GameState) => listLegalActions(g).map((a) => a.type);

  it('covers each pending kind', () => {
    const g = newGame();
    expect(kinds(g)).toEqual(['ROLL']);

    g.pending = { kind: 'island', turnsLeft: 2, fee: 100, canPay: true, hasCard: true };
    g.players[0].cards = ['escape'];
    expect(kinds(g)).toEqual(['ROLL', 'PAY_ESCAPE', 'USE_ESCAPE_CARD']);

    g.players[0].cash = 100; // Padang land 70, rumah +35 = 105
    g.pending = { kind: 'buy', tile: 4, maxLevel: 1, discount: false };
    expect(listLegalActions(g)).toEqual([{ type: 'BUY', level: 0 }, { type: 'SKIP' }]);

    g.players[0].cash = 2000;
    g.pending = { kind: 'build', tile: 4, fromLevel: 1, maxLevel: 3, discount: false };
    expect(listLegalActions(g)).toEqual([{ type: 'BUILD', level: 2 }, { type: 'BUILD', level: 3 }, { type: 'SKIP' }]);

    g.pending = { kind: 'acquire', tile: 4, price: 300, ownerId: 'p2' };
    expect(kinds(g)).toEqual(['ACQUIRE', 'SKIP']);

    g.pending = { kind: 'choose_tile', purpose: 'festival', candidates: [1, 2], optional: true };
    expect(listLegalActions(g)).toEqual([{ type: 'CHOOSE_TILE', tile: 1 }, { type: 'CHOOSE_TILE', tile: 2 }, { type: 'SKIP' }]);

    g.pending = { kind: 'card', cardId: 'viral' };
    expect(kinds(g)).toEqual(['ACK']);

    own(g, 1, 'p1');
    own(g, 2, 'p1');
    g.pending = { kind: 'raise_funds', amount: 50, creditorId: null, reason: 'tax' };
    expect(listLegalActions(g)).toEqual([{ type: 'SELL', tiles: [1] }, { type: 'SELL', tiles: [2] }, { type: 'BANKRUPT' }]);

    g.pending = { kind: 'end_turn', extraRoll: false };
    expect(kinds(g)).toEqual(['END_TURN']);
  });

  it('every listed action is accepted by applyAction', () => {
    let g = newGame({ players: 4, seed: 3 });
    const rng = new Rng(9);
    for (let i = 0; i < 600 && !g.winner; i++) {
      for (const a of listLegalActions(g)) expect(() => applyAction(g, a)).not.toThrow();
      g = applyAction(g, rng.pick(listLegalActions(g))).state;
    }
  });
});
