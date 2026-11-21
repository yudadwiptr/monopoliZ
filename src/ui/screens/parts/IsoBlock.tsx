import type { CSSProperties } from 'react';
import { shade } from './color';

export type IsoRoof = 'flat' | 'pyramid' | 'spire';

export interface IsoBlockProps {
  color: string;
  /** Body height in viewBox units (the footprint is 60 wide). */
  height?: number;
  roof?: IsoRoof;
  windows?: boolean;
  /** Share of lit windows, 0..1. */
  lit?: number;
  seed?: number;
  /** Rendered width in px. */
  width: number;
  className?: string;
  style?: CSSProperties;
}

const FLOOR = 11;
const ROOF_H: Record<IsoRoof, number> = { flat: 0, pyramid: 24, spire: 44 };

/** Deterministic pseudo-random 0..1 for window lighting. */
function rand(seed: number, a: number, b: number): number {
  const x = Math.sin(seed * 127.1 + a * 311.7 + b * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A little isometric building drawn in SVG: lit top, mid left face, dark right face, glowing windows.
 * Used for menu backdrops and illustrations.
 */
export function IsoBlock({
  color,
  height = 60,
  roof = 'flat',
  windows = true,
  lit = 0.55,
  seed = 1,
  width,
  className,
  style,
}: IsoBlockProps) {
  const H = height;
  const roofH = ROOF_H[roof];
  const offset = Math.max(0, roofH - 15);
  const total = offset + 30 + H;
  const top = shade(color, 0.28);
  const left = color;
  const right = shade(color, -0.32);

  const floors = windows ? Math.max(0, Math.floor((H - 6) / FLOOR)) : 0;
  const cols = [
    [5, 11],
    [17, 23],
  ];
  const wins: JSX.Element[] = [];
  for (let f = 0; f < floors; f++) {
    const v0 = 6 + f * FLOOR;
    const v1 = v0 + 6;
    cols.forEach(([u0, u1], c) => {
      const litL = rand(seed, f, c) < lit;
      const litR = rand(seed + 7, f, c) < lit * 0.8;
      wins.push(
        <polygon
          key={`l${f}-${c}`}
          points={`${u0},${15 + 0.5 * u0 + v0} ${u1},${15 + 0.5 * u1 + v0} ${u1},${15 + 0.5 * u1 + v1} ${u0},${15 + 0.5 * u0 + v1}`}
          fill={litL ? '#FFE08A' : shade(color, -0.45)}
          opacity={litL ? 0.95 : 0.7}
        />,
        <polygon
          key={`r${f}-${c}`}
          points={`${30 + u0},${30 - 0.5 * u0 + v0} ${30 + u1},${30 - 0.5 * u1 + v0} ${30 + u1},${30 - 0.5 * u1 + v1} ${30 + u0},${30 - 0.5 * u0 + v1}`}
          fill={litR ? '#FFD35C' : shade(color, -0.55)}
          opacity={litR ? 0.85 : 0.7}
        />,
      );
    });
  }

  const apex = 15 - roofH;
  return (
    <svg
      viewBox={`0 0 60 ${total}`}
      width={width}
      height={(width / 60) * total}
      className={className}
      style={style}
      aria-hidden
    >
      <g transform={`translate(0 ${offset})`} strokeLinejoin="round">
        <polygon points={`0,15 30,30 30,${30 + H} 0,${15 + H}`} fill={left} />
        <polygon points={`30,30 60,15 60,${15 + H} 30,${30 + H}`} fill={right} />
        <polygon points="30,0 60,15 30,30 0,15" fill={top} stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />
        {wins}
        {roof === 'pyramid' && (
          <>
            <polygon points={`0,15 30,30 30,${apex}`} fill={shade(color, 0.12)} />
            <polygon points={`30,30 60,15 30,${apex}`} fill={shade(color, -0.18)} />
          </>
        )}
        {roof === 'spire' && (
          <>
            <polygon points="18,15 30,21 42,15 30,9" fill="#FFE08A" />
            <polygon points={`18,15 30,21 30,${apex}`} fill="#FFD35C" />
            <polygon points={`30,21 42,15 30,${apex}`} fill="#E6A200" />
            <circle cx={30} cy={apex} r={2.6} fill="#FFF0BF" />
          </>
        )}
      </g>
    </svg>
  );
}
