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
  /** 1..4 standing rank */
  rank?: number;
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

const RANK_SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' };

const RANK_BADGE_STYLE: Record<number, { bg: string; border: string; text: string }> = {
  1: {
    bg: 'linear-gradient(180deg, #FFD35C 0%, #D97706 100%)',
    border: '#FEF08A',
    text: '#1E1B4B',
  },
  2: {
    bg: 'linear-gradient(180deg, #93C5FD 0%, #2563EB 100%)',
    border: '#DBEAFE',
    text: '#FFFFFF',
  },
  3: {
    bg: 'linear-gradient(180deg, #F472B6 0%, #BE185D 100%)',
    border: '#FCE7F3',
    text: '#FFFFFF',
  },
  4: {
    bg: 'linear-gradient(180deg, #64748B 0%, #334155 100%)',
    border: '#94A3B8',
    text: '#F1F5F9',
  },
};

/** Compact corner rank badge pinned to the avatar corner — takes zero horizontal width away from the panel text. */
function RankCornerBadge({ rank = 1, align = 'left' }: { rank?: number; align?: 'left' | 'right' }) {
  const r = Math.max(1, Math.min(4, rank));
  const st = RANK_BADGE_STYLE[r] ?? RANK_BADGE_STYLE[4];
  const suf = RANK_SUFFIX[r] ?? 'th';
  return (
    <span
      aria-label={`Peringkat ${r}`}
      className={clsx(
        'pointer-events-none absolute -top-1.5 z-10 flex h-4 min-w-[22px] items-center justify-center rounded-full border px-1 font-display text-[9px] font-black leading-none shadow-md',
        align === 'right' ? '-right-1' : '-left-1',
      )}
      style={{
        background: st.bg,
        borderColor: st.border,
        color: st.text,
      }}
    >
      {r}
      {suf}
    </span>
  );
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
    <span className="flex min-w-0 flex-wrap items-center gap-0.5" aria-hidden>
      {chips.map((c) => {
        const complete = c.owned === c.total;
        return (
          <span
            key={c.key}
            title={`${c.label} ${c.owned}/${c.total}`}
            className={clsx(
              'relative block rounded-[3px] border border-black/40',
              small ? 'h-2 w-2' : 'h-2.5 w-2.5',
              complete && 'ring-1 ring-gold-300',
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
            size === 'mini' ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-xs',
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

function TurnTag({ color, small, align = 'left' }: { color: string; small?: boolean; align?: 'left' | 'right' }) {
  return (
    <motion.span
      className={clsx(
        'absolute z-10 rounded-full font-display font-bold uppercase tracking-wider text-ink-950 shadow-lg',
        small
          ? '-top-2 left-1/2 -ml-[26px] w-[52px] text-center text-[9px] leading-4'
          : clsx('-top-2 px-2 text-[10px] leading-4', align === 'right' ? 'left-2.5' : 'right-2.5'),
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
          'rounded-lg border-[3px] border-merah-500 bg-ink-950/75 font-display font-bold uppercase tracking-widest text-merah-400 shadow-glow-merah',
          small ? 'px-1 text-[11px]' : 'px-2.5 py-0.5 text-lg',
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
 * One player's HUD card. Spacious and clean on both mobile portrait and landscape:
 * - Avatar sits on the outer edge with a compact corner rank badge (1st..4th) that takes zero text width.
 * - Middle area has full horizontal space for Player Name + big Cash row + property count & color chips.
 */
export function PlayerPanel({ playerId, size, onOpen, isYou, leader, rank = 1, className, align = 'left' }: PlayerPanelProps) {
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

  const label = `${player.name}, peringkat ${rank}${player.isBot ? `, bot ${BOT_LEVEL_LABEL[player.botLevel]}` : ''}, kas ${formatRp(cash)}, total aset ${formatRp(assets)}, ${stats.count} properti${statusText ? `, ${statusText}` : ''}. Ketuk untuk detail.`;

  if (full) {
    const right = align === 'right';
    return (
      <motion.button
        type="button"
        onClick={() => onOpen(playerId)}
        aria-label={label}
        whileHover={{ y: -1.5 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={clsx(
          'group relative flex w-full items-center gap-2 rounded-2xl border bg-ink-900/85 py-1.5 shadow-glass outline-none focus-visible:ring-4 focus-visible:ring-brand-300/60',
          right ? 'flex-row-reverse pl-2.5 pr-2 text-right' : 'pl-2 pr-2.5 text-left',
          className,
        )}
        style={{
          borderColor: isActive ? color : 'rgba(255,255,255,0.12)',
          boxShadow: isActive
            ? `0 0 0 1.5px ${color}, 0 0 18px ${color}66, 0 6px 16px rgba(0,0,0,0.65)`
            : undefined,
        }}
      >
        <span
          aria-hidden
          className={clsx('absolute inset-y-2.5 w-1 rounded-full', right ? 'right-0' : 'left-0')}
          style={{ background: color, opacity: bankrupt ? 0.3 : 0.9 }}
        />
        <AnimatePresence>{isActive && <TurnTag color={color} align={align} />}</AnimatePresence>

        {/* Outer Portrait + Compact Corner Rank Badge (takes 0px horizontal width from text!) */}
        <span className="relative shrink-0">
          <RankCornerBadge rank={rank} align={align} />
          <Avatar characterId={player.characterId} size={38} active={isActive} dimmed={bankrupt} />
        </span>

        {/* Spacious Info Block */}
        <span className={clsx('min-w-0 flex-1', bankrupt && 'opacity-45 grayscale')}>
          <span className={clsx('flex items-center gap-1', right && 'flex-row-reverse')}>
            <span className="truncate font-display text-xs font-bold leading-tight text-white sm:text-sm">
              {player.name}
            </span>
            {leader && !bankrupt && <Crown size={12} className="shrink-0 fill-gold-400 text-gold-300" aria-label="Paling tajir" />}
            {isYou && (
              <span className="shrink-0 rounded-full bg-brand-500/35 px-1.5 font-display text-[8px] font-bold uppercase leading-3.5 text-brand-100">
                Kamu
              </span>
            )}
            {island > 0 && <span className="num shrink-0 text-[10px] leading-none text-laut-300">🏝️{island}</span>}
            {flight && !bankrupt && <span className="shrink-0 text-[10px] leading-none">✈️</span>}
          </span>

          <span className={clsx('mt-0.5 flex items-baseline gap-1.5', right && 'flex-row-reverse')}>
            <Money value={cash} className="truncate text-sm font-extrabold leading-none text-gold-300 sm:text-lg" />
            <span className="num shrink-0 text-[10px] leading-none text-ink-300">🏠{stats.count}</span>
            <span className={clsx('flex min-w-0 items-center gap-0.5 overflow-hidden', right ? 'mr-auto' : 'ml-auto')}>
              <GroupSwatches chips={stats.chips} small />
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
        mini ? '!rounded-2xl px-1.5 pb-1 pt-1.5' : '!rounded-2xl p-2',
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
        <span className={clsx('flex items-center', mini ? 'gap-1' : 'gap-2')}>
          <span className="relative shrink-0">
            <RankCornerBadge rank={rank} />
            <Avatar characterId={player.characterId} size={mini ? 22 : 34} active={isActive} dimmed={bankrupt} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className={clsx('truncate font-display font-semibold text-white', mini ? 'text-[11px] leading-tight' : 'text-sm')}>
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

        <span className={clsx('block', mini ? 'mt-0.5' : 'mt-1')}>
          <Money value={cash} className={clsx('block truncate font-bold leading-tight text-gold-300', mini ? 'text-sm' : 'text-lg')} />
        </span>

        {mini ? (
          <span className="mt-0.5 flex h-4 items-center gap-1 text-[10px] leading-none text-ink-200">
            <span className="num shrink-0">🏠{stats.count}</span>
            {island > 0 && <span className="num shrink-0 text-laut-300">🏝️{island}</span>}
            <span className="ml-auto flex min-w-0 overflow-hidden">
              <KeptCards cards={cards} size={size} />
            </span>
          </span>
        ) : (
          <span className="mt-1 flex min-h-5 items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="num shrink-0 text-xs text-ink-200">🏠{stats.count}</span>
              <GroupSwatches chips={stats.chips} small />
            </span>
            <KeptCards cards={cards} size={size} />
          </span>
        )}
      </span>

      {bankrupt && <BankruptStamp small={mini} />}
      <PanelPops playerId={playerId} small={mini} />
    </motion.button>
  );
}
