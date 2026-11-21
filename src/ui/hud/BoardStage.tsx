import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { useGame } from '@/store/gameStore';
import { Board3D } from '@/ui/board/Board3D';
import { ActionDock } from './ActionDock';
import { useMeasure } from './hooks';

/**
 * Gives the board the whole free area it is given (Board3D fits itself to any rectangle — the isometric
 * diamond in particular needs the extra width). Shakes the board whenever `useGame().shake` increments.
 */
export function BoardStage({
  className,
  style,
  compact,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Smaller roll button (short screens) */
  compact?: boolean;
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
    <div ref={ref} className={clsx('flex min-h-0 min-w-0 items-center justify-center', className)} style={style}>
      {Math.min(w, h) > 40 && (
        <motion.div animate={controls} className="relative" style={{ width: w, height: h }}>
          <Board3D center={<ActionDock compact={compact} />} />
        </motion.div>
      )}
    </div>
  );
}
