import clsx from 'clsx';
import { LEVEL_NAMES } from '@/engine/economy';

const OUT = '#0B1026';
const SW = 2;

export interface LevelArtProps {
  level: number; // 0 Tanah … 4 Landmark
  size?: number;
  className?: string;
  /** Greyed-out look for locked / unaffordable options */
  muted?: boolean;
}

const LEVEL_BG_POS: Record<number, string> = {
  1: '0% 0%',       // Baris 1, Kolom 1: Rumah
  2: '33.33% 0%',   // Baris 1, Kolom 2: Ruko
  3: '66.66% 0%',   // Baris 1, Kolom 3: Hotel
  4: '100% 0%',     // Baris 1, Kolom 4: Landmark
};

/**
 * 2D illustrated chibi building sprites for each property level:
 * Level 0 uses a grass plot + flag; Levels 1–4 render `/sprites/icons_chibi_sheet.webp` with `mix-blend-mode: multiply`.
 */
export function LevelArt({ level, size = 40, className, muted }: LevelArtProps) {
  const bgPos = LEVEL_BG_POS[level];
  if (bgPos) {
    return (
      <span
        role="img"
        aria-label={LEVEL_NAMES[level] ?? 'Bangunan'}
        className={clsx('inline-block shrink-0 select-none', muted && 'opacity-50 grayscale', className)}
        style={{
          width: size,
          height: size,
          backgroundImage: "url('/sprites/icons_chibi_sheet.webp')",
          backgroundSize: '400% 200%',
          backgroundPosition: bgPos,
          backgroundRepeat: 'no-repeat',
        }}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={clsx('shrink-0 overflow-visible', muted && 'opacity-50 grayscale', className)}
      role="img"
      aria-label={LEVEL_NAMES[level] ?? 'Bangunan'}
    >
      <ellipse cx="24" cy="42" rx="17" ry="3.6" fill="#000" opacity="0.28" />
      <Tanah />
    </svg>
  );
}

const stroke = { stroke: OUT, strokeWidth: SW, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** Grass plot with a merah-putih flag: "tanah ini sudah ada yang punya". */
function Tanah() {
  return (
    <g>
      <path d="M6 38 Q24 30 42 38 Q24 45 6 38Z" fill="#2EE59D" {...stroke} />
      <path d="M13 37.5 q1.5 -2.5 3 0 M30 36.5 q1.5 -2.5 3 0" fill="none" stroke="#14B877" strokeWidth={1.6} strokeLinecap="round" />
      <line x1="20" y1="38" x2="20" y2="8" {...stroke} strokeWidth={2.6} />
      <rect x="20" y="9" width="16" height="6.5" fill="#FF3B5C" />
      <rect x="20" y="15.5" width="16" height="6.5" fill="#FFFFFF" />
      <rect x="20" y="9" width="16" height="13" rx="1.5" fill="none" {...stroke} />
      <circle cx="20" cy="7.5" r="2" fill="#FFD35C" {...stroke} strokeWidth={1.5} />
    </g>
  );
}

function Rumah() {
  return (
    <g>
      <rect x="11" y="22" width="26" height="18" rx="2" fill="#FFF0BF" {...stroke} />
      <rect x="29" y="9" width="5" height="9" fill="#C9603F" {...stroke} />
      <path d="M6.5 24 L24 9 L41.5 24 Z" fill="#FF7A59" {...stroke} />
      <path d="M12 21 L24 11.5 L36 21" fill="none" stroke="#FFB08F" strokeWidth={1.6} strokeLinecap="round" />
      <rect x="20.5" y="29" width="7" height="11" rx="1.5" fill="#3A8CD6" {...stroke} />
      <rect x="13.5" y="26.5" width="5" height="5" rx="1" fill="#FFD35C" {...stroke} strokeWidth={1.5} />
      <rect x="29.5" y="26.5" width="5" height="5" rx="1" fill="#FFD35C" {...stroke} strokeWidth={1.5} />
    </g>
  );
}

/** Two-storey shophouse with a striped awning. */
function Ruko() {
  return (
    <g>
      <rect x="9" y="11" width="30" height="29" rx="2" fill="#BFE0FB" {...stroke} />
      <rect x="7" y="8" width="34" height="5.5" rx="2" fill="#2A70B8" {...stroke} />
      <rect x="13" y="16.5" width="7" height="6" rx="1" fill="#FFD35C" {...stroke} strokeWidth={1.5} />
      <rect x="28" y="16.5" width="7" height="6" rx="1" fill="#FFD35C" {...stroke} strokeWidth={1.5} />
      <rect x="12" y="31" width="24" height="9" fill="#FFE08A" {...stroke} />
      <line x1="24" y1="31" x2="24" y2="40" {...stroke} strokeWidth={1.5} />
      <path d="M7.5 25.5 H40.5 L38 31.5 H10 Z" fill="#FFFFFF" {...stroke} />
      <path d="M13.5 25.5 L13 31.5 H17.5 L18 25.5Z M23 25.5 L22.8 31.5 H27.2 L27 25.5Z M32 25.5 L32.5 31.5 H37 L36.5 25.5Z" fill="#FF5C7A" />
      <path d="M7.5 25.5 H40.5 L38 31.5 H10 Z" fill="none" {...stroke} />
    </g>
  );
}

/** Night-lit hotel tower with a gold "H" sign. */
function Hotel() {
  const windows: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) windows.push([16.5 + c * 5.5, 13 + r * 5.5]);
  return (
    <g>
      <rect x="13" y="7" width="22" height="33" rx="2.5" fill="#5AA6EC" {...stroke} />
      <rect x="13" y="7" width="5" height="33" fill="#8CC4F5" opacity="0.6" />
      <rect x="13" y="7" width="22" height="33" rx="2.5" fill="none" {...stroke} />
      {windows.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="3.6" height="3.2" rx="0.8" fill={i % 4 === 1 ? '#1C5290' : '#FFE08A'} />
      ))}
      <rect x="20.5" y="34" width="7" height="6" rx="1" fill="#1C5290" {...stroke} strokeWidth={1.5} />
      <rect x="18" y="1.5" width="12" height="7" rx="2" fill="#FFC21F" {...stroke} />
      <path d="M21.6 3.4 V6.6 M26.4 3.4 V6.6 M21.6 5 H26.4" stroke={OUT} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

/** Golden monument with a flame and sparkles — the sultan level. */
function Landmark() {
  return (
    <g>
      <rect x="9" y="35" width="30" height="5.5" rx="1.5" fill="#E6A200" {...stroke} />
      <rect x="13.5" y="30" width="21" height="5.5" rx="1.5" fill="#FFD35C" {...stroke} />
      <path d="M19.5 30 L21.8 13 H26.2 L28.5 30 Z" fill="#FFE08A" {...stroke} />
      <path d="M22.4 15 L21 28" stroke="#FFF0BF" strokeWidth={1.6} strokeLinecap="round" />
      <rect x="20.5" y="10.5" width="7" height="3" rx="1" fill="#E6A200" {...stroke} strokeWidth={1.5} />
      <path d="M24 1.5 C28 5.5 27.6 9 24 10.5 C20.4 9 20 5.5 24 1.5Z" fill="#FF5C7A" {...stroke} strokeWidth={1.6} />
      <path d="M24 5 C25.4 6.8 25.2 8.3 24 9 C22.8 8.3 22.6 6.8 24 5Z" fill="#FFE08A" />
      <Sparkle x={8.5} y={13} s={3.2} />
      <Sparkle x={40} y={19} s={2.6} />
      <Sparkle x={37} y={6} s={1.8} />
    </g>
  );
}

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z`}
      fill="#FFF0BF"
    />
  );
}
