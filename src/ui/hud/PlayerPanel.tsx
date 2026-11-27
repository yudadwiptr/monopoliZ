import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Crown } from 'lucide-react';
import { useMemo } from 'react';
import { KEEP_CARD_INFO } from '@/data/cards';
import { getCharacter } from '@/data/characters';
import { propertyValue } from '@/engine/economy';
import type { KeepCard, MapDef } from '@/engine/types';
import { formatRp } from '@/lib/format';
import { useGame, type ViewTile } from '@/store/gameStore';
import { Money } from '@/ui/common';
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
  /** Which screen edge the panel hugs */
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

/**
 * Hand-drawn 2D medal colours matching `public/ui/hud_player_cards.webp`:
 * - 1st: Golden Amber Medal
 * - 2nd: Warm Gold-Bronze Medal
 * - 3rd: Copper-Terracotta Medal
 * - 4th: Emerald-Jade Medal
 */
const RANK_MEDAL_STYLE: Record<number, { bg: string; rim: string }> = {
  1: {
    bg: 'radial-gradient(circle at 35% 30%, #FFE07D 0%, #E09F24 68%, #A66B0B 100%)',
    rim: '#F9C851',
  },
  2: {
    bg: 'radial-gradient(circle at 35% 30%, #F7D97E 0%, #C9922C 68%, #8F6111 100%)',
    rim: '#EBC054',
  },
  3: {
    bg: 'radial-gradient(circle at 35% 30%, #E59A5C 0%, #B8652A 68%, #7D3E12 100%)',
    rim: '#D98243',
  },
  4: {
    bg: 'radial-gradient(circle at 35% 30%, #7ED97A 0%, #469E48 68%, #28692B 100%)',
    rim: '#62BF60',
  },
};

/**
 * 2D Hand-drawn card theme per player seat (P1..P4) sliced from `/ui/hud_player_cards.webp`:
 * - P1 (Kamu): Orange
 * - P2 (Mbak Sultan / Daeng Tajir): Navy & Wood
 * - P3 (Cak Borong): Purple
 * - P4 (Uda Saudagar): Green
 */
const SEAT_CARD_THEME: Record<
  number,
  {
    bgImg: string;
    fallbackBg: string;
    outerBorder: string;
  }
> = {
  0: {
    bgImg: "url('/ui/hud_card_p1.webp')",
    fallbackBg: 'linear-gradient(180deg, #E8842A 0%, #CE6C1A 100%)',
    outerBorder: '#4a3525',
  },
  1: {
    bgImg: "url('/ui/hud_card_p2.webp')",
    fallbackBg: 'linear-gradient(180deg, #1D334E 0%, #13243A 100%)',
    outerBorder: '#4a3525',
  },
  2: {
    bgImg: "url('/ui/hud_card_p3.webp')",
    fallbackBg: 'linear-gradient(180deg, #7F4B95 0%, #68397D 100%)',
    outerBorder: '#4a3525',
  },
  3: {
    bgImg: "url('/ui/hud_card_p4.webp')",
    fallbackBg: 'linear-gradient(180deg, #408A45 0%, #317236 100%)',
    outerBorder: '#4a3525',
  },
};

const COMIC_OUTLINE_SHADOW =
  '-1.5px -1.5px 0 #1e130c, 1.5px -1.5px 0 #1e130c, -1.5px 1.5px 0 #1e130c, 1.5px 1.5px 0 #1e130c, 0 2.5px 0 #1e130c';

/**
 * Circular 2D Rank Medal ("1st", "2nd", "3rd", "4th") overlapping the top-left of the avatar frame,
 * matching the hand-drawn medallion in `public/ui/hud_player_cards.webp`.
 */
