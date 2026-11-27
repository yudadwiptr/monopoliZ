import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { MapDef, TileDef } from '@/engine/types';
import { TileLandmarkIcon } from './TileLandmarkIcon';
import { tileColor, tileGroupLabel } from './tileInfo';

export interface PropertyHeaderProps {
  map: MapDef;
  def: TileDef;
  titleId: string;
  /** Pill(s) shown on the header's right side (price, current level, owner…) */
  badge?: ReactNode;
  /** Optional line under the subtitle */
  children?: ReactNode;
  className?: string;
}

/**
 * 2D Hand-Drawn Property Card Header integrated directly into the full-modal `/ui/card_beli_properti_blank.webp` frame:
 * - `.property-card-icon-slot` is positioned at `top: 7.2%; left: 50%; transform: translateX(-50%); width: 17.5%; aspect-ratio: 1 / 1; background: transparent;`
 *   directly over the white square box already drawn in `/ui/card_beli_properti_blank.webp`.
 * - The category/region label sits centered inside the dark teal ribbon plaque (`top: 23.2%; left: 50%; transform: translateX(-50%)`).
 * - City title (`#1e130c`) and province subtitle (`#5c4028`) sit on the cream parchment immediately below the plaque.
 */
export function PropertyHeader({ map, def, titleId, badge, children, className }: PropertyHeaderProps) {
  const color = tileColor(map, def);
  const isTourist = def.kind === 'tourist';

  return (
    <>
      {/* Optional Price / Discount / Level badge at top-right of the tropical banner */}
      {badge && (
        <div
          className="z-10 flex items-center gap-1"
          style={{
            position: 'absolute',
            top: '7.5%',
            right: '8.5%',
          }}
        >
          {badge}
        </div>
      )}

      {/*
        Dynamic Icon Slot (`.property-card-icon-slot`):
        Static outer div handles `left: 50%; transform: translateX(-50%)` so Framer Motion scale animation
        on the inner icon never overwrites `translateX(-50%)`!
      */}
      <div
        className="property-card-icon-slot"
        style={{
          position: 'absolute',
          top: '7.2%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '17.5%',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          zIndex: 5,
        }}
      >
        <motion.div
          key={def.index}
          className="flex h-full w-full items-center justify-center"
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 18 }}
        >
          <TileLandmarkIcon def={def} color={color} className="h-[75%] w-[75%] object-contain" />
        </motion.div>
      </div>

      {/* Category / Region Badge centered inside the dark teal ribbon plaque below the icon box */}
      <div
        style={{
          position: 'absolute',
          top: '23.1%',
          left: '50%',
          transform: 'translateX(-50%)',
          height: '5.2%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 6,
        }}
      >
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap px-2 font-display font-black uppercase text-[#fff8e7] drop-shadow-[0_1.5px_0_#102a2e]"
          style={{
            fontSize: '10px',
            letterSpacing: '0.08em',
          }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full border border-[#102a2e] shadow-sm"
            style={{ background: isTourist ? '#22D3C5' : color }}
            aria-hidden
          />
          {tileGroupLabel(map, def)}
        </span>
      </div>

      {/* City / Tourist Name & Province Subtitle on the cream parchment below the dark teal plaque */}
      <div className={clsx('flex w-full flex-col items-center text-center', className)}>
        <h2
          id={titleId}
          className="w-full truncate font-display"
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: '#1e130c',
            lineHeight: 1.15,
          }}
        >
          {def.name}
        </h2>
        {def.subtitle && (
          <p
            className="mt-0.5 w-full truncate font-display font-semibold"
            style={{
              fontSize: '12px',
              color: '#5c4028',
              lineHeight: 1.2,
            }}
          >
            {def.subtitle}
          </p>
        )}
        {children && <div className="mt-1.5 w-full">{children}</div>}
      </div>
    </>
  );
}

/** Small pill used inside header bands and stat rows. */
export function Pill({
  children,
  tone = 'dark',
  className,
}: {
  children: ReactNode;
  tone?: 'dark' | 'gold' | 'merah' | 'daun' | 'brand';
  className?: string;
}) {
  const tones: Record<string, string> = {
    dark: 'bg-[#fff8e7]/95 text-[#2b1d12] border-[#5c4028]',
    gold: 'bg-gradient-to-b from-gold-300 to-gold-500 text-[#1e130c] border-[#5c4028]',
    merah: 'bg-merah-500 text-white border-[#2b1d12]',
    daun: 'bg-daun-500 text-[#1e130c] border-[#2b1d12]',
    brand: 'bg-brand-500 text-white border-[#2b1d12]',
  };
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border-[1.5px] px-2 font-display text-[10.5px] font-extrabold shadow-sm',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
