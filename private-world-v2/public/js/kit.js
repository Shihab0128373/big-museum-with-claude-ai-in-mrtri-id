// Shared 3D helpers: materials, canvas textures, location factory, and a geometry Batch that merges
// many small parts into a few draw calls (important for mobile GPUs).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, metalness: 0, ...o });
export const ML = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
export function ctex(w, h, draw, rep = [1, 1], clamp = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const noise = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };
export const marble = rep => ctex(512, 512, (g, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#d9d4ca' : '#ece8df'; g.fillRect(x * w / 2, y * h / 2, w / 2, h / 2); } noise(g, w, h, 4000, .08); g.strokeStyle = 'rgba(120,110,95,.5)'; g.strokeRect(0, 0, w, h); g.strokeRect(w / 2, 0, 0, h); g.strokeRect(0, h / 2, w, 0); }, rep);
export const wood = rep => ctex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28,${35 + Math.random() * 10}%,${32 + Math.random() * 10}%)`; g.fillRect(0, i * h / 8, w, h / 8 - 2); for (let j = 0; j < 60; j++) { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(Math.random() * w, i * h / 8, Math.random() * 90, 1); } } }, rep);
export const grass = rep => ctex(256, 256, (g, w, h) => { g.fillStyle = '#2f5a2c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3500; i++) { g.fillStyle = `hsl(${95 + Math.random() * 30},45%,${18 + Math.random() * 18}%)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 5); } }, rep);
export const sky = stops => { const t = ctex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
/** Collects transformed, vertex-coloured copies of geometries per material key, then merges each key into ONE mesh. */
export class Batch {
  constructor() { this.map = new Map(); this.parent = null; }
  add(key, geo, o = {}) {
    const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, order = 'XYZ', s = 1, sx = s, sy = s, sz = s, color = '#ffffff', q } = o;
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal' && n !== 'uv') g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    _m.compose(_p.set(x, y, z), q ? _q.copy(q) : _q.setFromEuler(_e.set(rx, ry, rz, order)), _s.set(sx, sy, sz));
    if (this.parent) _m.premultiply(this.parent);
    g.applyMatrix4(_m);
    const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    let list = this.map.get(key); if (!list) this.map.set(key, list = []); list.push(g); return this;
  }
  /** scoped adder: everything added through it is placed relative to (x,y,z) rotated by yaw, scaled by s */
  at(x, y, z, yaw = 0, s = 1) {
    const parent = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(s, s, s)), self = this;
    return { add(key, geo, o) { const prev = self.parent; self.parent = parent; self.add(key, geo, o); self.parent = prev; return this; } };
  }
  take(key) { const l = this.map.get(key); this.map.delete(key); if (!l || !l.length) return null; const g = mergeGeometries(l, false); l.forEach(x => x.dispose()); if (!g) console.warn('[batch] merge failed for', key); return g; }
  build(group, mats, { shadow = false, receive = true } = {}) {
    const out = {};
    for (const key of [...this.map.keys()]) {
      const g = this.take(key), mat = mats[key]; if (!g || !mat) { if (!mat) console.warn('[batch] no material for', key); continue; }
      const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = receive; group.add(m); out[key] = m;
    }
    return out;
  }
}

