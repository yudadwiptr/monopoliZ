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

  // Clean ring gauge embedded directly in the button rim
  const size = compact ? 70 : 88;
  const rim = compact ? 6 : 8;
  const box = size + rim * 2;
  const stroke = rim - 1.5;
  const r = box / 2 - rim / 2;
  const circ = 2 * Math.PI * r;
  const dash = useTransform(pos, (p) => `${(0.05 + p * 0.95) * circ} ${circ}`);
  const ringColor = useTransform(pos, gaugeColor);
  const empty = charges <= 0;

  return (
    <div
      className="flex select-none flex-col items-center gap-1.5"
      style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
    >
      {player && (
        <span className="rounded-full bg-ink-950/75 px-3 py-0.5 font-display text-xs font-semibold text-ink-100 shadow-glass">
          Giliran {player.name}
        </span>
      )}

      {/* Minimalist floating controls inside the center pit */}
      <div className={clsx('flex items-center', compact ? 'gap-2.5' : 'gap-3.5')}>
        <ParityButton
          label="Genap"
          active={parity === 'genap'}
          charges={charges}
          compact={compact}
          onClick={() => setParity(parity === 'genap' ? null : 'genap')}
        />

        <div className="relative flex items-center justify-center" style={{ width: box, height: box + 4 }}>
          <span
            aria-hidden
            className={clsx('absolute inset-0 rounded-full bg-gold-400/25 blur-lg', !charging && 'animate-pulse')}
          />
          {/* Sleek gold rim */}
          <span
            aria-hidden
            className="absolute left-0 top-0 rounded-full"
            style={{
              width: box,
              height: box,
              background: 'conic-gradient(from 210deg, #FFF0BF, #E6A200, #FFE08A, #A86F00, #FFD35C, #FFF0BF)',
              boxShadow: '0 4px 0 #7A4F00, 0 12px 22px -6px rgba(0,0,0,0.65)',
            }}
          />
          {/* Ring gauge only visible while holding */}
          <svg className="pointer-events-none absolute left-0 top-0 z-10 -rotate-90" width={box} height={box} aria-hidden>
            {charging && (
              <>
                <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="rgba(5,8,26,0.65)" strokeWidth={stroke} />
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
              background: 'radial-gradient(circle at 50% 75%, #FFC21F 0%, #FFB020 48%, #E68A00 100%)',
              boxShadow: 'inset 0 -5px 8px rgba(122,79,0,0.45), inset 0 2px 0 rgba(255,255,255,0.75)',
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ y: 3, scale: 0.96 }}
            animate={charging ? { y: 3, scale: 0.97 } : { y: 0, scale: [1, 1.03, 1] }}
            transition={
              charging
                ? { type: 'spring', stiffness: 520, damping: 26 }
                : { scale: { duration: 1.9, repeat: Infinity, ease: 'easeInOut' }, y: { type: 'spring', stiffness: 500, damping: 26 } }
            }
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              suppressClickRef.current = true;
              start();
            }}
            onPointerUp={() => release()}
            onLostPointerCapture={() => release()}
            onPointerCancel={() => release(true)}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (suppressClickRef.current) return;
              roll();
            }}
          >
            {/* Glossy top reflection */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-[12%] top-[5%] h-[42%] rounded-[50%]"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.06))' }}
            />
            {!charging && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-y-2 w-1/3 -skew-x-12 bg-white/45 blur-[2px]"
                initial={{ x: -size }}
                animate={{ x: size * 1.4 }}
                transition={{ duration: 0.85, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
              />
            )}
            <span className="relative flex flex-col items-center drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">
              {charging ? (
                <>
                  <motion.span
                    key={activeSum}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.1 }}
                    className={clsx('num font-display font-black leading-none', compact ? 'text-2xl' : 'text-3xl')}
                  >
                    {activeSum}
                  </motion.span>
                  <span className="mt-0.5 font-display text-[9px] font-bold uppercase tracking-wider opacity-80">
                    Lepas!
                  </span>
                </>
              ) : (
                <>
                  <Dices size={compact ? 20 : 25} strokeWidth={2.3} aria-hidden />
                  <span className={clsx('mt-0.5 font-display font-bold uppercase tracking-wide', compact ? 'text-[11px]' : 'text-xs')}>
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
            className="pointer-events-none whitespace-nowrap rounded-full bg-ink-950/75 px-2.5 py-0.5 text-[10px] font-semibold text-ink-100 shadow-glass"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {parity
              ? `Peluang ${parity} aktif • sisa ${charges - 1}`
              : empty
                ? 'Jatah Genap/Ganjil habis — isi lewat Start'
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
      whileHover={disabled ? undefined : { y: -1.5 }}
      whileTap={disabled ? undefined : { y: 2, scale: 0.96 }}
      animate={active ? { scale: 1.05 } : { scale: 1 }}
      className={clsx(
        'relative overflow-hidden rounded-full border font-display font-bold uppercase tracking-wider text-white outline-none focus-visible:ring-4 focus-visible:ring-brand-300/60',
        compact ? 'h-8 min-w-[62px] px-2.5 text-[10px]' : 'h-9 min-w-[78px] px-3 text-[11px]',
        disabled && 'cursor-not-allowed opacity-40 saturate-0',
      )}
      style={{
        borderColor: active ? '#FFD35C' : 'rgba(69, 227, 214, 0.7)',
        background: active
          ? 'linear-gradient(180deg, #A78BFA 0%, #7C3AED 55%, #5B21B6 100%)'
          : 'linear-gradient(180deg, rgba(99,102,241,0.88) 0%, rgba(55,48,163,0.92) 100%)',
        boxShadow: active
          ? '0 3px 0 #3B1A86, 0 0 14px rgba(255,211,92,0.65)'
          : '0 3px 0 #1E1B4B, 0 6px 14px -4px rgba(0,0,0,0.55)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 top-0.5 h-1/2 rounded-full"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0))' }}
      />
      <span className="relative flex items-center justify-center gap-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
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
