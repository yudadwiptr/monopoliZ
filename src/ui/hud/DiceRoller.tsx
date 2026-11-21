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
const HOLD_MIN_MS = 200;
/** One full ping-pong sweep (0 → 1 → 0). */
const PERIOD_MS = 1200;
const HINT_KEY = 'monopoliz.hint.gauge';
/** Gauge colour by target sum: small (green) -> medium (yellow) -> big (red). */
function gaugeColor(p: number): string {
  if (p < 0.4) return '#2EE59D';
  if (p < 0.72) return '#FFC21F';
  return '#FF5C7A';
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
 * Round "LEMPAR" button that sits in the middle of the board, flanked by GENAP / GANJIL picks.
 * Hold it to charge the gauge — a ring sweeps around the button and the target sum shows in the middle —
 * release to roll with that power. A quick tap rolls without power. Space/Enter work the same way.
 */
export function DiceRoller({ player, compact = false }: DiceRollerProps) {
  const pos = useMotionValue(0.5);
  const [charging, setCharging] = useState(false);
  const [hintSeen, setHintSeen] = useState(readHintSeen);
  const charges = useGame((s) => {
    const p = s.game?.players[s.game.current];
    return p ? parityChargesOf(p) : 0;
  });
  // A remembered pick is dropped once the player has no charges left.
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

  // Ring gauge around the button.
  const size = compact ? 76 : 100;
  const rim = compact ? 7 : 9; // metallic gold rim thickness
  const box = size + rim * 2;
  const stroke = rim - 2;
  const r = box / 2 - rim / 2;
  const circ = 2 * Math.PI * r;
  const dash = useTransform(pos, (p) => `${(0.04 + p * 0.96) * circ} ${circ}`);
  const ringColor = useTransform(pos, gaugeColor);
  const target = useTransform(pos, (p) => String(Math.round(2 + p * 10)));
  const empty = charges <= 0;

  return (
    <div className="flex select-none flex-col items-center gap-2">
      {player && (
        <span className="rounded-full bg-ink-950/75 px-3 py-0.5 font-display text-xs font-semibold text-ink-100 shadow-glass">
          Giliran {player.name}
        </span>
      )}
      {/* Tilted like it lies on the board. */}
      <div
        className={clsx('flex items-center', compact ? 'gap-2.5' : 'gap-4')}
        style={{ transform: 'perspective(720px) rotateX(20deg)', transformStyle: 'preserve-3d' }}
      >
        <ParityButton
          label="Genap"
          active={parity === 'genap'}
          charges={charges}
          compact={compact}
          onClick={() => setParity(parity === 'genap' ? null : 'genap')}
        />

        <div className="relative flex items-center justify-center" style={{ width: box, height: box + 6 }}>
          <span
            aria-hidden
            className={clsx('absolute inset-0 rounded-full bg-gold-400/30 blur-xl', !charging && 'animate-pulse')}
          />
          {/* metallic gold rim (also the gauge track) */}
          <span
            aria-hidden
            className="absolute left-0 top-0 rounded-full"
            style={{
              width: box,
              height: box,
              background: 'conic-gradient(from 210deg, #FFF0BF, #E6A200, #FFE08A, #A86F00, #FFD35C, #FFF0BF)',
              boxShadow: '0 6px 0 #7A4F00, 0 16px 30px -8px rgba(0,0,0,0.6)',
            }}
          />
          <svg className="pointer-events-none absolute left-0 top-0 z-10 -rotate-90" width={box} height={box} aria-hidden>
            {charging && (
              <>
                <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="rgba(5,8,26,0.55)" strokeWidth={stroke} />
                <motion.circle
                  cx={box / 2}
                  cy={box / 2}
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  style={{ strokeDasharray: dash, stroke: ringColor }}
                />
              </>
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
            className="absolute z-20 flex touch-none flex-col items-center justify-center overflow-hidden rounded-full text-ink-950 outline-none [-webkit-touch-callout:none] focus-visible:ring-4 focus-visible:ring-brand-300/70"
            style={{
              left: rim,
              top: rim,
              width: size,
              height: size,
              background: 'radial-gradient(circle at 50% 78%, #FFC21F 0%, #FFB020 45%, #E68A00 100%)',
              boxShadow: 'inset 0 -6px 10px rgba(122,79,0,0.45), inset 0 2px 0 rgba(255,255,255,0.7)',
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ y: 4, scale: 0.97 }}
            animate={charging ? { y: 4, scale: 0.98 } : { y: 0, scale: [1, 1.035, 1] }}
            transition={
              charging
                ? { type: 'spring', stiffness: 500, damping: 26 }
                : { scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }, y: { type: 'spring', stiffness: 500, damping: 26 } }
            }
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
            {/* glossy top reflection */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-[10%] top-[4%] h-[46%] rounded-[50%]"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.08))' }}
            />
            {/* shimmer sweep now and then */}
            {!charging && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-y-2 w-1/3 -skew-x-12 bg-white/45 blur-[2px]"
                initial={{ x: -size }}
                animate={{ x: size * 1.4 }}
                transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }}
              />
            )}
            <span className="relative flex flex-col items-center drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
              {charging ? (
                <>
                  <motion.span className={clsx('num font-bold leading-none', compact ? 'text-3xl' : 'text-4xl')}>
                    {target}
                  </motion.span>
                  <span className="mt-0.5 font-display text-[10px] font-bold uppercase tracking-wider opacity-75">Lepas!</span>
                </>
              ) : (
                <>
                  <Dices size={compact ? 22 : 28} strokeWidth={2.3} aria-hidden />
                  <span className={clsx('mt-0.5 font-display font-bold uppercase tracking-wide', compact ? 'text-xs' : 'text-sm')}>
                    Lempar
                  </span>
                </>
              )}
            </span>
          </motion.button>
        </div>

        <ParityButton
          label="Ganjil"
          active={parity === 'ganjil'}
          charges={charges}
          compact={compact}
          onClick={() => setParity(parity === 'ganjil' ? null : 'ganjil')}
        />
      </div>

      <AnimatePresence initial={false}>
        {(!hintSeen || parity || empty) && !charging && (
          <motion.span
            className="pointer-events-none whitespace-nowrap rounded-full bg-ink-950/75 px-3 py-1 text-[11px] font-semibold text-ink-100 shadow-glass"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {parity
              ? `Peluang ${parity} lebih besar • sisa jatah ${charges - 1}`
              : empty
                ? 'Jatah Genap/Ganjil habis — isi lagi lewat Start'
                : 'Tahan untuk atur kekuatan dadu'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function ParityButton({
  label,
  active,
  charges,
  compact,
  onClick,
}: {
  label: string;
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
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { y: 3, scale: 0.96 }}
      animate={active ? { scale: 1.06 } : { scale: 1 }}
      className={clsx(
        'relative overflow-hidden rounded-full border-2 font-display font-bold uppercase tracking-wider text-white outline-none focus-visible:ring-4 focus-visible:ring-brand-300/60',
        compact ? 'h-9 min-w-[66px] px-2.5 text-[11px]' : 'h-11 min-w-[88px] px-3.5 text-xs',
        disabled && 'cursor-not-allowed opacity-45 saturate-0',
      )}
      style={{
        borderColor: active ? '#FFD35C' : '#45E3D6',
        background: active
          ? 'linear-gradient(180deg, #A78BFA 0%, #7C3AED 55%, #5B21B6 100%)'
          : 'linear-gradient(180deg, #7C6CFF 0%, #4F46E5 55%, #3730A3 100%)',
        boxShadow: active
          ? '0 4px 0 #3B1A86, 0 0 18px rgba(255,211,92,0.75), 0 0 36px rgba(167,139,250,0.55)'
          : '0 4px 0 #23206B, 0 8px 18px -6px rgba(0,0,0,0.6)',
      }}
    >
      {/* glossy top half */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 top-0.5 h-1/2 rounded-full"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))' }}
      />
      <span className="relative flex items-center gap-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
        {label}
        <span className="flex gap-0.5" aria-hidden>
          {Array.from({ length: PARITY_CHARGES }, (_, i) => (
            <span
              key={i}
              className={clsx('block h-1.5 w-1.5 rounded-full', i < charges ? 'bg-gold-300' : 'bg-white/25')}
            />
          ))}
        </span>
      </span>
    </motion.button>
  );
}
