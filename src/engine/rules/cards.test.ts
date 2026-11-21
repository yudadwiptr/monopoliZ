import { describe, expect, it } from 'vitest';
import { buildDeck, CARDS } from '@/data/cards';
import { getMap } from '@/data/maps';
import { sellValue } from '../economy';
import type { ApplyResult, GameState } from '../types';
import { act, newGame, ofType, own, player, rollTo, topCard } from './testkit';
import { DUPLICATE_CARD_BONUS } from './cards';

const defs = getMap('nusantara').tiles;
const CHANCE = 3;

/** Lands p1 on the chance tile at 3 with `cardId` on top of the deck. */
function draw(g: GameState, cardId: string, at = CHANCE): ApplyResult {
  topCard(g, cardId);
  const r = rollTo(g, at);
  expect(r.state.pending).toEqual({ kind: 'card', cardId });
  expect(ofType(r.events, 'card')).toEqual([{ type: 'card', playerId: 'p1', cardId }]);
  return r;
}

function drawAndAck(g: GameState, cardId: string, at = CHANCE): ApplyResult {
  return act(draw(g, cardId, at).state, { type: 'ACK' });
}

describe('deck', () => {
  it('draws from the top and removes the card', () => {
    const g = newGame();
    const top = g.deck[0];
    const r = rollTo(g, CHANCE);
    expect(r.state.pending).toEqual({ kind: 'card', cardId: top });
    expect(r.state.deck).toHaveLength(buildDeck().length - 1);
  });

  it('reshuffles a fresh deck when empty', () => {
    const g = newGame();
    g.deck = [];
    const r = rollTo(g, CHANCE);
    expect(r.state.pending.kind).toBe('card');
    expect(r.state.deck).toHaveLength(buildDeck().length - 1);
  });

  it('every card in the data has a handled effect', () => {
    for (const card of CARDS) {
      const g = newGame({ players: 3 });
      own(g, 4, 'p1', 2);
      own(g, 9, 'p2', 1);
      expect(() => drawAndAck(g, card.id)).not.toThrow();
    }
  });
});

