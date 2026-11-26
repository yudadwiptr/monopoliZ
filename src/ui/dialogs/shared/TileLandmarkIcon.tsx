import { memo } from 'react';
import type { TileDef } from '@/engine/types';

const INK = '#2B1D12';

/**
 * Dynamic 2D hand-drawn cartoon landmark/icon for every city and tourist tile on the board.
 * Rendered inside `.property-card-icon-slot` (`width: 72%; height: 72%; object-fit: contain;`)
 * in the Buy, Build, Acquire, and TileInfo cards.
 */
export const TileLandmarkIcon = memo(function TileLandmarkIcon({
  def,
  color = '#36B5D8',
  className = 'h-[76%] w-[76%] object-contain',
}: {
  def: TileDef;
  color?: string;
  className?: string;
}) {
  const key = def.name.toLowerCase();

  let art: JSX.Element;

  // ───────── DESTINASI WISATA ─────────
  if (key.includes('toba')) {
    // Danau Toba: Volcanic crater lake + Pulau Samosir + green peaks
    art = (
      <>
        <ellipse cx="32" cy="46" rx="26" ry="11" fill="#46B8D4" stroke={INK} strokeWidth="2.6" />
        <path d="M8 38 L21 15 L33 38 Z" fill="#5CA338" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M27 38 L42 12 L56 38 Z" fill="#72B844" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        {/* Samosir island in the middle of the lake */}
        <path d="M20 45 C24 37, 40 37, 44 45 Z" fill="#F2CF88" stroke={INK} strokeWidth="2.4" />
        <path d="M23 44 C26 38, 38 38, 41 44 Z" fill="#78C24B" stroke={INK} strokeWidth="2.2" />
        <path d="M16 50 H28 M36 51 H46" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  } else if (key.includes('borobudur')) {
    // Borobudur: Stepped stone candi stupa with bell dome
    art = (
      <>
        <rect x="8" y="46" width="48" height="8" rx="2" fill="#8C8379" stroke={INK} strokeWidth="2.6" />
        <rect x="14" y="38" width="36" height="8" rx="2" fill="#9E958A" stroke={INK} strokeWidth="2.6" />
        <rect x="20" y="30" width="24" height="8" rx="2" fill="#B0A79C" stroke={INK} strokeWidth="2.6" />
        <path d="M22 30 C22 15, 42 15, 42 30 Z" fill="#C4BBB0" stroke={INK} strokeWidth="2.6" />
        <rect x="29" y="11" width="6" height="6" rx="1" fill="#D6CEC3" stroke={INK} strokeWidth="2.4" />
        <polygon points="32,4 28,11 36,11" fill="#FFC21F" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      </>
    );
  } else if (key.includes('derawan') || key.includes('seribu')) {
    // Derawan: Cute green sea turtle (penyu hijau) swimming
    art = (
      <>
        <ellipse cx="32" cy="48" rx="22" ry="6" fill="#78DCF0" opacity="0.55" />
        {/* Flippers */}
        <path d="M16 26 C6 20, 5 32, 16 35 Z" fill="#78C24B" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M48 26 C58 20, 59 32, 48 35 Z" fill="#78C24B" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M20 44 C13 48, 15 54, 23 49 Z" fill="#63AD38" stroke={INK} strokeWidth="2.4" />
        <path d="M44 44 C51 48, 49 54, 41 49 Z" fill="#63AD38" stroke={INK} strokeWidth="2.4" />
        {/* Head */}
        <circle cx="32" cy="14" r="7.5" fill="#78C24B" stroke={INK} strokeWidth="2.6" />
        <circle cx="29" cy="12.5" r="1.6" fill={INK} />
        <circle cx="35" cy="12.5" r="1.6" fill={INK} />
        {/* Shell */}
        <ellipse cx="32" cy="34" rx="16" ry="14" fill="#3B8C48" stroke={INK} strokeWidth="2.8" />
        <polygon points="32,23 40,29 37,40 27,40 24,29" fill="#5CB563" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      </>
    );
  } else if (key.includes('raja ampat')) {
    // Raja Ampat: Cluster of karst coral islands in turquoise lagoon
    art = (
      <>
        <ellipse cx="32" cy="47" rx="26" ry="10" fill="#38B6D6" stroke={INK} strokeWidth="2.5" />
        {/* 3 Karst emerald islets */}
        <path d="M10 45 C11 26, 25 26, 26 45 Z" fill="#5CA338" stroke={INK} strokeWidth="2.5" />
        <path d="M36 44 C37 22, 53 22, 54 44 Z" fill="#68B040" stroke={INK} strokeWidth="2.5" />
        <path d="M21 48 C23 16, 43 16, 45 48 Z" fill="#7CC44E" stroke={INK} strokeWidth="2.6" />
        <path d="M19 48 C25 46, 41 46, 47 48" stroke="#F5D38E" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M16 52 H27 M37 52 H48" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  }
  // ───────── PETAK KOTA ─────────
  else if (key.includes('aceh')) {
    // Banda Aceh: Masjid Raya Baiturrahman dome & crescent
    art = (
      <>
        <rect x="10" y="34" width="44" height="18" rx="2" fill="#F5F0E1" stroke={INK} strokeWidth="2.6" />
        <path d="M16 34 C16 14, 48 14, 48 34 Z" fill="#374151" stroke={INK} strokeWidth="2.6" />
        <line x1="32" y1="18" x2="32" y2="9" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="32" cy="7.5" r="2.5" fill="#FFC21F" stroke={INK} strokeWidth="1.8" />
        <path d="M18 52 V41 C18 37, 25 37, 25 41 V52 Z" fill="#9E6230" stroke={INK} strokeWidth="2.2" />
        <path d="M28.5 52 V40 C28.5 36, 35.5 36, 35.5 40 V52 Z" fill="#9E6230" stroke={INK} strokeWidth="2.2" />
        <path d="M39 52 V41 C39 37, 46 37, 46 41 V52 Z" fill="#9E6230" stroke={INK} strokeWidth="2.2" />
      </>
    );
  } else if (key.includes('medan')) {
    // Medan: Istana Maimun royal yellow palace
    art = (
      <>
        <rect x="10" y="28" width="44" height="24" rx="2" fill="#FACC15" stroke={INK} strokeWidth="2.6" />
        <polygon points="8,28 32,12 56,28" fill="#D97706" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M24 28 C24 17, 40 17, 40 28 Z" fill="#374151" stroke={INK} strokeWidth="2.5" />
        <rect x="15" y="34" width="7" height="9" fill="#38BDF8" stroke={INK} strokeWidth="2.2" />
        <rect x="42" y="34" width="7" height="9" fill="#38BDF8" stroke={INK} strokeWidth="2.2" />
        <path d="M27 52 V38 C27 34, 37 34, 37 38 V52 Z" fill="#92400E" stroke={INK} strokeWidth="2.4" />
      </>
    );
  } else if (key.includes('padang')) {
    // Padang: Rumah Gadang curved horn gonjong roof
    art = (
      <>
        <rect x="14" y="30" width="36" height="21" fill="#E8B86D" stroke={INK} strokeWidth="2.6" />
        <path
          d="M6 12 Q20 34 32 15 Q44 34 58 12 L50 32 L14 32 Z"
          fill="#B91C1C"
          stroke={INK}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <rect x="19" y="36" width="8" height="8" fill="#7DD3FC" stroke={INK} strokeWidth="2.2" />
        <rect x="37" y="36" width="8" height="8" fill="#7DD3FC" stroke={INK} strokeWidth="2.2" />
        <rect x="29" y="40" width="6" height="11" fill="#78350F" stroke={INK} strokeWidth="2.2" />
      </>
    );
  } else if (key.includes('palembang')) {
    // Palembang: Red Jembatan Ampera suspension bridge
    art = (
      <>
        <rect x="6" y="46" width="52" height="10" rx="3" fill="#38BDF8" stroke={INK} strokeWidth="2.4" />
        <rect x="6" y="37" width="52" height="6" rx="1.5" fill="#D1D5DB" stroke={INK} strokeWidth="2.4" />
        <rect x="16" y="13" width="7" height="32" fill="#DC2626" stroke={INK} strokeWidth="2.5" />
        <rect x="41" y="13" width="7" height="32" fill="#DC2626" stroke={INK} strokeWidth="2.5" />
        <rect x="15" y="18" width="34" height="5" fill="#DC2626" stroke={INK} strokeWidth="2.4" />
        <path d="M6 37 Q16 24 19 15 M45 15 Q48 24 58 37" fill="none" stroke={INK} strokeWidth="2.4" />
      </>
    );
  } else if (key.includes('pontianak') || key.includes('pekanbaru') || key.includes('ikn')) {
    // Tugu Khatulistiwa / IKN modern green landmark
    art = (
      <>
        <rect x="14" y="45" width="36" height="8" rx="2" fill="#84CC16" stroke={INK} strokeWidth="2.5" />
        <rect x="20" y="24" width="24" height="21" rx="2" fill="#F8FAFC" stroke={INK} strokeWidth="2.6" />
        <circle cx="32" cy="18" r="10" fill="#38BDF8" stroke={INK} strokeWidth="2.6" />
        <ellipse cx="32" cy="18" rx="14" ry="4" fill="none" stroke="#FACC15" strokeWidth="2.6" />
        <polygon points="32,4 29,10 35,10" fill="#FACC15" stroke={INK} strokeWidth="2" />
      </>
    );
  } else if (key.includes('makassar') || key.includes('palu') || key.includes('manado')) {
    // Sulawesi: Kapal Pinisi sailing ship
    art = (
      <>
        <ellipse cx="32" cy="51" rx="24" ry="5" fill="#38BDF8" stroke={INK} strokeWidth="2.2" />
        <path d="M10 38 L54 38 L46 49 L18 49 Z" fill="#9A5B2C" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <line x1="26" y1="38" x2="26" y2="10" stroke={INK} strokeWidth="2.8" />
        <line x1="40" y1="38" x2="40" y2="15" stroke={INK} strokeWidth="2.6" />
        <polygon points="26,11 26,34 10,32" fill="#FEF3C7" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <polygon points="26,13 38,32 26,34" fill="#FDE68A" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <polygon points="40,16 54,33 40,34" fill="#FEF3C7" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      </>
    );
  } else if (key.includes('bandung') || key.includes('semarang') || key.includes('malang')) {
    // Gedung Sate (with satay pinnacle!) / Javanese heritage building
    art = (
      <>
        <rect x="10" y="28" width="44" height="23" rx="2" fill="#F8FAFC" stroke={INK} strokeWidth="2.6" />
        <polygon points="7,28 32,16 57,28" fill="#C2410C" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <line x1="32" y1="16" x2="32" y2="4" stroke={INK} strokeWidth="2.6" />
        {[6.5, 10, 13.5].map((cy) => (
          <circle key={cy} cx="32" cy={cy} r="2" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
        ))}
        {[16, 26, 36, 46].map((x) => (
          <rect key={x} x={x} y="34" width="5" height="11" rx="2.5" fill="#60A5FA" stroke={INK} strokeWidth="2" />
        ))}
      </>
    );
  } else if (key.includes('solo') || key.includes('yogyakarta')) {
    // Joglo Keraton & Tugu Jogja
    art = (
      <>
        <rect x="12" y="31" width="40" height="20" fill="#FDE68A" stroke={INK} strokeWidth="2.6" />
        <polygon points="6,31 18,22 46,22 58,31" fill="#B45309" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <polygon points="18,22 26,11 38,11 46,22" fill="#92400E" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <rect x="27" y="37" width="10" height="14" fill="#78350F" stroke={INK} strokeWidth="2.4" />
        <rect x="16" y="36" width="7" height="7" fill="#7DD3FC" stroke={INK} strokeWidth="2" />
        <rect x="41" y="36" width="7" height="7" fill="#7DD3FC" stroke={INK} strokeWidth="2" />
      </>
    );
  } else if (key.includes('denpasar') || key.includes('mataram') || key.includes('bajo')) {
    // Bali & Nusa Tenggara: Tiered Pura Meru temple pagoda
    art = (
      <>
        <rect x="14" y="43" width="36" height="10" rx="1.5" fill="#D97706" stroke={INK} strokeWidth="2.6" />
        <polygon points="8,43 32,33 56,43" fill="#78350F" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <polygon points="13,32 32,22 51,32" fill="#92400E" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <polygon points="19,21 32,10 45,21" fill="#B45309" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <rect x="28" y="45" width="8" height="8" fill="#451A03" stroke={INK} strokeWidth="2" />
      </>
    );
  } else if (key.includes('jakarta') || key.includes('surabaya')) {
    // Monas / Tugu Pahlawan obelisk with golden flame
    art = (
      <>
        <polygon points="10,49 54,49 48,41 16,41" fill="#E2E8F0" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <polygon points="15,36 49,36 41,41 23,41" fill="#F8FAFC" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <polygon points="27,36 29,16 35,16 37,36" fill="#FFFFFF" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <rect x="25" y="13" width="14" height="4" rx="1" fill="#FACC15" stroke={INK} strokeWidth="2.2" />
        <path d="M32 3 C37 7, 36 11, 32 13 C28 11, 27 7, 32 3 Z" fill="#FF8A00" stroke={INK} strokeWidth="2.2" />
      </>
    );
  } else {
    // Fallback colourful 2D Nusantara house tinted with the tile's group colour
    art = (
      <>
        <rect x="12" y="27" width="40" height="24" rx="2" fill="#FEF3C7" stroke={INK} strokeWidth="2.6" />
        <polygon points="7,28 32,11 57,28" fill={color} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <rect x="18" y="33" width="9" height="9" fill="#7DD3FC" stroke={INK} strokeWidth="2.2" />
        <rect x="34" y="33" width="11" height="18" fill="#92400E" stroke={INK} strokeWidth="2.2" />
      </>
    );
  }

  return (
    <svg viewBox="0 0 64 60" className={className} aria-hidden>
      {art}
    </svg>
  );
});
