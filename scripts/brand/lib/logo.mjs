// Vector recreation of the client's MonopoliZ logo.
// Coordinate system: cap height = 100 units, baseline at y = 0 (SVG y grows downward).
import {
  bbox,
  brushStroke,
  circle,
  faceMatrix,
  glyphPath,
  rotateAbout,
  scaleAbout,
  roundCorners,
  roundedPoly,
  roundRect,
  smoothLine,
  transform,
  translate,
} from './geom.mjs';

const CAP = 1760; // Anton cap height in font units
const S = 100 / CAP;

export const DESIGN = {
  tracking: -2.4, // cap units between letters (Anton is already narrow; client logo is tight)
  cornerRound: 2.1, // softened letter corners
  zScale: 1.3, // the final Z is taller than the rest
  zGap: 0.6,
};

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Letters MONOPOLI + big Z, each as its own path (for per-letter animation). */
function layoutLetters(anton) {
  const letters = [];
  let x = 0;
  const boxes = [];
  for (const ch of 'MONOPOLI') {
    const g = anton.charToGlyph(ch);
    letters.push({ ch, path: roundCorners(glyphPath(g, x, 0, S), DESIGN.cornerRound) });
    const bb = g.getBoundingBox();
    boxes.push({ ch, x, x1: x + bb.x1 * S, x2: x + bb.x2 * S });
    x += g.advanceWidth * S + DESIGN.tracking;
  }
  const gz = anton.charToGlyph('Z');
  const sz = S * DESIGN.zScale;
  const zx = x + DESIGN.zGap;
  const z = roundCorners(glyphPath(gz, zx, 0, sz), DESIGN.cornerRound * 1.15);
  const zBox = {
    x1: zx + 32 * sz,
    x2: zx + 806 * sz,
    top: -CAP * sz,
    barBottom: -1436 * sz,
    barLeft: zx + 71 * sz,
    midY: (-CAP * sz) / 2,
  };
  return { letters, z, boxes, zBox };
}

/** The big under-swoosh: grows out of the M's left leg and waves under the word. */
function buildSwoosh(boxes) {
  const m = boxes[0];
  const legC = m.x + (78 + 396) / 2 * S; // centre of the M's left stem
  const legW = (396 - 78) * S;
  const iBox = boxes[7];
  const end = iBox.x2 - 1;
  const ctrl = [
    [legC, -40],
    [legC, -27],
    [legC, -13],
    [legC, 0],
    [legC, 12],
    [legC + 5, 19],
    [legC + 24, 21],
    [95, 24],
    [150, 27],
    [215, 25],
    [285, 22],
    [345, 14],
    [end, 13],
  ];
  const width = (u) => {
    const head = legW + (10.5 - legW) * smooth(0.085, 0.2, u);
    return head * (1 - smooth(0.58, 1, u) * 0.88);
  };
  return brushStroke(ctrl, width, { samples: 110, roundEnd: true });
}

/** The playful hook that springs out of the N's right stem and curls over "NO". */
function buildHook(boxes) {
  const n = boxes[2];
  const stemC = n.x + ((602 + 942) / 2) * S;
  const stemW = (942 - 602) * S;
  const o = boxes[3];
  const ctrl = [
    [stemC, -70],
    [stemC, -80],
    [stemC, -90],
    [stemC, -99],
    [stemC, -113],
    [stemC + 8, -124],
    [stemC + 28, -126],
    [o.x2 - 6, -127],
    [o.x2 + 6, -122],
    [o.x2 + 6, -114],
    [o.x2 + 6, -110],
    [o.x2 + 3, -107],
    [o.x2, -107],
  ];
  const width = (u) => {
    const w = stemW + (9 - stemW) * smooth(0.2, 0.55, u);
    return w * (1 - smooth(0.55, 1, u) * 0.62);
  };
  return brushStroke(ctrl, width, { samples: 80, roundEnd: true });
}

/**
 * Little house sitting on the Z's top bar: front gable + side roof plane in slight perspective,
 * chimney and window. Separations are real gaps so it works on any background.
 */