function RankCornerBadge({ rank = 1, small = false }: { rank?: number; small?: boolean }) {
  const r = Math.max(1, Math.min(4, rank));
  const st = RANK_MEDAL_STYLE[r] ?? RANK_MEDAL_STYLE[4];
  const suf = RANK_SUFFIX[r] ?? 'th';
  return (
    <span
      aria-label={`Peringkat ${r}`}
      className={clsx(
        'pointer-events-none absolute -left-1.5 -top-1.5 z-20 flex items-center justify-center rounded-full border-2 border-[#23160d] font-display font-black leading-none text-white',
        small ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px] sm:h-7 sm:w-7 sm:text-[11px]',
      )}
      style={{
        background: st.bg,
        boxShadow: `inset 0 0 0 1.5px ${st.rim}, 0 2px 4px rgba(0,0,0,0.45)`,
        textShadow: '-1px -1px 0 #1e130c, 1px -1px 0 #1e130c, -1px 1px 0 #1e130c, 1px 1px 0 #1e130c',
      }}
    >
      {r}
      {suf}
    </span>
  );
}

/**
 * Golden circular 2D avatar frame with the player's 2D character sprite inside
 * and the rank medallion overlapping its top-left corner.
 */
function HudAvatarFrame({
  characterId,
  rank,
  size,
  active,
  dimmed,
  small,
}: {
  characterId: string;
  rank: number;
  size: number;
  active: boolean;
  dimmed: boolean;
  small?: boolean;
}) {
  const ch = getCharacter(characterId);
  return (
    <span className="relative shrink-0 select-none" style={{ width: size, height: size }}>
      <RankCornerBadge rank={rank} small={small} />
      {/* Outer golden-brass ring matching hud_player_cards.png */}
      <span
        className={clsx(
          'relative flex h-full w-full items-center justify-center rounded-full border-2 border-[#23160d] p-[3px]',
          dimmed && 'opacity-45 grayscale',
        )}
        style={{
          background: 'linear-gradient(145deg, #FCE38A 0%, #D99B26 55%, #9B640E 100%)',
          boxShadow: active
            ? '0 0 0 2px #FFE07D, 0 3px 6px rgba(0,0,0,0.5)'
            : 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 5px rgba(0,0,0,0.45)',
        }}
      >
        <span
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[1.5px] border-[#23160d]"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #475569 0%, #1E293B 100%)',
          }}
        >
          <img
            src={ch.sprite}
            alt={ch.name}
            draggable={false}
            className="pointer-events-none h-[136%] w-[136%] max-w-none translate-y-[13%] select-none object-contain object-top"
            style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))' }}
          />
        </span>
      </span>
    </span>
  );
}

/**
 * Floating "GILIRAN" scalloped orange badge sliced from `/ui/hud_player_cards.webp`
 * with a gentle pulse animation while it's this player's active turn.
 */
function TurnBadge({ small }: { small?: boolean }) {
  return (
    <motion.span
      className={clsx(
        'pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 select-none',
        small ? '-top-2.5 h-5 w-16' : '-top-3.5 h-6 w-20 sm:-top-4 sm:h-7 sm:w-24',
      )}
      initial={{ scale: 0, y: 6 }}
      animate={{ scale: [1, 1.06, 1], y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        y: { type: 'spring', stiffness: 500, damping: 20 },
      }}
    >
      <img
        src="/ui/hud_badge_giliran.webp"
        alt="GILIRAN"
        draggable={false}
        className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
      />
    </motion.span>
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
  if (chips.length === 0) return null;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-0.5" aria-hidden>
      {chips.map((c) => {
        const complete = c.owned === c.total;
        return (
          <span
            key={c.key}
            title={`${c.label} ${c.owned}/${c.total}`}
            className={clsx(
              'relative block rounded-[3px] border border-[#1e130c]',
              small ? 'h-2 w-2' : 'h-2.5 w-2.5',
              complete && 'ring-1 ring-gold-300',
            )}
            style={{ background: c.color, opacity: complete ? 1 : 0.6 + (0.4 * c.owned) / c.total }}
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
            'flex items-center justify-center rounded-md border border-[#1e130c] bg-black/35 leading-none',
            size === 'mini' ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-xs',
          )}
        >
          {KEEP_CARD_INFO[c].emoji}
        </span>
      ))}
    </span>
  );
}

