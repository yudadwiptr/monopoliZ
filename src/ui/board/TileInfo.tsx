import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_SALARY,
  FESTIVAL_MULT,
  ISLAND_ESCAPE_FEE,
  ISLAND_MAX_TURNS,
  LANDMARK_LEVEL,
  LEVEL_NAMES,
  TAX_RATE,
  TOURIST_TOLL_MULT,
  acquirePrice,
  cityToll,
  levelCost,
  sellValue,
  tollAt,
  touristToll,
} from '@/engine/economy';
import type { MapDef, TileDef, TileKind } from '@/engine/types';
import { formatRp } from '@/lib/format';
import { useGame } from '@/store/gameStore';
import { Avatar } from '@/ui/common';
import { LevelArt } from '@/ui/dialogs/shared/LevelArt';
import { TileLandmarkIcon } from '@/ui/dialogs/shared/TileLandmarkIcon';
import { inkOn } from './color';

export interface TileInfoTarget {
  index: number;
  /** Screen rect of the tapped tile. */
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
  island: { label: 'Pulau', color: '#FF5C7A' },
  festival: { label: 'Festival', color: '#FFC21F' },
  airport: { label: 'Bandara', color: '#3A8CD6' },
  city: { label: 'Kota', color: '#3A8CD6' },
  tourist: { label: 'Wisata', color: TOURIST },
  chance: { label: 'Rezeki', color: '#B36BFF' },
  tax: { label: 'Pajak', color: '#FF7A59' },
};

/** Exact ladder row top/height percentages measured from `public/ui/card_detail_kota.webp` (1742×2356). */
const LADDER_ROW_SLOTS: { top: string; height: string }[] = [
  { top: '49.25%', height: '6.15%' },
  { top: '56.75%', height: '5.95%' },
  { top: '64.20%', height: '5.95%' },
  { top: '71.60%', height: '5.95%' },
  { top: '79.25%', height: '5.95%' },
];

const CARD_ASPECT = 1742 / 2356; // width / height ≈ 0.7394

const SPECIAL_ICON_IMG: Partial<Record<TileKind, string>> = {
  island: '/icons/icon_pulau_terdampar.webp',
  airport: '/icons/icon_bandara.webp',
  chance: '/icons/icon_kartu_rezeki.webp',
};

function isPropertyTile(kind: TileKind): boolean {
  return kind === 'city' || kind === 'tourist';
}

function clampVal(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Computes a smart floating position on desktop/landscape screens so the detail card appears
 * adjacent to the tapped tile on the map (to the right of left-half tiles, to the left of right-half tiles)
 * and never covers the tile being inspected.
 */
function computeFloatingPlacement(rect: DOMRect) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
  const cardW = Math.min(vw * 0.92, 356, vh * 0.88 * CARD_ASPECT);
  const cardH = cardW / CARD_ASPECT;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const onLeftHalf = cx < vw / 2;

  const rawLeft = onLeftHalf ? rect.right + 14 : rect.left - cardW - 14;
  const left = Math.round(clampVal(rawLeft, 12, Math.max(12, vw - cardW - 12)));
  const top = Math.round(clampVal(cy - cardH / 2, 12, Math.max(12, vh - cardH - 12)));

  return {
    left,
    top,
    width: Math.round(cardW),
    fromX: onLeftHalf ? -18 : 18,
  };
}

