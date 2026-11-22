// Generates public/js/track.json (race circuit) — run:  node tools/make-track.js
// The SAME json is read by the server (validation) and the browser (drawing + gate detection).
// Coordinates are WORLD coordinates (the garden lives at z offset G0).
const fs = require('fs'), path = require('path');
const G0 = 200, WIDTH = 16, LAPS = 3, GATES = 12, STEP = 3;

// control points in garden-local coordinates (x east, z south), clockwise-ish loop east of the park.
const ctrl = [
  [58, 22], [70, 22], [84, 22], [98, 22], [112, 22], [126, 8], [124, -14], [108, -28], [100, -44], [112, -58], [126, -76],
  [124, -104], [106, -124], [80, -126], [60, -114], [54, -92], [68, -78], [84, -70], [80, -52],
  [62, -40], [52, -16], [50, 4]
].map(([x, z]) => [x, z + 0]);

// centripetal Catmull-Rom through a closed loop
function cr(p0, p1, p2, p3, t) {
  const d = (a, b) => Math.pow(Math.hypot(a[0] - b[0], a[1] - b[1]), .5) || 1e-4;
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), u = t1 + (t2 - t1) * t;
  const L = (a, b, ta, tb) => [(tb - u) / (tb - ta) * a[0] + (u - ta) / (tb - ta) * b[0], (tb - u) / (tb - ta) * a[1] + (u - ta) / (tb - ta) * b[1]];
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
const n = ctrl.length, dense = [];
for (let i = 0; i < n; i++) for (let k = 0; k < 60; k++) dense.push(cr(ctrl[(i + n - 1) % n], ctrl[i], ctrl[(i + 1) % n], ctrl[(i + 2) % n], k / 60));
// cumulative length, resample uniformly
const cum = [0]; for (let i = 1; i <= dense.length; i++) { const a = dense[i - 1], b = dense[i % dense.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
const total = cum[cum.length - 1], count = Math.round(total / STEP), step = total / count, pts = [];
for (let i = 0; i < count; i++) { const s = i * step; let j = 0; while (cum[j + 1] < s) j++; const f = (s - cum[j]) / (cum[j + 1] - cum[j]), a = dense[j], b = dense[(j + 1) % dense.length]; pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
// rotate so index 0 is the point nearest the start-line location, and make sure it heads +x
let best = 0, bd = 1e9; const START = [84, 22]; pts.forEach((p, i) => { const d = Math.hypot(p[0] - START[0], p[1] - START[1]); if (d < bd) { bd = d; best = i; } });
let P = pts.slice(best).concat(pts.slice(0, best));
if (P[2][0] < P[0][0]) { P = [P[0], ...P.slice(1).reverse()]; }
const N = P.length, L = N * step;
const tan = i => { const a = P[(i + N - 1) % N], b = P[(i + 1) % N], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return [dx / l, dz / l]; };
const cps = []; for (let g = 0; g < GATES; g++) { const i = Math.round(g * N / GATES) % N, [fx, fz] = tan(i); cps.push({ x: P[i][0], z: P[i][1] + G0, fx: +fx.toFixed(4), fz: +fz.toFixed(4), s: +(i * step).toFixed(1) }); }
const grid = [[-7, 2.6], [-13, -2.6]].map(([s, lat]) => { const i = (Math.round(s / step) + N) % N, [fx, fz] = tan(i), lx = fz, lz = -fx; return { x: +(P[i][0] + lx * lat).toFixed(2), z: +(P[i][1] + lz * lat + G0).toFixed(2), yaw: +Math.atan2(-fx, -fz).toFixed(4) }; });
const out = { name: 'Moonlight Circuit', width: WIDTH, laps: LAPS, length: +L.toFixed(1), step, center: P.flatMap(p => [+p[0].toFixed(2), +(p[1] + G0).toFixed(2)]), cps, grid };
fs.writeFileSync(path.join(__dirname, '..', 'public', 'js', 'track.json'), JSON.stringify(out));
// report
let minR = 1e9; for (let i = 0; i < N; i++) { const a = P[(i + N - 3) % N], b = P[i], c = P[(i + 3) % N]; const ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]), ca = Math.hypot(a[0] - c[0], a[1] - c[1]); const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2; const r = ab * bc * ca / (4 * area || 1e-9); if (r < minR) minR = r; }
console.log(`points ${N}, length ${L.toFixed(0)} m, min radius ~${minR.toFixed(1)} m, gates ${GATES}`);
const xs = P.map(p => p[0]), zs = P.map(p => p[1]); console.log('x', Math.min(...xs).toFixed(0), Math.max(...xs).toFixed(0), 'z', Math.min(...zs).toFixed(0), Math.max(...zs).toFixed(0));
