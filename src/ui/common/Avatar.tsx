import clsx from 'clsx';
import { getCharacter } from '@/data/characters';

export interface AvatarProps {
  characterId: string;
  size?: number; // px
  active?: boolean; // pulsing ring (current turn)
  dimmed?: boolean; // bankrupt
  className?: string;
  ring?: boolean;
  /** 'head' crops the upper bust/head of the pawn for HUD badges; 'full' shows the whole pawn on its wooden base. */
  variant?: 'head' | 'full';
}

/**
 * Character / Pawn portrait: renders a cropped upper-half thumbnail (or full standee) of the 2D PNG pawn sprite
 * inside a glossy player-colour disc with an active turn ring.
 */
export function Avatar({
  characterId,
  size = 48,
  active,
  dimmed,
  className,
  ring = true,
  variant = 'head',
}: AvatarProps) {
  const c = getCharacter(characterId);
  return (
    <div
      className={clsx('relative shrink-0 select-none', dimmed && 'opacity-40 grayscale', className)}
      style={{ width: size, height: size }}
    >
      {active && (
        <span
          className="absolute inset-0 animate-pulse-ring rounded-full"
          style={{ boxShadow: `0 0 0 3px ${c.color}` }}
        />
      )}
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${c.color}EE, ${c.color}77 58%, #10172A 100%)`,
          boxShadow: ring
            ? `0 0 0 ${Math.max(2, size / 18)}px ${c.color}, inset 0 -${size / 10}px ${size / 5}px rgba(0,0,0,0.35), inset 0 ${size / 12}px ${size / 8}px rgba(255,255,255,0.35)`
            : undefined,
        }}
      >
        <img
          src={c.sprite}
          alt={c.name}
          draggable={false}
          className={clsx(
            'pointer-events-none select-none',
            variant === 'head'
              ? 'h-[138%] w-[138%] max-w-none translate-y-[14%] object-contain object-top'
              : 'h-[90%] w-[90%] object-contain',
          )}
          style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))' }}
        />
      </div>
    </div>
  );
}
