import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { History } from 'lucide-react';
import { useMemo } from 'react';
import type { LogEntry } from '@/engine/types';
import { useGame } from '@/store/gameStore';
import { TONE_TEXT } from './labels';
import { useSettled } from './hooks';

const EMPTY: LogEntry[] = [];
const FADE = [1, 0.62, 0.36];

/** Game log as it was when the last animation finished (so the feed never spoils what's about to happen). */
export function useSettledLog(): LogEntry[] {
  const log = useGame((s) => s.game?.log ?? EMPTY);
  const busy = useGame((s) => s.busy);
  return useSettled(log, !busy);
}

export function usePlayerColors(): Record<string, string> {
  const players = useGame((s) => s.game?.players);
  return useMemo(() => {
    const out: Record<string, string> = {};
    players?.forEach((p) => (out[p.id] = p.color));
    return out;
  }, [players]);
}

export interface EventFeedProps {
  variant: 'card' | 'ticker';
  lines?: number;
  onOpen: () => void;
  className?: string;
}

/** Compact ticker of the latest log entries. Tap to open the full history sheet. */
export function EventFeed({ variant, lines = 3, onOpen, className }: EventFeedProps) {
  const log = useSettledLog();
  const colors = usePlayerColors();
  const latest = useMemo(() => log.slice(-lines).reverse(), [log, lines]);
  const card = variant === 'card';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Buka riwayat permainan"
      className={clsx(
        'group relative block w-full overflow-hidden text-left outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-300/60',
        card ? 'glass p-3 hover:bg-ink-700/60' : 'rounded-2xl border border-white/10 bg-ink-950/40 px-2.5 py-1.5 backdrop-blur-md hover:bg-ink-900/60',
        className,
      )}
    >
      {card && (
        <span className="mb-1.5 flex items-center justify-between">
          <span className="font-display text-xs font-semibold uppercase tracking-wider text-ink-300">📰 Kabar terkini</span>
          <History size={16} className="text-ink-300 transition-colors group-hover:text-white" aria-hidden />
        </span>
      )}
      {!card && (
        <History size={14} className="absolute right-2 top-2 text-ink-400 transition-colors group-hover:text-white" aria-hidden />
      )}
      <ul className={clsx('relative', !card && 'pr-5')} aria-live="polite">
        {latest.length === 0 && <li className="text-xs text-ink-400">Belum ada kabar. Gas mulai!</li>}
        <AnimatePresence initial={false}>
          {latest.map((e, i) => (
            <motion.li
              key={e.id}
              layout="position"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: FADE[i] ?? 0.3, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className={clsx('flex items-center gap-1.5', card ? 'py-0.5 text-[13px]' : 'text-xs leading-[18px]')}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: e.playerId ? colors[e.playerId] ?? '#8C96C9' : '#8C96C9' }}
              />
              <span className={clsx('truncate', TONE_TEXT[e.tone])}>{e.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </button>
  );
}
