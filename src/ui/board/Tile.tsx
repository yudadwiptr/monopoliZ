import { memo, type CSSProperties } from 'react';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { TAX_RATE } from '@/engine/economy';
import type { TileDef } from '@/engine/types';
import { tileGridPos, tileSide } from '@/data/layout';
import { formatRp } from '@/lib/format';
import { inkOn, mix, rgba } from './color';
import { CornerArt } from './CornerArt';

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
  festival: boolean;
  sel: SelState;
  alert: boolean;
  /** Colour of the active player when their pawn stands on this tile. */
  here: string | null;
  salary: number;
  onPick: (index: number, el: HTMLElement) => void;
}

const CORNER_SUB: Partial<Record<TileDef['kind'], string>> = {
  island: 'Maks 3 giliran',
  festival: 'SEWA ×2',
  airport: 'Terbang bebas!',
};

function ringShadows(p: TileViewProps): string {
  const s: string[] = [
    // 3D physical block extrusion (points straight down on screen in isometric 45deg view)
    // tile thickness (cream block) + soft contact shadow on the wood
    'calc(var(--c) * 0.045) calc(var(--c) * 0.045) 0 #c4ad87',
    'calc(var(--c) * 0.07) calc(var(--c) * 0.07) calc(var(--c) * 0.1) rgba(40,22,8,0.45)',
  ];
  if (p.ownerColor) {
    s.push(`inset 0 0 0 calc(var(--c) * 0.055) ${p.ownerColor}`);
  } else if (p.def.kind === 'tourist') {
    s.push('inset 0 0 0 calc(var(--c) * 0.04) #22D3C5');
  } else {
    s.push('inset 0 0 0 1px rgba(120,90,50,0.18)');
  }
  s.push(
    'inset calc(var(--c) * -0.02) calc(var(--c) * -0.02) 0 rgba(120,90,50,0.18)',
    'inset calc(var(--c) * 0.02) calc(var(--c) * 0.02) 0 rgba(255,255,255,0.7)',
  );
  if (p.festival) s.push('0 0 0 calc(var(--c) * 0.045) #FFD35C', `0 0 calc(var(--c) * 0.45) ${rgba('#FF4FD8', 0.85)}`);
  if (p.here) s.push(`0 0 0 calc(var(--c) * 0.05) ${p.here}`, `0 0 calc(var(--c) * 0.45) ${rgba(p.here, 0.78)}`);
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

/**
 * Font size that keeps the longest WORD of a tile name on one line (names wrap between words only, never
 * inside one — "Pekanbaru" must not become "Pekanbar/u").
 */
function nameFontSize(name: string): string {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length));
  const fit = 0.82 / (0.72 * Math.max(1, longest)); // lot width ≈ 0.82 cell, uppercase Fredoka bold ≈ 0.72em per glyph
  return `calc(var(--c) * ${Math.min(0.19, fit).toFixed(3)})`;
}

function PricePlate({ value, ownerColor, festival }: { value: number; ownerColor: string | null; festival: boolean }) {
  return (
    <div
      className="bz-price-zone"
      data-owned={ownerColor ? 'true' : 'false'}
      style={
        ownerColor
          ? {
            background: `linear-gradient(180deg, ${mix(ownerColor, '#FFFFFF', 0.18)}, ${mix(ownerColor, '#05081A', 0.25)})`,
            color: inkOn(ownerColor),
          }
          : undefined
      }
    >
      <span className="bz-price-text num">
        {ownerColor && <span className="bz-coin" aria-hidden />}
        {formatRp(value, { short: true })}
        {festival && <span className="bz-price-mult">×2</span>}
      </span>
    </div>
  );
}

function SplitLabel({ text, size }: { text: string; size: string }) {
  const words = text.trim().split(/\s+/);
  const small = words.length > 1 ? words[0] : null;
  const big = words.length > 1 ? words.slice(1).join(' ') : words[0];
  return (
    <span className="bz-special-label" style={{ fontSize: size }}>
      {small && <small>{small}</small>}
      {big}
    </span>
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
      {p.festival && (
        <span className="bz-badge bz-badge-fest num" aria-hidden>
          ×2
        </span>
      )}
    </>
  );
}