export function buildHouse(zBox, { k = 1, gap = 1.9, win = 7.2, chimneyW = 5.2 } = {}) {
  const g = gap; // negative-space line width
  const b = zBox.top + 0.4; // sit flush on the bar
  const hx = zBox.barLeft + 6;
  const fw = 23; // front width
  const wh = 15; // wall height
  const gh = 15; // gable height
  const sw = 17; // side depth
  const dr = 4.5; // perspective rise of receding edges
  const ov = 2.6; // eave overhang

  const apex = [hx + fw / 2, b - wh - gh];
  const eaveL = [hx - ov, b - wh + 1];
  const eaveR = [hx + fw + ov, b - wh + 1];

  // front gable (triangle with a little thickness feel via overhang)
  const gable = roundedPoly([apex, eaveR, eaveL], 1.2);

  // side roof plane: right slope of the gable pushed back by (sw, -dr)
  const slope = [eaveR[0] - apex[0], eaveR[1] - apex[1]];
  const sl = Math.hypot(...slope);
  const nrm = [-slope[1] / sl, slope[0] / sl]; // points to the right/up of the slope
  const push = [-nrm[0] * g, -nrm[1] * g];
  const rA = [apex[0] + push[0] + 0.6, apex[1] + push[1]];
  const rB = [eaveR[0] + push[0], eaveR[1] + push[1]];
  const roof = roundedPoly(
    [rA, [rA[0] + sw, rA[1] - dr], [rB[0] + sw, rB[1] - dr], rB],
    1.1,
  );

  // chimney poking out of the side roof plane
  const chX = rA[0] + sw * 0.55;
  const chW = chimneyW;
  const roofYAt = (x) => {
    // ridge line y at x (ridge goes from rA to rA + (sw,-dr))
    const t = (x - rA[0]) / sw;
    return rA[1] - dr * t;
  };
  const chTop = roofYAt(chX) - 7.5;
  const chimney = roundRect(chX, chTop, chW, roofYAt(chX) - chTop + 6, 0.9);

  // front wall with a square window (hole drawn counter-clockwise)
  const wallTop = b - wh + 1 + g;
  const wall = roundRect(hx, wallTop, fw, b - wallTop, 0.8);
  const wx = hx + fw / 2 - win / 2;
  const wy = wallTop + (b - wallTop) / 2 - win / 2 - 0.6;
  const window = [
    { t: 'M', x: wx, y: wy },
    { t: 'L', x: wx, y: wy + win },
    { t: 'L', x: wx + win, y: wy + win },
    { t: 'L', x: wx + win, y: wy },
    { t: 'Z' },
  ];

  // side wall: under the roof plane, receding
  const sx = hx + fw + g;
  const side = roundedPoly(
    [
      [sx, rB[1] + g + 0.6],
      [sx + sw - 1.5, rB[1] + g + 0.6 - dr],
      [sx + sw - 1.5, b],
      [sx, b],
    ],
    0.8,
  );

  const path = [...gable, ...roof, ...chimney, ...wall, ...(win > 0 ? window : []), ...side];
  // scale about the middle of the house's footprint so it stays seated on the bar
  return k === 1 ? path : scaleAbout(path, k, hx + (fw + g + sw) / 2, b);
}

/** Isometric die with pips as holes (1 on top, 2 left, 3 right). */
export function buildDie(cx, cy, e, rot, gap = 1.5) {
  const c30 = Math.cos(Math.PI / 6);
  const top = [cx, cy - e];
  const L = [cx - e * c30, cy - e / 2];
  const R = [cx + e * c30, cy - e / 2];
  const C = [cx, cy];
  const faces = [
    // [origin, U, V, pips]
    { o: L, U: [C[0] - L[0], C[1] - L[1]], V: [top[0] - L[0], top[1] - L[1]], pips: [[0.5, 0.5]] },
    { o: L, U: [C[0] - L[0], C[1] - L[1]], V: [0, e], pips: [[0.28, 0.28], [0.72, 0.72]] },
    { o: C, U: [R[0] - C[0], R[1] - C[1]], V: [0, e], pips: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]] },
  ];
  const ins = gap / 2 / e; // inset in face-local units
  const out = [];
  for (const f of faces) {
    const m = faceMatrix(f.o, f.U, f.V);
    out.push(...transform(roundRect(ins, ins, 1 - 2 * ins, 1 - 2 * ins, 0.16), m));
    for (const [u, v] of f.pips) out.push(...transform(circle(u, v, 0.118, true), m));
  }
  return rot ? rotateAbout(out, rot, cx, cy) : out;
}

