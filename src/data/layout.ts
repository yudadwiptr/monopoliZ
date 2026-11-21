/**
 * Board geometry: 32 tiles on the border of a 9×9 grid.
 *
 *   16 17 18 19 20 21 22 23 24      row 0
 *   15                      25
 *   14                      26
 *   13        (center)      27
 *   12                      28
 *   11                      29
 *   10                      30
 *    9                      31
 *    8  7  6  5  4  3  2  1  0      row 8
 *
 * Players move in increasing index order (0 → 1 → … → 31 → 0).
 */
export const BOARD_SIZE = 32;
export const GRID = 9;
export const CORNERS = [0, 8, 16, 24] as const;

export interface GridPos {
  row: number;
  col: number;
}

export function tileGridPos(index: number): GridPos {
  const i = ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  if (i <= 8) return { row: 8, col: 8 - i };
  if (i <= 16) return { row: 8 - (i - 8), col: 0 };
  if (i <= 24) return { row: 0, col: i - 16 };
  return { row: i - 24, col: 8 };
}

export function isCorner(index: number): boolean {
  return index % 8 === 0;
}

/** Side 0 = bottom (1..7), 1 = left (9..15), 2 = top (17..23), 3 = right (25..31). Corners → -1. */
export function tileSide(index: number): number {
  if (isCorner(index)) return -1;
  return Math.floor(index / 8);
}

export function sideTiles(side: number): number[] {
  const start = side * 8 + 1;
  return Array.from({ length: 7 }, (_, k) => start + k);
}

/** Forward distance from a to b (0..31). */
export function forwardDistance(from: number, to: number): number {
  return (((to - from) % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
}

export function wrap(index: number): number {
  return ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
}