function CornerBody({ p }: { p: TileViewProps }) {
  const { def } = p;
  if (def.kind === 'start') {
    return (
      <div className="bz-corner-face">
        <span className="bz-start-badge">START</span>
        <span className="bz-start-big">GAJI</span>
        <span className="bz-chip num" style={{ background: 'linear-gradient(180deg,#FFF0BF,#FFC21F)', color: '#2A1A00' }}>
          +{formatRp(p.salary, { short: true })}
        </span>
      </div>
    );
  }
  return (
    <div className="bz-corner-face">
      <span className="bz-corner-title">{def.name}</span>
      <span className="bz-corner-hero" aria-hidden>
        {def.icon}
      </span>
      <span
        className="bz-corner-sub"
        style={def.kind === 'festival' ? { background: 'linear-gradient(135deg,#FFE08A,#FF4FD8)', color: '#2A0A2E' } : undefined}
      >
        {CORNER_SUB[def.kind] ?? ''}
      </span>
    </div>
  );
}

/**
 * Get Rich-style 2-zone tile body:
 * - Inner Zone (adjacent to center pit): Vibrant 3D colored lot block where buildings stand + City Name.
 * - Outer Zone (adjacent to board edge): Crisp metallic price/toll plate.
 * Because side 1 and side 3 are rotated -90deg by `.bz-tile-rot`, all 4 sides share this exact same portrait structure!
 */
function SideTileContent({ p, band }: { p: TileViewProps; band: string | null }) {
  const { def } = p;
  if (def.kind === 'chance') {
    return (
      <>
        <div className="bz-lot-zone bz-lot-special">
          <span className="bz-cards" aria-hidden>
            <span />
            <span />
            <span>{def.icon}</span>
          </span>
          <span style={{ color: '#A86F00' }}>
            <SplitLabel text={def.name} size="calc(var(--c) * 0.19)" />
          </span>
        </div>
        <div className="bz-price-zone bz-price-special">
          <span className="bz-price-text" style={{ color: '#A86F00', letterSpacing: '0.08em' }}>
            EVENT
          </span>
        </div>
      </>
    );
  }
  if (def.kind === 'tax') {
    return (
      <>
        <div className="bz-lot-zone bz-lot-special">
          <span className="bz-icon" aria-hidden>
            {def.icon}
          </span>
          <span style={{ color: '#C4153A' }}>
            <SplitLabel text="Bayar Pajak" size="calc(var(--c) * 0.18)" />
          </span>
        </div>
        <div className="bz-price-zone bz-price-tax">
          <span className="bz-price-text num" style={{ color: '#C4153A' }}>
            {Math.round(TAX_RATE * 100)}%
          </span>
        </div>
      </>
    );
  }

  const isTourist = def.kind === 'tourist';
  const isOwned = !!p.ownerColor;
  const lotColor = band ?? '#5AA6EC';

  return (
    <>
      <div className="bz-lot-zone" style={{ '--band': lotColor } as CSSProperties}>
        <span className="bz-band-strip" aria-hidden />
        {isTourist && !isOwned && <span className="bz-tourist-tag">WISATA</span>}
        {/* The lot icon shows until a building stands on the lot. */}
        {!isOwned && (
          <span className="bz-lot-icon" aria-hidden>
            {def.icon}
          </span>
        )}
        <span className="bz-name" style={{ fontSize: nameFontSize(def.name) }}>
          {def.name}
        </span>
      </div>
      <PricePlate value={p.value} ownerColor={p.ownerColor} festival={p.festival} />
    </>
  );
}

function TileImpl(p: TileViewProps) {
  const { def } = p;
  const { row, col } = tileGridPos(def.index);
  const corner = def.index % 8 === 0;
  const side = tileSide(def.index);
  const landscape = side === 1 || side === 3;
  // Side 0 (bottom) and Side 3 (right, rotated -90deg) have their inner-pit edge at local TOP (column).
  // Side 2 (top) and Side 1 (left, rotated -90deg) have their inner-pit edge at local BOTTOM (column-reverse).
  const reverseRadial = side === 1 || side === 2;
  const band = def.kind === 'city' ? p.bandColor ?? '#8C96C9' : def.kind === 'tourist' ? '#22D3C5' : null;
  const lifted = p.sel === 'pick' || p.here || p.festival || p.alert;

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
      style={{
        gridRow: row + 1,
        gridColumn: col + 1,
        boxShadow: ringShadows(p),
        zIndex: lifted ? 4 : undefined,
      }}
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

/** One board tile, styled like a 3D Get Rich block on the board plane. Memoised: only re-renders when its own data changes. */
export const Tile = memo(TileImpl);
