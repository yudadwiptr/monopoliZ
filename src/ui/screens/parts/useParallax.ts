import { useEffect, useState } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';

const SPRING = { stiffness: 55, damping: 16, mass: 0.7 };
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Normalised (-1..1) parallax input driven by the mouse pointer and, on phones, by device tilt
 * (auto-calibrated so whatever angle the phone is held at counts as neutral).
 * Motion values only — no React re-renders.
 */
export function useParallax(enabled = true): { x: MotionValue<number>; y: MotionValue<number> } {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let tiltActive = false;
    let base: [number, number] | null = null;

    const onPointer = (e: PointerEvent) => {
      if (tiltActive && e.pointerType !== 'mouse') return;
      rawX.set(clamp((e.clientX / window.innerWidth) * 2 - 1));
      rawY.set(clamp((e.clientY / window.innerHeight) * 2 - 1));
    };

    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const angle = window.screen?.orientation?.angle ?? 0;
      const [a, b] =
        angle === 90 ? [e.beta, -e.gamma] : angle === 270 ? [-e.beta, e.gamma] : [e.gamma, e.beta];
      if (!base) base = [a, b];
      // Baseline slowly follows the current pose so a new holding angle becomes neutral.
      base = [base[0] + (a - base[0]) * 0.015, base[1] + (b - base[1]) * 0.015];
      tiltActive = true;
      rawX.set(clamp((a - base[0]) / 18));
      rawY.set(clamp((b - base[1]) / 18));
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('deviceorientation', onTilt);
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, [enabled, rawX, rawY]);

  return { x, y };
}

/** A 0.62..1.25 multiplier based on the viewport's short side, for sizing decorative art. */
export function useStageScale(): number {
  const compute = () =>
    typeof window === 'undefined'
      ? 1
      : Math.min(1.25, Math.max(0.62, Math.min(window.innerWidth, window.innerHeight) / 760));
  const [scale, setScale] = useState(compute);
  useEffect(() => {
    const onResize = () => setScale(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}
