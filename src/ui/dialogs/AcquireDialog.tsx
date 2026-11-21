import { motion } from 'framer-motion';
import { ChevronRight, Swords } from 'lucide-react';
import { useId } from 'react';
import { Avatar, Button, Money } from '@/ui/common';
import { FESTIVAL_MULT, HOTEL_LEVEL, LEVEL_NAMES, touristToll } from '@/engine/economy';
import { currentPlayer, mapOf, playerById, tollAtState, touristTiles } from '@/engine/selectors';
import { formatRp } from '@/lib/format';
import type { GameState, PlayerState } from '@/engine/types';
import { ActionLabel, DialogActions, DialogShell, SKIP_BTN } from './shared/DialogShell';
import { PropertyHeader, Pill } from './shared/PropertyHeader';
import { LevelArt } from './shared/LevelArt';
import { Stat } from './shared/Stat';
import { useActOnce, useDialogKeys } from './shared/hooks';
import { MERAH_COLOR } from './shared/tileInfo';
import type { PendingOf } from './types';

export interface AcquireDialogProps {
  game: GameState;
  pending: PendingOf<'acquire'>;
}

/** Hostile takeover offer after paying an opponent's toll. */
export function AcquireDialog({ game, pending }: AcquireDialogProps) {
  const questionId = useId();
  const nameId = useId();
  const act = useActOnce();

  const map = mapOf(game);
  const def = map.tiles[pending.tile];
  const me = currentPlayer(game);
  const owner = playerById(game, pending.ownerId);
  const level = game.tiles[pending.tile]?.level ?? 0;
  const isCity = def.kind === 'city';
  const festival = game.festivalTile === pending.tile;
  // Tourist toll depends on how many tourist tiles the OWNER holds — recompute for you as the new owner.
  const myTourists = touristTiles(map).filter((i) => game.tiles[i]?.owner === me.id).length;
  const toll = isCity
    ? tollAtState(game, pending.tile)
    : touristToll(def, myTourists + 1) * (festival ? FESTIVAL_MULT : 1);
  const canAfford = pending.price <= me.cash;
  const ownerName = owner?.name ?? 'lawan';

  const acquire = () => canAfford && act({ type: 'ACQUIRE' });
  const skip = () => act({ type: 'SKIP' });
  useDialogKeys({ enter: canAfford ? acquire : undefined, escape: skip });

  return (
    <DialogShell labelledBy={questionId} accent={MERAH_COLOR} ring={MERAH_COLOR}>
      <motion.div
        className="mb-3 flex items-center gap-2"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-merah-400 to-merah-600 text-white shadow-glow-merah">
          <Swords size={18} strokeWidth={2.6} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-merah-300">Kesempatan akuisisi</p>
          <h2 id={questionId} className="truncate font-display text-xl font-bold leading-tight text-white">
            Akuisisi properti {ownerName}?
          </h2>
        </div>
      </motion.div>

      <PropertyHeader
        map={map}
        def={def}
        titleId={nameId}
        badge={
          <>
            {festival && <Pill tone="gold">🎆 ×2</Pill>}
            {isCity && (
              <Pill className="pl-1">
                <LevelArt level={level} size={20} />
                {LEVEL_NAMES[level]}
              </Pill>
            )}
          </>
        }
      >
        <TakeoverRow owner={owner} me={me} price={pending.price} />
      </PropertyHeader>

      <div className="mt-3 flex gap-2">
        <Stat label="Sewa jadi milikmu" tone="daun" value={formatRp(toll)} hint="tiap lawan mampir" />
        <Stat
          label="Sisa uang"
          tone={canAfford ? (me.cash - pending.price < 200 ? 'merah' : 'plain') : 'merah'}
          value={canAfford ? <Money value={me.cash - pending.price} flash={false} /> : 'Uang kurang'}
          hint={
            <>
              Uangmu <span className="num">{formatRp(me.cash)}</span>
            </>
          }
        />
      </div>

      <p className="mt-2.5 rounded-xl bg-white/5 px-3 py-2 text-xs text-ink-200">
        💸 <b className="num text-white">{formatRp(pending.price)}</b> masuk ke {ownerName}. Bangunan ikut pindah tangan
        {isCity && level < HOTEL_LEVEL ? ', dan kamu bisa langsung upgrade!' : '.'}
      </p>

      <DialogActions>
        <Button variant="glass" size="lg" silent onClick={skip} className={SKIP_BTN} aria-keyshortcuts="Escape">
          Nggak dulu
        </Button>
        <Button
          variant="danger"
          size="lg"
          silent
          disabled={!canAfford}
          onClick={acquire}
          className="min-w-0 flex-1 px-3"
          icon={<Swords size={20} strokeWidth={2.4} />}
          aria-keyshortcuts="Enter"
        >
          <ActionLabel verb="Akuisisi!" amount={formatRp(pending.price)} />
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

/** Owner → you, with a pulsing chevron trail and the price in the middle. */
function TakeoverRow({ owner, me, price }: { owner: PlayerState | undefined; me: PlayerState; price: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink-950/50 px-3 py-2.5">
      <div className="flex min-w-0 flex-col items-center gap-1">
        {owner && <Avatar characterId={owner.characterId} size={44} className="opacity-80" />}
        <span className="max-w-[5.5rem] truncate text-[11px] font-semibold text-ink-300">{owner?.name ?? 'Pemilik'}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="flex items-center text-merah-400" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25], x: [0, 4, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            >
              <ChevronRight size={20} strokeWidth={3} />
            </motion.span>
          ))}
        </div>
        <span className="num mt-0.5 whitespace-nowrap rounded-full bg-merah-500/20 px-2.5 py-0.5 text-sm font-bold text-merah-300">
          {formatRp(price)}
        </span>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-1">
        <Avatar characterId={me.characterId} size={44} active />
        <span className="text-[11px] font-semibold text-white">Kamu</span>
      </div>
    </div>
  );
}
