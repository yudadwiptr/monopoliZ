import { createContext, useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { animate, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import type { CameraMode } from '@/store/settingsStore';
import {
  boardBounds,
  CELL_N,
  clamp,
  ISO_YAW,
  isoTiltFor,
  perspectiveFor,
  project,
  screenDepth,
  SLAB_N,
  tiltFor,
} from './geometry';

export interface BoardCam {
  /** Layout size of the board in px (largest fit over both cameras; the rig only ever scales DOWN). */
  S: number;
  /** One cell in px. */
  c: number;
  /** Perspective distance / S. */
  k: number;
  /** Current tilt in degrees (animated). */
  tilt: MotionValue<number>;
  /** Current yaw in degrees (animated; 45 in the isometric camera). */
  yaw: MotionValue<number>;
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

/** Target pose (tilt, yaw) for a camera mode at a container size. */
function poseFor(mode: CameraMode, width: number, height: number): [number, number] {
  if (mode === 'top') return [0, 0];
  if (mode === 'iso') return [isoTiltFor(width, height), ISO_YAW];
  return [tiltFor(width, height), 0];
}

/**
 * Fits the board into a W×H container for every camera and animates between them. Everything that moves
 * during a camera switch is a transform (tilt, yaw, rig scale, rig offset) — no layout work.
 */
export function useCameraRig(width: number, height: number, mode: CameraMode): CameraRig {
  const pad = clamp(Math.min(width, height) * (height < 500 ? 0.012 : 0.022), 3, 18);
  const aw = Math.max(1, width - pad * 2);
  const ah = Math.max(1, height - pad * 2);
  const k = perspectiveFor(width);
  const [targetTilt, targetYaw] = poseFor(mode, width, height);

  const fitAt = (t: number, y: number) => {
    const b = boardBounds(t, k, y);
    return Math.min(aw / b.width, ah / b.height);
  };
  // Layout size = largest fit over all poses, so switching cameras only ever scales the rig down.
  const S = Math.max(
    160,
    Math.floor(
      Math.max(
        fitAt(0, 0),
        fitAt(tiltFor(width, height), 0),
        fitAt(isoTiltFor(width, height), ISO_YAW),
      ),
    ),
  );

  const tilt = useMotionValue(targetTilt);
  const yaw = useMotionValue(targetYaw);
  const first = useRef(true);
  const sized = width > 0 && height > 0;
  useEffect(() => {
    if (!sized) return;
    if (first.current) {
      first.current = false;
      tilt.set(targetTilt);
      yaw.set(targetYaw);
      return;
    }
    const ease = [0.45, 0, 0.2, 1] as const;
    const a = animate(tilt, targetTilt, { duration: 0.85, ease });
    const b = animate(yaw, targetYaw, { duration: 0.85, ease });
    return () => {
      a.stop();
      b.stop();
    };
  }, [targetTilt, targetYaw, tilt, yaw, sized]);

  const pose = [tilt, yaw] as MotionValue<number>[];
  const rigScale = useTransform(pose, ([t, y]: number[]) => fitAt(t, y) / S);
  const rigY = useTransform(pose, ([t, y]: number[]) => -boardBounds(t, k, y).centerY * fitAt(t, y));
  const planeTransform = useTransform(pose, ([t, y]: number[]) => `rotateX(${t}deg) rotateZ(${y}deg)`);
  const slabTransform = useTransform(
    pose,
    ([t, y]: number[]) => `rotateX(${t}deg) rotateZ(${y}deg) translateZ(${-SLAB_N * S}px)`,
  );

  return { S, c: S * CELL_N, k, tilt, yaw, rigScale, rigY, planeTransform, slabTransform };
}

export function useCamValue(rig: CameraRig): BoardCam {
  const { S, c, k, tilt, yaw } = rig;
  return useMemo(() => ({ S, c, k, tilt, yaw }), [S, c, k, tilt, yaw]);
}

/** CSS transform string placing an overlay element at board point (u, v, h). */
export function anchorCss(
  u: number,
  v: number,
  h: number,
  tilt: number,
  k: number,
  S: number,
  extraScale = 1,
  yaw = 0,
): string {
  const p = project(u, v, h, tilt, k, yaw);
  return `translate3d(${(p.x * S).toFixed(2)}px,${(p.y * S).toFixed(2)}px,0) scale(${(p.f * extraScale).toFixed(4)})`;
}

/** Same, but squashed vertically so a flat shape looks like it lies on the board. */
export function flatCss(u: number, v: number, tilt: number, k: number, S: number, extraScale = 1, yaw = 0): string {
  const p = project(u, v, 0, tilt, k, yaw);
  const s = p.f * extraScale;
  const cos = Math.cos((tilt * Math.PI) / 180);
  return `translate3d(${(p.x * S).toFixed(2)}px,${(p.y * S).toFixed(2)}px,0) scale(${s.toFixed(4)},${(s * cos).toFixed(4)})`;
}

/** Overlay transform for a fixed board point, following camera changes without re-rendering. */
export function useAnchor(u: number, v: number, h = 0, extraScale = 1): MotionValue<string> {
  const { tilt, yaw, k, S } = useCam();
  return useTransform([tilt, yaw] as MotionValue<number>[], ([t, y]: number[]) =>
    anchorCss(u, v, h, t, k, S, extraScale, y),
  );
}

export function useFlatAnchor(u: number, v: number, extraScale = 1): MotionValue<string> {
  const { tilt, yaw, k, S } = useCam();
  return useTransform([tilt, yaw] as MotionValue<number>[], ([t, y]: number[]) =>
    flatCss(u, v, t, k, S, extraScale, y),
  );
}

/** Reactive paint order for a billboard standing at board point (u, v): nearer the viewer paints on top. */
export function useDepth(u: number, v: number, bias = 0): MotionValue<number> {
  const { yaw } = useCam();
  return useTransform(yaw, (y) => depthZ(screenDepth(u, v, y), bias));
}

/** z-index for an overlay billboard at screen depth d (see screenDepth; nearer paints on top). */
export function depthZ(d: number, bias = 0): number {
  return Math.round(2000 + d * 1000 + bias);
}
