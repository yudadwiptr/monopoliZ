/**
 * Responsive layout maths for the game screen.
 *  - portrait: top bar, panel row, board stacked vertically (tablets upright; phones are asked to rotate)
 *  - wide:     top bar across, slim panels in the four screen corners, board centred / full-bleed
 *  - short:    phone landscape — same as wide with narrower panels and a compact top bar
 */
export type HudMode = 'portrait' | 'wide' | 'short';
export type PanelSize = 'full' | 'compact' | 'mini';
export type Corner = 'tl' | 'bl' | 'tr' | 'br';

export interface HudLayout {
  mode: HudMode;
  panelSize: PanelSize;
  /** Side column width (wide/short) in px. */
  sideW: number;
  /** Reserved action dock height (portrait/wide) in px. */
  dockH: number;
  /** Smaller dice button/gauge to save vertical space */
  denseDock: boolean;
  feedLines: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function computeLayout(width: number, height: number, players: number): HudLayout {
  const w = width > 0 ? width : typeof window !== 'undefined' ? window.innerWidth : 360;
  const h = height > 0 ? height : typeof window !== 'undefined' ? window.innerHeight : 640;
  const n = Math.max(1, players);

  if (w / h < 1.15) {
    const perPanel = (w - 16 - (n - 1) * 6) / n;
    return {
      mode: 'portrait',
      panelSize: perPanel >= 150 && h >= 600 ? 'compact' : 'mini',
      sideW: 0,
      dockH: 0,
      denseDock: h < 700,
      feedLines: 0,
    };
  }

  if (h < 540) {
    // Phone landscape: the same four-corner strips as desktop, just narrower.
    return {
      mode: 'short',
      panelSize: 'full',
      sideW: clamp(w * 0.24, 168, 210),
      dockH: 0,
      denseDock: true,
      feedLines: 0,
    };
  }

  return {
    mode: 'wide',
    panelSize: 'full',
    sideW: clamp(w * 0.15, 210, 260),
    dockH: 0,
    denseDock: false,
    feedLines: 0,
  };
}

/** Corner per seat (index = seat order). Seat 1 always bottom-left, then clockwise. */
export function cornerSlots(players: number): Corner[] {
  if (players <= 2) return ['bl', 'tr'];
  if (players === 3) return ['bl', 'tl', 'tr'];
  return ['bl', 'tl', 'tr', 'br'];
}
