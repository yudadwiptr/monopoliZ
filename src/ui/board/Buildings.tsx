import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo, useId } from 'react';
import { isProperty } from '@/engine/economy';
import type { MapDef } from '@/engine/types';
import { useGame } from '@/store/gameStore';
import { depthZ, useAnchor, useFlatAnchor, useCam } from './camera';
import { mix } from './color';
import { CELL_N, lotAnchor } from './geometry';

/** Buildings standing on every owned property, in the owner's colour. Re-renders only on ownership changes. */
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
  const shadow = useFlatAnchor(a.u, a.v - CELL_N * 0.08, 0.8);
  const reduce = useReducedMotion();
  const { c } = useCam();
  const kind = tourist ? 'tourist' : `l${Math.max(0, Math.min(4, level))}`;

  return (
    <>
      <motion.div className="bz-anchor" style={{ transform: shadow, zIndex: 2 }}>
        <div className="bz-mid">
          <div className="bz-shadow" style={{ opacity: 0.8 }} />
        </div>
      </motion.div>
      <motion.div className="bz-anchor" style={{ transform: stand, zIndex: depthZ(a.v, 10) }}>
        <div className="bz-stand" style={{ width: c * 0.74, height: c * 1.18 }}>
          <AnimatePresence initial={false}>
            <motion.div
              key={kind}
              style={{ position: 'absolute', inset: 0, originY: 1 }}
              initial={reduce ? false : { scale: 0.2, opacity: 0, y: -c * 0.4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 15 }}
            >
              <BuildingArt kind={kind} color={color} />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
});

