import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'framer-motion';
import clsx from 'clsx';
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getCharacter } from '@/data/characters';
import { forwardDistance } from '@/data/layout';
import { useGame } from '@/store/gameStore';
import { speedFactor } from '@/store/settingsStore';
import { depthZ, flatCss, useAnchor, useCam, useLive } from './camera';
import { mix } from './color';
import { CELL_N, pawnSpot, project, screenDepth, type Point } from './geometry';

/** Pawn scale by how many pawns share the tile, so a cluster never overlaps completely. */
const CLUSTER_SCALE = [1, 1, 0.86, 0.8, 0.75];
/** Hop height in normalised units (screen-space lift, so it reads in every camera). */
const HOP_N = CELL_N * 0.62;
const FLY_N = CELL_N * 2.6;

const EMPTY: Record<string, never> = {};

/** All live 2D PNG sprite pawns standing upright on the board. */
export function PawnsLayer() {
  const players = useGame((s) => s.game?.players);
  const positions = useGame(useShallow((s) => s.view?.positions ?? EMPTY));
  const bankrupt = useGame(useShallow((s) => s.view?.bankrupt ?? EMPTY));
  const island = useGame(useShallow((s) => s.view?.islandTurns ?? EMPTY));
  const activeId = useGame((s) => s.view?.activePlayerId ?? '');
  const { c } = useCam();
  if (!players) return null;

  const alive = players.filter((p) => !bankrupt[p.id] && positions[p.id] !== undefined);
  const byTile = new Map<number, string[]>();
  alive.forEach((p) => {
    const t = positions[p.id];
    const list = byTile.get(t) ?? [];
    list.push(p.id);
    byTile.set(t, list);
  });
  const boost = c < 42 ? 1.24 : c < 58 ? 1.12 : 1.04;

  return (
    <AnimatePresence>
      {alive.map((p) => {
        const tile = positions[p.id];
        const group = byTile.get(tile) ?? [p.id];
        const ch = getCharacter(p.characterId);
        return (
          <Pawn
            key={p.id}
            id={p.id}
            color={p.color}
            sprite={ch.sprite}
            name={p.name}
            tile={tile}
            slot={group.indexOf(p.id)}
            count={group.length}
            active={p.id === activeId}
            island={island[p.id] ?? 0}
            boost={boost}
          />
        );
      })}
    </AnimatePresence>
  );
}

interface PawnProps {
  id: string;
  color: string;
  sprite: string;
  name: string;
  tile: number;
  slot: number;
  count: number;
  active: boolean;
  island: number;
  boost: number;
}

interface Poof {
  id: number;
  u: number;
  v: number;
}
let poofSeq = 1;

