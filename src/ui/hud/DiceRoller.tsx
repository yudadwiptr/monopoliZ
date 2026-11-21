import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import clsx from 'clsx';
import { Dices } from 'lucide-react';
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
 * Minimalist Get Rich-style Roll button sitting cleanly inside the center pit,
 * flanked by slim Genap / Ganjil pills without any bulky container or arch track.
 * Hold to charge the smooth ring gauge; tap for a quick roll.
 */
export function DiceRoller({ player, compact = false }: DiceRollerProps) {
  const pos = useMotionValue(0.5);
  const [charging, setCharging] = useState(false);
  const [activeSum, setActiveSum] = useState(7);
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

  // Gauge ring hugging the coin while charging.
  const size = compact ? 64 : 76; // coin diameter
  const ring = compact ? 5 : 6;
  const box = size + ring * 2 + 4;
  const r = box / 2 - ring / 2;
  const circ = 2 * Math.PI * r;
  const dash = useTransform(pos, (p) => `${(0.04 + p * 0.96) * circ} ${circ}`);
  const ringColor = useTransform(pos, gaugeColor);
  const target = useTransform(pos, (p) => String(Math.round(2 + p * 10)));
  const empty = charges <= 0;
  const capH = compact ? 44 : 50;

  return (
    <div className="flex select-none flex-col items-center gap-2" style={{ touchAction: 'none' }}>
      {player && (
        <span className="rounded-full bg-ink-950/80 px-3 py-0.5 font-display text-[11px] font-semibold tracking-wide text-ink-100">
          Giliran {player.name}
        </span>
      )}

      {/* One slim glass capsule: GENAP · coin · GANJIL. The coin overhangs the capsule a little. */}
      <div className="relative flex items-center" style={{ height: box }}>
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-ink-950/75 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          style={{ height: capH }}
        />
        <ParityChip
          label="Genap"
          side="left"
          active={parity === 'genap'}
          charges={charges}
          compact={compact}
          onClick={() => setParity(parity === 'genap' ? null : 'genap')}
        />

        <div className="relative mx-1 flex items-center justify-center" style={{ width: box, height: box }}>
          <svg className="pointer-events-none absolute inset-0 -rotate-90" width={box} height={box} aria-hidden>
            <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={ring} />
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
            className="relative flex touch-none flex-col items-center justify-center rounded-full text-ink-950 outline-none [-webkit-touch-callout:none] focus-visible:ring-4 focus-visible:ring-gold-300/50"
            style={{
              width: size,
              height: size,
              background: 'linear-gradient(180deg, #FFE38A 0%, #FFC83D 48%, #F0A81C 100%)',
              boxShadow:
                'inset 0 1.5px 0 rgba(255,255,255,0.75), inset 0 -3px 6px rgba(150,90,0,0.35), 0 0 0 1px rgba(122,79,0,0.55), 0 5px 0 #9A6400, 0 10px 18px -6px rgba(0,0,0,0.7)',
            }}
            whileHover={{ y: -1 }}
            whileTap={{ y: 3 }}
            animate={charging ? { y: 3, scale: 0.97 } : { y: 0, scale: 1 }}
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
              // Assistive tech "click" without pointer events → quick roll.
              if (suppressClickRef.current) return;
              roll();
            }}
          >
            {charging ? (
              <>
                <motion.span className={clsx('num font-bold leading-none', compact ? 'text-2xl' : 'text-[28px]')}>
                  {target}
                </motion.span>
                <span className="mt-0.5 font-display text-[9px] font-bold uppercase tracking-[0.18em] opacity-70">lepas</span>
              </>
            ) : (
              <>
                <DiceGlyph size={compact ? 24 : 28} />
                <span className={clsx('mt-0.5 font-display font-bold uppercase tracking-[0.14em]', compact ? 'text-[9px]' : 'text-[10px]')}>
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

      <AnimatePresence initial={false} mode="wait">
        {(!hintSeen || parity || empty) && !charging && (
          <motion.span
            key={parity ?? (empty ? 'empty' : 'hint')}
            className="pointer-events-none whitespace-nowrap text-[11px] font-medium text-ink-200 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {parity
              ? `Condong ${parity} · sisa ${charges - 1}×`
              : empty
                ? 'Jatah genap/ganjil habis · isi lagi lewat Start'
                : 'Tahan untuk atur kekuatan'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Two small dice, drawn so the coin reads as "roll" at a glance. */
function DiceGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="3" y="9" width="16" height="16" rx="4" fill="#FFF7E0" stroke="#3A2600" strokeWidth="2" transform="rotate(-12 11 17)" />
      <circle cx="8" cy="14" r="1.6" fill="#3A2600" />
      <circle cx="13.5" cy="19.5" r="1.6" fill="#3A2600" />
      <rect x="15" y="5" width="14" height="14" rx="3.5" fill="#FFF7E0" stroke="#3A2600" strokeWidth="2" transform="rotate(14 22 12)" />
      <circle cx="22" cy="12" r="1.6" fill="#E01E45" />
    </svg>
  );
}

function ParityChip({
  label,
  side,
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
      whileTap={disabled ? undefined : { scale: 0.95 }}
      className={clsx(
        'relative z-10 flex flex-col items-center justify-center gap-1 rounded-full font-display font-semibold uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-300/60',
        compact ? 'h-9 w-[62px] text-[10px] tracking-[0.12em]' : 'h-10 w-[74px] text-[11px] tracking-[0.14em]',
        side === 'left' ? 'ml-1.5' : 'mr-1.5',
        active ? 'bg-gold-400/15 text-gold-200 ring-1 ring-gold-300/60' : 'text-ink-200 hover:bg-white/5 hover:text-white',
        disabled && 'cursor-not-allowed opacity-35',
      )}
    >
      <span className="leading-none">{label}</span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: PARITY_CHARGES }, (_, i) => (
          <span
            key={i}
            className={clsx(
              'block h-1 w-1 rounded-full',
              i < charges ? (active ? 'bg-gold-300' : 'bg-ink-200') : 'bg-white/15',
            )}
          />
        ))}
      </span>
    </motion.button>
  );
}
