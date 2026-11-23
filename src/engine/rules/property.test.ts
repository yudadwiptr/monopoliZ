import { describe, expect, it } from 'vitest';
import { getMap } from '@/data/maps';
import {
  acquirePrice,
  applyDiscount,
  cityToll,
  levelCost,
  purchaseCost,
  touristToll,
  upgradeCost,
} from '../economy';
import { act, newGame, ofType, own, player, rollTo } from './testkit';

const defs = getMap('nusantara').tiles;
const PADANG = 4; // city, group 1, price 70
const TOBA = 5; // tourist, price 100
const DERAWAN = 11;
const BOROBUDUR = 21;
const RAJA_AMPAT = 27;
const JAKARTA = 31;

describe('buying', () => {
  it('caps the purchase at Ruko (level 2) before the first lap', () => {
    const g = newGame();
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toEqual({ kind: 'buy', tile: PADANG, maxLevel: 2, discount: false });
    expect(() => act(r.state, { type: 'BUY', level: 3 })).toThrow('Level tidak valid');
    const r2 = act(r.state, { type: 'BUY', level: 1 });
    const cost = purchaseCost(defs[PADANG], 1);
    expect(cost).toBe(105);
    expect(r2.events).toEqual([
      { type: 'transfer', from: 'p1', to: null, amount: cost, reason: 'buy', tile: PADANG },
      { type: 'buy', playerId: 'p1', tile: PADANG, level: 1 },
    ]);
    expect(r2.state.tiles[PADANG]).toEqual({ owner: 'p1', level: 1 });
    expect(player(r2.state, 'p1').cash).toBe(2000 - cost);
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('allows up to Hotel after a lap, never a Landmark on purchase', () => {
    const g = newGame();
    g.players[0].laps = 1;
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toEqual({ kind: 'buy', tile: PADANG, maxLevel: 3, discount: false });
    expect(() => act(r.state, { type: 'BUY', level: 4 })).toThrow('Level tidak valid');
    const r2 = act(r.state, { type: 'BUY', level: 3 });
    expect(r2.state.tiles[PADANG]).toEqual({ owner: 'p1', level: 3 });
    expect(player(r2.state, 'p1').cash).toBe(2000 - purchaseCost(defs[PADANG], 3));
    expect(ofType(r2.events, 'buy')).toEqual([{ type: 'buy', playerId: 'p1', tile: PADANG, level: 3 }]);
  });

  it('tourist tiles can only be bought as land', () => {
    const g = newGame();
    g.players[0].laps = 2;
    const r = rollTo(g, TOBA);
    expect(r.state.pending).toEqual({ kind: 'buy', tile: TOBA, maxLevel: 0, discount: false });
    expect(() => act(r.state, { type: 'BUY', level: 1 })).toThrow('Level tidak valid');
    const r2 = act(r.state, { type: 'BUY', level: 0 });
    expect(r2.state.tiles[TOBA]).toEqual({ owner: 'p1', level: 0 });
    expect(player(r2.state, 'p1').cash).toBe(1900);
  });

  it('skips the prompt when the land is unaffordable', () => {
    const g = newGame();
    g.players[0].cash = 60;
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    expect(ofType(r.events, 'message')).toHaveLength(1);
  });

  it('rejects a level the player cannot pay for', () => {
    const g = newGame();
    g.players[0].cash = 100;
    const r = rollTo(g, PADANG);
    expect(() => act(r.state, { type: 'BUY', level: 1 })).toThrow('Uang tidak cukup');
    expect(() => act(r.state, { type: 'BUY', level: 0 })).not.toThrow();
  });

  it('SKIP leaves the tile unowned', () => {
    const r = rollTo(newGame(), PADANG);
    const r2 = act(r.state, { type: 'SKIP' });
    expect(r2.state.tiles[PADANG].owner).toBeNull();
    expect(r2.events).toEqual([]);
  });

  it('applies and consumes the discount card', () => {
    const g = newGame();
    g.players[0].cards = ['discount'];
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toEqual({ kind: 'buy', tile: PADANG, maxLevel: 2, discount: true });
    const r2 = act(r.state, { type: 'BUY', level: 1 });
    const cost = applyDiscount(purchaseCost(defs[PADANG], 1), true);
    expect(cost).toBe(53);
    expect(r2.events[0]).toEqual({ type: 'card_used', playerId: 'p1', card: 'discount' });
    expect(player(r2.state, 'p1').cash).toBe(2000 - cost);
    expect(player(r2.state, 'p1').cards).toEqual([]);
  });

  it('the discount makes otherwise unaffordable land purchasable', () => {
    const g = newGame();
    g.players[0].cash = 40;
    g.players[0].cards = ['discount'];
    const r = rollTo(g, PADANG);
    expect(r.state.pending.kind).toBe('buy');
    const r2 = act(r.state, { type: 'BUY', level: 0 });
    expect(player(r2.state, 'p1').cash).toBe(5);
  });
});

describe('building on own city', () => {
  it('offers upgrades up to the lap cap', () => {
    const g = newGame();
    g.players[0].laps = 1;
    own(g, PADANG, 'p1', 1);
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toEqual({ kind: 'build', tile: PADANG, fromLevel: 1, maxLevel: 3, discount: false });
    expect(() => act(r.state, { type: 'BUILD', level: 1 })).toThrow('Level tidak valid');
    expect(() => act(r.state, { type: 'BUILD', level: 4 })).toThrow('Level tidak valid');
    const r2 = act(r.state, { type: 'BUILD', level: 3 });
    const cost = upgradeCost(defs[PADANG], 1, 3);
    expect(r2.events).toEqual([
      { type: 'transfer', from: 'p1', to: null, amount: cost, reason: 'build', tile: PADANG },
      { type: 'build', playerId: 'p1', tile: PADANG, from: 1, to: 3 },
    ]);
    expect(r2.state.tiles[PADANG].level).toBe(3);
  });

  it('no build prompt before the first lap once Ruko is built', () => {
    const g = newGame();
    own(g, PADANG, 'p1', 2);
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('landmark only when the tile was already a hotel at landing', () => {
    const g = newGame();
    g.players[0].laps = 3;
    own(g, PADANG, 'p1', 2);
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toMatchObject({ kind: 'build', fromLevel: 2, maxLevel: 3 });

    const g2 = newGame();
    g2.players[0].laps = 3;
    own(g2, PADANG, 'p1', 3);
    const r2 = rollTo(g2, PADANG);
    expect(r2.state.pending).toMatchObject({ kind: 'build', fromLevel: 3, maxLevel: 4 });
    const r3 = act(r2.state, { type: 'BUILD', level: 4 });
    expect(player(r3.state, 'p1').cash).toBe(2000 - levelCost(defs[PADANG], 4));
    expect(r3.state.tiles[PADANG].level).toBe(4);
  });

  it('landmarks and own tourist tiles do nothing', () => {
    const g = newGame();
    g.players[0].laps = 3;
    own(g, PADANG, 'p1', 4);
    expect(rollTo(g, PADANG).state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    const g2 = newGame();
    own(g2, TOBA, 'p1');
    const r = rollTo(g2, TOBA);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    expect(ofType(r.events, 'transfer')).toEqual([]);
  });

  it('skips the build prompt when no upgrade is affordable', () => {
    const g = newGame();
    g.players[0].laps = 1;
    g.players[0].cash = 30; // next level (ruko) costs 70
    own(g, PADANG, 'p1', 1);
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    expect(ofType(r.events, 'message')).toHaveLength(1);
  });

  it('discount applies to building', () => {
    const g = newGame();
    g.players[0].laps = 1;
    g.players[0].cards = ['discount'];
    own(g, PADANG, 'p1', 1);
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toMatchObject({ kind: 'build', discount: true });
    const r2 = act(r.state, { type: 'BUILD', level: 2 });
    expect(player(r2.state, 'p1').cash).toBe(2000 - applyDiscount(levelCost(defs[PADANG], 2), true));
    expect(player(r2.state, 'p1').cards).toEqual([]);
    expect(ofType(r2.events, 'card_used')).toHaveLength(1);
  });
});

describe('tolls', () => {
  it('pays the city toll to the owner', () => {
    const g = newGame();
    own(g, PADANG, 'p2', 2);
    const r = rollTo(g, PADANG);
    const toll = cityToll(defs[PADANG], 2);
    expect(toll).toBe(84);
    expect(ofType(r.events, 'transfer')).toEqual([
      { type: 'transfer', from: 'p1', to: 'p2', amount: toll, reason: 'toll', tile: PADANG },
    ]);
    expect(player(r.state, 'p1').cash).toBe(2000 - toll);
    expect(player(r.state, 'p2').cash).toBe(2000 + toll);
  });

  it('festival doubles the toll', () => {
    const g = newGame();
    own(g, PADANG, 'p2', 2);
    g.festivalTile = PADANG;
    const r = rollTo(g, PADANG);
    expect(ofType(r.events, 'transfer')[0].amount).toBe(168);
  });

  it('tourist toll scales with the number of tourist tiles owned', () => {
    const g = newGame();
    own(g, TOBA, 'p2');
    expect(ofType(rollTo(structuredClone(g), TOBA).events, 'transfer')[0].amount).toBe(touristToll(defs[TOBA], 1));
    own(g, DERAWAN, 'p2');
    own(g, BOROBUDUR, 'p2');
    const r = rollTo(g, TOBA);
    expect(ofType(r.events, 'transfer')[0].amount).toBe(touristToll(defs[TOBA], 3));
    expect(touristToll(defs[TOBA], 3)).toBe(200);
  });

  it('a shield card cancels the toll and is consumed', () => {
    const g = newGame();
    g.players[0].cards = ['shield', 'escape'];
    own(g, PADANG, 'p2', 2);
    const r = rollTo(g, PADANG);
    expect(ofType(r.events, 'transfer')).toEqual([]);
    expect(ofType(r.events, 'card_used')).toEqual([{ type: 'card_used', playerId: 'p1', card: 'shield' }]);
    expect(player(r.state, 'p1').cards).toEqual(['escape']);
    expect(r.state.pending).toMatchObject({ kind: 'acquire', tile: PADANG });
  });
});

describe('acquisition', () => {
  it('offers to buy the property for 2× invested value and transfers buildings', () => {
    const g = newGame();
    own(g, PADANG, 'p2', 2);
    const r = rollTo(g, PADANG);
    const price = acquirePrice(defs[PADANG], 2);
    expect(price).toBe(350);
    expect(r.state.pending).toEqual({ kind: 'acquire', tile: PADANG, price, ownerId: 'p2' });
    const r2 = act(r.state, { type: 'ACQUIRE' });
    expect(r2.events.slice(0, 2)).toEqual([
      { type: 'transfer', from: 'p1', to: 'p2', amount: price, reason: 'acquire', tile: PADANG },
      { type: 'acquire', playerId: 'p1', fromId: 'p2', tile: PADANG },
    ]);
    expect(r2.state.tiles[PADANG]).toEqual({ owner: 'p1', level: 2 });
    expect(player(r2.state, 'p1').cash).toBe(2000 - 84 - price);
    expect(player(r2.state, 'p2').cash).toBe(2000 + 84 + price);
    // before the first lap no further building is possible on a Ruko
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('may build right after acquiring (landmark only on a hotel)', () => {
    const g = newGame();
    g.players[0].laps = 1;
    own(g, PADANG, 'p2', 2);
    const r = act(rollTo(g, PADANG).state, { type: 'ACQUIRE' });
    expect(r.state.pending).toEqual({ kind: 'build', tile: PADANG, fromLevel: 2, maxLevel: 3, discount: false });

    const g2 = newGame();
    g2.players[0].laps = 1;
    own(g2, PADANG, 'p2', 3);
    const r2 = act(rollTo(g2, PADANG).state, { type: 'ACQUIRE' });
    expect(r2.state.pending).toEqual({ kind: 'build', tile: PADANG, fromLevel: 3, maxLevel: 4, discount: false });
    const r3 = act(r2.state, { type: 'BUILD', level: 4 });
    expect(r3.state.tiles[PADANG]).toEqual({ owner: 'p1', level: 4 });
  });

  it('landmarks cannot be acquired', () => {
    const g = newGame();
    own(g, PADANG, 'p2', 4);
    const r = rollTo(g, PADANG);
    expect(ofType(r.events, 'transfer')[0].amount).toBe(cityToll(defs[PADANG], 4));
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('no offer when the price is unaffordable after the toll', () => {
    const g = newGame();
    g.players[0].cash = 400;
    own(g, PADANG, 'p2', 2); // toll 84, price 350 → 316 left
    const r = rollTo(g, PADANG);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('festival stays on the acquired tile', () => {
    const g = newGame();
    own(g, PADANG, 'p2', 2);
    g.festivalTile = PADANG;
    const r = act(rollTo(g, PADANG).state, { type: 'ACQUIRE' });
    expect(r.state.festivalTile).toBe(PADANG);
    expect(r.state.tiles[PADANG].owner).toBe('p1');
  });

  it('tourist tiles can be acquired (no build afterwards)', () => {
    const g = newGame();
    g.players[0].laps = 1;
    own(g, RAJA_AMPAT, 'p2');
    const r = rollTo(g, RAJA_AMPAT);
    expect(r.state.pending).toMatchObject({ kind: 'acquire', price: 400 });
    const r2 = act(r.state, { type: 'ACQUIRE' });
    expect(r2.state.tiles[RAJA_AMPAT]).toEqual({ owner: 'p1', level: 0 });
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('SKIP declines the offer', () => {
    const g = newGame();
    own(g, JAKARTA, 'p2', 0);
    const r = rollTo(g, JAKARTA);
    const r2 = act(r.state, { type: 'SKIP' });
    expect(r2.state.tiles[JAKARTA].owner).toBe('p2');
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });
});

describe('festival corner', () => {
  it('lets the player host the festival on one of their properties', () => {
    const g = newGame();
    own(g, 1, 'p1');
    own(g, 2, 'p1');
    own(g, PADANG, 'p2');
    const r = rollTo(g, 16);
    expect(r.state.pending).toEqual({ kind: 'choose_tile', purpose: 'festival', candidates: [1, 2], optional: true });
    expect(() => act(r.state, { type: 'CHOOSE_TILE', tile: PADANG })).toThrow('Petak tidak bisa dipilih');
    const r2 = act(r.state, { type: 'CHOOSE_TILE', tile: 2 });
    expect(r2.state.festivalTile).toBe(2);
    expect(r2.events).toEqual([{ type: 'festival', playerId: 'p1', tile: 2 }]);

    // landing again: the current festival tile is not a candidate (choosing moves it)
    r2.state.pending = { kind: 'roll' };
    const r3 = rollTo(r2.state, 16);
    expect(r3.state.pending).toMatchObject({ kind: 'choose_tile', purpose: 'festival', candidates: [1] });
    const r4 = act(r3.state, { type: 'CHOOSE_TILE', tile: 1 });
    expect(r4.state.festivalTile).toBe(1);
  });

  it('nothing to choose without properties', () => {
    const r = rollTo(newGame(), 16);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
    expect(ofType(r.events, 'message')).toHaveLength(1);
  });

  it('SKIP keeps the festival where it was', () => {
    const g = newGame();
    own(g, 1, 'p1');
    const r = act(rollTo(g, 16).state, { type: 'SKIP' });
    expect(r.state.festivalTile).toBeNull();
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });
});
