/**
 * Ownership bookkeeping: monopoly wins, "awas monopoli" alerts, festival cleanup and
 * candidate lists for tile-choosing prompts.
 */
import { LANDMARK_LEVEL, buildCap, isProperty, levelCost } from '../economy';
import { checkMonopolyWin, monopolyThreats, WIN_REASON_LABEL } from '../selectors';
import type { WinReason } from '../types';
import { activeOf, cur, emit, log, playerOf, tileName, type Ctx } from './context';

const REASON_SHORT: Record<WinReason, string> = {
  bangkrut: 'bangkrut',
  monopoli_wisata: 'Monopoli Wisata',
  monopoli_jalur: 'Monopoli Jalur',
  monopoli_warna: 'Monopoli Triple Warna',
  batas_ronde: 'batas ronde',
};

/** Ends the game in favour of `playerId`. */
export function declareWinner(ctx: Ctx, playerId: string, reason: WinReason): void {
  const s = ctx.s;
  s.winner = { playerId, reason };
  s.pending = { kind: 'game_over' };
  s._resume = undefined;
  s._extraRoll = false;
  const p = playerOf(ctx, playerId);
  emit(ctx, { type: 'game_over', winnerId: playerId, reason });
  log(ctx, `🏆 ${p.name} menang! (${WIN_REASON_LABEL[reason]})`, 'good', playerId);
}

/**
 * Call after ANY ownership change. Checks the gainer for a monopoly win and announces new threats.
 * Returns true when the game just ended.
 */
export function afterOwnershipChange(ctx: Ctx, gainerId: string | null): boolean {
  const s = ctx.s;
  if (s.winner) return true;
  if (gainerId) {
    const win = checkMonopolyWin(ctx.map, s.tiles, gainerId);
    if (win) {
      declareWinner(ctx, gainerId, win);
      return true;
    }
  }
  refreshAlerts(ctx);
  return false;
}

function alertKey(playerId: string, reason: WinReason, missing: number[]): string {
  // Triple-colour threats can shift between groups a lot; announce them once per streak.
  if (reason === 'monopoli_warna') return `${playerId}|${reason}`;
  return `${playerId}|${reason}|${missing.slice().sort((a, b) => a - b).join(',')}`;
}

/** Emits `monopoly_alert` for threats that were not active before; forgets threats that vanished. */
export function refreshAlerts(ctx: Ctx): void {
  const s = ctx.s;
  const before = new Set(s._alerts ?? []);
  const now: string[] = [];
  for (const p of activeOf(ctx)) {
    for (const threat of monopolyThreats(ctx.map, s.tiles, p.id)) {
      const key = alertKey(p.id, threat.reason, threat.missing);
      if (now.includes(key)) continue;
      now.push(key);
      if (!before.has(key)) {
        emit(ctx, { type: 'monopoly_alert', playerId: p.id, reason: threat.reason, missing: threat.missing });
        const where = threat.missing.map((i) => tileName(ctx, i)).join(' / ');
        log(ctx, `⚠️ Awas! ${p.name} tinggal 1 petak lagi buat ${REASON_SHORT[threat.reason]} (${where})`, 'bad', p.id);
      }
    }
  }
  s._alerts = now;
}

/** Clears the festival if it sits on a tile that no longer has an owner. */
export function cleanupFestival(ctx: Ctx): void {
  const s = ctx.s;
  if (s.festivalTile !== null && !s.tiles[s.festivalTile]?.owner) s.festivalTile = null;
}

/** Puts a tile back to the bank. */
export function releaseTile(ctx: Ctx, index: number): void {
  ctx.s.tiles[index] = { owner: null, level: 0 };
  if (ctx.s.festivalTile === index) ctx.s.festivalTile = null;
}

export function ownedBy(ctx: Ctx, playerId: string): number[] {
  const out: number[] = [];
  ctx.s.tiles.forEach((t, i) => {
    if (t.owner === playerId) out.push(i);
  });
  return out;
}

/** Own properties that can host the festival (everything except the current festival tile). */
export function festivalCandidates(ctx: Ctx, playerId: string): number[] {
  return ownedBy(ctx, playerId).filter((i) => isProperty(ctx.defs[i]) && i !== ctx.s.festivalTile);
}

/** Own cities that can go up exactly one level for free (card): any level below landmark. */
export function freeUpgradeCandidates(ctx: Ctx, playerId: string): number[] {
  return ownedBy(ctx, playerId).filter((i) => ctx.defs[i].kind === 'city' && ctx.s.tiles[i].level < LANDMARK_LEVEL);
}

/** Own cities that can go up one level when landing exactly on start (lap cap + affordable). */
export function startUpgradeCandidates(ctx: Ctx, playerId: string): number[] {
  const p = playerOf(ctx, playerId);
  return ownedBy(ctx, playerId).filter((i) => {
    const def = ctx.defs[i];
    const level = ctx.s.tiles[i].level;
    if (def.kind !== 'city' || level >= LANDMARK_LEVEL) return false;
    if (level + 1 > buildCap(p.laps, level)) return false;
    return levelCost(def, level + 1) <= p.cash;
  });
}

/** Opponents' non-landmark properties (force sale card). */
export function forceSaleCandidates(ctx: Ctx): number[] {
  const me = cur(ctx).id;
  const out: number[] = [];
  ctx.s.tiles.forEach((t, i) => {
    if (!t.owner || t.owner === me) return;
    if (ctx.defs[i].kind === 'city' && t.level >= LANDMARK_LEVEL) return;
    out.push(i);
  });
  return out;
}
