/**
 * Board geometry + camera math, in NORMALISED board units: the board is a 1×1 square centred on (0,0),
 * u → right, v → down, h → up out of the board surface. Screen px = normalised × S (board size in px).
 *
 * The board plane is drawn by CSS (`perspective: k·S` + `rotateX(tilt)`), while pawns, buildings, dice and
 * fx live in a flat 2D overlay positioned with `project()`, which reproduces exactly what the CSS
 * perspective does to a point. That keeps billboards upright, crisp and trivially depth-sorted.
 */
import { BOARD_SIZE, tileGridPos, tileSide } from '@/data/layout';

/** Corner / side-tile depth, in cells (`1.53fr` vs `1fr` in `public/board/board_frame_2d.png`). */
export const CORNER_K = 1.53;
/** Outer wooden frame rim around the tile ring, in cells (`7.5%` of total board). */
export const RIM_K = 0.88;
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

/**
 * Exact measured cream-parchment column and row boundaries (in % of full board width/height)
 * directly from `public/board/board_frame_2d.png` (1930×1930) so every tile, color strip,
 * ownership border, building, and pawn aligns with its hand-drawn box to the pixel.
 */
const COL_BOUNDS_PCT: [number, number][] = [
  [7.45, 20.12],  // Col 0 (Left corners & left side tiles right up to inner ink border at 20.12%)
  [20.92, 28.68], // Col 1
  [29.38, 37.10], // Col 2
  [37.77, 45.52], // Col 3
  [46.22, 53.91], // Col 4
  [54.59, 62.31], // Col 5
  [63.03, 70.73], // Col 6
  [71.45, 79.07], // Col 7
  [79.66, 92.12], // Col 8 (Right corners & right side tiles starting from inner ink border at 79.66%)
];

const ROW_BOUNDS_PCT: [number, number][] = [
  [7.25, 19.88],  // Row 0 (Top corners & top side tiles right down to inner ink border at 19.88%)
  [20.58, 28.43], // Row 1
  [29.15, 36.87], // Row 2
  [37.55, 45.31], // Row 3
  [45.99, 53.86], // Row 4
  [54.53, 62.40], // Row 5
  [63.08, 71.00], // Row 6
  [71.67, 79.39], // Row 7
  [80.12, 92.15], // Row 8 (Bottom corners & bottom side tiles starting from inner ink border at 80.12%)
];

function computeRect(index: number): Rect {
  const { row, col } = tileGridPos(index);
  const [cx0, cx1] = COL_BOUNDS_PCT[col] ?? [0, 10];
  const [ry0, ry1] = ROW_BOUNDS_PCT[row] ?? [0, 10];
  const x0 = -0.5 + cx0 / 100;
  const x1 = -0.5 + cx1 / 100;
  const y0 = -0.5 + ry0 / 100;
  const y1 = -0.5 + ry1 / 100;
  const w = x1 - x0;
  const h = y1 - y0;
  return { x0, y0, x1, y1, cx: x0 + w / 2, cy: y0 + h / 2, w, h };
}

export const TILE_RECTS: Rect[] = Array.from({ length: BOARD_SIZE }, (_, i) => computeRect(i));

export interface Point {
  u: number;
  v: number;
}

/**
 * Where a property's 3D building stands: squarely on the outer cream lot zone of the tile
 * (about 58% out from the inner diorama edge) so it never covers the city name in the inner color band.
 */
export function lotAnchor(index: number): Point {
  const r = TILE_RECTS[index];
  switch (tileSide(index)) {
    case 0:
      return { u: r.cx, v: r.y0 + r.h * 0.48 };
    case 1:
      return { u: r.x1 - r.w * 0.48, v: r.cy };
    case 2:
      return { u: r.cx, v: r.y1 - r.h * 0.48 };
    case 3:
      return { u: r.x0 + r.w * 0.48, v: r.cy };
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
    [-0.24, -0.06],
    [0.24, 0.08],
  ],
  [
    [-0.26, 0.08],
    [0.26, 0.1],
    [0, -0.14],
  ],
  [
    [-0.24, -0.12],
    [0.24, -0.1],
    [-0.22, 0.14],
    [0.22, 0.16],
  ],
];

/**
 * Standing spot for pawn `slot` of `count` sharing tile `index`.
 * Placed on the middle-outer lot of side tiles (~62% from the inner edge) with staggered x/y offsets
 * when >1 pawn shares the tile so wooden bases never completely hide each other.
 */
export function pawnSpot(index: number, slot: number, count: number): Point {
  const r = TILE_RECTS[index];
  const side = tileSide(index);
  const layout = CLUSTER[Math.min(Math.max(count, 1), 4)];
  const [fx, fy] = layout[Math.min(slot, layout.length - 1)] ?? [0, 0];

  if (side === 0) {
    return { u: r.cx + fx * r.w, v: r.y0 + r.h * 0.62 + fy * r.h * 0.45 };
  }
  if (side === 2) {
    return { u: r.cx + fx * r.w, v: r.y1 - r.h * 0.62 + fy * r.h * 0.45 };
  }
  if (side === 1) {
    return { u: r.x1 - r.w * 0.62 + fy * r.w * 0.45, v: r.cy + fx * r.h };
  }
  if (side === 3) {
    return { u: r.x0 + r.w * 0.62 + fy * r.w * 0.45, v: r.cy + fx * r.h };
  }
  // Corner tile
  return { u: r.cx + fx * r.w * 0.85, v: r.cy + r.h * 0.08 + fy * r.h * 0.85 };
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
