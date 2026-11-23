/**
 * Board geometry + camera math, in NORMALISED board units: the board is a 1×1 square centred on (0,0),
 * u → right, v → down, h → up out of the board surface. Screen px = normalised × S (board size in px).
 *
 * The board plane is drawn by CSS (`perspective: k·S` + `rotateX(tilt)`), while pawns, buildings, dice and
 * fx live in a flat 2D overlay positioned with `project()`, which reproduces exactly what the CSS
 * perspective does to a point. That keeps billboards upright, crisp and trivially depth-sorted.
 */
import { BOARD_SIZE, GRID, tileGridPos, tileSide } from '@/data/layout';

/** Corner / side-tile depth, in cells. */
export const CORNER_K = 1.5;
/** Decorative rim around the tile ring, in cells. */
export const RIM_K = 0.22;
/** Board edge length in cells. */
export const CELLS = 7 + 2 * CORNER_K + 2 * RIM_K;
/** One cell in normalised units. */
export const CELL_N = 1 / CELLS;
export const RIM_N = RIM_K * CELL_N;
/** Slab thickness (board edge) in normalised units. */
export const SLAB_N = 0.026;
/** Space reserved above the far edge for the skyline of top-row buildings. */
export const HEADROOM_N = 0.015;

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const trackStart = (i: number) => (i === 0 ? 0 : CORNER_K + (i - 1));
const trackSize = (i: number) => (i === 0 || i === GRID - 1 ? CORNER_K : 1);

function computeRect(index: number): Rect {
  const { row, col } = tileGridPos(index);
  const x0 = -0.5 + RIM_N + trackStart(col) * CELL_N;
  const y0 = -0.5 + RIM_N + trackStart(row) * CELL_N;
  const w = trackSize(col) * CELL_N;
  const h = trackSize(row) * CELL_N;
  return { x0, y0, x1: x0 + w, y1: y0 + h, cx: x0 + w / 2, cy: y0 + h / 2, w, h };
}

export const TILE_RECTS: Rect[] = Array.from({ length: BOARD_SIZE }, (_, i) => computeRect(i));

export interface Point {
  u: number;
  v: number;
}

/**
 * Where a property's 3D isometric building stands: directly on the inner colored lot block of the tile
 * (about 34% in from the inner pit edge), just like LINE Let's Get Rich.
 */
export function lotAnchor(index: number): Point {
  const r = TILE_RECTS[index];
  switch (tileSide(index)) {
    case 0:
      return { u: r.cx, v: r.y0 + r.h * 0.34 };
    case 1:
      return { u: r.x1 - r.w * 0.34, v: r.cy };
    case 2:
      return { u: r.cx, v: r.y1 - r.h * 0.34 };
    case 3:
      return { u: r.x0 + r.w * 0.34, v: r.cy };
    default:
      return { u: r.cx, v: r.cy };
  }
}

/** Where fx / labels for a tile are anchored. */
export function tileCenter(index: number): Point {
  const r = TILE_RECTS[index];
  return { u: r.cx, v: r.cy };
}

/** Cluster layouts as fractions of the tile's width/height, for 1..4 pawns on one tile. */
const CLUSTER: [number, number][][] = [
  [],
  [[0, 0]],
  [
    [-0.22, 0],
    [0.22, 0],
  ],
  [
    [-0.24, 0.1],
    [0.24, 0.1],
    [0, -0.12],
  ],
  [
    [-0.22, -0.11],
    [0.22, -0.11],
    [-0.22, 0.13],
    [0.22, 0.13],
  ],
];

/**
 * Standing spot for pawn `slot` of `count` sharing tile `index`.
 * Placed on the outer-middle walkway of side tiles (~68% from the inner pit edge) so pawns never overlap
 * the 3D buildings standing on the inner lot block.
 */
