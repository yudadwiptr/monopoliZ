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
  gold: 'text-[#b45309]',
  daun: 'text-[#15803d]',
  merah: 'text-[#b91c1c]',
  brand: 'text-[#1d4ed8]',
  muted: 'text-[#6e5239]',
};

/**
 * Board-picking mode. NOT a modal: Board3D highlights `pending.candidates` and handles taps on tiles.
 * This adds a 2D wood & parchment top instruction banner plus a list of candidate chips.
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
        className="pointer-events-auto relative w-full max-w-xl overflow-hidden rounded-[1.6rem] border-[3.5px] border-[#2b1d12] p-1.5 text-[#2b1d12]"
        style={{
          background: 'linear-gradient(180deg, #7c4d25 0%, #5c3718 100%)',
          boxShadow: '0 6px 0 #2b1d12, 0 18px 45px -10px rgba(0,0,0,0.7)',
        }}
        initial={{ y: -90, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -70, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      >
        <div
          className="overflow-hidden rounded-[1.2rem] border-2 border-[#8c6239]"
          style={{
            background: 'linear-gradient(180deg, #fff9ea 0%, #f5e6c8 60%, #ebd4a9 100%)',
          }}
        >
          <div className="relative flex items-center gap-3 p-2.5 sm:p-3">
            <motion.div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-[#2b1d12] bg-[#fef3c7] text-[1.75rem] leading-none shadow-[0_3px_0_#2b1d12]"
              animate={{ y: [0, -3, 0], rotate: [0, -4, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            >
              {copy.emoji}
            </motion.div>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-base font-black leading-tight text-[#2b1d12] sm:text-lg">
                <span className="sr-only">{copy.emoji} </span>
                {copy.title}
              </h2>
              <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-[#5c4028]">{copy.hint}</p>
            </div>
            {pending.optional && (
              <Button
                variant="glass"
                size="sm"
                silent
                onClick={skip}
                icon={<X size={15} strokeWidth={2.6} />}
                className="h-10 shrink-0 !border-2 !border-[#5c4028] !bg-[#ebd5b3] px-3 !font-extrabold !text-[#2b1d12] !shadow-[0_3px_0_#5c4028] hover:!bg-[#dfc396]"
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
            className="relative flex min-h-[40px] w-full items-center justify-between border-t-2 border-[#c8a97e] bg-[#ebd4a9]/55 px-3 text-xs font-extrabold text-[#4a3525] outline-none hover:bg-[#e2c692]/75"
          >
            <span className="flex items-center gap-2">
              <ListChecks size={15} aria-hidden />
              Pilih dari daftar
              <span className="num rounded-full border border-[#5c4028] bg-[#fff8e7] px-2 py-0.5 text-[11px] font-black text-[#2b1d12]">
                {sorted.length}
              </span>
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
                    'scrollbar-thin relative flex snap-x gap-2 overflow-x-auto px-3 pb-3 pt-2',
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
        </div>
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
        className="relative flex h-14 w-[9.5rem] items-center gap-2 overflow-hidden rounded-2xl border-2 border-[#8c6239] bg-[#fff8e7] pl-3.5 pr-2.5 text-left text-[#2b1d12] shadow-[0_2px_0_#8c6239] outline-none transition-colors hover:border-[#d97706] hover:bg-[#fef3c7] focus-visible:ring-4 focus-visible:ring-amber-500/50 sm:w-[10.25rem]"
      >
        <span className="absolute inset-y-0 left-0 w-2" style={{ background: tileColor(map, def) }} aria-hidden />
        <span className="text-2xl leading-none" aria-hidden>
          {def.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-black leading-tight text-[#2b1d12]">{def.name}</span>
          {info.label && (
            <span className={clsx('num block truncate text-[11px] font-extrabold leading-tight', CHIP_TONE[info.tone])}>
              {info.label}
            </span>
          )}
        </span>
        {owner && <Avatar characterId={owner.characterId} size={20} ring={false} className="mt-1 self-start" />}
      </motion.button>
    </li>
  );
}
