/**
 * Turn lifecycle: ending a turn, advancing seats/rounds, the round limit and the opening
 * prompt of a turn (roll / island / airport).
 */
import { ISLAND_ESCAPE_FEE } from '../economy';
import { ranking } from '../selectors';
import { cur, emit, log, tileIndexOf, type Ctx } from './context';
import { declareWinner } from './ownership';

/** Landing fully resolved → wait for END_TURN (store auto-dispatches it). */
export function finishTurn(ctx: Ctx): void {
  const s = ctx.s;
  if (s.winner) return;
  const p = cur(ctx);
  const extraRoll = !!s._extraRoll && !p.bankrupt && p.islandTurns === 0;
  s.pending = { kind: 'end_turn', extraRoll };
}

/** Sets the opening pending decision for the current player's (new or extra) turn. */
export function openTurn(ctx: Ctx): void {
  const s = ctx.s;
  const p = cur(ctx);
  if (p.islandTurns > 0) {
    s.pending = {
      kind: 'island',
      turnsLeft: p.islandTurns,
      fee: ISLAND_ESCAPE_FEE,
      canPay: p.cash >= ISLAND_ESCAPE_FEE,
      hasCard: p.cards.includes('escape'),
    };
    return;
  }
  if (p.pendingFlight) {
    p.pendingFlight = false;
    const airport = tileIndexOf(ctx, 'airport');
    s.pending = {
      kind: 'choose_tile',
      purpose: 'airport',
      candidates: ctx.defs.map((d) => d.index).filter((i) => i !== airport),
      optional: true,
    };
    return;
  }
  s.pending = { kind: 'roll' };
}

/** Same player again (doubles). */
function startExtraTurn(ctx: Ctx): void {
  const s = ctx.s;
  const p = cur(ctx);
  s._extraRoll = false;
  s.turnCount += 1;
  emit(ctx, { type: 'turn_start', playerId: p.id, round: s.round });
  log(ctx, `🎲 ${p.name} dapat lempar lagi!`, 'good', p.id);
  openTurn(ctx);
}

/**
 * Hands the turn to the next non-bankrupt seat. Increments the round when wrapping around and
 * ends the game when the round limit is exceeded.
 */
export function advanceToNextPlayer(ctx: Ctx): void {
  const s = ctx.s;
  if (s.winner) return;
  const n = s.players.length;
  let next = s.current;
  for (let k = 1; k <= n; k++) {
    const idx = (s.current + k) % n;
    if (!s.players[idx].bankrupt) {
      next = idx;
      break;
    }
  }
  const wrapped = next <= s.current;
  if (wrapped) {
    const maxRounds = s.config.maxRounds;
    if (maxRounds !== null && maxRounds !== undefined && s.round + 1 > maxRounds) {
      endByRoundLimit(ctx);
      return;
    }
    s.round += 1;
  }
  s.current = next;
  s.doublesInRow = 0;
  s._extraRoll = false;
  s.turnCount += 1;
  const p = cur(ctx);
  emit(ctx, { type: 'turn_start', playerId: p.id, round: s.round });
  if (wrapped) log(ctx, `📅 Ronde ${s.round} dimulai!`, 'info');
  openTurn(ctx);
}

export function endTurn(ctx: Ctx): void {
  const s = ctx.s;
  const p = cur(ctx);
  if (s.pending.kind === 'end_turn' && s.pending.extraRoll && !p.bankrupt && p.islandTurns === 0) {
    startExtraTurn(ctx);
    return;
  }
  advanceToNextPlayer(ctx);
}

export function endByRoundLimit(ctx: Ctx): void {
  const top = ranking(ctx.s).find((r) => !r.player.bankrupt);
  if (!top) return;
  log(ctx, `⏰ Ronde habis! Saatnya hitung harta.`, 'info');
  declareWinner(ctx, top.player.id, 'batas_ronde');
}
