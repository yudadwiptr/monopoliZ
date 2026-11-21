/**
 * raise_funds: sell a set of tiles that covers the debt with the least strategic damage.
 * Bankruptcy is only declared when selling everything still can't cover it.
 */
import { investedValue, sellValue, tollAt } from '@/engine/economy';
import { propertiesOf } from '@/engine/selectors';
import type { Action, Pending } from '@/engine/types';
import type { BotContext } from '../context';
import { strategicDelta, threatTiles, withTile } from '../strategy';
import { incomeDelta } from '../valuation';

type RaisePending = Extract<Pending, { kind: 'raise_funds' }>;

export interface SaleItem {
  tile: number;
  value: number;
  loss: number;
}

/** Strong-bot loss of selling one tile: asset haircut + lost income + monopoly progress lost/handed out. */
function strongLoss(ctx: BotContext, tile: number): number {
  const before = ctx.state.tiles;
  const t = before[tile];
  const def = ctx.defs[tile];
  const after = withTile(before, tile, null, 0);
  const haircut = investedValue(def, t.level) - sellValue(def, t.level);
  return haircut - incomeDelta(ctx, before, after, tile) - strategicDelta(ctx, before, after);
}

/** Rule-of-thumb loss for the 'sedang' bot. */
function simpleLoss(ctx: BotContext, tile: number, contested: Set<number>): number {
  const t = ctx.state.tiles[tile];
  const def = ctx.defs[tile];
  let loss = investedValue(def, t.level) * 0.5 + tollAt(ctx.defs, ctx.state.tiles, tile, ctx.state.festivalTile) * 2;
  if (contested.has(tile)) loss += 2_000; // selling would hand an opponent their monopoly tile
  if (def.kind === 'city' && def.group !== undefined) {
    const sameGroup = ctx.defs.filter((d) => d.kind === 'city' && d.group === def.group);
    if (sameGroup.every((d) => ctx.state.tiles[d.index]?.owner === ctx.me.id)) loss += 300;
  }
  return loss;
}

/** Minimum-loss subset whose value covers `need` (0/1 covering knapsack, capped at `need`). Null if impossible. */
export function minLossCover(items: SaleItem[], need: number): number[] | null {
  const total = items.reduce((s, it) => s + it.value, 0);
  if (total < need) return null;
  if (need <= 0) return [];
  const cap = Math.ceil(need);
  // layers[k][v] = least loss using the first k items to raise v (v === cap means "at least cap").
  const layers: Float64Array[] = [new Float64Array(cap + 1).fill(Infinity)];
  layers[0][0] = 0;
  for (const { value, loss } of items) {
    const prev = layers[layers.length - 1];
    const next = prev.slice();
    for (let v = 0; v <= cap; v++) {
      if (prev[v] === Infinity) continue;
      const to = Math.min(cap, v + value);
      if (prev[v] + loss < next[to]) next[to] = prev[v] + loss;
    }
    layers.push(next);
  }
  if (layers[items.length][cap] === Infinity) return null;

  const chosen: number[] = [];
  let at = cap;
  for (let k = items.length; k > 0 && at > 0; k--) {
    const cur = layers[k][at];
    if (cur === layers[k - 1][at]) continue; // item k-1 unused on the optimal path
    const { value, loss, tile } = items[k - 1];
    const lo = at === cap ? Math.max(0, cap - value) : at - value;
    let from = -1;
    for (let v = lo; v <= (at === cap ? cap : at - value); v++) {
      if (v >= 0 && Math.min(cap, v + value) === at && layers[k - 1][v] + loss === cur) {
        from = v;
        break;
      }
    }
    if (from < 0) return null;
    chosen.push(tile);
    at = from;
  }
  return at === 0 ? chosen : null;
}

/** Greedy cover by ascending loss-per-juta, then drop anything no longer needed (costliest first). */
export function greedyCover(items: SaleItem[], need: number): number[] | null {
  const total = items.reduce((s, it) => s + it.value, 0);
  if (total < need) return null;
  const sorted = [...items].sort((a, b) => a.loss / Math.max(1, a.value) - b.loss / Math.max(1, b.value));
  const picked: SaleItem[] = [];
  let sum = 0;
  for (const it of sorted) {
    if (sum >= need) break;
    picked.push(it);
    sum += it.value;
  }
  for (const it of [...picked].sort((a, b) => b.loss - a.loss)) {
    if (sum - it.value >= need) {
      picked.splice(picked.indexOf(it), 1);
      sum -= it.value;
    }
  }
  return picked.map((it) => it.tile);
}

export function decideRaiseFunds(ctx: BotContext, p: RaisePending): Action {
  const owned = propertiesOf(ctx.state, ctx.me.id);
  if (owned.length === 0) return { type: 'BANKRUPT' };
  const need = p.amount - ctx.me.cash;

  let items: SaleItem[];
  if (ctx.level === 'sulit') {
    items = owned.map((tile) => ({ tile, value: sellValueOf(ctx, tile), loss: strongLoss(ctx, tile) }));
  } else if (ctx.level === 'sedang') {
    const contested = threatTiles(ctx);
    items = owned.map((tile) => ({ tile, value: sellValueOf(ctx, tile), loss: simpleLoss(ctx, tile, contested) }));
  } else {
    // Casual: just dump the cheapest stuff.
    items = owned.map((tile) => ({ tile, value: sellValueOf(ctx, tile), loss: sellValueOf(ctx, tile) }));
  }
  // Zero-value tiles can't help pay the debt.
  const useful = items.filter((it) => it.value > 0);

  if (need <= 0) {
    // Shouldn't happen (cash already covers), but SELL needs at least one tile: sell the least valuable.
    const cheapest = [...useful].sort((a, b) => a.loss - b.loss)[0] ?? items[0];
    return { type: 'SELL', tiles: [cheapest.tile] };
  }

  const pick = ctx.level === 'sulit' ? minLossCover(useful, need) ?? greedyCover(useful, need) : greedyCover(useful, need);
  if (!pick || pick.length === 0) return { type: 'BANKRUPT' };
  return { type: 'SELL', tiles: pick.sort((a, b) => a - b) };
}

function sellValueOf(ctx: BotContext, tile: number): number {
  const t = ctx.state.tiles[tile];
  return sellValue(ctx.defs[tile], t?.level ?? 0);
}
