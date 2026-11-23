import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getMap } from '@/data/maps';
import { propertyValue } from '@/engine/economy';
import type { MapDef } from '@/engine/types';
import { useGame } from '@/store/gameStore';

export interface Size {
  width: number;
  height: number;
}

/** Callback-ref based element size (layout size, unaffected by transforms). */
export function useMeasure<T extends HTMLElement>(): [(el: T | null) => void, Size] {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    };
    update();
    // Window events as well as ResizeObserver: some mobile browsers only settle 100dvh after an
    // orientation change, so the observer alone can miss phone rotation.
    const late = () => requestAnimationFrame(update);
    window.addEventListener('resize', late);
    window.addEventListener('orientationchange', late);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => {
      window.removeEventListener('resize', late);
      window.removeEventListener('orientationchange', late);
      ro?.disconnect();
    };
  }, [el]);

  return [setEl, size];
}

export function safeMap(id: string | null | undefined): MapDef | null {
  if (!id) return null;
  try {
    return getMap(id);
  } catch {
    return null;
  }
}

export function useMapDef(): MapDef | null {
  const mapId = useGame((s) => s.game?.mapId);
  return useMemo(() => safeMap(mapId), [mapId]);
}

/**
 * Returns `value` as it was the last time `settled` was true. Used to keep `game` truth (log, kept cards)
 * from spoiling things before the board animation has caught up.
 */
export function useSettled<T>(value: T, settled: boolean): T {
  const ref = useRef(value);
  if (settled) ref.current = value;
  return ref.current;
}

export function useHumanCount(): number {
  return useGame((s) => s.game?.players.reduce((n, p) => n + (p.isBot ? 0 : 1), 0) ?? 0);
}

export function usePlayerIds(): string[] {
  return useGame(useShallow((s) => s.game?.players.map((p) => p.id) ?? []));
}

/** Player with the strictly highest displayed assets (cash + property value), or null on a tie. */
export function useLeaderId(): string | null {
  return useGame((s) => {
    const g = s.game;
    const v = s.view;
    if (!g || !v) return null;
    const map = safeMap(g.mapId);
    if (!map) return null;
    let best: string | null = null;
    let bestVal = -Infinity;
    let second = -Infinity;
    for (const p of g.players) {
      if (v.bankrupt[p.id]) continue;
      const val = (v.cash[p.id] ?? 0) + propertyValue(map.tiles, v.tiles, p.id);
      if (val > bestVal) {
        second = bestVal;
        bestVal = val;
        best = p.id;
      } else if (val > second) {
        second = val;
      }
    }
    return bestVal > second ? best : null;
  });
}

/** Real-time 1..N ranking per playerId by displayed total assets (cash + property value; bankrupt last). */
export function usePlayerRanks(): Record<string, number> {
  return useGame(
    useShallow((s) => {
      const g = s.game;
      const v = s.view;
      const ranks: Record<string, number> = {};
      if (!g || !v) return ranks;
      const map = safeMap(g.mapId);
      const scored = g.players.map((p, idx) => {
        const isBankrupt = !!v.bankrupt[p.id];
        const prop = map ? propertyValue(map.tiles, v.tiles, p.id) : 0;
        const total = isBankrupt ? -1_000_000 - idx : (v.cash[p.id] ?? 0) + prop;
        return { id: p.id, total, idx };
      });
      scored.sort((a, b) => b.total - a.total || a.idx - b.idx);
      scored.forEach((item, r) => {
        ranks[item.id] = r + 1;
      });
      return ranks;
    }),
  );
}
