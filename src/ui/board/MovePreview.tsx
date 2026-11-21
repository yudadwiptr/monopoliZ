import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { memo, type CSSProperties } from 'react';
import { BOARD_SIZE, forwardDistance } from '@/data/layout';
import { useGame } from '@/store/gameStore';
import { useAnchor, useCam, useFlatAnchor } from './camera';
import { tileCenter } from './geometry';

/**
 * The walk a dice roll is about to make, as "from:to:steps:playerId" — taken from the queued `move` event
 * that follows the dice (so it is exactly what the engine decided, start/salary wraps included).
 * Shown once the dice have landed, and kept while the pawn walks. Null otherwise.
 */
function useRollWalk(): string | null {
  return useGame((s) => {
    const v = s.view;
    if (!v || v.diceRolling) return null;
    const ev = s.currentEvent;
    let mv = null;
    if (ev?.type === 'dice') {
      const next = s.queue[0];
      if (next?.type === 'move' && next.playerId === ev.playerId) mv = next;
    } else if (ev?.type === 'move' && ev.mode === 'walk' && v.dice) {
      mv = ev;
    }
    if (!mv || mv.mode !== 'walk' || mv.steps <= 0) return null;
    return `${mv.from}:${mv.to}:${mv.steps}:${mv.playerId}`;
  });
}

/**
 * After the dice land: a bouncing arrow + glowing ring on the destination tile in the mover's colour, and
 * a trail of dots along the way that disappear as the pawn passes them.
 */
export function MovePreview() {
  const walk = useRollWalk();
  const color = useGame((s) => {
    if (!walk) return null;
    const pid = walk.split(':')[3];
    return s.game?.players.find((p) => p.id === pid)?.color ?? null;
  });
  const parts = walk?.split(':');
  return (
    <AnimatePresence>
      {parts && color && (
        <Walk
          key={walk}
          from={Number(parts[0])}
          to={Number(parts[1])}
          steps={Number(parts[2])}
          playerId={parts[3]}
          color={color}
        />
      )}
    </AnimatePresence>
  );
}

function Walk({ from, to, steps, playerId, color }: { from: number; to: number; steps: number; playerId: string; color: string }) {
  // How far the pawn has got: dots behind it fade away.
  const travelled = useGame((s) => forwardDistance(from, s.view?.positions[playerId] ?? from));
  const path = Array.from({ length: steps - 1 }, (_, k) => (from + k + 1) % BOARD_SIZE);
  return (
    <>
      {path.map((tile, k) => (
        <TrailDot key={tile} tile={tile} order={k} color={color} passed={k + 1 <= travelled} />
      ))}
      <Target tile={to} color={color} />
    </>
  );
}

const TrailDot = memo(function TrailDot({ tile, order, color, passed }: { tile: number; order: number; color: string; passed: boolean }) {
  const p = tileCenter(tile);
  const t = useFlatAnchor(p.u, p.v, 1);
  return (
    <motion.div className="bz-anchor" style={{ transform: t, zIndex: 4 }}>
      <div className="bz-mid" style={{ '--pc': color } as CSSProperties}>
        <motion.span
          className="bz-trail-dot"
          initial={{ scale: 0, opacity: 0 }}
          animate={passed ? { scale: 0.4, opacity: 0 } : { scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.22, delay: passed ? 0 : 0.04 * order }}
        />
      </div>
    </motion.div>
  );
});

const Target = memo(function Target({ tile, color }: { tile: number; color: string }) {
  const p = tileCenter(tile);
  const ring = useFlatAnchor(p.u, p.v, 1);
  const stand = useAnchor(p.u, p.v, 0);
  const { c } = useCam();
  const vars = { '--pc': color } as CSSProperties;
  return (
    <>
      <motion.div className="bz-anchor" style={{ transform: ring, zIndex: 5 }}>
        <div className="bz-mid" style={vars}>
          <motion.span
            className="bz-target-ring"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          />
        </div>
      </motion.div>
      <motion.div className="bz-anchor" style={{ transform: stand, zIndex: 9100 }}>
        <div className="bz-stand" style={{ bottom: c * 0.55 }}>
          <motion.div
            initial={{ y: -c * 0.8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 520, damping: 16 }}
          >
            <div className="bz-target-arrow" style={vars}>
              <ChevronDown style={{ width: '72%', height: '72%' }} strokeWidth={3.2} />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
});
