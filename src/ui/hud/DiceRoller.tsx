import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '@/audio';
import { useGame } from '@/store/gameStore';
import { haptic } from '@/store/settingsStore';
import { PARITY_CHARGES, parityChargesOf } from '@/engine/economy';
import type { Parity } from '@/engine/types';

/** Shorter presses count as a plain tap (pure random roll, no power). */
const HOLD_MIN_MS = 180;
/** One full ping-pong sweep (0 → 1 → 0). */
const PERIOD_MS = 1100;
const HINT_KEY = 'monopoliz.hint.gauge';

function gaugeColor(p: number): string {
  if (p < 0.35) return '#2EE59D';
  if (p < 0.7) return '#FFC21F';
  return '#FF4F79';
}

/** The Genap/Ganjil pick survives between turns (per session), like a game setting. */
let rememberedParity: Parity | null = null;

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

export interface DiceRollerProps {
  /** Hotseat: show whose turn it is above the button */
  player?: { name: string; characterId: string } | null;
  /** Smaller variant for short screens (phone landscape) */
  compact?: boolean;
}

/**
 * 2D Cartoon Floating Bottom Dock (Monopoly GO / Meow Gambit style):
 * - Capsule container: `background: #2b2118`, `border: 3px solid #f5deb3`, `border-radius: 999px`,
 *   `padding: 8px 18px`, `box-shadow: 0 8px 20px rgba(0,0,0,0.4)`.
 * - GENAP on the left, prominent golden-orange LEMPAR button in the center, GANJIL on the right.
 * - Clean hint badge ("Tahan untuk atur kekuatan") attached neatly above the dock.
 */
