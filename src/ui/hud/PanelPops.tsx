import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useMemo } from 'react';
import { formatRp } from '@/lib/format';
import { useGame, type Fx, type FxKind } from '@/store/gameStore';

/** Fx kinds that belong on a player panel (tile-anchored kinds like buy/build are drawn by the board). */
const PANEL_KINDS: ReadonlySet<FxKind> = new Set<FxKind>(['money', 'salary', 'text', 'shield']);

function popText(f: Fx): string {
  if (f.kind === 'salary') return `GAJIAN! ${formatRp(f.amount ?? 0, { sign: true })}`;
  if (f.kind === 'money') return formatRp(f.amount ?? 0, { sign: true });
  return f.text ?? '';
}

function popClass(f: Fx): string {
  if (f.kind === 'salary') return 'text-gold-300 border-gold-400/50 bg-ink-950/80';
  if (f.tone === 'good') return 'text-daun-400 border-daun-500/40 bg-ink-950/80';
  if (f.tone === 'bad') return 'text-merah-300 border-merah-500/50 bg-ink-950/80';
  return 'text-ink-100 border-white/20 bg-ink-950/80';
}

/** Floating "+Rp 200 jt" / "-Rp 120 jt" pops on a player panel. Gains rise, losses fall. */
export function PanelPops({ playerId, small }: { playerId: string; small?: boolean }) {
  const fx = useGame((s) => s.fx);
  const mine = useMemo(
    () => fx.filter((f) => f.playerId === playerId && PANEL_KINDS.has(f.kind) && (f.kind === 'text' || f.kind === 'shield' ? !!f.text : !!f.amount)),
    [fx, playerId],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" aria-live="polite">
      <AnimatePresence>
        {mine.map((f, i) => {
          const falling = f.kind === 'money' && (f.amount ?? 0) < 0;
          const stack = (mine.length - 1 - i) * (small ? 16 : 22);
          const rise = small ? 18 : 26;
          return (
            <motion.div
              key={f.id}
              className={clsx(
                'absolute whitespace-nowrap rounded-full border font-display font-bold shadow-glass',
                small ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-sm',
                popClass(f),
              )}
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ opacity: 1, scale: 1, y: falling ? rise + stack : -rise - stack }}
              exit={{ opacity: 0, scale: 0.9, y: falling ? rise * 2 + stack : -rise * 2 - stack }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            >
              {popText(f)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
