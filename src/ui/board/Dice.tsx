import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'framer-motion';
import clsx from 'clsx';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useGame } from '@/store/gameStore';
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
  1: 'translateZ(calc(var(--c) * 0.51))',
  6: 'rotateY(180deg) translateZ(calc(var(--c) * 0.51))',
  3: 'rotateY(90deg) translateZ(calc(var(--c) * 0.51))',
  4: 'rotateY(-90deg) translateZ(calc(var(--c) * 0.51))',
  2: 'rotateX(90deg) translateZ(calc(var(--c) * 0.51))',
  5: 'rotateX(-90deg) translateZ(calc(var(--c) * 0.51))',
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
            <div className={clsx('bz-dice-pair', !rolling && 'bz-dice-idle')} style={{ position: 'relative' }}>
              <Die value={dice?.[0] ?? null} rolling={rolling} index={0} />
              <Die value={dice?.[1] ?? null} rolling={rolling} index={1} />
              <AnimatePresence>
                {!rolling && dice && (
                  <motion.div
                    key={key}
                    className="bz-sum num"
                    style={{
                      fontSize: Math.max(12, c * 0.26),
                      ...(doubles ? { background: 'linear-gradient(180deg,#FFE08A,#FF4FD8)' } : null),
                    }}
                    initial={{ opacity: 0, scale: 0.3, x: '-50%' }}
                    animate={{ opacity: 1, scale: 1, x: '-50%' }}
                    exit={{ opacity: 0, scale: 0.5, x: '-50%' }}
                    transition={{ type: 'spring', stiffness: 520, damping: 20, delay: 0.25 }}
                  >
                    {doubles ? `Dobel ${sum}!` : sum}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Die({ value, rolling, index }: { value: number | null; rolling: boolean; index: number }) {
  const { c } = useCam();
  const reduce = useReducedMotion();
  const rx = useMotionValue(value ? FACE_ROT[value][0] : -30);
  const ry = useMotionValue(value ? FACE_ROT[value][1] : 30);
  const lift = useMotionValue(0);
  const spin = useMotionValue(0);
  const first = useRef(true);

  useEffect(() => {
    const ctl: AnimationPlaybackControls[] = [];
    const wasFirst = first.current;
    first.current = false;
    if (rolling) {
      const dir = index === 0 ? 1 : -1;
      ctl.push(
        animate(rx, rx.get() + 720 * dir, { duration: 0.62, ease: 'linear', repeat: Infinity }),
        animate(ry, ry.get() - 540 * dir, { duration: 0.5, ease: 'linear', repeat: Infinity }),
        animate(spin, [0, 14 * dir, -10 * dir, 0], { duration: 0.5, repeat: Infinity }),
        animate(lift, [0, -c * (0.75 + index * 0.2), 0], {
          duration: 0.42 + index * 0.06,
          ease: ['easeOut', 'easeIn'],
          times: [0, 0.5, 1],
          repeat: Infinity,
        }),
      );
    } else if (value) {
      const [tx, ty] = FACE_ROT[value];
      if (wasFirst || reduce) {
        rx.set(tx);
        ry.set(ty);
      } else {
        const fwd = (cur: number, to: number) => Math.ceil((cur - to) / 360) * 360 + 360 + to;
        const spring = { type: 'spring' as const, stiffness: 140, damping: 14, mass: 0.9 };
        ctl.push(
          animate(rx, fwd(rx.get(), tx), spring),
          animate(ry, fwd(ry.get(), ty), spring),
          animate(spin, 0, { duration: 0.3 }),
          animate(lift, [lift.get(), -c * 0.18, 0], { duration: 0.45, times: [0, 0.4, 1] }),
        );
      }
    }
    return () => ctl.forEach((a) => a.stop());
  }, [rolling, value, index, c, reduce, rx, ry, lift, spin]);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div style={{ y: lift, rotate: spin }}>
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
      <div className="bz-die-shadow" style={{ marginTop: -c * 0.22 }} />
    </div>
  );
}
