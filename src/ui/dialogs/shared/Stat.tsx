import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useDialogVariant } from './DialogShell';

export type StatTone = 'plain' | 'gold' | 'daun' | 'merah' | 'laut' | 'brand';

const DARK_VALUE_TONE: Record<StatTone, string> = {
  plain: 'text-white',
  gold: 'text-gold-300',
  daun: 'text-daun-400',
  merah: 'text-merah-400',
  laut: 'text-laut-300',
  brand: 'text-brand-300',
};

const PARCHMENT_VALUE_TONE: Record<StatTone, string> = {
  plain: 'text-[#2b1d12]',
  gold: 'text-[#b45309]',
  daun: 'text-[#15803d]',
  merah: 'text-[#b91c1c]',
  laut: 'text-[#0f766e]',
  brand: 'text-[#1d4ed8]',
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
  const variant = useDialogVariant();
  const isParchment = variant === 'parchment';

  if (isParchment) {
    return (
      <div
        className={clsx('min-w-0 flex-1 rounded-xl px-2.5 py-1.5', className)}
        style={{
          background: 'rgba(255, 248, 231, 0.78)',
          border: '1.5px solid #8c6239',
          color: '#2b1d12',
        }}
      >
        <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-[#5c4028]">
          {icon}
          <span className="whitespace-nowrap">{label}</span>
        </div>
        <div
          className={clsx('num font-extrabold leading-tight', PARCHMENT_VALUE_TONE[tone])}
          style={{
            fontSize: 'clamp(14px, 4.2vw, 17px)',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </div>
        {hint && (
          <div className="whitespace-nowrap text-[10px] font-semibold text-[#5c4028]">
            {hint}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('min-w-0 flex-1 rounded-2xl border border-white/10 bg-ink-950/45 px-3 py-2', className)}>
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={clsx('num truncate text-lg font-bold leading-tight sm:text-xl', DARK_VALUE_TONE[tone])}>{value}</div>
      {hint && <div className="truncate text-[11px] text-ink-300">{hint}</div>}
    </div>
  );
}
