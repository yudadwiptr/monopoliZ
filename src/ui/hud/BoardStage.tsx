import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { useGame } from '@/store/gameStore';
import { Board3D } from '@/ui/board/Board3D';
import { ActionDock } from './ActionDock';
import { useMeasure } from './hooks';

/**
 * Gives the board the whole free area it is given and optionally renders the floating bottom dice dock.
 * On mobile portrait, `GameScreen` places `ActionDock` in its own dedicated bottom slot so it never overlaps
 * Player 3 & Player 4's cards; on landscape/desktop, `BoardStage` floats `ActionDock` at bottom-center (`bottom: 10px`).
 */
export function BoardStage({
  className,
  style,
  compact,
  hideDock = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Smaller roll button (short screens) */
  compact?: boolean;
  /** When true, caller renders ActionDock in a dedicated layout slot (e.g. mobile portrait bottom bar) */
  hideDock?: boolean;
}) {
  const [ref, size] = useMeasure<HTMLDivElement>();
  const w = Math.floor(size.width);
  const h = Math.floor(size.height);
  const controls = useAnimationControls();
  const shake = useGame((s) => s.shake);
  const reduce = useReducedMotion();
  const last = useRef(shake);

  useEffect(() => {
    if (shake === last.current) return;
    last.current = shake;
    if (reduce) return;
    void controls.start({
      x: [0, -14, 12, -9, 7, -4, 2, 0],
      y: [0, 7, -6, 5, -3, 2, -1, 0],
      rotate: [0, -0.7, 0.6, -0.4, 0.3, -0.1, 0, 0],
      transition: { duration: 0.55, ease: 'easeOut' },
    });
  }, [shake, reduce, controls]);

  return (
    <div ref={ref} className={clsx('relative flex min-h-0 min-w-0 items-center justify-center', className)} style={style}>
      {Math.min(w, h) > 40 && (
        <motion.div animate={controls} className="relative will-change-transform" style={{ width: w, height: h }}>
          <Board3D />
        </motion.div>
      )}
      {!hideDock && (
        <div className="pointer-events-none fixed bottom-2.5 left-1/2 z-30 -translate-x-1/2 sm:bottom-3.5">
          <div className="pointer-events-auto">
            <ActionDock compact={compact || h < 500 || w < 520} />
          </div>
        </div>
      )}
    </div>
  );
}
