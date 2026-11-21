import { motion, useReducedMotion } from 'framer-motion';
import { useMapDef } from './hooks';

const FALLBACK_BG = 'radial-gradient(1200px 800px at 50% 35%, #1B2A6B 0%, #0B1026 55%, #05081A 100%)';

const BLOBS = [
  { color: 'rgba(58,140,214,0.30)', size: '70vmax', left: '-20vmax', top: '-25vmax', dx: 14, dy: 10, dur: 38 },
  { color: 'rgba(255,194,31,0.14)', size: '55vmax', left: '55vw', top: '45vh', dx: -12, dy: -14, dur: 44 },
  { color: 'rgba(34,211,197,0.14)', size: '50vmax', left: '60vw', top: '-20vmax', dx: -10, dy: 12, dur: 52 },
];

/** Map-themed night backdrop: theme gradient + kawung batik + slowly drifting light blobs. */
export function GameBackdrop() {
  const map = useMapDef();
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: map?.theme.background ?? FALLBACK_BG }} />
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full will-change-transform"
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            top: b.top,
            background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
          }}
          animate={reduce ? undefined : { x: [`0vw`, `${b.dx}vw`, '0vw'], y: [`0vh`, `${b.dy}vh`, '0vh'], scale: [1, 1.08, 1] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="batik-bg absolute inset-0 opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(5,8,26,0.65)_100%)]" />
    </div>
  );
}
