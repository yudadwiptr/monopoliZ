import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Crown } from 'lucide-react';
import { useMemo } from 'react';
import { KEEP_CARD_INFO } from '@/data/cards';
import { propertyValue } from '@/engine/economy';
import type { KeepCard, MapDef } from '@/engine/types';
import { formatRp } from '@/lib/format';
import { useGame, type ViewTile } from '@/store/gameStore';
import { Avatar, Money } from '@/ui/common';
import { BOT_LEVEL_LABEL, TOURIST_COLOR } from './labels';
import { useMapDef, useSettled } from './hooks';
import type { PanelSize } from './layout';
import { PanelPops } from './PanelPops';

export interface PlayerPanelProps {
  playerId: string;
  size: PanelSize;
  onOpen: (playerId: string) => void;
  /** Show a "KAMU" tag (single human game) */
  isYou?: boolean;
  leader?: boolean;
  className?: string;
  /** Which screen edge the panel hugs: the avatar sits on the outer side ('full' size only). */
  align?: 'left' | 'right';
}

interface GroupChip {
  key: string;
  color: string;
  owned: number;
  total: number;
  label: string;
}

function ownedGroups(map: MapDef, tiles: ViewTile[], playerId: string): GroupChip[] {
  const chips: GroupChip[] = [];
  map.groups.forEach((g) => {
    const idx = map.tiles.filter((t) => t.kind === 'city' && t.group === g.id).map((t) => t.index);
    const owned = idx.filter((i) => tiles[i]?.owner === playerId).length;
    if (owned > 0) chips.push({ key: `g${g.id}`, color: g.color, owned, total: idx.length, label: g.name });
  });
  const tour = map.tiles.filter((t) => t.kind === 'tourist').map((t) => t.index);
  const tOwned = tour.filter((i) => tiles[i]?.owner === playerId).length;
  if (tOwned > 0) chips.push({ key: 'tour', color: TOURIST_COLOR, owned: tOwned, total: tour.length, label: 'Wisata' });
  return chips;
}

function GroupSwatches({ chips, small }: { chips: GroupChip[]; small?: boolean }) {
  if (chips.length === 0) return small ? null : <span className="text-[11px] text-ink-400">Belum punya properti</span>;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1" aria-hidden>
      {chips.map((c) => {
        const complete = c.owned === c.total;
        return (
          <span
            key={c.key}
            title={`${c.label} ${c.owned}/${c.total}`}
            className={clsx(
              'relative block rounded-[4px] border border-black/30',
              small ? 'h-2.5 w-2.5' : 'h-3 w-3',
              complete && 'ring-2 ring-gold-300 ring-offset-1 ring-offset-ink-900',
            )}
            style={{ background: c.color, opacity: complete ? 1 : 0.45 + (0.55 * c.owned) / c.total }}
          />
        );
      })}
    </span>
  );
}

function KeptCards({ cards, size }: { cards: KeepCard[]; size: PanelSize }) {
  if (cards.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {cards.map((c) => (
        <span
          key={c}
          title={KEEP_CARD_INFO[c].name}
          aria-label={`Kartu ${KEEP_CARD_INFO[c].name}`}
          className={clsx(
            'flex items-center justify-center rounded-md border border-white/15 bg-white/10 leading-none',
            size === 'mini' ? 'h-4 w-4 text-[10px]' : 'h-6 w-6 text-sm',
          )}
        >
          {KEEP_CARD_INFO[c].emoji}
        </span>
      ))}
    </span>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border px-1.5 py-px font-display text-[10px] font-semibold uppercase leading-4 tracking-wide',
        className,
      )}
    >
      {children}
    </span>
  );
}

function TurnTag({ color, small }: { color: string; small?: boolean }) {
  return (
    <motion.span
      className={clsx(
        'absolute z-10 rounded-full font-display font-bold uppercase tracking-wider text-ink-950 shadow-lg',
        small ? '-top-2 left-1/2 -ml-[26px] w-[52px] text-center text-[9px] leading-4' : '-top-2.5 right-3 px-2 text-[11px] leading-5',
      )}
      style={{ background: color }}
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 18 }}
    >
      Giliran
    </motion.span>
  );
}

function BankruptStamp({ small }: { small?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <motion.span
        className={clsx(
          'rounded-lg border-[3px] border-merah-500 bg-ink-950/70 font-display font-bold uppercase tracking-widest text-merah-400 shadow-glow-merah',
          small ? 'px-1 text-[11px]' : 'px-2.5 py-0.5 text-xl',
        )}
        initial={{ scale: 2.6, opacity: 0, rotate: -24 }}
        animate={{ scale: 1, opacity: 1, rotate: -12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 16 }}
      >
        Bangkrut
      </motion.span>
    </span>
  );
}

