import clsx from 'clsx';

export interface MenuBackdropProps {
  /** 'full' = main menu title illustration; 'calm' = dimmed/blurred backdrop for sub-screens (setup, online lobby, howto). */
  variant?: 'full' | 'calm';
  /** Optional extra coloured glow (e.g. winner colour on results screen). */
  tint?: string;
  /** Kept for backwards-compatible prop signature. */
  skyline?: boolean;
}

/**
 * 2D Hand-drawn Nusantara Lobby Backdrop (`/lobby/lobby_bg_2d.webp`).
 * - On desktop & landscape screens: full-bleed `background-size: cover; background-position: center bottom`.
 * - On tall portrait phones: dual-pinned top (logo + sky) and bottom (4 corner characters + meadow) blended
 *   seamlessly through the central green meadow so neither the top MONOPOLIZ logo nor the bottom-left
 *   (Kucing Blangkon & Komodo) and bottom-right (Gatotkaca & Ondel-Ondel) characters ever get cropped!
 */
export function MenuBackdrop({ variant = 'full', tint }: MenuBackdropProps) {
  const calm = variant === 'calm';

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 h-[100dvh] min-h-[100dvh] w-full select-none overflow-hidden bg-[#1e2756]"
    >
      {/* Desktop / Landscape full-screen layer: 100% 100% keeps top Joglo roof peak + bottom characters 100% uncropped */}
      <div
        className="absolute inset-0 hidden h-[100dvh] min-h-[100dvh] w-full bg-no-repeat sm:block"
        style={{
          backgroundImage: "url('/lobby/lobby_bg_2d.webp')",
          backgroundSize: '100% 100%',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Mobile Portrait responsive composition: keeps top logo + all 4 bottom corner characters 100% uncropped */}
      <div className="absolute inset-0 flex flex-col justify-between sm:hidden">
        {/* Continuous meadow & twilight base fill connecting top and bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #1d2654 0%, #4b4369 24%, #826259 34%, #578f3c 44%, #83a355 68%, #3c6e29 88%, #1e3d1a 100%)',
          }}
        />
        {/* Top half: full width of MONOPOLIZ logo & ribbon */}
        <div
          className="relative h-[44vh] w-full shrink-0 bg-no-repeat"
          style={{
            backgroundImage: "url('/lobby/lobby_bg_2d.webp')",
            backgroundSize: '122% auto',
            backgroundPosition: 'center top',
            WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)',
            maskImage: 'linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)',
          }}
        />
        {/* Bottom half: full width of Kucing Blangkon & Komodo (left) + Gatotkaca & Ondel-Ondel (right) */}
        <div
          className="relative mt-auto h-[58vh] w-full shrink-0 bg-no-repeat"
          style={{
            backgroundImage: "url('/lobby/lobby_bg_2d.webp')",
            backgroundSize: '116% auto',
            backgroundPosition: 'center bottom',
            WebkitMaskImage: 'linear-gradient(0deg, #000 0%, #000 74%, transparent 100%)',
            maskImage: 'linear-gradient(0deg, #000 0%, #000 74%, transparent 100%)',
          }}
        />
      </div>

      {tint && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(closest-side at 50% 38%, ${tint}44, transparent 72%)`,
          }}
        />
      )}

      {calm && (
        <div
          className={clsx(
            'absolute inset-0 bg-ink-950/72 backdrop-blur-[3px]',
          )}
        />
      )}
    </div>
  );
}
