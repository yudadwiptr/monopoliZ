import clsx from 'clsx';
import { useId, type ReactNode } from 'react';

export interface RangeSliderProps {
  label: string;
  icon?: ReactNode;
  /** 0..1 */
  value: number;
  onChange(value: number): void;
  /** Fired when the user releases the thumb / finishes a key press. */
  onCommit?(value: number): void;
  accent?: 'brand' | 'gold';
}

const FILL = {
  brand: 'from-brand-600 via-brand-400 to-brand-300',
  gold: 'from-gold-600 via-gold-400 to-gold-300',
};

/**
 * Themed range slider. A transparent native <input type="range"> sits on top of the custom track,
 * so keyboard, touch and screen readers all work natively.
 */
export function RangeSlider({ label, icon, value, onChange, onCommit, accent = 'brand' }: RangeSliderProps) {
  const id = useId();
  const pct = Math.round(value * 100);
  const commit = () => onCommit?.(value);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 font-display text-base font-extrabold text-current">
          {icon}
          {label}
        </label>
        <span className="num min-w-[3ch] text-right text-sm font-black opacity-85">{pct}%</span>
      </div>
      <div className="relative flex h-11 items-center">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          aria-valuetext={`${pct} persen`}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onPointerUp={commit}
          onKeyUp={commit}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="pointer-events-none relative h-4 w-full overflow-hidden rounded-full border-2 border-[#2b1d12] bg-[#3d2514] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          <div
            className={clsx('absolute inset-0 origin-left rounded-full bg-gradient-to-r', FILL[accent])}
            style={{ transform: `scaleX(${value})` }}
          />
        </div>
        <div
          className={clsx(
            'pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#2b1d12] bg-gradient-to-b from-[#fff9ea] to-[#ebd4a9]',
            'shadow-[0_3px_0_#2b1d12] transition-shadow',
            'peer-focus-visible:ring-4 peer-focus-visible:ring-amber-500/50 peer-active:scale-110',
          )}
          style={{ left: `calc(14px + (100% - 28px) * ${value})` }}
        />
      </div>
    </div>
  );
}
