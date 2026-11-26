/**
 * Full-screen 2D illustrated Archipelago In-Game Backdrop (`/board/ingame_bg_2d.png`).
 * The open sea in the center aligns behind the square game board while the illustrated islands
 * and boats on the left and right frame the board naturally.
 */
export function GameBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 h-[100dvh] min-h-[100dvh] w-screen select-none overflow-hidden bg-[#389ab2]"
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
        }}
      />
      {/* Subtle corner vignette so the 4 corner HUD cards and bottom dice dock pop with extra contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 55%, rgba(10, 32, 46, 0.28) 100%)',
        }}
      />
    </div>
  );
}
