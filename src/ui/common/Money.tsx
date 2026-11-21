import { animate, useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { formatRp } from '@/lib/format';

export interface MoneyProps {
  value: number; // juta
  className?: string;
  sign?: boolean;
  /** Animate count up/down when the value changes */
  animated?: boolean;
  /** Flash green/red when value changes */
  flash?: boolean;
}

/** Rupiah amount (juta unit) with a smooth count animation and change flash. */
export function Money({ value, className, sign, animated = true, flash = true }: MoneyProps) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  const [tone, setTone] = useState<'up' | 'down' | null>(null);
  const prev = useRef(value);

  useMotionValueEvent(mv, 'change', (v) => setDisplay(Math.round(v)));

  useEffect(() => {
    if (prev.current === value) return;
    const dir = value > prev.current ? 'up' : 'down';
    prev.current = value;
    if (flash) {
      setTone(dir);
      const t = setTimeout(() => setTone(null), 700);
      if (!animated) {
        mv.set(value);
        return () => clearTimeout(t);
      }
      const controls = animate(mv, value, { duration: 0.6, ease: 'easeOut' });
      return () => {
        controls.stop();
        clearTimeout(t);
      };
    }
    if (!animated) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.6, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, animated, flash, mv]);

  return (
    <span
      className={clsx(
        'num transition-colors duration-300',
        tone === 'up' && 'text-daun-400',
        tone === 'down' && 'text-merah-400',
        className,
      )}
    >
      {formatRp(display, { sign })}
    </span>
  );
}