const Pawn = memo(function Pawn({ id, color, sprite, name, tile, slot, count, active, island, boost }: PawnProps) {
  const { tilt, yaw, k, S } = useCam();
  const reduce = useReducedMotion();
  const base = (CLUSTER_SCALE[Math.min(count, 4)] ?? 0.75) * boost;
  const start = pawnSpot(tile, slot, count);

  const u = useMotionValue(start.u);
  const v = useMotionValue(start.v);
  const h = useMotionValue(0); // screen-space lift, normalised
  const s = useMotionValue(base);
  const o = useMotionValue(1);
  const [poofs, setPoofs] = useState<Poof[]>([]);
  const last = useRef({ tile, slot, count, base });

  useEffect(() => {
    const prev = last.current;
    last.current = { tile, slot, count, base };
    if (prev.tile === tile && prev.slot === slot && prev.count === count && prev.base === base) return;
    const target = pawnSpot(tile, slot, count);
    const sf = speedFactor();
    const ctl: AnimationPlaybackControls[] = [];
    let cancelled = false;

    const addPoof = (p: Point) => {
      const pf = { id: poofSeq++, u: p.u, v: p.v };
      setPoofs((list) => [...list, pf]);
      setTimeout(() => setPoofs((list) => list.filter((x) => x.id !== pf.id)), 700);
    };

    if (reduce) {
      u.set(target.u);
      v.set(target.v);
      h.set(0);
      s.set(base);
      o.set(1);
    } else if (prev.tile === tile) {
      // Someone joined or left this tile: slide into the new cluster offset spot.
      const t = { duration: 0.26, ease: 'easeOut' as const };
      ctl.push(animate(u, target.u, t), animate(v, target.v, t), animate(s, base, t));
    } else {
      const mv = useGame.getState().view?.moving;
      const mode = mv && mv.playerId === id ? mv.mode : 'walk';
      const d = forwardDistance(prev.tile, tile);
      const adjacent = d === 1 || d === 31;
      if (mode === 'fly') {
        const dur = 1.1 * sf;
        const ease = [0.45, 0, 0.25, 1] as const;
        ctl.push(
          animate(u, target.u, { duration: dur, ease }),
          animate(v, target.v, { duration: dur, ease }),
          animate(h, [h.get(), FLY_N, 0], { duration: dur, times: [0, 0.5, 1], ease: ['easeOut', 'easeIn'] }),
          animate(s, [s.get(), base * 1.65, base * 1.08, base], { duration: dur + 0.15, times: [0, 0.5, 0.88, 1] }),
        );
      } else if (mode === 'jump') {
        addPoof({ u: u.get(), v: v.get() });
        const out = { duration: 0.16 * sf, ease: 'easeIn' as const };
        const a = animate(s, 0, out);
        ctl.push(a, animate(o, 0, out));
        void a.then(() => {
          if (cancelled) return;
          u.set(target.u);
          v.set(target.v);
          h.set(0);
          addPoof(target);
          ctl.push(
            animate(s, base, { type: 'spring', stiffness: 520, damping: 17 }),
            animate(o, 1, { duration: 0.12 }),
          );
        });
      } else {
        // Walk: bouncy hop (translateY lift + scale squash & stretch) on each step.
        const dur = adjacent ? Math.max(0.11, 0.21 * sf) : 0.42 * sf;
        const lift = adjacent ? HOP_N : HOP_N * 1.9;
        ctl.push(
          animate(u, target.u, { duration: dur, ease: 'easeInOut' }),
          animate(v, target.v, { duration: dur, ease: 'easeInOut' }),
          animate(h, [h.get(), lift, 0], { duration: dur, times: [0, 0.45, 1], ease: ['easeOut', 'easeIn'] }),
          animate(s, [s.get(), base * 1.15, base * 0.94, base], {
            duration: dur,
            times: [0, 0.45, 0.88, 1],
          }),
          animate(o, 1, { duration: 0.1 }),
        );
      }
    }
    return () => {
      cancelled = true;
      ctl.forEach((c) => c.stop());
    };
  }, [tile, slot, count, base, id, reduce, u, v, h, s, o]);

  const body = useLive([u, v, h, s, tilt, yaw], () => {
    const p = project(u.get(), v.get(), 0, tilt.get(), k, yaw.get());
    const hh = h.get();
    const sc = (p.f * s.get()).toFixed(4);
    return `translate3d(${(p.x * S).toFixed(2)}px,${(p.y * S - hh * S * p.f).toFixed(2)}px,0) scale3d(${sc},${sc},1)`;
  });
  const ground = useLive([u, v, h, s, tilt, yaw], () => {
    const shrink = 1 - Math.min(0.55, (h.get() / (CELL_N * 3)) * 0.9);
    return flatCss(u.get(), v.get(), tilt.get(), k, S, s.get() * shrink, yaw.get());
  });
  // Dynamic z-index by screen depth + slot offset + active turn bonus so stacked pawns layer cleanly
  const z = useLive([u, v, h, yaw], () => {
    const lifted = h.get() > CELL_N ? 4000 : 0;
    return depthZ(screenDepth(u.get(), v.get(), yaw.get()), 40) + lifted + slot * 3 + (active ? 12 : 0);
  });

  const vars = {
    '--pc': color,
    '--pc-hi': mix(color, '#FFFFFF', 0.5),
    '--pc-lo': mix(color, '#05081A', 0.38),
  } as CSSProperties;

  return (
    <>
      {/* flat on the board: active turn glow ring under the wooden base */}
      <motion.div
        className="bz-anchor"
        style={{ transform: ground, zIndex: 3, opacity: o }}
        exit={{ opacity: 0, transition: { duration: 0.4 } }}
      >
        {active && (
          <div className="bz-mid" style={vars}>
            <div className="bz-ring" />
          </div>
        )}
      </motion.div>

      {/* upright 2D PNG pawn sprite (transform-origin: bottom center, unaffected by board perspective tilt) */}
      <motion.div
        className="bz-anchor"
        style={{ transform: body, zIndex: z, opacity: o }}
        exit={{ opacity: 0, transition: { duration: 0.5 } }}
      >
        <div className="bz-stand">
          <div className="bz-pawn" style={vars} title={name}>
            <div className={clsx('bz-pawn-inner', active && 'bz-bob')}>
              <img
                src={sprite}
                alt={name}
                decoding="async"
                draggable={false}
                className="bz-pawn-sprite"
              />
              {island > 0 && <span className="bz-pawn-tag num">🏝️{island}</span>}
            </div>
          </div>
        </div>
      </motion.div>

      {poofs.map((pf) => (
        <PoofBurst key={pf.id} u={pf.u} v={pf.v} />
      ))}
    </>
  );
});

const PUFFS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

/** Smoke puff used when a pawn teleports ('jump' moves). */
function PoofBurst({ u, v }: { u: number; v: number }) {
  const t = useAnchor(u, v, 0);
  const { c } = useCam();
  return (
    <motion.div className="bz-anchor" style={{ transform: t, zIndex: 9000 }}>
      <div style={{ position: 'absolute', left: 0, top: -c * 0.35 }}>
        {PUFFS.map((a, i) => (
          <motion.span
            key={i}
            className="bz-puff"
            initial={{ x: 0, y: 0, scale: 0.6, opacity: 0.95 }}
            animate={{ x: Math.cos(a) * c * 0.55, y: Math.sin(a) * c * 0.38, scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </div>
    </motion.div>
  );
}
