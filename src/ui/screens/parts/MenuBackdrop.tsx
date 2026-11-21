import { motion, useTransform, type MotionValue } from 'framer-motion';
import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from '@/ui/common';
import { CHARACTERS } from '@/data/characters';
import { IsoBlock, type IsoRoof } from './IsoBlock';
import { IsoDie } from './Dice';
import { RpCoin } from './RpCoin';
import { Keyframes } from './Keyframes';
import { alpha } from './color';
import { useParallax, useStageScale } from './useParallax';

// ───────────────────────── decorative data ─────────────────────────

type Art =
  | { kind: 'char'; index: number }
  | { kind: 'dice'; faces: [number, number, number] }
  | { kind: 'coin' }
  | { kind: 'building'; color: string; height: number; roof: IsoRoof };

interface Floater {
  art: Art;
  left: number; // %
  top: number; // %
  size: number; // px at scale 1
  dur: number;
  delay: number;
  dx: number;
  dy: number;
  r0?: number;
  r1?: number;
  /** also show on phones (otherwise sm+ only) */
  mobile?: boolean;
}

const MID: Floater[] = [
  { art: { kind: 'dice', faces: [6, 2, 4] }, left: 9, top: 17, size: 70, dur: 7, delay: 1, dx: 8, dy: -18, r0: -14, r1: 8, mobile: true },
  { art: { kind: 'dice', faces: [1, 5, 3] }, left: 85, top: 63, size: 58, dur: 8, delay: 3, dx: -10, dy: -14, r0: 16, r1: -6 },
  { art: { kind: 'coin' }, left: 81, top: 14, size: 46, dur: 6, delay: 0.5, dx: -6, dy: -16, mobile: true },
  { art: { kind: 'coin' }, left: 13, top: 70, size: 38, dur: 6.5, delay: 2.2, dx: 6, dy: -12 },
  { art: { kind: 'coin' }, left: 66, top: 88, size: 30, dur: 5.5, delay: 1.4, dx: 4, dy: -10 },
  { art: { kind: 'building', color: '#3A8CD6', height: 70, roof: 'flat' }, left: 2, top: 38, size: 72, dur: 9, delay: 2, dx: 6, dy: -12, r0: -2, r1: 2 },
  { art: { kind: 'building', color: '#B36BFF', height: 54, roof: 'spire' }, left: 88, top: 30, size: 64, dur: 8.5, delay: 4, dx: -6, dy: -16, r0: 2, r1: -2, mobile: true },
  { art: { kind: 'building', color: '#FF7A59', height: 30, roof: 'pyramid' }, left: 27, top: 4, size: 50, dur: 7.5, delay: 0, dx: 4, dy: -10 },
];

const NEAR: Floater[] = [
  { art: { kind: 'char', index: 0 }, left: 4, top: 80, size: 66, dur: 6, delay: 0, dx: 8, dy: -16, r0: -6, r1: 6, mobile: true },
  { art: { kind: 'char', index: 1 }, left: 87, top: 79, size: 60, dur: 6.8, delay: 1.5, dx: -8, dy: -14, r0: 6, r1: -6, mobile: true },
  { art: { kind: 'char', index: 2 }, left: 91, top: 5, size: 50, dur: 7.2, delay: 2.5, dx: -6, dy: -12, r0: 4, r1: -8 },
  { art: { kind: 'char', index: 3 }, left: 1, top: 5, size: 48, dur: 6.4, delay: 0.8, dx: 6, dy: -12, r0: -4, r1: 8 },
  { art: { kind: 'char', index: 4 }, left: 22, top: 88, size: 44, dur: 7.6, delay: 3.2, dx: 6, dy: -10 },
  { art: { kind: 'char', index: 5 }, left: 74, top: 46, size: 42, dur: 7, delay: 2, dx: -6, dy: -14 },
  { art: { kind: 'coin' }, left: 63, top: 3, size: 40, dur: 5.8, delay: 0.3, dx: -4, dy: -12 },
];