function BankruptStamp({ small }: { small?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <motion.span
        className={clsx(
          'rounded-lg border-[3px] border-merah-500 bg-ink-950/85 font-display font-bold uppercase tracking-widest text-merah-400 shadow-glow-merah',
          small ? 'px-1 text-[11px]' : 'px-2.5 py-0.5 text-base',
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

/** Hand-drawn 2D House icon matching `hud_player_cards.png` */
function HouseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0 overflow-visible" aria-hidden>
      <polygon
        points="2,12 12,3 22,12"
        fill="#E04834"
        stroke="#1e130c"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="11.5"
        width="14"
        height="10"
        rx="1"
        fill="#F4F1E6"
        stroke="#1e130c"
        strokeWidth="2.4"
      />
      <rect x="9.5" y="14.5" width="5" height="7" fill="#9E5B30" stroke="#1e130c" strokeWidth="1.8" />
    </svg>
  );
}

/** Hand-drawn 2D Gold Coin + Green Cash Bills icon matching `hud_player_cards.png` */
function CoinCashIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 36 26" className="shrink-0 overflow-visible" aria-hidden>
      {/* Green cash bills behind coin */}
      <g transform="rotate(-14 22 12)">
        <rect x="13" y="4" width="20" height="12" rx="1.5" fill="#77B858" stroke="#1e130c" strokeWidth="2.2" />
        <circle cx="23" cy="10" r="3.2" fill="#98D47A" stroke="#1e130c" strokeWidth="1.5" />
      </g>
      <g transform="rotate(-4 23 15)">
        <rect x="14" y="8" width="20" height="11" rx="1.5" fill="#63A346" stroke="#1e130c" strokeWidth="2.2" />
      </g>
      {/* Gold coin in front */}
      <circle cx="11" cy="14" r="9.5" fill="#F7C331" stroke="#1e130c" strokeWidth="2.4" />
      <circle cx="11" cy="14" r="6.8" fill="none" stroke="#C98A14" strokeWidth="1.4" />
      <text
        x="11"
        y="17.5"
        textAnchor="middle"
        fill="#9E6208"
        fontFamily="Fredoka, sans-serif"
        fontWeight="900"
        fontSize="11"
      >
        $
      </text>
    </svg>
  );
}

/**
 * 2D Hand-Drawn Player Status HUD Card:
 * - Uses `/ui/hud_card_p1..p4.png` sliced from `public/ui/hud_player_cards.webp` by player seat order:
 *   P1 (Orange), P2 (Navy & Wood), P3 (Purple), P4 (Green).
 * - Floating pulsing orange `GILIRAN` badge (`/ui/hud_badge_giliran.webp`) at top-center on active turn.
 * - Overlapping `1st`–`4th` medallion at top-left of the golden circular avatar frame.
 * - Bold comic text with dark outline (`text-shadow`) for high contrast on all card colours.
 */
