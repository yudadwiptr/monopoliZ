import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Check, Skull, Sparkles, Store } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Avatar, Button, Money } from '@/ui/common';
import { LEVEL_NAMES, sellValue } from '@/engine/economy';
import { currentPlayer, mapOf, playerById, propertiesOf } from '@/engine/selectors';
import { formatRp } from '@/lib/format';
import { sfx } from '@/audio';
import { haptic } from '@/store/settingsStore';
import type { GameState, MapDef } from '@/engine/types';
import { ActionLabel, DialogShell, SKIP_BTN } from './shared/DialogShell';
import { LevelArt } from './shared/LevelArt';
import { Stat } from './shared/Stat';
import { useActOnce, useDialogKeys } from './shared/hooks';
import { DEBT_REASON, MERAH_COLOR, tileColor } from './shared/tileInfo';
import { autoSelect } from './raise/autoSelect';
import type { PendingOf } from './types';

export interface RaiseFundsDialogProps {
  game: GameState;
  pending: PendingOf<'raise_funds'>;
}

/** Not enough cash: sell properties to the bank (multi-select) or declare bankruptcy. Non-dismissable. */
export function RaiseFundsDialog({ game, pending }: RaiseFundsDialogProps) {
  const titleId = useId();
  const act = useActOnce();
  const map = mapOf(game);
  const me = currentPlayer(game);
  const creditor = playerById(game, pending.creditorId);
  const owned = useMemo(() => propertiesOf(game, me.id), [game, me.id]);
  const values = useMemo(() => {
    const v: Record<number, number> = {};
    owned.forEach((t) => (v[t] = sellValue(map.tiles[t], game.tiles[t]?.level ?? 0)));
    return v;
  }, [owned, map, game]);

  const [picked, setPicked] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const selected = picked.filter((t) => owned.includes(t));
  const selectedTotal = selected.reduce((s, t) => s + (values[t] ?? 0), 0);
  const needed = Math.max(0, pending.amount - me.cash);
  const covered = me.cash + selectedTotal;
  const shortfall = Math.max(0, pending.amount - covered);
  const enough = shortfall === 0;
  const ratio = pending.amount > 0 ? Math.min(1, covered / pending.amount) : 1;

  const toggle = (t: number) => {
    sfx.play('click', { volume: 0.6 });
    haptic(8);
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  };
  const auto = () => {
    sfx.play('coin_in', { volume: 0.5 });
    setPicked(autoSelect(game, map, me.id, owned, needed));
  };
  const sell = () => selected.length > 0 && act({ type: 'SELL', tiles: selected });
  const bankrupt = () => act({ type: 'BANKRUPT' });

  useDialogKeys({
    enter: confirming ? undefined : selected.length > 0 ? sell : undefined,
    escape: confirming ? () => setConfirming(false) : undefined,
  });

  return (
    <DialogShell labelledBy={titleId} accent={MERAH_COLOR} ring={MERAH_COLOR} className="sm:max-w-[28rem]">
      <div className="flex items-center gap-3">
        <motion.div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-[#2b1d12] bg-gradient-to-b from-merah-400 to-merah-600 text-3xl leading-none shadow-[0_3px_0_#2b1d12]"
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          💸
        </motion.div>
        <div className="min-w-0">
          <span className="inline-block rounded-full border border-[#2b1d12] bg-merah-500 px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-[0.14em] text-white">
            Darurat dompet
          </span>
          <h2 id={titleId} className="mt-0.5 font-display text-2xl font-black leading-tight text-[#2b1d12]">
            Uang kurang!
          </h2>
          <p className="flex flex-wrap items-center gap-1 text-xs font-semibold text-[#5c4028]">
            Harus {DEBT_REASON[pending.reason]} <b className="num font-black text-[#b91c1c]">{formatRp(pending.amount)}</b> ke
            {creditor ? (
              <span className="inline-flex items-center gap-1 font-extrabold text-[#2b1d12]">
                <Avatar characterId={creditor.characterId} size={16} ring={false} />
                {creditor.name}
              </span>
            ) : (
              <span className="font-extrabold text-[#2b1d12]">🏦 Bank</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Stat label="Tagihan" tone="merah" value={formatRp(pending.amount)} />
        <Stat label="Uang tunai" value={formatRp(me.cash)} />
        <Stat
          label={enough ? 'Status' : 'Kurang'}
          tone={enough ? 'daun' : 'merah'}
          value={enough ? 'Aman ✅' : <Money value={shortfall} flash={false} />}
        />
      </div>

      <div className="mt-3" aria-live="polite">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-[#5c4028]">
            Terkumpul <b className="num font-black text-[#2b1d12]">{formatRp(covered)}</b> /{' '}
            <span className="num font-bold">{formatRp(pending.amount)}</span>
          </span>
          <span className={clsx('font-extrabold', enough ? 'text-[#15803d]' : 'text-[#b91c1c]')}>
            {enough ? 'Cukup! Jual sekarang 👍' : `${Math.round(ratio * 100)}%`}
          </span>
        </div>
        <div
          className="relative mt-1.5 h-3.5 overflow-hidden rounded-full border-2 border-[#5c4028] bg-[#e2cba4]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={pending.amount}
          aria-valuenow={Math.min(covered, pending.amount)}
          aria-label="Dana terkumpul"
        >
          <motion.div
            className={clsx(
              'h-full w-full origin-left rounded-full',
              enough ? 'bg-gradient-to-r from-daun-600 to-daun-400' : 'bg-gradient-to-r from-merah-600 via-merah-400 to-gold-400',
            )}
            initial={false}
            animate={{ scaleX: ratio }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          />
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <p className="font-display text-sm font-black text-[#2b1d12]">
          Jual ke bank <span className="font-bold text-[#6e5239]">(50% nilai)</span>
        </p>
        <Button
          variant="glass"
          size="sm"
          silent
          onClick={auto}
          disabled={owned.length === 0 || confirming}
          icon={<Sparkles size={15} className="text-[#b45309]" />}
          className="h-9 shrink-0 !border-2 !border-[#5c4028] !bg-[#fff8e7] !font-extrabold !text-[#2b1d12] !shadow-[0_2px_0_#5c4028] hover:!bg-[#fef3c7]"
        >
          Pilih Otomatis
        </Button>
      </div>

      <ul className="scrollbar-thin mt-2 max-h-[30dvh] space-y-1.5 overflow-y-auto pr-0.5 sm:max-h-[15.5rem]" aria-label="Propertimu">
        {owned.length === 0 && (
          <li className="rounded-2xl border-2 border-[#c8a97e] bg-[#fff8e7] px-3 py-4 text-center text-sm font-semibold text-[#5c4028]">
            Tidak ada properti untuk dijual.
          </li>
        )}
        {owned.map((t, i) => (
          <PropertyRow
            key={t}
            tile={t}
            index={i}
            map={map}
            game={game}
            value={values[t] ?? 0}
            selected={selected.includes(t)}
            disabled={confirming}
            onToggle={toggle}
          />
        ))}
      </ul>

      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div
            key="confirm"
            className="mt-4 rounded-2xl border-2 border-[#b91c1c] bg-[#fee2e2] p-3"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 480, damping: 30 }}
            role="alertdialog"
            aria-label="Konfirmasi bangkrut"
          >
            <p className="text-sm font-semibold text-[#7f1d1d]">
              <b className="font-black">Yakin nyerah?</b> Semua uang &amp; propertimu diserahkan, dan kamu keluar dari permainan. 💀
            </p>
            <div className="mt-3 flex gap-2.5">
              <Button
                variant="glass"
                size="md"
                silent
                onClick={() => setConfirming(false)}
                className="flex-1 !border-2 !border-[#5c4028] !bg-[#fff8e7] !font-extrabold !text-[#2b1d12] !shadow-[0_3px_0_#5c4028]"
                autoFocus
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="md"
                silent
                onClick={bankrupt}
                className="flex-1 !border-2 !border-[#2b1d12] !shadow-[0_3px_0_#2b1d12]"
                icon={<Skull size={18} strokeWidth={2.4} />}
              >
                Ya, bangkrut
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            className="mt-4 flex items-stretch gap-2.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <Button
              variant="danger"
              size="lg"
              onClick={() => setConfirming(true)}
              className="!h-12 shrink-0 !border-2 !border-[#2b1d12] !px-3.5 !text-sm !shadow-[0_4px_0_#2b1d12]"
              icon={<Skull size={18} strokeWidth={2.4} />}
            >
              Bangkrut
            </Button>
            <Button
              variant="gold"
              size="lg"
              silent
              disabled={selected.length === 0}
              onClick={sell}
              className="!h-12 min-w-0 flex-1 !border-2 !border-[#2b1d12] px-3 !shadow-[0_4px_0_#2b1d12]"
              icon={<Store size={20} strokeWidth={2.4} />}
              aria-keyshortcuts="Enter"
            >
              <ActionLabel
                verb={selected.length > 0 ? `Jual (${selected.length})` : 'Jual'}
                amount={selected.length > 0 ? `+${formatRp(selectedTotal)}` : 'pilih properti'}
              />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {!confirming && selected.length > 0 && !enough && (
        <p className="mt-2 text-center text-[11px] font-bold text-[#5c4028]">
          Belum cukup — masih kurang <span className="num font-black text-[#b91c1c]">{formatRp(shortfall)}</span>, tapi boleh dijual dulu.
        </p>
      )}
    </DialogShell>
  );
}

interface PropertyRowProps {
  tile: number;
  index: number;
  map: MapDef;
  game: GameState;
  value: number;
  selected: boolean;
  disabled: boolean;
  onToggle(tile: number): void;
}

function PropertyRow({ tile, index, map, game, value, selected, disabled, onToggle }: PropertyRowProps) {
  const def = map.tiles[tile];
  const level = game.tiles[tile]?.level ?? 0;
  const festival = game.festivalTile === tile;
  const levelLabel = def.kind === 'city' ? LEVEL_NAMES[level] : 'Wisata';
  return (
    <li>
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={`${def.name}, ${levelLabel}${festival ? ', lokasi pesta' : ''}: jual ${formatRp(value)}`}
        disabled={disabled}
        onClick={() => onToggle(tile)}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32, delay: Math.min(index, 10) * 0.03 }}
        whileTap={{ scale: 0.98 }}
        className={clsx(
          'relative flex min-h-[3.5rem] w-full items-center gap-3 overflow-hidden rounded-2xl border-2 py-2 pl-4 pr-3 text-left outline-none transition-colors',
          'focus-visible:ring-4 focus-visible:ring-amber-500/50 disabled:opacity-50',
          selected
            ? 'border-[#d97706] bg-[#fef3c7] shadow-[0_2px_0_#b45309]'
            : 'border-[#c8a97e] bg-[#fff8e7] hover:border-[#8c6239] hover:bg-[#fef3c7]/60',
        )}
      >
        <span className="absolute inset-y-0 left-0 w-2" style={{ background: tileColor(map, def) }} aria-hidden />
        <span className="text-2xl leading-none" aria-hidden>
          {def.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-black leading-tight text-[#2b1d12]">
            {def.name}
            {festival && <span aria-hidden> 🎆</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-[#5c4028]">
            {def.kind === 'city' ? <LevelArt level={level} size={16} /> : <span aria-hidden>🏝️</span>}
            {levelLabel}
          </span>
        </span>
        <span className="num shrink-0 text-sm font-black text-[#15803d]">+{formatRp(value)}</span>
        <span
          className={clsx(
            'grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors',
            selected ? 'border-[#2b1d12] bg-[#f59e0b] text-[#2b1d12]' : 'border-[#8c6239] bg-[#f5e6c8]',
          )}
          aria-hidden
        >
          <AnimatePresence>
            {selected && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 700, damping: 20 }}>
                <Check size={14} strokeWidth={3.4} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </li>
  );
}
