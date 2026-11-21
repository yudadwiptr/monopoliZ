import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Bot, Shuffle, User, X } from 'lucide-react';
import { forwardRef } from 'react';
import { Avatar } from '@/ui/common';
import { CHARACTERS, getCharacter } from '@/data/characters';
import type { BotLevel } from '@/engine/types';
import { Segmented, type SegOption } from '../Segmented';
import { IconButton } from '../IconButton';
import { alpha } from '../color';
import { NAME_MAX, placeholderName, type SeatDraft } from './setupModel';

const TYPE_OPTIONS: SegOption<boolean>[] = [
  { value: false, label: 'Manusia', icon: <User size={16} aria-hidden /> },
  { value: true, label: 'Bot', icon: <Bot size={16} aria-hidden /> },
];

const LEVEL_OPTIONS: SegOption<BotLevel>[] = [
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
];

export interface SeatCardProps {
  seat: SeatDraft;
  index: number;
  /** characterId → seat number (1-based) of the seat that holds it */
  takenBy: Record<string, number>;
  canRemove: boolean;
  onCharacter(id: string): void;
  onBot(isBot: boolean): void;
  onName(name: string): void;
  onShuffleName(): void;
  onLevel(level: BotLevel): void;
  onRemove(): void;
}

/** One player seat: character picker, name, human/bot and bot difficulty. */
export const SeatCard = forwardRef<HTMLDivElement, SeatCardProps>(function SeatCard(
  { seat, index, takenBy, canRemove, onCharacter, onBot, onName, onShuffleName, onLevel, onRemove },
  ref,
) {
  const char = getCharacter(seat.characterId);
  const n = index + 1;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className="glass relative overflow-hidden p-4"
      role="group"
      aria-label={`Pemain ${n}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{ background: `linear-gradient(180deg, ${alpha(char.color, 0.28)}, transparent)` }}
      />
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: char.color }} />

      {/* header */}
      <div className="relative flex items-center gap-3">
        <motion.div
          key={seat.characterId}
          initial={{ scale: 0.4, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 16 }}
        >
          <Avatar characterId={seat.characterId} size={60} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="num rounded-md px-1.5 py-0.5 text-[11px] font-bold text-ink-950"
              style={{ background: char.color }}
            >
              P{n}
            </span>
            <span className="truncate text-xs font-semibold text-ink-300">
              {seat.isBot ? 'Bot' : 'Pemain'} • {char.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={seat.name}
              onChange={(e) => onName(e.target.value)}
              placeholder={placeholderName(seat)}
              maxLength={NAME_MAX}
              aria-label={`Nama pemain ${n}`}
              className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-ink-950/60 px-3 font-display text-lg font-semibold text-white outline-none transition-shadow placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/30"
            />
            {seat.isBot && (
              <IconButton label={`Acak nama bot pemain ${n}`} onClick={onShuffleName}>
                <Shuffle size={18} />
              </IconButton>
            )}
          </div>
        </div>
        {canRemove && (
          <IconButton
            label={`Hapus pemain ${n}`}
            variant="ghost"
            onClick={onRemove}
            className="-mr-2 -mt-1 self-start text-ink-300 hover:text-merah-400"
          >
            <X size={20} />
          </IconButton>
        )}
      </div>

      {/* character picker */}
      <div role="radiogroup" aria-label={`Karakter pemain ${n}`} className="relative mt-4 grid grid-cols-6 gap-1.5">
        {CHARACTERS.map((c) => {
          const owner = takenBy[c.id];
          const mine = c.id === seat.characterId;
          const taken = owner !== undefined && !mine;
          return (
            <motion.button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={mine}
              aria-label={`${c.name}${taken ? `, dipakai P${owner}` : ''}`}
              disabled={taken}
              onClick={() => onCharacter(c.id)}
              whileHover={taken ? undefined : { y: -3, scale: 1.06 }}
              whileTap={taken ? undefined : { scale: 0.9 }}
              className={clsx(
                'relative grid aspect-square min-h-[44px] place-items-center rounded-2xl outline-none transition-colors',
                'focus-visible:ring-4 focus-visible:ring-brand-300/60',
                mine ? 'bg-white/15' : 'hover:bg-white/5',
                taken && 'cursor-not-allowed',
              )}
            >
              <Avatar characterId={c.id} size={36} ring={mine} dimmed={taken} />
              {taken && (
                <span className="num absolute -bottom-0.5 -right-0.5 rounded-md bg-ink-950/90 px-1 text-[10px] font-bold text-ink-200">
                  P{owner}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* type + level */}
      <div className="relative mt-3 space-y-2">
        <Segmented
          options={TYPE_OPTIONS}
          value={seat.isBot}
          onChange={onBot}
          ariaLabel={`Tipe pemain ${n}`}
          size="sm"
        />
        <div className="h-[48px]">
          <AnimatePresence mode="wait" initial={false}>
            {seat.isBot ? (
              <motion.div
                key="lvl"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                <Segmented
                  options={LEVEL_OPTIONS}
                  value={seat.botLevel}
                  onChange={onLevel}
                  ariaLabel={`Tingkat kesulitan bot pemain ${n}`}
                  accent="gold"
                  size="sm"
                />
              </motion.div>
            ) : (
              <motion.p
                key="tag"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="flex h-[48px] items-center rounded-2xl border border-white/5 bg-white/[0.04] px-3 text-xs italic text-ink-200"
              >
                “{char.tagline}”
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});