/** Original building illustrations, viewBox 40×64, standing on y = 63. */
function BuildingArt({ kind, color }: { kind: string; color: string }) {
  const id = useId().replace(/:/g, '');
  const dark = mix(color, '#05081A', 0.45);
  const light = mix(color, '#FFFFFF', 0.45);
  const wall = '#FFF6E6';
  const wallShade = '#E7D9C0';
  const glass = '#9FDCFF';
  const lit = '#FFE08A';
  const stroke = { stroke: '#0B1026', strokeWidth: 1.1, strokeLinejoin: 'round' as const };

  let art: JSX.Element;
  switch (kind) {
    case 'tourist':
      art = (
        <>
          <ellipse cx="20" cy="62" rx="9" ry="2.2" fill={dark} />
          <rect x="18.8" y="22" width="2.4" height="40" rx="1.2" fill="#E4E8FA" {...stroke} />
          <path d="M21 23 Q29 20 37 24 Q33 29 37 34 Q29 31 21 34 Z" fill={color} {...stroke} />
          <path d="M27.5 24.6 l1.2 2.5 2.7.3-2 1.8.6 2.7-2.5-1.4-2.4 1.4.6-2.7-2-1.8 2.7-.3z" fill="#FFFFFF" />
          <circle cx="20" cy="21" r="2.2" fill={lit} {...stroke} />
        </>
      );
      break;
    case 'l0':
      art = (
        <>
          <ellipse cx="20" cy="62" rx="8" ry="2" fill={dark} />
          <rect x="18.9" y="34" width="2.2" height="28" rx="1.1" fill="#E4E8FA" {...stroke} />
          <path d="M21 35 L35 39.5 L21 44 Z" fill={color} {...stroke} />
          <circle cx="20" cy="33.5" r="1.8" fill={lit} {...stroke} />
        </>
      );
      break;
    case 'l1':
      art = (
        <>
          <rect x="9" y="43" width="22" height="20" rx="1" fill={wall} {...stroke} />
          <rect x="24" y="43" width="7" height="20" fill={wallShade} />
          <path d="M5.5 45 L20 31.5 L34.5 45 Z" fill={color} {...stroke} />
          <path d="M20 31.5 L34.5 45 L28 45 Z" fill={dark} opacity="0.45" />
          <rect x="17" y="52" width="6" height="11" rx="1" fill={dark} {...stroke} />
          <rect x="11" y="47.5" width="4.5" height="4.5" rx="0.6" fill={glass} {...stroke} />
          <rect x="25" y="47.5" width="4.5" height="4.5" rx="0.6" fill={lit} {...stroke} />
        </>
      );
      break;
    case 'l2':
      art = (
        <>
          <rect x="5" y="33" width="30" height="30" rx="1" fill={wall} {...stroke} />
          <rect x="27" y="33" width="8" height="30" fill={wallShade} />
          <rect x="3.5" y="29.5" width="33" height="5" rx="1.2" fill={color} {...stroke} />
          {[8.5, 17.5, 26.5].map((x) => (
            <rect key={x} x={x} y="38" width="5" height="5" rx="0.6" fill={x === 17.5 ? lit : glass} {...stroke} />
          ))}
          <path d="M4 48 H36 L34 53 H6 Z" fill={color} {...stroke} />
          <path d="M10 48 L9 53 M16 48 L15.5 53 M22 48 L22 53 M28 48 L28.5 53" stroke={light} strokeWidth="1.6" />
          <rect x="8" y="54.5" width="10" height="8.5" fill={glass} {...stroke} />
          <rect x="22" y="54.5" width="10" height="8.5" fill={dark} {...stroke} />
        </>
      );
      break;
    case 'l3':
      art = (
        <>
          <defs>
            <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#F4F6FF" />
              <stop offset="0.65" stopColor="#D5DCF5" />
              <stop offset="1" stopColor="#AEB8E0" />
            </linearGradient>
          </defs>
          <rect x="8" y="13" width="24" height="50" rx="1.2" fill={`url(#${id}t)`} {...stroke} />
          <rect x="6.5" y="9" width="27" height="6" rx="1.4" fill={color} {...stroke} />
          <circle cx="20" cy="5.5" r="4.2" fill={color} {...stroke} />
          <text x="20" y="7.6" textAnchor="middle" fontSize="6" fontWeight="700" fill="#FFFFFF" fontFamily="Fredoka, sans-serif">
            H
          </text>
          {[19, 26, 33, 40, 47].map((y, r) =>
            [11.5, 18, 24.5].map((x, col) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="0.5" fill={(r + col) % 3 === 0 ? lit : glass} />
            )),
          )}
          <rect x="15" y="54" width="10" height="9" rx="1" fill={color} {...stroke} />
          <rect x="17.5" y="56" width="5" height="7" fill={glass} />
        </>
      );
      break;
    default:
      art = (
        <>
          <defs>
            <radialGradient id={`${id}g`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFE08A" stopOpacity="0.85" />
              <stop offset="1" stopColor="#FFC21F" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="0.6" stopColor="#F1E6CF" />
              <stop offset="1" stopColor="#CDBB96" />
            </linearGradient>
            <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF0BF" />
              <stop offset="0.5" stopColor="#FFC21F" />
              <stop offset="1" stopColor="#A86F00" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="12" r="13" fill={`url(#${id}g)`} />
          <rect x="3" y="56" width="34" height="7" rx="1.5" fill={color} {...stroke} />
          <rect x="8" y="50" width="24" height="7" rx="1.2" fill={light} {...stroke} />
          <path d="M16.5 50 L18.3 17 H21.7 L23.5 50 Z" fill={`url(#${id}s)`} {...stroke} />
          <path d="M13.5 17 H26.5 L24 13 H16 Z" fill={`url(#${id}a)`} {...stroke} />
          <path d="M20 1.5 C24 6 23.5 9.5 20 13 C16.5 9.5 16 6 20 1.5 Z" fill={`url(#${id}a)`} {...stroke} />
          <path d="M20 5.5 C21.6 7.6 21.4 9.4 20 11 C18.6 9.4 18.4 7.6 20 5.5 Z" fill="#FFFFFF" opacity="0.8" />
          <circle className="bz-twinkle" cx="7" cy="9" r="1.4" fill="#FFF0BF" />
          <circle className="bz-twinkle" cx="34" cy="20" r="1.2" fill="#FFF0BF" style={{ animationDelay: '0.7s' }} />
        </>
      );
  }

  return (
    <svg className="bz-building" viewBox="0 0 40 64" width="100%" height="100%" aria-hidden>
      {art}
    </svg>
  );
}
