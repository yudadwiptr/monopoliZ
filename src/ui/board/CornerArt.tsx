import { useId } from 'react';
import type { TileKind } from '@/engine/types';

const VEHICLES = new Set(['🚗', '🚙', '🚕', '🚌', '🛵', '🏍️', '🚐', '🚚']);

interface ArtProps {
  kind: TileKind;
  icon: string;
}

/** Background illustration of a corner tile (decorative, SVG, viewBox 100×100). */
export function CornerArt({ kind, icon }: ArtProps) {
  const id = useId().replace(/:/g, '');
  switch (kind) {
    case 'start':
      return <StartArt id={id} />;
    case 'island':
      return VEHICLES.has(icon) ? <RoadArt id={id} /> : <SeaArt id={id} />;
    case 'festival':
      return <FestivalArt id={id} />;
    case 'airport':
      return <SkyArt id={id} />;
    default:
      return null;
  }
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg className="bz-corner-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {children}
    </svg>
  );
}

function StartArt({ id }: { id: string }) {
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5AA6EC" />
          <stop offset="0.55" stopColor="#3A8CD6" />
          <stop offset="1" stopColor="#1C5290" />
        </linearGradient>
        <linearGradient id={`${id}ar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF0BF" />
          <stop offset="0.5" stopColor="#FFD35C" />
          <stop offset="1" stopColor="#E6A200" />
        </linearGradient>
        <pattern id={`${id}st`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="4" height="10" fill="rgba(255,255,255,0.07)" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}bg)`} />
      <rect width="100" height="100" fill={`url(#${id}st)`} />
      <circle cx="82" cy="18" r="26" fill="rgba(255,255,255,0.1)" />
      <path d="M90 60 H44 V50 L12 66 L44 82 V72 H90 Z" fill="rgba(0,0,0,0.25)" transform="translate(0 3)" />
      <path
        d="M90 60 H44 V50 L12 66 L44 82 V72 H90 Z"
        fill={`url(#${id}ar)`}
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle className="bz-twinkle" cx="16" cy="40" r="3" fill="#FFE08A" />
      <circle className="bz-twinkle" cx="88" cy="88" r="2.4" fill="#fff" style={{ animationDelay: '0.6s' }} />
    </Svg>
  );
}

function SeaArt({ id }: { id: string }) {
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B3A52" />
          <stop offset="0.55" stopColor="#0F6E78" />
          <stop offset="1" stopColor="#0FA89C" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}bg)`} />
      <circle cx="78" cy="22" r="11" fill="#FFF0BF" opacity="0.9" />
      <circle cx="78" cy="22" r="19" fill="#FFF0BF" opacity="0.12" />
      <ellipse cx="50" cy="74" rx="30" ry="8" fill="#F5D08A" opacity="0.9" />
      <path d="M0 76 Q12 70 25 76 T50 76 T75 76 T100 76 V100 H0 Z" fill="#22D3C5" opacity="0.55" />
      <path d="M0 84 Q12 78 25 84 T50 84 T75 84 T100 84 V100 H0 Z" fill="#45E3D6" opacity="0.5" />
      <path d="M0 92 Q12 86 25 92 T50 92 T75 92 T100 92 V100 H0 Z" fill="#7FF0E6" opacity="0.45" />
      <circle className="bz-twinkle" cx="18" cy="20" r="1.6" fill="#fff" />
      <circle className="bz-twinkle" cx="34" cy="10" r="1.2" fill="#fff" style={{ animationDelay: '0.8s' }} />
    </Svg>
  );
}

function RoadArt({ id }: { id: string }) {
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A2A5E" />
          <stop offset="1" stopColor="#1A1D2B" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}bg)`} />
      <path d="M30 100 L44 0 H56 L70 100 Z" fill="rgba(0,0,0,0.25)" />
      {[8, 30, 52, 74].map((y) => (
        <rect key={y} x="48.5" y={y} width="3" height="12" rx="1" fill="#FFE08A" opacity="0.7" />
      ))}
      <circle className="bz-twinkle" cx="24" cy="70" r="4" fill="#FF3B5C" />
      <circle className="bz-twinkle" cx="76" cy="66" r="4" fill="#FF3B5C" style={{ animationDelay: '0.5s' }} />
      <circle cx="24" cy="70" r="10" fill="#FF3B5C" opacity="0.18" />
      <circle cx="76" cy="66" r="10" fill="#FF3B5C" opacity="0.18" />
    </Svg>
  );
}

function Burst({ cx, cy, r, color, delay }: { cx: number; cy: number; r: number; color: string; delay: string }) {
  const rays = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);
  return (
    <g className="bz-twinkle" style={{ animationDelay: delay }}>
      {rays.map((a, i) => (
        <line
          key={i}
          x1={cx + Math.cos(a) * r * 0.35}
          y1={cy + Math.sin(a) * r * 0.35}
          x2={cx + Math.cos(a) * r}
          y2={cy + Math.sin(a) * r}
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.16} fill={color} />
    </g>
  );
}

function FestivalArt({ id }: { id: string }) {
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2A1660" />
          <stop offset="0.6" stopColor="#5A1D6E" />
          <stop offset="1" stopColor="#8A1F6E" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}bg)`} />
      <Burst cx={24} cy={26} r={16} color="#FFD35C" delay="0s" />
      <Burst cx={78} cy={22} r={13} color="#FF4FD8" delay="0.5s" />
      <Burst cx={84} cy={70} r={11} color="#45E3D6" delay="1s" />
      <Burst cx={16} cy={78} r={9} color="#FF8FA3" delay="1.3s" />
      {/* bunting */}
      <path d="M0 6 Q50 22 100 6" stroke="rgba(255,255,255,0.45)" strokeWidth="1" fill="none" />
      {[10, 26, 42, 58, 74, 90].map((x, i) => (
        <path
          key={x}
          d={`M${x - 4} ${8 + Math.sin((x / 100) * Math.PI) * 7} l4 8 l4 -8 Z`}
          fill={['#FF3B5C', '#FFFFFF', '#FFD35C', '#FF3B5C', '#FFFFFF', '#FFD35C'][i]}
          opacity="0.85"
        />
      ))}
    </Svg>
  );
}

function SkyArt({ id }: { id: string }) {
  return (
    <Svg>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#123A6A" />
          <stop offset="0.6" stopColor="#2A70B8" />
          <stop offset="1" stopColor="#5AA6EC" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}bg)`} />
      <ellipse cx="24" cy="30" rx="16" ry="6" fill="#fff" opacity="0.2" />
      <ellipse cx="74" cy="60" rx="20" ry="7" fill="#fff" opacity="0.16" />
      <path
        d="M8 92 Q30 30 92 14"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeDasharray="4 5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <rect x="0" y="88" width="100" height="12" fill="#0B1026" opacity="0.45" />
      {[6, 26, 46, 66, 86].map((x) => (
        <rect key={x} x={x} y="93" width="10" height="2" rx="1" fill="#FFE08A" opacity="0.8" />
      ))}
      <circle className="bz-twinkle" cx="90" cy="14" r="2.4" fill="#FFE08A" />
    </Svg>
  );
}
