import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import clsx from 'clsx';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_SALARY,
  ISLAND_ESCAPE_FEE,
  ISLAND_MAX_TURNS,
  LANDMARK_LEVEL,
  LEVEL_ICONS,
  LEVEL_NAMES,
  TAX_RATE,
  TOURIST_TOLL_MULT,
  acquirePrice,
  cityToll,
  FESTIVAL_MULT,
  levelCost,
  sellValue,
  tollAt,
  touristToll,
} from '@/engine/economy';
import type { MapDef, TileDef, TileKind } from '@/engine/types';
import { formatRp } from '@/lib/format';
import { useGame } from '@/store/gameStore';
import { Avatar } from '@/ui/common';
import { inkOn, rgba } from './color';

export interface TileInfoTarget {
  index: number;
  /** Screen rect of the tapped tile, for placing the desktop popover. */
  rect: DOMRect;
}

interface TileInfoProps {
  map: MapDef;
  target: TileInfoTarget | null;
  onClose: () => void;
}

const TOURIST = '#22D3C5';
const KIND_META: Record<TileKind, { label: string; color: string }> = {
  start: { label: 'Start', color: '#2EE59D' },
  island: { label: 'Pulau Terdampar', color: '#FF5C7A' },
  festival: { label: 'Pesta Rakyat', color: '#FFC21F' },
  airport: { label: 'Bandara', color: '#3A8CD6' },
  city: { label: 'Kota', color: '#3A8CD6' },
  tourist: { label: 'Destinasi Wisata', color: TOURIST },
  chance: { label: 'Kartu Rezeki', color: '#B36BFF' },
  tax: { label: 'Pajak', color: '#FF7A59' },
};

function useWide(query = '(min-width: 640px)'): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [m, setM] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(query);
    const on = () => setM(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return m;
}

/** Tile details: popover beside the tile on desktop, bottom sheet on phones. Closes on outside tap / Esc. */
export function TileInfo({ map, target, onClose }: TileInfoProps) {
  const wide = useWide();
  const ref = useRef<HTMLDivElement>(null);
  const open = target !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    const onDown = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el) return;
      if (ref.current?.contains(el)) return;
      if (el.closest('.bz-tile')) return; // the board handles tile taps (switch / toggle)
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open, onClose]);

  // Close when the game ends / map disappears.
  useEffect(() => {
    if (!open) return;
    return useGame.subscribe((s) => {
      if (!s.game) onClose();
    });
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {target &&
        (wide ? (
          <Popover key="pop" target={target} innerRef={ref} onClose={onClose}>
            <TileDetails map={map} index={target.index} onClose={onClose} />
          </Popover>
        ) : (
          <Sheet key="sheet" innerRef={ref} onClose={onClose}>
            <TileDetails map={map} index={target.index} onClose={onClose} />
          </Sheet>
        ))}
    </AnimatePresence>,
    document.body,
  );
}

const POP_W = 320;
const MARGIN = 12;

