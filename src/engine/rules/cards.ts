/**
 * Kartu Rezeki: drawing and applying card effects.
 */
import { BOARD_SIZE, forwardDistance } from '@/data/layout';
import { buildDeck, getCard, KEEP_CARD_INFO } from '@/data/cards';
import { LANDMARK_LEVEL } from '../economy';
import { shuffle } from '../rng';
import type { CardMoveTarget, KeepCard } from '../types';
import { activeOf, cur, emit, fail, log, message, rp, tileIndexOf, tileName, transfer, type Ctx } from './context';
import { emitBuild, resolveLanding } from './landing';
import { sendToIsland, walk } from './movement';
import { festivalCandidates, forceSaleCandidates, freeUpgradeCandidates, ownedBy } from './ownership';
import { charge, payEachNext } from './payment';
import { finishTurn } from './turn';

/** Bonus when drawing a keep-card the player already holds. */
export const DUPLICATE_CARD_BONUS = 50;

/** Draws the top card (reshuffling a fresh deck when empty) and asks the player to read it. */
export function drawCard(ctx: Ctx): void {
  const s = ctx.s;
  const p = cur(ctx);
  if (s.deck.length === 0) {
    s.deck = shuffle(s, buildDeck());
    log(ctx, '🔀 Tumpukan Kartu Rezeki dikocok ulang', 'info');
  }
  const cardId = s.deck.shift() as string;
  const card = getCard(cardId);
  emit(ctx, { type: 'card', playerId: p.id, cardId });
  log(ctx, `${card.emoji} ${p.name} dapat kartu "${card.title}"`, card.tone === 'bad' ? 'bad' : card.tone === 'good' ? 'good' : 'info', p.id);
  s.pending = { kind: 'card', cardId };
}

/** ACK on a `card` pending: applies the effect. */
export function applyCard(ctx: Ctx): void {
  const s = ctx.s;
  if (s.pending.kind !== 'card') fail('Aksi tidak valid saat ini');
  const card = getCard(s.pending.cardId);
  const p = cur(ctx);
  const e = card.effect;
  switch (e.type) {
    case 'gain':
      transfer(ctx, null, p.id, e.amount, 'card');
      finishTurn(ctx);
      return;
    case 'pay':
      charge(ctx, e.amount, null, 'card', undefined, { kind: 'finish' });
      return;
    case 'pay_percent_cash': {
      const amount = Math.min(p.cash, Math.round((p.cash * e.percent) / 100));
      transfer(ctx, p.id, null, amount, 'card');
      if (amount > 0) log(ctx, `📉 ${p.name} kehilangan ${rp(amount)}`, 'bad', p.id);
      finishTurn(ctx);
      return;
    }
    case 'collect_each': {
      let total = 0;
      for (const other of activeOf(ctx)) {
        if (other.id === p.id) continue;
        const amount = Math.min(e.amount, other.cash);
        transfer(ctx, other.id, p.id, amount, 'card');
        total += amount;
      }
      if (total > 0) log(ctx, `🎉 ${p.name} terima total ${rp(total)} dari pemain lain`, 'good', p.id);
      finishTurn(ctx);
      return;
    }
    case 'pay_each': {
      const others = activeOf(ctx)
        .filter((o) => o.id !== p.id)
        .map((o) => o.id);
      payEachNext(ctx, e.amount, others);
      return;
    }
    case 'move_to':
      moveToTarget(ctx, e.target);
      return;
    case 'move_by':
      walk(ctx, e.steps);
      resolveLanding(ctx);
      return;
    case 'keep':
      keepCard(ctx, e.card);
      finishTurn(ctx);
      return;
    case 'upgrade_free': {
      const candidates = freeUpgradeCandidates(ctx, p.id);
      if (candidates.length === 0) {
        message(ctx, 'Belum ada kota yang bisa di-upgrade. Sayang banget!', 'info');
        finishTurn(ctx);
        return;
      }
      s.pending = { kind: 'choose_tile', purpose: 'card_upgrade', candidates, optional: true };
      return;
    }
    case 'downgrade_own':
      downgradeOwn(ctx);
      finishTurn(ctx);
      return;
    case 'pay_per_building': {
      const levels = ownedBy(ctx, p.id).reduce(
        (sum, i) => sum + (ctx.defs[i].kind === 'city' ? s.tiles[i].level : 0),
        0,
      );
      if (levels === 0) {
        message(ctx, 'Belum punya bangunan, aman dari pajak mewah 😎', 'good');
        finishTurn(ctx);
        return;
      }
      charge(ctx, levels * e.amount, null, 'card', undefined, { kind: 'finish' });
      return;
    }
    case 'festival_move': {
      const candidates = festivalCandidates(ctx, p.id);
      if (candidates.length === 0) {
        message(ctx, 'Belum ada properti buat dijadiin tempat pesta 🎆', 'info');
        finishTurn(ctx);
        return;
      }
      s.pending = { kind: 'choose_tile', purpose: 'card_festival', candidates, optional: true };
      return;
    }
    case 'force_sale': {
      const candidates = forceSaleCandidates(ctx);
      if (candidates.length === 0) {
        message(ctx, 'Gak ada properti lawan yang bisa digusur', 'info');
        finishTurn(ctx);
        return;
      }
      s.pending = { kind: 'choose_tile', purpose: 'force_sale', candidates, optional: true };
      return;
    }
  }
}

