/**
 * Responsive layout maths for the game screen.
 *  - portrait: top bar, panel strip, board, feed, dock stacked vertically (phones / tablets upright)
 *  - wide:     top bar across, panels in the four screen corners, board centred, dock under the board
 *  - short:    phone landscape — panels in the left column, board centred, controls in the right column
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
      dockH: h < 700 ? 114 : 128,
      denseDock: h < 700,
      feedLines: h < 740 ? 2 : 3,
    };
  }

  if (h < 540) {
    const colW = clamp((w - (h - 16)) / 2 - 12, 132, 230);
    const perPanel = (h - 16 - (n - 1) * 6) / n;
    return {
      mode: 'short',
      panelSize: colW >= 160 && perPanel >= 84 ? 'compact' : 'mini',
      sideW: colW,
      dockH: 0,
      denseDock: true,
      feedLines: 2,
    };
  }

  const topH = 64;
  const dockH = 92;
  const boardTarget = h - topH - dockH - 16;
  const side = clamp((w - boardTarget) / 2 - 18, 176, 310);
  return {
    mode: 'wide',
    panelSize: side >= 224 ? 'full' : 'compact',
    sideW: side,
    dockH,
    denseDock: false,
    feedLines: 3,
  };
}

/** Corner per seat (index = seat order). Seat 1 always bottom-left, then clockwise. */
export function cornerSlots(players: number): Corner[] {
  if (players <= 2) return ['bl', 'tr'];
  if (players === 3) return ['bl', 'tl', 'tr'];
  return ['bl', 'tl', 'tr', 'br'];
}
