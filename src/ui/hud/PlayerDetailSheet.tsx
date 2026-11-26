import { motion } from 'framer-motion';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { KEEP_CARD_INFO } from '@/data/cards';
import { LANDMARK_LEVEL, LEVEL_ICONS, LEVEL_NAMES, propertyValue, tollAt } from '@/engine/economy';
import { monopolyStatus } from '@/engine/selectors';
import type { MapDef, TileDef } from '@/engine/types';
import { formatRp } from '@/lib/format';
import { useGame, type ViewTile } from '@/store/gameStore';
import { Avatar, Button, Modal, Money } from '@/ui/common';
import { BOT_LEVEL_LABEL, SIDE_LABEL, TOURIST_COLOR } from './labels';
import { useMapDef } from './hooks';

export interface PlayerDetailSheetProps {
  playerId: string | null;
  onClose: () => void;
}

interface PropertyGroup {
  key: string;
  name: string;
  color: string;
  total: number;
  tiles: TileDef[];
}

function groupProperties(map: MapDef, tiles: ViewTile[], playerId: string): PropertyGroup[] {
  const out: PropertyGroup[] = [];
  map.groups.forEach((g) => {
    const all = map.tiles.filter((t) => t.kind === 'city' && t.group === g.id);
    const mine = all.filter((t) => tiles[t.index]?.owner === playerId);
    if (mine.length) out.push({ key: `g${g.id}`, name: g.name, color: g.color, total: all.length, tiles: mine });
  });
  const tour = map.tiles.filter((t) => t.kind === 'tourist');
  const mine = tour.filter((t) => tiles[t.index]?.owner === playerId);
  if (mine.length) out.push({ key: 'tour', name: 'Destinasi Wisata', color: TOURIST_COLOR, total: tour.length, tiles: mine });
  return out;
}

function Segments({ owned, total, color, hot }: { owned: number; total: number; color: string; hot: boolean }) {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className="block h-3 flex-1 rounded-full border border-[#5c4028]"
          style={{ background: i < owned ? color : '#e2cba4' }}
          initial={{ scaleX: 0 }}
          animate={i < owned && hot ? { scaleX: 1, opacity: [1, 0.55, 1] } : { scaleX: 1 }}
          transition={{
            scaleX: { delay: 0.05 * i, type: 'spring', stiffness: 300, damping: 22 },
            opacity: { duration: 1.1, repeat: Infinity },
          }}
        />
      ))}
    </div>
  );
}

function ProgressRow({ label, sub, owned, total, color }: { label: string; sub?: string; owned: number; total: number; color: string }) {
  const hot = total > 0 && total - owned === 1;
  const done = total > 0 && owned >= total;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-display font-extrabold text-[#2b1d12]">
          {label}
          {sub && <span className="ml-1.5 text-xs font-bold text-[#6e5239]">{sub}</span>}
        </span>
        <span className={clsx('num text-sm font-black', done ? 'text-[#b45309]' : hot ? 'text-[#b91c1c]' : 'text-[#4a3525]')}>
          {hot && <span className="mr-1.5 text-[11px] uppercase tracking-wide">1 lagi!</span>}
          {owned}/{total}
        </span>
      </div>
      <Segments owned={owned} total={total} color={color} hot={hot} />
    </div>
  );
}

