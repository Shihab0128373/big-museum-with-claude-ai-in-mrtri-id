// The Museum: ONE very large, very tall vaulted hall. 5 photo galleries + the "Our Art" gallery along the walls,
// an Entrance Hall without photos, statues / columns / benches / plants / rugs in the free space, and an art studio.
// Lighting = few real lights (hemisphere + 1 directional + 2 points) + cheap tricks (additive spot cones, wall washes,
// glowing floor strips, window light beams, dust, ground mist, glow sprites). Static decor is merged into a few meshes.
import * as THREE from 'three';
import { SECTIONS } from './sections.js';
import { M, ML, ctex, marble, Batch } from './kit.js';

export const MUSEUM = { HX: 40, HZ: 32, WH: 14, APEX: 24, PANEL: .12 };
const PI = Math.PI, TAU = PI * 2;
const UB = new THREE.BoxGeometry(1, 1, 1), UC = new THREE.CylinderGeometry(1, 1, 1, 20), US = new THREE.SphereGeometry(1, 18, 12);
const capCache = new Map(), capsule = (r, l) => { const k = r + '_' + l; if (!capCache.has(k)) capCache.set(k, new THREE.CapsuleGeometry(r, l, 4, 10)); return capCache.get(k); };
const ICO = new THREE.IcosahedronGeometry(1, 1);

/* ---------- small texture helpers (all tiny canvases) ---------- */
const radial = (stops, size = 128) => ctex(size, size, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, [1, 1], true);
const vgrad = (w, h, stops) => ctex(w, h, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, [1, 1], true);
function beamTexture() { // bright at the window (canvas top = uv v 1), fading downwards and towards the sides
  return ctex(64, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) { const a = Math.pow(1 - y / (h - 1), 1.6) * .9; for (let x = 0; x < w; x++) { const u = (x + .5) / w * 2 - 1, e = Math.pow(Math.max(0, 1 - Math.abs(u)), 1.4), i = (y * w + x) * 4; im.data[i] = 255; im.data[i + 1] = 240; im.data[i + 2] = 210; im.data[i + 3] = Math.round(255 * a * e); } } g.putImageData(im, 0, 0); }, [1, 1], true);
}
function mistTexture() { // tileable soft blobs
  return ctex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 50, a = .08 + Math.random() * .16;
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } } });
}
const roseTexture = () => ctex(512, 512, (g, w, h) => {
  const cx = w / 2, cy = h / 2, cols = ['#d9534f', '#f0ad4e', '#5cb85c', '#4aa3df', '#9b59b6', '#f1c40f'];
  g.fillStyle = '#fff6e0'; g.fillRect(0, 0, w, h);
  for (let ring = 0; ring < 3; ring++) { const r0 = ring * 80 + 30, r1 = r0 + 80, n = 8 + ring * 4; for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU; g.fillStyle = cols[(i + ring * 2) % cols.length]; g.beginPath(); g.arc(cx, cy, r1, a0, a1); g.arc(cx, cy, r0, a1, a0, true); g.closePath(); g.fill(); } }
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(cx, cy, 34, 0, TAU); g.fill();
  g.strokeStyle = '#3a2a1a'; g.lineWidth = 6; for (let r = 30; r <= 270; r += 80) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); } g.beginPath(); g.arc(cx, cy, 258, 0, TAU); g.stroke();
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); g.lineTo(cx + Math.cos(a) * 270, cy + Math.sin(a) * 270); g.stroke(); }
}, [1, 1], true);
const mosaicTexture = () => ctex(512, 512, (g, w, h) => {
  const cx = w / 2, cy = h / 2; g.fillStyle = '#17233a'; g.fillRect(0, 0, w, h);
  const ring = (r, c, lw) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); };
  ring(246, '#d9b45f', 10); ring(226, '#e9dfc6', 3); ring(150, '#d9b45f', 5); ring(80, '#d9b45f', 3);
  g.fillStyle = '#d9b45f'; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, long = i % 2 === 0, r1 = long ? 215 : 160; g.beginPath(); g.moveTo(cx + Math.cos(a - .09) * 82, cy + Math.sin(a - .09) * 82); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a + .09) * 82, cy + Math.sin(a + .09) * 82); g.closePath(); g.fillStyle = long ? '#d9b45f' : '#8fb7e8'; g.fill(); }
  g.fillStyle = '#e9dfc6'; g.beginPath(); g.arc(cx, cy, 34, 0, TAU); g.fill();
}, [1, 1], true);
function rugTexture(wm, dm, pal) {
  const W = Math.max(64, Math.round(wm * 28)), H = Math.max(64, Math.round(dm * 28));
  return ctex(W, H, g => { g.fillStyle = pal[0]; g.fillRect(0, 0, W, H); g.strokeStyle = pal[1]; g.lineWidth = 10; g.strokeRect(10, 10, W - 20, H - 20); g.lineWidth = 3; g.strokeStyle = pal[2]; g.strokeRect(28, 28, W - 56, H - 56);
    g.fillStyle = pal[1]; for (let y = 56; y < H - 40; y += 42) for (let x = 56; x < W - 40; x += 42) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.fill(); } }, [1, 1], true);
}
function textSign(w, h, small, big, accent = '#d9b45f', sub = '') {
  return ctex(w, h, g => { g.fillStyle = '#17120e'; g.fillRect(0, 0, w, h); g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
    g.textAlign = 'center'; g.fillStyle = accent; g.font = '600 30px Georgia,serif'; g.fillText(small, w / 2, 70); g.fillStyle = '#f4e6c8'; g.font = '600 76px Georgia,serif'; g.fillText(big, w / 2, 150); if (sub) { g.fillStyle = '#b9ab8c'; g.font = 'italic 28px Georgia,serif'; g.fillText(sub, w / 2, 192); } }, [1, 1], true);
}
function sectionSign(s) {
  const w = 1024, h = 220;
  return ctex(w, h, g => { g.fillStyle = '#17120e'; g.fillRect(0, 0, w, h); g.fillStyle = '#211a13'; g.fillRect(8, 8, w - 16, h - 16);
    g.strokeStyle = '#d9b45f'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
    g.fillStyle = s.glow; g.beginPath(); g.arc(150, h / 2, 66, 0, TAU); g.fill(); g.fillStyle = '#1a120a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${s.roman.length > 2 ? 46 : 64}px Georgia,serif`; g.fillText(s.roman, 150, h / 2 + 3);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#d9b45f'; g.font = '600 30px Georgia,serif'; g.fillText(s.art ? 'A R T   G A L L E R Y' : 'G A L L E R Y', 250, 78); g.fillStyle = '#f4e6c8'; g.font = '600 84px Georgia,serif'; g.fillText(s.name, 250, 160); }, [1, 1], true);
}
function directoryTexture() {
  const w = 1024, h = 640;
  return ctex(w, h, g => { g.fillStyle = '#17120e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b45f'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.textAlign = 'center'; g.fillStyle = '#f4e6c8'; g.font = '600 56px Georgia,serif'; g.fillText('Gallery Directory', w / 2, 90);
    const rows = [['north wall · west'], ['north wall · centre'], ['north wall · east'], ['west wall'], ['east wall'], ['east wall · south']];
    SECTIONS.forEach((s, i) => { const y = 160 + i * 62; g.fillStyle = s.glow; g.beginPath(); g.arc(90, y - 12, 18, 0, TAU); g.fill(); g.textAlign = 'left'; g.fillStyle = '#f4e6c8'; g.font = '600 38px Georgia,serif'; g.fillText(`${s.roman}  ${s.name}`, 130, y); g.fillStyle = '#b9ab8c'; g.font = 'italic 28px Georgia,serif'; g.fillText(rows[i][0], 560, y); });
    g.fillStyle = '#d9b45f'; g.font = 'italic 30px Georgia,serif'; g.fillText('✎  Art Studio — west side · draw together', 130, 570); }, [1, 1], true);
}

