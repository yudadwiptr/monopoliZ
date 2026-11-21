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
export const HEADROOM_N = 0.1;

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
 * Where a property's building / flag stands. Buildings rise "up" the screen, so they are placed where they
 * never hide tile text: just inside the ring for the bottom row and the side columns, and on the rim
 * behind the far (top) row.
 */
export function lotAnchor(index: number): Point {
  const r = TILE_RECTS[index];
  switch (tileSide(index)) {
    case 0:
      return { u: r.cx, v: r.y0 - 0.12 * CELL_N };
    case 1:
      return { u: r.x1 + 0.44 * CELL_N, v: r.cy + 0.4 * CELL_N };
    case 3:
      return { u: r.x0 - 0.44 * CELL_N, v: r.cy + 0.4 * CELL_N };
    case 2:
      return { u: r.cx, v: r.y0 - RIM_N * 0.45 };
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
    [-0.24, 0.12],
    [0.24, 0.12],
    [0, -0.14],
  ],
  [
    [-0.22, -0.13],
    [0.22, -0.13],
    [-0.22, 0.15],
    [0.22, 0.15],
  ],
];

/** Standing spot for pawn `slot` of `count` sharing tile `index`. */
export function pawnSpot(index: number, slot: number, count: number): Point {
  const r = TILE_RECTS[index];
  const corner = index % 8 === 0;
  // Stand a little toward the lower part of the tile: the pawn's body rises over the rest of it.
  const baseV = r.cy + r.h * (corner ? 0.12 : 0.18);
  const layout = CLUSTER[Math.min(Math.max(count, 1), 4)];
  const [fx, fy] = layout[Math.min(slot, layout.length - 1)] ?? [0, 0];
  return { u: r.cx + fx * r.w, v: baseV + fy * r.h };
}

// ───────────────────────────── camera ─────────────────────────────

export interface Projected {
  x: number;
  y: number;
  /** perspective scale factor at that point */
  f: number;
}

/** Project a board point (u, v, h) through rotateX(tilt) + perspective(k). Matches the CSS rendering. */
export function project(u: number, v: number, h: number, tiltDeg: number, k: number): Projected {
  const t = (tiltDeg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const y = v * cos - h * sin;
  const z = v * sin + h * cos;
  const f = k / (k - z);
  return { x: u * f, y: y * f, f };
}

export interface Bounds {
  width: number;
  height: number;
  centerY: number;
}

/** Normalised screen bounds of the whole board (incl. slab and far-row skyline) at a given tilt. */
export function boardBounds(tiltDeg: number, k: number): Bounds {
  const pts = [
    project(-0.5, -0.5, 0, tiltDeg, k),
    project(0.5, -0.5, 0, tiltDeg, k),
    project(-0.5, 0.5, 0, tiltDeg, k),
    project(0.5, 0.5, 0, tiltDeg, k),
    project(-0.5, 0.5, -SLAB_N, tiltDeg, k),
    project(0.5, 0.5, -SLAB_N, tiltDeg, k),
  ];
  const far = project(0, -0.5 + RIM_N * 0.5, 0, tiltDeg, k);
  let maxX = 0;
  let minY = far.y - HEADROOM_N * far.f;
  let maxY = -Infinity;
  for (const p of pts) {
    maxX = Math.max(maxX, Math.abs(p.x));
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
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

/** Perspective distance as a multiple of the board size (larger = flatter, less distortion). */
export function perspectiveFor(width: number): number {
  return width < 480 ? 2.5 : 2.05;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
