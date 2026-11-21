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
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
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
