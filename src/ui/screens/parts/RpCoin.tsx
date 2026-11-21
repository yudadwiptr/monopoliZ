import clsx from 'clsx';

/** Glossy gold "Rp" coin. */
export function RpCoin({ size, className }: { size: number; className?: string }) {
  return (
    <div
      className={clsx('grid place-items-center rounded-full font-display font-bold text-gold-700', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: 'radial-gradient(circle at 35% 28%, #FFF0BF 0%, #FFD35C 38%, #E6A200 82%)',
        boxShadow: `inset 0 -${Math.max(2, size / 14)}px 0 rgba(168,111,0,0.65), inset 0 0 0 ${Math.max(1.5, size / 22)}px rgba(255,255,255,0.35), 0 ${size / 10}px ${size / 4}px rgba(0,0,0,0.35)`,
      }}
      aria-hidden
    >
      Rp
    </div>
  );
}