const SKYLINE: { w: number; h: number; color: string; roof: IsoRoof }[] = [
  { w: 64, h: 70, color: '#1B2552', roof: 'flat' },
  { w: 58, h: 120, color: '#27336B', roof: 'flat' },
  { w: 66, h: 46, color: '#123A6A', roof: 'pyramid' },
  { w: 60, h: 150, color: '#1B2552', roof: 'spire' },
  { w: 62, h: 84, color: '#3A4785', roof: 'flat' },
  { w: 56, h: 40, color: '#27336B', roof: 'pyramid' },
  { w: 70, h: 104, color: '#123A6A', roof: 'flat' },
  { w: 60, h: 60, color: '#1B2552', roof: 'flat' },
  { w: 66, h: 170, color: '#27336B', roof: 'spire' },
  { w: 58, h: 76, color: '#123A6A', roof: 'flat' },
  { w: 62, h: 44, color: '#3A4785', roof: 'pyramid' },
  { w: 68, h: 128, color: '#1B2552', roof: 'flat' },
  { w: 60, h: 66, color: '#27336B', roof: 'flat' },
  { w: 64, h: 96, color: '#123A6A', roof: 'pyramid' },
  { w: 58, h: 140, color: '#1B2552', roof: 'flat' },
  { w: 62, h: 52, color: '#3A4785', roof: 'flat' },
  { w: 66, h: 112, color: '#27336B', roof: 'spire' },
  { w: 60, h: 72, color: '#123A6A', roof: 'flat' },
  { w: 64, h: 40, color: '#1B2552', roof: 'pyramid' },
  { w: 58, h: 124, color: '#27336B', roof: 'flat' },
  { w: 62, h: 64, color: '#123A6A', roof: 'flat' },
];

/** Deterministic star field. */
const STARS = Array.from({ length: 26 }, (_, i) => {
  const r = (k: number) => {
    const x = Math.sin((i + 1) * 91.7 + k * 12.9) * 10000;
    return x - Math.floor(x);
  };
  return { left: r(1) * 100, top: r(2) * 70, size: 1.5 + r(3) * 2.5, dur: 2.5 + r(4) * 4, delay: r(5) * 5, gold: r(6) > 0.78 };
});

// ───────────────────────── pieces ─────────────────────────

function ParallaxLayer({
  x,
  y,
  depth,
  className,
  children,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  depth: number;
  className?: string;
  children?: ReactNode;
}) {
  const tx = useTransform(x, (v) => v * depth * -16);
  const ty = useTransform(y, (v) => v * depth * -12);
  return (
    <motion.div className={clsx('absolute inset-0', className)} style={{ x: tx, y: ty }}>
      {children}
    </motion.div>
  );
}

function ArtPiece({ art, size }: { art: Art; size: number }) {
  switch (art.kind) {
    case 'char':
      return <Avatar characterId={CHARACTERS[art.index % CHARACTERS.length].id} size={size} />;
    case 'dice':
      return <IsoDie size={size} faces={art.faces} />;
    case 'coin':
      return (
        <div style={{ animation: 'mz-spin-y 4.5s linear infinite' }}>
          <RpCoin size={size} />
        </div>
      );
    case 'building':
      return <IsoBlock width={size} color={art.color} height={art.height} roof={art.roof} seed={size} lit={0.6} />;
  }
}

function FloatingItem({ f, scale }: { f: Floater; scale: number }) {
  const style = {
    animation: `mz-drift ${f.dur}s ease-in-out ${-f.delay}s infinite`,
    '--dx': `${f.dx}px`,
    '--dy': `${f.dy}px`,
    '--r0': `${f.r0 ?? 0}deg`,
    '--r1': `${f.r1 ?? 0}deg`,
  } as CSSProperties;
  return (
    <div className={clsx('absolute', !f.mobile && 'hidden sm:block')} style={{ left: `${f.left}%`, top: `${f.top}%` }}>
      <div style={style}>
        <ArtPiece art={f.art} size={Math.round(f.size * scale)} />
      </div>
    </div>
  );
}

