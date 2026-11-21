import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo, useId } from 'react';
import { isProperty } from '@/engine/economy';
import type { MapDef } from '@/engine/types';
import { useGame } from '@/store/gameStore';
import { useAnchor, useCam, useDepth, useFlatAnchor } from './camera';
import { mix } from './color';
import { CELL_N, lotAnchor } from './geometry';

/** 3D Isometric Buildings standing directly on the inner colored lot of every owned property. */
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
        const color = players.find((p) => p.id === t.owner)?.color ?? '#8C96C9';
        return <Lot key={def.index} index={def.index} tourist={def.kind === 'tourist'} level={t.level} color={color} />;
      })}
    </>
  );
}

interface LotProps {
  index: number;
  tourist: boolean;
  level: number;
  color: string;
}

const Lot = memo(function Lot({ index, tourist, level, color }: LotProps) {
  const a = lotAnchor(index);
  const stand = useAnchor(a.u, a.v, 0);
  const shadow = useFlatAnchor(a.u, a.v + CELL_N * 0.04, 0.92);
  const z = useDepth(a.u, a.v, 18);
  const reduce = useReducedMotion();
  const { c } = useCam();
  const kind = tourist ? 'tourist' : `l${Math.max(0, Math.min(4, level))}`;

  return (
    <>
      <motion.div className="bz-anchor" style={{ transform: shadow, zIndex: 2 }}>
        <div className="bz-mid">
          <div className="bz-shadow" style={{ opacity: 0.85 }} />
        </div>
      </motion.div>
      <motion.div className="bz-anchor" style={{ transform: stand, zIndex: z }}>
        <div className="bz-stand" style={{ width: c * 0.96, height: c * 1.24 }}>
          <AnimatePresence initial={false}>
            <motion.div
              key={kind}
              style={{ position: 'absolute', inset: 0, originY: 1 }}
              initial={reduce ? false : { scale: 0.2, opacity: 0, y: -c * 0.45 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 440, damping: 14 }}
            >
              <BuildingArt kind={kind} color={color} />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
});

/**
 * Chunky 3D Isometric Miniature Buildings (ala LINE Let's Get Rich), viewBox 56×68, standing on y = 62.
 * Every building has distinct Left Wall (lit), Right Wall (shaded), 3D Isometric Roof in owner colour,
 * and a 3D isometric plinth base.
 */
function BuildingArt({ kind, color }: { kind: string; color: string }) {
  const id = useId().replace(/:/g, '');
  const roofTop = mix(color, '#FFFFFF', 0.35);
  const roofLeft = color;
  const roofRight = mix(color, '#05081A', 0.38);
  const dark = mix(color, '#05081A', 0.55);
  const wallLeft = '#FFF8EC';
  const wallRight = '#D9CBB5';
  const glass = '#7EE8FA';
  const lit = '#FFE08A';
  const stroke = { stroke: '#0B1026', strokeWidth: 1.15, strokeLinejoin: 'round' as const };

  /** Shared 3D isometric plinth under every building */
  const plinth = (
    <>
      <polygon points="28,51 50,58 28,65 6,58" fill={roofTop} {...stroke} />
      <polygon points="6,58 28,65 28,67.5 6,60.5" fill={roofLeft} {...stroke} />
      <polygon points="28,65 50,58 50,60.5 28,67.5" fill={roofRight} {...stroke} />
    </>
  );

  let art: JSX.Element;
  switch (kind) {
    case 'tourist':
      // 3D Isometric Resort Deck + Striped Beach Parasol (like Get Rich tourist islands)
      art = (
        <>
          {plinth}
          {/* Isometric wooden/white deck */}
          <polygon points="28,48 44,54 28,60 12,54" fill="#FFF3D6" {...stroke} />
          {/* Lounge chair */}
          <polygon points="18,53 26,50 30,52 22,55" fill={roofLeft} {...stroke} />
          {/* Parasol pole */}
          <line x1="30" y1="54" x2="30" y2="25" stroke="#E4E8FA" strokeWidth="2.4" strokeLinecap="round" />
          {/* 3D Parasol canopy */}
          <path d="M12 28 Q30 12 48 28 L30 33 Z" fill={roofLeft} {...stroke} />
          <path d="M20 27 Q30 14 40 27 L30 33 Z" fill="#FFFFFF" {...stroke} />
          <path d="M26 27 Q30 16 34 27 L30 33 Z" fill={roofTop} {...stroke} />
          <circle cx="30" cy="18" r="2.3" fill={lit} {...stroke} />
        </>
      );
      break;
    case 'l0':
      // 3D Isometric Flag Monument / Mini Kiosk on Plinth
      art = (
        <>
          {plinth}
          {/* 3D pedestal cube */}
          <polygon points="28,45 36,48 28,51 20,48" fill={wallLeft} {...stroke} />
          <polygon points="20,48 28,51 28,58 20,55" fill={wallLeft} {...stroke} />
          <polygon points="28,51 36,48 36,55 28,58" fill={wallRight} {...stroke} />
          {/* Flagpole & 3D waving banner */}
          <rect x="26.8" y="20" width="2.4" height="30" rx="1.2" fill="#F8FAFC" {...stroke} />
          <path d="M29 21 L47 26.5 L29 33 Z" fill={roofLeft} {...stroke} />
          <path d="M29 21 L47 26.5 L38 27.5 Z" fill={roofTop} />
          <circle cx="28" cy="19" r="2.4" fill={lit} {...stroke} />
        </>
      );
      break;
    case 'l1':
      // 3D Isometric Villa (1 Building)
      art = (
        <>
          {plinth}
          {/* Left Wall */}
          <polygon points="14,38 28,44 28,60 14,54" fill={wallLeft} {...stroke} />
          {/* Right Wall */}
          <polygon points="28,44 42,38 42,54 28,60" fill={wallRight} {...stroke} />
          {/* 3D Pitched Isometric Roof */}
          <polygon points="11,39 28,25 28,45" fill={roofLeft} {...stroke} />
          <polygon points="45,39 28,25 28,45" fill={roofRight} {...stroke} />
          <polygon points="11,39 28,25 20,38" fill={roofTop} opacity="0.65" />
          {/* Windows & Door */}
          <polygon points="18,44 24,46.5 24,52 18,49.5" fill={lit} {...stroke} />
          <polygon points="33,45.5 38,43.5 38,49 33,51" fill={glass} {...stroke} />
          <polygon points="31,52 35,50.2 35,57 31,58.8" fill={dark} {...stroke} />
        </>
      );
      break;
    case 'l2':
      // 3D Isometric Complex (2 Side-by-Side 3D Buildings like Get Rich Level 2!)
      art = (
        <>
          {plinth}
          {/* Right Taller 2-Story Tower */}
          <polygon points="25,26 36,31 36,56 25,51" fill={wallLeft} {...stroke} />
          <polygon points="36,31 47,26 47,51 36,56" fill={wallRight} {...stroke} />
          <polygon points="24,26 36,20 48,26 36,32" fill={roofTop} {...stroke} />
          <polygon points="24,26 36,32 36,35 24,29" fill={roofLeft} {...stroke} />
          <polygon points="36,32 48,26 48,29 36,35" fill={roofRight} {...stroke} />
          {/* Tower windows */}
          <polygon points="28,35 33,37.2 33,41.5 28,39.3" fill={lit} {...stroke} />
          <polygon points="28,43 33,45.2 33,49.5 28,47.3" fill={glass} {...stroke} />
          <polygon points="39,37.2 44,35 44,39.3 39,41.5" fill={glass} {...stroke} />
          <polygon points="39,45.2 44,43 44,47.3 39,49.5" fill={lit} {...stroke} />

          {/* Left Foreground Villa */}
          <polygon points="9,40 21,45 21,60 9,55" fill={wallLeft} {...stroke} />
          <polygon points="21,45 31,40 31,55 21,60" fill={wallRight} {...stroke} />
          <polygon points="7,41 20,30 21,46" fill={roofLeft} {...stroke} />
          <polygon points="33,41 20,30 21,46" fill={roofRight} {...stroke} />
          <polygon points="12,46 18,48.5 18,53.5 12,51" fill={lit} {...stroke} />
        </>
      );
      break;
    case 'l3':
      // 3D Isometric 3-Building Luxury Hotel Cluster (like Get Rich Level 3!)
      art = (
        <>
          {plinth}
          {/* Back-Right Wing */}
          <polygon points="31,32 41,36 41,56 31,52" fill={wallLeft} {...stroke} />
          <polygon points="41,36 49,32 49,52 41,56" fill={wallRight} {...stroke} />
          <polygon points="30,32 40,27 50,32 40,37" fill={roofRight} {...stroke} />

          {/* Central Skyscraper Hotel Tower */}
          <polygon points="17,16 28,22 28,60 17,54" fill="#F4F7FF" {...stroke} />
          <polygon points="28,22 39,16 39,54 28,60" fill="#C7D2FE" {...stroke} />
          {/* 3D Crown Roof + Helipad */}
          <polygon points="15,16 28,9 41,16 28,23" fill={roofTop} {...stroke} />
          <polygon points="15,16 28,23 28,26 15,19" fill={roofLeft} {...stroke} />
          <polygon points="28,23 41,16 41,19 28,26" fill={roofRight} {...stroke} />
          <ellipse cx="28" cy="15.5" rx="6.5" ry="3.4" fill={dark} stroke="#FFFFFF" strokeWidth="1" />
          {/* Glowing isometric window strips */}
          {[27, 34, 41, 48].map((y, idx) => (
            <g key={y}>
              <polygon
                points={`20,${y} 26,${y + 3} 26,${y + 6.2} 20,${y + 3.2}`}
                fill={idx % 2 === 0 ? lit : glass}
              />
              <polygon
                points={`30,${y + 3} 36,${y} 36,${y + 3.2} 30,${y + 6.2}`}
                fill={idx % 2 === 1 ? lit : glass}
              />
            </g>
          ))}

          {/* Front-Left Wing */}
          <polygon points="7,38 17,43 17,58 7,53" fill={wallLeft} {...stroke} />
          <polygon points="17,43 25,39 25,54 17,58" fill={wallRight} {...stroke} />
          <polygon points="6,38 16,33 26,38 16,43" fill={roofLeft} {...stroke} />
        </>
      );
      break;
    default:
      // Level 4: Grand 3D Isometric Landmark Monument with Golden Halo & Twin Side Pylons
      art = (
        <>
          <defs>
            <radialGradient id={`${id}g`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFE08A" stopOpacity="0.9" />
              <stop offset="1" stopColor="#FFC21F" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}goldL`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF6D6" />
              <stop offset="0.5" stopColor="#FFD35C" />
              <stop offset="1" stopColor="#D98A00" />
            </linearGradient>
            <linearGradient id={`${id}goldR`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFD35C" />
              <stop offset="1" stopColor="#8F5600" />
            </linearGradient>
          </defs>
          <circle cx="28" cy="18" r="18" fill={`url(#${id}g)`} />
          {plinth}
          {/* Tier 1 Isometric Podium */}
          <polygon points="28,44 46,51 28,58 10,51" fill={roofTop} {...stroke} />
          <polygon points="10,51 28,58 28,63 10,56" fill={roofLeft} {...stroke} />
          <polygon points="28,58 46,51 46,56 28,63" fill={roofRight} {...stroke} />
          {/* Tier 2 Golden Podium */}
          <polygon points="28,38 40,43 28,48 16,43" fill="#FFF0BF" {...stroke} />
          <polygon points="16,43 28,48 28,53 16,48" fill={`url(#${id}goldL)`} {...stroke} />
          <polygon points="28,48 40,43 40,48 28,53" fill={`url(#${id}goldR)`} {...stroke} />
          {/* 3D Isometric Obelisk / Monument Tower */}
          <polygon points="22,19 28,22 28,48 20,44" fill="#FFFFFF" {...stroke} />
          <polygon points="28,22 34,19 36,44 28,48" fill="#E2E8F0" {...stroke} />
          {/* Golden Observation Deck */}
          <polygon points="28,14 38,19 28,24 18,19" fill="#FFF0BF" {...stroke} />
          <polygon points="18,19 28,24 28,27.5 18,22.5" fill={roofLeft} {...stroke} />
          <polygon points="28,24 38,19 38,22.5 28,27.5" fill={roofRight} {...stroke} />
          {/* Crown Flame / Gem Spire */}
          <path d="M28 2 C33 8 32.5 13 28 18 C23.5 13 23 8 28 2 Z" fill={`url(#${id}goldL)`} {...stroke} />
          <path d="M28 6 C30.2 9 30 12 28 15 C26 12 25.8 9 28 6 Z" fill="#FFFFFF" opacity="0.88" />
          <circle className="bz-twinkle" cx="12" cy="14" r="1.8" fill="#FFF0BF" />
          <circle className="bz-twinkle" cx="44" cy="22" r="1.6" fill="#FFF0BF" style={{ animationDelay: '0.6s' }} />
        </>
      );
  }

  return (
    <svg className="bz-building" viewBox="0 0 56 68" width="100%" height="100%" aria-hidden>
      {art}
    </svg>
  );
}
