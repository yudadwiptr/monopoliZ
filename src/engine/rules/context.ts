/**
 * Shared engine plumbing: the internal state shape, the mutable "context" every rule works on,
 * logging, events and money transfers.
 */
import { getMap } from '@/data/maps';
import { formatRp } from '@/lib/format';
import type {
  GameEvent,
  GameState,
  LogEntry,
  MapDef,
  PlayerState,
  TileDef,
  TileKind,
  TransferReason,
} from '../types';

export const LOG_CAP = 80;

/** What to do once a debt has been settled (directly or after raise_funds). */
export type Resume =
  | { kind: 'finish' } // → end of turn
  | { kind: 'acquire_offer'; tile: number } // toll paid → maybe offer acquisition
  | { kind: 'pay_each'; amount: number; remaining: string[] }; // keep paying the other players

export interface PendingDebt {
  amount: number;
  creditorId: string | null;
  reason: TransferReason;
  tile?: number;
  then: Resume;
}

/**
 * GameState plus engine-only bookkeeping. Every extra field is optional, underscore-prefixed and
 * JSON-serialisable so saves keep working.
 */
export interface EngineState extends GameState {
  /** Debt being settled while pending is `raise_funds`. */
  _resume?: PendingDebt;
  /** Monopoly threats already announced (`playerId|reason|missing`). */
  _alerts?: string[];
  /** The current turn earned another roll (doubles). */
  _extraRoll?: boolean;
}

export interface Ctx {
  s: EngineState;
  events: GameEvent[];
  map: MapDef;
  defs: TileDef[];
}

export class RuleError extends Error {}

export function fail(message: string): never {
  throw new RuleError(message);
}

export function makeCtx(state: GameState): Ctx {
  const s = state as EngineState;
  const map = getMap(s.mapId);
  return { s, events: [], map, defs: map.tiles };
}

export const rp = (n: number) => formatRp(n);

export function emit(ctx: Ctx, ev: GameEvent): void {
  ctx.events.push(ev);
}

export function log(ctx: Ctx, text: string, tone: LogEntry['tone'] = 'info', playerId: string | null = null): void {
  const s = ctx.s;
  s.logSeq += 1;
  s.log.push({ id: s.logSeq, round: s.round, playerId, text, tone });
  if (s.log.length > LOG_CAP) s.log.splice(0, s.log.length - LOG_CAP);
}

export function message(ctx: Ctx, text: string, tone: LogEntry['tone'] = 'info'): void {
  emit(ctx, { type: 'message', text, tone });
}

export function cur(ctx: Ctx): PlayerState {
  return ctx.s.players[ctx.s.current];
}

export function playerOf(ctx: Ctx, id: string): PlayerState {
  const p = ctx.s.players.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown player ${id}`);
  return p;
}

export function activeOf(ctx: Ctx): PlayerState[] {
  return ctx.s.players.filter((p) => !p.bankrupt);
}

export function tileIndexOf(ctx: Ctx, kind: TileKind): number {
  const t = ctx.defs.find((d) => d.kind === kind);
  if (!t) throw new Error(`Map has no ${kind} tile`);
  return t.index;
}

export function tileName(ctx: Ctx, index: number): string {
  return ctx.defs[index]?.name ?? `Petak ${index}`;
}

/**
 * Moves money and records the matching `transfer` event. The caller is responsible for making sure
 * the payer can afford it (cash never goes negative).
 */
export function transfer(
  ctx: Ctx,
  from: string | null,
  to: string | null,
  amount: number,
  reason: TransferReason,
  tile?: number,
): void {
  if (amount <= 0) return;
  if (from) {
    const p = playerOf(ctx, from);
    if (p.cash < amount) throw new Error(`Transfer would make ${from} negative`);
    p.cash -= amount;
  }
  if (to) playerOf(ctx, to).cash += amount;
  const ev: GameEvent = { type: 'transfer', from, to, amount, reason };
  if (tile !== undefined) ev.tile = tile;
  emit(ctx, ev);
}

/** Removes one held keep-card from a player and emits `card_used`. */
export function consumeCard(ctx: Ctx, player: PlayerState, card: PlayerState['cards'][number]): void {
  const idx = player.cards.indexOf(card);
  if (idx < 0) return;
  player.cards.splice(idx, 1);
  emit(ctx, { type: 'card_used', playerId: player.id, card });
}