function Popover({
  target,
  innerRef,
  children,
}: {
  target: TileInfoTarget;
  innerRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ left: number; top: number; from: number } | null>(null);
  const { rect, index } = target;

  useLayoutEffect(() => {
    const el = innerRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hgt = Math.min(el?.offsetHeight ?? 420, vh - MARGIN * 2);
    let left: number;
    let from = 0;
    if (rect.right + MARGIN + POP_W <= vw - MARGIN) {
      left = rect.right + MARGIN;
      from = -16;
    } else if (rect.left - MARGIN - POP_W >= MARGIN) {
      left = rect.left - MARGIN - POP_W;
      from = 16;
    } else {
      left = Math.min(Math.max(MARGIN, rect.left + rect.width / 2 - POP_W / 2), vw - POP_W - MARGIN);
    }
    const top = Math.min(Math.max(MARGIN, rect.top + rect.height / 2 - hgt / 2), vh - hgt - MARGIN);
    setPos({ left, top, from });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, rect.left, rect.top]);

  return (
    <motion.div
      ref={innerRef}
      role="dialog"
      aria-modal="false"
      aria-label="Info petak"
      className="glass-strong fixed z-[45] flex flex-col overflow-hidden"
      style={{
        width: POP_W,
        maxHeight: `calc(100dvh - ${MARGIN * 2}px)`,
        left: pos?.left ?? -9999,
        top: pos?.top ?? 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
      initial={{ opacity: 0, scale: 0.92, x: pos?.from ?? 0 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 480, damping: 32 }}
    >
      {children}
    </motion.div>
  );
}

function Sheet({
  innerRef,
  onClose,
  children,
}: {
  innerRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  children: ReactNode;
}) {
  const drag = useDragControls();
  return (
    <motion.div
      ref={innerRef}
      role="dialog"
      aria-modal="false"
      aria-label="Info petak"
      className="glass-strong fixed inset-x-0 bottom-0 z-[45] mx-auto flex max-h-[72dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%', transition: { duration: 0.2, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      drag="y"
      dragControls={drag}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 80 || info.velocity.y > 500) onClose();
      }}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2"
        onPointerDown={(e) => drag.start(e)}
        aria-hidden
      >
        <span className="h-1.5 w-10 rounded-full bg-white/25" />
      </div>
      {children}
    </motion.div>
  );
}

// ───────────────────────────── content ─────────────────────────────

function groupMeta(map: MapDef, def: TileDef): { label: string; color: string } {
  if (def.kind === 'city') {
    const g = map.groups.find((x) => x.id === def.group);
    return { label: g?.name ?? 'Kota', color: g?.color ?? '#3A8CD6' };
  }
  return KIND_META[def.kind];
}

