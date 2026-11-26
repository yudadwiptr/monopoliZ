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
        <div
          aria-hidden
          className="absolute top-[22px] h-1.5 rounded-full bg-[#8c6239]/25"
          style={{ left: inset, right: inset }}
        >
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-[#d97706] to-[#15803d]"
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
              style={{
                background: disabled
                  ? 'rgba(235, 220, 195, 0.55)'
                  : isSel
                    ? 'rgba(255, 243, 201, 0.96)'
                    : included
                      ? 'rgba(255, 246, 218, 0.88)'
                      : 'rgba(255, 248, 231, 0.75)',
                borderColor: disabled ? '#b09372' : isSel ? '#b45309' : '#8c6239',
                borderWidth: isSel ? '2px' : '1.5px',
                color: '#2b1d12',
              }}
              className={clsx(
                'group relative flex min-h-[5.4rem] flex-col items-center rounded-xl px-1 pb-1.5 pt-1.5 text-center outline-none transition-colors',
                'focus-visible:ring-4 focus-visible:ring-amber-500/50',
                disabled ? 'cursor-not-allowed opacity-75' : 'hover:brightness-95',
                isSel && 'shadow-[0_3px_0_#8c6239]',
              )}
            >
              {isSel && (
                <motion.span
                  layoutId={selLayoutId}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[#d97706]/50"
                  transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                />
              )}
              <motion.span
                className={clsx(
                  'relative grid h-9 w-9 place-items-center rounded-full border-[1.5px]',
                  isSel || included
                    ? 'border-[#8c6239] bg-[#fffdf7] shadow-sm'
                    : 'border-[#a8845e] bg-[#f7ead0]',
                  landmark && !disabled && 'border-[#d97706]',
                )}
                animate={isSel ? { y: -1, scale: 1.06 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
              >
                <LevelArt level={o.level} size={26} muted={disabled} />
                {o.status === 'locked' && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#5c4028] text-[#fff8e7] ring-1 ring-[#2b1d12]">
                    <Lock size={9} strokeWidth={2.6} />
                  </span>
                )}
                {(included || isSel) && (
                  <span
                    className={clsx(
                      'absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full ring-1 ring-[#2b1d12]',
                      isSel ? 'bg-[#d97706] text-white' : 'bg-[#15803d] text-white',
                    )}
                  >
                    <Check size={10} strokeWidth={3.4} />
                  </span>
                )}
              </motion.span>
              <span
                className={clsx(
                  'mt-1 font-display text-[11px] font-extrabold leading-none',
                  disabled ? 'text-[#785a3c]' : landmark ? 'text-[#b45309]' : 'text-[#1e130c]',
                )}
              >
                {LEVEL_NAMES[o.level]}
              </span>
              {discounted && (
                <s className="num mt-0.5 text-[9px] leading-none text-[#785a3c]">{formatRp(o.baseCost, { short: true })}</s>
              )}
              <span
                className={clsx(
                  'num mt-0.5 whitespace-nowrap text-[11px] font-extrabold leading-tight',
                  o.status === 'poor'
                    ? 'text-[#b91c1c]'
                    : disabled
                      ? 'text-[#785a3c]'
                      : isSel || landmark
                        ? 'text-[#b45309]'
                        : 'text-[#2b1d12]',
                )}
              >
                {formatRp(o.cost, { short: true })}
              </span>
              {disabled && o.reason ? (
                <span
                  className={clsx(
                    'mt-0.5 text-[9px] font-bold leading-tight',
                    o.status === 'poor' ? 'text-[#b91c1c]' : 'text-[#6b4c30]',
                  )}
                >
                  {o.reason}
                </span>
              ) : (
                <span className="mt-0.5 whitespace-nowrap text-[9.5px] font-extrabold leading-tight text-[#15803d]">
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
