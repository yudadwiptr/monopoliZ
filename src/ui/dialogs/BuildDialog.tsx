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
    <DialogShell labelledBy={titleId} accent={tileColor(map, def)} className="sm:max-w-[28rem]">
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

      <div className="mt-2.5 flex items-baseline justify-between px-0.5">
        <p className="font-display text-sm font-semibold text-white">Upgrade gedung 🏗️</p>
        {lapLocked.length > 0 ? (
          <span className="flex items-center gap-1 text-[11px] text-ink-300">
            <Lock size={11} className="shrink-0" aria-hidden />
            {lapLocked.join(' & ')}: putaran 2
          </span>
        ) : (
          <span className="text-[11px] text-gold-300">🏛️ Hotel → Landmark</span>
        )}
      </div>
      <div className="mt-1.5">
        <LevelStepper options={options} selected={selected} onSelect={setSelected} label="Pilih level bangunan" />
      </div>

      <div className="mt-2.5 flex gap-2">
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
        <Button variant="glass" size="lg" silent onClick={skip} className={SKIP_BTN} aria-keyshortcuts="Escape">
          Lewati
        </Button>
        <Button
          variant="primary"
          size="lg"
          silent
          disabled={!choice}
          onClick={build}
          className="min-w-0 flex-1 px-3"
          icon={<Hammer size={20} strokeWidth={2.4} />}
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
    <DialogShell labelledBy={titleId} accent="#FFC21F" ring="#FFC21F">
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
        className="relative mt-3 overflow-hidden rounded-3xl border border-gold-300/60 bg-gradient-to-br from-gold-400/30 via-gold-600/10 to-ink-900/40 p-4"
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.1 }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['0%', '400%'] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
        />
        <div className="relative flex items-center gap-3">
          <motion.div
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-ink-950/50 ring-2 ring-gold-400/60"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <LevelArt level={LANDMARK_LEVEL} size={76} />
          </motion.div>
          <div className="min-w-0">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">Level Sultan</p>
            <p className="text-gradient-gold font-display text-3xl font-bold leading-tight">Landmark</p>
            <p className="mt-1 flex items-start gap-1 text-sm font-semibold text-white">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold-300" aria-hidden />
              Landmark tidak bisa diakuisisi &amp; sewa 4x!
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mt-3 flex gap-2">
        <Stat
          label="Sewa baru"
          tone="gold"
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
              {pending.discount && <s className="num text-ink-400">{formatRp(baseCost, { short: true })}</s>}{' '}
              <span className="num text-gold-200">{formatRp(cost)}</span>
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
          disabled={!canBuild}
          onClick={build}
          className="min-w-0 flex-1 px-3"
          aria-keyshortcuts="Enter"
          icon={<span aria-hidden>🏛️</span>}
        >
          <ActionLabel
            verb="Bangun Landmark"
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
