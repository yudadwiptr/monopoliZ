import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsPresent } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import type { Action } from '@/engine/types';

/** `true` on tablet/desktop widths (Tailwind `sm` and up). Drives sheet vs. card layouts. */
export function useIsDesktop(query = '(min-width: 640px)'): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [match, setMatch] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return match;
}

/**
 * Dispatches a human action at most once per mounted dialog (guards double taps, Enter spam and
 * clicks during the exit animation). Re-arms after a short delay in case the engine rejected it.
 */
export function useActOnce(): (action: Action) => void {
  const isPresent = useIsPresent();
  const fired = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(
    (action: Action) => {
      if (fired.current || !isPresent) return;
      fired.current = true;
      useGame.getState().act(action);
      timer.current = setTimeout(() => {
        fired.current = false;
      }, 700);
    },
    [isPresent],
  );
}

export interface DialogKeys {
  /** Enter — the primary action. Omit (or pass undefined) when nothing should happen. */
  enter?: () => void;
  /** Escape — skip/cancel. Omit when the decision cannot be skipped. */
  escape?: () => void;
}

/**
 * Global Enter / Escape shortcuts for the active decision. Enter on a focused native button keeps the
 * browser's own behaviour (activates that button) except for our radio-style option tiles.
 * Listens in the capture phase so a handled Escape does not also open the pause menu.
 */
export function useDialogKeys(keys: DialogKeys): void {
  const ref = useRef(keys);
  ref.current = keys;
  const isPresent = useIsPresent();
  useEffect(() => {
    if (!isPresent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (e.key === 'Enter') {
        if (e.repeat) return;
        const tag = t?.tagName;
        const role = t?.getAttribute('role');
        const nativeTarget =
          tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A' || (tag === 'BUTTON' && role !== 'radio');
        if (nativeTarget || !ref.current.enter) return;
        e.preventDefault();
        e.stopPropagation();
        ref.current.enter();
      } else if (e.key === 'Escape') {
        if (!ref.current.escape) return;
        e.preventDefault();
        e.stopPropagation();
        ref.current.escape();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isPresent]);
}

/** Becomes true after `ms` — used to avoid accidental instant confirms (e.g. card reveal). */
export function useDelayedTrue(ms: number): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return ready;
}
