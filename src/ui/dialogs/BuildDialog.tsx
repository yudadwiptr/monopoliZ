import { motion } from 'framer-motion';
import { Hammer, Lock, ShieldCheck } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button, Money } from '@/ui/common';
import {
  HOTEL_LEVEL,
  LANDMARK_LEVEL,
  LEVEL_NAMES,
  applyDiscount,
  cityToll,
  upgradeCost,
} from '@/engine/economy';
import { currentPlayer, mapOf } from '@/engine/selectors';
import { formatRp } from '@/lib/format';
import type { GameState, MapDef, PlayerState, TileDef } from '@/engine/types';
import { ActionLabel, DialogActions, DialogShell, SKIP_BTN } from './shared/DialogShell';
import { PropertyHeader, Pill } from './shared/PropertyHeader';
import { LevelStepper, type LevelOption } from './shared/LevelStepper';
import { LevelArt } from './shared/LevelArt';
import { Stat } from './shared/Stat';
import { useActOnce, useDialogKeys } from './shared/hooks';
import { tileColor } from './shared/tileInfo';
import type { PendingOf } from './types';

export interface BuildDialogProps {
  game: GameState;
  pending: PendingOf<'build'>;
}

interface InnerProps {
  map: MapDef;
  def: TileDef;
  me: PlayerState;
  pending: PendingOf<'build'>;
  festival: boolean;
}

/** Own city: upgrade buildings (or crown a hotel with a Landmark). */
export function BuildDialog({ game, pending }: BuildDialogProps) {
  const map = mapOf(game);
  const props: InnerProps = {
    map,
    def: map.tiles[pending.tile],
    me: currentPlayer(game),
    pending,
    festival: game.festivalTile === pending.tile,
  };
  return pending.fromLevel >= HOTEL_LEVEL ? <LandmarkBuild {...props} /> : <UpgradeBuild {...props} />;
}

function CurrentLevelPill({ level }: { level: number }) {
  return (
    <Pill className="pl-1">
      <LevelArt level={level} size={20} />
      {LEVEL_NAMES[level]}
    </Pill>
  );
}

