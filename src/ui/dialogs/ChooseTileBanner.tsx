import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { ChevronDown, ListChecks, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Avatar, Button } from '@/ui/common';
import { sfx } from '@/audio';
import { haptic } from '@/store/settingsStore';
import { currentPlayer, mapOf } from '@/engine/selectors';
import type { GameState, MapDef, PlayerState } from '@/engine/types';
import { useActOnce, useDialogKeys, useIsDesktop } from './shared/hooks';
import { tileColor } from './shared/tileInfo';
import { PURPOSE_COPY, chipInfo, sortCandidates, type ChipTone } from './choose/chipInfo';
import type { PendingOf } from './types';

export interface ChooseTileBannerProps {
  game: GameState;
  pending: PendingOf<'choose_tile'>;
}

const CHIP_TONE: Record<ChipTone, string> = {
  gold: 'text-gold-300',
  daun: 'text-daun-400',
  merah: 'text-merah-300',
  brand: 'text-brand-300',
  muted: 'text-ink-300',
};

/**
 * Board-picking mode. NOT a modal: Board3D highlights `pending.candidates` and handles taps on tiles.
 * This adds a top instruction banner plus a list of candidate chips (big tap targets for phones).
 */
export function ChooseTileBanner({ game, pending }: ChooseTileBannerProps) {
  const titleId = useId();
  const listId = useId();
  const act = useActOnce();
  const desktop = useIsDesktop();
  const map = mapOf(game);
  const me = currentPlayer(game);
  const copy = PURPOSE_COPY[pending.purpose];
  const [open, setOpen] = useState(() => !desktop || pending.candidates.length <= 10);

  const sorted = useMemo(
    () => sortCandidates(game, map, me, pending.purpose, pending.candidates),
    [game, map, me, pending.purpose, pending.candidates],
  );

  useEffect(() => sfx.play('open'), []);

  const skip = () => pending.optional && act({ type: 'SKIP' });
  const choose = (tile: number) => {
    haptic(12);
    act({ type: 'CHOOSE_TILE', tile });
  };
  useDialogKeys({ escape: pending.optional ? skip : undefined });

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <motion.section
        aria-labelledby={titleId}
        className="glass-strong pointer-events-auto relative w-full max-w-xl overflow-hidden"
        style={{ boxShadow: '0 0 0 1.5px rgba(90,166,236,0.45), 0 18px 50px -12px rgba(0,0,0,0.7), 0 0 40px -10px rgba(58,140,214,0.6)' }}
        initial={{ y: -90, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -70, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      >
        <div className="batik-bg pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex items-center gap-3 p-3">
          <motion.div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-500/25 text-[1.75rem] leading-none ring-1 ring-brand-300/40"
            animate={{ y: [0, -4, 0], rotate: [0, -4, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            {copy.emoji}
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-base font-bold leading-tight text-white sm:text-lg">
              <span className="sr-only">{copy.emoji} </span>
              {copy.title}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-300">{copy.hint}</p>
          </div>
          {pending.optional && (
            <Button
              variant="glass"
              size="sm"
              silent
              onClick={skip}
              icon={<X size={15} strokeWidth={2.6} />}
              className="h-11 shrink-0 px-3"
              aria-keyshortcuts="Escape"
            >
              Lewati
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            sfx.play('click', { volume: 0.6 });
            setOpen((o) => !o);
          }}
          aria-expanded={open}
          aria-controls={listId}
          className="relative flex min-h-[44px] w-full items-center justify-between border-t border-white/10 px-3 text-xs font-semibold text-ink-200 outline-none hover:bg-white/5 focus-visible:bg-white/10"
        >
          <span className="flex items-center gap-2">
            <ListChecks size={15} aria-hidden />
            Pilih dari daftar
            <span className="num rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white">{sorted.length}</span>
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 24 }}>
            <ChevronDown size={16} aria-hidden />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="list"
              id={listId}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <ul
                className={clsx(
                  'scrollbar-thin relative flex snap-x gap-2 overflow-x-auto px-3 pb-3 pt-0.5',
                  'sm:max-h-[11.75rem] sm:snap-none sm:flex-wrap sm:overflow-y-auto sm:overflow-x-hidden',
                )}
                aria-label="Petak yang bisa dipilih"
              >
                {sorted.map((tile, i) => (
                  <Chip
                    key={tile}
                    tile={tile}
                    index={i}
                    game={game}
                    map={map}
                    me={me}
                    pending={pending}
                    onChoose={choose}
                  />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}

interface ChipProps {
  tile: number;
  index: number;
  game: GameState;
  map: MapDef;
  me: PlayerState;
  pending: PendingOf<'choose_tile'>;
  onChoose(tile: number): void;
}

function Chip({ tile, index, game, map, me, pending, onChoose }: ChipProps) {
  const def = map.tiles[tile];
  const info = chipInfo(game, map, me, pending.purpose, tile);
  const owner = info.ownerId ? game.players.find((p) => p.id === info.ownerId) : undefined;
  return (
    <li className="shrink-0 snap-start">
      <motion.button
        type="button"
        onClick={() => onChoose(tile)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28, delay: Math.min(index, 12) * 0.025 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`${def.name}${info.label ? ` — ${info.label}` : ''}${owner ? ` (milik ${owner.name})` : ''}`}
        className="relative flex h-14 w-[9.5rem] items-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-ink-950/40 pl-3.5 pr-2.5 text-left outline-none transition-colors hover:border-brand-300/60 hover:bg-brand-500/15 focus-visible:ring-4 focus-visible:ring-brand-300/60 sm:w-[10.25rem]"
      >
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: tileColor(map, def) }} aria-hidden />
        <span className="text-2xl leading-none" aria-hidden>
          {def.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold leading-tight text-white">{def.name}</span>
          {info.label && (
            <span className={clsx('num block truncate text-[11px] font-semibold leading-tight', CHIP_TONE[info.tone])}>
              {info.label}
            </span>
          )}
        </span>
        {owner && <Avatar characterId={owner.characterId} size={20} ring={false} className="self-start mt-1" />}
      </motion.button>
    </li>
  );
}
