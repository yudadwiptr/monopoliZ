import clsx from 'clsx';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import type { LogEntry } from '@/engine/types';
import { Button, Modal } from '@/ui/common';
import { TONE_TEXT } from './labels';
import { usePlayerColors, useSettledLog } from './EventFeed';

interface RoundGroup {
  round: number;
  entries: LogEntry[];
}

/** Full, scrollable game history (newest first, grouped by round). */
export function LogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const log = useSettledLog();
  const colors = usePlayerColors();
  const groups = useMemo(() => {
    const out: RoundGroup[] = [];
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i];
      const last = out[out.length - 1];
      if (last && last.round === e.round) last.entries.push(e);
      else out.push({ round: e.round, entries: [e] });
    }
    return out;
  }, [log]);
  const titleId = 'hud-log-title';

  return (
    <Modal open={open} onClose={onClose} placement="bottom" labelledBy={titleId} className="!max-w-lg !p-0">
      <div data-hud-sheet className="flex max-h-[78dvh] flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="text-2xl" aria-hidden>
            📜
          </span>
          <h2 id={titleId} className="flex-1 font-display text-xl font-bold text-white">
            Riwayat Permainan
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Tutup" className="!h-11 !w-11 !px-0">
            <X size={22} aria-hidden />
          </Button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-2">
          {groups.length === 0 && <p className="py-6 text-center text-sm text-ink-400">Belum ada kejadian.</p>}
          {groups.map((g, gi) => (
            <section key={`${g.round}-${gi}`} className="mt-3">
              <h3 className="sticky top-0 z-10 -mx-1 mb-1 rounded-lg bg-ink-800/95 px-1 py-1 font-display text-xs font-semibold uppercase tracking-wider text-ink-300">
                Ronde {g.round}
              </h3>
              <ul className="space-y-1">
                {g.entries.map((e) => (
                  <li key={e.id} className="flex items-start gap-2 text-sm leading-snug">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: e.playerId ? colors[e.playerId] ?? '#8C96C9' : '#8C96C9' }}
                    />
                    <span className={clsx(TONE_TEXT[e.tone])}>{e.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
