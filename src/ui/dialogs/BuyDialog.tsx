import { motion } from 'framer-motion';
import { Lock, ShoppingBag, Trophy } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button, Money } from '@/ui/common';
import {
  HOTEL_LEVEL,
  LEVEL_NAMES,
  applyDiscount,
  cityToll,
  purchaseCost,
  touristToll,
} from '@/engine/economy';
import { currentPlayer, mapOf, touristTiles } from '@/engine/selectors';
import { formatRp } from '@/lib/format';
import type { GameState, MapDef, PlayerState, TileDef } from '@/engine/types';
import { ActionLabel, DialogActions, DialogShell, SKIP_BTN } from './shared/DialogShell';
import { PropertyHeader, Pill } from './shared/PropertyHeader';
import { LevelStepper, type LevelOption } from './shared/LevelStepper';
import { Stat } from './shared/Stat';
import { useActOnce, useDialogKeys } from './shared/hooks';
import { tileColor } from './shared/tileInfo';
import type { PendingOf } from './types';

export interface BuyDialogProps {
  game: GameState;
  pending: PendingOf<'buy'>;
}

/** Unowned property: pick how far to build right away (city) or just buy it (tourist). */
export function BuyDialog({ game, pending }: BuyDialogProps) {
  const map = mapOf(game);
  const def = map.tiles[pending.tile];
  const me = currentPlayer(game);
  return def.kind === 'tourist' ? (
    <TouristBuy game={game} map={map} def={def} me={me} pending={pending} />
  ) : (
    <CityBuy map={map} def={def} me={me} pending={pending} />
  );
}

interface InnerProps {
  map: MapDef;
  def: TileDef;
  me: PlayerState;
  pending: PendingOf<'buy'>;
}

function CityBuy({ map, def, me, pending }: InnerProps) {
  const titleId = useId();
  const act = useActOnce();

  const options = useMemo<LevelOption[]>(
    () =>
      Array.from({ length: HOTEL_LEVEL + 1 }, (_, level) => {
        const baseCost = purchaseCost(def, level);
        const cost = applyDiscount(baseCost, pending.discount);
        const locked = level > pending.maxLevel;
        const poor = !locked && cost > me.cash;
        return {
          level,
          cost,
          baseCost,
          toll: cityToll(def, level),
          status: locked ? 'locked' : poor ? 'poor' : 'ok',
          reason: locked ? '1 putaran lagi' : poor ? 'Uang kurang' : undefined,
        };
      }),
    [def, pending.discount, pending.maxLevel, me.cash],
  );

  const bestAffordable = [...options].reverse().find((o) => o.status === 'ok')?.level ?? null;
  const [selected, setSelected] = useState<number | null>(bestAffordable);
  const choice = options.find((o) => o.level === selected && o.status === 'ok') ?? null;

  const buy = () => choice && act({ type: 'BUY', level: choice.level });
  const skip = () => act({ type: 'SKIP' });
  useDialogKeys({ enter: choice ? buy : undefined, escape: skip });

  const lockedNames = options.filter((o) => o.status === 'locked').map((o) => LEVEL_NAMES[o.level]);

  return (
    <DialogShell variant="parchment" labelledBy={titleId} accent={tileColor(map, def)}>
      <PropertyHeader
        map={map}
        def={def}
        titleId={titleId}
        badge={
          pending.discount ? (
            <Pill tone="gold">🏷️ -50%</Pill>
          ) : (
            <Pill>
              🚩 <span className="num">{formatRp(def.price ?? 0)}</span>
            </Pill>
          )
        }
      />

      <div>
        <div className="flex items-baseline justify-between px-0.5">
          <p className="font-display text-xs font-extrabold text-[#2b1d12]">Pilih bangunan (checklist):</p>
          {lockedNames.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#6b4c30]">
              <Lock size={10} className="shrink-0" aria-hidden />
              {lockedNames.join(' & ')}: putaran 2
            </span>
          )}
        </div>
        <div className="mt-1">
          <LevelStepper options={options} selected={selected} onSelect={setSelected} label="Pilih level pembelian" cumulative />
        </div>
      </div>

      <div className="flex gap-2">
        <Stat
          label="Sewa kamu"
          tone="daun"
          value={choice ? formatRp(choice.toll) : '—'}
          hint={choice ? `per lawan mampir` : undefined}
        />
        <Stat
          label="Sisa uang"
          tone={choice && me.cash - choice.cost < 200 ? 'merah' : 'plain'}
          value={choice ? <Money value={me.cash - choice.cost} flash={false} /> : '—'}
          hint={
            <>
              Kas <span className="num">{formatRp(me.cash, { short: true })}</span>
            </>
          }
        />
      </div>

      {pending.discount && choice && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#b45309] bg-[#fef3c7]/90 px-2.5 py-1 text-[11px] font-semibold text-[#78350f]"
        >
          🏷️ Voucher 50% kepakai — hemat <b className="num">{formatRp(choice.baseCost - choice.cost)}</b>!
        </motion.p>
      )}

      <DialogActions>
        <Button variant="glass" size="sm" silent onClick={skip} className={SKIP_BTN} aria-keyshortcuts="Escape">
          Lewati
        </Button>
        <Button
          variant="gold"
          size="sm"
          silent
          disabled={!choice}
          onClick={buy}
          className="!flex !h-10 min-w-0 !items-center !justify-center !gap-1.5 !border-2 !border-[#2b1d12] !px-2.5 !py-2 !text-[13px] !leading-[1.1] !text-[#1e130c] !shadow-[0_3px_0_#2b1d12] whitespace-nowrap"
          icon={<ShoppingBag size={16} strokeWidth={2.5} />}
          aria-keyshortcuts="Enter"
        >
          <ActionLabel verb="Beli" amount={choice ? formatRp(choice.cost) : undefined} />
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

