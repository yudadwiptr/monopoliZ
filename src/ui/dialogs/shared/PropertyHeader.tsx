import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { MapDef, TileDef } from '@/engine/types';
import { tileColor, tileGroupLabel } from './tileInfo';

export interface PropertyHeaderProps {
  map: MapDef;
  def: TileDef;
  titleId: string;
  /** Pill(s) shown on the colour band's right side (price, current level, owner…) */
  badge?: ReactNode;
  /** Optional line under the subtitle */
  children?: ReactNode;
  className?: string;
}

/**
 * "Property deed" header: group-colour band with a kawung texture, a big tile icon that pops in,
 * the city name and its province / group.
 */
export function PropertyHeader({ map, def, titleId, badge, children, className }: PropertyHeaderProps) {
  const color = tileColor(map, def);
  return (
    <div className={clsx('relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70', className)}>
      <div
        className="relative h-12 sm:h-14"
        style={{ background: `linear-gradient(120deg, ${color} 0%, ${color}D9 55%, ${color}99 100%)` }}
      >
        <div className="batik-bg absolute inset-0 opacity-90 mix-blend-overlay" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/25" aria-hidden />
        <span className="absolute left-[5.75rem] top-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-950/80 sm:left-[6.5rem] sm:top-2.5 sm:text-xs">
          {tileGroupLabel(map, def)}
        </span>
        {badge && <div className="absolute right-2.5 top-2 flex items-center gap-1.5 sm:top-2.5">{badge}</div>}
      </div>
      <div className="relative flex items-end gap-3 px-3 pb-3">
        <motion.div
          className="-mt-8 grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-white to-ink-100 text-[2.6rem] shadow-lg sm:-mt-9 sm:h-20 sm:w-20 sm:text-5xl"
          style={{ boxShadow: `0 0 0 3px ${color}, 0 10px 24px -8px ${color}AA` }}
          initial={{ scale: 0.4, rotate: -14 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 16, delay: 0.08 }}
          aria-hidden
        >
          <span className="leading-none">{def.icon}</span>
        </motion.div>
        <div className="min-w-0 flex-1 pt-1.5">
          <h2 id={titleId} className="truncate font-display text-2xl font-bold leading-tight text-white sm:text-[1.7rem]">
            {def.name}
          </h2>
          {def.subtitle && <p className="truncate text-sm text-ink-300">{def.subtitle}</p>}
        </div>
      </div>
      {children && <div className="relative px-3 pb-3">{children}</div>}
    </div>
  );
}

/** Small pill used inside header bands and stat rows. */
export function Pill({
  children,
  tone = 'dark',
  className,
}: {
  children: ReactNode;
  tone?: 'dark' | 'gold' | 'merah' | 'daun' | 'brand';
  className?: string;
}) {
  const tones: Record<string, string> = {
    dark: 'bg-ink-950/75 text-white border-white/10',
    gold: 'bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 border-white/40',
    merah: 'bg-merah-500 text-white border-white/20',
    daun: 'bg-daun-500 text-ink-950 border-white/30',
    brand: 'bg-brand-500 text-white border-white/20',
  };
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 font-display text-xs font-semibold shadow-sm',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