function Skyline({ scale, dim }: { scale: number; dim?: boolean }) {
  return (
    <div className={clsx('absolute inset-x-0 -bottom-3 flex items-end justify-center', dim ? 'opacity-40' : 'opacity-70')}>
      {SKYLINE.map((b, i) => (
        <IsoBlock
          key={i}
          width={Math.round(b.w * scale)}
          height={b.h}
          color={b.color}
          roof={b.roof}
          seed={i + 3}
          lit={0.42}
          className="-mx-[2px] shrink-0"
          style={{ marginBottom: (i % 3) * 5 * scale }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
    </div>
  );
}

function Glows({ tint }: { tint?: string }) {
  return (
    <>
      <div
        className="absolute rounded-full"
        style={{
          width: '95vmax',
          height: '95vmax',
          left: 'calc(50% - 47.5vmax)',
          top: '-52vmax',
          background: 'radial-gradient(closest-side, rgba(58,140,214,0.42), rgba(58,140,214,0.12) 50%, transparent 72%)',
          animation: 'mz-breathe 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: '70vmax',
          height: '70vmax',
          left: '-28vmax',
          bottom: '-34vmax',
          background: 'radial-gradient(closest-side, rgba(255,194,31,0.22), transparent 70%)',
          animation: 'mz-breathe 9s ease-in-out -3s infinite',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: '55vmax',
          height: '55vmax',
          right: '-22vmax',
          top: '22%',
          background: 'radial-gradient(closest-side, rgba(34,211,197,0.14), transparent 70%)',
        }}
      />
      {tint && (
        <div
          className="absolute rounded-full"
          style={{
            width: '80vmax',
            height: '80vmax',
            left: 'calc(50% - 40vmax)',
            top: 'calc(32% - 40vmax)',
            background: `radial-gradient(closest-side, ${alpha(tint, 0.32)}, transparent 70%)`,
            animation: 'mz-breathe 6s ease-in-out infinite',
          }}
        />
      )}
    </>
  );
}

// ───────────────────────── backdrop ─────────────────────────

export interface MenuBackdropProps {
  /** 'full' = parallax floating game objects (title screen); 'calm' = gradient, batik, stars, skyline. */
  variant?: 'full' | 'calm';
  /** Extra coloured glow (e.g. winner colour). */
  tint?: string;
  /** Hide the skyline (e.g. when a sticky footer sits at the bottom). */
  skyline?: boolean;
}

/**
 * Night-indigo backdrop with kawung batik, soft brand-blue / gold glows, twinkling stars,
 * an isometric night skyline and (in 'full') parallax layers of floating game objects.
 */
export function MenuBackdrop({ variant = 'full', tint, skyline = true }: MenuBackdropProps) {
  const full = variant === 'full';
  const { x, y } = useParallax(full);
  const scale = useStageScale();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Keyframes />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(130% 95% at 50% 18%, #1B2A6B 0%, #0B1026 52%, #05081A 100%)' }}
      />
      <ParallaxLayer x={x} y={y} depth={0.3} className="-inset-10">
        <div className="batik-bg absolute inset-0 opacity-90" />
      </ParallaxLayer>
      <Glows tint={tint} />
      <ParallaxLayer x={x} y={y} depth={0.5}>
        {STARS.map((s, i) => (
          <span
            key={i}
            className={clsx('absolute rounded-full', s.gold ? 'bg-gold-300' : 'bg-white')}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animation: `mz-twinkle ${s.dur}s ease-in-out ${-s.delay}s infinite`,
            }}
          />
        ))}
      </ParallaxLayer>
      {skyline && (
        <ParallaxLayer x={x} y={y} depth={0.8} className="-inset-x-8">
          <Skyline scale={scale} dim={!full} />
        </ParallaxLayer>
      )}
      {full && (
        <>
          <ParallaxLayer x={x} y={y} depth={1.5}>
            {MID.map((f, i) => (
              <FloatingItem key={i} f={f} scale={scale} />
            ))}
          </ParallaxLayer>
          <ParallaxLayer x={x} y={y} depth={2.6}>
            {NEAR.map((f, i) => (
              <FloatingItem key={i} f={f} scale={scale} />
            ))}
          </ParallaxLayer>
        </>
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 100% at 50% 42%, transparent 58%, rgba(5,8,26,0.8) 100%)' }}
      />
    </div>
  );
}
