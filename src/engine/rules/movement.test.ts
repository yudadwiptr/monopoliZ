import { describe, expect, it } from 'vitest';
import { getMap } from '@/data/maps';
import { ISLAND_ESCAPE_FEE, levelCost } from '../economy';
import type { GameState } from '../types';
import { act, newGame, ofType, own, player, rollTo, withDice } from './testkit';

const defs = getMap('nusantara').tiles;
const ISLAND = 8;
const AIRPORT = 24;
const PADANG = 4;

/** Hands the turn back to p1 (2-player game) through END_TURN so the opening prompt is computed. */
function backToP1(g: GameState): GameState {
  g.current = 1;
  g.pending = { kind: 'end_turn', extraRoll: false };
  return act(g, { type: 'END_TURN' }).state;
}

describe('salary', () => {
  it('passing start pays the salary and counts a lap', () => {
    const g = newGame();
    g.players[0].position = 30;
    withDice(g, 2, 3);
    const r = act(g, { type: 'ROLL' });
    expect(r.state.players[0].position).toBe(3);
    expect(ofType(r.events, 'move')[0]).toEqual({ type: 'move', playerId: 'p1', from: 30, to: 3, steps: 5, mode: 'walk' });
    expect(ofType(r.events, 'transfer')[0]).toEqual({ type: 'transfer', from: null, to: 'p1', amount: 200, reason: 'salary', tile: 0 });
    expect(r.state.players[0].laps).toBe(1);
  });

  it('uses the configured salary', () => {
    const g = newGame({ salary: 300 });
    g.players[0].position = 30;
    withDice(g, 2, 3);
    expect(ofType(act(g, { type: 'ROLL' }).events, 'transfer')[0].amount).toBe(300);
  });
});

