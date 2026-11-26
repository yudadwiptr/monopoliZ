/**
 * Responsive layout maths for the game screen:
 *  - portrait: mobile portrait (`max-width: 768px` & `orientation: portrait`) — Top Bar + P1/P2 row + 1:1 square board + P3/P4 row + bottom dice dock
 *  - wide:     desktop & tablet landscape — 4 corner HUD cards (`clamp(130px, 18vw, 220px)`), square board in center, bottom floating dice dock
 *  - short:    phone landscape — compact 4 corner HUD cards (`clamp(130px, 18vw, 195px)`), square board in center (`min(92dvh, 92vw)`), bottom dice dock
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

export function computeLayout(width: number, height: number, _players: number): HudLayout {
  const w = width > 0 ? width : typeof window !== 'undefined' ? window.innerWidth : 360;
  const h = height > 0 ? height : typeof window !== 'undefined' ? window.innerHeight : 640;

  if (w <= 768 && w < h) {
    return {
      mode: 'portrait',
      panelSize: 'mini',
      sideW: 0,
      dockH: 76,
      denseDock: true,
      feedLines: 0,
    };
  }

  if (w / h < 1.05) {
    return {
      mode: 'portrait',
      panelSize: 'compact',
      sideW: 0,
      dockH: 82,
      denseDock: h < 740,
      feedLines: 0,
    };
  }

  if (h < 540) {
    return {
      mode: 'short',
      panelSize: 'mini',
      sideW: Math.round(clamp(w * 0.18, 134, 196)),
      dockH: 0,
      denseDock: true,
      feedLines: 0,
    };
  }

  return {
    mode: 'wide',
    panelSize: 'full',
    sideW: Math.round(clamp(w * 0.18, 175, 224)),
    dockH: 0,
    denseDock: false,
    feedLines: 0,
  };
}

/** Corner per seat (index = seat order): top-left & top-right first, then bottom-left & bottom-right. */
export function cornerSlots(players: number): Corner[] {
  if (players <= 2) return ['tl', 'tr'];
  if (players === 3) return ['tl', 'tr', 'bl'];
  return ['tl', 'tr', 'bl', 'br'];
}