function targetIndex(ctx: Ctx, target: CardMoveTarget, from: number): number {
  if (target === 'nearest_tourist') {
    let best = -1;
    let bestDist = BOARD_SIZE + 1;
    for (const d of ctx.defs) {
      if (d.kind !== 'tourist') continue;
      const dist = forwardDistance(from, d.index);
      if (dist > 0 && dist < bestDist) {
        best = d.index;
        bestDist = dist;
      }
    }
    return best;
  }
  return tileIndexOf(ctx, target);
}

function moveToTarget(ctx: Ctx, target: CardMoveTarget): void {
  const p = cur(ctx);
  if (target === 'island') {
    sendToIsland(ctx, 'salah naik kapal');
    finishTurn(ctx);
    return;
  }
  const to = targetIndex(ctx, target, p.position);
  if (to < 0) {
    finishTurn(ctx);
    return;
  }
  const steps = forwardDistance(p.position, to);
  if (steps > 0) walk(ctx, steps);
  resolveLanding(ctx);
}

function keepCard(ctx: Ctx, card: KeepCard): void {
  const p = cur(ctx);
  const info = KEEP_CARD_INFO[card];
  if (p.cards.includes(card)) {
    transfer(ctx, null, p.id, DUPLICATE_CARD_BONUS, 'card');
    message(ctx, `Udah punya kartu ${info.name}, dituker jadi ${rp(DUPLICATE_CARD_BONUS)} 💰`, 'good');
    log(ctx, `${info.emoji} Kartu ${info.name} dobel, ${p.name} dapat ${rp(DUPLICATE_CARD_BONUS)}`, 'good', p.id);
    return;
  }
  p.cards.push(card);
  log(ctx, `${info.emoji} ${p.name} simpan kartu ${info.name}`, 'good', p.id);
}

/** Banjir: highest non-landmark building of the current player loses one level (engine picks). */
function downgradeOwn(ctx: Ctx): void {
  const s = ctx.s;
  const p = cur(ctx);
  let pick = -1;
  for (const i of ownedBy(ctx, p.id)) {
    if (ctx.defs[i].kind !== 'city') continue;
    const level = s.tiles[i].level;
    if (level < 1 || level >= LANDMARK_LEVEL) continue;
    if (pick < 0 || level > s.tiles[pick].level) pick = i;
  }
  if (pick < 0) {
    message(ctx, 'Untung belum punya bangunan, aman dari banjir!', 'good');
    return;
  }
  const from = s.tiles[pick].level;
  emitBuild(ctx, pick, from, from - 1);
  log(ctx, `🌊 Bangunan ${p.name} di ${tileName(ctx, pick)} turun jadi level ${from - 1}`, 'bad', p.id);
}
