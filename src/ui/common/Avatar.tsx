import clsx from 'clsx';
import { getCharacter } from '@/data/characters';

export interface AvatarProps {
  characterId: string;
  size?: number; // px
  active?: boolean; // pulsing ring (current turn)
  dimmed?: boolean; // bankrupt
  className?: string;
  ring?: boolean;
}

/** Character portrait: emoji on a glossy colour disc with a player-colour ring. */
export function Avatar({ characterId, size = 48, active, dimmed, className, ring = true }: AvatarProps) {
  const c = getCharacter(characterId);
  return (
    <div
      className={clsx('relative shrink-0', dimmed && 'opacity-40 grayscale', className)}
      style={{ width: size, height: size }}
    >
      {active && (
        <span
          className="absolute inset-0 animate-pulse-ring rounded-full"
          style={{ boxShadow: `0 0 0 3px ${c.color}` }}
        />
      )}
      <div
        className="relative flex h-full w-full items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${c.color}EE, ${c.color}88 55%, ${c.color}44 100%)`,
          boxShadow: ring
            ? `0 0 0 ${Math.max(2, size / 18)}px ${c.color}, inset 0 -${size / 10}px ${size / 5}px rgba(0,0,0,0.25), inset 0 ${size / 12}px ${size / 8}px rgba(255,255,255,0.35)`
            : undefined,
        }}
      >
        <span style={{ fontSize: size * 0.56, lineHeight: 1 }} aria-hidden>
          {c.emoji}
        </span>
      </div>
    </div>
  );
}
