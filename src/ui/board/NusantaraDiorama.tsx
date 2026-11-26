import { memo } from 'react';

/**
 * Hand-drawn Meow Gambit-inspired Nusantara Island Diorama for the center of the board.
 * Features lush green meadows, winding dirt trails, a river spanned by the red Jembatan Ampera,
 * Candi Borobudur, Monas, a smoking Gunung Berapi volcano, Rumah Gadang, Rumah Joglo, and Danau Toba.
 */
export const NusantaraDiorama = memo(function NusantaraDiorama() {
  const ink = '#2B1D12';
  return (
    <svg
      className="bz-diorama-svg"
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="mg-grass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8BD15A" />
          <stop offset="50%" stopColor="#72B842" />
          <stop offset="100%" stopColor="#5D9E31" />
        </linearGradient>
        <linearGradient id="mg-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7EE0F5" />
          <stop offset="100%" stopColor="#46B1C9" />
        </linearGradient>
        <linearGradient id="mg-volcano" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8C7A6B" />
          <stop offset="55%" stopColor="#6E5D4F" />
          <stop offset="100%" stopColor="#524338" />
        </linearGradient>
      </defs>

      {/* Base lush island meadow */}
      <rect width="600" height="600" fill="url(#mg-grass)" />

      {/* Soft rolling hill patches & darker forest zones */}
      <ellipse cx="140" cy="110" rx="145" ry="90" fill="#63A837" opacity="0.65" />
      <ellipse cx="470" cy="480" rx="150" ry="110" fill="#5E9E34" opacity="0.6" />
      <ellipse cx="310" cy="300" rx="125" ry="75" fill="#58962F" opacity="0.5" />
      <ellipse cx="110" cy="480" rx="120" ry="95" fill="#82C952" opacity="0.55" />

      {/* Top-right lake behind Monas */}
      <path
        d="M365 88 C395 68, 470 65, 515 86 C550 102, 552 145, 518 164 C480 185, 430 172, 392 162 C355 152, 340 105, 365 88 Z"
        fill="url(#mg-water)"
        stroke={ink}
        strokeWidth="3"
      />
      <path d="M415 110 H448 M460 135 H492 M395 142 H420" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />

      {/* Background green hills near top-middle (behind volcano & Monas) */}
      <path
        d="M275 135 Q330 62 385 135 Z"
        fill="#69AE3B"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M335 145 Q380 82 425 145 Z"
        fill="#7CC24B"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Winding Sandy Adventure Trails (Meow Gambit board paths) */}
      <path
        d="M225 0 C265 45, 330 85, 395 165 C440 220, 415 275, 465 305 L600 320"
        fill="none"
        stroke={ink}
        strokeWidth="30"
        strokeLinecap="round"
      />
      <path
        d="M225 0 C265 45, 330 85, 395 165 C440 220, 415 275, 465 305 L600 320"
        fill="none"
        stroke="#E8C892"
        strokeWidth="23"
        strokeLinecap="round"
      />

      <path
        d="M0 495 C85 455, 175 395, 250 405 C315 415, 325 495, 395 490 C465 485, 495 405, 600 410"
        fill="none"
        stroke={ink}
        strokeWidth="28"
        strokeLinecap="round"
      />
      <path
        d="M0 495 C85 455, 175 395, 250 405 C315 415, 325 495, 395 490 C465 485, 495 405, 600 410"
        fill="none"
        stroke="#E8C892"
        strokeWidth="21"
        strokeLinecap="round"
      />

      {/* Winding Turquoise River from central highlands to bottom-left */}
      <path
        d="M250 320 C215 355, 195 395, 225 455 C248 500, 235 555, 215 605"
        fill="none"
        stroke={ink}
        strokeWidth="48"
        strokeLinecap="round"
      />
      <path
        d="M250 320 C215 355, 195 395, 225 455 C248 500, 235 555, 215 605"
        fill="none"
        stroke="url(#mg-water)"
        strokeWidth="41"
        strokeLinecap="round"
      />
      {/* River current ripples */}
      <path
        d="M218 375 C208 395, 210 415, 220 435 M232 490 C238 515, 234 540, 225 568"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Danau Toba (Bottom-Right Crater Lake & Hills) */}
      <g transform="translate(350, 445)">
        <path
          d="M15 95 Q65 25 125 95 Z"
          fill="#5B9E31"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M115 95 Q165 30 220 95 Z"
          fill="#68AE3B"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M55 72 C75 45, 155 42, 185 68 C210 90, 198 132, 160 144 C118 156, 62 145, 45 118 C32 98, 38 88, 55 72 Z"
          fill="url(#mg-water)"
          stroke={ink}
          strokeWidth="3.2"
        />
        <text
          x="120"
          y="100"
          textAnchor="middle"
          fill="#1D3B2A"
          fontFamily="Fredoka, sans-serif"
          fontWeight="700"
          fontSize="16"
        >
          Danau
        </text>
        <text
          x="120"
          y="118"
          textAnchor="middle"
          fill="#1D3B2A"
          fontFamily="Fredoka, sans-serif"
          fontWeight="700"
          fontSize="16"
        >
          Toba
        </text>
        <path
          d="M-15 155 Q45 92 108 155 Z"
          fill="#63A837"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M72 155 Q138 88 205 155 Z"
          fill="#74B844"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>

      {/* ───────── CANDI BOROBUDUR (Top-Left Landmark) ───────── */}
      <g transform="translate(145, 148)">
        {/* Drop shadow */}
        <polygon points="0,58 118,8 228,58 114,108" fill="rgba(0,0,0,0.18)" />
        {/* Tier 1 Base */}
        <polygon points="6,52 114,4 222,52 114,100" fill="#8C857B" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <polygon points="6,52 114,100 114,114 6,66" fill="#70695F" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <polygon points="222,52 114,100 114,114 222,66" fill="#59534B" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        {/* Tier 2 */}
        <polygon points="26,44 114,6 202,44 114,82" fill="#9E968B" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        <polygon points="26,44 114,82 114,94 26,56" fill="#7D766C" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        <polygon points="202,44 114,82 114,94 202,56" fill="#635D54" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        {/* Tier 3 */}
        <polygon points="48,35 114,7 180,35 114,64" fill="#AEA69B" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
        <polygon points="48,35 114,64 114,74 48,45" fill="#8A8277" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
        <polygon points="180,35 114,64 114,74 180,45" fill="#6E675E" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
        {/* Tier 4 Circular Terrace */}
        <ellipse cx="114" cy="28" rx="44" ry="19" fill="#BDB5AA" stroke={ink} strokeWidth="2.6" />
        <ellipse cx="114" cy="21" rx="30" ry="13" fill="#CEC6BB" stroke={ink} strokeWidth="2.5" />
        {/* Mini stupas */}
        {[-24, -12, 0, 12, 24].map((dx, i) => (
          <circle key={i} cx={114 + dx} cy={28 + Math.abs(dx) * 0.25} r="4.5" fill="#8A8277" stroke={ink} strokeWidth="2" />
        ))}
        {/* Main Central Stupa Bell + Spire */}
        <path d="M98 18 C98 2, 130 2, 130 18 Z" fill="#ACA499" stroke={ink} strokeWidth="2.8" />
        <rect x="110" y="-6" width="8" height="9" rx="2" fill="#ACA499" stroke={ink} strokeWidth="2.4" />
        <polygon points="114,-18 109,-6 119,-6" fill="#D6CFC4" stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      </g>

      {/* ───────── GUNUNG BERAPI / MERAPI (Center Smoking Volcano) ───────── */}
      <g transform="translate(295, 255)">
        {/* Lush jungle ring around volcano base */}
        <ellipse cx="15" cy="48" rx="108" ry="42" fill="#4E8F2B" stroke={ink} strokeWidth="2.8" />
        {/* Volcano Cone */}
        <path
          d="M-68 38 L-16 -46 C-6 -52, 24 -52, 34 -46 L92 38 C52 54, -28 54, -68 38 Z"
          fill="url(#mg-volcano)"
          stroke={ink}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Crater rim & lava glow */}
        <ellipse cx="9" cy="-46" rx="24" ry="7.5" fill="#3D2E24" stroke={ink} strokeWidth="2.8" />
        <ellipse cx="9" cy="-45" rx="14" ry="3.8" fill="#FF6B35" />
        {/* Ridge lines */}
        <path d="M-6 -39 L-28 32 M12 -38 L18 40 M26 -40 L56 30" stroke={ink} strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
        {/* Cartoon White Steam / Smoke Cloud */}
        <path
          d="M6 -52 C-12 -64, -8 -85, 10 -88 C16 -104, 42 -106, 52 -92 C72 -94, 82 -74, 66 -62 C52 -52, 24 -52, 6 -52 Z"
          fill="#F8FAFC"
          stroke={ink}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
      </g>

      {/* ───────── MONAS (Upper-Right Landmark) ───────── */}
      <g transform="translate(432, 200)">
        <ellipse cx="0" cy="36" rx="54" ry="20" fill="rgba(0,0,0,0.16)" />
        {/* Base Platform */}
        <polygon points="-50,26 0,6 50,26 0,46" fill="#E8E4D8" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        <polygon points="-50,26 0,46 0,55 -50,35" fill="#CFC9B8" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        <polygon points="50,26 0,46 0,55 50,35" fill="#B5AE9B" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        {/* Goblet (Cawan) */}
        <polygon points="-34,16 34,16 20,30 -20,30" fill="#F5F2E8" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        <polygon points="-38,12 0,-2 38,12 0,24" fill="#FFFFFF" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        {/* Obelisk Tower */}
        <polygon points="-8,12 -5,-88 5,-88 8,12" fill="#FFFFFF" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        <line x1="0" y1="12" x2="0" y2="-88" stroke="#D8D2C5" strokeWidth="2" />
        {/* Observation Deck */}
        <polygon points="-13,-88 0,-94 13,-88 0,-82" fill="#F5F2E8" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
        {/* Golden Flame (Lidah Api) */}
        <path
          d="M0 -116 C9 -106, 8 -96, 0 -90 C-8 -96, -9 -106, 0 -116 Z"
          fill="#FFC21F"
          stroke={ink}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </g>

      {/* ───────── JEMBATAN AMPERA / MERAH (Bottom-Left Suspension Bridge) ───────── */}
      <g transform="translate(152, 425)">
        {/* Bridge road deck */}
        <polygon points="-24,35 92,-28 112,-18 -4,45" fill="#C9A66B" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        {/* Left Red Pylon Tower */}
        <g transform="translate(10, 18)">
          <rect x="-8" y="-62" width="7" height="72" fill="#D93829" stroke={ink} strokeWidth="2.6" />
          <rect x="7" y="-56" width="7" height="72" fill="#D93829" stroke={ink} strokeWidth="2.6" />
          <line x1="-4" y1="-46" x2="10" y2="-40" stroke="#D93829" strokeWidth="5" />
          <line x1="-4" y1="-26" x2="10" y2="-20" stroke="#D93829" strokeWidth="5" />
        </g>
        {/* Right Red Pylon Tower */}
        <g transform="translate(72, -16)">
          <rect x="-8" y="-62" width="7" height="72" fill="#D93829" stroke={ink} strokeWidth="2.6" />
          <rect x="7" y="-56" width="7" height="72" fill="#D93829" stroke={ink} strokeWidth="2.6" />
          <line x1="-4" y1="-46" x2="10" y2="-40" stroke="#D93829" strokeWidth="5" />
          <line x1="-4" y1="-26" x2="10" y2="-20" stroke="#D93829" strokeWidth="5" />
        </g>
        {/* Suspension cables */}
        <path d="M5 -42 Q42 -22 67 -76" fill="none" stroke={ink} strokeWidth="2.6" />
        <path d="M18 -36 Q54 -16 80 -70" fill="none" stroke={ink} strokeWidth="2.6" />
        <line x1="28" y1="-28" x2="28" y2="12" stroke={ink} strokeWidth="2" />
        <line x1="44" y1="-34" x2="44" y2="4" stroke={ink} strokeWidth="2" />
        <line x1="58" y1="-44" x2="58" y2="-4" stroke={ink} strokeWidth="2" />
      </g>

      {/* ───────── RUMAH GADANG (Lower-Center Traditional Minang House) ───────── */}
      <g transform="translate(328, 435)">
        {/* Stilts */}
        <line x1="-30" y1="18" x2="-30" y2="34" stroke={ink} strokeWidth="3.2" />
        <line x1="-10" y1="22" x2="-10" y2="38" stroke={ink} strokeWidth="3.2" />
        <line x1="12" y1="22" x2="12" y2="38" stroke={ink} strokeWidth="3.2" />
        <line x1="30" y1="18" x2="30" y2="34" stroke={ink} strokeWidth="3.2" />
        {/* Wooden Body */}
        <polygon points="-36,0 0,10 36,0 32,24 0,32 -32,24" fill="#C88A4B" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        {/* Curved Horn Gonjong Roof */}
        <path
          d="M-48 -28 Q-24 2 0 -22 Q24 2 48 -28 L38 4 L0 14 L-38 4 Z"
          fill="#7A441E"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Windows */}
        <rect x="-20" y="6" width="8" height="10" fill="#FFE08A" stroke={ink} strokeWidth="2" />
        <rect x="12" y="6" width="8" height="10" fill="#FFE08A" stroke={ink} strokeWidth="2" />
      </g>

      {/* ───────── RUMAH JOGLO (Left & Right Traditional Houses) ───────── */}
      <g transform="translate(95, 295)">
        <polygon points="-28,6 0,18 28,6 28,28 0,40 -28,28" fill="#D49A5A" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        <polygon points="-36,8 0,-22 36,8 0,20" fill="#8C4F23" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <line x1="-22" y1="28" x2="-22" y2="42" stroke={ink} strokeWidth="3" />
        <line x1="0" y1="38" x2="0" y2="50" stroke={ink} strokeWidth="3" />
        <line x1="22" y1="28" x2="22" y2="42" stroke={ink} strokeWidth="3" />
      </g>

      <g transform="translate(472, 382)">
        <polygon points="-30,6 0,18 30,6 30,26 0,38 -30,26" fill="#D49A5A" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
        <polygon points="-38,8 0,-20 38,8 0,20" fill="#8C4F23" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <line x1="-22" y1="26" x2="-22" y2="40" stroke={ink} strokeWidth="3" />
        <line x1="0" y1="36" x2="0" y2="48" stroke={ink} strokeWidth="3" />
        <line x1="22" y1="26" x2="22" y2="40" stroke={ink} strokeWidth="3" />
      </g>

      {/* ───────── LUSH TROPICAL TREES & GRASS TUFTS ───────── */}
      {[
        [45, 75, 1.05],
        [90, 52, 0.9],
        [248, 82, 0.95],
        [42, 215, 0.9],
        [185, 315, 1.0],
        [395, 340, 0.95],
        [545, 255, 1.0],
        [52, 545, 1.05],
        [292, 535, 0.9],
      ].map(([tx, ty, sc], idx) => (
        <g key={idx} transform={`translate(${tx}, ${ty}) scale(${sc})`}>
          <rect x="-4" y="10" width="8" height="16" rx="2" fill="#7A4924" stroke={ink} strokeWidth="2.4" />
          <circle cx="-10" cy="4" r="13" fill="#4D9428" stroke={ink} strokeWidth="2.5" />
          <circle cx="10" cy="4" r="13" fill="#4D9428" stroke={ink} strokeWidth="2.5" />
          <circle cx="0" cy="-6" r="15" fill="#63AD38" stroke={ink} strokeWidth="2.5" />
        </g>
      ))}
    </svg>
  );
});
