/**
 * Landing resolution: what happens on each tile kind, plus buy / build / acquire offers.
 */
import {
  LANDMARK_LEVEL,
  LEVEL_NAMES,
  acquirePrice,
  applyDiscount,
  buildCap,
  purchaseCost,
  taxFor,
  tollAt,
  upgradeCost,
} from '../economy';
import { drawCard } from './cards';
import { consumeCard, cur, emit, log, message, playerOf, rp, tileName, type Ctx } from './context';
import { festivalCandidates, startUpgradeCandidates } from './ownership';
import { charge } from './payment';
import { strandOnIsland } from './movement';
import { finishTurn } from './turn';

/** Resolves the tile the current player is standing on. Sets the next pending decision. */
export function resolveLanding(ctx: Ctx): void {
  const s = ctx.s;
  if (s.winner) return;
  const p = cur(ctx);
  const index = p.position;
  const def = ctx.defs[index];
  switch (def.kind) {
    case 'start': {
      const candidates = startUpgradeCandidates(ctx, p.id);
      if (candidates.length === 0) {
        finishTurn(ctx);
        return;
      }
      s.pending = { kind: 'choose_tile', purpose: 'start_upgrade', candidates, optional: true };
      return;
    }
    case 'island':
      strandOnIsland(ctx, 'mendarat di ' + def.name);
      finishTurn(ctx);
      return;
    case 'festival': {
      const candidates = festivalCandidates(ctx, p.id);
      if (candidates.length === 0) {
        message(ctx, 'Belum ada properti buat dijadiin tempat pesta 🎆', 'info');
        finishTurn(ctx);
        return;
      }
      s.pending = { kind: 'choose_tile', purpose: 'festival', candidates, optional: true };
      return;
    }
    case 'airport':
      p.pendingFlight = true;
      message(ctx, 'Siap terbang! Giliran depan bebas pilih tujuan ✈️', 'good');
      log(ctx, `🛫 ${p.name} sampai di ${def.name}, giliran depan bisa terbang ke mana aja`, 'info', p.id);
      finishTurn(ctx);
      return;
    case 'chance':
      drawCard(ctx);
      return;
    case 'tax': {
      const tax = taxFor(ctx.defs, s.tiles, p.id);
      if (tax <= 0) {
        message(ctx, 'Belum punya properti, bebas pajak! 😎', 'good');
        finishTurn(ctx);
        return;
      }
      log(ctx, `🧾 ${p.name} bayar pajak ${rp(tax)}`, 'bad', p.id);
      charge(ctx, tax, null, 'tax', index, { kind: 'finish' });
      return;
    }
    case 'city':
    case 'tourist':
      resolveProperty(ctx, index);
      return;
  }
}

function resolveProperty(ctx: Ctx, index: number): void {
  const s = ctx.s;
  const p = cur(ctx);
  const tile = s.tiles[index];
  if (!tile.owner) {
    offerBuy(ctx, index);
    return;
  }
  if (tile.owner === p.id) {
    if (ctx.defs[index].kind === 'city') offerBuild(ctx, index);
    else finishTurn(ctx);
    return;
  }
  payToll(ctx, index);
}

function offerBuy(ctx: Ctx, index: number): void {
  const p = cur(ctx);
  const def = ctx.defs[index];
  const discount = p.cards.includes('discount');
  const maxLevel = def.kind === 'tourist' ? 0 : buildCap(p.laps, -1);
  if (applyDiscount(purchaseCost(def, 0), discount) > p.cash) {
    message(ctx, `Duit belum cukup buat beli ${def.name} 😢`, 'info');
    finishTurn(ctx);
    return;
  }
  ctx.s.pending = { kind: 'buy', tile: index, maxLevel, discount };
}

/** Build prompt on an owned city (also used right after an acquisition). */
export function offerBuild(ctx: Ctx, index: number): void {
  const p = cur(ctx);
  const def = ctx.defs[index];
  const level = ctx.s.tiles[index].level;
  const maxLevel = buildCap(p.laps, level);
  const discount = p.cards.includes('discount');
  if (def.kind !== 'city' || level >= LANDMARK_LEVEL || maxLevel <= level) {
    // Get Rich Landmark Power: landing on your own Landmark automatically hosts the Festival (×2 toll) there!
    if (def.kind === 'city' && level >= LANDMARK_LEVEL && ctx.s.festivalTile !== index) {
      ctx.s.festivalTile = index;
      emit(ctx, { type: 'festival', playerId: p.id, tile: index });
      message(ctx, `🏛️✨ Landmark ${def.name} menggelar Pesta Agung (Sewa ×2)!`, 'good');
      log(ctx, `🏛️🎆 ${p.name} mampir di Landmark ${def.name} — otomatis jadi pusat Pesta (Sewa ×2)!`, 'good', p.id);
    }
    finishTurn(ctx);
    return;
  }
  if (applyDiscount(upgradeCost(def, level, level + 1), discount) > p.cash) {
    message(ctx, `Duit belum cukup buat upgrade ${def.name}`, 'info');
    finishTurn(ctx);
    return;
  }
  ctx.s.pending = { kind: 'build', tile: index, fromLevel: level, maxLevel, discount };
}

function payToll(ctx: Ctx, index: number): void {
  const s = ctx.s;
  const p = cur(ctx);
  const ownerId = s.tiles[index].owner as string;
  const owner = playerOf(ctx, ownerId);
  const toll = tollAt(ctx.defs, s.tiles, index, s.festivalTile);
  if (toll <= 0) {
    offerAcquire(ctx, index);
    return;
  }
  if (p.cards.includes('shield')) {
    consumeCard(ctx, p, 'shield');
    message(ctx, `🛡️ Asuransi aktif! ${p.name} bebas sewa ${rp(toll)}`, 'good');
    log(ctx, `🛡️ ${p.name} pakai Asuransi, gak jadi bayar sewa ${rp(toll)} ke ${owner.name}`, 'good', p.id);
    offerAcquire(ctx, index);
    return;
  }
  const festive = s.festivalTile === index ? ' (pesta ×2!)' : '';
  log(ctx, `💸 ${p.name} bayar sewa ${rp(toll)} ke ${owner.name} di ${tileName(ctx, index)}${festive}`, 'bad', p.id);
  charge(ctx, toll, ownerId, 'toll', index, { kind: 'acquire_offer', tile: index });
}

/** After paying (or dodging) a toll: offer to take the property over when allowed & affordable. */
export function offerAcquire(ctx: Ctx, index: number): void {
  const s = ctx.s;
  const p = cur(ctx);
  const def = ctx.defs[index];
  const tile = s.tiles[index];
  if (!tile.owner || tile.owner === p.id || (def.kind === 'city' && tile.level >= LANDMARK_LEVEL)) {
    finishTurn(ctx);
    return;
  }
  const price = acquirePrice(def, tile.level);
  if (price > p.cash) {
    finishTurn(ctx);
    return;
  }
  s.pending = { kind: 'acquire', tile: index, price, ownerId: tile.owner };
}

/** Human readable name of a level on a tile ("Hotel", "Destinasi"). */
export function levelLabel(ctx: Ctx, index: number, level: number): string {
  return ctx.defs[index].kind === 'tourist' ? 'Destinasi' : LEVEL_NAMES[level];
}

export function emitBuild(ctx: Ctx, index: number, from: number, to: number): void {
  const p = cur(ctx);
  ctx.s.tiles[index].level = to;
  emit(ctx, { type: 'build', playerId: p.id, tile: index, from, to });
}
