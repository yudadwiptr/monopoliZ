import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Check, Lock } from 'lucide-react';
import { sfx } from '@/audio';
import type { MapDef } from '@/engine/types';
import { MiniBoard } from './MiniBoard';

export interface MapCardProps {
  map: MapDef;
  selected: boolean;
  onSelect(): void;
  /** Small card for the phone setup wizard (one swipeable row). */
  compact?: boolean;
}

/** Selectable map card with a themed preview of the board. Locked maps show "Segera Hadir". */
export function MapCard({ map, selected, onSelect, compact }: MapCardProps) {
  const locked = !!map.locked;
  const cities = map.tiles.filter((t) => t.kind === 'city').length;
  const wisata = map.tiles.filter((t) => t.kind === 'tourist').length;

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={locked || undefined}
      aria-label={`${map.name}${locked ? ' (segera hadir)' : ''}`}
      onClick={() => {
        if (locked) {
          sfx.play('error');
          return;
        }
        if (!selected) sfx.play('click');
        onSelect();
      }}
      whileHover={locked ? undefined : { y: -5 }}
      whileTap={locked ? { x: [0, -6, 6, -3, 0] } : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={clsx(
        'group relative flex shrink-0 snap-center flex-col overflow-hidden rounded-3xl border text-left outline-none',
        compact ? 'w-[232px]' : 'w-[78%] sm:w-auto',
        'bg-ink-800/70 backdrop-blur-xl focus-visible:ring-4 focus-visible:ring-brand-300/60',
        selected
          ? 'border-brand-300 shadow-[0_0_0_2px_#5AA6EC,0_18px_40px_-12px_rgba(58,140,214,0.7)]'
          : 'border-white/10 shadow-glass',
        locked && 'cursor-not-allowed',
      )}
    >
      <div
        className={clsx('relative w-full overflow-hidden', compact ? 'aspect-[5/2]' : 'aspect-[16/10]')}
        style={{ background: map.theme.background }}
      >
        <div className="batik-bg absolute inset-0 opacity-70" />
        {!locked && map.tiles.length === 32 && <MiniBoard map={map} />}
        <div className="absolute inset-0 grid place-items-center">
          <span
            className={clsx('text-5xl sm:text-6xl', locked && 'opacity-60 grayscale-[40%]')}
            style={{ animation: 'mz-bob 3.2s ease-in-out infinite', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.45))' }}
            aria-hidden
          >
            {map.theme.emblem}
          </span>
        </div>
        {locked && (
          <div className="absolute inset-0 grid place-items-center bg-ink-950/45">
            <div className="mt-16 flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/80 px-3 py-1.5 font-display text-sm font-semibold text-gold-300">
              <Lock size={14} aria-hidden /> Segera Hadir
            </div>
          </div>
        )}
        {!locked && (
          <span className="num absolute bottom-2 left-2 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs text-white">
            {map.tiles.length} petak
          </span>
        )}
        <motion.span
          initial={false}
          animate={{ scale: selected ? 1 : 0, rotate: selected ? 0 : -90 }}
          transition={{ type: 'spring', stiffness: 600, damping: 22 }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-white shadow-glow-brand"
          aria-hidden
        >
          <Check size={18} strokeWidth={3} />
        </motion.span>
      </div>

      <div className={clsx('flex flex-1 flex-col', compact ? 'px-3 pb-3 pt-2' : 'p-4')}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={clsx('font-display font-bold leading-tight text-white', compact ? 'text-lg' : 'text-xl')}>{map.name}</h3>
        </div>
        <p className="text-sm font-semibold" style={{ color: map.theme.accent }}>
          {map.tagline}
        </p>
        {!compact && <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-300">{map.description}</p>}
        {!locked && (
          <div className={clsx('mt-auto flex gap-1.5 text-[11px] font-semibold', compact ? 'pt-2' : 'pt-3')}>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-ink-100">🏙️ {cities} kota</span>
            <span className="rounded-full bg-laut-500/15 px-2 py-0.5 text-laut-300">🏝️ {wisata} wisata</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}
