import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Bot } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, Money } from '@/ui/common';
import type { PlayerState } from '@/engine/types';

export interface RankRow {
  player: PlayerState;
  assets: number;
  properties: number;
  landmarks: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Final standings with count-up total assets. */
export function RankingList({ rows, delay = 0.9 }: { rows: RankRow[]; delay?: number }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), (delay + 0.3) * 1000);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <ol className="space-y-2" aria-label="Peringkat akhir">
      {rows.map((r, i) => (
        <motion.li
          key={r.player.id}
          initial={{ opacity: 0, x: -30, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: delay + i * 0.12 }}
          className={clsx(
            'flex items-center gap-3 rounded-2xl border-2 p-3 shadow-[0_4px_0_#1e130c]',
            i === 0
              ? 'border-[#fbbf24] bg-gradient-to-r from-[#78350f]/90 via-[#4a2b12]/90 to-[#362011]/90'
              : 'border-[#8c6239]/80 bg-[#362011]/90',
          )}
          style={{ boxShadow: `inset 4px 0 0 ${r.player.color}` }}
        >
          <span className="grid w-8 shrink-0 place-items-center text-2xl" aria-label={`Peringkat ${i + 1}`}>
            {MEDALS[i] ?? <span className="num text-lg text-ink-300">{i + 1}</span>}
          </span>
          <Avatar characterId={r.player.characterId} size={44} dimmed={r.player.bankrupt} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-base font-semibold text-white">{r.player.name}</span>
              {r.player.isBot && (
                <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-ink-200">
                  <Bot size={11} aria-hidden /> BOT
                </span>
              )}
              {r.player.bankrupt && (
                <span className="shrink-0 rounded-md bg-merah-500/20 px-1.5 py-0.5 text-[10px] font-bold text-merah-300">
                  BANGKRUT
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-300">
              🏠 <span className="num">{r.properties}</span> properti • 🏛️ <span className="num">{r.landmarks}</span> landmark
            </div>
          </div>
          <div className="shrink-0 text-right">
            <Money
              value={revealed ? r.assets : 0}
              flash={false}
              className={clsx('block text-base sm:text-lg', i === 0 ? 'text-gold-300' : 'text-white')}
            />
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Total aset</div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
