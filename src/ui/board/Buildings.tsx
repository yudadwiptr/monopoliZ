import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';
import { isProperty } from '@/engine/economy';
import type { MapDef } from '@/engine/types';
import { useGame } from '@/store/gameStore';
import { useAnchor, useCam, useDepth } from './camera';
import { lotAnchor } from './geometry';

const BUILDING_BG_POS: Record<number, string> = {
  0: '0% 0%',       // Baris 1, Kolom 1: Rumah
  1: '0% 0%',       // Baris 1, Kolom 1: Rumah
  2: '33.33% 0%',   // Baris 1, Kolom 2: Ruko
  3: '66.66% 0%',   // Baris 1, Kolom 3: Hotel
  4: '100% 0%',     // Baris 1, Kolom 4: Landmark
};

const TOURIST_BG_POS = '0% 100%'; // Baris 2, Kolom 1: Destinasi Wisata / Candi

/** 2D Illustrated Chibi Property Buildings standing on owned properties with pop-in scale animation. */
export function BuildingsLayer({ map }: { map: MapDef }) {
  const tiles = useGame((s) => s.view?.tiles);
  const players = useGame((s) => s.game?.players);
  if (!tiles || !players) return null;
  return (
    <>
      {map.tiles.map((def) => {
        if (!isProperty(def)) return null;
        const t = tiles[def.index];
        if (!t?.owner) return null;
        return <Lot key={def.index} index={def.index} tourist={def.kind === 'tourist'} level={t.level} />;
      })}
    </>
  );
}

interface LotProps {
  index: number;
  tourist: boolean;
  level: number;
}

const Lot = memo(function Lot({ index, tourist, level }: LotProps) {
  const a = lotAnchor(index);
  const stand = useAnchor(a.u, a.v, 0);
  const z = useDepth(a.u, a.v, 18);
  const reduce = useReducedMotion();
  const { c } = useCam();

  const lvl = Math.max(0, Math.min(4, level));
  const bgPos = tourist ? TOURIST_BG_POS : BUILDING_BG_POS[lvl] ?? BUILDING_BG_POS[1];
  const scaleFactor = tourist ? 0.86 : lvl === 0 ? 0.78 : lvl === 1 ? 0.88 : lvl === 2 ? 0.94 : lvl === 3 ? 1.0 : 1.08;
  const sidePx = Math.max(20, Math.min(40, c * 0.8 * scaleFactor));
  const w = sidePx;
  const h = sidePx;

  return (
    <motion.div className="bz-anchor" style={{ transform: stand, zIndex: z }}>
      <div
        className="bz-mid"
        style={{ width: w, height: h }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={`${tourist ? 't' : lvl}`}
            className="relative flex h-full w-full items-center justify-center"
            initial={reduce ? false : { scale: 0.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 15 }}
          >
            <div
              aria-hidden
              className="bz-building-sprite relative z-10 h-full w-full"
              style={{
                backgroundImage: "url('/sprites/icons_chibi_sheet.png')",
                backgroundSize: '400% 200%',
                backgroundPosition: bgPos,
                backgroundRepeat: 'no-repeat',
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
