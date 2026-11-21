/**
 * Action handlers: validates an Action against the pending decision and applies it to the context.
 */
import {
  ISLAND_ESCAPE_FEE,
  LANDMARK_LEVEL,
  MAX_DOUBLES,
  parityChargesOf,
  applyDiscount,
  levelCost,
  purchaseCost,
  sellValue,
  upgradeCost,
} from '../economy';
import { random, rollDie } from '../rng';
import type { Action, Parity, Pending } from '../types';
import { applyCard } from './cards';
import { consumeCard, cur, emit, fail, log, rp, tileIndexOf, tileName, transfer, type Ctx } from './context';
import { emitBuild, levelLabel, offerBuild, resolveLanding } from './landing';
import { fly, sendToIsland, walk } from './movement';
import { afterOwnershipChange, releaseTile } from './ownership';
import { declareBankrupt, sellTiles } from './payment';
import { endTurn, finishTurn } from './turn';

const INVALID = 'Aksi tidak valid saat ini';
const NO_MONEY = 'Uang tidak cukup';

type PendingOf<K extends Pending['kind']> = Extract<Pending, { kind: K }>;

function expect<K extends Pending['kind']>(ctx: Ctx, kind: K): PendingOf<K> {
  const p = ctx.s.pending;
  if (p.kind !== kind) fail(INVALID);
  return p as PendingOf<K>;
}

export function dispatchAction(ctx: Ctx, action: Action): void {
  if (ctx.s.winner || ctx.s.pending.kind === 'game_over') fail('Permainan sudah selesai');
  if (!action || typeof action !== 'object') fail(INVALID);
  switch (action.type) {
    case 'ROLL':
      if (ctx.s.pending.kind === 'island') islandRoll(ctx, action.power, action.parity);
      else normalRoll(ctx, action.power, action.parity);
      return;
    case 'PAY_ESCAPE':
      payEscape(ctx);
      return;
    case 'USE_ESCAPE_CARD':
      useEscapeCard(ctx);
      return;
    case 'BUY':
      buy(ctx, action.level);
      return;
    case 'BUILD':
      build(ctx, action.level);
      return;
    case 'ACQUIRE':
      acquire(ctx);
      return;
    case 'CHOOSE_TILE':
      chooseTile(ctx, action.tile);
      return;
    case 'SKIP':
      skip(ctx);
      return;
    case 'ACK':
      applyCard(ctx);
      return;
    case 'SELL':
      sellTiles(ctx, action.tiles);
      return;
    case 'BANKRUPT':
      declareBankrupt(ctx);
      return;
    case 'END_TURN':
      expect(ctx, 'end_turn');
      endTurn(ctx);
      return;
    default:
      fail(INVALID);
  }
}

// ───────────────────────────── Dice ─────────────────────────────

/**
 * Two d6. With a gauge `power` (0..1), half of the time the engine re-samples up to 3 times and keeps
 * the roll whose sum is closest to 2 + power × 10.
 */
export function rollDice(ctx: Ctx, power: number | undefined): [number, number] {
  const s = ctx.s;
  let best: [number, number] = [rollDie(s), rollDie(s)];
  if (typeof power === 'number' && Number.isFinite(power) && random(s) < 0.5) {
    const target = 2 + Math.min(1, Math.max(0, power)) * 10;
    const dist = (d: [number, number]) => Math.abs(d[0] + d[1] - target);
    for (let k = 0; k < 3 && dist(best) > 0; k++) {
      const cand: [number, number] = [rollDie(s), rollDie(s)];
      if (dist(cand) < dist(best)) best = cand;
    }
  }
  return best;
}

export function matchesParity(dice: [number, number], parity: Parity): boolean {
  return ((dice[0] + dice[1]) % 2 === 0) === (parity === 'genap');
}

/** Gauge roll, plus the Genap/Ganjil pick: a non-matching result is re-rolled once (~75% match). */
function throwDice(
  ctx: Ctx,
  power: number | undefined,
  parity: Parity | undefined,
): { dice: [number, number]; doubles: boolean; sum: number } {
  const pick = parity === 'genap' || parity === 'ganjil' ? parity : undefined;
  if (pick) {
    const p = cur(ctx);
    const left = parityChargesOf(p);
    if (left <= 0) fail('Jatah Genap/Ganjil habis — isi lagi dengan lewat Start');
    p.parityCharges = left - 1;
  }
  let dice = rollDice(ctx, power);
  if (pick && !matchesParity(dice, pick)) dice = rollDice(ctx, power);
  const doubles = dice[0] === dice[1];
  ctx.s.lastDice = dice;
  emit(ctx, { type: 'dice', playerId: cur(ctx).id, dice, doubles });
  return { dice, doubles, sum: dice[0] + dice[1] };
}

