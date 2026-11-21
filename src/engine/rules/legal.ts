/**
 * Representative legal actions for the current pending decision (used by bots, the store's fallback
 * and the fuzz tests). The first entry is always a sensible default.
 */
import { getMap } from '@/data/maps';
import { applyDiscount, purchaseCost, upgradeCost } from '../economy';
import type { Action, GameState } from '../types';

export function legalActions(state: GameState): Action[] {
  if (state.winner) return [];
  const p = state.players[state.current];
  if (!p || p.bankrupt) return [];
  const pending = state.pending;
  const defs = getMap(state.mapId).tiles;
  const hasDiscount = p.cards.includes('discount');
  switch (pending.kind) {
    case 'roll':
      return [{ type: 'ROLL' }];
    case 'island': {
      const out: Action[] = [{ type: 'ROLL' }];
      if (p.cash >= pending.fee) out.push({ type: 'PAY_ESCAPE' });
      if (p.cards.includes('escape')) out.push({ type: 'USE_ESCAPE_CARD' });
      return out;
    }
    case 'buy': {
      const out: Action[] = [];
      const def = defs[pending.tile];
      for (let level = 0; level <= pending.maxLevel; level++) {
        if (applyDiscount(purchaseCost(def, level), hasDiscount) <= p.cash) out.push({ type: 'BUY', level });
      }
      out.push({ type: 'SKIP' });
      return out;
    }
    case 'build': {
      const out: Action[] = [];
      const def = defs[pending.tile];
      for (let level = pending.fromLevel + 1; level <= pending.maxLevel; level++) {
        if (applyDiscount(upgradeCost(def, pending.fromLevel, level), hasDiscount) <= p.cash) {
          out.push({ type: 'BUILD', level });
        }
      }
      out.push({ type: 'SKIP' });
      return out;
    }
    case 'acquire': {
      const out: Action[] = [];
      if (pending.price <= p.cash) out.push({ type: 'ACQUIRE' });
      out.push({ type: 'SKIP' });
      return out;
    }
    case 'choose_tile': {
      const out: Action[] = pending.candidates.map((tile) => ({ type: 'CHOOSE_TILE', tile }) as Action);
      if (pending.optional) out.push({ type: 'SKIP' });
      return out;
    }
    case 'card':
      return [{ type: 'ACK' }];
    case 'raise_funds': {
      const out: Action[] = [];
      state.tiles.forEach((t, i) => {
        if (t.owner === p.id) out.push({ type: 'SELL', tiles: [i] });
      });
      out.push({ type: 'BANKRUPT' });
      return out;
    }
    case 'end_turn':
      return [{ type: 'END_TURN' }];
    case 'game_over':
      return [];
  }
}
