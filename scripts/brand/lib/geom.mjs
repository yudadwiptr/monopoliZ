// Tiny 2D path toolkit for the brand generator.
// A path is an array of segments in absolute coordinates:
//   {t:'M',x,y} | {t:'L',x,y} | {t:'Q',x1,y1,x,y} | {t:'C',x1,y1,x2,y2,x,y} | {t:'Z'}

export const fmt = (n) => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? '0' : String(v);
};

/** Serialise a path to compact SVG path data. */
export function toD(path, precision = 2) {
  const f = (n) => {
    const p = 10 ** precision;
    const v = Math.round(n * p) / p;
    return Object.is(v, -0) ? '0' : String(v);
  };
  let d = '';
  for (const s of path) {
    switch (s.t) {
      case 'M':
        d += `M${f(s.x)} ${f(s.y)}`;
        break;
      case 'L':
        d += `L${f(s.x)} ${f(s.y)}`;
        break;
      case 'Q':
        d += `Q${f(s.x1)} ${f(s.y1)} ${f(s.x)} ${f(s.y)}`;
        break;
      case 'C':
        d += `C${f(s.x1)} ${f(s.y1)} ${f(s.x2)} ${f(s.y2)} ${f(s.x)} ${f(s.y)}`;
        break;
      case 'Z':
        d += 'Z';
        break;
    }
  }
  return d;
}

/** Apply an affine transform [a,b,c,d,e,f] (SVG matrix order) to every point. */
export function transform(path, m) {
  const [a, b, c, d, e, f] = m;
  const p = (x, y) => [a * x + c * y + e, b * x + d * y + f];
  return path.map((s) => {
    if (s.t === 'Z') return s;
    const [x, y] = p(s.x, s.y);
    if (s.t === 'Q') {
      const [x1, y1] = p(s.x1, s.y1);
      return { t: 'Q', x1, y1, x, y };
    }
    if (s.t === 'C') {
      const [x1, y1] = p(s.x1, s.y1);
      const [x2, y2] = p(s.x2, s.y2);
      return { t: 'C', x1, y1, x2, y2, x, y };
    }
    return { t: s.t, x, y };
  });
}

export const translate = (path, dx, dy) => transform(path, [1, 0, 0, 1, dx, dy]);
export const scaleAbout = (path, k, cx = 0, cy = 0) => transform(path, [k, 0, 0, k, cx - k * cx, cy - k * cy]);
export function rotateAbout(path, deg, cx, cy) {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return transform(path, [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy]);
}

/** Matrix mapping the unit square (u,v) to the parallelogram origin + u*U + v*V. */
export const faceMatrix = (origin, U, V) => [U[0], U[1], V[0], V[1], origin[0], origin[1]];

/** Convert opentype.js path commands into our segment format (already in screen space). */
export function fromOpentype(cmds) {
  return cmds.map((c) => {
    switch (c.type) {
      case 'M':
        return { t: 'M', x: c.x, y: c.y };
      case 'L':
        return { t: 'L', x: c.x, y: c.y };
      case 'Q':
        return { t: 'Q', x1: c.x1, y1: c.y1, x: c.x, y: c.y };
      case 'C':
        return { t: 'C', x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, x: c.x, y: c.y };
      default:
        return { t: 'Z' };
    }
  });
}

/** Glyph outline from font units (y-up) into screen space at origin (ox, baseline oy) with scale s. */
export function glyphPath(glyph, ox, oy, s) {
  return glyph.path.commands.map((c) => {
    const X = (x) => ox + x * s;
    const Y = (y) => oy - y * s;
    switch (c.type) {
      case 'M':
        return { t: 'M', x: X(c.x), y: Y(c.y) };
      case 'L':
        return { t: 'L', x: X(c.x), y: Y(c.y) };
      case 'Q':
        return { t: 'Q', x1: X(c.x1), y1: Y(c.y1), x: X(c.x), y: Y(c.y) };
      case 'C':
        return { t: 'C', x1: X(c.x1), y1: Y(c.y1), x2: X(c.x2), y2: Y(c.y2), x: X(c.x), y: Y(c.y) };
      default:
        return { t: 'Z' };
    }
  });
}

