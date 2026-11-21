import { AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import clsx from 'clsx';
import { Dices } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '@/audio';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/store/settingsStore';
import { Avatar, Button } from '@/ui/common';

/** Shorter presses count as a plain tap (pure random roll, no power). */
const HOLD_MIN_MS = 200;
/** One full ping-pong sweep (0 → 1 → 0). */
const PERIOD_MS = 1200;
const HINT_KEY = 'monopoliz.hint.gauge';
const SUMS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** Zone boundaries in gauge space: sums 2–5 | 6–8 | 9–12. */
const ZONES = [
  { label: 'Kecil', from: 0, to: 0.35, className: 'from-laut-600/70 to-laut-400/70' },
  { label: 'Sedang', from: 0.35, to: 0.65, className: 'from-brand-600/70 to-brand-400/70' },
  { label: 'Besar', from: 0.65, to: 1, className: 'from-gold-500/75 to-merah-500/75' },
];

function readHintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHintSeen() {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* ignore */
  }
}

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

function GaugeBar({ pos, charging, compact }: { pos: MotionValue<number>; charging: boolean; compact: boolean }) {
  const carrierX = useTransform(pos, (v) => `${(v - 1) * 100}%`);
  const sum = useTransform(pos, (v) => Math.round(2 + v * 10));
  const labels = compact ? SUMS.filter((s) => s % 2 === 0) : SUMS;

  return (
    <div className="relative w-full select-none" aria-hidden>
      {/* zone labels */}
      <div className="mb-1 flex font-display text-[10px] font-semibold uppercase tracking-wider text-ink-200">
        {ZONES.map((z) => (
          <span key={z.label} className="text-center" style={{ width: `${(z.to - z.from) * 100}%` }}>
            {z.label}
          </span>
        ))}
      </div>

      <div className="relative">
        {/* track */}
        <div className={clsx('relative overflow-hidden rounded-full border border-white/20 bg-ink-950/70', compact ? 'h-5' : 'h-6')}>
          {ZONES.map((z) => (
            <span
              key={z.label}
              className={clsx('absolute inset-y-0 bg-gradient-to-r', z.className)}
              style={{ left: `${z.from * 100}%`, width: `${(z.to - z.from) * 100}%` }}
            />
          ))}
          {SUMS.map((s) => (
            <span
              key={s}
              className="absolute inset-y-1 w-px bg-white/30"
              style={{ left: `${((s - 2) / 10) * 100}%` }}
            />
          ))}
          <span className="absolute inset-x-0 top-0 h-1/2 bg-white/10" />
        </div>

        {/* needle: a full-width carrier translated by (pos-1)*100% keeps the animation transform-only */}
        <motion.div className="pointer-events-none absolute inset-0" style={{ x: carrierX }}>
          <motion.div
            className="absolute -bottom-1 -top-1 right-0 w-1.5 translate-x-1/2 rounded-full bg-white"
            style={{ boxShadow: '0 0 10px #fff, 0 0 18px rgba(255,194,31,0.9)' }}
            animate={{ opacity: charging ? 1 : 0.35 }}
          />
          <div className="absolute bottom-full right-0 mb-1.5 translate-x-1/2">
            <AnimatePresence>
              {charging && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                >
                  <motion.span className="num block min-w-7 rounded-lg bg-white px-1.5 text-center text-sm font-bold leading-6 text-ink-950 shadow-glow-gold">
                    {sum}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* sum labels */}
      <div className="relative mt-0.5 h-3.5">
        {labels.map((s) => (
          <span
            key={s}
            className="num absolute -translate-x-1/2 text-[10px] font-semibold leading-none text-ink-300"
            style={{ left: `${((s - 2) / 10) * 100}%` }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface DiceRollerProps {
  /** 'row' = gauge beside the button (wide screens), 'stack' = gauge above a full-width button */
  layout?: 'row' | 'stack';
  /** Narrow column: fewer labels, smaller button */
  compact?: boolean;
  /** Short screens: smaller button */
  dense?: boolean;
  /** Hotseat: show whose turn it is on the button */
  player?: { name: string; characterId: string } | null;
}

/**
 * "Gas Meter" dice roller: hold to charge — a needle ping-pongs over the 2..12 gauge — release to roll
 * with that power. A quick tap rolls without power. Space/Enter work the same way.
 */
export function DiceRoller({ layout = 'stack', compact = false, dense = false, player }: DiceRollerProps) {
  const pos = useMotionValue(0.5);
  const [charging, setCharging] = useState(false);
  const [hintSeen, setHintSeen] = useState(readHintSeen);
  const chargingRef = useRef(false);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const lastSumRef = useRef(-1);
  const lastTickRef = useRef(0);
  const lockedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const frame = useCallback(() => {
    const now = performance.now();
    const t = ((now - startRef.current) % PERIOD_MS) / PERIOD_MS;
    const p = t < 0.5 ? t * 2 : 2 - t * 2;
    pos.set(p);
    const sum = Math.round(2 + p * 10);
    if (sum !== lastSumRef.current) {
      lastSumRef.current = sum;
      if (now - lastTickRef.current > 70) {
        lastTickRef.current = now;
        sfx.play('gauge', { pitch: 0.85 + p * 0.5, volume: 0.6 });
      }
    }
    rafRef.current = requestAnimationFrame(frame);
  }, [pos]);

  const start = useCallback(() => {
    if (chargingRef.current || lockedRef.current) return;
    chargingRef.current = true;
    startRef.current = performance.now();
    lastSumRef.current = -1;
    pos.set(0);
    setCharging(true);
    haptic(8);
    rafRef.current = requestAnimationFrame(frame);
  }, [frame, pos]);

  const roll = useCallback((power?: number) => {
    lockedRef.current = true;
    // If the engine rejects the roll the pending stays 'roll' — unlock so the player can retry.
    window.setTimeout(() => (lockedRef.current = false), 600);
    useGame.getState().act(power === undefined ? { type: 'ROLL' } : { type: 'ROLL', power });
  }, []);

  const release = useCallback(
    (cancel = false) => {
      if (!chargingRef.current) return;
      chargingRef.current = false;
      cancelAnimationFrame(rafRef.current);
      setCharging(false);
      window.setTimeout(() => (suppressClickRef.current = false), 350);
      if (cancel) return;
      const held = performance.now() - startRef.current;
      if (held < HOLD_MIN_MS) {
        pos.set(0.5);
        roll();
        return;
      }
      const power = Math.max(0, Math.min(1, pos.get()));
      haptic(20);
      if (!hintSeen) {
        writeHintSeen();
        setHintSeen(true);
      }
      roll(power);
    },
    [hintSeen, pos, roll],
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Keyboard: hold Space/Enter to charge.
  useEffect(() => {
    const isRollKey = (e: KeyboardEvent) => e.key === ' ' || e.key === 'Enter' || e.code === 'Space';
    const down = (e: KeyboardEvent) => {
      if (!isRollKey(e) || e.defaultPrevented || isTypingTarget(e.target)) return;
      const a = document.activeElement;
      if (a && a !== document.body && a !== btnRef.current && (a instanceof HTMLButtonElement || a instanceof HTMLAnchorElement)) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      if (e.repeat) return;
      suppressClickRef.current = true;
      start();
    };
    const up = (e: KeyboardEvent) => {
      if (!isRollKey(e) || !chargingRef.current) return;
      e.preventDefault();
      release();
    };
    const blur = () => release(true);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [start, release]);

  const row = layout === 'row';
  const small = compact || dense;
  const label = charging ? 'LEPAS!' : 'LEMPAR DADU';

  const button = (
    <motion.div
      className={clsx('relative', row ? 'shrink-0' : 'w-full')}
      animate={charging ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={charging ? { duration: 0.45, repeat: Infinity } : { type: 'spring', stiffness: 400, damping: 20 }}
    >
      {charging && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 animate-pulse rounded-[1.75rem] shadow-glow-gold"
        />
      )}
      <Button
        ref={btnRef}
        variant="gold"
        size={small ? 'md' : 'lg'}
        silent
        block={!row}
        aria-label={player ? `Giliran ${player.name}: lempar dadu. Tahan untuk atur kekuatan.` : 'Lempar dadu. Tahan untuk atur kekuatan.'}
        icon={
          player ? (
            <Avatar characterId={player.characterId} size={small ? 24 : 30} ring={false} />
          ) : (
            <Dices size={small ? 20 : 24} aria-hidden />
          )
        }
        className={clsx('touch-none [-webkit-touch-callout:none]', row && (compact ? 'min-w-[168px]' : 'min-w-[210px]'), compact && '!px-3 !text-base')}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          suppressClickRef.current = true;
          start();
        }}
        onPointerUp={() => release()}
        onPointerCancel={() => release(true)}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          // Assistive tech "click" without pointer events → quick roll.
          if (suppressClickRef.current) return;
          roll();
        }}
      >
        <span className="flex flex-col items-start leading-none">
          <span className="font-bold tracking-wide">{label}</span>
          {player && !small && <span className="mt-0.5 text-[11px] font-semibold normal-case opacity-75">Giliran {player.name}</span>}
        </span>
      </Button>
    </motion.div>
  );

  return (
    <div className="relative w-full">
      <AnimatePresence>
        {!hintSeen && !charging && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-full mb-2 flex justify-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: [0, -4, 0] }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ y: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.25 } }}
          >
            <span className="whitespace-nowrap rounded-full border border-gold-400/40 bg-ink-950/85 px-3 py-1 text-xs font-semibold text-gold-200 shadow-glass">
              👆 Tahan untuk atur kekuatan dadu
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={clsx('flex w-full', row ? (compact ? 'items-center gap-3' : 'items-center gap-4') : 'flex-col items-stretch gap-2')}>
        <div className={clsx(row ? 'min-w-0 flex-1' : 'w-full', 'px-2 pt-1')}>
          <GaugeBar pos={pos} charging={charging} compact={compact} />
        </div>
        {button}
      </div>
    </div>
  );
}