export function makeKit(scene) {
  const locs = {};
  const loc = (id, o) => { const g = new THREE.Group(); g.visible = false; scene.add(g); return (locs[id] = { id, group: g, colliders: [], seats: [], portals: [], doors: [], blockers: [], frames: [], tick: [], ...o }); };
  const add = (L, geo, m, x, y, z, { shadow = true, block = false, rx = 0, ry = 0 } = {}) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.castShadow = shadow; o.receiveShadow = true; L.group.add(o);
    if (block) L.blockers.push(o); return o;
  };
  const box = (L, w, h, d, x, y, z, m, opt = {}) => {
    const o = add(L, new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, opt);
    if (opt.col) L.colliders.push({ b: [x - w / 2, z - d / 2, x + w / 2, z + d / 2] }); return o;
  };
  // wall along an axis with optional gaps (doors/windows): gaps = [{a,b,low,high,glass}]
  const wall = (L, ax, fixed, a0, a1, h, m, gaps = [], th = .3) => {
    const seg = (s0, s1, y0, y1, collide) => {
      if (s1 - s0 < .01 || y1 - y0 < .01) return; const len = s1 - s0, c = (s0 + s1) / 2;
      const [w, d, x, z] = ax === 'x' ? [len, th, c, fixed] : [th, len, fixed, c];
      const o = box(L, w, y1 - y0, d, x, y0, z, m, { block: true }); o.receiveShadow = true;
      if (collide) L.colliders.push({ b: [x - w / 2, z - d / 2, x + w / 2, z + d / 2] });
    };
    let cur = a0; for (const g of [...gaps].sort((p, q) => p.a - q.a)) {
      seg(cur, g.a, 0, h, true); const low = g.low || 0, high = g.high ?? 2.3;
      if (low > 0) seg(g.a, g.b, 0, low, true); seg(g.a, g.b, high, h, false);
      if (g.glass) { const [w, d, x, z] = ax === 'x' ? [g.b - g.a, .03, (g.a + g.b) / 2, fixed] : [.03, g.b - g.a, fixed, (g.a + g.b) / 2]; add(L, new THREE.BoxGeometry(w, high - low, d), M('#bcd8ee', { transparent: true, opacity: .18, roughness: .1, metalness: .2 }), x, (low + high) / 2, z, { shadow: false }); }
      cur = g.b;
    } seg(cur, a1, 0, h, true);
  };
  const light = (L, c, i, d, x, y, z, shadow = false) => { const p = new THREE.PointLight(c, i, d, 2); p.position.set(x, y, z); p.castShadow = shadow; L.group.add(p); return p; };
  const seat = (L, x, y, z, yaw, label = 'Sit') => L.seats.push({ x, y, z, yaw, label });
  const glow = (L, x, y, z, w, h, d, c) => add(L, new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c }), x, y, z, { shadow: false });
  const door = (L, id, x, z, axis, width, hinge, m, { portal } = {}) => { // swinging door; axis 'x' = wall runs along x
    const pivot = new THREE.Group(); const gx = axis === 'x' ? x + hinge * width / 2 : x, gz = axis === 'x' ? z : z + hinge * width / 2;
    pivot.position.set(gx, 0, gz); L.group.add(pivot);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? width : .06, 2.2, axis === 'x' ? .06 : width), m); leaf.castShadow = true;
    leaf.position.set(axis === 'x' ? -hinge * width / 2 : 0, 1.1, axis === 'x' ? 0 : -hinge * width / 2); pivot.add(leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.04), M('#d4af37', { metalness: 1, roughness: .3 })); knob.position.set(axis === 'x' ? -hinge * (width - .12) : .05, 1.05, axis === 'x' ? .05 : -hinge * (width - .12)); pivot.add(knob);
    const col = { b: [axis === 'x' ? x - width / 2 : x - .08, axis === 'x' ? z - .08 : z - width / 2, axis === 'x' ? x + width / 2 : x + .08, axis === 'x' ? z + .08 : z + width / 2] };
    L.colliders.push(col);
    const d = { id, x, z, open: false, t: 0, pivot, col, axis, hinge, r: 1.7, label: portal ? portal.label : 'Open door' };
    d.set = o => { d.open = o; col.off = o; }; L.doors.push(d); return d;
  };
  const tree = (L, x, z, s = 1, tc = '#4a3322', lc = '#2c5b30') => {
    box(L, .3 * s, 2.2 * s, .3 * s, x, 0, z, M(tc), {}); L.colliders.push({ b: [x - .3, z - .3, x + .3, z + .3] });
    for (let i = 0; i < 3; i++) add(L, new THREE.IcosahedronGeometry((1.5 - i * .3) * s, 1), M(lc, { flatShading: true }), x + (i - 1) * .2, (2.6 + i * .9) * s, z + (i % 2) * .2);
  };
  const bench = (L, x, z, yaw, mt = M('#5b3d26')) => { // two-seater; faces the way the avatar faces (yaw 0 = -Z)
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; L.group.add(g);
    const part = (w, h, d, px, py, pz, m = mt) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; g.add(o); };
    part(1.9, .08, .55, 0, .43, 0); part(1.9, .4, .07, 0, .72, .27); [-.8, .8].forEach(o => part(.08, .4, .5, o, .2, 0, M('#222')));
    const sw = Math.abs(Math.sin(yaw)) > .5, hx = sw ? .4 : 1.05, hz = sw ? 1.05 : .4; L.colliders.push({ b: [x - hx, z - hz, x + hx, z + hz] });
    [-.5, .5].forEach(o => seat(L, x + o * Math.cos(yaw), .46, z - o * Math.sin(yaw), yaw, 'Sit on the bench'));
  };
  return { THREE, scene, locs, loc, add, box, wall, light, seat, glow, door, tree, bench };
}
