import { memo, type CSSProperties } from 'react';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { TAX_RATE } from '@/engine/economy';
import type { TileDef } from '@/engine/types';
import { tileGridPos, tileSide } from '@/data/layout';
import { formatRp } from '@/lib/format';
import { inkOn, rgba } from './color';
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
  const s: string[] = [];
  if (p.ownerColor) s.push(`inset 0 0 0 calc(var(--c) * 0.05) ${p.ownerColor}`);
  else if (p.def.kind === 'tourist') s.push('inset 0 0 0 calc(var(--c) * 0.035) #22D3C5');
  s.push('inset 0 1px 0 rgba(255,255,255,0.16)', 'inset 0 -1px 0 rgba(0,0,0,0.35)');
  if (p.festival) s.push('0 0 0 calc(var(--c) * 0.04) #FFD35C', `0 0 calc(var(--c) * 0.45) ${rgba('#FF4FD8', 0.85)}`);
  if (p.here) s.push(`0 0 0 calc(var(--c) * 0.045) ${p.here}`, `0 0 calc(var(--c) * 0.45) ${rgba(p.here, 0.75)}`);
  if (p.sel === 'pick') s.push('0 0 0 calc(var(--c) * 0.055) #8CC4F5', `0 0 calc(var(--c) * 0.55) ${rgba('#3A8CD6', 0.95)}`);
  if (p.alert) s.push('0 0 0 calc(var(--c) * 0.05) #FF3B5C');
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

function Chip({ value, ownerColor }: { value: number; ownerColor: string | null }) {
  return (
    <span
      className="bz-chip num"
      data-owned={ownerColor ? 'true' : 'false'}
      style={ownerColor ? { background: ownerColor, color: inkOn(ownerColor) } : undefined}
    >
      {ownerColor && <span className="bz-coin" aria-hidden />}
      {formatRp(value, { short: true })}
    </span>
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
      <>
        <span className="bz-start-big">GAJI</span>
        <span className="bz-chip num" style={{ background: 'linear-gradient(180deg,#FFF0BF,#FFC21F)', color: '#2A1A00' }}>
          +{formatRp(p.salary, { short: true })}
        </span>
        <span style={{ flex: 1 }} />
        <span className="bz-corner-title" style={{ fontSize: 'calc(var(--c) * 0.16)' }}>
          {def.icon} {def.name}
        </span>
      </>
    );
  }
  return (
    <>
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
    </>
  );
}

function SideBody({ p, landscape }: { p: TileViewProps; landscape: boolean }) {
  const { def } = p;
  if (def.kind === 'chance') {
    return (
      <div className="bz-body" style={landscape ? { flexDirection: 'row', gap: 'calc(var(--c) * 0.1)' } : undefined}>
        <span className="bz-cards" aria-hidden>
          <span />
          <span />
          <span>{def.icon}</span>
        </span>
        <span style={{ color: '#FFE08A' }}>
          <SplitLabel text={def.name} size="calc(var(--c) * 0.2)" />
        </span>
      </div>
    );
  }
  if (def.kind === 'tax') {
    return (
      <div className="bz-body">
        <span className="bz-icon" aria-hidden>
          {def.icon}
        </span>
        <span style={{ color: '#FF8FA3' }}>
          <SplitLabel text="Bayar Pajak" size="calc(var(--c) * 0.19)" />
        </span>
        <span className="bz-chip num" style={{ color: '#FF8FA3' }}>
          {Math.round(TAX_RATE * 100)}%
        </span>
      </div>
    );
  }
  const isTourist = def.kind === 'tourist';
  if (landscape) {
    return (
      <div className="bz-body">
        <span className="bz-name">{def.name}</span>
        <span className="bz-row">
          <span className="bz-icon" aria-hidden>
            {def.icon}
          </span>
          <Chip value={p.value} ownerColor={p.ownerColor} />
        </span>
      </div>
    );
  }
  return (
    <div className="bz-body">
      {isTourist && (
        <span className="bz-band-label" style={{ color: '#7FF0E6', fontSize: 'calc(var(--c) * 0.12)' }}>
          WISATA
        </span>
      )}
      <span className="bz-icon" aria-hidden>
        {def.icon}
      </span>
      <span className="bz-name">{def.name}</span>
    </div>
  );
}

function TileImpl(p: TileViewProps) {
  const { def } = p;
  const { row, col } = tileGridPos(def.index);
  const corner = def.index % 8 === 0;
  const side = tileSide(def.index);
  const landscape = side === 1 || side === 3;
  const isProperty = def.kind === 'city' || def.kind === 'tourist';
  const band = def.kind === 'city' ? p.bandColor ?? '#8C96C9' : def.kind === 'tourist' ? '#22D3C5' : null;
  const lifted = p.sel === 'pick' || p.here || p.festival || p.alert;

  const background = p.ownerColor
    ? `linear-gradient(180deg, ${rgba(p.ownerColor, 0.5)}, ${rgba(p.ownerColor, 0.14)} 75%), linear-gradient(180deg, var(--bz-tile-hi), var(--bz-tile-lo))`
    : undefined;

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
        background,
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
      ) : (
        <>
          {band && (
            <span className="bz-band" style={{ '--band': band } as CSSProperties}>
              {isProperty && !landscape && <Chip value={p.value} ownerColor={p.ownerColor} />}
              {def.kind === 'tourist' && landscape && <span className="bz-band-label">WISATA</span>}
            </span>
          )}
          <SideBody p={p} landscape={landscape} />
        </>
      )}
      <StateLayers p={p} />
    </button>
  );
}

/** One board tile, flat on the board plane. Memoised: only re-renders when its own data changes. */
export const Tile = memo(TileImpl);
