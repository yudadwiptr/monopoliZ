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
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '@/store/gameStore';
import { speedFactor, useSettings } from '@/store/settingsStore';
import { useAnchor, useCam } from './camera';

/**
 * Cube rotation [x, y] (deg) that turns face `n` UP — the rolled value is read on the top face, like real
 * dice on a table. Faces: front 1, top 2, right 3, left 4, bottom 5, back 6. The cube transform is
 * `rotateX(x) rotateY(y)`, i.e. a face normal is rotated by Y first, then by X.
 */
const FACE_ROT: Record<number, [number, number]> = {
  1: [90, 0],
  2: [0, 0],
  3: [-90, 90],
  4: [-90, -90],
  5: [180, 0],
  6: [-90, 0],
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

/**
 * Two proportional 3D dice in the middle of the pit (u=0, v=0.02):
 * - Tumble smoothly from a natural throw into the center pit
 * - Bounce and settle organically at a compact Get Rich scale
 */
export function Dice() {
  const { c } = useCam();
  const key = useGame((s) => (s.view?.dice ? s.view.dice.join(',') : ''));
  const rolling = useGame((s) => !!s.view?.diceRolling);
  const anchor = useAnchor(0, 0.02, 0);
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
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.65, transition: { duration: 0.2 } }}
          >
            <div className="bz-dice-arena" style={{ width: c * 2.2, height: c * 1.4 }}>
              <Die value={dice?.[0] ?? null} rolling={rolling} index={0} doubles={doubles} />
              <Die value={dice?.[1] ?? null} rolling={rolling} index={1} doubles={doubles} />

              {!rolling && dice && (
                <span className="sr-only" aria-live="polite">
                  {`Hasil dadu ${dice[0]} dan ${dice[1]}, total ${sum}${doubles ? ', dobel' : ''}`}
                </span>
              )}
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
 * One 3D die: compact Get Rich proportion, smooth parabolic throw & bounce on the pit floor.
 */
