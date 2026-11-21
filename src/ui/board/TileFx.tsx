import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { memo, useState, type ReactNode } from 'react';
import { LEVEL_NAMES } from '@/engine/economy';
import { formatRp } from '@/lib/format';
import { useGame, type Fx, type FxKind } from '@/store/gameStore';
import { useAnchor, useCam } from './camera';
import { inkOn, mix } from './color';
import { tileCenter } from './geometry';

const BOARD_KINDS = new Set<FxKind>(['money', 'salary', 'buy', 'build', 'landmark', 'acquire', 'festival', 'text']);

/** Transient effects anchored on tiles (money pops, purchase bursts, landmark rays, fireworks…). */
export function FxLayer() {
  const fx = useGame((s) => s.fx);
  const items = fx.filter((f) => f.tile !== undefined && BOARD_KINDS.has(f.kind));
  const perTile = new Map<number, number>();
  return (
    <AnimatePresence>
      {items.map((f) => {
        const n = perTile.get(f.tile!) ?? 0;
        perTile.set(f.tile!, n + 1);
        return <TileFx key={f.id} fx={f} stack={n} />;
      })}
    </AnimatePresence>
  );
}

const TileFx = memo(function TileFx({ fx, stack }: { fx: Fx; stack: number }) {
  const { c } = useCam();
  const [st] = useState(stack); // keep the slot it was born in
  const p = tileCenter(fx.tile!);
  const anchor = useAnchor(p.u, p.v, 0);
  const color = useGame((s) => s.game?.players.find((pl) => pl.id === fx.playerId)?.color ?? '#3A8CD6');
  const [level] = useState(() => useGame.getState().view?.tiles[fx.tile!]?.level ?? 0);
  const reduce = useReducedMotion() ?? false;

  let content: ReactNode;
  switch (fx.kind) {
    case 'money':
    case 'salary': {
      const amt = fx.amount ?? 0;
      content = (
        <Rise c={c} lift={0.8 + st * 0.5} duration={1.5}>
          <span className={clsx('bz-pop num', amt >= 0 ? (fx.kind === 'salary' ? 'bz-pop-gold' : 'bz-pop-good') : 'bz-pop-bad')}>
            {formatRp(amt, { sign: true })}
          </span>
        </Rise>
      );
      break;
    }
    case 'buy':
      content = (
        <>
          {!reduce && <Shockwave color={color} />}
          {!reduce && <Sparks c={c} colors={[color, '#FFFFFF', '#FFE08A']} count={12} radius={1.1} />}
          <Label c={c} lift={1 + st * 0.5} bg={color}>
            DIBELI!
          </Label>
        </>
      );
      break;
    case 'build': {
      const down = fx.tone === 'bad';
      content = (
        <>
          {!reduce && !down && <Sparks c={c} colors={['#8CC4F5', '#FFFFFF', color]} count={10} radius={0.9} up />}
          <Label c={c} lift={1.1 + st * 0.5} bg={down ? '#E01E45' : '#3A8CD6'}>
            {down ? '▼' : '▲'} {LEVEL_NAMES[level] ?? ''}
          </Label>
        </>
      );
      break;
    }
    case 'landmark':
      content = (
        <>
          {!reduce && <Rays />}
          {!reduce && <Flash />}
          {!reduce && <Sparks c={c} colors={['#FFD35C', '#FFF0BF', '#FFC21F', '#FFFFFF']} count={18} radius={1.6} />}
          <Label c={c} lift={1.3 + st * 0.5} gold>
            LANDMARK! 🏛️
          </Label>
        </>
      );
      break;
    case 'acquire':
      content = (
        <>
          {!reduce && <Shockwave color={color} />}
          {!reduce && <Shockwave color="#FFFFFF" delay={0.15} />}
          {!reduce && <Sparks c={c} colors={[color, '#FFFFFF']} count={14} radius={1.3} />}
          <Label c={c} lift={1.1 + st * 0.5} bg={color}>
            {fx.text ?? 'DIAKUISISI!'}
          </Label>
        </>
      );
      break;
    case 'festival':
      content = (
        <>
          {!reduce && <Fireworks c={c} />}
          <Label c={c} lift={1.2 + st * 0.5} bg="linear-gradient(135deg,#FFE08A,#FF8FD8 55%,#FF4FD8)" ink="#2A0A2E">
            {fx.text ?? 'PESTA! ×2'}
          </Label>
        </>
      );
      break;
    default: {
      const bg = fx.tone === 'bad' ? '#E01E45' : fx.tone === 'good' ? '#14B877' : '#2A70B8';
      content = (
        <Label c={c} lift={1 + st * 0.5} bg={bg}>
          {fx.text ?? ''}
        </Label>
      );
    }
  }

  return (
    <motion.div
      className="bz-anchor"
      style={{ transform: anchor, zIndex: 9500 + st }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      {content}
    </motion.div>
  );
});

/** Centres children on the anchor and floats them upward. */
function Rise({ c, lift, duration, children }: { c: number; lift: number; duration: number; children: ReactNode }) {
  return (
    <div className="bz-mid">
      <motion.div
        initial={{ y: 0, scale: 0.4, opacity: 0 }}
        animate={{ y: [0, -c * lift, -c * (lift + 0.35)], scale: [0.4, 1.12, 1], opacity: [0, 1, 1] }}
        transition={{ duration, times: [0, 0.22, 1], ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function Label({
  c,
  lift,
  bg,
  ink,
  gold,
  children,
}: {
  c: number;
  lift: number;
  bg?: string;
  ink?: string;
  gold?: boolean;
  children: ReactNode;
}) {
  const solid = bg && bg.startsWith('#') ? bg : null;
  const style = gold
    ? undefined
    : {
        background: solid ? `linear-gradient(180deg, ${mix(solid, '#FFFFFF', 0.25)}, ${solid} 60%, ${mix(solid, '#05081A', 0.2)})` : bg,
        color: ink ?? (solid ? inkOn(solid) : '#FFFFFF'),
      };
  return (
    <div className="bz-mid">
      <motion.div
        initial={{ y: 0, scale: 0, rotate: -8 }}
        animate={{ y: [0, -c * lift * 0.92, -c * lift], scale: [0, 1.25, 1], rotate: [-8, 4, 0] }}
        transition={{ duration: 0.55, times: [0, 0.6, 1], ease: 'easeOut' }}
      >
        <div className={clsx('bz-label', gold && 'bz-label-gold')} style={style}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function Shockwave({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <motion.span
      className="bz-shockwave"
      style={{ color }}
      initial={{ scale: 0.2, opacity: 1 }}
      animate={{ scale: 2.4, opacity: 0 }}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
    />
  );
}

function Flash() {
  return (
    <motion.span
      className="bz-flash"
      initial={{ scale: 0.3, opacity: 1 }}
      animate={{ scale: 2.2, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  );
}

function Rays() {
  return (
    <motion.span
      className="bz-rays"
      initial={{ scale: 0, opacity: 0, rotate: 0 }}
      animate={{ scale: [0, 1, 1.1], opacity: [0, 0.95, 0], rotate: [0, 25, 70] }}
      transition={{ duration: 1.6, times: [0, 0.3, 1], ease: 'easeOut' }}
    />
  );
}

function Sparks({
  c,
  colors,
  count,
  radius,
  up,
  delay = 0,
}: {
  c: number;
  colors: string[];
  count: number;
  radius: number;
  up?: boolean;
  delay?: number;
}) {
  const [seeds] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      a: up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : (i / count) * Math.PI * 2 + Math.random() * 0.4,
      r: radius * (0.65 + Math.random() * 0.5),
      rot: (Math.random() - 0.5) * 540,
      color: colors[i % colors.length],
    })),
  );
  return (
    <>
      {seeds.map((s, i) => (
        <motion.span
          key={i}
          className="bz-spark"
          style={{ background: s.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{
            x: [0, Math.cos(s.a) * s.r * c, Math.cos(s.a) * s.r * c * 1.08],
            y: [0, Math.sin(s.a) * s.r * c, Math.sin(s.a) * s.r * c + c * 0.45],
            opacity: [1, 1, 0],
            scale: [1, 1, 0.4],
            rotate: [0, s.rot * 0.6, s.rot],
          }}
          transition={{ duration: 0.95, delay, ease: 'easeOut', times: [0, 0.55, 1] }}
        />
      ))}
    </>
  );
}

const FIREWORKS = [
  { x: -0.6, y: -1.6, color: '#FFD35C', delay: 0 },
  { x: 0.7, y: -2.1, color: '#FF4FD8', delay: 0.28 },
  { x: 0.05, y: -2.6, color: '#45E3D6', delay: 0.55 },
  { x: -0.9, y: -2.4, color: '#FF8FA3', delay: 0.8 },
];

function Fireworks({ c }: { c: number }) {
  return (
    <>
      {FIREWORKS.map((f, i) => (
        <div key={i} style={{ position: 'absolute', left: f.x * c, top: f.y * c }}>
          <Sparks c={c} colors={[f.color, '#FFFFFF']} count={12} radius={0.85} delay={f.delay} />
          <motion.span
            className="bz-flash"
            style={{ width: c * 0.6, height: c * 0.6, marginLeft: -c * 0.3, marginTop: -c * 0.3 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1.6], opacity: [0, 1, 0] }}
            transition={{ duration: 0.55, delay: f.delay }}
          />
        </div>
      ))}
    </>
  );
}