describe('money cards', () => {
  it('gain', () => {
    const r = drawAndAck(newGame(), 'viral');
    expect(r.events).toEqual([{ type: 'transfer', from: null, to: 'p1', amount: 120, reason: 'card' }]);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('pay', () => {
    const r = drawAndAck(newGame(), 'tilang');
    expect(r.events).toEqual([{ type: 'transfer', from: 'p1', to: null, amount: 50, reason: 'card' }]);
    expect(player(r.state, 'p1').cash).toBe(1950);
  });

  it('pay triggers raise_funds when cash is short', () => {
    const g = newGame();
    g.players[0].cash = 20;
    own(g, 31, 'p1', 0);
    const r = drawAndAck(g, 'tilang');
    expect(r.state.pending).toEqual({ kind: 'raise_funds', amount: 50, creditorId: null, reason: 'card' });
  });

  it('pay_percent_cash', () => {
    const g = newGame();
    g.players[0].cash = 1234;
    const r = drawAndAck(g, 'bodong');
    expect(r.events).toEqual([{ type: 'transfer', from: 'p1', to: null, amount: 123, reason: 'card' }]);
  });

  it('collect_each is capped at the payer cash and skips bankrupt players', () => {
    const g = newGame({ players: 4 });
    g.players[1].cash = 10;
    g.players[3].bankrupt = true;
    g.players[3].cash = 0;
    const r = drawAndAck(g, 'arisan');
    expect(ofType(r.events, 'transfer')).toEqual([
      { type: 'transfer', from: 'p2', to: 'p1', amount: 10, reason: 'card' },
      { type: 'transfer', from: 'p3', to: 'p1', amount: 30, reason: 'card' },
    ]);
    expect(player(r.state, 'p1').cash).toBe(2040);
  });

  it('pay_each pays every other active player', () => {
    const r = drawAndAck(newGame({ players: 3 }), 'traktir');
    expect(ofType(r.events, 'transfer')).toEqual([
      { type: 'transfer', from: 'p1', to: 'p2', amount: 25, reason: 'card' },
      { type: 'transfer', from: 'p1', to: 'p3', amount: 25, reason: 'card' },
    ]);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('pay_each raises funds mid-way and resumes with the next creditor', () => {
    const g = newGame({ players: 3 });
    g.players[0].cash = 30;
    own(g, 1, 'p1', 0); // sells for 25
    const r = drawAndAck(g, 'traktir');
    expect(ofType(r.events, 'transfer')).toEqual([{ type: 'transfer', from: 'p1', to: 'p2', amount: 25, reason: 'card' }]);
    expect(r.state.pending).toEqual({ kind: 'raise_funds', amount: 25, creditorId: 'p3', reason: 'card' });
    const r2 = act(r.state, { type: 'SELL', tiles: [1] });
    expect(ofType(r2.events, 'transfer')).toEqual([
      { type: 'transfer', from: null, to: 'p1', amount: 25, reason: 'sell', tile: 1 },
      { type: 'transfer', from: 'p1', to: 'p3', amount: 25, reason: 'card' },
    ]);
    expect(player(r2.state, 'p1').cash).toBe(5);
    expect(r2.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('pay_per_building counts every building level (tourist = 0)', () => {
    const g = newGame();
    own(g, 4, 'p1', 2);
    own(g, 6, 'p1', 4);
    own(g, 5, 'p1', 0);
    const r = drawAndAck(g, 'mewah');
    expect(r.events).toEqual([{ type: 'transfer', from: 'p1', to: null, amount: 6 * 20, reason: 'card' }]);
  });

  it('pay_per_building with no buildings is free', () => {
    const r = drawAndAck(newGame(), 'mewah');
    expect(ofType(r.events, 'transfer')).toEqual([]);
    expect(ofType(r.events, 'message')).toHaveLength(1);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });
});

describe('movement cards', () => {
  it('move_to start walks forward, pays salary and resolves start', () => {
    const g = newGame();
    own(g, 4, 'p1', 0);
    const r = drawAndAck(g, 'mudik');
    expect(ofType(r.events, 'move')).toEqual([{ type: 'move', playerId: 'p1', from: 3, to: 0, steps: 29, mode: 'walk' }]);
    expect(ofType(r.events, 'transfer')).toEqual([{ type: 'transfer', from: null, to: 'p1', amount: 200, reason: 'salary', tile: 0 }]);
    expect(r.state.pending).toMatchObject({ kind: 'choose_tile', purpose: 'start_upgrade', candidates: [4] });
  });

  it('move_to airport', () => {
    const r = drawAndAck(newGame(), 'promo');
    expect(ofType(r.events, 'move')[0]).toMatchObject({ from: 3, to: 24, steps: 21, mode: 'walk' });
    expect(r.state.players[0].pendingFlight).toBe(true);
  });

  it('move_to festival resolves the corner', () => {
    const g = newGame();
    own(g, 1, 'p1');
    const r = drawAndAck(g, 'pesta');
    expect(r.state.players[0].position).toBe(16);
    expect(r.state.pending).toMatchObject({ kind: 'choose_tile', purpose: 'festival', candidates: [1] });
  });

  it('move_to nearest tourist strictly ahead', () => {
    const r = drawAndAck(newGame(), 'liburan');
    expect(r.state.players[0].position).toBe(5);
    expect(r.state.pending).toMatchObject({ kind: 'buy', tile: 5 });
    const r2 = drawAndAck(newGame(), 'liburan', 13);
    expect(r2.state.players[0].position).toBe(21);
  });

  it('move_to nearest tourist pays the toll when owned by someone else', () => {
    const g = newGame();
    own(g, 5, 'p2');
    const r = drawAndAck(g, 'liburan');
    expect(ofType(r.events, 'transfer')).toEqual([{ type: 'transfer', from: 'p1', to: 'p2', amount: 50, reason: 'toll', tile: 5 }]);
  });

  it('move_to island jumps without salary', () => {
    const r = drawAndAck(newGame(), 'kapal');
    expect(ofType(r.events, 'move')).toEqual([{ type: 'move', playerId: 'p1', from: 3, to: 8, steps: 0, mode: 'jump' }]);
    expect(ofType(r.events, 'transfer')).toEqual([]);
    expect(r.state.players[0].islandTurns).toBe(3);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('move_to island cancels an extra roll from doubles', () => {
    const g = newGame();
    topCard(g, 'kapal');
    const r = act(rollTo(g, CHANCE, 1, 1).state, { type: 'ACK' }); // from 1 with 1+1 → 3
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('move_by negative walks back without salary', () => {
    const r = drawAndAck(newGame(), 'macet', 13);
    expect(ofType(r.events, 'move')).toEqual([{ type: 'move', playerId: 'p1', from: 13, to: 10, steps: -3, mode: 'walk' }]);
    expect(ofType(r.events, 'transfer')).toEqual([]);
    expect(r.state.pending).toMatchObject({ kind: 'buy', tile: 10 });
  });

  it('move_by negative onto start: no salary, start resolves', () => {
    const g = newGame();
    own(g, 4, 'p1', 0);
    const r = drawAndAck(g, 'macet');
    expect(r.state.players[0].position).toBe(0);
    expect(ofType(r.events, 'transfer')).toEqual([]);
    expect(r.state.players[0].laps).toBe(0);
    expect(r.state.pending).toMatchObject({ kind: 'choose_tile', purpose: 'start_upgrade', candidates: [4] });
  });

  it('move_by positive resolves the destination and pays salary when wrapping', () => {
    const r = drawAndAck(newGame(), 'ojol');
    expect(r.state.players[0].position).toBe(6);
    expect(r.state.pending).toMatchObject({ kind: 'buy', tile: 6 });

    const g = newGame();
    g.players[0].position = 30;
    g.pending = { kind: 'card', cardId: 'ojol' };
    const r2 = act(g, { type: 'ACK' });
    expect(r2.state.players[0].position).toBe(1);
    expect(ofType(r2.events, 'transfer')).toEqual([{ type: 'transfer', from: null, to: 'p1', amount: 200, reason: 'salary', tile: 0 }]);
  });
});

describe('keep cards', () => {
  it.each([
    ['bebas', 'escape'],
    ['asuransi', 'shield'],
    ['voucher', 'discount'],
  ] as const)('%s is kept as %s', (cardId, kind) => {
    const r = drawAndAck(newGame(), cardId);
    expect(r.state.players[0].cards).toEqual([kind]);
    expect(r.events).toEqual([]);
  });

  it('a duplicate is converted into cash', () => {
    const g = newGame();
    g.players[0].cards = ['shield'];
    const r = drawAndAck(g, 'asuransi');
    expect(r.state.players[0].cards).toEqual(['shield']);
    expect(ofType(r.events, 'transfer')).toEqual([
      { type: 'transfer', from: null, to: 'p1', amount: DUPLICATE_CARD_BONUS, reason: 'card' },
    ]);
  });
});

describe('board cards', () => {
  it('upgrade_free: +1 level for free, hotel → landmark allowed', () => {
    const g = newGame();
    own(g, 4, 'p1', 3);
    own(g, 6, 'p1', 4);
    own(g, 5, 'p1', 0); // tourist: not a candidate
    const r = drawAndAck(g, 'hibah');
    expect(r.state.pending).toEqual({ kind: 'choose_tile', purpose: 'card_upgrade', candidates: [4], optional: true });
    const r2 = act(r.state, { type: 'CHOOSE_TILE', tile: 4 });
    expect(r2.events).toEqual([{ type: 'build', playerId: 'p1', tile: 4, from: 3, to: 4 }]);
    expect(r2.state.tiles[4].level).toBe(4);
    expect(player(r2.state, 'p1').cash).toBe(2000);
  });

  it('upgrade_free ignores the lap cap', () => {
    const g = newGame();
    own(g, 4, 'p1', 1);
    const r = act(drawAndAck(g, 'hibah').state, { type: 'CHOOSE_TILE', tile: 4 });
    expect(r.state.tiles[4].level).toBe(2);
  });

  it('upgrade_free without cities is a message', () => {
    const r = drawAndAck(newGame(), 'hibah');
    expect(ofType(r.events, 'message')).toHaveLength(1);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('downgrade_own drops the highest non-landmark building', () => {
    const g = newGame();
    own(g, 4, 'p1', 2);
    own(g, 6, 'p1', 3);
    own(g, 7, 'p1', 4);
    own(g, 9, 'p2', 3);
    const r = drawAndAck(g, 'banjir');
    expect(r.events).toEqual([{ type: 'build', playerId: 'p1', tile: 6, from: 3, to: 2 }]);
    expect(r.state.tiles[7].level).toBe(4);
  });

  it('downgrade_own with nothing to drop is a message', () => {
    const g = newGame();
    own(g, 4, 'p1', 0);
    own(g, 7, 'p1', 4);
    const r = drawAndAck(g, 'banjir');
    expect(ofType(r.events, 'build')).toEqual([]);
    expect(ofType(r.events, 'message')).toHaveLength(1);
  });

  it('festival_move moves the festival to one of my properties', () => {
    const g = newGame();
    own(g, 4, 'p1', 1);
    own(g, 5, 'p1');
    own(g, 9, 'p2');
    g.festivalTile = 9;
    const r = drawAndAck(g, 'festival');
    expect(r.state.pending).toEqual({ kind: 'choose_tile', purpose: 'card_festival', candidates: [4, 5], optional: true });
    const r2 = act(r.state, { type: 'CHOOSE_TILE', tile: 5 });
    expect(r2.state.festivalTile).toBe(5);
    expect(r2.events).toEqual([{ type: 'festival', playerId: 'p1', tile: 5 }]);
  });

  it('festival_move is optional', () => {
    const g = newGame();
    own(g, 4, 'p1', 1);
    const r = act(drawAndAck(g, 'festival').state, { type: 'SKIP' });
    expect(r.state.festivalTile).toBeNull();
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });

  it('force_sale sends an opponent property back to the bank with a refund', () => {
    const g = newGame({ players: 3 });
    own(g, 4, 'p2', 2);
    own(g, 7, 'p2', 4); // landmark: protected
    own(g, 9, 'p3', 0);
    own(g, 6, 'p1', 1); // mine: not a candidate
    g.festivalTile = 4;
    const r = drawAndAck(g, 'gusur');
    expect(r.state.pending).toEqual({ kind: 'choose_tile', purpose: 'force_sale', candidates: [4, 9], optional: true });
    const r2 = act(r.state, { type: 'CHOOSE_TILE', tile: 4 });
    const refund = sellValue(defs[4], 2);
    expect(r2.events).toEqual([
      { type: 'force_sale', byId: 'p1', ownerId: 'p2', tile: 4 },
      { type: 'transfer', from: null, to: 'p2', amount: refund, reason: 'force_sale', tile: 4 },
    ]);
    expect(r2.state.tiles[4]).toEqual({ owner: null, level: 0 });
    expect(r2.state.festivalTile).toBeNull();
    expect(player(r2.state, 'p2').cash).toBe(2000 + refund);
  });

  it('force_sale without targets is a message', () => {
    const r = drawAndAck(newGame(), 'gusur');
    expect(ofType(r.events, 'message')).toHaveLength(1);
    expect(r.state.pending).toEqual({ kind: 'end_turn', extraRoll: false });
  });
});