function Die({
  value,
  rolling,
  index,
  doubles,
}: {
  value: number | null;
  rolling: boolean;
  index: number;
  doubles: boolean;
}) {
  const { c } = useCam();
  const skin = useSettings((s) => s.diceSkin);
  const reduce = useReducedMotion();
  const dir = index === 0 ? -1 : 1;

  // Compact organic resting offset in the center pit (just like the two dice in Get Rich)
  const restX = dir * c * 0.38 + (((value ?? 3) * 17 + index * 31) % 7 - 3) * (c * 0.018);
  const restY = (index === 0 ? -0.1 : 0.14) * c + (((value ?? 4) * 23 + index * 19) % 5 - 2) * (c * 0.015);

  const rx = useMotionValue(value ? FACE_ROT[value][0] : -30);
  const ry = useMotionValue(value ? FACE_ROT[value][1] : 30);
  const posX = useMotionValue(restX);
  const posY = useMotionValue(restY);
  const lift = useMotionValue(0);
  const spin = useMotionValue(dir * 12);
  const squash = useMotionValue(1);
  const stretch = useTransform(squash, (v) => 2 - v);
  const shadowScale = useTransform(lift, [-c * 1.4, 0], [0.4, 1]);
  const shadowOpacity = useTransform(lift, [-c * 1.4, 0], [0.22, 0.78]);
  const [impactPulse, setImpactPulse] = useState(0);
  const running = useRef<AnimationPlaybackControls[]>([]);
  const thrown = useRef(false);

  useEffect(() => () => running.current.forEach((a) => a.stop()), []);

  useEffect(() => {
    if (!value) return;
    const [tx, ty] = FACE_ROT[value];
    const restYaw = (((value * 41 + index * 67) % 22) - 11) + dir * 10;

    if (!rolling) {
      if (!thrown.current) {
        rx.set(tx);
        ry.set(ty);
        posX.set(restX);
        posY.set(restY);
        lift.set(0);
        spin.set(restYaw);
      }
      return;
    }

    running.current.forEach((a) => a.stop());
    thrown.current = true;
    if (reduce) {
      rx.set(tx);
      ry.set(ty);
      posX.set(restX);
      posY.set(restY);
      lift.set(0);
      spin.set(restYaw);
      return;
    }

    const sf = speedFactor();
    const d = 0.84 * sf;
    const delay = index * 0.04 * sf;
    const decel = [0.14, 0.72, 0.24, 1] as const;
    const h = c * (1.25 + index * 0.15);
    const impacts = [0.42, 0.68, 0.86, 0.98];

    const startX = dir * c * 0.95;
    const startY = c * 1.1;
    const bounce1X = restX - dir * c * 0.14;
    const bounce1Y = restY - c * 0.16;

    posX.set(startX);
    posY.set(startY);
    lift.set(-h * 0.35);

    running.current = [
      animate(rx, forwardTo(rx.get(), tx, 3 + index), { duration: d, delay, ease: decel }),
      animate(ry, forwardTo(ry.get(), ty, 2 + (1 - index)), { duration: d, delay, ease: decel }),
      animate(posX, [startX, bounce1X, restX + dir * c * 0.05, restX], {
        duration: d,
        delay,
        times: [0, impacts[0], impacts[1], 1],
        ease: 'easeOut',
      }),
      animate(posY, [startY, bounce1Y, restY - c * 0.04, restY], {
        duration: d,
        delay,
        times: [0, impacts[0], impacts[1], 1],
        ease: 'easeOut',
      }),
      animate(spin, [dir * 65, -dir * 22, dir * 14, restYaw], {
        duration: d,
        delay,
        times: [0, impacts[0], impacts[1], 1],
      }),
      animate(
        lift,
        [-h * 0.35, -h, 0, -h * 0.44, 0, -h * 0.15, 0, -h * 0.03, 0],
        {
          duration: d,
          delay,
          times: [0, 0.18, impacts[0], 0.55, impacts[1], 0.77, impacts[2], 0.92, impacts[3]],
          ease: ['easeOut', 'easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn'],
        },
      ),
      animate(squash, [1, 1.06, 0.8, 1.03, 0.9, 1, 0.96, 1], {
        duration: d,
        delay,
        times: [0, 0.18, impacts[0], impacts[0] + 0.07, impacts[1], impacts[1] + 0.05, impacts[2], 1],
      }),
    ];

    const impactTimer = setTimeout(() => setImpactPulse((n) => n + 1), (delay + d * impacts[0]) * 1000);
    const done = setTimeout(() => (thrown.current = false), (d + delay) * 1000 + 40);
    return () => {
      clearTimeout(impactTimer);
      clearTimeout(done);
    };
  }, [rolling, value, index, c, dir, restX, restY, reduce, rx, ry, posX, posY, lift, spin, squash]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '55%',
        x: posX,
        y: posY,
      }}
    >
      <AnimatePresence>
        {impactPulse > 0 && (
          <motion.span
            key={impactPulse}
            className={clsx('bz-die-ring', doubles && 'bz-die-ring-double')}
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 1.9, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="bz-die-shadow"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          translateX: '-50%',
          translateY: '-35%',
          scale: shadowScale,
          opacity: shadowOpacity,
        }}
      />

      <motion.div
        style={{
          y: lift,
          rotate: spin,
          scaleY: squash,
          scaleX: stretch,
          transformOrigin: '50% 85%',
          marginLeft: 'calc(var(--c) * -0.27)',
          marginTop: 'calc(var(--c) * -0.27)',
        }}
      >
        <div className={clsx('bz-die', doubles && !rolling && 'bz-die-double')} data-skin={skin}>
          <div className="bz-die-view">
            <motion.div className="bz-cube" style={{ rotateX: rx, rotateY: ry }}>
              {CORES.map((t) => (
                <div key={t} className="bz-core" style={{ transform: t, inset: '1%' }} />
              ))}
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bz-face" style={{ transform: FACE_TRANSFORM[n] }}>
                  {PIPS[n].map(([r, col], i) => (
                    <span
                      key={i}
                      className={clsx('bz-pip', (n === 1 || n === 4) && 'bz-pip-red')}
                      style={{ gridRow: r, gridColumn: col } as CSSProperties}
                    />
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