/**
 * One player's HUD card. Tap to open their detail sheet.
 * Reads displayed values from `view` so numbers move in sync with the board animation.
 */
export function PlayerPanel({ playerId, size, onOpen, isYou, leader, className, align = 'left' }: PlayerPanelProps) {
  const map = useMapDef();
  const player = useGame((s) => s.game?.players.find((p) => p.id === playerId));
  const cash = useGame((s) => s.view?.cash[playerId] ?? 0);
  const bankrupt = useGame((s) => s.view?.bankrupt[playerId] ?? false);
  const island = useGame((s) => s.view?.islandTurns[playerId] ?? 0);
  const active = useGame((s) => s.view?.activePlayerId === playerId);
  const tiles = useGame((s) => s.view?.tiles);
  const busy = useGame((s) => s.busy);
  const cards = useSettled(player?.cards ?? [], !busy);
  const flight = useSettled(player?.pendingFlight ?? false, !busy);

  const stats = useMemo(() => {
    if (!map || !tiles) return { count: 0, value: 0, chips: [] as GroupChip[] };
    let count = 0;
    tiles.forEach((t) => {
      if (t.owner === playerId) count++;
    });
    return { count, value: propertyValue(map.tiles, tiles, playerId), chips: ownedGroups(map, tiles, playerId) };
  }, [map, tiles, playerId]);

  if (!player) return null;

  const color = player.color;
  const isActive = active && !bankrupt;
  const assets = bankrupt ? 0 : cash + stats.value;
  const mini = size === 'mini';
  const full = size === 'full';
  const statusText = [
    bankrupt ? 'bangkrut' : null,
    isActive ? 'sedang giliran' : null,
    island > 0 ? `terdampar ${island} giliran` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const label = `${player.name}${player.isBot ? `, bot ${BOT_LEVEL_LABEL[player.botLevel]}` : ''}, kas ${formatRp(cash)}, ${stats.count} properti${statusText ? `, ${statusText}` : ''}. Ketuk untuk detail.`;

  if (full) {
    // Slim corner strip: avatar on the outer edge, name row + big cash row. Details live in the sheet.
    const right = align === 'right';
    return (
      <motion.button
        type="button"
        onClick={() => onOpen(playerId)}
        aria-label={label}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={clsx(
          'group relative flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-ink-900/70 py-2 shadow-glass outline-none backdrop-blur-xl focus-visible:ring-4 focus-visible:ring-brand-300/60',
          right ? 'flex-row-reverse pl-3.5 pr-2 text-right' : 'pl-2 pr-3.5 text-left',
          className,
        )}
        style={isActive ? { borderColor: color } : undefined}
      >
        {isActive && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[inherit]"
            style={{ boxShadow: `0 0 0 2px ${color}, 0 0 22px ${color}77` }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <span
          aria-hidden
          className={clsx('absolute inset-y-3 w-1 rounded-full', right ? 'right-0' : 'left-0')}
          style={{ background: color, opacity: bankrupt ? 0.3 : 0.9 }}
        />
        <AnimatePresence>{isActive && <TurnTag color={color} />}</AnimatePresence>

        <Avatar characterId={player.characterId} size={44} active={isActive} dimmed={bankrupt} />
        <span className={clsx('min-w-0 flex-1', bankrupt && 'opacity-45 grayscale')}>
          <span className={clsx('flex items-center gap-1', right && 'flex-row-reverse')}>
            <span className="truncate font-display text-sm font-semibold leading-tight text-white">{player.name}</span>
            {leader && !bankrupt && <Crown size={13} className="shrink-0 fill-gold-400 text-gold-300" aria-label="Paling tajir" />}
            {player.isBot && (
              <span className="shrink-0 text-[11px] leading-none opacity-75" title={`Bot ${BOT_LEVEL_LABEL[player.botLevel]}`}>
                🤖
              </span>
            )}
            {isYou && (
              <span className="shrink-0 rounded-full bg-brand-500/35 px-1.5 font-display text-[9px] font-bold uppercase leading-4 text-brand-100">
                Kamu
              </span>
            )}
            {island > 0 && <span className="num shrink-0 text-[11px] leading-none text-laut-300">🏝️{island}</span>}
            {flight && !bankrupt && <span className="shrink-0 text-[11px] leading-none">✈️</span>}
          </span>
          <span className={clsx('mt-1 flex items-baseline gap-2', right && 'flex-row-reverse')}>
            <Money value={cash} className="whitespace-nowrap text-lg font-bold leading-none text-gold-300 sm:text-xl" />
            <span className="num shrink-0 text-[11px] leading-none text-ink-300">🏠{stats.count}</span>
            <span className={clsx('flex min-w-0 overflow-hidden', right ? 'mr-auto' : 'ml-auto')}>
              <KeptCards cards={cards} size="mini" />
            </span>
          </span>
        </span>

        {bankrupt && <BankruptStamp small />}
        <PanelPops playerId={playerId} small />
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(playerId)}
      aria-label={label}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={clsx(
        'glass group relative block w-full text-left outline-none focus-visible:ring-4 focus-visible:ring-brand-300/60',
        mini ? '!rounded-2xl px-1.5 pb-1 pt-1.5' : full ? 'p-3' : '!rounded-2xl p-2',
        className,
      )}
      style={isActive ? { borderColor: color } : undefined}
    >
      {isActive && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[inherit]"
          style={{ boxShadow: `0 0 0 2px ${color}, 0 0 26px ${color}88, inset 0 0 18px ${color}33` }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <AnimatePresence>{isActive && <TurnTag color={color} small={mini} />}</AnimatePresence>

      <span className={clsx('relative block', bankrupt && 'opacity-45 grayscale')}>
        {/* identity row */}
        <span className={clsx('flex items-center', mini ? 'gap-1' : 'gap-2')}>
          <Avatar characterId={player.characterId} size={mini ? 22 : full ? 46 : 34} active={isActive} dimmed={bankrupt} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span
                className={clsx(
                  'truncate font-display font-semibold text-white',
                  mini ? 'text-[11px] leading-tight' : full ? 'text-base' : 'text-sm',
                )}
              >
                {player.name}
              </span>
              {leader && !bankrupt && (
                <Crown size={mini ? 11 : 14} className="shrink-0 fill-gold-400 text-gold-300" aria-label="Paling tajir" />
              )}
            </span>
            {!mini && (
              <span className="mt-0.5 flex flex-wrap items-center gap-1">
                {player.isBot ? (
                  <Badge className="border-white/15 bg-white/10 text-ink-200">🤖 {BOT_LEVEL_LABEL[player.botLevel]}</Badge>
                ) : isYou ? (
                  <Badge className="border-brand-300/40 bg-brand-500/30 text-brand-200">Kamu</Badge>
                ) : null}
                {island > 0 && <Badge className="border-laut-400/40 bg-laut-500/20 text-laut-300">🏝️ {island}</Badge>}
                {flight && !bankrupt && <Badge className="border-brand-300/40 bg-brand-500/20 text-brand-200">✈️ Terbang</Badge>}
              </span>
            )}
          </span>
        </span>

        {/* cash */}
        <span className={clsx('block', mini ? 'mt-0.5' : full ? 'mt-2' : 'mt-1')}>
          <Money
            value={cash}
            className={clsx(
              'block truncate font-bold leading-tight text-gold-300',
              mini ? 'text-sm' : full ? 'text-[1.7rem]' : 'text-lg',
            )}
          />
        </span>

        {full && (
          <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-ink-300">
            <span className="truncate">
              Aset <span className="num font-semibold text-ink-100">{formatRp(assets)}</span>
            </span>
            <span className="num shrink-0 font-semibold text-ink-100">🏠 {stats.count}</span>
          </span>
        )}

        {/* footer: groups + cards */}
        {mini ? (
          <span className="mt-0.5 flex h-4 items-center gap-1 text-[10px] leading-none text-ink-200">
            <span className="num shrink-0">🏠{stats.count}</span>
            {island > 0 && <span className="num shrink-0 text-laut-300">🏝️{island}</span>}
            <span className="ml-auto flex min-w-0 overflow-hidden">
              <KeptCards cards={cards} size={size} />
            </span>
          </span>
        ) : (
          <span className={clsx('flex items-center justify-between gap-2', full ? 'mt-2 min-h-6' : 'mt-1 min-h-5')}>
            {full ? (
              <GroupSwatches chips={stats.chips} />
            ) : (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="num shrink-0 text-xs text-ink-200">🏠{stats.count}</span>
                <GroupSwatches chips={stats.chips} small />
              </span>
            )}
            <KeptCards cards={cards} size={size} />
          </span>
        )}
      </span>

      {bankrupt && <BankruptStamp small={mini} />}
      <PanelPops playerId={playerId} small={mini} />
    </motion.button>
  );
}