/** Everything composed; returns paths + tight bounds + centrelines for draw-on animations. */
export function buildLogo(anton) {
  const { letters, z, boxes, zBox } = layoutLetters(anton);
  const swoosh = buildSwoosh(boxes);
  const hook = buildHook(boxes);
  const house = { path: buildHouse(zBox) };
  const dieE = 17;
  const die = buildDie(zBox.x2 + 14.5, zBox.midY + 5, dieE, -16);

  const all = [...letters.map((l) => l.path), z, swoosh.path, hook.path, house.path, die];
  const bb = bbox(all);
  return {
    letters,
    z,
    swoosh,
    hook,
    house: house.path,
    die,
    bbox: bb,
    centrelines: {
      swoosh: smoothLine(swoosh.centre.filter((_, i) => i % 6 === 0 || i === swoosh.centre.length - 1)),
      hook: smoothLine(hook.centre.filter((_, i) => i % 6 === 0 || i === hook.centre.length - 1)),
    },
  };
}

/** Same logo shifted so its bounding box starts at (pad, pad). */
export function normalise(logo, pad = 2) {
  const dx = -logo.bbox.x + pad;
  const dy = -logo.bbox.y + pad;
  const t = (p) => translate(p, dx, dy);
  return {
    letters: logo.letters.map((l) => ({ ch: l.ch, path: t(l.path) })),
    z: t(logo.z),
    swoosh: t(logo.swoosh.path),
    hook: t(logo.hook.path),
    house: t(logo.house),
    die: t(logo.die),
    centrelines: { swoosh: t(logo.centrelines.swoosh), hook: t(logo.centrelines.hook) },
    w: logo.bbox.w + pad * 2,
    h: logo.bbox.h + pad * 2,
  };
}

/**
 * Square icon mark: the big Z (widened so it holds up at 16px) crowned by the house,
 * optionally with the die. Returned in its own units together with its tight bounding box.
 * `simple` = favicon variant: wider Z, chunkier house with hairline gaps.
 */
export function buildMark(anton, { die = true, simple = false } = {}) {
  const stretch = simple ? 2 : 1.7;
  const sz = S * DESIGN.zScale;
  const gz = anton.charToGlyph('Z');
  const raw = transform(glyphPath(gz, 0, 0, sz), [stretch, 0, 0, 1, 0, 0]);
  const z = roundCorners(raw, DESIGN.cornerRound * (simple ? 2.2 : 1.4));
  const zBox = {
    x1: 32 * sz * stretch,
    x2: 806 * sz * stretch,
    top: -CAP * sz,
    barLeft: 71 * sz * stretch,
    midY: (-CAP * sz) / 2,
  };
  const barW = zBox.x2 - zBox.barLeft;
  // the house is ~44.5 units wide at k = 1 with its left wall 6 units in from `barLeft`
  const k = simple ? 1.5 : 1.45;
  const seat = { ...zBox, barLeft: zBox.barLeft + (barW - 44.5) / 2 - 3 };
  const house = simple
    ? buildHouse(seat, { k, gap: 1.5, win: 8.4, chimneyW: 6.4 })
    : buildHouse(seat, { k, gap: 2 });
  const parts = { z, house };
  if (die) parts.die = buildDie(zBox.x2 + 12, zBox.midY + 12, 26, -16, 2.4);
  return { parts, bbox: bbox(Object.values(parts)) };
}
