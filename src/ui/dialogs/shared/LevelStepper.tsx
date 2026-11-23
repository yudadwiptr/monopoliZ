import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Check, Lock } from 'lucide-react';
import { useId, useRef, type KeyboardEvent } from 'react';
import { LANDMARK_LEVEL, LEVEL_NAMES } from '@/engine/economy';
import { formatRp } from '@/lib/format';
import { sfx } from '@/audio';
import { haptic } from '@/store/settingsStore';
import { LevelArt } from './LevelArt';

export type LevelStatus = 'ok' | 'poor' | 'locked';

export interface LevelOption {
  level: number;
  /** Final price (after discount) */
  cost: number;
  /** Price before discount (shown struck through when different) */
  baseCost: number;
  /** Toll this property will charge at that level */
  toll: number;
  status: LevelStatus;
  /** Short reason shown on disabled tiles ("Uang kurang", "1 putaran lagi") */
  reason?: string;
}

export interface LevelStepperProps {
  options: LevelOption[];
  selected: number | null;
  onSelect(level: number): void;
  label: string;
  /** Buying: every level up to the selected one is included — light those tiles up too. */
  cumulative?: boolean;
}

/**
 * Horizontal level picker (Tanah → Rumah → Ruko → Hotel → Landmark). Works as a radio group:
 * arrow keys move, Enter confirms the dialog's primary action.
 */
export function LevelStepper({ options, selected, onSelect, label, cumulative }: LevelStepperProps) {
  const n = options.length;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const hintId = useId();
  const selLayoutId = `level-sel-${hintId}`;
  const selIdx = options.findIndex((o) => o.level === selected);
  const firstOk = options.findIndex((o) => o.status === 'ok');
  const focusIdx = selIdx >= 0 ? selIdx : Math.max(0, firstOk);

  const pick = (o: LevelOption) => {
    if (o.status !== 'ok' || o.level === selected) return;
    sfx.play('hover');
    haptic(8);
    onSelect(o.level);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    for (let i = idx + dir; i >= 0 && i < n; i += dir) {
      if (options[i].status === 'ok') {
        pick(options[i]);
        refs.current[i]?.focus();
        return;
      }
    }
  };

  // Track runs between the centres of the first and last discs.
  const inset = `${100 / (2 * n)}%`;
  const fill = n > 1 && selIdx > 0 ? selIdx / (n - 1) : 0;

  return (
    <div role="radiogroup" aria-label={label} aria-describedby={hintId} className="relative">
      <span id={hintId} className="sr-only">
        Gunakan panah kiri/kanan untuk memilih level, Enter untuk konfirmasi.
      </span>
      {n > 1 && (
        <div aria-hidden className="absolute top-[25px] h-1.5 rounded-full bg-white/10" style={{ left: inset, right: inset }}>
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-brand-400 to-gold-400"
            initial={false}
            animate={{ scaleX: fill }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          />
        </div>
      )}
      <div className="relative grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {options.map((o, i) => {
          const isSel = o.level === selected;
          const included = !!cumulative && selIdx >= 0 && i < selIdx && o.status === 'ok';
          const landmark = o.level === LANDMARK_LEVEL;
          const disabled = o.status !== 'ok';
          const discounted = o.baseCost !== o.cost;
          return (
            <motion.button
              key={o.level}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSel}
              aria-label={`${LEVEL_NAMES[o.level]}: bayar ${formatRp(o.cost)}, sewa ${formatRp(o.toll)}${o.reason ? `. ${o.reason}` : ''}`}
              disabled={disabled}
              tabIndex={i === focusIdx ? 0 : -1}
              onClick={() => pick(o)}
              onKeyDown={(e) => onKeyDown(e, i)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26, delay: 0.04 + i * 0.04 }}
              whileTap={disabled ? undefined : { scale: 0.95 }}
              className={clsx(
                'group relative flex min-h-[6.2rem] flex-col items-center rounded-2xl border px-1 pb-1.5 pt-1.5 text-center outline-none transition-colors',
                'focus-visible:ring-4 focus-visible:ring-brand-300/60',
                disabled && 'cursor-not-allowed border-white/5 bg-white/[0.03]',
                !disabled && !isSel && !landmark && 'border-white/10 bg-white/[0.06] hover:bg-white/10',
                !disabled && !isSel && landmark && 'border-gold-400/50 bg-gradient-to-b from-gold-400/25 to-gold-600/5 hover:from-gold-400/35',
                isSel && (landmark ? 'border-gold-300 bg-gold-400/20' : 'border-brand-300/80 bg-brand-500/20'),
                included && 'bg-brand-500/10',
              )}
            >
              {isSel && (
                <motion.span
                  layoutId={selLayoutId}
                  aria-hidden
                  className={clsx(
                    'pointer-events-none absolute inset-0 rounded-2xl',
                    landmark ? 'shadow-glow-gold' : 'shadow-glow-brand',
                  )}
                  transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                />
              )}
              <motion.span
                className={clsx(
                  'relative grid h-10 w-10 place-items-center rounded-full border',
                  isSel || included ? 'border-white/25 bg-ink-800' : 'border-white/10 bg-ink-900',
                  landmark && !disabled && 'border-gold-400/70',
                )}
                animate={isSel ? { y: -2, scale: 1.08 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
              >
                <LevelArt level={o.level} size={30} muted={disabled} />
                {o.status === 'locked' && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-ink-700 text-ink-200 ring-1 ring-ink-900">
                    <Lock size={9} strokeWidth={2.6} />
                  </span>
                )}
                {(included || isSel) && (
                  <span
                    className={clsx(
                      'absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full ring-1 ring-ink-900',
                      isSel ? (landmark ? 'bg-gold-400 text-ink-950' : 'bg-brand-400 text-white') : 'bg-daun-500 text-ink-950',
                    )}
                  >
                    <Check size={10} strokeWidth={3.4} />
                  </span>
                )}
              </motion.span>
              <span
                className={clsx(
                  'mt-1 font-display text-xs font-semibold leading-none',
                  disabled ? 'text-ink-400' : landmark ? 'text-gold-300' : 'text-white',
                )}
              >
                {LEVEL_NAMES[o.level]}
              </span>
              {discounted && (
                <s className="num mt-0.5 text-[9px] leading-none text-ink-400">{formatRp(o.baseCost, { short: true })}</s>
              )}
              <span
                className={clsx(
                  'num mt-0.5 whitespace-nowrap text-xs font-bold leading-tight',
                  o.status === 'poor' ? 'text-merah-400' : disabled ? 'text-ink-400' : isSel || landmark ? 'text-gold-300' : 'text-ink-100',
                )}
              >
                {formatRp(o.cost, { short: true })}
              </span>
              {disabled && o.reason ? (
                <span
                  className={clsx(
                    'mt-0.5 text-[9.5px] font-semibold leading-tight',
                    o.status === 'poor' ? 'text-merah-300' : 'text-ink-300',
                  )}
                >
                  {o.reason}
                </span>
              ) : (
                <span className="mt-0.5 whitespace-nowrap text-[10px] font-semibold leading-tight text-daun-400">
                  Sewa <span className="num">{formatRp(o.toll, { short: true })}</span>
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
