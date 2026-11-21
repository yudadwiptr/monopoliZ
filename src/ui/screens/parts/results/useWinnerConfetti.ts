import confetti from 'canvas-confetti';
import { useCallback, useEffect } from 'react';

const BASE: confetti.Options = { zIndex: 60, disableForReducedMotion: true, shapes: ['square', 'circle', 'star'] };

const palette = (color: string) => [color, '#FFC21F', '#FFE08A', '#FFFFFF'];

/**
 * Celebration confetti in the winner's colour + gold: an opening burst, side cannons, an encore.
 * Returns `burst()` for an extra pop on demand (e.g. tapping the winner).
 */
export function useWinnerConfetti(color: string | null): () => void {
  const burst = useCallback(() => {
    if (!color) return;
    void confetti({
      ...BASE,
      particleCount: 120,
      spread: 100,
      startVelocity: 48,
      scalar: 1.1,
      origin: { x: 0.5, y: 0.35 },
      colors: palette(color),
    });
  }, [color]);

  useEffect(() => {
    if (!color) return;
    const colors = palette(color);
    let raf = 0;
    let end = 0;
    const cannons = () => {
      void confetti({ ...BASE, particleCount: 3, angle: 60, spread: 58, startVelocity: 58, origin: { x: 0, y: 0.85 }, colors });
      void confetti({ ...BASE, particleCount: 3, angle: 120, spread: 58, startVelocity: 58, origin: { x: 1, y: 0.85 }, colors });
      if (performance.now() < end) raf = requestAnimationFrame(cannons);
    };
    const timers = [
      setTimeout(burst, 350),
      setTimeout(() => {
        end = performance.now() + 2200;
        raf = requestAnimationFrame(cannons);
      }, 650),
      setTimeout(burst, 3400),
    ];
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      confetti.reset();
    };
  }, [color, burst]);

  return burst;
}
