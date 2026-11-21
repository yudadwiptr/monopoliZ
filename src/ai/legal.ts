/**
 * Conservative legality check of a bot action against the current pending decision, mirroring SPEC §1.
 * Used as a last line of defence so the bot never hands the engine something it would reject.
 */
import { applyDiscount, purchaseCost, sellValue, upgradeCost } from '@/engine/economy';
import { defsOf } from '@/engine/selectors';
import type { Action, GameState } from '@/engine/types';

export function isLegalAction(state: GameState, action: Action): boolean {
  const p = state.pending;
  const me = state.players[state.current];
  if (!me) return false;
  switch (p.kind) {
    case 'roll':
      return action.type === 'ROLL' && validPower(action.power);
    case 'island':
      if (action.type === 'ROLL') return validPower(action.power);
      if (action.type === 'PAY_ESCAPE') return p.canPay && me.cash >= p.fee;
      if (action.type === 'USE_ESCAPE_CARD') return p.hasCard;
      return false;
    case 'buy': {
      if (action.type === 'SKIP') return true;
      if (action.type !== 'BUY') return false;
      const def = defsOf(state)[p.tile];
      const top = def.kind === 'tourist' ? 0 : p.maxLevel;
      if (!Number.isInteger(action.level) || action.level < 0 || action.level > top) return false;
      return applyDiscount(purchaseCost(def, action.level), p.discount) <= me.cash;
    }
    case 'build': {
      if (action.type === 'SKIP') return true;
      if (action.type !== 'BUILD') return false;
      const def = defsOf(state)[p.tile];
      if (!Number.isInteger(action.level) || action.level <= p.fromLevel || action.level > p.maxLevel) return false;
      return applyDiscount(upgradeCost(def, p.fromLevel, action.level), p.discount) <= me.cash;
    }
    case 'acquire':
      if (action.type === 'SKIP') return true;
      return action.type === 'ACQUIRE' && me.cash >= p.price;
    case 'choose_tile':
      if (action.type === 'SKIP') return p.optional || p.candidates.length === 0;
      return action.type === 'CHOOSE_TILE' && p.candidates.includes(action.tile);
    case 'card':
      return action.type === 'ACK';
    case 'raise_funds': {
      if (action.type === 'BANKRUPT') return true;
      if (action.type !== 'SELL' || action.tiles.length === 0) return false;
      const unique = new Set(action.tiles);
      return unique.size === action.tiles.length && action.tiles.every((i) => state.tiles[i]?.owner === me.id);
    }
    case 'end_turn':
    case 'game_over':
      return action.type === 'END_TURN';
  }
  return false;
}

function validPower(power: number | undefined): boolean {
  return power === undefined || (Number.isFinite(power) && power >= 0 && power <= 1);
}

/** A safe, always-legal action for the current pending decision. */
export function fallbackAction(state: GameState): Action {
  const p = state.pending;
  const me = state.players[state.current];
  switch (p.kind) {
    case 'roll':
    case 'island':
      return { type: 'ROLL', power: 0.5 };
    case 'buy':
    case 'build':
    case 'acquire':
      return { type: 'SKIP' };
    case 'choose_tile':
      return p.optional || p.candidates.length === 0 ? { type: 'SKIP' } : { type: 'CHOOSE_TILE', tile: p.candidates[0] };
    case 'card':
      return { type: 'ACK' };
    case 'raise_funds': {
      if (!me) return { type: 'BANKRUPT' };
      const defs = defsOf(state);
      const owned = state.tiles
        .map((t, i) => ({ i, t }))
        .filter(({ t }) => t.owner === me.id)
        .map(({ i, t }) => ({ i, v: sellValue(defs[i], t.level) }))
        .sort((a, b) => a.v - b.v);
      const need = p.amount - me.cash;
      const total = owned.reduce((s, o) => s + o.v, 0);
      if (owned.length === 0 || total < need) return { type: 'BANKRUPT' };
      const tiles: number[] = [];
      let sum = 0;
      for (const o of owned) {
        tiles.push(o.i);
        sum += o.v;
        if (sum >= need) break;
      }
      return { type: 'SELL', tiles };
    }
    case 'end_turn':
    case 'game_over':
      return { type: 'END_TURN' };
  }
}
