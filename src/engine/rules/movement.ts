/**
 * Token movement: walking (with salary when passing/landing on start), jumping and flying.
 */
import { BOARD_SIZE, wrap } from '@/data/layout';
import { ISLAND_MAX_TURNS, PARITY_CHARGES, parityChargesOf } from '../economy';
import { cur, emit, log, rp, tileIndexOf, tileName, transfer, type Ctx } from './context';

export function paySalary(ctx: Ctx): void {
  const p = cur(ctx);
  const salary = ctx.s.config.salary;
  p.laps += 1;
  p.parityCharges = Math.min(PARITY_CHARGES, parityChargesOf(p) + 1);
  transfer(ctx, null, p.id, salary, 'salary', 0);
  log(ctx, `💸 ${p.name} lewat ${tileName(ctx, 0)}, gajian ${rp(salary)}!`, 'good', p.id);
}

/**
 * Walks the current player `steps` tiles (negative = backwards, never pays salary).
 * Returns true when start was passed or landed on going forward.
 */
export function walk(ctx: Ctx, steps: number): boolean {
  const p = cur(ctx);
  const from = p.position;
  const to = wrap(from + steps);
  p.position = to;
  emit(ctx, { type: 'move', playerId: p.id, from, to, steps, mode: 'walk' });
  const passedStart = steps > 0 && from + steps >= BOARD_SIZE;
  if (passedStart) paySalary(ctx);
  return passedStart;
}

/** Flies from the airport to `to`; wrapping past start pays salary. */
export function fly(ctx: Ctx, to: number): void {
  const p = cur(ctx);
  const from = p.position;
  p.position = to;
  emit(ctx, { type: 'move', playerId: p.id, from, to, steps: 0, mode: 'fly' });
  log(ctx, `✈️ ${p.name} terbang ke ${tileName(ctx, to)}`, 'info', p.id);
  if (to < from) paySalary(ctx);
}

/** Teleports the current player to the island and starts the island countdown. Ends the turn. */
export function sendToIsland(ctx: Ctx, why: string): void {
  const s = ctx.s;
  const p = cur(ctx);
  const island = tileIndexOf(ctx, 'island');
  const from = p.position;
  p.position = island;
  if (from !== island) emit(ctx, { type: 'move', playerId: p.id, from, to: island, steps: 0, mode: 'jump' });
  strandOnIsland(ctx, why);
  s.doublesInRow = 0;
}

/** Player is on the island tile → stuck for ISLAND_MAX_TURNS turns, no extra roll. */
export function strandOnIsland(ctx: Ctx, why: string): void {
  const s = ctx.s;
  const p = cur(ctx);
  p.islandTurns = ISLAND_MAX_TURNS;
  s._extraRoll = false;
  emit(ctx, { type: 'island', playerId: p.id, turnsLeft: ISLAND_MAX_TURNS, escaped: false });
  log(ctx, `🏝️ ${p.name} ${why} — terdampar ${ISLAND_MAX_TURNS} giliran!`, 'bad', p.id);
}