export function DiceRoller({ player, compact = false }: DiceRollerProps) {
  const pos = useMotionValue(0.5);
  const [charging, setCharging] = useState(false);
  const [, setActiveSum] = useState(7);
  const [hintSeen, setHintSeen] = useState(readHintSeen);
  const charges = useGame((s) => {
    const p = s.game?.players[s.game.current];
    return p ? parityChargesOf(p) : 0;
  });

  const pickable = (pk: Parity | null) => (pk && charges > 0 ? pk : null);
  const [parityState, setParityState] = useState<Parity | null>(rememberedParity);
  const parity = pickable(parityState);
  const parityRef = useRef<Parity | null>(pickable(rememberedParity));
  parityRef.current = parity;
  const chargingRef = useRef(false);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const lastSumRef = useRef(-1);
  const lastTickRef = useRef(0);
  const lockedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const setParity = (next: Parity | null) => {
    rememberedParity = next;
    parityRef.current = next;
    setParityState(next);
    sfx.play('click');
    haptic(8);
  };

  const frame = useCallback(() => {
    const now = performance.now();
    const t = ((now - startRef.current) % PERIOD_MS) / PERIOD_MS;
    const raw = t < 0.5 ? t * 2 : 2 - t * 2;
    const p = 0.5 - 0.5 * Math.cos(raw * Math.PI);
    pos.set(p);
    const sum = Math.round(2 + p * 10);
    if (sum !== lastSumRef.current) {
      lastSumRef.current = sum;
      setActiveSum(sum);
      if (now - lastTickRef.current > 60) {
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
    lastSumRef.current = 2;
    setActiveSum(2);
    pos.set(0);
    setCharging(true);
    haptic(8);
    rafRef.current = requestAnimationFrame(frame);
  }, [frame, pos]);

  const roll = useCallback((power?: number) => {
    lockedRef.current = true;
    window.setTimeout(() => (lockedRef.current = false), 600);
    const pick = parityRef.current ?? undefined;
    useGame.getState().act({
      type: 'ROLL',
      ...(power === undefined ? {} : { power }),
      ...(pick ? { parity: pick } : {}),
    });
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

  // Gauge ring hugging the center coin while charging.
  const size = compact ? 64 : 74;
  const ring = compact ? 5 : 6;
  const box = size + ring * 2 + 4;
  const r = box / 2 - ring / 2;
  const circ = 2 * Math.PI * r;
  const dash = useTransform(pos, (p) => `${(0.04 + p * 0.96) * circ} ${circ}`);
  const ringColor = useTransform(pos, gaugeColor);
  const target = useTransform(pos, (p) => String(Math.round(2 + p * 10)));
  const empty = charges <= 0;

  return (
    <div className="flex select-none flex-col items-center gap-1.5" style={{ touchAction: 'none' }}>
      {/* Hint / turn badge neatly above the bottom dock */}
      <AnimatePresence initial={false} mode="wait">
        {!charging && (
          <motion.span
            key={player?.name ?? parity ?? (empty ? 'empty' : 'hint')}
            className="pointer-events-none whitespace-nowrap rounded-full border-[1.5px] border-[#f5deb3]/75 bg-[#2b2118]/95 px-3 py-0.5 font-display text-[11px] font-bold tracking-wide text-[#f5deb3] shadow-md"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {player
              ? `Giliran ${player.name} · Tahan untuk atur kekuatan`
              : parity
                ? `Condong ${parity.toUpperCase()} · sisa ${charges - 1}×`
                : empty
                  ? 'Jatah genap/ganjil habis · isi lagi lewat Start'
                  : 'Tahan untuk atur kekuatan'}
          </motion.span>
        )}
      </AnimatePresence>

      {/* 2D Cartoon Dock Capsule: GENAP · LEMPAR · GANJIL */}
      <div
        className="relative flex items-center"
        style={{
          background: '#2b2118',
          border: '3px solid #f5deb3',
          borderRadius: '999px',
          padding: compact ? '5px 12px' : '7px 18px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <ParityChip
          label="Genap"
          side="left"
          active={parity === 'genap'}
          charges={charges}
          compact={compact}
          onClick={() => setParity(parity === 'genap' ? null : 'genap')}
        />

        {/* Center protruding LEMPAR button */}
        <div
          className="relative mx-2 -my-3.5 flex items-center justify-center sm:mx-2.5 sm:-my-4"
          style={{ width: box, height: box }}
        >
          <svg className="pointer-events-none absolute inset-0 -rotate-90" width={box} height={box} aria-hidden>
            <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="rgba(245,222,179,0.22)" strokeWidth={ring} />
            {charging && (
              <motion.circle
                cx={box / 2}
                cy={box / 2}
                r={r}
                fill="none"
                strokeWidth={ring}
                strokeLinecap="round"
                style={{ strokeDasharray: dash, stroke: ringColor }}
              />
            )}
          </svg>
          <motion.button
            ref={btnRef}
            type="button"
            aria-label={
              player
                ? `Giliran ${player.name}: lempar dadu. Tahan untuk atur kekuatan.`
                : 'Lempar dadu. Tahan untuk atur kekuatan.'
            }
            className="relative flex touch-none flex-col items-center justify-center rounded-full border-[2.5px] border-[#2b1d12] text-[#2b1d12] outline-none will-change-transform [-webkit-touch-callout:none] focus-visible:ring-4 focus-visible:ring-gold-300/60"
            style={{
              width: size,
              height: size,
              background: 'linear-gradient(180deg, #FFE68F 0%, #FFC226 52%, #EE9B12 100%)',
              boxShadow:
                'inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -3px 6px rgba(150,82,0,0.4), 0 4px 0 #2b1d12, 0 8px 16px rgba(0,0,0,0.55)',
            }}
            whileHover={{ y: -1.5 }}
            whileTap={{ y: 2.5 }}
            animate={charging ? { y: 2.5, scale: 0.96 } : { y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
              } catch {
                /* synthetic events have no capturable pointer */
              }
              suppressClickRef.current = true;
              start();
            }}
            onPointerUp={() => release()}
            onPointerCancel={() => release(true)}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (suppressClickRef.current) return;
              roll();
            }}
          >
            {charging ? (
              <>
                <motion.span className={clsx('num font-display font-black leading-none', compact ? 'text-2xl' : 'text-[28px]')}>
                  {target}
                </motion.span>
                <span className="mt-0.5 font-display text-[9px] font-extrabold uppercase tracking-[0.16em] opacity-80">
                  lepas
                </span>
              </>
            ) : (
              <>
                <DiceGlyph size={compact ? 25 : 29} />
                <span className={clsx('mt-0.5 font-display font-black uppercase tracking-[0.12em]', compact ? 'text-[9px]' : 'text-[10px]')}>
                  Lempar
                </span>
              </>
            )}
          </motion.button>
        </div>

        <ParityChip
          label="Ganjil"
          side="right"
          active={parity === 'ganjil'}
          charges={charges}
          compact={compact}
          onClick={() => setParity(parity === 'ganjil' ? null : 'ganjil')}
        />
      </div>
    </div>
  );
}

/** 2D illustrated dice icon from `/icons/icon_dadu_2d.png`. */
function DiceGlyph({ size }: { size: number }) {
  return (
    <img
      src="/icons/icon_dadu_2d.png"
      alt=""
      draggable={false}
      style={{
        width: size * 1.32,
        height: size * 1.08,
        objectFit: 'contain',
        filter: 'drop-shadow(0 1.5px 2px rgba(43,29,18,0.35))',
      }}
      aria-hidden
    />
  );
}

function ParityChip({
  label,
  active,
  charges,
  compact,
  onClick,
}: {
  label: string;
  side: 'left' | 'right';
  active: boolean;
  charges: number;
  compact?: boolean;
  onClick: () => void;
}) {
  const disabled = charges <= 0 && !active;
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      aria-label={`Pilih ${label}, sisa jatah ${charges}${active ? ' (aktif, ketuk lagi untuk bebas)' : ''}`}
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      className={clsx(
        'relative z-10 flex min-h-[42px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-full border-2 font-display font-extrabold uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-300/70',
        compact ? 'h-10 w-[68px] text-[10px] tracking-[0.1em]' : 'h-11 w-[78px] text-[11px] tracking-[0.12em]',
        active
          ? 'border-[#ffe074] bg-[#4a3525] text-[#ffe074] shadow-[0_0_12px_rgba(255,224,116,0.35)]'
          : 'border-[#5c432d] bg-[#3b2c1f] text-[#f5deb3] hover:border-[#f5deb3]/60 hover:bg-[#4a3728]',
        disabled && 'cursor-not-allowed opacity-35',
      )}
    >
      <span className="leading-none">{label}</span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: PARITY_CHARGES }, (_, i) => (
          <span
            key={i}
            className={clsx(
              'block h-1.5 w-1.5 rounded-full',
              i < charges ? (active ? 'bg-[#ffe074]' : 'bg-[#f5deb3]') : 'bg-white/15',
            )}
          />
        ))}
      </span>
    </motion.button>
  );
}
