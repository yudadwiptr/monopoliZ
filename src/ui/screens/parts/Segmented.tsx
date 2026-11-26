import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { sfx } from '@/audio';

export interface SegOption<T> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** accessible name when the label is not plain text */
  ariaLabel?: string;
}

export type SegAccent = 'brand' | 'gold' | 'laut' | 'merah';

const PILL: Record<SegAccent, string> = {
  brand: 'bg-gradient-to-b from-brand-400 to-brand-600 shadow-[0_3px_0_#1C5290]',
  gold: 'bg-gradient-to-b from-gold-300 to-gold-500 shadow-[0_3px_0_#A86F00]',
  laut: 'bg-gradient-to-b from-laut-400 to-laut-600 shadow-[0_3px_0_#0b6f67]',
  merah: 'bg-gradient-to-b from-merah-400 to-merah-600 shadow-[0_3px_0_#A3102F]',
};

const ACTIVE_TEXT: Record<SegAccent, string> = {
  brand: 'text-white',
  gold: 'text-ink-950',
  laut: 'text-ink-950',
  merah: 'text-white',
};

export interface SegmentedProps<T> {
  options: SegOption<T>[];
  value: T;
  onChange(value: T): void;
  ariaLabel: string;
  accent?: SegAccent;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

/**
 * Pill-style radio group with a springy sliding highlight. Arrow keys move the selection.
 */
export function Segmented<T>({
  options,
  value,
  onChange,
  ariaLabel,
  accent = 'brand',
  size = 'md',
  className,
  disabled,
}: SegmentedProps<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => Object.is(o.value, value)),
  );

  const select = (i: number, focus = false) => {
    const opt = options[i];
    if (!opt || disabled) return;
    if (!Object.is(opt.value, value)) {
      sfx.play('click');
      onChange(opt.value);
    }
    if (focus) refs.current[i]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = options.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      select((i + 1) % n, true);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      select((i - 1 + n) % n, true);
    } else if (e.key === 'Home') {
      e.preventDefault();
      select(0, true);
    } else if (e.key === 'End') {
      e.preventDefault();
      select(n - 1, true);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={clsx(
        'relative flex w-full gap-1 rounded-2xl border-2 border-[#2b1d12] bg-[#3d2514] p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]',
        disabled && 'opacity-50',
        className,
      )}
    >
      {options.map((opt, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.ariaLabel}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => select(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={clsx(
              'relative flex min-w-0 flex-1 select-none items-center justify-center gap-1.5 rounded-xl px-2 text-center font-display font-bold leading-tight outline-none transition-colors',
              'focus-visible:ring-4 focus-visible:ring-amber-400/60',
              size === 'sm' ? 'min-h-[40px] text-sm' : 'min-h-[44px] text-[15px]',
              active ? ACTIVE_TEXT[accent] : 'text-[#f5e6c8] hover:bg-white/10 hover:text-white',
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                className={clsx('absolute inset-0 rounded-xl border border-[#2b1d12]', PILL[accent])}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              />
            )}
            {opt.icon && <span className="relative flex shrink-0 items-center">{opt.icon}</span>}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
