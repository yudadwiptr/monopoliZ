import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from 'framer-motion';
import clsx from 'clsx';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useGame } from '@/store/gameStore';
import { speedFactor } from '@/store/settingsStore';
import { useAnchor, useCam } from './camera';
import { CELL_N } from './geometry';

/** Board point the dice stand on: centre, a little toward the viewer (below the printed logo). */
const DICE_V = CELL_N * 1.15;

/** Cube rotation [x, y] (deg) that brings face `n` to the front. Faces: front 1, top 2, right 3, left 4, bottom 5, back 6. */
const FACE_ROT: Record<number, [number, number]> = {
  1: [0, 0],
  2: [-90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [90, 0],
  6: [0, 180],
};

const FACE_TRANSFORM: Record<number, string> = {
  1: 'translateZ(calc(var(--die) * 0.5))',
  6: 'rotateY(180deg) translateZ(calc(var(--die) * 0.5))',
  3: 'rotateY(90deg) translateZ(calc(var(--die) * 0.5))',
  4: 'rotateY(-90deg) translateZ(calc(var(--die) * 0.5))',
  2: 'rotateX(90deg) translateZ(calc(var(--die) * 0.5))',
  5: 'rotateX(-90deg) translateZ(calc(var(--die) * 0.5))',
};

/** Pip positions [row, col] on a 3×3 grid. */
const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [
    [1, 1],
    [3, 3],
  ],
  3: [
    [1, 1],
    [2, 2],
    [3, 3],
  ],
  4: [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ],
  5: [
    [1, 1],
    [1, 3],
    [2, 2],
    [3, 1],
    [3, 3],
  ],
  6: [
    [1, 1],
    [2, 1],
    [3, 1],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
};

const CORES = ['none', 'rotateX(90deg)', 'rotateY(90deg)'];

/** Two CSS-3D dice in the middle of the board: tumble while rolling, land on the rolled faces. */
export function Dice() {
  const { c } = useCam();
  const key = useGame((s) => (s.view?.dice ? s.view.dice.join(',') : ''));
  const rolling = useGame((s) => !!s.view?.diceRolling);
  const anchor = useAnchor(0, DICE_V, 0);
  const dice = key ? (key.split(',').map(Number) as [number, number]) : null;
  const show = rolling || !!dice;
  const sum = dice ? dice[0] + dice[1] : 0;
  const doubles = !!dice && dice[0] === dice[1];

  return (
    <motion.div className="bz-anchor" style={{ transform: anchor, zIndex: 8500 }}>
      <AnimatePresence>
        {show && (
          <motion.div
            key="dice"
            className="bz-stand"
            initial={{ opacity: 0, scale: 0.4, y: -60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          >
            <div className="bz-dice-stack">
              <div className="bz-dice-pair">
                <Die value={dice?.[0] ?? null} rolling={rolling} index={0} />
                <Die value={dice?.[1] ?? null} rolling={rolling} index={1} />
              </div>
              {/* Result chip sits in its own row so the dice never cover it. Space is reserved while rolling. */}
              <div style={{ minHeight: Math.max(20, c * 0.36) }}>
                <AnimatePresence mode="wait">
                  {!rolling && dice && (
                    <motion.div
                      key={key}
                      className={clsx('bz-sum', doubles && 'bz-sum-dobel')}
                      style={{ fontSize: Math.max(11, c * 0.22) }}
                      initial={{ opacity: 0, scale: 0.4, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 20, delay: 0.15 }}
                      aria-label={`Hasil dadu ${dice[0]} dan ${dice[1]}, total ${sum}${doubles ? ', dobel' : ''}`}
                    >
                      <span className="bz-sum-parts">
                        {dice[0]} + {dice[1]} =
                      </span>
                      <span className="bz-sum-total">{sum}</span>
                      {doubles && <span className="bz-sum-parts">DOBEL!</span>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Forward-rotating target: the smallest angle >= `cur + minTurns*360` that lands on `to` (mod 360). */
function forwardTo(cur: number, to: number, minTurns: number): number {
  const base = cur + minTurns * 360;
  return base + ((((to - base) % 360) + 360) % 360);
}

/**
 * One die. A roll is a single continuous "throw": it slides in from the side, tumbles while
 * decelerating so it settles exactly on the rolled face, and bounces three times with a small
 * squash on each impact. The result is known when the roll starts, so there is no spin-then-snap.
 */
function Die({ value, rolling, index }: { value: number | null; rolling: boolean; index: number }) {
  const { c } = useCam();
  const reduce = useReducedMotion();
  const rx = useMotionValue(value ? FACE_ROT[value][0] : -30);
  const ry = useMotionValue(value ? FACE_ROT[value][1] : 30);
  const lift = useMotionValue(0);
  const slide = useMotionValue(0);
  const spin = useMotionValue(0);
  const squash = useMotionValue(1);
  const stretch = useTransform(squash, (v) => 2 - v);
  const shadowScale = useTransform(lift, [-c * 1.1, 0], [0.45, 1]);
  const shadowOpacity = useTransform(lift, [-c * 1.1, 0], [0.35, 1]);
  const running = useRef<AnimationPlaybackControls[]>([]);
  const thrown = useRef(false);

  useEffect(() => () => running.current.forEach((a) => a.stop()), []);

  useEffect(() => {
    if (!value) return;
    const [tx, ty] = FACE_ROT[value];
    // Small resting yaw so the pair never looks machine-aligned; derived from the value so it is stable.
    const restYaw = (((value * 37 + index * 53) % 15) - 7) * (index === 0 ? 1 : -1);

    if (!rolling) {
      // Landed (or loaded mid-game): only snap if no throw is in flight.
      if (!thrown.current) {
        rx.set(tx);
        ry.set(ty);
        spin.set(restYaw);
      }
      return;
    }

    running.current.forEach((a) => a.stop());
    thrown.current = true;
    if (reduce) {
      rx.set(tx);
      ry.set(ty);
      spin.set(restYaw);
      return;
    }

    const sf = speedFactor();
    const d = 1.05 * sf;
    const dir = index === 0 ? -1 : 1;
    const delay = index * 0.05 * sf;
    const decel = [0.12, 0.62, 0.2, 1] as const; // fast throw, long gentle settle
    const h = c * (0.95 + index * 0.12);
    const impacts = [0.3, 0.58, 0.78, 0.92];

    slide.set(dir * c * 0.9);
    lift.set(-h * 0.6);
    running.current = [
      animate(rx, forwardTo(rx.get(), tx, 2 + index), { duration: d, delay, ease: decel }),
      animate(ry, forwardTo(ry.get(), ty, 1), { duration: d, delay, ease: decel }),
      animate(slide, 0, { duration: d * 0.8, delay, ease: [0.2, 0.7, 0.3, 1] }),
      animate(spin, [dir * 40, -dir * 14, dir * 6, restYaw], {
        duration: d,
        delay,
        times: [0, impacts[0], impacts[1], 1],
      }),
      animate(lift, [-h * 0.6, 0, -h * 0.42, 0, -h * 0.14, 0, -h * 0.03, 0], {
        duration: d,
        delay,
        times: [0, impacts[0], 0.44, impacts[1], 0.68, impacts[2], 0.86, impacts[3]],
        ease: ['easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn'],
      }),
      animate(squash, [1, 0.82, 1, 0.9, 1, 0.96, 1], {
        duration: d,
        delay,
        times: [0, impacts[0], impacts[0] + 0.06, impacts[1], impacts[1] + 0.05, impacts[2], impacts[2] + 0.04],
      }),
    ];
    const done = setTimeout(() => (thrown.current = false), (d + delay) * 1000 + 50);
    return () => clearTimeout(done);
  }, [rolling, value, index, c, reduce, rx, ry, lift, slide, spin, squash]);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div style={{ x: slide, y: lift, rotate: spin, scaleY: squash, scaleX: stretch, transformOrigin: '50% 100%' }}>
        <div className="bz-die">
          <div className="bz-die-view">
            <motion.div className="bz-cube" style={{ rotateX: rx, rotateY: ry }}>
              {CORES.map((t) => (
                <div key={t} className="bz-core" style={{ transform: t, inset: '6%' }} />
              ))}
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bz-face" style={{ transform: FACE_TRANSFORM[n] }}>
                  {PIPS[n].map(([r, col], i) => (
                    <span
                      key={i}
                      className={clsx('bz-pip', n === 1 && 'bz-pip-red')}
                      style={{ gridRow: r, gridColumn: col } as CSSProperties}
                    />
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="bz-die-shadow"
        style={{ marginTop: -c * 0.15, x: slide, scale: shadowScale, opacity: shadowOpacity }}
      />
    </div>
  );
}
