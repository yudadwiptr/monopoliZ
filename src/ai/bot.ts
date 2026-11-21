/**
 * Bot brain.
 * Contract:
 *  - decideBotAction(state): a LEGAL action for state.pending of the current (bot) player.
 *    For pending 'roll' / 'island' rolls, includes `power` (0..1) for the dice gauge.
 *
 * Personalities (player.botLevel):
 *  - mudah:  casual — buys a lot, random gauge, skips upgrades sometimes, rarely takes over.
 *  - sedang: rule-of-thumb — cash reserve vs. tolls ahead, completes sets, blocks obvious threats.
 *  - sulit:  utility-driven — dice-probability toll exposure, gauge aiming, monopoly denial, optimal sales.
 * Choices are deterministic for a given state (seeded from it), never Math.random.
 */
import type { Action, GameState } from '@/engine/types';
import { makeContext } from './context';
import { decideChooseTile } from './decide/chooseTile';
import { decideAcquire, decideBuild, decideBuy } from './decide/property';
import { decideRaiseFunds } from './decide/raiseFunds';
import { decideIsland, decideRoll } from './decide/roll';
import { fallbackAction, isLegalAction } from './legal';

/** Raw decision without the legality safety net (used by tests to surface bugs). */
export function planBotAction(state: GameState): Action {
  const p = state.pending;
  switch (p.kind) {
    case 'end_turn':
    case 'game_over':
      return { type: 'END_TURN' };
    case 'card':
      return { type: 'ACK' };
  }
  const ctx = makeContext(state, p.kind);
  switch (p.kind) {
    case 'roll':
      return decideRoll(ctx);
    case 'island':
      return decideIsland(ctx, p);
    case 'buy':
      return decideBuy(ctx, p);
    case 'build':
      return decideBuild(ctx, p);
    case 'acquire':
      return decideAcquire(ctx, p);
    case 'choose_tile':
      return decideChooseTile(ctx, p);
    case 'raise_funds':
      return decideRaiseFunds(ctx, p);
  }
}

export function decideBotAction(state: GameState): Action {
  let action: Action;
  try {
    action = planBotAction(state);
  } catch (e) {
    console.error('[bot] decision failed, using fallback', e);
    return fallbackAction(state);
  }
  return isLegalAction(state, action) ? action : fallbackAction(state);
}

export { isLegalAction, fallbackAction } from './legal';