function normalRoll(ctx: Ctx, power: number | undefined, parity?: Parity): void {
  expect(ctx, 'roll');
  const s = ctx.s;
  const p = cur(ctx);
  const { dice, doubles, sum } = throwDice(ctx, power, parity);
  s.doublesInRow = doubles ? s.doublesInRow + 1 : 0;
  log(ctx, `🎲 ${p.name} lempar ${dice[0]} + ${dice[1]} = ${sum}${doubles ? ' (DOUBLE!)' : ''}`, 'info', p.id);
  if (doubles && s.doublesInRow >= MAX_DOUBLES) {
    sendToIsland(ctx, `dapat double ${MAX_DOUBLES}× berturut-turut`);
    finishTurn(ctx);
    return;
  }
  s._extraRoll = doubles;
  walk(ctx, sum);
  resolveLanding(ctx);
}

// ───────────────────────────── Island ─────────────────────────────

function escapeIsland(ctx: Ctx): void {
  const p = cur(ctx);
  p.islandTurns = 0;
  emit(ctx, { type: 'island', playerId: p.id, turnsLeft: 0, escaped: true });
}

function islandRoll(ctx: Ctx, power: number | undefined, parity?: Parity): void {
  expect(ctx, 'island');
  const s = ctx.s;
  const p = cur(ctx);
  const { dice, doubles, sum } = throwDice(ctx, power, parity);
  s.doublesInRow = 0;
  s._extraRoll = false;
  if (doubles) {
    escapeIsland(ctx);
    log(ctx, `🚤 ${p.name} dapat double ${dice[0]}-${dice[1]}, kabur dari pulau!`, 'good', p.id);
  } else {
    p.islandTurns -= 1;
    if (p.islandTurns > 0) {
      emit(ctx, { type: 'island', playerId: p.id, turnsLeft: p.islandTurns, escaped: false });
      log(ctx, `🏝️ ${p.name} belum beruntung (${sum}). Sisa ${p.islandTurns} giliran di pulau.`, 'bad', p.id);
      finishTurn(ctx);
      return;
    }
    escapeIsland(ctx);
    log(ctx, `⛵ Masa terdampar ${p.name} habis, lanjut jalan ${sum} langkah`, 'info', p.id);
  }
  walk(ctx, sum);
  resolveLanding(ctx);
}

function payEscape(ctx: Ctx): void {
  expect(ctx, 'island');
  const p = cur(ctx);
  if (p.cash < ISLAND_ESCAPE_FEE) fail(NO_MONEY);
  transfer(ctx, p.id, null, ISLAND_ESCAPE_FEE, 'island_fee', tileIndexOf(ctx, 'island'));
  escapeIsland(ctx);
  log(ctx, `🚤 ${p.name} bayar ${rp(ISLAND_ESCAPE_FEE)} buat kabur dari pulau`, 'info', p.id);
  ctx.s.pending = { kind: 'roll' };
}

function useEscapeCard(ctx: Ctx): void {
  expect(ctx, 'island');
  const p = cur(ctx);
  if (!p.cards.includes('escape')) fail('Kamu tidak punya kartu itu');
  consumeCard(ctx, p, 'escape');
  escapeIsland(ctx);
  log(ctx, `🛟 ${p.name} pakai kartu Bebas Terdampar!`, 'good', p.id);
  ctx.s.pending = { kind: 'roll' };
}

// ───────────────────────────── Property decisions ─────────────────────────────

function assertLevel(level: unknown, min: number, max: number): asserts level is number {
  if (typeof level !== 'number' || !Number.isInteger(level) || level < min || level > max) fail('Level tidak valid');
}

function buy(ctx: Ctx, level: number): void {
  const pending = expect(ctx, 'buy');
  const s = ctx.s;
  const p = cur(ctx);
  const index = pending.tile;
  const def = ctx.defs[index];
  assertLevel(level, 0, pending.maxLevel);
  if (s.tiles[index].owner) fail(INVALID);
  const discount = p.cards.includes('discount');
  const cost = applyDiscount(purchaseCost(def, level), discount);
  if (cost > p.cash) fail(NO_MONEY);
  if (discount) consumeCard(ctx, p, 'discount');
  transfer(ctx, p.id, null, cost, 'buy', index);
  s.tiles[index] = { owner: p.id, level };
  emit(ctx, { type: 'buy', playerId: p.id, tile: index, level });
  log(ctx, `🛒 ${p.name} beli ${def.name} (${levelLabel(ctx, index, level)}) seharga ${rp(cost)}`, 'good', p.id);
  if (afterOwnershipChange(ctx, p.id)) return;
  finishTurn(ctx);
}

function build(ctx: Ctx, level: number): void {
  const pending = expect(ctx, 'build');
  const s = ctx.s;
  const p = cur(ctx);
  const index = pending.tile;
  const def = ctx.defs[index];
  if (s.tiles[index].owner !== p.id || s.tiles[index].level !== pending.fromLevel) fail(INVALID);
  assertLevel(level, pending.fromLevel + 1, pending.maxLevel);
  const discount = p.cards.includes('discount');
  const cost = applyDiscount(upgradeCost(def, pending.fromLevel, level), discount);
  if (cost > p.cash) fail(NO_MONEY);
  if (discount) consumeCard(ctx, p, 'discount');
  transfer(ctx, p.id, null, cost, 'build', index);
  emitBuild(ctx, index, pending.fromLevel, level);
  const tone = level === LANDMARK_LEVEL ? '🏛️ LANDMARK!' : '🏗️';
  log(ctx, `${tone} ${p.name} bangun ${levelLabel(ctx, index, level)} di ${def.name} (${rp(cost)})`, 'good', p.id);
  finishTurn(ctx);
}

