import { createContext, useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { animate, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import type { CameraMode } from '@/store/settingsStore';
import { boardBounds, CELL_N, clamp, perspectiveFor, project, SLAB_N, tiltFor } from './geometry';

export interface BoardCam {
  /** Layout size of the board in px (largest fit over both cameras; the rig only ever scales DOWN). */
  S: number;
  /** One cell in px. */
  c: number;
  /** Perspective distance / S. */
  k: number;
  /** Current tilt in degrees (animated). */
  tilt: MotionValue<number>;
}

export const CamContext = createContext<BoardCam | null>(null);

export function useCam(): BoardCam {
  const cam = useContext(CamContext);
  if (!cam) throw new Error('useCam must be used inside the board');
  return cam;
}

/** Layout size of an element (ignores ancestor transforms, unlike getBoundingClientRect). */
export function useElementSize(ref: RefObject<HTMLElement>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (w: number, h: number) =>
      setSize((s) => (Math.round(w) === s.w && Math.round(h) === s.h ? s : { w: Math.round(w), h: Math.round(h) }));
    update(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) update(r.width, r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export interface CameraRig extends BoardCam {
  rigScale: MotionValue<number>;
  rigY: MotionValue<number>;
  planeTransform: MotionValue<string>;
  slabTransform: MotionValue<string>;
}

/**
 * Fits the board into a W×H container for both cameras and animates between them. Everything that moves
 * during a camera switch is a transform (tilt, rig scale, rig offset) — no layout work.
 */
export function useCameraRig(width: number, height: number, mode: CameraMode): CameraRig {
  const pad = clamp(Math.min(width, height) * 0.025, 6, 20);
  const aw = Math.max(1, width - pad * 2);
  const ah = Math.max(1, height - pad * 2);
  const k = perspectiveFor(width);
  const tilt3d = tiltFor(width, height);
  const target = mode === 'top' ? 0 : tilt3d;

  const fitAt = (t: number) => {
    const b = boardBounds(t, k);
    return Math.min(aw / b.width, ah / b.height);
  };
  const S = Math.max(160, Math.floor(Math.max(fitAt(0), fitAt(tilt3d))));

  const tilt = useMotionValue(target);
  const first = useRef(true);
  const sized = width > 0 && height > 0;
  useEffect(() => {
    if (!sized) return;
    if (first.current) {
      first.current = false;
      tilt.set(target);
      return;
    }
    const ctl = animate(tilt, target, { duration: 0.85, ease: [0.45, 0, 0.2, 1] });
    return () => ctl.stop();
  }, [target, tilt, sized]);

  const rigScale = useTransform(tilt, (t) => fitAt(t) / S);
  const rigY = useTransform(tilt, (t) => -boardBounds(t, k).centerY * S * (fitAt(t) / S));
  const planeTransform = useTransform(tilt, (t) => `rotateX(${t}deg)`);
  const slabTransform = useTransform(tilt, (t) => `rotateX(${t}deg) translateZ(${-SLAB_N * S}px)`);

  return { S, c: S * CELL_N, k, tilt, rigScale, rigY, planeTransform, slabTransform };
}

export function useCamValue(rig: CameraRig): BoardCam {
  const { S, c, k, tilt } = rig;
  return useMemo(() => ({ S, c, k, tilt }), [S, c, k, tilt]);
}

/** CSS transform string placing an overlay element at board point (u, v, h). */
export function anchorCss(u: number, v: number, h: number, tilt: number, k: number, S: number, extraScale = 1): string {
  const p = project(u, v, h, tilt, k);
  return `translate3d(${(p.x * S).toFixed(2)}px,${(p.y * S).toFixed(2)}px,0) scale(${(p.f * extraScale).toFixed(4)})`;
}

/** Same, but squashed vertically so a flat shape looks like it lies on the board. */
export function flatCss(u: number, v: number, tilt: number, k: number, S: number, extraScale = 1): string {
  const p = project(u, v, 0, tilt, k);
  const s = p.f * extraScale;
  const cos = Math.cos((tilt * Math.PI) / 180);
  return `translate3d(${(p.x * S).toFixed(2)}px,${(p.y * S).toFixed(2)}px,0) scale(${s.toFixed(4)},${(s * cos).toFixed(4)})`;
}

/** Overlay transform for a fixed board point, following camera changes without re-rendering. */
export function useAnchor(u: number, v: number, h = 0, extraScale = 1): MotionValue<string> {
  const { tilt, k, S } = useCam();
  return useTransform(tilt, (t) => anchorCss(u, v, h, t, k, S, extraScale));
}

export function useFlatAnchor(u: number, v: number, extraScale = 1): MotionValue<string> {
  const { tilt, k, S } = useCam();
  return useTransform(tilt, (t) => flatCss(u, v, t, k, S, extraScale));
}

/** z-index for an overlay billboard standing at board row v (nearer rows paint on top). */
export function depthZ(v: number, bias = 0): number {
  return Math.round(2000 + v * 1000 + bias);
}
