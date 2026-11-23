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
    <DialogShell labelledBy={titleId} accent={tileColor(map, def)} className="sm:max-w-[28rem]">
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

      <div className="mt-2.5 flex items-baseline justify-between px-0.5">
        <p className="font-display text-sm font-semibold text-white">Pilih bangunan (checklist):</p>
        {lockedNames.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-ink-300">
            <Lock size={11} className="shrink-0" aria-hidden />
            {lockedNames.join(' & ')}: putaran 2
          </span>
        )}
      </div>
      <div className="mt-1.5">
        <LevelStepper options={options} selected={selected} onSelect={setSelected} label="Pilih level pembelian" cumulative />
      </div>

      <div className="mt-2.5 flex gap-2">
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
          className="mt-2 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-xs text-gold-200"
        >
          🏷️ Voucher 50% kepakai — hemat <b className="num">{formatRp(choice.baseCost - choice.cost)}</b>!
        </motion.p>
      )}

      <DialogActions>
        <Button variant="glass" size="lg" silent onClick={skip} className={SKIP_BTN} aria-keyshortcuts="Escape">
          Lewati
        </Button>
        <Button
          variant="gold"
          size="lg"
          silent
          disabled={!choice}
          onClick={buy}
          className="min-w-0 flex-1 px-3"
          icon={<ShoppingBag size={20} strokeWidth={2.4} />}
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
  const maxToll = Math.max(1, ...tiers.map((t) => t.toll));
  const winsNow = after >= all.length;

  const buy = () => canBuy && act({ type: 'BUY', level: 0 });
  const skip = () => act({ type: 'SKIP' });
  useDialogKeys({ enter: canBuy ? buy : undefined, escape: skip });

  return (
    <DialogShell labelledBy={titleId} accent={tileColor(map, def)}>
      <PropertyHeader
        map={map}
        def={def}
        titleId={titleId}
        badge={pending.discount ? <Pill tone="gold">🏷️ -50%</Pill> : <Pill>🏝️ Wisata</Pill>}
      />

      <div className="mt-3 rounded-2xl border border-laut-400/25 bg-laut-500/[0.07] p-3">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-sm font-semibold text-laut-300">Sewa per koleksi wisata</p>
          <p className="text-[11px] text-ink-300">
            Kamu punya <b className="num text-white">{owned}</b>/{all.length}
          </p>
        </div>
        <div className="mt-2 grid grid-cols-4 items-end gap-2" role="list" aria-label="Tabel sewa wisata">
          {tiers.map((t, i) => {
            const mine = t.count === after;
            return (
              <div key={t.count} role="listitem" className="flex flex-col items-center">
                <span className={`num mb-1 text-[12px] font-bold ${mine ? 'text-gold-300' : 'text-ink-200'}`}>
                  {formatRp(t.toll, { short: true })}
                </span>
                <div className="relative flex h-16 w-full items-end overflow-hidden rounded-xl bg-white/5">
                  <motion.div
                    className={`w-full origin-bottom rounded-lg ${mine ? 'bg-gradient-to-t from-gold-600 to-gold-300 shadow-glow-gold' : 'bg-gradient-to-t from-laut-600/80 to-laut-400/80'}`}
                    style={{ height: `${Math.max(14, (t.toll / maxToll) * 100)}%` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 + i * 0.07 }}
                  />
                </div>
                <span className={`mt-1 text-[11px] font-semibold ${mine ? 'text-gold-300' : 'text-ink-300'}`}>
                  {mine ? 'Kamu!' : `${t.count} wisata`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <motion.p
        className={`mt-2.5 flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${winsNow ? 'border border-gold-400/50 bg-gold-400/15 text-gold-200' : 'bg-white/5 text-ink-200'}`}
        animate={winsNow ? { scale: [1, 1.03, 1] } : undefined}
        transition={winsNow ? { repeat: Infinity, duration: 1.4 } : undefined}
      >
        <Trophy size={15} className="mt-px shrink-0 text-gold-400" aria-hidden />
        {winsNow ? (
          <span>
            <b>Ini wisata terakhir!</b> Beli sekarang = langsung menang <b>Monopoli Wisata</b>! 🏆
          </span>
        ) : (
          <span>
            Kuasai semua <b>{all.length} destinasi wisata</b> = <b className="text-gold-300">Monopoli Wisata</b>, langsung
            menang!
          </span>
        )}
      </motion.p>

      <div className="mt-3 flex gap-2">
        <Stat
          label="Harga"
          tone="gold"
          value={
            <span className="flex items-baseline gap-1.5">
              {pending.discount && <s className="text-xs text-ink-400">{formatRp(baseCost, { short: true })}</s>}
              {formatRp(cost)}
            </span>
          }
        />
        <Stat
          label="Sisa uang setelah beli"
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
        <Button variant="glass" size="lg" silent onClick={skip} className={SKIP_BTN} aria-keyshortcuts="Escape">
          Lewati
        </Button>
        <Button
          variant="gold"
          size="lg"
          silent
          disabled={!canBuy}
          onClick={buy}
          className="min-w-0 flex-1 px-3"
          icon={<ShoppingBag size={20} strokeWidth={2.4} />}
          aria-keyshortcuts="Enter"
        >
          <ActionLabel verb="Beli" amount={formatRp(cost)} />
        </Button>
      </DialogActions>
    </DialogShell>
  );
}