/** Split a path into closed contours of drawing segments (each segment knows its start point). */
function contours(path) {
  const out = [];
  let cur = null;
  let start = null;
  let pen = null;
  const flush = () => {
    if (cur && cur.length) {
      // implicit closing line
      if (Math.hypot(pen.x - start.x, pen.y - start.y) > 1e-6) {
        cur.push({ t: 'L', x0: pen.x, y0: pen.y, x: start.x, y: start.y });
      }
      out.push(cur);
    }
    cur = null;
  };
  for (const s of path) {
    if (s.t === 'M') {
      flush();
      cur = [];
      start = { x: s.x, y: s.y };
      pen = { x: s.x, y: s.y };
    } else if (s.t === 'Z') {
      flush();
    } else {
      const seg = { ...s, x0: pen.x, y0: pen.y };
      if (!(s.t === 'L' && Math.hypot(s.x - pen.x, s.y - pen.y) < 1e-6)) cur.push(seg);
      pen = { x: s.x, y: s.y };
    }
  }
  flush();
  return out;
}

/**
 * Soften the corners where two straight segments meet (curved joins are left alone).
 * `d` is the distance trimmed from each side of the corner; a quadratic arc replaces it.
 */
export function roundCorners(path, d) {
  const out = [];
  for (const segs of contours(path)) {
    const n = segs.length;
    const len = (s) => Math.hypot(s.x - s.x0, s.y - s.y0);
    // corner i sits at the START of segs[i]
    const round = segs.map((s, i) => {
      const prev = segs[(i - 1 + n) % n];
      if (s.t !== 'L' || prev.t !== 'L') return 0;
      const a = [prev.x - prev.x0, prev.y - prev.y0];
      const b = [s.x - s.x0, s.y - s.y0];
      const cross = a[0] * b[1] - a[1] * b[0];
      const la = Math.hypot(...a);
      const lb = Math.hypot(...b);
      if (Math.abs(cross) / (la * lb) < 0.05) return 0; // nearly straight
      return Math.min(d, la * 0.45, lb * 0.45);
    });
    const unit = (s) => {
      const l = len(s) || 1;
      return [(s.x - s.x0) / l, (s.y - s.y0) / l];
    };
    const startPt = (i) => {
      const s = segs[i];
      const r = round[i];
      if (!r) return [s.x0, s.y0];
      const u = unit(s);
      return [s.x0 + u[0] * r, s.y0 + u[1] * r];
    };
    const endPt = (i) => {
      const s = segs[i];
      const r = round[(i + 1) % n];
      if (!r) return [s.x, s.y];
      const u = unit(s);
      return [s.x - u[0] * r, s.y - u[1] * r];
    };
    const [sx, sy] = startPt(0);
    out.push({ t: 'M', x: sx, y: sy });
    for (let i = 0; i < n; i++) {
      const s = segs[i];
      const [ex, ey] = endPt(i);
      if (s.t === 'L') out.push({ t: 'L', x: ex, y: ey });
      else if (s.t === 'Q') out.push({ t: 'Q', x1: s.x1, y1: s.y1, x: ex, y: ey });
      else out.push({ t: 'C', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, x: ex, y: ey });
      const j = (i + 1) % n;
      if (round[j]) {
        const [nx, ny] = startPt(j);
        out.push({ t: 'Q', x1: s.x, y1: s.y, x: nx, y: ny });
      }
    }
    out.push({ t: 'Z' });
  }
  return out;
}

/** Closed polygon with rounded corners (radius r, clamped per corner). */
export function roundedPoly(pts, r) {
  const path = [{ t: 'M', x: pts[0][0], y: pts[0][1] }];
  for (let i = 1; i < pts.length; i++) path.push({ t: 'L', x: pts[i][0], y: pts[i][1] });
  path.push({ t: 'Z' });
  return r > 0 ? roundCorners(path, r) : path;
}

const K = 0.5522847498;
/** Circle as four cubic arcs (stays exact under affine transforms → ellipses). */
export function circle(cx, cy, r, ccw = false) {
  const k = r * K;
  const p = [
    { t: 'M', x: cx + r, y: cy },
    { t: 'C', x1: cx + r, y1: cy + k, x2: cx + k, y2: cy + r, x: cx, y: cy + r },
    { t: 'C', x1: cx - k, y1: cy + r, x2: cx - r, y2: cy + k, x: cx - r, y: cy },
    { t: 'C', x1: cx - r, y1: cy - k, x2: cx - k, y2: cy - r, x: cx, y: cy - r },
    { t: 'C', x1: cx + k, y1: cy - r, x2: cx + r, y2: cy - k, x: cx + r, y: cy },
    { t: 'Z' },
  ];
  return ccw ? reverse(p) : p;
}

/** Reverse the winding of a single closed contour made of M/L/C/Q/Z. */
export function reverse(path) {
  const segs = contours(path)[0];
  const out = [{ t: 'M', x: segs[segs.length - 1].x, y: segs[segs.length - 1].y }];
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (s.t === 'L') out.push({ t: 'L', x: s.x0, y: s.y0 });
    else if (s.t === 'Q') out.push({ t: 'Q', x1: s.x1, y1: s.y1, x: s.x0, y: s.y0 });
    else out.push({ t: 'C', x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1, x: s.x0, y: s.y0 });
  }
  out.push({ t: 'Z' });
  return out;
}