/** Bottom sheet with a player's properties, kept cards and monopoly progress (2D Parchment & Wood theme). */
export function PlayerDetailSheet({ playerId, onClose }: PlayerDetailSheetProps) {
  const map = useMapDef();
  const player = useGame((s) => (playerId ? s.game?.players.find((p) => p.id === playerId) : undefined));
  const tiles = useGame((s) => s.view?.tiles);
  const festivalTile = useGame((s) => s.view?.festivalTile ?? null);
  const cash = useGame((s) => (playerId ? s.view?.cash[playerId] ?? 0 : 0));
  const bankrupt = useGame((s) => (playerId ? s.view?.bankrupt[playerId] ?? false : false));
  const island = useGame((s) => (playerId ? s.view?.islandTurns[playerId] ?? 0 : 0));

  const data = useMemo(() => {
    if (!map || !tiles || !playerId) return null;
    const status = monopolyStatus(map, tiles, playerId);
    const bestJalur = status.jalur.reduce((a, b) => (b.owned > a.owned ? b : a), status.jalur[0]);
    return {
      status,
      bestJalur,
      groups: groupProperties(map, tiles, playerId),
      value: propertyValue(map.tiles, tiles, playerId),
    };
  }, [map, tiles, playerId]);

  const open = !!playerId && !!player && !!data;
  const titleId = 'hud-player-detail-title';

  return (
    <Modal open={open} onClose={onClose} placement="bottom" labelledBy={titleId} accent={player?.color} className="!max-w-lg">
      {player && data && map && tiles && (
        <div data-hud-sheet className="-m-4 flex max-h-[80dvh] flex-col text-[#2b1d12] sm:-m-5">
          {/* header */}
          <div className="flex items-center gap-3 border-b-2 border-[#c8a97e] bg-[#ebd4a9]/55 px-5 pb-3.5 pt-4">
            <Avatar characterId={player.characterId} size={56} dimmed={bankrupt} />
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate font-display text-2xl font-black text-[#2b1d12]">
                {player.name}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-extrabold">
                <span
                  className="rounded-full border border-[#2b1d12] px-2.5 py-0.5 text-[#1e130c]"
                  style={{ background: player.color }}
                >
                  {player.isBot ? `🤖 Bot ${BOT_LEVEL_LABEL[player.botLevel]}` : '🎮 Pemain'}
                </span>
                {bankrupt && (
                  <span className="rounded-full border border-[#b91c1c] bg-[#fee2e2] px-2 py-0.5 text-[#991b1b]">
                    💀 Bangkrut
                  </span>
                )}
                {island > 0 && (
                  <span className="rounded-full border border-[#0369a1] bg-[#e0f2fe] px-2 py-0.5 text-[#075985]">
                    🏝️ Terdampar {island} giliran
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#2b1d12] bg-[#4a3525] text-[#f6eedc] shadow-[0_2px_0_#2b1d12] transition-transform hover:scale-105 active:scale-95"
            >
              <X size={20} strokeWidth={2.6} aria-hidden />
            </button>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-4">
            {/* stats */}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Kas">
                <Money value={cash} className="text-lg font-black text-[#b45309]" />
              </Stat>
              <Stat label="Total aset">
                <span className="num text-lg font-black text-[#2b1d12]">{formatRp(bankrupt ? 0 : cash + data.value)}</span>
              </Stat>
              <Stat label="Properti">
                <span className="num text-lg font-black text-[#1d4ed8]">
                  {data.groups.reduce((n, g) => n + g.tiles.length, 0)}
                </span>
              </Stat>
            </div>

            {/* kept cards */}
            <section aria-label="Kartu simpanan">
              <h3 className="mb-1.5 font-display text-xs font-black uppercase tracking-wider text-[#5c4028]">
                Kartu simpanan
              </h3>
              {player.cards.length === 0 ? (
                <p className="text-sm font-semibold text-[#6e5239]">Belum ada kartu. Coba peruntungan di Kartu Rezeki!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {player.cards.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1.5 rounded-xl border-2 border-[#8c6239] bg-[#fff8e7] px-2.5 py-1.5 text-sm font-extrabold text-[#2b1d12] shadow-[0_2px_0_rgba(140,98,57,0.3)]"
                    >
                      <span className="text-lg leading-none">{KEEP_CARD_INFO[c].emoji}</span>
                      {KEEP_CARD_INFO[c].name}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* monopoly progress */}
            <section
              aria-label="Progres monopoli"
              className="space-y-3 rounded-2xl border-2 border-[#8c6239] bg-[#fff8e7] p-3.5 shadow-[0_2px_0_rgba(140,98,57,0.25)]"
            >
              <h3 className="font-display text-xs font-black uppercase tracking-wider text-[#5c4028]">
                Jalan menuju monopoli
              </h3>
              <ProgressRow
                label="Monopoli Wisata"
                owned={data.status.wisata.owned}
                total={data.status.wisata.total}
                color={TOURIST_COLOR}
              />
              <ProgressRow
                label="Monopoli Jalur"
                sub={data.bestJalur.owned > 0 ? SIDE_LABEL[data.bestJalur.side] : undefined}
                owned={data.bestJalur.owned}
                total={data.bestJalur.total}
                color="#3A8CD6"
              />
              <ProgressRow
                label="Triple Warna"
                sub="grup warna komplet"
                owned={Math.min(data.status.warna.completeGroups.length, data.status.warna.needed)}
                total={data.status.warna.needed}
                color="#F59E0B"
              />
            </section>

            {/* properties */}
            <section aria-label="Daftar properti">
              <h3 className="mb-2 font-display text-xs font-black uppercase tracking-wider text-[#5c4028]">Properti</h3>
              {data.groups.length === 0 ? (
                <p className="text-sm font-semibold text-[#6e5239]">
                  {bankrupt ? 'Semua aset sudah disita bank.' : 'Belum punya properti. Gas beli kota pertamamu!'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.groups.map((g) => (
                    <div
                      key={g.key}
                      className="overflow-hidden rounded-2xl border-2 border-[#8c6239] bg-[#fff8e7] shadow-[0_2px_0_rgba(140,98,57,0.25)]"
                    >
                      <div
                        className="flex items-center gap-2 border-b border-[#c8a97e] px-3 py-1.5"
                        style={{ background: `${g.color}33` }}
                      >
                        <span className="h-3.5 w-3.5 rounded-[4px] border border-[#2b1d12]" style={{ background: g.color }} aria-hidden />
                        <span className="flex-1 truncate font-display text-sm font-black text-[#2b1d12]">{g.name}</span>
                        <span
                          className={clsx(
                            'num text-xs font-black',
                            g.tiles.length === g.total ? 'text-[#b45309]' : 'text-[#5c4028]',
                          )}
                        >
                          {g.tiles.length === g.total ? '✓ Komplet' : `${g.tiles.length}/${g.total}`}
                        </span>
                      </div>
                      <ul className="divide-y divide-[#e2cba4]">
                        {g.tiles.map((t) => {
                          const level = tiles[t.index]?.level ?? 0;
                          const toll = tollAt(map.tiles, tiles, t.index, festivalTile);
                          return (
                            <li key={t.index} className="flex items-center gap-2.5 px-3 py-2">
                              <span className="text-xl leading-none" aria-hidden>
                                {t.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-extrabold text-[#2b1d12]">
                                  {t.name}
                                  {festivalTile === t.index && (
                                    <span className="ml-1.5 text-xs font-black text-[#b45309]">🎆 Pesta ×2</span>
                                  )}
                                </span>
                                <span className="block text-xs font-bold text-[#5c4028]">
                                  {t.kind === 'city' ? (
                                    <>
                                      <span aria-hidden>{LEVEL_ICONS[level]}</span>{' '}
                                      <span className={level === LANDMARK_LEVEL ? 'font-black text-[#b45309]' : undefined}>
                                        {LEVEL_NAMES[level]}
                                      </span>
                                    </>
                                  ) : (
                                    'Wisata'
                                  )}
                                </span>
                              </span>
                              <span className="text-right">
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-[#6e5239]">Sewa</span>
                                <span className="num block text-sm font-black text-[#b45309]">{formatRp(toll)}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-[#8c6239] bg-[#fff8e7] px-3 py-2 shadow-[0_2px_0_rgba(140,98,57,0.25)]">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#5c4028]">{label}</div>
      <div className="truncate">{children}</div>
    </div>
  );
}
