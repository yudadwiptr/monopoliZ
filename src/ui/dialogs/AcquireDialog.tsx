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
    <DialogShell variant="parchment" labelledBy={questionId} accent={MERAH_COLOR} ring={MERAH_COLOR}>
      <PropertyHeader
        map={map}
        def={def}
        titleId={nameId}
        badge={
          <>
            {festival && <Pill tone="gold">🎆 ×2</Pill>}
            {isCity && (
              <Pill className="pl-1">
                <LevelArt level={level} size={18} />
                {LEVEL_NAMES[level]}
              </Pill>
            )}
          </>
        }
      >
        <p id={questionId} className="text-center font-display text-xs font-extrabold text-[#b91c1c]">
          ⚔️ Akuisisi properti {ownerName}?
        </p>
        <div className="mt-1">
          <TakeoverRow owner={owner} me={me} price={pending.price} />
        </div>
      </PropertyHeader>

      <div className="flex gap-2">
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

      <p
        className="rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-[#2b1d12]"
        style={{
          background: 'rgba(255, 248, 231, 0.78)',
          border: '1.5px solid #8c6239',
        }}
      >
        💸 <b className="num text-[#15803d]">{formatRp(pending.price)}</b> masuk ke {ownerName}. Bangunan ikut pindah tangan
        {isCity && level < HOTEL_LEVEL ? ', dan kamu bisa langsung upgrade!' : '.'}
      </p>

      <DialogActions>
        <Button variant="glass" size="sm" silent onClick={skip} className={SKIP_BTN} aria-keyshortcuts="Escape">
          Nggak dulu
        </Button>
        <Button
          variant="danger"
          size="sm"
          silent
          disabled={!canAfford}
          onClick={acquire}
          className="!flex !h-10 min-w-0 !items-center !justify-center !gap-1.5 !border-2 !border-[#2b1d12] !px-2.5 !py-2 !text-[13px] !leading-[1.1] !shadow-[0_3px_0_#2b1d12] whitespace-nowrap"
          icon={<Swords size={16} strokeWidth={2.5} />}
          aria-keyshortcuts="Enter"
        >
          <ActionLabel verb="Akuisisi" amount={formatRp(pending.price)} />
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

/** Owner → you, with a pulsing chevron trail and the price in the middle. */
function TakeoverRow({ owner, me, price }: { owner: PlayerState | undefined; me: PlayerState; price: number }) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5"
      style={{
        background: 'rgba(255, 248, 231, 0.78)',
        border: '1.5px solid #8c6239',
      }}
    >
      <div className="flex min-w-0 flex-col items-center gap-0.5">
        {owner && <Avatar characterId={owner.characterId} size={36} className="opacity-85" />}
        <span className="max-w-[5.5rem] truncate text-[10px] font-bold text-[#5c4028]">{owner?.name ?? 'Pemilik'}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="flex items-center text-[#b91c1c]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25], x: [0, 4, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            >
              <ChevronRight size={18} strokeWidth={3} />
            </motion.span>
          ))}
        </div>
        <span className="num mt-0.5 whitespace-nowrap rounded-full border border-[#b91c1c]/40 bg-[#fee2e2] px-2 py-0.5 text-xs font-extrabold text-[#b91c1c]">
          {formatRp(price)}
        </span>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-0.5">
        <Avatar characterId={me.characterId} size={36} active />
        <span className="text-[10px] font-extrabold text-[#1e130c]">Kamu</span>
      </div>
    </div>
  );
}