function useWide(query = '(min-width: 769px)'): boolean {
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

function groupMeta(map: MapDef, def: TileDef): { label: string; color: string } {
  if (def.kind === 'city') {
    const g = map.groups.find((x) => x.id === def.group);
    return { label: g?.name ?? 'Kota', color: g?.color ?? '#3A8CD6' };
  }
  return KIND_META[def.kind];
}

/**
 * 2D Hand-Drawn City Detail Card (`/ui/card_detail_kota.webp`):
 * - Desktop (`> 768px`): floats neatly on the right side of the screen (`width: min(92vw, 370px)`).
 * - Mobile (`<= 768px`): centered modal card over a semi-transparent dark backdrop (`rgba(15, 23, 42, 0.6)`).
 * - Every element (Icon box, Ribbon, Owner row, 2-column Rent/Acquire boxes, 5-row Building Ladder, and `DI SINI:` row)
 *   is positioned directly inside its corresponding drawn slot in `card_detail_kota.png`.
 */
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
      if (el.closest('.bz-tile')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    return useGame.subscribe((s) => {
      if (!s.game) onClose();
    });
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const placement = target && wide ? computeFloatingPlacement(target.rect) : null;
  const targetDef = target ? map.tiles[target.index] : null;
  const isPropTile = targetDef ? isPropertyTile(targetDef.kind) : true;
  const frameBg = isPropTile ? "url('/ui/card_detail_kota.webp')" : "url('/ui/card_detail_spesial.webp')";

  return createPortal(
    <AnimatePresence>
      {target && (
        <div
          key="tile-info-layer"
          className={clsx(
            'fixed inset-0 z-[45]',
            wide ? 'pointer-events-none' : 'pointer-events-auto flex items-center justify-center p-3',
          )}
        >
          {/* Mobile dark semi-transparent backdrop */}
          {!wide && (
            <motion.div
              aria-hidden
              className="absolute inset-0"
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
            />
          )}

          <motion.div
            ref={ref}
            role="dialog"
            aria-modal={!wide}
            aria-label="Detail petak"
            className="pointer-events-auto select-none overflow-hidden rounded-[18px]"
            style={
              placement
                ? {
                    position: 'fixed',
                    left: placement.left,
                    top: placement.top,
                    width: placement.width,
                    aspectRatio: isPropTile ? '1742 / 2356' : '3 / 4',
                    backgroundImage: frameBg,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    filter: 'drop-shadow(0 18px 40px rgba(0, 0, 0, 0.55))',
                    containerType: 'inline-size',
                  }
                : {
                    position: 'relative',
                    width: 'min(92vw, 356px, calc(88dvh * 0.7394))',
                    aspectRatio: isPropTile ? '1742 / 2356' : '3 / 4',
                    backgroundImage: frameBg,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    filter: 'drop-shadow(0 18px 40px rgba(0, 0, 0, 0.55))',
                    containerType: 'inline-size',
                  }
            }
            initial={
              placement
                ? { opacity: 0, x: placement.fromX, scale: 0.94 }
                : { opacity: 0, y: 24, scale: 0.92 }
            }
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={
              placement
                ? { opacity: 0, x: placement.fromX, scale: 0.95 }
                : { opacity: 0, y: 16, scale: 0.94 }
            }
            transition={{ type: 'spring', stiffness: 440, damping: 32 }}
          >
            {isPropTile ? (
              <TileCardContent map={map} index={target.index} onClose={onClose} />
            ) : (
              <SpecialTileCardContent map={map} index={target.index} onClose={onClose} />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function TileCardContent({ map, index, onClose }: { map: MapDef; index: number; onClose: () => void }) {
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
    <div aria-labelledby={titleId} className="relative h-full w-full text-[#2b1d12]">
      {/* 1. Dynamic City/Tile Icon Box (Top-Left square slot: left 13.7%, top 13.5%, width 13%, height 10.45%) */}
      <div
        className="absolute flex items-center justify-center overflow-hidden rounded-[8px] border-2 border-[#2b1d12]"
        style={{
          left: '13.7%',
          top: '13.54%',
          width: '13.0%',
          height: '10.45%',
          background: `linear-gradient(145deg, #ffffff 0%, ${meta.color}55 100%)`,
          boxShadow: `inset 0 0 0 2px ${meta.color}`,
        }}
        aria-hidden
      >
        {isProp ? (
          <TileLandmarkIcon def={def} color={meta.color} className="h-[80%] w-[80%] object-contain" />
        ) : (
          <span className="text-[6.2cqi] leading-none">{def.icon}</span>
        )}
      </div>

      {/* 2. Region / Group Badge inside the cream ribbon (left 29.5%, top 13.35%, width 22%, height 4.1%) */}
      <div
        className="absolute flex items-center justify-center px-1"
        style={{
          left: '29.2%',
          top: '13.35%',
          width: '22.2%',
          height: '4.1%',
        }}
      >
        <span
          className="truncate rounded-full px-1.5 py-px font-display text-[2.3cqi] font-black uppercase tracking-wider"
          style={{
            background: meta.color,
            color: inkOn(meta.color),
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Festival / Monopoly Alert badge next to ribbon if active */}
      {(isFest || alerted) && (
        <div
          className="absolute flex items-center gap-1"
          style={{ left: '53%', top: '13.4%', right: '17%' }}
        >
          {isFest && (
            <span className="truncate rounded-full border border-[#2b1d12] bg-gold-300 px-1.5 py-px font-display text-[2.2cqi] font-black text-[#2b1d12]">
              🎉 ×{FESTIVAL_MULT}
            </span>
          )}
          {alerted && (
            <span className="inline-flex items-center gap-0.5 truncate rounded-full border border-[#2b1d12] bg-merah-500 px-1.5 py-px font-display text-[2.2cqi] font-black text-white">
              <AlertTriangle className="h-2.5 w-2.5" /> Awas!
            </span>
          )}
        </div>
      )}

      {/* 3. City Name & Province inside the dark header arch (left 29.2%, top 17.5%, right 15%, height 6.4%) */}
      <div
        className="absolute flex flex-col justify-center"
        style={{
          left: '29.2%',
          top: '17.4%',
          right: '14%',
          height: '6.5%',
        }}
      >
        <h2
          id={titleId}
          className="truncate font-display text-[5.2cqi] font-black leading-none text-[#fef9e7]"
          style={{ textShadow: '0 2px 0 #140d08' }}
        >
          {def.name}
        </h2>
        {def.subtitle && (
          <p className="mt-0.5 truncate font-display text-[2.8cqi] font-bold leading-tight text-[#d8c9a8]">
            {def.subtitle}
          </p>
        )}
      </div>

      {/* 4. Close Button (X) in top-right corner of header */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup info petak"
        className="absolute flex items-center justify-center rounded-full border-2 border-[#2b1d12] transition-transform hover:scale-105 active:scale-95"
        style={{
          top: '13.8%',
          right: '8.2%',
          width: '7.6%',
          aspectRatio: '1 / 1',
          background: '#4a3525',
          color: '#f6eedc',
          boxShadow: '0 2px 0 #2b1d12',
        }}
      >
        <X className="h-[58%] w-[58%]" strokeWidth={2.8} />
      </button>

      {/* 5. Short Property Blurb on the parchment strip to the right of the left icon arch (top 24.4% .. 27.9%) */}
      {isProp && def.blurb && (
        <div
          className="absolute flex items-center"
          style={{
            left: '28.5%',
            right: '13.5%',
            top: '24.4%',
            height: '3.5%',
          }}
        >
          <p className="truncate font-sans text-[2.35cqi] font-bold leading-none text-[#4a3525]" title={def.blurb}>
            {def.blurb}
          </p>
        </div>
      )}

      {/* 6. Slot 1: Owner Row Box (top 28.3%, height 7.2%, left 14.5%, right 14.5%) */}
      <div
        className="absolute flex items-center justify-between px-2.5"
        style={{
          left: '14.5%',
          right: '14.5%',
          top: '28.3%',
          height: '7.2%',
        }}
      >
        {isProp ? (
          owner ? (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <Avatar characterId={owner.characterId} size={28} />
                <div className="min-w-0">
                  <div className="font-display text-[2.2cqi] font-extrabold uppercase leading-none tracking-wider text-[#6e5239]">
                    Pemilik
                  </div>
                  <div className="truncate font-display text-[3.5cqi] font-black leading-tight text-[#2b1d12]">
                    {owner.name}
                  </div>
                </div>
              </div>
              {def.kind === 'city' ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-[#2b1d12] bg-[#f5e3b8] px-2 py-0.5 font-display text-[2.8cqi] font-extrabold text-[#2b1d12] shadow-sm">
                  <LevelArt level={t.level} size={15} />
                  {LEVEL_NAMES[t.level]}
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-[#2b1d12] bg-[#bfeef2] px-2 py-0.5 font-display text-[2.7cqi] font-extrabold text-[#123d42]">
                  🏝️ {touristOwned} Wisata
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 font-display text-[3.1cqi] font-extrabold text-[#4a3525]">
              <span aria-hidden>🏷️</span>
              <span>Belum ada pemilik — siap dibeli!</span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-1.5 font-display text-[3.2cqi] font-extrabold text-[#4a3525]">
            <span>{def.icon}</span>
            <span>Petak Spesial • {meta.label}</span>
          </div>
        )}
      </div>

      {/* 7. Slot 2: Two Side-by-Side Stat Boxes (top 37.3%, height 7.7%) */}
      <div
        className="absolute flex flex-col justify-center px-2.5"
        style={{
          left: '14.5%',
          width: '33.8%',
          top: '37.3%',
          height: '7.7%',
        }}
      >
        <div className="truncate font-display text-[2.15cqi] font-extrabold uppercase tracking-wider text-[#6e5239]">
          {isProp ? (owner ? (isFest ? 'Sewa sekarang (×2)' : 'Sewa sekarang') : 'Harga beli') : 'Kategori'}
        </div>
        <div className="num truncate font-display text-[4.0cqi] font-black leading-tight text-[#b45309]">
          {isProp ? formatRp(owner ? toll : def.price ?? 0) : meta.label}
        </div>
      </div>

      <div
        className="absolute flex flex-col justify-center px-2.5"
        style={{
          left: '51.7%',
          width: '33.8%',
          top: '37.3%',
          height: '7.7%',
        }}
      >
        <div className="truncate font-display text-[2.15cqi] font-extrabold uppercase tracking-wider text-[#6e5239]">
          {isProp
            ? owner
              ? 'Harga akuisisi'
              : 'Sewa awal'
            : 'Status'}
        </div>
        <div className="num truncate font-display text-[4.0cqi] font-black leading-tight text-[#1d4ed8]">
          {isProp
            ? owner
              ? def.kind === 'city' && t.level >= LANDMARK_LEVEL
                ? 'Kebal 🛡️'
                : formatRp(acquirePrice(def, t.level))
              : formatRp(def.kind === 'city' ? cityToll(def, 0) : touristToll(def, 1))
            : 'Aktif'}
        </div>
      </div>

      {/* Small "Nilai jual ke bank" text in the gap between the middle box (46.8%) and Row 1 (49.25%) */}
      {isProp && (
        <div
          className="absolute flex items-center justify-between px-1.5"
          style={{
            left: '13.0%',
            right: '13.0%',
            top: '46.85%',
            height: '2.25%',
          }}
        >
          <span className="font-sans text-[2.15cqi] font-bold text-[#5c432d]">
            {owner ? (
              <>
                Nilai jual ke bank: <b className="num text-[#2b1d12]">{formatRp(sellValue(def, t.level))}</b>
              </>
            ) : (
              <>
                Nilai jual dasar: <b className="num text-[#2b1d12]">{formatRp(sellValue(def, 0))}</b>
              </>
            )}
          </span>
          <span className="font-display text-[1.95cqi] font-extrabold uppercase tracking-wider text-[#6e5239]">
            Biaya / Sewa{fMul > 1 ? ' ×2' : ''}
          </span>
        </div>
      )}

      {/* 8. Slot 3: 5 Building Ladder Rows (Tanah, Rumah, Ruko, Hotel, Landmark) */}
      {def.kind === 'city' &&
        LEVEL_NAMES.map((name, l) => {
          const current = owner !== undefined && l === t.level;
          const slot = LADDER_ROW_SLOTS[l];
          return (
            <div
              key={name}
              className={clsx(
                'absolute flex items-center rounded-[7px] transition-colors',
                current && 'border-2 border-[#d97706] bg-[#fde047]/45 shadow-[0_0_0_1px_#2b1d12]',
              )}
              style={{
                left: '11.4%',
                right: '11.4%',
                top: slot.top,
                height: slot.height,
              }}
            >
              {/* Column 1: Level Icon + Name + KINI badge (0% .. 50.4% of row) */}
              <div className="flex w-[50.4%] min-w-0 items-center gap-1.5 pl-2 pr-1">
                <LevelArt level={l} size={17} />
                <span className="truncate font-display text-[3.1cqi] font-extrabold text-[#2b1d12]">
                  {name}
                </span>
                {current && (
                  <span className="ml-auto shrink-0 rounded-full border border-[#2b1d12] bg-[#f59e0b] px-1.5 py-px font-display text-[2.0cqi] font-black uppercase text-[#2b1d12]">
                    KINI
                  </span>
                )}
              </div>

              {/* Column 2: Biaya (50.4% .. 75.5% of row) */}
              <div className="num w-[25.1%] pr-2 text-right font-display text-[3.0cqi] font-bold text-[#4a3525]">
                {formatRp(levelCost(def, l), { short: true })}
              </div>

              {/* Column 3: Sewa (75.5% .. 100% of row) */}
              <div className="num w-[24.5%] pr-2.5 text-right font-display text-[3.1cqi] font-black text-[#b45309]">
                {formatRp(cityToll(def, l) * fMul, { short: true })}
              </div>
            </div>
          );
        })}

      {/* Tourist 4-row ladder + 5th row opaque Monopoly note badge covering the 3-column dividers */}
      {def.kind === 'tourist' &&
        [1, 2, 3, 4, 5].map((n, idx) => {
          const slot = LADDER_ROW_SLOTS[idx];
          if (n === 5) {
            return (
              <div
                key="tour-note"
                className="absolute flex items-center justify-center rounded-[7px] px-2.5 text-center font-display text-[2.55cqi] font-extrabold text-[#123d42]"
                style={{
                  left: '11.2%',
                  right: '11.2%',
                  top: '79.1%',
                  height: '6.2%',
                  background: 'linear-gradient(180deg, #fef3c7 0%, #f3dfb9 100%)',
                  border: '1.5px solid #5c4028',
                }}
              >
                🏆 Kuasai 4 destinasi wisata = langsung menang Monopoli Wisata!
              </div>
            );
          }
          const current = owner !== undefined && touristOwned === n;
          return (
            <div
              key={n}
              className={clsx(
                'absolute flex items-center rounded-[7px]',
                current && 'border-2 border-[#0891b2] bg-[#67e8f9]/45',
              )}
              style={{ left: '11.4%', right: '11.4%', top: slot.top, height: slot.height }}
            >
              <div className="flex w-[50.4%] items-center gap-1.5 pl-2.5">
                <span aria-hidden>🏝️</span>
                <span className="font-display text-[3.1cqi] font-extrabold text-[#2b1d12]">{n} Wisata</span>
                {current && (
                  <span className="ml-auto mr-1 rounded-full border border-[#2b1d12] bg-[#22d3c5] px-1.5 py-px font-display text-[2.0cqi] font-black uppercase text-[#2b1d12]">
                    KINI
                  </span>
                )}
              </div>
              <div className="num w-[25.1%] pr-2 text-right font-display text-[2.8cqi] font-bold text-[#4a3525]">
                {n === 1 ? formatRp(def.price ?? 0, { short: true }) : `${TOURIST_TOLL_MULT[n]}×`}
              </div>
              <div className="num w-[24.5%] pr-2.5 text-right font-display text-[3.1cqi] font-black text-[#b45309]">
                {formatRp(touristToll(def, n) * fMul, { short: true })}
              </div>
            </div>
          );
        })}

      {/* 9. Slot 4: Bottom Visitor Row (`DI SINI:`) (top 86.6%, height 6.0%, left 11.4%, right 11.4%) */}
      <div
        className="absolute flex items-center justify-between gap-1.5 overflow-hidden px-2.5"
        style={{
          left: '11.4%',
          right: '11.4%',
          top: '86.6%',
          height: '6.0%',
        }}
      >
        <span className="shrink-0 font-display text-[2.6cqi] font-black uppercase tracking-wider text-[#4a3525]">
          DI SINI:
        </span>
        {here.length > 0 ? (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-hidden">
            {here.map((p) => {
              const crowded = here.length >= 3;
              const shortName = crowded ? p.name.split(' ')[0] : p.name;
              return (
                <div
                  key={p.id}
                  className={clsx(
                    'flex min-w-0 items-center rounded-full border border-[#2b1d12] bg-[#f5e3b8] py-0.5 pl-0.5',
                    crowded ? 'gap-0.5 pr-1.5' : 'gap-1 pr-2',
                  )}
                  title={p.name}
                >
                  <Avatar characterId={p.characterId} size={crowded ? 16 : 20} />
                  <span
                    className={clsx(
                      'truncate font-display font-extrabold text-[#2b1d12]',
                      crowded ? 'max-w-[3.1rem] text-[2.2cqi]' : 'max-w-[5rem] text-[2.45cqi]',
                    )}
                  >
                    {shortName}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="truncate font-sans text-[2.45cqi] font-semibold italic text-[#7a5c43]">
            Belum ada pemain di petak ini
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Dedicated 2D Hand-Drawn Detail Card for Special & Corner Tiles (`/ui/card_detail_spesial.webp`):
 * - Uses the special template featuring a wide description slot, 2 status boxes (KATEGORI & STATUS),
 *   2 illustrated scroll banners (passive/money scroll + landing/trophy scroll), tropical bunting illustration,
 *   and the bottom `DI SINI:` visitor bar.
 */
function SpecialTileCardContent({ map, index, onClose }: { map: MapDef; index: number; onClose: () => void }) {
  const titleId = useId();
  const def = map.tiles[index];
  const festival = useGame((s) => s.view?.festivalTile ?? null);
  const players = useGame((s) => s.game?.players);
  const salary = useGame((s) => s.game?.config.salary ?? DEFAULT_SALARY);
  const positions = useGame((s) => s.view?.positions);
  const bankrupt = useGame((s) => s.view?.bankrupt);
  if (!def || !players) return null;

  const meta = KIND_META[def.kind];
  const here = players.filter((p) => !bankrupt?.[p.id] && positions?.[p.id] === index);
  const iconSprite = SPECIAL_ICON_IMG[def.kind];

  let scroll1: [string, string] = ['Efek petak', 'Aktif'];
  let scroll2: [string, string] = ['Mendarat pas', 'Lihat aturan'];

  switch (def.kind) {
    case 'start':
      scroll1 = ['Gaji tiap lewat', formatRp(salary)];
      scroll2 = ['Mendarat pas', 'Upgrade 1 kota'];
      break;
    case 'island':
      scroll1 = ['Ongkos kabur', formatRp(ISLAND_ESCAPE_FEE)];
      scroll2 = ['Bebas gratis', `Dadu kembar / ${ISLAND_MAX_TURNS}x`];
      break;
    case 'festival':
      scroll1 = ['Efek Pesta', `Sewa kota ×${FESTIVAL_MULT}`];
      scroll2 = ['Tuan rumah', festival !== null ? map.tiles[festival]?.name ?? 'Aktif' : 'Pilih 1 kotamu'];
      break;
    case 'airport':
      scroll1 = ['Tiket terbang', 'Gratis (Rp 0)'];
      scroll2 = ['Giliran berikut', 'Terbang bebas'];
      break;
    case 'tax':
      scroll1 = ['Tarif Pajak', `${Math.round(TAX_RATE * 100)}% nilai aset`];
      scroll2 = ['Mendarat pas', 'Bayar ke negara'];
      break;
    case 'chance':
      scroll1 = ['Hadiah & bonus', 'Uang / diskon -50%'];
      scroll2 = ['Mendarat pas', 'Ambil 1 Kartu Rezeki'];
      break;
    default:
      break;
  }

  return (
    <div aria-labelledby={titleId} className="relative h-full w-full text-[#2b1d12]">
      {/* 1. Top-Left White Icon Box (left 14.3%, top 12.8%, width 14.2%, height 10.5%) */}
      <div
        className="absolute flex items-center justify-center overflow-hidden rounded-[10px]"
        style={{
          left: '14.3%',
          top: '12.8%',
          width: '14.2%',
          height: '10.5%',
        }}
        aria-hidden
      >
        {iconSprite ? (
          <img
            src={iconSprite}
            alt=""
            decoding="async"
            draggable={false}
            className="h-[82%] w-[82%] object-contain"
          />
        ) : (
          <span className="text-[7.2cqi] leading-none">{def.icon}</span>
        )}
      </div>

      {/* 2. Top Ribbon Badge (START, PAJAK, REZEKI, BANDARA, FESTIVAL, PULAU) */}
      <div
        className="absolute flex items-center justify-center px-1"
        style={{
          left: '31.8%',
          top: '12.15%',
          width: '20.5%',
          height: '3.9%',
        }}
      >
        <span
          className="truncate rounded-full px-2 py-px font-display text-[2.35cqi] font-black uppercase tracking-wider"
          style={{
            background: meta.color,
            color: inkOn(meta.color),
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* 3. Tile Title & Location Subtitle inside the Dark Arch Header */}
      <div
        className="absolute flex flex-col justify-center"
        style={{
          left: '31.2%',
          top: '16.5%',
          right: '14.5%',
          height: '6.2%',
        }}
      >
        <h2
          id={titleId}
          className="truncate font-display text-[5.3cqi] font-black leading-none text-[#fef9e7]"
          style={{ textShadow: '0 2px 0 #140d08' }}
        >
          {def.name}
        </h2>
        {def.subtitle && (
          <p className="mt-0.5 truncate font-display text-[2.85cqi] font-bold leading-tight text-[#d8c9a8]">
            {def.subtitle}
          </p>
        )}
      </div>

      {/* 4. Close Button (X) in Top-Right of Header */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup info petak"
        className="absolute flex items-center justify-center rounded-full border-2 border-[#2b1d12] transition-transform hover:scale-105 active:scale-95"
        style={{
          top: '13.4%',
          right: '8.2%',
          width: '7.6%',
          aspectRatio: '1 / 1',
          background: '#4a3525',
          color: '#f6eedc',
          boxShadow: '0 2px 0 #2b1d12',
        }}
      >
        <X className="h-[58%] w-[58%]" strokeWidth={2.8} />
      </button>

      {/* 5. Wide Description Box (First Upper Tier: top 27.6%, height 7.3%, left 16.0%, right 16.0%) */}
      <div
        className="absolute flex items-center px-2.5"
        style={{
          left: '16.0%',
          right: '16.0%',
          top: '27.6%',
          height: '7.3%',
        }}
      >
        <p
          className="line-clamp-2 font-sans text-[2.55cqi] leading-[1.22]"
          style={{ color: '#2b1d12', fontWeight: 600 }}
        >
          {def.blurb ?? `Petak spesial ${def.name}.`}
        </p>
      </div>

      {/* 6. Two Side-by-Side Boxes Below Description: KATEGORI (left) & STATUS (right) */}
      <div
        className="absolute flex flex-col justify-center px-3"
        style={{
          left: '15.2%',
          width: '33.0%',
          top: '37.1%',
          height: '8.1%',
        }}
      >
        <div className="truncate font-display text-[2.2cqi] font-extrabold uppercase tracking-wider text-[#6e5239]">
          Kategori
        </div>
        <div className="truncate font-display text-[4.1cqi] font-black leading-tight text-[#b45309]">
          {meta.label}
        </div>
      </div>

      <div
        className="absolute flex flex-col justify-center px-3"
        style={{
          left: '52.2%',
          width: '32.5%',
          top: '37.1%',
          height: '8.1%',
        }}
      >
        <div className="truncate font-display text-[2.2cqi] font-extrabold uppercase tracking-wider text-[#6e5239]">
          Status
        </div>
        <div className="truncate font-display text-[4.1cqi] font-black leading-tight text-[#1d4ed8]">
          Aktif
        </div>
      </div>

      {/* 7. First Scroll Banner (next to money bag & coin icons: left 31.5%, right 16.0%, top 51.2%, height 6.0%) */}
      <div
        className="absolute flex items-center justify-between gap-2 px-2.5"
        style={{
          left: '31.5%',
          right: '16.0%',
          top: '51.2%',
          height: '6.0%',
        }}
      >
        <span className="truncate font-display text-[2.95cqi] font-extrabold text-[#2b1d12]">
          {scroll1[0]}
        </span>
        <span
          className="num shrink-0 font-display text-[3.15cqi]"
          style={{ fontWeight: 800, color: '#15803d' }}
        >
          {scroll1[1]}
        </span>
      </div>

      {/* 8. Second Scroll Banner (next to star, trophy & gate icons: left 40.6%, right 16.0%, top 61.2%, height 5.5%) */}
      <div
        className="absolute flex items-center justify-between gap-2 px-2.5"
        style={{
          left: '40.6%',
          right: '16.0%',
          top: '61.2%',
          height: '5.5%',
        }}
      >
        <span className="truncate font-display text-[2.85cqi] font-extrabold text-[#2b1d12]">
          {scroll2[0]}
        </span>
        <span
          className="num shrink-0 font-display text-[2.95cqi]"
          style={{ fontWeight: 800, color: '#b45309' }}
        >
          {scroll2[1]}
        </span>
      </div>

      {/* 9. Bottom Visitor Bar (to the right of the pre-printed `DI SINI:` label on the card: left 22.8%, right 12.5%, top 87.0%, height 5.7%) */}
      <div
        className="absolute flex items-center justify-end gap-1 overflow-hidden px-1.5"
        style={{
          left: '22.8%',
          right: '12.5%',
          top: '87.0%',
          height: '5.7%',
        }}
      >
        {here.length > 0 ? (
          here.map((p) => {
            const crowded = here.length >= 3;
            const shortName = crowded ? p.name.split(' ')[0] : p.name;
            return (
              <div
                key={p.id}
                className={clsx(
                  'flex min-w-0 items-center rounded-full border border-[#2b1d12] bg-[#f5e3b8] py-0.5 pl-0.5',
                  crowded ? 'gap-0.5 pr-1.5' : 'gap-1 pr-2',
                )}
                title={p.name}
              >
                <Avatar characterId={p.characterId} size={crowded ? 16 : 20} />
                <span
                  className={clsx(
                    'truncate font-display font-extrabold text-[#2b1d12]',
                    crowded ? 'max-w-[3.1rem] text-[2.2cqi]' : 'max-w-[5rem] text-[2.45cqi]',
                  )}
                >
                  {shortName}
                </span>
              </div>
            );
          })
        ) : (
          <span className="truncate font-sans text-[2.45cqi] font-semibold italic text-[#7a5c43]">
            Belum ada pemain di petak ini
          </span>
        )}
      </div>
    </div>
  );
}
