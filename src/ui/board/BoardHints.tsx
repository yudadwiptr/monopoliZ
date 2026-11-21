import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { memo } from 'react';
import { useGame, useSelectableTiles } from '@/store/gameStore';
import { depthZ, useAnchor, useCam } from './camera';
import { lotAnchor, tileCenter } from './geometry';

/** Chevrons are only drawn for short candidate lists — the tile highlight alone covers "anywhere" picks. */
const MAX_CHEVRONS = 10;

/** Persistent board markers: festival flag (×2) and "pick me" chevrons over choose_tile candidates. */
export function BoardHints() {
  const festival = useGame((s) => s.view?.festivalTile ?? null);
  const selectable = useSelectableTiles();
  return (
    <>
      <AnimatePresence>{festival !== null && <FestivalFlag key={`f${festival}`} index={festival} />}</AnimatePresence>
      <AnimatePresence>
        {selectable.length > 0 &&
          selectable.length <= MAX_CHEVRONS &&
          selectable.map((i) => <Chevron key={`c${i}`} index={i} />)}
      </AnimatePresence>
    </>
  );
}

const FestivalFlag = memo(function FestivalFlag({ index }: { index: number }) {
  const a = lotAnchor(index);
  const t = useAnchor(a.u, a.v, 0);
  const { c } = useCam();
  return (
    <motion.div
      className="bz-anchor"
      style={{ transform: t, zIndex: depthZ(a.v, 30) }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="bz-stand" style={{ bottom: c * 1.15 }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 16 }}>
          <div className="bz-fest-flag num">🎉 ×2</div>
        </motion.div>
      </div>
    </motion.div>
  );
});

const Chevron = memo(function Chevron({ index }: { index: number }) {
  const p = tileCenter(index);
  const t = useAnchor(p.u, p.v, 0);
  const { c } = useCam();
  return (
    <motion.div
      className="bz-anchor"
      style={{ transform: t, zIndex: 9000 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="bz-stand" style={{ bottom: c * 0.42 }}>
        <div className="bz-chevron" style={{ width: c * 0.62, height: c * 0.62, minWidth: 18, minHeight: 18 }}>
          <ChevronDown style={{ width: '70%', height: '70%' }} strokeWidth={3} />
        </div>
      </div>
    </motion.div>
  );
});
