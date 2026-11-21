import clsx from 'clsx';
import type { ReactNode } from 'react';

export type StatTone = 'plain' | 'gold' | 'daun' | 'merah' | 'laut' | 'brand';

const VALUE_TONE: Record<StatTone, string> = {
  plain: 'text-white',
  gold: 'text-gold-300',
  daun: 'text-daun-400',
  merah: 'text-merah-400',
  laut: 'text-laut-300',
  brand: 'text-brand-300',
};

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** Compact label + big number box used in every dialog's summary row. */
export function Stat({ label, value, tone = 'plain', icon, hint, className }: StatProps) {
  return (
    <div className={clsx('min-w-0 flex-1 rounded-2xl border border-white/10 bg-ink-950/45 px-3 py-2', className)}>
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={clsx('num truncate text-lg font-bold leading-tight sm:text-xl', VALUE_TONE[tone])}>{value}</div>
      {hint && <div className="truncate text-[11px] text-ink-300">{hint}</div>}
    </div>
  );
}
