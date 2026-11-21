import { describe, expect, it } from 'vitest';
import { getMap } from '@/data/maps';
import { acquirePrice, cityToll, sellValue, taxFor } from '../economy';
import { act, newGame, ofType, own, player, rollTo, topCard } from './testkit';

const defs = getMap('nusantara').tiles;
const TAX = 29;

describe('tax', () => {
  it('pays 10% of own property value', () => {
    const g = newGame();
    own(g, 4, 'p1', 2); // invested 175
    own(g, 5, 'p1', 0); // invested 100
    own(g, 9, 'p2', 3); // not mine
    const tax = taxFor(defs, g.tiles, 'p1');
    expect(tax).toBe(28);
    const r = rollTo(g, TAX);
    expect(ofType(r.events, 'transfer')).toEqual([{ type: 'transfer', from: 'p1', to: null, amount: tax, reason: 'tax', tile: TAX }]);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('no properties → no tax, just a message', () => {
    const r = rollTo(newGame(), TAX);
    expect(ofType(r.events, 'transfer')).toEqual([]);
    expect(ofType(r.events, 'message')).toHaveLength(1);
  });
});

describe('raise_funds', () => {
  it('sells tiles until the debt is covered, then resumes (no acquire when broke)', () => {
    const g = newGame();
    g.players[0].cash = 50;
    own(g, 1, 'p1', 0); // sells for 25
    own(g, 2, 'p1', 1); // invested 90 → 45
    own(g, 4, 'p2', 2); // toll 84
    g.festivalTile = 2;
    const r = rollTo(g, 4);
    expect(r.state.pending).toEqual({ kind: 'raise_funds', amount: 84, creditorId: 'p2', reason: 'toll' });
    expect(ofType(r.events, 'transfer')).toEqual([]);

    expect(() => act(r.state, { type: 'SELL', tiles: [4] })).toThrow('Properti itu bukan milikmu');
    expect(() => act(r.state, { type: 'SELL', tiles: [] })).toThrow();

    const r2 = act(r.state, { type: 'SELL', tiles: [1] });
    expect(r2.events.slice(0, 2)).toEqual([
      { type: 'sell', playerId: 'p1', tiles: [1] },
      { type: 'transfer', from: null, to: 'p1', amount: 25, reason: 'sell', tile: 1 },
    ]);
    expect(r2.state.pending).toEqual({ kind: 'raise_funds', amount: 84, creditorId: 'p2', reason: 'toll' });
    expect(player(r2.state, 'p1').cash).toBe(75);

    const r3 = act(r2.state, { type: 'SELL', tiles: [2] });
    expect(r3.state.festivalTile).toBeNull();
    expect(ofType(r3.events, 'transfer')).toEqual([
      { type: 'transfer', from: null, to: 'p1', amount: sellValue(defs[2], 1), reason: 'sell', tile: 2 },
      { type: 'transfer', from: 'p1', to: 'p2', amount: 84, reason: 'toll', tile: 4 },
    ]);
    expect(player(r3.state, 'p1').cash).toBe(75 + 45 - 84);
    expect(r3.state.tiles[1].owner).toBeNull();
    expect(r3.state.tiles[2].owner).toBeNull();
    expect(r3.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('resumes with the acquisition offer after the toll is paid', () => {
    const g2 = newGame();
    g2.players[0].cash = 10;
    own(g2, 31, 'p1', 3);
    own(g2, 7, 'p2', 1); // Palembang rumah: toll round(85*0.5)=43
    const r2 = rollTo(g2, 7);
    expect(r2.state.pending).toEqual({ kind: 'raise_funds', amount: cityToll(defs[7], 1), creditorId: 'p2', reason: 'toll' });
    const r3 = act(r2.state, { type: 'SELL', tiles: [31] });
    expect(r3.state.pending).toEqual({ kind: 'acquire', tile: 7, price: acquirePrice(defs[7], 1), ownerId: 'p2' });
  });

  it('raise_funds for the bank (tax)', () => {
    const g = newGame();
    g.players[0].cash = 0;
    own(g, 31, 'p1', 2); // invested 750 → tax 75, sells for 375
    const r = rollTo(g, TAX);
    expect(r.state.pending).toEqual({ kind: 'raise_funds', amount: 75, creditorId: null, reason: 'tax' });
    const r2 = act(r.state, { type: 'SELL', tiles: [31] });
    expect(ofType(r2.events, 'transfer')[1]).toEqual({ type: 'transfer', from: 'p1', to: null, amount: 75, reason: 'tax', tile: TAX });
    expect(player(r2.state, 'p1').cash).toBe(375 - 75);
  });
});

describe('bankruptcy', () => {
  it('cannot cover the debt → bankrupt, creditor gets everything, last player standing wins', () => {
    const g = newGame();
    g.players[0].cash = 50;
    own(g, 1, 'p1', 0); // liquidation 25
    g.festivalTile = 1;
    own(g, 31, 'p2', 4); // toll 1200
    const r = rollTo(g, 31);
    expect(ofType(r.events, 'transfer')).toEqual([
      { type: 'transfer', from: null, to: 'p1', amount: 25, reason: 'bankrupt' },
      { type: 'transfer', from: 'p1', to: 'p2', amount: 75, reason: 'bankrupt' },
    ]);
    expect(ofType(r.events, 'bankrupt')).toEqual([{ type: 'bankrupt', playerId: 'p1', creditorId: 'p2' }]);
    expect(ofType(r.events, 'game_over')).toEqual([{ type: 'game_over', winnerId: 'p2', reason: 'bangkrut' }]);
    const p1 = player(r.state, 'p1');
    expect(p1.bankrupt).toBe(true);
    expect(p1.cash).toBe(0);
    expect(player(r.state, 'p2').cash).toBe(2075);
    expect(r.state.tiles[1]).toEqual({ owner: null, level: 0 });
    expect(r.state.festivalTile).toBeNull();
    expect(r.state.winner).toEqual({ playerId: 'p2', reason: 'bangkrut' });
    expect(r.state.pending).toEqual({ kind: 'game_over' });
  });

  it('with more players the game continues with the next active player', () => {
    const g = newGame({ players: 3 });
    g.players[0].cash = 10;
    own(g, 31, 'p3', 4);
    const r = rollTo(g, 31);
    expect(player(r.state, 'p1').bankrupt).toBe(true);
    expect(r.state.winner).toBeNull();
    expect(r.state.current).toBe(1);
    expect(r.state.pending).toEqual({ kind: 'roll' });
    expect(r.events[r.events.length - 1]).toEqual({ type: 'turn_start', playerId: 'p2', round: 1 });
    expect(player(r.state, 'p3').cash).toBe(2010);
  });

  it('the last seat going bankrupt wraps the round', () => {
    const g = newGame({ players: 3 });
    g.current = 2;
    g.players[2].cash = 10;
    own(g, 31, 'p1', 4);
    const r = rollTo(g, 31);
    expect(r.state.current).toBe(0);
    expect(r.state.round).toBe(2);
  });

  it('BANKRUPT during raise_funds gives the creditor cash + liquidation', () => {
    const g = newGame({ players: 3 });
    g.players[0].cash = 50;
    own(g, 2, 'p1', 1); // liquidation 45
    own(g, 4, 'p2', 2); // toll 84
    const r = rollTo(g, 4);
    expect(r.state.pending.kind).toBe('raise_funds');
    const r2 = act(r.state, { type: 'BANKRUPT' });
    expect(ofType(r2.events, 'transfer')).toEqual([
      { type: 'transfer', from: null, to: 'p1', amount: 45, reason: 'bankrupt' },
      { type: 'transfer', from: 'p1', to: 'p2', amount: 95, reason: 'bankrupt' },
    ]);
    expect(r2.state.tiles[2].owner).toBeNull();
    expect(r2.state.current).toBe(1);
    expect(r2.state.players[0].bankrupt).toBe(true);
  });

  it('bankrupt to the bank', () => {
    const g = newGame({ players: 3 });
    g.players[0].cash = 10;
    topCard(g, 'tilang'); // pay 50 to the bank, nothing to sell
    const r = act(rollTo(g, 3).state, { type: 'ACK' });
    expect(ofType(r.events, 'transfer')).toEqual([{ type: 'transfer', from: 'p1', to: null, amount: 10, reason: 'bankrupt' }]);
    expect(ofType(r.events, 'bankrupt')).toEqual([{ type: 'bankrupt', playerId: 'p1', creditorId: null }]);
    expect(r.state.current).toBe(1);
  });

  it('bankrupt players are skipped and keep no cards', () => {
    const g = newGame({ players: 3 });
    g.players[0].cash = 10;
    g.players[0].cards = ['escape'];
    own(g, 31, 'p2', 4);
    const r = rollTo(g, 31);
    expect(player(r.state, 'p1').cards).toEqual([]);
    let s = r.state;
    s.pending = { kind: 'end_turn', extraRoll: false };
    s = act(s, { type: 'END_TURN' }).state;
    expect(s.current).toBe(2);
    s.pending = { kind: 'end_turn', extraRoll: false };
    s = act(s, { type: 'END_TURN' }).state;
    expect(s.current).toBe(1);
  });
});