function UpgradeBuild({ map, def, me, pending, festival }: InnerProps) {
  const titleId = useId();
  const act = useActOnce();
  const from = pending.fromLevel;

  const options = useMemo<LevelOption[]>(() => {
    const out: LevelOption[] = [];
    for (let level = from + 1; level <= LANDMARK_LEVEL; level++) {
      const baseCost = upgradeCost(def, from, level);
      const cost = applyDiscount(baseCost, pending.discount);
      const needsHotel = level === LANDMARK_LEVEL && from < HOTEL_LEVEL;
      const locked = needsHotel || level > pending.maxLevel;
      const poor = !locked && cost > me.cash;
      out.push({
        level,
        cost,
        baseCost,
        toll: cityToll(def, level),
        status: locked ? 'locked' : poor ? 'poor' : 'ok',
        reason: needsHotel ? 'Hotel dulu' : locked ? '1 putaran lagi' : poor ? 'Uang kurang' : undefined,
      });
    }
    return out;
  }, [def, from, pending.discount, pending.maxLevel, me.cash]);

  const best = [...options].reverse().find((o) => o.status === 'ok')?.level ?? null;
  const [selected, setSelected] = useState<number | null>(best);
  const choice = options.find((o) => o.level === selected && o.status === 'ok') ?? null;
  const tollNow = cityToll(def, from);

  const build = () => choice && act({ type: 'BUILD', level: choice.level });
  const skip = () => act({ type: 'SKIP' });
  useDialogKeys({ enter: choice ? build : undefined, escape: skip });

  const lapLocked = options.filter((o) => o.status === 'locked' && o.level <= HOTEL_LEVEL).map((o) => LEVEL_NAMES[o.level]);

  return (
    <DialogShell variant="parchment" labelledBy={titleId} accent={tileColor(map, def)}>
      <PropertyHeader
        map={map}
        def={def}
        titleId={titleId}
        badge={
          <>
            {pending.discount && <Pill tone="gold">🏷️ -50%</Pill>}
            <CurrentLevelPill level={from} />
          </>
        }
      />

      <div>
        <div className="flex items-baseline justify-between px-0.5">
          <p className="font-display text-xs font-extrabold text-[#2b1d12]">Upgrade gedung 🏗️</p>
          {lapLocked.length > 0 ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#6b4c30]">
              <Lock size={10} className="shrink-0" aria-hidden />
              {lapLocked.join(' & ')}: putaran 2
            </span>
          ) : (
            <span className="text-[10.5px] font-extrabold text-[#b45309]">🏛️ Hotel → Landmark</span>
          )}
        </div>
        <div className="mt-1">
          <LevelStepper options={options} selected={selected} onSelect={setSelected} label="Pilih level bangunan" />
        </div>
      </div>

      <div className="flex gap-2">
        <Stat
          label="Sewa baru"
          tone="daun"
          value={choice ? formatRp(choice.toll * (festival ? 2 : 1)) : '—'}
          hint={
            <>
              Sekarang <span className="num">{formatRp(tollNow * (festival ? 2 : 1))}</span>
              {festival && ' · 🎆 ×2'}
            </>
          }
        />
        <Stat
          label="Sisa uang"
          tone={choice && me.cash - choice.cost < 200 ? 'merah' : 'plain'}
          value={choice ? <Money value={me.cash - choice.cost} flash={false} /> : '—'}
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
          variant="primary"
          size="sm"
          silent
          disabled={!choice}
          onClick={build}
          className="!flex !h-10 min-w-0 !items-center !justify-center !gap-1.5 !border-2 !border-[#2b1d12] !px-2.5 !py-2 !text-[13px] !leading-[1.1] !shadow-[0_3px_0_#2b1d12] whitespace-nowrap"
          icon={<Hammer size={16} strokeWidth={2.5} />}
          aria-keyshortcuts="Enter"
        >
          <ActionLabel verb="Bangun" amount={choice ? formatRp(choice.cost) : undefined} />
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

function LandmarkBuild({ map, def, me, pending, festival }: InnerProps) {
  const titleId = useId();
  const act = useActOnce();
  const baseCost = upgradeCost(def, pending.fromLevel, LANDMARK_LEVEL);
  const cost = applyDiscount(baseCost, pending.discount);
  const canBuild = pending.maxLevel >= LANDMARK_LEVEL && cost <= me.cash;
  const mult = festival ? 2 : 1;
  const tollNow = cityToll(def, pending.fromLevel) * mult;
  const tollNew = cityToll(def, LANDMARK_LEVEL) * mult;

  const build = () => canBuild && act({ type: 'BUILD', level: LANDMARK_LEVEL });
  const skip = () => act({ type: 'SKIP' });
  useDialogKeys({ enter: canBuild ? build : undefined, escape: skip });

  return (
    <DialogShell variant="parchment" labelledBy={titleId} accent="#FFC21F" ring="#FFC21F">
      <PropertyHeader
        map={map}
        def={def}
        titleId={titleId}
        badge={
          <>
            {pending.discount && <Pill tone="gold">🏷️ -50%</Pill>}
            <CurrentLevelPill level={pending.fromLevel} />
          </>
        }
      />

      <motion.div
        className="relative overflow-hidden rounded-2xl border-2 border-[#b45309] bg-gradient-to-br from-[#fef3c7]/95 via-[#fde68a]/85 to-[#f59e0b]/25 p-2.5"
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.1 }}
      >
        <div className="relative flex items-center gap-2.5">
          <motion.div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-[#b45309] bg-[#fffdf7]"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <LevelArt level={LANDMARK_LEVEL} size={52} />
          </motion.div>
          <div className="min-w-0">
            <p className="font-display text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b45309]">Level Sultan</p>
            <p className="font-display text-xl font-black leading-tight text-[#1e130c]">Landmark</p>
            <p className="mt-0.5 flex items-start gap-1 text-xs font-bold text-[#2b1d12]">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#15803d]" aria-hidden />
              Kebal akuisisi &amp; sewa 4x!
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-2">
        <Stat
          label="Sewa baru"
          tone="daun"
          value={formatRp(tollNew)}
          hint={
            <>
              Hotel <span className="num">{formatRp(tollNow)}</span>
              {festival && ' · 🎆 ×2'}
            </>
          }
        />
        <Stat
          label="Sisa uang"
          tone={canBuild ? 'plain' : 'merah'}
          value={canBuild ? <Money value={me.cash - cost} flash={false} /> : 'Uang kurang'}
          hint={
            <>
              Biaya{' '}
              {pending.discount && <s className="num text-[#785a3c]">{formatRp(baseCost, { short: true })}</s>}{' '}
              <span className="num font-bold text-[#b45309]">{formatRp(cost)}</span>
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
          disabled={!canBuild}
          onClick={build}
          className="!flex !h-10 min-w-0 !items-center !justify-center !gap-1.5 !border-2 !border-[#2b1d12] !px-2.5 !py-2 !text-[13px] !leading-[1.1] !text-[#1e130c] !shadow-[0_3px_0_#2b1d12] whitespace-nowrap"
          aria-keyshortcuts="Enter"
          icon={<span aria-hidden>🏛️</span>}
        >
          <ActionLabel
            verb="Landmark"
            amount={
              <>
                {pending.discount && <s className="mr-1 opacity-60">{formatRp(baseCost, { short: true })}</s>}
                {formatRp(cost)}
              </>
            }
          />
        </Button>
      </DialogActions>
    </DialogShell>
  );
}