function TileDetails({ map, index, onClose }: { map: MapDef; index: number; onClose: () => void }) {
  const titleId = useId();
  const def = map.tiles[index];
  const tiles = useGame((s) => s.view?.tiles);
  const festival = useGame((s) => s.view?.festivalTile ?? null);
  const players = useGame((s) => s.game?.players);
  const salary = useGame((s) => s.game?.config.salary ?? DEFAULT_SALARY);
  const alerted = useGame((s) => !!s.alert?.missing.includes(index));
  const positions = useGame((s) => s.view?.positions);
  const bankrupt = useGame((s) => s.view?.bankrupt);
  if (!def || !tiles || !players) return null;

  const meta = groupMeta(map, def);
  const t = tiles[index];
  const owner = t?.owner ? players.find((p) => p.id === t.owner) : undefined;
  const isFest = festival === index;
  const isProp = def.kind === 'city' || def.kind === 'tourist';
  const toll = owner ? tollAt(map.tiles, tiles, index, festival) : 0;
  const here = players.filter((p) => !bankrupt?.[p.id] && positions?.[p.id] === index);
  const touristOwned = owner
    ? map.tiles.filter((d, i) => d.kind === 'tourist' && tiles[i]?.owner === owner.id).length
    : 0;
  const fMul = isFest ? FESTIVAL_MULT : 1;

  return (
    <section aria-labelledby={titleId} className="flex min-h-0 flex-col">
      {/* header */}
      <div className="relative shrink-0 overflow-hidden px-4 pb-3 pt-3">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: `radial-gradient(120% 90% at 0% 0%, ${rgba(meta.color, 0.45)}, transparent 65%)` }}
        />
        <div className="relative flex items-start gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
            style={{
              background: `linear-gradient(160deg, ${rgba(meta.color, 0.55)}, ${rgba(meta.color, 0.15)})`,
              boxShadow: `inset 0 0 0 2px ${rgba(meta.color, 0.8)}, 0 6px 16px -6px ${rgba(meta.color, 0.7)}`,
            }}
            aria-hidden
          >
            {def.icon}
          </div>
          <div className="min-w-0 flex-1">
            <span
              className="inline-block max-w-full truncate rounded-full px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider"
              style={{ background: meta.color, color: inkOn(meta.color) }}
            >
              {meta.label}
            </span>
            <h2 id={titleId} className="mt-1 truncate font-display text-xl font-bold leading-tight text-white">
              {def.name}
            </h2>
            {def.subtitle && <p className="truncate text-xs font-semibold text-ink-300">{def.subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-ink-100 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            aria-label="Tutup info petak"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {(isFest || alerted) && (
          <div className="relative mt-2 flex flex-wrap gap-1.5">
            {isFest && (
              <span className="rounded-full bg-gradient-to-r from-gold-300 to-[#FF4FD8] px-2 py-0.5 font-display text-xs font-bold text-[#2A0A2E]">
                🎉 Lagi pesta! Sewa ×{FESTIVAL_MULT}
              </span>
            )}
            {alerted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-merah-500 px-2 py-0.5 font-display text-xs font-bold text-white">
                <AlertTriangle className="h-3 w-3" /> Incaran monopoli!
              </span>
            )}
          </div>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {def.blurb && <p className="text-sm leading-snug text-ink-200">{def.blurb}</p>}

        {isProp && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-ink-950/40 p-3">
            {owner ? (
              <div className="flex items-center gap-2.5">
                <Avatar characterId={owner.characterId} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">Pemilik</div>
                  <div className="truncate font-display font-bold" style={{ color: owner.color }}>
                    {owner.name}
                  </div>
                </div>
                {def.kind === 'city' && (
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 font-display text-xs font-bold text-white">
                    {LEVEL_ICONS[t.level]} {LEVEL_NAMES[t.level]}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-200">
                <span className="text-lg" aria-hidden>
                  🏷️
                </span>
                Belum ada pemilik — siap dibeli!
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              {owner ? (
                <>
                  <Stat label={isFest ? 'Sewa sekarang (×2)' : 'Sewa sekarang'} value={formatRp(toll)} tone="gold" />
                  {def.kind === 'city' && t.level >= LANDMARK_LEVEL ? (
                    <Stat label="Akuisisi" value="Kebal 🛡️" tone="muted" />
                  ) : (
                    <Stat label="Harga akuisisi" value={formatRp(acquirePrice(def, t.level))} tone="brand" />
                  )}
                </>
              ) : (
                <>
                  <Stat label={def.kind === 'city' ? 'Harga tanah' : 'Harga beli'} value={formatRp(def.price ?? 0)} tone="gold" />
                  <Stat
                    label="Sewa awal"
                    value={formatRp(def.kind === 'city' ? cityToll(def, 0) : touristToll(def, 1))}
                    tone="brand"
                  />
                </>
              )}
            </div>
            {owner && (
              <p className="mt-2 text-[11px] text-ink-300">
                Nilai jual ke bank: <span className="num text-ink-100">{formatRp(sellValue(def, t.level))}</span>
              </p>
            )}
          </div>
        )}

        {def.kind === 'city' && <CityLadder def={def} level={owner ? t.level : -1} fMul={fMul} />}
        {def.kind === 'tourist' && <TouristLadder def={def} owned={touristOwned} fMul={fMul} />}
        {!isProp && <SpecialInfo def={def} map={map} salary={salary} festival={festival} />}

        {here.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">Di sini:</span>
            <div className="flex -space-x-1.5">
              {here.map((p) => (
                <Avatar key={p.id} characterId={p.characterId} size={26} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'gold' | 'brand' | 'muted' }) {
  return (
    <div className="rounded-xl bg-white/5 px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase leading-tight tracking-wider text-ink-300">{label}</div>
      <div
        className={clsx(
          'num mt-0.5 text-base font-bold leading-tight',
          tone === 'gold' && 'text-gold-300',
          tone === 'brand' && 'text-brand-300',
          tone === 'muted' && 'text-ink-200',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function CityLadder({ def, level, fMul }: { def: TileDef; level: number; fMul: number }) {
  return (
    <div className="mt-3">
      <h3 className="mb-1.5 font-display text-xs font-bold uppercase tracking-wider text-ink-300">Tangga bangunan</h3>
      <table className="w-full border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-ink-400">
            <th className="pl-2 text-left font-semibold">Level</th>
            <th className="text-right font-semibold">Biaya</th>
            <th className="pr-2 text-right font-semibold">Sewa{fMul > 1 ? ' ×2' : ''}</th>
          </tr>
        </thead>
        <tbody>
          {LEVEL_NAMES.map((name, l) => {
            const current = l === level;
            return (
              <tr key={name} className={clsx(current ? 'bg-brand-500/25' : 'bg-white/[0.04]')}>
                <td className={clsx('rounded-l-lg py-1.5 pl-2', current && 'shadow-[inset_3px_0_0_#8CC4F5]')}>
                  <span className="mr-1.5" aria-hidden>
                    {LEVEL_ICONS[l]}
                  </span>
                  <span className={clsx('font-semibold', current ? 'text-white' : 'text-ink-100')}>{name}</span>
                  {current && <span className="ml-1.5 text-[10px] font-bold uppercase text-brand-300">• kini</span>}
                </td>
                <td className="num py-1.5 text-right text-ink-200">{formatRp(levelCost(def, l), { short: true })}</td>
                <td className="num rounded-r-lg py-1.5 pr-2 text-right font-bold text-gold-300">
                  {formatRp(cityToll(def, l) * fMul, { short: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] leading-snug text-ink-400">
        Biaya = ongkos naik ke level itu. Landmark hanya bisa dibangun dari Hotel, dan kebal akuisisi.
      </p>
    </div>
  );
}

function TouristLadder({ def, owned, fMul }: { def: TileDef; owned: number; fMul: number }) {
  const counts = TOURIST_TOLL_MULT.map((_, n) => n).filter((n) => n >= 1 && n <= 4);
  return (
    <div className="mt-3">
      <h3 className="mb-1.5 font-display text-xs font-bold uppercase tracking-wider text-ink-300">
        Sewa menurut jumlah wisata dimiliki
      </h3>
      <div className="grid grid-cols-4 gap-1.5">
        {counts.map((n) => {
          const current = n === owned;
          return (
            <div
              key={n}
              className={clsx(
                'rounded-xl px-1 py-2 text-center',
                current ? 'bg-laut-500/25 shadow-[inset_0_0_0_2px_#22D3C5]' : 'bg-white/[0.05]',
              )}
            >
              <div className="text-[10px] font-semibold text-ink-300">{n} wisata</div>
              <div className="num text-sm font-bold text-gold-300">{formatRp(touristToll(def, n) * fMul, { short: true })}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
        Wisata tidak bisa dibangun. Kuasai keempatnya untuk Monopoli Wisata!
      </p>
    </div>
  );
}

function SpecialInfo({
  def,
  map,
  salary,
  festival,
}: {
  def: TileDef;
  map: MapDef;
  salary: number;
  festival: number | null;
}) {
  let rows: [string, string][] = [];
  switch (def.kind) {
    case 'start':
      rows = [
        ['Gaji tiap lewat', formatRp(salary)],
        ['Mendarat pas', 'Upgrade 1 kota'],
      ];
      break;
    case 'island':
      rows = [
        ['Ongkos kabur', formatRp(ISLAND_ESCAPE_FEE)],
        ['Maksimal', `${ISLAND_MAX_TURNS} giliran`],
      ];
      break;
    case 'festival':
      rows = [
        ['Efek', `Sewa ×${FESTIVAL_MULT}`],
        ['Pesta sekarang', festival !== null ? map.tiles[festival]?.name ?? '-' : 'Belum ada'],
      ];
      break;
    case 'airport':
      rows = [['Giliran berikut', 'Terbang ke mana saja']];
      break;
    case 'tax':
      rows = [['Tarif', `${Math.round(TAX_RATE * 100)}% nilai properti`]];
      break;
    case 'chance':
      rows = [['Isi', 'Cuan, apes, atau plot twist']];
      break;
    default:
      rows = [];
  }
  if (!rows.length) return null;
  return (
    <div className="mt-3 grid gap-1.5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-3 py-2 text-sm">
          <span className="text-ink-300">{k}</span>
          <span className="num text-right font-bold text-white">{v}</span>
        </div>
      ))}
    </div>
  );
}
