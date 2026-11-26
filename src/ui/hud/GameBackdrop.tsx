/**
 * Full-screen 2D illustrated Archipelago In-Game Backdrop (`/board/ingame_bg_2d.png`).
 * The open sea in the center aligns behind the square game board while the illustrated islands
 * and boats on the left and right frame the board naturally.
 */
export function GameBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 h-[100dvh] min-h-[100dvh] w-screen select-none overflow-hidden bg-[#163d4a]"
      aria-hidden
    >
      <div
        className="h-full w-full"
        style={{
          backgroundImage: "url('/board/ingame_bg_2d.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
          filter: 'brightness(0.68) saturate(0.92)',
        }}
      />
      {/* Dark focus overlay & vignette so visual attention stays locked on the center game board and HUD */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 62% 62% at 50% 50%, rgba(8, 22, 34, 0.24) 0%, rgba(6, 16, 28, 0.56) 100%)',
        }}
      />
    </div>
  );
}
