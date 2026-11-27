import type { CSSProperties } from 'react';
import type { TileKind } from '@/engine/types';

interface ArtProps {
  kind: TileKind;
  icon: string;
}

const CHIBI_SHEET_BASE: CSSProperties = {
  width: '84%',
  height: '84%',
  aspectRatio: '1 / 1',
  backgroundImage: "url('/sprites/icons_chibi_sheet.webp')",
  backgroundSize: '400% 200%',
  backgroundRepeat: 'no-repeat',
};

/**
 * 2D Hand-drawn Chibi Corner Tile Illustrations:
 * - start: Indonesian Gapura Merah-Putih gate with flag
 * - island: `/sprites/icons_chibi_sheet.webp` Row 2, Col 2 (`33.33% 100%`)
 * - festival: Pesta Rakyat festive bunting
 * - airport: `/sprites/icons_chibi_sheet.webp` Row 2, Col 3 (`66.66% 100%`)
 */
export function CornerArt({ kind }: ArtProps) {
  switch (kind) {
    case 'start':
      return (
        <div className="bz-corner-icon-slot" aria-hidden>
          <StartGapuraArt />
        </div>
      );
    case 'island':
      return (
        <div className="bz-corner-icon-slot" aria-hidden>
          <div
            className="bz-corner-sprite"
            style={{
              ...CHIBI_SHEET_BASE,
              backgroundPosition: '33.33% 100%',
            }}
          />
        </div>
      );
    case 'festival':
      return (
        <div className="bz-corner-icon-slot" aria-hidden>
          <FestivalBuntingArt />
        </div>
      );
    case 'airport':
      return (
        <div className="bz-corner-icon-slot" aria-hidden>
          <div
            className="bz-corner-sprite"
            style={{
              ...CHIBI_SHEET_BASE,
              backgroundPosition: '66.66% 100%',
            }}
          />
        </div>
      );
    default:
      return null;
  }
}

const INK = '#2B1D12';

function StartGapuraArt() {
  return (
    <svg className="bz-corner-svg" viewBox="0 0 100 72" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <ellipse cx="50" cy="64" rx="36" ry="6" fill="#B8CE82" />
      <line x1="50" y1="30" x2="50" y2="6" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <rect x="50" y="7" width="17" height="6" fill="#E03C28" stroke={INK} strokeWidth="1.8" />
      <rect x="50" y="13" width="17" height="6" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" />
      <rect x="24" y="28" width="52" height="7" rx="1.5" fill="#D9412E" stroke={INK} strokeWidth="2.4" />
      <rect x="28" y="35" width="44" height="4" fill="#F2B830" stroke={INK} strokeWidth="2" />
      <rect x="27" y="23" width="11" height="39" fill="#E04834" stroke={INK} strokeWidth="2.4" />
      <rect x="62" y="23" width="11" height="39" fill="#E04834" stroke={INK} strokeWidth="2.4" />
      <polygon points="26,23 32.5,14 39,23" fill="#F2B830" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <polygon points="61,23 67.5,14 74,23" fill="#F2B830" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="24" y="59" width="17" height="5" rx="1" fill="#8C7E70" stroke={INK} strokeWidth="2.2" />
      <rect x="59" y="59" width="17" height="5" rx="1" fill="#8C7E70" stroke={INK} strokeWidth="2.2" />
    </svg>
  );
}

function FestivalBuntingArt() {
  return (
    <svg className="bz-corner-svg" viewBox="0 0 100 66" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <path d="M6 12 Q50 30 94 12" stroke={INK} strokeWidth="2.4" fill="none" />
      {[16, 33, 50, 67, 84].map((x, i) => (
        <polygon
          key={x}
          points={`${x - 7},${14 + Math.sin((x / 100) * Math.PI) * 8} ${x + 7},${14 + Math.sin((x / 100) * Math.PI) * 8} ${x},${30 + Math.sin((x / 100) * Math.PI) * 8}`}
          fill={['#E84C3D', '#F2C12E', '#36B5D8', '#E85C9E', '#72B842'][i]}
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      <path d="M14 40 Q50 56 86 40" stroke={INK} strokeWidth="2.2" fill="none" />
      {[24, 41, 59, 76].map((x, i) => (
        <polygon
          key={x}
          points={`${x - 6},${42 + Math.sin((x / 100) * Math.PI) * 7} ${x + 6},${42 + Math.sin((x / 100) * Math.PI) * 7} ${x},${55 + Math.sin((x / 100) * Math.PI) * 7}`}
          fill={['#F2C12E', '#E85C9E', '#72B842', '#36B5D8'][i]}
          stroke={INK}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
