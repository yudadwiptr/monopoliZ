import { memo, type CSSProperties } from 'react';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { TAX_RATE } from '@/engine/economy';
import type { TileDef } from '@/engine/types';
import { tileSide } from '@/data/layout';
import { formatRp } from '@/lib/format';
import { inkOn, rgba } from './color';
import { CornerArt } from './CornerArt';
import { TILE_RECTS } from './geometry';

export type SelState = 'none' | 'pick' | 'dim';

export interface TileViewProps {
  def: TileDef;
  /** Group colour (cities only). */
  bandColor: string | null;
  ownerColor: string | null;
  ownerName: string | null;
  levelName: string | null;
  /** Price when unowned, current toll when owned (properties only). */
  value: number;
  /** Active toll multiplier (1, 2 for Color Monopoly or Festival, 4 for both). */
  mult?: number;
  festival: boolean;
  sel: SelState;
  alert: boolean;
  /** Colour of the active player when their pawn stands on this tile. */
  here: string | null;
  salary: number;
  onPick: (index: number, el: HTMLElement) => void;
}

function ringShadows(p: TileViewProps): string {
  const s: string[] = [];
  if (p.ownerColor) {
    s.push(`inset 0 0 0 calc(var(--c) * 0.065) ${p.ownerColor}`);
  }
  if (p.festival) s.push('0 0 0 calc(var(--c) * 0.05) #FFD35C', `0 0 calc(var(--c) * 0.45) ${rgba('#FF4FD8', 0.85)}`);
  if (p.here) s.push(`0 0 0 calc(var(--c) * 0.055) ${p.here}`, `0 0 calc(var(--c) * 0.4) ${rgba(p.here, 0.85)}`);
  if (p.sel === 'pick') s.push('0 0 0 calc(var(--c) * 0.06) #8CC4F5', `0 0 calc(var(--c) * 0.55) ${rgba('#3A8CD6', 0.95)}`);
  if (p.alert) s.push('0 0 0 calc(var(--c) * 0.055) #FF3B5C');
  return s.join(',');
}

function ariaFor(p: TileViewProps): string {
  const { def } = p;
  const parts = [def.subtitle ? `${def.name}, ${def.subtitle}` : def.name];
  if (def.kind === 'city' || def.kind === 'tourist') {
    if (p.ownerName) {
      parts.push(`milik ${p.ownerName}`);
      if (def.kind === 'city' && p.levelName) parts.push(p.levelName);
      parts.push(`sewa ${formatRp(p.value)}`);
    } else parts.push(`harga ${formatRp(p.value)}`);
  }
  if (p.festival) parts.push('lagi pesta, sewa dua kali lipat');
  if (p.alert) parts.push('awas, incaran monopoli');
  if (p.sel === 'pick') parts.unshift('Pilih');
  return parts.join('. ');
}

const CHIBI_TILE_SPRITE: CSSProperties = {
  width: 'calc(var(--c) * 0.54)',
  height: 'calc(var(--c) * 0.54)',
  aspectRatio: '1 / 1',
  backgroundImage: "url('/sprites/icons_chibi_sheet.png')",
  backgroundSize: '400% 200%',
  backgroundRepeat: 'no-repeat',
  flexShrink: 0,
};

/**
 * Hand-drawn Chibi miniature regional house / tourist temple illustration shown on unowned tiles:
 * - Tourist destination uses Row 2, Col 1 (`0% 100%` — Candi / Destinasi Wisata) from `/sprites/icons_chibi_sheet.png`.
 * - City tiles use Row 1, Col 1 (`0% 0%` — Rumah) from `/sprites/icons_chibi_sheet.png`.
 */
