/**
 * Paying debts: direct payment, raise_funds (sell to the bank) and bankruptcy.
 */
import { liquidationValue, sellValue } from '../economy';
import type { TransferReason } from '../types';
import {
  activeOf,
  cur,
  emit,
  fail,
  log,
  message,
  playerOf,
  rp,
  tileName,
  transfer,
  type Ctx,
  type PendingDebt,
  type Resume,
} from './context';
import { offerAcquire } from './landing';
import { afterOwnershipChange, declareWinner, ownedBy, releaseTile } from './ownership';
import { advanceToNextPlayer, finishTurn } from './turn';

/**
 * The current player owes `amount`. Pays immediately when possible, otherwise asks them to sell
 * (raise_funds) or goes bankrupt when even selling everything is not enough.
 */
export function charge(
  ctx: Ctx,
  amount: number,
  creditorId: string | null,
  reason: TransferReason,
  tile: number | undefined,
  then: Resume,
): void {
  const p = cur(ctx);
  if (amount <= 0) {
    resume(ctx, then);
    return;
  }
  if (p.cash >= amount) {
    transfer(ctx, p.id, creditorId, amount, reason, tile);
    resume(ctx, then);
    return;
  }
  const debt: PendingDebt = { amount, creditorId, reason, tile, then };
  if (p.cash + liquidationValue(ctx.defs, ctx.s.tiles, p.id) >= amount) {
    ctx.s._resume = debt;
    ctx.s.pending = { kind: 'raise_funds', amount, creditorId, reason };
    message(ctx, `Duit kurang ${rp(amount - p.cash)}! Jual properti dulu biar bisa bayar.`, 'bad');
    log(ctx, `😰 ${p.name} harus bayar ${rp(amount)} tapi kasnya kurang. Waktunya jual aset!`, 'bad', p.id);
    return;
  }
  goBankrupt(ctx, creditorId);
}

/** Continues the flow after a debt has been paid. */
export function resume(ctx: Ctx, then: Resume): void {
  if (ctx.s.winner) return;
  switch (then.kind) {
    case 'finish':
      finishTurn(ctx);
      return;
    case 'acquire_offer':
      offerAcquire(ctx, then.tile);
      return;
    case 'pay_each':
      payEachNext(ctx, then.amount, then.remaining);
      return;
  }
}

/** Pays `amount` to each player in `remaining`, one creditor at a time. */
export function payEachNext(ctx: Ctx, amount: number, remaining: string[]): void {
  const [next, ...rest] = remaining.filter((id) => !playerOf(ctx, id).bankrupt);
  if (!next) {
    finishTurn(ctx);
    return;
  }
  charge(ctx, amount, next, 'card', undefined, { kind: 'pay_each', amount, remaining: rest });
}

/** SELL during raise_funds. */
export function sellTiles(ctx: Ctx, tiles: number[]): void {
  const s = ctx.s;
  const p = cur(ctx);
  const debt = s._resume;
  if (s.pending.kind !== 'raise_funds' || !debt) fail('Aksi tidak valid saat ini');
  if (!Array.isArray(tiles) || tiles.length === 0) fail('Pilih minimal satu properti untuk dijual');
  const unique = Array.from(new Set(tiles));
  if (unique.length !== tiles.length) fail('Properti yang dijual dobel');
  for (const t of unique) {
    if (!Number.isInteger(t) || s.tiles[t]?.owner !== p.id) fail('Properti itu bukan milikmu');
  }
  const values = unique.map((t) => sellValue(ctx.defs[t], s.tiles[t].level));
  unique.forEach((t) => releaseTile(ctx, t));
  emit(ctx, { type: 'sell', playerId: p.id, tiles: unique });
  unique.forEach((t, k) => transfer(ctx, null, p.id, values[k], 'sell', t));
  const total = values.reduce((a, b) => a + b, 0);
  log(ctx, `🏷️ ${p.name} jual ${unique.map((t) => tileName(ctx, t)).join(', ')} ke bank (${rp(total)})`, 'bad', p.id);
  afterOwnershipChange(ctx, null);

  if (p.cash >= debt.amount) {
    s._resume = undefined;
    transfer(ctx, p.id, debt.creditorId, debt.amount, debt.reason, debt.tile);
    log(ctx, `✅ ${p.name} berhasil lunasin ${rp(debt.amount)}`, 'info', p.id);
    resume(ctx, debt.then);
    return;
  }
  if (ownedBy(ctx, p.id).length === 0) {
    // Nothing left to sell (should not happen: entry requires enough liquidation value).
    goBankrupt(ctx, debt.creditorId);
  }
}

/** BANKRUPT during raise_funds. */
export function declareBankrupt(ctx: Ctx): void {
  const debt = ctx.s._resume;
  if (ctx.s.pending.kind !== 'raise_funds' || !debt) fail('Aksi tidak valid saat ini');
  goBankrupt(ctx, debt.creditorId);
}

/**
 * The current player is out: the creditor gets everything they can raise (cash + liquidation),
 * all their tiles return to the bank. Then the game either ends or moves to the next player.
 */
export function goBankrupt(ctx: Ctx, creditorId: string | null): void {
  const s = ctx.s;
  const p = cur(ctx);
  const liquidation = liquidationValue(ctx.defs, s.tiles, p.id);
  const owned = ownedBy(ctx, p.id);
  if (liquidation > 0) transfer(ctx, null, p.id, liquidation, 'bankrupt');
  if (p.cash > 0) transfer(ctx, p.id, creditorId, p.cash, 'bankrupt');
  owned.forEach((t) => releaseTile(ctx, t));
  p.bankrupt = true;
  p.cards = [];
  p.islandTurns = 0;
  p.pendingFlight = false;
  s._resume = undefined;
  s._extraRoll = false;
  emit(ctx, { type: 'bankrupt', playerId: p.id, creditorId });
  const to = creditorId ? playerOf(ctx, creditorId).name : 'bank';
  log(ctx, `💀 ${p.name} BANGKRUT! Semua asetnya disita ${to}.`, 'bad', p.id);

  const alive = activeOf(ctx);
  if (alive.length === 1) {
    declareWinner(ctx, alive[0].id, 'bangkrut');
    return;
  }
  afterOwnershipChange(ctx, null);
  advanceToNextPlayer(ctx);
}
