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
    <Modal open={open} onClose={onClose} placement="bottom" labelledBy={titleId} className="!max-w-lg">
      <div data-hud-sheet className="-m-4 flex max-h-[78dvh] flex-col text-[#2b1d12] sm:-m-5">
        <div className="flex items-center gap-3 border-b-2 border-[#c8a97e] bg-[#ebd4a9]/55 px-5 py-3.5">
          <span className="text-2xl" aria-hidden>
            📜
          </span>
          <h2 id={titleId} className="flex-1 font-display text-xl font-black text-[#2b1d12]">
            Riwayat Permainan
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#2b1d12] bg-[#4a3525] text-[#f6eedc] shadow-[0_2px_0_#2b1d12]"
          >
            <X size={20} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-2">
          {groups.length === 0 && <p className="py-6 text-center text-sm font-semibold text-[#6e5239]">Belum ada kejadian.</p>}
          {groups.map((g, gi) => (
            <section key={`${g.round}-${gi}`} className="mt-3">
              <h3 className="sticky top-0 z-10 -mx-1 mb-1 rounded-lg border border-[#c8a97e] bg-[#f5e6c8]/95 px-2 py-1 font-display text-xs font-black uppercase tracking-wider text-[#5c4028]">
                Ronde {g.round}
              </h3>
              <ul className="space-y-1">
                {g.entries.map((e) => (
                  <li key={e.id} className="flex items-start gap-2 text-sm font-semibold leading-snug text-[#2b1d12]">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-[#2b1d12]"
                      style={{ background: e.playerId ? colors[e.playerId] ?? '#8c6239' : '#8c6239' }}
                    />
                    <span
                      className={clsx(
                        e.tone === 'good' && 'text-[#15803d]',
                        e.tone === 'bad' && 'text-[#b91c1c]',
                        e.tone === 'info' && 'text-[#2b1d12]',
                      )}
                    >
                      {e.text}
                    </span>
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