export function PlayerPanel({ playerId, size, onOpen, isYou, leader, rank = 1, className }: PlayerPanelProps) {
  const map = useMapDef();
  const players = useGame((s) => s.game?.players);
  const seatIndex = useMemo(() => {
    const idx = players?.findIndex((p) => p.id === playerId) ?? 0;
    return idx >= 0 ? idx % 4 : 0;
  }, [players, playerId]);
  const player = players?.find((p) => p.id === playerId);
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

  const theme = SEAT_CARD_THEME[seatIndex] ?? SEAT_CARD_THEME[0];
  const isActive = active && !bankrupt;
  const assets = bankrupt ? 0 : cash + stats.value;
  const mini = size === 'mini';
  const statusText = [
    bankrupt ? 'bangkrut' : null,
    isActive ? 'sedang giliran' : null,
    island > 0 ? `terdampar ${island} giliran` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const label = `${player.name}, peringkat ${rank}${player.isBot ? `, bot ${BOT_LEVEL_LABEL[player.botLevel]}` : ''}, kas ${formatRp(cash)}, total aset ${formatRp(assets)}, ${stats.count} properti${statusText ? `, ${statusText}` : ''}. Ketuk untuk detail.`;

  const avatarPx = mini ? 28 : size === 'full' ? 42 : 36;

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(playerId)}
      aria-label={label}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={clsx(
        'group relative flex w-full select-none items-center gap-2.5 overflow-visible rounded-[18px] border-[3px] border-[#4a3525] text-left outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-gold-300/70',
        mini ? 'px-2 py-1.5' : 'px-2.5 py-2 sm:px-3 sm:py-2.5',
        className,
      )}
      style={{
        backgroundImage: `${theme.bgImg}, ${theme.fallbackBg}`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        boxShadow: isActive
          ? '0 0 0 2.5px #FFE07D, 0 4px 0 #2b1d12, 0 12px 24px rgba(10,25,36,0.65)'
          : '0 4px 0 #2b1d12, 0 10px 20px rgba(10,25,36,0.48)',
      }}
    >
      {/* Floating pulsing "GILIRAN" badge at top-center of card */}
      <AnimatePresence>{isActive && <TurnBadge small={mini} />}</AnimatePresence>

      {/* Left: Golden circular avatar frame with 2D character sprite + top-left Rank Medal ("1st".."4th") */}
      <HudAvatarFrame
        characterId={player.characterId}
        rank={rank}
        size={avatarPx}
        active={isActive}
        dimmed={bankrupt}
        small={mini}
      />

      {/* Right: Bold dynamic player name, cash ("Rp 2 M"), house icon + property count ("🏠 0") */}
      <span className={clsx('min-w-0 flex-1 pr-2', bankrupt && 'opacity-45 grayscale')}>
        {/* Row 1: Player Name + Crown/Status + Coin & Cash Stack Icon */}
        <span className="flex items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1">
            <span
              className={clsx(
                'truncate font-display font-black leading-tight text-white',
                mini ? 'text-xs' : 'text-sm sm:text-base',
              )}
              style={{ textShadow: COMIC_OUTLINE_SHADOW }}
            >
              {player.name}
            </span>
            {leader && !bankrupt && (
              <Crown size={mini ? 12 : 14} className="shrink-0 fill-gold-400 text-gold-300 drop-shadow" aria-label="Paling tajir" />
            )}
            {isYou && !mini && (
              <span
                className="shrink-0 rounded-full border border-[#1e130c] bg-[#ffe074] px-1.5 py-px font-display text-[8px] font-black uppercase leading-none text-[#23160d]"
              >
                Kamu
              </span>
            )}
            {island > 0 && <span className="num shrink-0 text-[10px] leading-none">🏝️{island}</span>}
            {flight && !bankrupt && <span className="shrink-0 text-[10px] leading-none">✈️</span>}
          </span>
          <CoinCashIcon size={mini ? 18 : 22} />
        </span>

        {/* Row 2: Bold Golden Cash ("Rp 2 M") + Red-Roof House Icon ("🏠 0") + Property Chips */}
        <span className="mt-0.5 flex items-center gap-2">
          <span className="min-w-0 truncate" style={{ textShadow: COMIC_OUTLINE_SHADOW }}>
            <Money
              value={cash}
              className={clsx(
                'truncate font-display font-black leading-none text-[#FFD447]',
                mini ? 'text-sm' : 'text-base sm:text-xl',
              )}
            />
          </span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <HouseIcon size={mini ? 13 : 16} />
            <span
              className={clsx(
                'num font-display font-black leading-none text-[#FFD447]',
                mini ? 'text-xs' : 'text-sm sm:text-lg',
              )}
              style={{ textShadow: COMIC_OUTLINE_SHADOW }}
            >
              {stats.count}
            </span>
          </span>
          <span className="ml-auto flex min-w-0 items-center gap-0.5 overflow-hidden">
            <GroupSwatches chips={stats.chips} small />
            <KeptCards cards={cards} size="mini" />
          </span>
        </span>
      </span>

      {bankrupt && <BankruptStamp small={mini} />}
      <PanelPops playerId={playerId} small={mini} />
    </motion.button>
  );
}