/** Rounded rectangle path. */
export function roundRect(x, y, w, h, r) {
  return roundedPoly(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    r,
  );
}

// ---------- curves ----------

function cubicAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/**
 * Sample a chain of cubic Béziers given as [p0, c1, c2, p1, c1, c2, p2, ...]
 * and return points re-sampled at uniform arc length.
 */
export function sampleSpline(ctrl, count = 200) {
  const dense = [];
  for (let i = 0; i + 3 < ctrl.length; i += 3) {
    for (let k = 0; k < 120; k++) dense.push(cubicAt(ctrl[i], ctrl[i + 1], ctrl[i + 2], ctrl[i + 3], k / 120));
  }
  dense.push(ctrl[ctrl.length - 1]);
  const cum = [0];
  for (let i = 1; i < dense.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const total = cum[cum.length - 1];
  const pts = [];
  let j = 0;
  for (let k = 0; k <= count; k++) {
    const target = (k / count) * total;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const span = cum[j + 1] - cum[j] || 1;
    const f = (target - cum[j]) / span;
    pts.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
  }
  return { pts, length: total };
}

/** Centripetal-free Catmull-Rom through points → cubic path segments (open). */
function catmull(pts, startWithM = true) {
  const out = startWithM ? [{ t: 'M', x: pts[0][0], y: pts[0][1] }] : [{ t: 'L', x: pts[0][0], y: pts[0][1] }];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    out.push({
      t: 'C',
      x1: p1[0] + (p2[0] - p0[0]) / 6,
      y1: p1[1] + (p2[1] - p0[1]) / 6,
      x2: p2[0] - (p3[0] - p1[0]) / 6,
      y2: p2[1] - (p3[1] - p1[1]) / 6,
      x: p2[0],
      y: p2[1],
    });
  }
  return out;
}

/** Smooth open polyline path (for centrelines used by draw-on animations). */
export function smoothLine(pts) {
  return catmull(pts, true);
}

/**
 * Turn a centreline into a filled brush stroke whose width follows widthAt(u), u∈[0,1] by arc length.
 * The end with width ~0 becomes a sharp taper; a non-zero end gets a round cap when `roundEnd` is set.
 */
export function brushStroke(ctrl, widthAt, { samples = 90, roundStart = false, roundEnd = false } = {}) {
  const { pts } = sampleSpline(ctrl, samples);
  const n = pts.length;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const w = widthAt(i / (n - 1)) / 2;
    left.push([pts[i][0] - ty * w, pts[i][1] + tx * w]);
    right.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
  }
  const capPts = (center, from, to, dirSign) => {
    // semicircle from `from` to `to` around `center`
    const r = Math.hypot(from[0] - center[0], from[1] - center[1]);
    if (r < 0.05) return [];
    const a0 = Math.atan2(from[1] - center[1], from[0] - center[0]);
    const out = [];
    for (let k = 1; k < 8; k++) {
      const a = a0 + dirSign * (Math.PI * k) / 8;
      out.push([center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r]);
    }
    return out;
  };
  const endCap = roundEnd ? capPts(pts[n - 1], left[n - 1], right[n - 1], -1) : [];
  const startCap = roundStart ? capPts(pts[0], right[0], left[0], -1) : [];
  const ring = [...left, ...endCap, ...right.reverse(), ...startCap];
  // de-duplicate coincident points (taper tips)
  const clean = ring.filter((p, i) => i === 0 || Math.hypot(p[0] - ring[i - 1][0], p[1] - ring[i - 1][1]) > 0.02);
  // smooth along the sides; a flat start edge closes with a straight line (no Catmull overshoot)
  const path = roundStart ? catmull([...clean, clean[0]], true) : catmull(clean, true);
  if (!roundStart) path.push({ t: 'L', x: clean[0][0], y: clean[0][1] });
  path.push({ t: 'Z' });
  return { path, centre: pts };
}

/** Bounding box of a path (control points included; good enough for padding). */
export function bbox(paths) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (x, y) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const path of paths) {
    let pen = [0, 0];
    for (const s of path) {
      if (s.t === 'Z') continue;
      if (s.t === 'Q' || s.t === 'C') {
        const c1 = [s.x1, s.y1];
        const c2 = s.t === 'C' ? [s.x2, s.y2] : c1;
        for (let k = 1; k < 16; k++) {
          const [x, y] = cubicAt(pen, c1, c2, [s.x, s.y], k / 16);
          add(x, y);
        }
      }
      add(s.x, s.y);
      pen = [s.x, s.y];
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
