import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Dices, LifeBuoy, Wallet } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Button, type ButtonVariant } from '@/ui/common';
import { ISLAND_MAX_TURNS } from '@/engine/economy';
import { currentPlayer, mapOf } from '@/engine/selectors';
import { formatRp } from '@/lib/format';
import type { GameState } from '@/engine/types';
import { DialogShell } from './shared/DialogShell';
import { useActOnce, useDialogKeys } from './shared/hooks';
import { TOURIST_COLOR, findTileOfKind } from './shared/tileInfo';
import type { PendingOf } from './types';

export interface IslandDialogProps {
  game: GameState;
  pending: PendingOf<'island'>;
}

/** Stuck on the island corner (named per map, e.g. "Macet Total"): try doubles, pay, or use the card. */
export function IslandDialog({ game, pending }: IslandDialogProps) {
  const titleId = useId();
  const descId = useId();
  const act = useActOnce();
  const map = mapOf(game);
  const me = currentPlayer(game);
  const island = findTileOfKind(map, 'island');
  const name = island?.name ?? 'Pulau Terdampar';
  const icon = island?.icon ?? '🏝️';
  const lastTurn = pending.turnsLeft <= 1;
  const canPay = pending.canPay && me.cash >= pending.fee;

  const roll = () => act({ type: 'ROLL', power: Math.random() });
  useDialogKeys({ enter: roll });

  return (
    <DialogShell labelledBy={titleId} describedBy={descId} accent={TOURIST_COLOR}>
      <div className="flex items-center gap-3.5">
        <motion.div
          className="relative grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-[#2b1d12] bg-gradient-to-b from-[#bae6fd] to-[#38bdf8] shadow-[0_3px_0_#2b1d12]"
          animate={{ rotate: [-3, 3, -3], y: [0, -2, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          <img
            src="/icons/icon_pulau_terdampar.png"
            alt=""
            className="h-[84%] w-[84%] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="sr-only">{icon}</span>
        </motion.div>
        <div className="min-w-0">
          <span className="inline-block rounded-full border border-[#2b1d12] bg-[#38bdf8] px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-[0.14em] text-[#1e130c]">
            Terdampar!
          </span>
          <h2 id={titleId} className="mt-0.5 truncate font-display text-2xl font-black leading-tight text-[#2b1d12]">
            {name}
          </h2>
          <TurnsLeft left={pending.turnsLeft} />
        </div>
      </div>

      <p
        id={descId}
        className="mt-3 rounded-2xl border-2 border-[#8c6239] bg-[#fff8e7] px-3 py-2.5 text-sm font-medium leading-snug text-[#4a3525] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      >
        {lastTurn ? (
          <>
            <b className="font-extrabold text-[#2b1d12]">Giliran terakhir!</b> Lempar dadu — kembar atau nggak, kamu tetap bebas dan langsung jalan.
          </>
        ) : (
          <>
            Lempar <b className="font-extrabold text-[#2b1d12]">dadu kembar</b> buat kabur gratis, atau bayar biar langsung cabut. Kalau gagal, tunggu
            giliran berikutnya.
          </>
        )}
      </p>

      <div className="mt-3.5 flex flex-col gap-2.5">
        <Option
          variant="primary"
          icon={<Dices size={24} strokeWidth={2.2} />}
          title={lastTurn ? 'Lempar Dadu' : 'Coba Dadu Kembar'}
          sub={lastTurn ? 'Pasti bebas giliran ini' : 'Kembar = bebas & langsung jalan'}
          onClick={roll}
          shortcut="Enter"
          className="!border-2 !border-[#2b1d12] !shadow-[0_4px_0_#2b1d12]"
        />
        <Option
          variant="gold"
          icon={<Wallet size={22} strokeWidth={2.4} />}
          title={`Bayar ${formatRp(pending.fee)}`}
          sub={canPay ? 'Bebas sekarang, lalu lempar dadu' : 'Uangmu nggak cukup'}
          disabled={!canPay}
          onClick={() => act({ type: 'PAY_ESCAPE' })}
          className="!border-2 !border-[#2b1d12] !shadow-[0_4px_0_#2b1d12]"
        />
        {pending.hasCard && (
          <Option
            variant="glass"
            icon={<LifeBuoy size={22} strokeWidth={2.4} className="text-[#0369a1]" />}
            title="Pakai Kartu Bebas 🛟"
            sub="Gratis! Kartu langsung terpakai"
            onClick={() => act({ type: 'USE_ESCAPE_CARD' })}
            className="!border-2 !border-[#2b1d12] !bg-[#e0f2fe] !text-[#0c4a6e] hover:!bg-[#bae6fd] !shadow-[0_4px_0_#2b1d12]"
          />
        )}
      </div>
    </DialogShell>
  );
}

function TurnsLeft({ left }: { left: number }) {
  const total = Math.max(ISLAND_MAX_TURNS, left);
  return (
    <div className="mt-1 flex items-center gap-2" aria-label={`Sisa ${left} dari ${total} giliran`}>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <motion.span
            key={i}
            className={clsx(
              'h-2.5 w-2.5 rounded-full border border-[#2b1d12]',
              i < left ? 'bg-[#f59e0b]' : 'bg-[#d6c29f]',
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18, delay: 0.15 + i * 0.08 }}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-[#5c4028]">
        Sisa <span className="num font-black text-[#2b1d12]">{left}</span> giliran
      </span>
    </div>
  );
}

interface OptionProps {
  variant: ButtonVariant;
  icon: ReactNode;
  title: string;
  sub: string;
  onClick(): void;
  disabled?: boolean;
  shortcut?: string;
  className?: string;
}

/** Big two-line choice button. */
function Option({ variant, icon, title, sub, onClick, disabled, shortcut, className }: OptionProps) {
  return (
    <Button
      variant={variant}
      size="lg"
      block
      silent
      disabled={disabled}
      onClick={onClick}
      aria-keyshortcuts={shortcut}
      className={clsx('!h-16 justify-start px-4 text-left', className)}
      icon={icon}
    >
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-lg">{title}</span>
        <span className="truncate font-sans text-xs font-semibold opacity-80">{sub}</span>
      </span>
    </Button>
  );
}