describe('start (exact landing)', () => {
  it('pays the salary once and offers a one-level upgrade', () => {
    const g = newGame();
    own(g, PADANG, 'p1', 1);
    own(g, 6, 'p1', 4); // landmark: not a candidate
    own(g, 7, 'p2', 0); // not mine
    const r = rollTo(g, 0);
    expect(ofType(r.events, 'transfer').filter((t) => t.reason === 'salary')).toHaveLength(1);
    expect(r.state.players[0].laps).toBe(1);
    expect(r.state.pending).toEqual({ kind: 'choose_tile', purpose: 'start_upgrade', candidates: [PADANG], optional: true });
    const r2 = act(r.state, { type: 'CHOOSE_TILE', tile: PADANG });
    const cost = levelCost(defs[PADANG], 2);
    expect(r2.events).toEqual([
      { type: 'transfer', from: 'p1', to: null, amount: cost, reason: 'build', tile: PADANG },
      { type: 'build', playerId: 'p1', tile: PADANG, from: 1, to: 2 },
    ]);
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('a hotel may become a landmark from start; unaffordable cities are excluded', () => {
    const g = newGame();
    own(g, PADANG, 'p1', 3); // landmark costs 140
    own(g, 31, 'p1', 2); // hotel on Jakarta costs 450
    g.players[0].cash = 50; // + salary 200 = 250
    const r = rollTo(g, 0);
    expect(r.state.pending).toMatchObject({ kind: 'choose_tile', purpose: 'start_upgrade', candidates: [PADANG] });
    const r2 = act(r.state, { type: 'CHOOSE_TILE', tile: PADANG });
    expect(r2.state.tiles[PADANG].level).toBe(4);
    expect(player(r2.state, 'p1').cash).toBe(250 - 140);
  });

  it('no prompt without candidates; SKIP is allowed', () => {
    const r = rollTo(newGame(), 0);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    const g = newGame();
    own(g, PADANG, 'p1', 0);
    const r2 = act(rollTo(g, 0).state, { type: 'SKIP' });
    expect(r2.state.tiles[PADANG].level).toBe(0);
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });
});

describe('island', () => {
  it('landing on the island strands the player for 3 turns, even with doubles', () => {
    const g = newGame();
    const r = rollTo(g, ISLAND, 2, 2);
    expect(r.state.players[0].islandTurns).toBe(3);
    expect(ofType(r.events, 'island')).toEqual([{ type: 'island', playerId: 'p1', turnsLeft: 3, escaped: false }]);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('opens the next turn with the island prompt', () => {
    const g = newGame();
    g.players[0].position = ISLAND;
    g.players[0].islandTurns = 3;
    g.players[0].cards = ['escape'];
    const s = backToP1(g);
    expect(s.pending).toEqual({ kind: 'island', turnsLeft: 3, fee: ISLAND_ESCAPE_FEE, canPay: true, hasCard: true });
  });

  it('3 failed rolls: stays twice, freed and moves on the third', () => {
    const g = newGame();
    g.players[0].position = ISLAND;
    g.players[0].islandTurns = 3;
    let s = backToP1(g);
    withDice(s, 1, 2);
    let r = act(s, { type: 'ROLL' });
    expect(r.state.players[0].islandTurns).toBe(2);
    expect(r.state.players[0].position).toBe(ISLAND);
    expect(ofType(r.events, 'island')).toEqual([{ type: 'island', playerId: 'p1', turnsLeft: 2, escaped: false }]);
    expect(ofType(r.events, 'move')).toEqual([]);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });

    s = backToP1(r.state);
    expect(s.pending).toMatchObject({ kind: 'island', turnsLeft: 2 });
    withDice(s, 1, 2);
    r = act(s, { type: 'ROLL' });
    expect(r.state.players[0].islandTurns).toBe(1);

    s = backToP1(r.state);
    expect(s.pending).toMatchObject({ kind: 'island', turnsLeft: 1 });
    withDice(s, 1, 2);
    r = act(s, { type: 'ROLL' });
    expect(r.state.players[0].islandTurns).toBe(0);
    expect(ofType(r.events, 'island')).toEqual([{ type: 'island', playerId: 'p1', turnsLeft: 0, escaped: true }]);
    expect(r.state.players[0].position).toBe(11);
    expect(r.state.pending).toMatchObject({ kind: 'buy', tile: 11 });
  });

  it('doubles escape and move, without an extra roll', () => {
    const g = newGame();
    g.players[0].position = ISLAND;
    g.players[0].islandTurns = 2;
    const s = backToP1(g);
    withDice(s, 2, 2);
    const r = act(s, { type: 'ROLL' });
    expect(ofType(r.events, 'island')).toEqual([{ type: 'island', playerId: 'p1', turnsLeft: 0, escaped: true }]);
    expect(r.state.players[0].position).toBe(12);
    const r2 = act(r.state, { type: 'SKIP' });
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('paying the fee frees the player for a normal roll', () => {
    const g = newGame();
    g.players[0].position = ISLAND;
    g.players[0].islandTurns = 3;
    const s = backToP1(g);
    const r = act(s, { type: 'PAY_ESCAPE' });
    expect(r.events).toEqual([
      { type: 'transfer', from: 'p1', to: null, amount: ISLAND_ESCAPE_FEE, reason: 'island_fee', tile: ISLAND },
      { type: 'island', playerId: 'p1', turnsLeft: 0, escaped: true },
    ]);
    expect(r.state.pending).toEqual({ kind: 'roll' });
    expect(r.state.players[0].islandTurns).toBe(0);
  });

  it('cannot pay the fee without cash', () => {
    const g = newGame();
    g.players[0].position = ISLAND;
    g.players[0].islandTurns = 3;
    g.players[0].cash = 50;
    const s = backToP1(g);
    expect(s.pending).toMatchObject({ kind: 'island', canPay: false, hasCard: false });
    expect(() => act(s, { type: 'PAY_ESCAPE' })).toThrow('Uang tidak cukup');
    expect(() => act(s, { type: 'USE_ESCAPE_CARD' })).toThrow('Kamu tidak punya kartu itu');
  });

  it('the escape card frees the player', () => {
    const g = newGame();
    g.players[0].position = ISLAND;
    g.players[0].islandTurns = 3;
    g.players[0].cards = ['escape'];
    const s = backToP1(g);
    const r = act(s, { type: 'USE_ESCAPE_CARD' });
    expect(r.events).toEqual([
      { type: 'card_used', playerId: 'p1', card: 'escape' },
      { type: 'island', playerId: 'p1', turnsLeft: 0, escaped: true },
    ]);
    expect(r.state.players[0].cards).toEqual([]);
    expect(r.state.pending).toEqual({ kind: 'roll' });
  });
});

describe('airport', () => {
  it('landing sets pendingFlight; next turn offers a flight anywhere', () => {
    const g = newGame();
    const r = rollTo(g, AIRPORT);
    expect(r.state.players[0].pendingFlight).toBe(true);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    const s = backToP1(r.state);
    expect(s.players[0].pendingFlight).toBe(false);
    expect(s.pending).toMatchObject({ kind: 'choose_tile', purpose: 'airport', optional: true });
    if (s.pending.kind !== 'choose_tile') throw new Error();
    expect(s.pending.candidates).toHaveLength(31);
    expect(s.pending.candidates).not.toContain(AIRPORT);
    expect(() => act(s, { type: 'CHOOSE_TILE', tile: AIRPORT })).toThrow('Petak tidak bisa dipilih');
  });

  it('flying past start pays the salary and resolves the destination', () => {
    const g = newGame();
    g.players[0].position = AIRPORT;
    g.players[0].pendingFlight = true;
    const s = backToP1(g);
    const r = act(s, { type: 'CHOOSE_TILE', tile: PADANG });
    expect(r.events[0]).toEqual({ type: 'move', playerId: 'p1', from: AIRPORT, to: PADANG, steps: 0, mode: 'fly' });
    expect(ofType(r.events, 'transfer')).toEqual([
      { type: 'transfer', from: null, to: 'p1', amount: 200, reason: 'salary', tile: 0 },
    ]);
    expect(r.state.players[0].laps).toBe(1);
    expect(r.state.pending).toEqual({ kind: 'buy', tile: PADANG, maxLevel: 3, discount: false });
  });

  it('flying forward without wrapping pays nothing', () => {
    const g = newGame();
    g.players[0].position = AIRPORT;
    g.players[0].pendingFlight = true;
    const s = backToP1(g);
    const r = act(s, { type: 'CHOOSE_TILE', tile: 28 });
    expect(ofType(r.events, 'transfer')).toEqual([]);
    expect(r.state.pending).toMatchObject({ kind: 'buy', tile: 28 });
  });

  it('flying to start pays the salary once and offers the start upgrade', () => {
    const g = newGame();
    g.players[0].position = AIRPORT;
    g.players[0].pendingFlight = true;
    own(g, PADANG, 'p1', 0);
    const s = backToP1(g);
    const r = act(s, { type: 'CHOOSE_TILE', tile: 0 });
    expect(ofType(r.events, 'transfer')).toHaveLength(1);
    expect(r.state.pending).toMatchObject({ kind: 'choose_tile', purpose: 'start_upgrade' });
  });

  it('SKIP means a normal roll; the flight is gone afterwards', () => {
    const g = newGame();
    g.players[0].position = AIRPORT;
    g.players[0].pendingFlight = true;
    const s = backToP1(g);
    const r = act(s, { type: 'SKIP' });
    expect(r.state.pending).toEqual({ kind: 'roll' });
    expect(r.state.players[0].pendingFlight).toBe(false);
  });
});