function TileHouseIllustration({ def }: { def: TileDef; band: string }) {
  if (def.kind === 'tourist') {
    return (
      <div
        aria-hidden
        className="bz-special-sprite"
        style={{
          ...CHIBI_TILE_SPRITE,
          backgroundPosition: '0% 100%',
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="bz-special-sprite"
      style={{
        ...CHIBI_TILE_SPRITE,
        backgroundPosition: '0% 0%',
      }}
    />
  );
}

function StateLayers({ p }: { p: TileViewProps }) {
  return (
    <>
      {p.sel === 'dim' && <span className="bz-veil" aria-hidden />}
      {p.sel === 'pick' && (
        <span
          className="bz-pulse"
          aria-hidden
          style={{ background: rgba('#3A8CD6', 0.32), boxShadow: 'inset 0 0 0 calc(var(--c) * 0.05) #BFE0FB' }}
        />
      )}
      {p.alert && (
        <>
          <span
            className="bz-pulse"
            aria-hidden
            style={{ background: rgba('#FF3B5C', 0.38), boxShadow: 'inset 0 0 calc(var(--c) * 0.25) #FF3B5C' }}
          />
          <span className="bz-badge bz-badge-alert" aria-hidden>
            <AlertTriangle style={{ width: '62%', height: '62%' }} strokeWidth={2.6} />
          </span>
        </>
      )}
      {(p.festival || (p.mult ?? 1) > 1) && (
        <span className="bz-badge bz-badge-fest num" aria-hidden>
          ×{p.mult && p.mult > 1 ? p.mult : 2}
        </span>
      )}
    </>
  );
}

function CornerBody({ p }: { p: TileViewProps }) {
  const { def } = p;
  if (def.kind === 'start') {
    return (
      <div className="bz-corner-label-slot">
        <span className="bz-start-mulai">MULAI</span>
        <span className="bz-corner-chip num">+{formatRp(p.salary, { short: true })}</span>
      </div>
    );
  }
  if (def.kind === 'festival') {
    return (
      <div className="bz-corner-label-slot">
        <span className="bz-corner-ink-title">
          PESTA RAKYAT
        </span>
        <span className="bz-corner-chip bz-chip-fest">SEWA ×2</span>
      </div>
    );
  }
  if (def.kind === 'airport') {
    return (
      <div className="bz-corner-label-slot">
        <span className="bz-corner-ink-title">BANDARA</span>
        <span className="bz-corner-sub-pill">Terbang Bebas</span>
      </div>
    );
  }
  return (
    <div className="bz-corner-label-slot">
      <span className="bz-corner-ink-title">
        PULAU
        <br />
        TERDAMPAR
      </span>
    </div>
  );
}

/**
 * 3-Zone Standard Tile Body over `/board/board_frame_2d.png`:
 * - Zone 1 (`.bz-band-zone`, `height: 28%`): Vibrant group color strip + City Name (`clamp(6.5px, 1.35cqi, 11.5px)`, up to 2 lines).
 * - Zone 2 (`.bz-mid-zone`, `height: 50%`): Centered Chibi Building / Special Icon / Pawn standing area.
 * - Zone 3 (`.bz-price-slot`, `height: 22%`): Centered Price / Toll pill (`clamp(6.5px, 1.3cqi, 11px)`).
 */
function SideTileContent({ p, band }: { p: TileViewProps; band: string | null }) {
  const { def } = p;
  if (def.kind === 'chance') {
    return (
      <>
        <div className="bz-band-zone" style={{ background: '#F2B830', color: '#1e130c' }}>
          <span className="bz-name" style={{ color: '#1e130c', textShadow: 'none' }}>
            REZEKI
          </span>
        </div>
        <div className="bz-mid-zone">
          <div
            aria-hidden
            className="bz-special-sprite"
            style={{
              ...CHIBI_TILE_SPRITE,
              backgroundPosition: '100% 100%',
            }}
          />
        </div>
        <div className="bz-price-slot">
          <span className="bz-lot-price" style={{ color: '#8C5210' }}>
            EVENT
          </span>
        </div>
      </>
    );
  }
  if (def.kind === 'tax') {
    return (
      <>
        <div className="bz-band-zone" style={{ background: '#E04834', color: '#FFFFFF' }}>
          <span className="bz-name" style={{ color: '#FFFFFF', textShadow: '0 1px 1px rgba(0,0,0,0.45)' }}>
            PAJAK
          </span>
        </div>
        <div className="bz-mid-zone">
          <span className="bz-icon" aria-hidden>
            {def.icon}
          </span>
        </div>
        <div className="bz-price-slot">
          <span className="bz-lot-price num" style={{ color: '#B8251E' }}>
            {Math.round(TAX_RATE * 100)}%
          </span>
        </div>
      </>
    );
  }

  const isOwned = !!p.ownerColor;
  const lotColor = band ?? '#36B5D8';
  const bandInk = inkOn(lotColor) === '#FFFFFF' ? '#ffffff' : '#1e130c';
  const singleWord = !def.name.trim().includes(' ');

  return (
    <>
      <div
        className="bz-band-zone"
        style={
          {
            background: lotColor,
            color: bandInk,
          } as CSSProperties
        }
      >
        <span
          className={clsx('bz-name', singleWord && 'bz-name-single')}
          style={{
            color: bandInk,
            textShadow: bandInk === '#ffffff' ? '0 1px 1px rgba(0, 0, 0, 0.45)' : 'none',
          }}
        >
          {def.name}
        </span>
      </div>
      <div className="bz-mid-zone">
        {!isOwned && <TileHouseIllustration def={def} band={lotColor} />}
      </div>
      <div className="bz-price-slot">
        <span
          className="bz-lot-price num"
          data-owned={isOwned ? 'true' : 'false'}
          style={
            p.ownerColor
              ? {
                  background: p.ownerColor,
                  color: inkOn(p.ownerColor),
                  borderColor: '#2B1D12',
                }
              : undefined
          }
        >
          {formatRp(p.value, { short: true })}
          {(p.mult ?? 1) > 1 && <span className="bz-price-mult">×{p.mult}</span>}
        </span>
      </div>
    </>
  );
}

function TileImpl(p: TileViewProps) {
  const { def } = p;
  const r = TILE_RECTS[def.index];
  const corner = def.index % 8 === 0;
  const side = tileSide(def.index);
  const landscape = side === 1 || side === 3;
  // Side 0 (bottom) and Side 3 (right, rotated -90deg) have their inner-pit edge at local TOP (column).
  // Side 2 (top) and Side 1 (left, rotated -90deg) have their inner-pit edge at local BOTTOM (column-reverse).
  const reverseRadial = side === 1 || side === 2;
  const band = def.kind === 'city' ? p.bandColor ?? '#8C96C9' : def.kind === 'tourist' ? '#36B5D8' : null;
  const lifted = p.sel === 'pick' || p.here || p.festival || p.alert;

  const leftPct = (r.x0 + 0.5) * 100;
  const topPct = (r.y0 + 0.5) * 100;
  const wPct = r.w * 100;
  const hPct = r.h * 100;

  return (
    <button
      type="button"
      className={clsx(
        'bz-tile',
        corner ? 'bz-corner' : `bz-side-${side}`,
        !corner && (landscape ? 'bz-land' : 'bz-port'),
        def.kind === 'chance' && 'bz-chance',
        def.kind === 'tax' && 'bz-tax',
      )}
      style={
        {
          position: 'absolute',
          left: `${leftPct.toFixed(2)}%`,
          top: `${topPct.toFixed(2)}%`,
          width: `${wPct.toFixed(2)}%`,
          height: `${hPct.toFixed(2)}%`,
          '--tile-w': `${wPct.toFixed(2)}cqi`,
          '--tile-h': `${hPct.toFixed(2)}cqi`,
          boxShadow: ringShadows(p),
          zIndex: lifted ? 4 : undefined,
        } as CSSProperties
      }
      aria-label={ariaFor(p)}
      aria-disabled={p.sel === 'dim' ? true : undefined}
      onClick={(e) => p.onPick(def.index, e.currentTarget)}
    >
      {corner ? (
        <>
          <CornerArt kind={def.kind} icon={def.icon} />
          <CornerBody p={p} />
        </>
      ) : landscape ? (
        <div className={clsx('bz-tile-rot', reverseRadial ? 'bz-radial-rev' : 'bz-radial-fwd')}>
          <SideTileContent p={p} band={band} />
        </div>
      ) : (
        <div className={clsx('bz-tile-stack', reverseRadial ? 'bz-radial-rev' : 'bz-radial-fwd')}>
          <SideTileContent p={p} band={band} />
        </div>
      )}
      <StateLayers p={p} />
    </button>
  );
}

/** One board tile, styled in the hand-drawn Meow Gambit Nusantara comic style. */
export const Tile = memo(TileImpl);