export function pawnSpot(index: number, slot: number, count: number): Point {
  const r = TILE_RECTS[index];
  const side = tileSide(index);
  const layout = CLUSTER[Math.min(Math.max(count, 1), 4)];
  const [fx, fy] = layout[Math.min(slot, layout.length - 1)] ?? [0, 0];

  if (side === 0) {
    return { u: r.cx + fx * r.w, v: r.y0 + r.h * 0.68 + fy * r.h * 0.45 };
  }
  if (side === 2) {
    return { u: r.cx + fx * r.w, v: r.y1 - r.h * 0.68 + fy * r.h * 0.45 };
  }
  if (side === 1) {
    return { u: r.x1 - r.w * 0.68 + fy * r.w * 0.45, v: r.cy + fx * r.h };
  }
  if (side === 3) {
    return { u: r.x0 + r.w * 0.68 + fy * r.w * 0.45, v: r.cy + fx * r.h };
  }
  // Corner tile
  return { u: r.cx + fx * r.w * 0.85, v: r.cy + r.h * 0.1 + fy * r.h * 0.85 };
}

// ───────────────────────────── camera ─────────────────────────────

export interface Projected {
  x: number;
  y: number;
  /** perspective scale factor at that point */
  f: number;
}

/** Rotate a board point around the board centre by `yawDeg` (CSS rotateZ: clockwise on screen). */
export function yawPoint(u: number, v: number, yawDeg: number): Point {
  if (!yawDeg) return { u, v };
  const a = (yawDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { u: u * cos - v * sin, v: u * sin + v * cos };
}

/**
 * Project a board point (u, v, h) through rotateX(tilt) · rotateZ(yaw) + perspective(k).
 * Matches the CSS rendering of the board plane (`rotateX(t) rotateZ(yaw)`).
 */
export function project(u: number, v: number, h: number, tiltDeg: number, k: number, yawDeg = 0): Projected {
  const r = yawPoint(u, v, yawDeg);
  const t = (tiltDeg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const y = r.v * cos - h * sin;
  const z = r.v * sin + h * cos;
  const f = k / (k - z);
  return { x: r.u * f, y: y * f, f };
}

/** How far "down the screen" (toward the viewer) a board point is after yaw. Used for paint order. */
export function screenDepth(u: number, v: number, yawDeg = 0): number {
  return yawPoint(u, v, yawDeg).v;
}

export interface Bounds {
  width: number;
  height: number;
  centerY: number;
}

/** Normalised screen bounds of the whole board (incl. slab and skyline headroom) for a camera pose. */
export function boardBounds(tiltDeg: number, k: number, yawDeg = 0): Bounds {
  // The physical board slab has rounded corners (border-radius 0.42c), so in isometric 45deg view the left/right
  // visual tips sit at ±0.48 rather than sharp ±0.5. Using 0.48 avoids wasting horizontal margin on phones.
  const e = yawDeg ? 0.48 : 0.5;
  const corners: [number, number][] = [
    [-e, -e],
    [e, -e],
    [-e, e],
    [e, e],
  ];
  let maxX = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [u, v] of corners) {
    const top = project(u, v, 0, tiltDeg, k, yawDeg);
    const under = project(u, v, -SLAB_N, tiltDeg, k, yawDeg);
    // Buildings on the far edge rise above the board: reserve headroom above every corner.
    minY = Math.min(minY, top.y - HEADROOM_N * top.f);
    maxY = Math.max(maxY, top.y, under.y);
    maxX = Math.max(maxX, Math.abs(top.x), Math.abs(under.x));
  }
  return { width: maxX * 2, height: maxY - minY, centerY: (maxY + minY) / 2 };
}

/** Tilt used by the 3D camera: flatter on narrow/portrait screens so tiles stay readable. */
export function tiltFor(width: number, height: number): number {
  const aspect = width / Math.max(1, height);
  if (width < 420) return 24;
  if (aspect < 0.8) return 30;
  if (aspect < 1.15) return 36;
  return 42;
}

/**
 * Tilt for the isometric (diamond) camera:
 * - Portrait phones (aspect < 0.85): flatter tilt (36 deg) so the diamond isn't squashed vertically and fills the tall screen!
 * - Landscape (aspect >= 0.85): 58 deg Get Rich table angle.
 */
export function isoTiltFor(width: number, height: number): number {
  const aspect = width / Math.max(1, height);
  if (aspect < 0.75) return 35;
  if (aspect < 1.05) return 44;
  return 58;
}

/** Yaw of the isometric camera: the board is turned into a diamond. */
export const ISO_YAW = 45;

/** Perspective distance as a multiple of the board size (larger = flatter, less distortion). */
export function perspectiveFor(width: number): number {
  return width < 480 ? 2.5 : 2.05;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