function acquire(ctx: Ctx): void {
  const pending = expect(ctx, 'acquire');
  const s = ctx.s;
  const p = cur(ctx);
  const index = pending.tile;
  const tile = s.tiles[index];
  if (tile.owner !== pending.ownerId) fail(INVALID);
  if (pending.price > p.cash) fail(NO_MONEY);
  const fromId = pending.ownerId;
  const fromName = s.players.find((x) => x.id === fromId)?.name ?? 'lawan';
  transfer(ctx, p.id, fromId, pending.price, 'acquire', index);
  tile.owner = p.id;
  emit(ctx, { type: 'acquire', playerId: p.id, fromId, tile: index });
  log(ctx, `🤝 ${p.name} akuisisi ${tileName(ctx, index)} dari ${fromName} seharga ${rp(pending.price)}!`, 'info', p.id);
  if (afterOwnershipChange(ctx, p.id)) return;
  if (ctx.defs[index].kind === 'city') offerBuild(ctx, index);
  else finishTurn(ctx);
}

// ───────────────────────────── Tile choices ─────────────────────────────

function chooseTile(ctx: Ctx, index: number): void {
  const pending = expect(ctx, 'choose_tile');
  const s = ctx.s;
  const p = cur(ctx);
  if (typeof index !== 'number' || !pending.candidates.includes(index)) fail('Petak tidak bisa dipilih');
  switch (pending.purpose) {
    case 'airport':
      fly(ctx, index);
      resolveLanding(ctx);
      return;
    case 'festival':
    case 'card_festival': {
      if (s.tiles[index].owner !== p.id) fail('Petak tidak bisa dipilih');
      s.festivalTile = index;
      emit(ctx, { type: 'festival', playerId: p.id, tile: index });
      log(ctx, `🎆 ${p.name} bikin pesta di ${tileName(ctx, index)}! Sewa jadi 2×`, 'good', p.id);
      finishTurn(ctx);
      return;
    }
    case 'start_upgrade': {
      const tile = s.tiles[index];
      if (tile.owner !== p.id || tile.level >= LANDMARK_LEVEL) fail('Petak tidak bisa dipilih');
      const cost = levelCost(ctx.defs[index], tile.level + 1);
      if (cost > p.cash) fail(NO_MONEY);
      transfer(ctx, p.id, null, cost, 'build', index);
      const from = tile.level;
      emitBuild(ctx, index, from, from + 1);
      log(ctx, `🏗️ ${p.name} upgrade ${tileName(ctx, index)} jadi ${levelLabel(ctx, index, from + 1)} (${rp(cost)})`, 'good', p.id);
      finishTurn(ctx);
      return;
    }
    case 'card_upgrade': {
      const tile = s.tiles[index];
      if (tile.owner !== p.id || tile.level >= LANDMARK_LEVEL) fail('Petak tidak bisa dipilih');
      const from = tile.level;
      emitBuild(ctx, index, from, from + 1);
      log(ctx, `🏗️ ${p.name} upgrade gratis ${tileName(ctx, index)} jadi ${levelLabel(ctx, index, from + 1)}`, 'good', p.id);
      finishTurn(ctx);
      return;
    }
    case 'force_sale': {
      const tile = s.tiles[index];
      const ownerId = tile.owner;
      if (!ownerId || ownerId === p.id) fail('Petak tidak bisa dipilih');
      const refund = sellValue(ctx.defs[index], tile.level);
      const ownerName = s.players.find((x) => x.id === ownerId)?.name ?? 'lawan';
      releaseTile(ctx, index);
      emit(ctx, { type: 'force_sale', byId: p.id, ownerId, tile: index });
      transfer(ctx, null, ownerId, refund, 'force_sale', index);
      log(ctx, `🚜 ${tileName(ctx, index)} milik ${ownerName} digusur balik ke bank (refund ${rp(refund)})`, 'bad', p.id);
      afterOwnershipChange(ctx, null);
      finishTurn(ctx);
      return;
    }
  }
}

function skip(ctx: Ctx): void {
  const pending = ctx.s.pending;
  switch (pending.kind) {
    case 'buy':
    case 'build':
    case 'acquire':
      finishTurn(ctx);
      return;
    case 'choose_tile':
      if (!pending.optional) fail(INVALID);
      if (pending.purpose === 'airport') {
        log(ctx, `🛫 ${cur(ctx).name} batal terbang, lempar dadu aja`, 'info', cur(ctx).id);
        ctx.s.pending = { kind: 'roll' };
        return;
      }
      finishTurn(ctx);
      return;
    default:
      fail(INVALID);
  }
}