export function buildMuseum(K) {
  const { loc, wall, door, seat, light } = K;
  const { HX, HZ, WH, APEX, PANEL } = MUSEUM;
  const MU = loc('museum', { name: 'Museum', spawn: { x: 0, z: 25, ry: 0 }, bounds: [-HX, -HZ, HX, HZ],
    sky: { bg: '#15110f', fog: ['#2a2220', 40, 160] }, music: .8, ambience: 'hall' });
  MU.sections = SECTIONS; const G = MU.group;

  /* ----- batches: one merged mesh per material key ----- */
  const B = new Batch(); // static, vertex-coloured
  const mats = {
    vc: new THREE.MeshLambertMaterial({ vertexColors: true }),
    vs: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .42 }),
    gold: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .35, metalness: .5, emissive: '#3a2406' }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    win: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })
  };
  const bx = (key, w, h, d, x, y, z, color, o = {}) => B.add(key, UB, { x, y: y + h / 2, z, sx: w, sy: h, sz: d, color, ...o });
  const cyl = (key, r, h, x, y, z, color, o = {}) => B.add(key, UC, { x, y: y + h / 2, z, sx: r, sy: h, sz: r, color, ...o });
  const sph = (key, r, x, y, z, color, o = {}) => B.add(key, US, { x, y, z, s: r, color, ...o });
  const col = (x, z, hw, hd = hw) => MU.colliders.push({ b: [x - hw, z - hd, x + hw, z + hd] });
  const GOLD = '#d9b45f', CREAM = '#ece4d4', MARB = '#efe8dc';

  /* ----- shell ----- */
  const wallM = ML('#ebe3d3');
  K.add(MU, new THREE.PlaneGeometry(HX * 2, HZ * 2), new THREE.MeshStandardMaterial({ map: marble([20, 16]), roughness: .22, metalness: .05 }), 0, 0, 0, { rx: -PI / 2, shadow: false });
  wall(MU, 'x', -HZ - .3, -HX - .6, HX + .6, WH, wallM, [], .6);
  wall(MU, 'x', HZ + .3, -HX - .6, HX + .6, WH, wallM, [{ a: -1.1, b: 1.1, high: 2.3 }], .6);
  wall(MU, 'z', -HX - .3, -HZ, HZ, WH, wallM, [], .6);
  wall(MU, 'z', HX + .3, -HZ, HZ, WH, wallM, [], .6);
  const ceilM = ML('#f1eadc', { side: THREE.BackSide }), rise = (APEX - WH) / HZ;
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(HZ, HZ, HX * 2, 40, 1, true, 0, PI), ceilM); vault.rotation.z = PI / 2; vault.scale.set(rise, 1, 1); vault.position.y = WH; G.add(vault);
  for (const sgn of [-1, 1]) { const gable = new THREE.Mesh(new THREE.CircleGeometry(HZ, 40, 0, PI), wallM); gable.scale.y = rise; gable.position.set(sgn * (HX - .005), WH, 0); gable.rotation.y = -sgn * PI / 2; G.add(gable); }
  const ribGeo = new THREE.TorusGeometry(HZ - .3, .32, 8, 36, PI);
  for (let x = -36; x <= 36; x += 8) B.add('gold', ribGeo, { x, y: WH, z: 0, ry: PI / 2, sy: rise, color: '#cdb27a' });
  bx('glow', HX * 2 - 4, .08, 2.4, 0, APEX - .14, 0, '#fff2d8'); // skylight strip along the apex
  // skirting, crown moulding, pilasters
  for (const z of [-HZ, HZ]) { bx('vc', HX * 2, .3, .12, 0, 0, z - Math.sign(z) * .06, '#7a5a3a'); bx('gold', HX * 2, .25, .22, 0, WH - .25, z - Math.sign(z) * .11, GOLD); }
  for (const x of [-HX, HX]) { bx('vc', .12, .3, HZ * 2, x - Math.sign(x) * .06, 0, 0, '#7a5a3a'); bx('gold', .22, .25, HZ * 2, x - Math.sign(x) * .11, WH - .25, 0, GOLD); }
  const pil = (x, z, alongX) => { const w = alongX ? 1.1 : .5, d = alongX ? .5 : 1.1; bx('vs', w, WH - .25, d, x, 0, z, CREAM); bx('gold', w + .15, .3, d + .15, x, 0, z, GOLD); bx('gold', w + .15, .3, d + .15, x, WH - .55, z, GOLD); };
  [-13.6, 13.6, -39.4, 39.4].forEach(x => pil(x, -HZ + .25, true)); [-39.4, -13.6, 13.6, 39.4].forEach(x => pil(x, HZ - .25, true));
  [-28, -.2, 22, 29].forEach(z => pil(-HX + .25, z, false)); [-28, 1.4, 24, 29].forEach(z => pil(HX - .25, z, false));
  // grand entrance portal around the door
  [-1].concat([1]).forEach(s => { bx('vs', .6, 5.2, .5, s * 1.75, 0, HZ - .25, CREAM); bx('gold', .8, .3, .7, s * 1.75, 0, HZ - .25, GOLD); bx('gold', .8, .3, .7, s * 1.75, 4.9, HZ - .25, GOLD); });
  bx('vs', 4.3, .5, .5, 0, 4.95, HZ - .25, CREAM); bx('gold', 4.5, .12, .6, 0, 5.45, HZ - .25, GOLD); sph('gold', .22, 0, 5.15, HZ - .6, GOLD);

  /* ----- gallery accent panels + section signs ----- */
  const slotsFor = si => { const s = SECTIONS[si], sp = s.cap === 8 ? 3.0 : 3.2, out = [];
    for (let k = 0; k < s.cap; k++) { const off = (k - (s.cap - 1) / 2) * sp, e = PANEL + .02;
      out.push(s.wall === 'N' ? { x: s.c + off, z: -HZ + e, ry: 0, nx: 0, nz: 1 } : s.wall === 'W' ? { x: -HX + e, z: s.c + off, ry: PI / 2, nx: 1, nz: 0 } : { x: HX - e, z: s.c + off, ry: -PI / 2, nx: -1, nz: 0 }); }
    return out; };
  const signMesh = (tex, w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); m.position.set(x, y, z); m.rotation.y = ry; G.add(m); return m; };
  SECTIONS.forEach((s, i) => {
    const len = s.cap === 8 ? 24.6 : 20.2, ph = 7.6, T = PANEL, y = 6.55;
    if (s.wall === 'N') { bx('vc', len, ph, T, s.c, 0, -HZ + T / 2, s.color); bx('gold', len + .2, .14, T + .06, s.c, ph, -HZ + (T + .06) / 2, GOLD); signMesh(sectionSign(s), 7.2, 1.55, s.c, y, -HZ + T + .04, 0); bx('gold', 7.4, 1.75, .06, s.c, y - .875, -HZ + T + .01, GOLD); }
    else { const sg = s.wall === 'W' ? 1 : -1, wx = sg * -HX; bx('vc', T, ph, len, wx + sg * T / 2, 0, s.c, s.color); bx('gold', T + .06, .14, len + .2, wx + sg * (T + .06) / 2, ph, s.c, GOLD); signMesh(sectionSign(s), 7.2, 1.55, wx + sg * (T + .04), y, s.c, sg * PI / 2); bx('gold', .06, 1.75, 7.4, wx + sg * (T + .01), y - .875, s.c, GOLD); }
  });
  // welcome sign over the door (inside) + studio sign
  signMesh(textSign(1024, 220, 'WELCOME TO', 'Our Museum', GOLD, 'Entrance Hall'), 7.2, 1.55, 0, 7.2, HZ - .02, PI);
  signMesh(textSign(1024, 220, 'ART STUDIO', 'Draw Together', '#8fd8ff', 'easel · colours · brushes'), 7.2, 1.55, -HX + .03, 7, 12, PI / 2);

  /* ----- windows + light beams ----- */
  const winShapeCache = {}, winGeo = (w, h) => { const k = w + '_' + h; if (winShapeCache[k]) return winShapeCache[k]; const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.absarc(0, h, w / 2, 0, PI, false); s.lineTo(-w / 2, 0); return (winShapeCache[k] = new THREE.ShapeGeometry(s, 12)); };
  const beams = new Batch(), pools = new Batch(), dustBase = [];
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTexture(), vertexColors: true, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const poolMat = new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(255,236,200,.9)'], [1, 'rgba(255,236,200,0)']]), vertexColors: true, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function beam(A, Bp, wTop, wBot, tint = '#ffe9c4') {
    const dir = Bp.clone().sub(A), e1 = new THREE.Vector3().crossVectors(dir, V(0, 1, 0)).normalize(), e2 = new THREE.Vector3().crossVectors(dir, e1).normalize();
    const pos = [], uv = [], idx = []; [e1, e2].forEach((e, k) => { const o = k * 4; [[A, wTop, 1, -1], [A, wTop, 1, 1], [Bp, wBot, 0, -1], [Bp, wBot, 0, 1]].forEach(([P, w, v, sg]) => { pos.push(P.x + e.x * w / 2 * sg, P.y + e.y * w / 2 * sg, P.z + e.z * w / 2 * sg); uv.push(sg < 0 ? 0 : 1, v); }); idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    beams.add('b', g, { color: tint }); pools.add('p', new THREE.PlaneGeometry(1, 1), { x: Bp.x, y: .03, z: Bp.z, rx: -PI / 2, sx: wBot * 1.5, sy: wBot * 1.1, color: tint });
    for (let i = 0; i < 9; i++) { const t = Math.random(), P = A.clone().lerp(Bp, t), w = wTop + (wBot - wTop) * t; dustBase.push([P.x + e1.x * (Math.random() - .5) * w, P.y, P.z + e1.z * (Math.random() - .5) * w, Math.random() * TAU]); }
  }
  const norm = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };
  function windowAt(side, pos, w = 3.4, y0 = 8.3, h = 3.6) {
    const [nx, nz] = norm[side], ry = { N: 0, S: PI, W: PI / 2, E: -PI / 2 }[side], lat = [nz, -nx];
    const wx = side === 'N' ? pos : side === 'S' ? pos : side === 'W' ? -HX : HX, wz = side === 'N' ? -HZ : side === 'S' ? HZ : pos;
    const px = wx + nx * .04, pz = wz + nz * .04;
    B.add('win', winGeo(w, h), { x: px, y: y0, z: pz, ry, color: '#dff0ff' });
    // mullions
    bx('vc', .09, h + w / 2, .06, px + nx * .01, y0, pz + nz * .01, '#3a2a1c', { ry }); bx('vc', w, .08, .06, px + nx * .01, y0 + h * .45, pz + nz * .01, '#3a2a1c', { ry }); bx('vc', w, .08, .06, px + nx * .01, y0 + h * .9, pz + nz * .01, '#3a2a1c', { ry });
    const yc = y0 + h * .6, A = V(px + nx * .15, yc, pz + nz * .15), sk = (pos * 7 | 0) % 2 ? 1 : -1;
    beam(A, V(A.x + nx * yc * .55 + lat[0] * yc * .12 * sk, .03, A.z + nz * yc * .55 + lat[1] * yc * .12 * sk), w * .9, w * 1.7);
  }
  [-27.2, 0, 27.2].forEach(x => windowAt('N', x)); [-28, -16, 16, 28].forEach(x => windowAt('S', x, 3.4, 7.6));
  [-12, 5, 19].forEach(z => windowAt('W', z)); [-12, 12.5].forEach(z => windowAt('E', z));
  const roseMat = new THREE.MeshBasicMaterial({ map: roseTexture(), fog: false });
  for (const sg of [-1, 1]) { const rw = new THREE.Mesh(new THREE.CircleGeometry(4.6, 40), roseMat); rw.position.set(sg * (HX - .06), 18.6, 0); rw.rotation.y = -sg * PI / 2; G.add(rw);
    const A = V(sg * (HX - .3), 18.6, 0); [-5, 0, 5].forEach(l => beam(A, V(-sg * 11, .03, l * 1.6), 3, 7.5, '#ffd9e8')); }
  const beamMesh = new THREE.Mesh(beams.take('b'), beamMat); beamMesh.renderOrder = 3; G.add(beamMesh);
  const poolMesh = new THREE.Mesh(pools.take('p'), poolMat); poolMesh.renderOrder = 2; G.add(poolMesh);
  const dustPos = new Float32Array(dustBase.length * 3), dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#fff3d6', size: .09, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending })); dust.frustumCulled = false; G.add(dust);

  /* ----- real lights (kept to 4) ----- */
  G.add(new THREE.HemisphereLight('#fff1dc', '#6a5846', .95));
  const dl = new THREE.DirectionalLight('#ffe6c4', .8); dl.position.set(-14, 30, 24); G.add(dl);
  light(MU, '#ffd9a0', 70, 34, 0, 7, -6); light(MU, '#a9c8ff', 38, 26, -29, 6, 12);

  /* ----- decor helpers ----- */
  const spinners = [], goldM = new THREE.MeshStandardMaterial({ color: '#e8b64a', roughness: .3, metalness: .6, emissive: '#6a4208', emissiveIntensity: .8 });
  const heartGeo = (() => { const h = new THREE.Shape(); h.moveTo(0, -.5); h.bezierCurveTo(-.15, -.35, -.5, -.1, -.5, .15); h.bezierCurveTo(-.5, .4, -.2, .5, 0, .28); h.bezierCurveTo(.2, .5, .5, .4, .5, .15); h.bezierCurveTo(.5, -.1, .15, -.35, 0, -.5);
    const g = new THREE.ExtrudeGeometry(h, { depth: .22, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 3, curveSegments: 14 }); g.center(); return g; })();
  const spinMesh = (geo, x, y, z, s, speed, bob = 0) => { const m = new THREE.Mesh(geo, goldM); m.position.set(x, y, z); m.scale.setScalar(s); m.castShadow = false; G.add(m); spinners.push({ m, speed, bob, y0: y }); return m; };
  function pedestal(x, z, w, h, color = MARB) { bx('vs', w + .35, .25, w + .35, x, 0, z, '#d6cdbb'); bx('vs', w, h, w, x, .25, z, color); bx('vs', w + .2, .16, w + .2, x, .25 + h, z, '#d6cdbb'); col(x, z, (w + .35) / 2); return .25 + h + .16; }
  function figure(x, y0, z, ry, s = 1, pose = 0, color = MARB) { // chibi marble figure; origin = feet, faces -Z at ry 0
    const A = B.at(x, y0, z, ry, s);
    [-1, 1].forEach(sd => { A.add('vs', capsule(.09, .26), { x: sd * .1, y: .22, color }); A.add('vs', US, { x: sd * .1, y: .06, z: -.04, sx: .12, sy: .07, sz: .17, color: '#d9d0be' }); });
    A.add('vs', US, { y: .66, sx: .21, sy: .27, sz: .17, color });
    [-1, 1].forEach(sd => A.add('vs', capsule(.06, .22), { x: sd * .27, y: pose && sd > 0 ? .84 : .64, rz: sd * (pose && sd > 0 ? 2.6 : .22), color }));
    A.add('vs', US, { y: 1.07, s: .24, color }); A.add('vs', US, { y: 1.14, z: .03, sx: .25, sy: .17, sz: .25, color: '#d9d0be' });
  }
  const statueFigure = (x, z, ry, s, pose) => { const top = pedestal(x, z, 1.1, 1, MARB); figure(x, top, z, ry, s, pose); };
  const statueSpin = (x, z, kind) => { const top = pedestal(x, z, 1.0, 1.1, '#e4dccb');
    if (kind === 'heart') spinMesh(heartGeo, x, top + 1.05, z, 1.3, .8, .12);
    else if (kind === 'spiral') spinMesh(new THREE.TorusKnotGeometry(.5, .13, 90, 10, 2, 3), x, top + 1.0, z, 1, .6, .1);
    else { const g = new THREE.Group(); g.position.set(x, top + 1.1, z); [[0, 0], [PI / 2, 0], [PI / 3, PI / 3]].forEach(([rx, ry]) => { const r = new THREE.Mesh(new THREE.TorusGeometry(.75, .035, 8, 40), goldM); r.rotation.set(rx, ry, 0); g.add(r); }); g.add(new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), new THREE.MeshStandardMaterial({ color: '#8fb7e8', emissive: '#2a4a7a' }))); G.add(g); spinners.push({ m: g, speed: .5, bob: .05, y0: g.position.y }); } };
  function plant(x, z, s = 1, kind = 'bush') {
    const A = B.at(x, 0, z, 0, s);
    A.add('vc', UC, { y: .26, sx: .32, sy: .52, sz: .32, color: '#b8643e' }); A.add('vc', UC, { y: .55, sx: .37, sy: .08, sz: .37, color: '#a1552f' });
    if (kind === 'palm') { A.add('vc', UC, { y: 1.5, sx: .09, sy: 1.9, sz: .09, color: '#6b4a2e' }); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; A.add('vc', ICO, { x: Math.cos(a) * .55, y: 2.55 - (i % 2) * .15, z: Math.sin(a) * .55, sx: .55, sy: .09, sz: .2, ry: -a, rz: -.4, color: i % 2 ? '#2f7a3d' : '#3d9150' }); } A.add('vc', ICO, { y: 2.6, s: .28, color: '#2f7a3d' }); }
    else { [[0, .95, 0, .5], [.3, .75, .1, .34], [-.28, .8, -.1, .36], [.05, 1.3, .08, .32]].forEach(([dx, dy, dz, r], i) => A.add('vc', ICO, { x: dx, y: dy, z: dz, s: r, color: i % 2 ? '#3d8a48' : '#2f7a3d' })); }
    col(x, z, .4 * s);
  }
  function benchAt(x, z, yaw) { // two-seater, same behaviour as the garden bench
    const A = B.at(x, 0, z, yaw), wd = '#5b3d26';
    A.add('vc', UB, { y: .43, sx: 1.9, sy: .08, sz: .55, color: wd }); A.add('vc', UB, { y: .72, z: .27, sx: 1.9, sy: .4, sz: .07, color: wd }); [-.8, .8].forEach(o => A.add('vc', UB, { x: o, y: .2, sx: .08, sy: .4, sz: .5, color: '#222' }));
    const sw = Math.abs(Math.sin(yaw)) > .5, hx = sw ? .4 : 1.05, hz = sw ? 1.05 : .4; col(x, z, hx, hz);
    [-.5, .5].forEach(o => seat(MU, x + o * Math.cos(yaw), .46, z - o * Math.sin(yaw), yaw, 'Sit on the bench'));
  }
  function column(x, z) { const A = B.at(x, 0, z); A.add('vs', UB, { y: .25, sx: 1.5, sy: .5, sz: 1.5, color: CREAM }); A.add('vs', new THREE.CylinderGeometry(.55, .62, WH - 1.3, 20), { y: .5 + (WH - 1.3) / 2, color: MARB }); A.add('gold', new THREE.TorusGeometry(.6, .06, 6, 20), { y: 1.3, rx: PI / 2, color: GOLD }); A.add('vs', UB, { y: WH - .55, sx: 1.5, sy: .4, sz: 1.5, color: CREAM }); A.add('gold', UB, { y: WH - .3, sx: 1.7, sy: .12, sz: 1.7, color: GOLD }); col(x, z, .75); }
  const rugM = (tex) => new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  function rug(cx, cz, w, d, pal, yaw = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), rugM(rugTexture(w, d, pal))); m.rotation.order = 'YXZ'; m.rotation.set(-PI / 2, yaw, 0); m.position.set(cx, .02, cz); G.add(m); }

  /* ----- centrepiece: two marble figures holding a golden heart, on a stepped dais ----- */
  const DX = 0, DZ = -6;
  cyl('vs', 7.2, .25, DX, 0, DZ, '#d6cdbb'); cyl('vs', 6.4, .25, DX, .25, DZ, CREAM); cyl('vs', 5.6, .25, DX, .5, DZ, '#d6cdbb'); cyl('vs', 2.1, 1.6, DX, .75, DZ, MARB); cyl('gold', 2.25, .14, DX, 2.3, DZ, GOLD);
  figure(DX - 1.0, 2.44, DZ, -PI / 2, 2.4, 1); figure(DX + 1.0, 2.44, DZ, PI / 2, 2.4, 1); col(DX, DZ, 5.6);
  spinMesh(heartGeo, DX, 7.4, DZ, 2.2, .7, .15);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.1, .06, 8, 60), goldM); halo.position.set(DX, 7.4, DZ); halo.rotation.x = PI / 2.4; G.add(halo); spinners.push({ m: halo, speed: -.35, bob: 0, y0: 7.4, axis: 'y' });
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; sph('glow', .12, DX + Math.cos(a) * 7.1, .45, DZ + Math.sin(a) * 7.1, '#ffd9a0'); }
  K.add(MU, new THREE.CircleGeometry(8.4, 48), new THREE.MeshLambertMaterial({ map: mosaicTexture(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), DX, .012, DZ, { rx: -PI / 2, shadow: false });

  /* ----- columns, statues, sculptures, plants, benches ----- */
  [-10, -2, 6, 14, 22].forEach(z => { column(-15, z); column(15, z); });
  statueFigure(-6, 29.6, PI, 1.6, 0); statueFigure(6, 29.6, PI, 1.6, 1);
  statueSpin(-11, 27, 'heart'); statueSpin(11, 27, 'heart');
  statueSpin(-22, -1, 'spiral'); statueSpin(22, -1, 'spiral'); statueSpin(-9, 18, 'armillary'); statueSpin(9, 18, 'armillary');
  statueFigure(-22, 8, PI / 2, 1.7, 1); statueFigure(22, 8, -PI / 2, 1.7, 0);
  [[-38.4, -30.4], [38.4, -30.4], [-38.4, 30.4], [38.4, 30.4], [-38.4, 1.2], [38.4, 1.4]].forEach(([x, z]) => plant(x, z, 1.5, 'palm'));
  [[-13.9, -30.6], [13.9, -30.6], [-3.5, 30.6], [3.5, 30.6], [-22, 29.5], [22, 29.5], [-34, 22], [34, 24.5]].forEach(([x, z]) => plant(x, z, 1.1, 'bush'));
  [[-24, -2], [24, -2], [-24, 20], [24, 20]].forEach(([x, z]) => plant(x, z, 1, 'palm'));
  SECTIONS.forEach(s => { const off = s.cap === 8 ? 5.5 : 4.4;
    if (s.wall === 'N') [-off, off].forEach(o => benchAt(s.c + o, -27.6, 0)); else if (s.wall === 'W') [-off, off].forEach(o => benchAt(-35.6, s.c + o, PI / 2)); else [-off, off].forEach(o => benchAt(35.6, s.c + o, -PI / 2)); });
  benchAt(-25, 6, PI / 2); benchAt(-25, 18, PI / 2); benchAt(-17, 29.4, 0); benchAt(17, 29.4, 0);

  /* ----- rugs ----- */
  rug(0, 14, 5, 22, ['#7a1f2b', '#d9b45f', '#f0dca0']);
  SECTIONS.forEach((s, i) => { const pal = [['#1d3550', '#d9b45f', '#9fc4ee'], ['#4d1f2c', '#d9b45f', '#f0a0b0'], ['#1d4638', '#d9b45f', '#a0f0cc'], ['#4a3a1d', '#d9b45f', '#f0dca0'], ['#3a1f58', '#d9b45f', '#cfa8ff'], ['#6a431d', '#d9b45f', '#ffd0a0']][i];
    if (s.wall === 'N') rug(s.c, -26.2, s.cap === 8 ? 14 : 11, 3.6, pal); else if (s.wall === 'W') rug(-35.5, s.c, 3.6, 14, pal); else rug(35.5, s.c, 3.6, s.cap === 8 ? 14 : 11, pal); });
  rug(-30, 12, 11, 9, ['#1d4a50', '#8fd8ff', '#d8f4ff']);

  /* ----- glowing floor strips (core + soft glow) ----- */
  const stripGlowM = new THREE.MeshBasicMaterial({ map: vgrad(4, 64, [[0, 'rgba(255,255,255,0)'], [.5, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]), vertexColors: true, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const SG = new Batch();
  function strip(x0, z0, x1, z1, color) { const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), a = -Math.atan2(dz, dx), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    B.add('glow', UB, { x: mx, y: .03, z: mz, sx: L, sy: .02, sz: .13, ry: a, color }); SG.add('g', new THREE.PlaneGeometry(1, 1), { x: mx, y: .026, z: mz, sx: L + .5, sy: 1.0, rx: -PI / 2, ry: a, order: 'YXZ', color }); }
  const ringStrip = (r, color) => { B.add('glow', new THREE.RingGeometry(r, r + .14, 64), { x: DX, y: .03, z: DZ, rx: -PI / 2, color });
    const n = 40, chord = 2 * r * Math.sin(PI / n) + .12; for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU; SG.add('g', new THREE.PlaneGeometry(1, 1), { x: DX + Math.cos(a) * r, y: .026, z: DZ + Math.sin(a) * r, sx: chord, sy: 1.0, rx: -PI / 2, ry: -(a + PI / 2), order: 'YXZ', color }); } };
  ringStrip(8.7, '#ffd76f'); strip(-3, 25, -3, 3, '#8fd8ff'); strip(3, 25, 3, 3, '#8fd8ff');
  const target = s => s.wall === 'N' ? [s.c, -22.6] : s.wall === 'W' ? [-34, s.c] : [34, s.c];
  SECTIONS.forEach(s => { const [tx, tz] = target(s), len = s.cap === 8 ? 11 : 8.6;
    if (s.wall === 'N') strip(s.c - len, tz, s.c + len, tz, s.glow); else strip(tx, s.c - len, tx, s.c + len, s.glow);
    const dx = tx - DX, dz = tz - DZ, l = Math.hypot(dx, dz); strip(DX + dx / l * 9.2, DZ + dz / l * 9.2, tx, tz, s.glow); });
  const stripGlow = new THREE.Mesh(SG.take('g'), stripGlowM); stripGlow.renderOrder = 2; G.add(stripGlow);

  /* ----- chandeliers: cables + gold rings + glowing bulbs + one sprite halo each ----- */
  const haloMat = new THREE.SpriteMaterial({ map: radial([[0, 'rgba(255,220,160,.95)'], [.4, 'rgba(255,200,130,.35)'], [1, 'rgba(255,200,130,0)']]), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .7 }), halos = [];
  [[-26, -6], [26, -6], [-13, -17], [13, -17], [-13, 9], [13, 9], [0, 19], [-30, 22], [30, 22]].forEach(([x, z]) => {
    const ceil = WH + (APEX - WH) * Math.sqrt(Math.max(0, 1 - (z / HZ) ** 2)) - .2, ry = ceil - 6.2;
    cyl('vc', .03, 6.2, x, ry, z, '#2a2118'); B.add('gold', new THREE.TorusGeometry(1.25, .07, 8, 32), { x, y: ry, z, rx: PI / 2, color: GOLD }); B.add('gold', new THREE.TorusGeometry(.7, .05, 8, 24), { x, y: ry + .45, z, rx: PI / 2, color: GOLD });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; sph('glow', .13, x + Math.cos(a) * 1.25, ry + .14, z + Math.sin(a) * 1.25, '#ffe2a8'); }
    const h = new THREE.Sprite(haloMat); h.scale.set(7, 7, 1); h.position.set(x, ry, z); G.add(h); halos.push(h);
  });

  /* ----- art studio: shared easel with a live preview canvas ----- */
  const EX = -31.2, EZ = 12, ec = document.createElement('canvas'); ec.width = 512; ec.height = 384;
  { const g = ec.getContext('2d'); g.fillStyle = '#fffdf8'; g.fillRect(0, 0, 512, 384); g.fillStyle = '#b9ab8c'; g.font = 'italic 30px Georgia,serif'; g.textAlign = 'center'; g.fillText('✎ draw together', 256, 200); }
  const etex = new THREE.CanvasTexture(ec); etex.colorSpace = THREE.SRGBColorSpace; etex.anisotropy = 4;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshBasicMaterial({ map: etex })); board.position.set(EX + .16, 2.2, EZ); board.rotation.y = PI / 2; G.add(board);
  const wd = '#8a5a34';
  [-1, 1].forEach(s => bx('vc', .1, 3.6, .1, EX, 0, EZ + s * 1.75, wd)); // front posts
  bx('vc', .12, .12, 3.7, EX, .9, EZ, wd); bx('vc', .12, .12, 3.7, EX, 3.5, EZ, wd); bx('vc', .45, .08, 3.6, EX + .25, .9, EZ, '#a56e3f');
  bx('vc', .06, 2.4 + .16, .08, EX + .12, 1.0, EZ - 1.64, '#5b3d26'); bx('vc', .06, 2.4 + .16, .08, EX + .12, 1.0, EZ + 1.64, '#5b3d26'); // frame sides (behind board)
  B.add('vc', capsule(.05, 3.4), { x: EX - .9, y: 1.7, z: EZ, rz: .5, color: wd }); col(EX, EZ, .8, 2.0);
  // paint table with colour pots + stool
  bx('vc', 1.5, .08, .8, EX + 3.4, .85, EZ + 3.8, '#a56e3f'); [[-.65, -.3], [.65, -.3], [-.65, .3], [.65, .3]].forEach(([a, b]) => bx('vc', .07, .85, .07, EX + 3.4 + a, 0, EZ + 3.8 + b, wd)); col(EX + 3.4, EZ + 3.8, .85, .5);
  ['#e8403a', '#f2c14e', '#3cb878', '#4aa3df', '#9b59b6', '#ffffff'].forEach((c, i) => { cyl('vc', .1, .14, EX + 2.85 + i * .22, .93, EZ + 3.8, '#e9e3d3'); cyl('vc', .085, .02, EX + 2.85 + i * .22, 1.065, EZ + 3.8, c); });
  cyl('vc', .3, .5, EX + 3.6, 0, EZ - 3, '#6b4a2e'); cyl('vc', .36, .08, EX + 3.6, .5, EZ - 3, '#a56e3f');
  MU.easel = { x: EX + 2.3, z: EZ, r: 3.8, canvas: ec, tex: etex };

  /* ----- directory board in the entrance hall ----- */
  const dirTex = directoryTexture(); signMesh(dirTex, 3.4, 2.125, -9.5, 2.2, 23.4, 0); bx('gold', 3.6, 2.35, .08, -9.5, 1.025, 23.34, GOLD); [-1.4, 1.4].forEach(o => bx('vc', .12, 1.1, .12, -9.5 + o, 0, 23.3, '#3a2a1c')); col(-9.5, 23.3, 1.8, .3);

  /* ----- exit door ----- */
  const mdoor = door(MU, 'mu-exit', 0, HZ + .3, 'x', 2.2, 1, M('#5b3a22', { roughness: .5 }), { portal: { label: 'Go outside to the House' } });
  MU.portals.push({ x: 0, z: HZ - 1.4, r: 1.6, to: 'house', label: 'Leave the museum → House', door: mdoor }); MU.exits = [mdoor];

  /* ----- flush batches (one draw call per material) ----- */
  B.build(G, mats);
  // ground mist (two soft drifting layers) – hidden on Low graphics
  const mistTex = mistTexture(); mistTex.repeat.set(3, 2.4);
  const mists = [.3, .8].map((y, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2 - 2, HZ * 2 - 2), new THREE.MeshBasicMaterial({ map: mistTex.clone(), transparent: true, opacity: .2 - i * .05, depthWrite: false, color: '#d9d2ff' })); m.material.map.repeat.set(3, 2.4); m.material.map.needsUpdate = true; m.rotation.x = -PI / 2; m.position.y = y; m.renderOrder = 4; G.add(m); return m; });

  /* ----- frames: placed in each section; spotlight cones + wall wash are merged per rebuild ----- */
  const frameGroup = new THREE.Group(), rigGroup = new THREE.Group(); G.add(frameGroup, rigGroup);
  const texLoader = new THREE.TextureLoader(), frameMat = M('#b58a46', { roughness: .4, metalness: .35 }), texCache = new Map();
  const coneMat = new THREE.MeshBasicMaterial({ map: vgrad(4, 64, [[0, 'rgba(255,240,210,.7)'], [1, 'rgba(255,240,210,0)']]), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const washMat = new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(255,225,170,.8)'], [.6, 'rgba(255,225,170,.25)'], [1, 'rgba(255,225,170,0)']]), vertexColors: true, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const fixMats = { vc: mats.vc, cone: coneMat, wash: washMat };
  const coneGeo = new THREE.ConeGeometry(1, 1, 14, 1, true);
  const getTex = (file, aniso, cb) => { let e = texCache.get(file); if (!e) { e = { tex: null, cbs: [cb] }; texCache.set(file, e); texLoader.load(`/media/thumb/${file}`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; e.tex = t; e.cbs.forEach(f => f(t)); e.cbs = []; }); } else if (e.tex) cb(e.tex); else e.cbs.push(cb); };
  MU.setPhotos = (list, maxAniso = 4) => {
    frameGroup.children.slice().forEach(c => { c.traverse(o => { o.geometry?.dispose(); if (o.material && o.material !== frameMat) { if (o.userData.own) o.material.map?.dispose(); o.material.dispose?.(); } }); frameGroup.remove(c); });
    rigGroup.children.slice().forEach(c => { c.geometry?.dispose(); rigGroup.remove(c); });
    MU.frames.length = 0; const used = new Set(), perRoom = {}, rig = new Batch(), FY = 1.95;
    for (const p of list) {
      if (p.room < 0 || p.room >= SECTIONS.length) continue; const idx = perRoom[p.room] = (perRoom[p.room] ?? -1) + 1, slot = slotsFor(p.room)[idx]; if (!slot) continue; used.add(p.file);
      const g = new THREE.Group(); g.position.set(slot.x, FY, slot.z); g.rotation.y = slot.ry; frameGroup.add(g);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .06), frameMat); fr.castShadow = false; g.add(fr);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#555', roughness: .6, emissive: '#fff', emissiveIntensity: 0 })); pic.position.z = .033; g.add(pic);
      let label = null;
      if (p.caption) { // engraved plaque under the frame
        const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 128; const lg = lc.getContext('2d');
        lg.fillStyle = 'rgba(28,22,17,.95)'; lg.beginPath(); lg.roundRect(4, 4, 1016, 120, 22); lg.fill(); lg.strokeStyle = '#c7a66b'; lg.lineWidth = 4; lg.stroke();
        lg.fillStyle = '#f4e6c8'; lg.textAlign = 'center'; lg.textBaseline = 'middle'; let fs = 52; lg.font = `${fs}px Georgia, serif`; while (lg.measureText(p.caption).width > 960 && fs > 22) { fs -= 2; lg.font = `${fs}px Georgia, serif`; } lg.fillText(p.caption, 512, 68);
        const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = maxAniso;
        label = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false })); label.userData.own = true; g.add(label);
      }
      const fit = (aw, ah) => { const k = Math.min(2.3 / aw, 2 / ah), w = aw * k, h = ah * k; pic.scale.set(w, h, 1); fr.scale.set(w + .16, h + .16, 1); if (label) { const lw = Math.max(1.5, Math.min(2.4, w + .16)); label.scale.set(lw, lw / 8, 1); label.position.set(0, -(h + .16) / 2 - lw / 16 - .08, .04); } };
      fit(1.5, 1); pic.userData = fr.userData = { photo: p, frame: g };
      getTex(p.file, maxAniso, t => { if (!pic.parent) return; pic.material.map = t; pic.material.color.set('#fff'); pic.material.emissiveMap = t; pic.material.emissiveIntensity = .38; pic.material.needsUpdate = true; fit(t.image.width, t.image.height); });
      const wp = new THREE.Vector3(slot.x, FY, slot.z); MU.frames.push({ photo: p, group: g, pos: wp, ry: slot.ry, pic });
      // spotlight rig: fixture on an arm, additive cone onto the frame, soft wash on the wall behind it
      const w2 = (lx, ly, lz) => new THREE.Vector3(slot.x + lx * Math.cos(slot.ry) + lz * Math.sin(slot.ry), ly, slot.z - lx * Math.sin(slot.ry) + lz * Math.cos(slot.ry));
      const F = w2(0, 4.55, 1.15), T = w2(0, FY, .06), d = F.clone().sub(T), len = d.length(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()), mid = F.clone().add(T).multiplyScalar(.5);
      rig.add('cone', coneGeo, { x: mid.x, y: mid.y, z: mid.z, q, sx: 1.45, sy: len, sz: 1.45, color: '#fff0d2' });
      rig.add('vc', UC, { x: F.x, y: F.y, z: F.z, q, sx: .13, sy: .3, sz: .13, color: '#2a2a30' }); rig.add('vc', UB, { x: (F.x + slot.x) / 2, y: F.y + .12, z: (F.z + slot.z) / 2, ry: slot.ry, sx: .06, sy: .06, sz: 1.1, color: '#2a2a30' });
      const W = w2(0, FY, .02 + .012); rig.add('wash', new THREE.PlaneGeometry(1, 1), { x: W.x, y: W.y, z: W.z, ry: slot.ry, sx: 5.6, sy: 4.8, color: '#ffe2ae' });
    }
    for (const k of [...texCache.keys()]) if (!used.has(k)) { texCache.get(k).tex?.dispose(); texCache.delete(k); }
    const built = rig.build(rigGroup, fixMats); Object.values(built).forEach(m => m.renderOrder = 2);
  };

  /* ----- helpers used by main.js ----- */
  MU.zoneAt = (x, z) => {
    if (z > 21) return 'Entrance Hall';
    if (x < -17 && z > 2 && z < 22) return 'Art Studio';
    for (const s of SECTIONS) { const nm = `${s.roman} · ${s.name}`;
      if (s.wall === 'N' && z < -19 && Math.abs(x - s.c) < 13.5) return nm; if (s.wall === 'W' && x < -31 && Math.abs(z - s.c) < 13.5) return nm; if (s.wall === 'E' && x > 31 && Math.abs(z - s.c) < 13.5) return nm; }
    return 'Grand Hall';
  };
  let quality = 'high';
  MU.setQuality = q => { quality = q; mists.forEach(m => m.visible = q === 'high'); dust.visible = q !== 'low'; beamMat.opacity = q === 'low' ? .35 : .55; };
  const posA = dust.geometry.attributes.position; let dustT = 0;
  MU.tick.push((t, dt) => {
    const k = .8 + .2 * Math.sin(t * 1.6); mats.glow.color.setScalar(k);
    beamMat.opacity = (quality === 'low' ? .35 : .55) + Math.sin(t * .7) * .07;
    for (const s of spinners) { s.m.rotation.y += (s.speed) * dt; if (s.bob) s.m.position.y = s.y0 + Math.sin(t * 1.3 + s.speed * 9) * s.bob; }
    if (quality === 'high') mists.forEach((m, i) => { m.material.map.offset.x = t * (.004 + i * .003); m.material.map.offset.y = t * .002; });
    if (quality !== 'low' && (dustT += dt) > .05) { dustT = 0; for (let i = 0; i < dustBase.length; i++) { const b = dustBase[i]; dustPos[i * 3] = b[0] + Math.sin(t * .3 + b[3]) * .35; dustPos[i * 3 + 1] = b[1] + Math.sin(t * .22 + b[3] * 2) * .45; dustPos[i * 3 + 2] = b[2] + Math.cos(t * .27 + b[3]) * .35; } posA.needsUpdate = true; }
  });
  MU.slotsFor = slotsFor;
  return MU;
}
