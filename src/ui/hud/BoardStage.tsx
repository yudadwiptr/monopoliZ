import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { useGame } from '@/store/gameStore';
import { Board3D } from '@/ui/board/Board3D';
import { useMeasure } from './hooks';

/**
 * Measures the free area it is given and places the board in the largest centred square.
 * Shakes the board whenever `useGame().shake` increments.
 */
export function BoardStage({ className }: { className?: string }) {
  const [ref, size] = useMeasure<HTMLDivElement>();
  const side = Math.floor(Math.min(size.width, size.height));
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
    <div ref={ref} className={clsx('relative flex min-h-0 min-w-0 items-center justify-center', className)}>
      {side > 40 && (
        <motion.div animate={controls} className="relative" style={{ width: side, height: side }}>
          <Board3D />
        </motion.div>
      )}
    </div>
  );
}