function TouristBuy({ game, map, def, me, pending }: InnerProps & { game: GameState }) {
  const titleId = useId();
  const act = useActOnce();

  const baseCost = purchaseCost(def, 0);
  const cost = applyDiscount(baseCost, pending.discount);
  const canBuy = cost <= me.cash;
  const all = touristTiles(map);
  const owned = all.filter((i) => game.tiles[i]?.owner === me.id).length;
  const after = owned + 1;
  const tiers = all.map((_, k) => ({ count: k + 1, toll: touristToll(def, k + 1) }));
  const winsNow = after >= all.length;

  const buy = () => canBuy && act({ type: 'BUY', level: 0 });
  const skip = () => act({ type: 'SKIP' });
  useDialogKeys({ enter: canBuy ? buy : undefined, escape: skip });

  return (
    <DialogShell variant="parchment" labelledBy={titleId} accent={tileColor(map, def)}>
      <PropertyHeader
        map={map}
        def={def}
        titleId={titleId}
        badge={pending.discount ? <Pill tone="gold">🏷️ -50%</Pill> : <Pill>🏝️ Wisata</Pill>}
      />

      <div
        className="rounded-xl px-2.5 py-2"
        style={{
          background: 'rgba(255, 248, 231, 0.78)',
          border: '1.5px solid #8c6239',
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xs font-extrabold text-[#0f766e]">Sewa per koleksi wisata</p>
          <p className="whitespace-nowrap text-[10.5px] font-semibold text-[#5c4028]">
            Kamu punya <b className="num text-[#1e130c]">{owned}</b>/{all.length}
          </p>
        </div>
        <div
          className="mt-2"
          role="list"
          aria-label="Tabel sewa wisata"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            textAlign: 'center',
            fontSize: '11px',
          }}
        >
          {tiers.map((t) => {
            const mine = t.count === after;
            return (
              <div
                key={t.count}
                role="listitem"
                className="flex flex-col items-center justify-between rounded-lg px-1 py-1.5"
                style={{
                  background: mine ? 'rgba(254, 243, 199, 0.95)' : 'rgba(232, 213, 181, 0.55)',
                  border: mine ? '1.5px solid #d97706' : '1px solid rgba(140, 98, 57, 0.45)',
                }}
              >
                <span className={`num whitespace-nowrap text-[11.5px] font-extrabold ${mine ? 'text-[#b45309]' : 'text-[#1e130c]'}`}>
                  {formatRp(t.toll, { short: true })}
                </span>
                <span className={`mt-1 whitespace-nowrap text-[10.5px] font-extrabold ${mine ? 'text-[#b45309]' : 'text-[#5c4028]'}`}>
                  {mine ? 'Kamu!' : `${t.count} wisata`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <motion.p
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-[#2b1d12]"
        style={{
          background: winsNow ? 'rgba(254, 243, 199, 0.92)' : 'rgba(255, 248, 231, 0.78)',
          border: winsNow ? '1.5px solid #d97706' : '1.5px solid #8c6239',
        }}
        animate={winsNow ? { scale: [1, 1.02, 1] } : undefined}
        transition={winsNow ? { repeat: Infinity, duration: 1.4 } : undefined}
      >
        <Trophy size={14} className="shrink-0 text-[#b45309]" aria-hidden />
        {winsNow ? (
          <span>
            <b>Wisata terakhir!</b> Beli = menang <b>Monopoli Wisata</b>! 🏆
          </span>
        ) : (
          <span>
            Kuasai <b>{all.length} destinasi wisata</b> = <b className="text-[#b45309]">Monopoli Wisata</b>!
          </span>
        )}
      </motion.p>

      <div className="flex gap-2">
        <Stat
          label="Harga"
          tone="daun"
          value={
            <span className="flex items-baseline gap-1">
              {pending.discount && <s className="text-[10px] text-[#785a3c]">{formatRp(baseCost, { short: true })}</s>}
              {formatRp(cost)}
            </span>
          }
        />
        <Stat
          label="Sisa uang"
          tone={canBuy ? 'plain' : 'merah'}
          value={canBuy ? <Money value={me.cash - cost} flash={false} /> : 'Uang kurang'}
          hint={
            <>
              Uangmu <span className="num">{formatRp(me.cash)}</span>
            </>
          }
        />
      </div>

      <DialogActions>
        <Button variant="glass" size="sm" silent onClick={skip} className={SKIP_BTN} aria-keyshortcuts="Escape">
          Lewati
        </Button>
        <Button
          variant="gold"
          size="sm"
          silent
          disabled={!canBuy}
          onClick={buy}
          className="!flex !h-10 min-w-0 !items-center !justify-center !gap-1.5 !border-2 !border-[#2b1d12] !px-2.5 !py-2 !text-[13px] !leading-[1.1] !text-[#1e130c] !shadow-[0_3px_0_#2b1d12] whitespace-nowrap"
          icon={<ShoppingBag size={16} strokeWidth={2.5} />}
          aria-keyshortcuts="Enter"
        >
          <ActionLabel verb="Beli" amount={formatRp(cost)} />
        </Button>
      </DialogActions>
    </DialogShell>
  );
}
