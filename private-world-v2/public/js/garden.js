// The Garden: a big walled night park (plaza + fountain, pond, gazebo, paths, hedges, forest) with a race circuit in the east.
// The circuit itself is built from public/js/track.json by GA.buildRace(track) (called once from main.js after the fetch).
import * as THREE from 'three';
import { M, ctex, grass, sky, Batch } from './kit.js';
import { createVehicle, VEHICLES, VEHICLE_IDS } from './vehicles.js';

export const GARDEN = { Z0: 200, X0: -139, X1: 139, ZN: -139, ZS: 47 };
const PI = Math.PI, TAU = PI * 2;
const UB = new THREE.BoxGeometry(1, 1, 1), UC = new THREE.CylinderGeometry(1, 1, 1, 12), US = new THREE.SphereGeometry(1, 14, 10);
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const radial = stops => ctex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, [1, 1], true);
const vgrad = stops => ctex(4, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, [1, 1], true);
function signTex(w, h, small, big, accent = '#e8c76a') {
  return ctex(w, h, g => { g.fillStyle = '#1a140e'; g.fillRect(0, 0, w, h); g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.textAlign = 'center'; g.fillStyle = accent; g.font = '600 28px Georgia,serif'; g.fillText(small, w / 2, 56); g.fillStyle = '#f6ecd2'; g.font = `700 ${big.length > 12 ? 58 : 72}px Georgia,serif`; g.fillText(big, w / 2, h - 36); }, [1, 1], true);
}

export function buildGarden(K) {
  const { loc, add, box, light, seat, bench } = K, { Z0, X0, X1, ZN, ZS } = GARDEN;
  const GA = loc('garden', { name: 'Garden', spawn: { x: 0, z: Z0 + 36, ry: 0 }, bounds: [X0, Z0 + ZN, X1, Z0 + ZS],
    sky: { bg: sky([[0, '#05081a'], [.5, '#0e1b3d'], [1, '#27335c']]), fog: ['#0c1430', 30, 175] }, music: .55, ambience: 'night' });
  const G = GA.group, rand = rng(20261122);
  const mats = { vc: new THREE.MeshLambertMaterial({ vertexColors: true }), vs: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }), glow: new THREE.MeshBasicMaterial({ vertexColors: true }), pool: new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(255,214,150,.9)'], [1, 'rgba(255,214,150,0)']]), vertexColors: true, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }) };
  const B = new Batch(), bx = (key, w, h, d, x, y, z, color, o = {}) => B.add(key, UB, { x, y: y + h / 2, z, sx: w, sy: h, sz: d, color, ...o });
  const cyl = (key, r, h, x, y, z, color, o = {}) => B.add(key, UC, { x, y: y + h / 2, z, sx: r, sy: h, sz: r, color, ...o });
  const col = (x, z, hw, hd = hw) => GA.colliders.push({ b: [x - hw, z - hd, x + hw, z + hd] });
  const ZZ = z => Z0 + z; // garden-local z -> world z
  const noCover = []; // circles [x,z,r] where no trees/flowers may be placed

  /* ----- ground ----- */
  add(GA, new THREE.PlaneGeometry(360, 300), M('#fff', { map: grass([90, 75]), roughness: 1 }), 0, 0, ZZ(-46), { rx: -PI / 2, shadow: false });

  /* ----- hedge wall around the estate, with two arched gates in the south side ----- */
  const HH = 3, HT = 2.4, hedgeC = '#1d4a28';
  const gates = [{ x: 0, to: 'museum', label: 'Go through the gate → Museum', sign: ['TO THE', 'MUSEUM'] }, { x: -30, to: 'house', label: 'Walk home → House', sign: ['WALK', 'HOME'] }];
  bx('vc', X1 - X0 + HT * 2, HH, HT, 0, 0, ZZ(ZN) - HT / 2, hedgeC); bx('vc', HT, HH, ZS - ZN + HT, X0 - HT / 2, 0, ZZ((ZN + ZS) / 2), hedgeC); bx('vc', HT, HH, ZS - ZN + HT, X1 + HT / 2, 0, ZZ((ZN + ZS) / 2), hedgeC);
  { const cuts = gates.map(g => g.x).sort((a, b) => a - b); let cur = X0 - HT; for (const cx of cuts) { const a = cx - 1.9, b2 = cx + 1.9; bx('vc', a - cur, HH, HT, (cur + a) / 2, 0, ZZ(ZS) + HT / 2, hedgeC); cur = b2; } bx('vc', X1 + HT - cur, HH, HT, (cur + X1 + HT) / 2, 0, ZZ(ZS) + HT / 2, hedgeC); }
  for (const g of gates) {
    [-1.7, 1.7].forEach(s => { bx('vs', .6, 3.6, .6, g.x + s, 0, ZZ(ZS) + .4, '#8d8a84'); bx('vs', .8, .3, .8, g.x + s, 3.6, ZZ(ZS) + .4, '#9d9a94'); }); bx('vs', 4.2, .4, .7, g.x, 3.3, ZZ(ZS) + .4, '#8d8a84');
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), new THREE.MeshBasicMaterial({ map: signTex(512, 150, g.sign[0], g.sign[1]) })); sm.position.set(g.x, 4.4, ZZ(ZS) + .1); sm.rotation.y = PI; G.add(sm); bx('vc', 3.5, 1.1, .06, g.x, 3.85, ZZ(ZS) + .16, '#3a2a1c');
    GA.portals.push({ x: g.x, z: ZZ(ZS) - 2, r: 1.8, to: g.to, label: g.label }); noCover.push([g.x, ZZ(ZS) - 4, 6]);
  }
  noCover.push([0, ZZ(36), 12]);

  /* ----- paths: instanced stepping stones ----- */
  const polylines = [[[0, 45], [0, 30], [1.5, 18], [0, 9]], [[0, 38], [-12, 42], [-30, 44]], [[9, 0], [30, -2], [46, 2], [62, 12]], [[-9, 0], [-30, -8], [-55, -16], [-72, -23]], [[0, -9], [-2, -30], [-18, -48], [-35, -56]]];
  const stones = []; for (const pl of polylines) for (let i = 0; i < pl.length - 1; i++) { const [x0, z0] = pl[i], [x1, z1] = pl[i + 1], L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.3)); for (let k = 0; k < n; k++) { const t = k / n; stones.push([x0 + (x1 - x0) * t + (rand() - .5) * .25, z0 + (z1 - z0) * t + (rand() - .5) * .25]); } }
  const stoneM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.72, .78, .06, 9), M('#8d8a84', { roughness: .9 }), stones.length), dm = new THREE.Object3D();
  stones.forEach(([x, z], i) => { dm.position.set(x, .03, ZZ(z)); dm.rotation.y = rand() * 3; dm.scale.set(1 + rand() * .15, 1, 1 + rand() * .15); dm.updateMatrix(); stoneM.setMatrixAt(i, dm.matrix); }); stoneM.receiveShadow = true; G.add(stoneM);

  /* ----- plaza with fountain ----- */
  cyl('vs', 9, .08, 0, 0, ZZ(0), '#77746e'); cyl('vs', 8.2, .09, 0, 0, ZZ(0), '#8a877f'); cyl('vs', 3.5, .7, 0, 0, ZZ(0), '#9a978f'); cyl('vs', 3.1, .72, 0, 0, ZZ(0), '#2c4a6e'); cyl('vs', .5, 2.2, 0, .5, ZZ(0), '#a8a59d'); cyl('vs', 1.3, .25, 0, 2.5, ZZ(0), '#9a978f'); col(0, ZZ(0), 3.5);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(.45, 1.6, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#bfe3ff', transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false })); jet.position.set(0, 3.5, ZZ(0)); G.add(jet);
  noCover.push([0, ZZ(0), 13]);
  [[6.5, 0, PI / 2], [-6.5, 0, -PI / 2], [0, 6.5, 0], [0, -6.5, PI]].forEach(([x, z, y]) => bench(GA, x, ZZ(z), y));

  /* ----- pond with rocks and benches ----- */
  const PX = -45, PZ = -60;
  add(GA, new THREE.CircleGeometry(13, 48), M('#12263f', { metalness: .85, roughness: .08 }), PX, .04, ZZ(PZ), { rx: -PI / 2, shadow: false }); GA.colliders.push({ b: [PX - 11, ZZ(PZ) - 11, PX + 11, ZZ(PZ) + 11] }); noCover.push([PX, ZZ(PZ), 19]);
  for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; B.add('vs', new THREE.DodecahedronGeometry(1, 0), { x: PX + Math.cos(a) * 13.4, y: .22, z: ZZ(PZ) + Math.sin(a) * 13.4, sx: .5 + (i % 3) * .1, sy: .35, sz: .5, color: i % 2 ? '#6e6a63' : '#7c786f' }); }
  [[PX + 16, PZ, PI / 2], [PX - 16, PZ, -PI / 2], [PX, PZ + 16, 0], [PX, PZ - 16, PI]].forEach(([x, z, y]) => bench(GA, x, ZZ(z), y));

  /* ----- gazebo ----- */
  const GX = -75, GZ = -25; noCover.push([GX, ZZ(GZ), 11]);
  cyl('vs', 4.8, .3, GX, 0, ZZ(GZ), '#8d8a84'); cyl('vs', 4.2, .35, GX, 0, ZZ(GZ), '#a09d95');
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; cyl('vc', .15, 3.4, GX + Math.cos(a) * 3.9, .35, ZZ(GZ) + Math.sin(a) * 3.9, '#d9d0bd'); sph3(GX + Math.cos(a) * 3.9, 3.8, ZZ(GZ) + Math.sin(a) * 3.9); }
  function sph3(x, y, z) { B.add('glow', US, { x, y, z, s: .12, color: '#ffe2a8' }); }
  B.add('vc', new THREE.ConeGeometry(1, 1, 6), { x: GX, y: 3.75 + 1.15, z: ZZ(GZ), sx: 5.6, sy: 2.3, sz: 5.6, color: '#6b3b2c' });
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; B.add('glow', US, { x: GX + Math.cos(a) * 3.6, y: 3.45 + Math.sin(i * 1.7) * .1, z: ZZ(GZ) + Math.sin(a) * 3.6, s: .07, color: '#ffe7b0' }); }
  bench(GA, GX, ZZ(GZ) - 2.4, 0); bench(GA, GX, ZZ(GZ) + 2.4, PI);

  /* ----- pergola over the main path ----- */
  [-6, 6].forEach(x => { cyl('vc', .12, 3.4, x, 0, ZZ(18), '#3a2a1c'); cyl('vc', .12, 3.4, x, 0, ZZ(18) + 3, '#3a2a1c'); col(x, ZZ(18), .2); col(x, ZZ(18) + 3, .2); }); for (let z = 0; z <= 3; z += 1) bx('vc', 12.8, .12, .2, 0, 3.4, ZZ(18) + z, '#3a2a1c');
  for (let i = 0; i < 26; i++) B.add('glow', US, { x: -6 + i * .5, y: 3.25 + Math.sin(i) * .12, z: ZZ(18) + 1.5, s: .06, color: '#ffe7b0' });

  /* ----- lamp posts ----- */
  const lamp = (x, z, lit = false) => { cyl('vc', .07, 3, x, 0, z, '#1d1d20'); B.add('glow', US, { x, y: 3.15, z, s: .2, color: '#ffe2a8' }); if (lit) light(GA, '#ffc77a', 14, 16, x, 3, z); else B.add('pool', new THREE.PlaneGeometry(1, 1), { x, y: .05, z, rx: -PI / 2, sx: 8, sy: 8, color: '#ffd9a0' }); };
  [[3.4, 36, 1], [-3.4, 16, 1], [8, -7, 1], [-3.4, 28], [3.4, 8], [3.4, -22], [-8, -34], [-30, 40], [30, -3], [-28, -12], [-60, -19], [-38, -50]].forEach(([x, z, lit]) => lamp(x, ZZ(z), !!lit));
  // signpost at the plaza pointing to the circuit
  { const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .9), new THREE.MeshBasicMaterial({ map: signTex(512, 180, 'RACING AREA', '→ Race Track') })); sp.position.set(11.5, 1.9, ZZ(5)); sp.rotation.y = 0; G.add(sp); bx('vc', .12, 1.6, .12, 11.5, 0, ZZ(5) - .08, '#3a2a1c'); }

  /* ----- flowers (instanced) ----- */
  { const N = 900, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(.13, 6, 5), M('#fff', { emissive: '#222' }), N), cs = ['#ff7aa8', '#ffd166', '#c8b6ff', '#fff', '#ff9e5e', '#7cc6fe'], cl = [[0, 14, 6], [-20, -8, 7], [-40, 20, 6], [18, -25, 7], [-60, -45, 6], [28, 20, 5], [-25, -30, 8]];
    for (let i = 0; i < N; i++) { const c = cl[i % cl.length], a = rand() * TAU, r = Math.sqrt(rand()) * c[2]; dm.position.set(c[0] + Math.cos(a) * r, .16, ZZ(c[1]) + Math.sin(a) * r); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix); fl.setColorAt(i, new THREE.Color(cs[i % 6])); } G.add(fl); }

  /* ----- sky: stars + moon follow the player so the far edges of the big map never reach them ----- */
  const skyG = new THREE.Group(); G.add(skyG);
  { const sp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const a = rand() * TAU, e = rand() * 1.4 + .1, r = 150; sp.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const st = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff', size: 1.1, fog: false, sizeAttenuation: false })); st.frustumCulled = false; skyG.add(st);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 18), new THREE.MeshBasicMaterial({ color: '#f4f1e0', fog: false })); moon.position.set(-60, 80, -120); skyG.add(moon); }
  // fireflies orbiting fixed anchors in the park
  const NF = 110, ff = new Float32Array(NF * 3), fa = []; for (let i = 0; i < NF; i++) fa.push([-120 + rand() * 160, -100 + rand() * 130, rand() * TAU, 1 + rand() * 2.5, .5 + rand()]);
  const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(ff, 3));
  const flies = new THREE.Points(fgeo, new THREE.PointsMaterial({ color: '#d8ff7a', size: .22, transparent: true, opacity: .9 })); flies.frustumCulled = false; G.add(flies);

  /* ----- lights: moon (shadow follows the player), hemisphere ----- */
  const moonL = new THREE.DirectionalLight('#9db7ff', 1.15); moonL.castShadow = true; G.add(moonL, moonL.target, new THREE.HemisphereLight('#4a5f9a', '#18241a', .6)); GA.sun = moonL;
  Object.assign(moonL.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 140 }); moonL.shadow.camera.updateProjectionMatrix?.(); moonL.shadow.mapSize.set(2048, 2048); moonL.shadow.bias = -.0005;
  const TEX = 90 / 2048; // shadow texel — snap the light to it so shadows don't shimmer while moving
  GA.tick.push((t, dt, P) => {
    const px = P ? P.x : 0, pz = P ? P.z : Z0; skyG.position.set(px, 0, pz);
    const sx = Math.round(px / TEX) * TEX, sz = Math.round(pz / TEX) * TEX; moonL.target.position.set(sx, 0, sz); moonL.position.set(sx - 30, 50, sz - 40); moonL.target.updateMatrixWorld();
    for (let i = 0; i < NF; i++) { const b = fa[i], a = b[2] + t * .15 * b[4]; ff[i * 3] = b[0] + Math.cos(a) * b[3] + Math.sin(t * b[4]) * .5; ff[i * 3 + 1] = 1 + Math.abs(Math.sin(t * .6 + b[2])) * 2.2; ff[i * 3 + 2] = ZZ(b[1]) + Math.sin(a) * b[3]; } fgeo.attributes.position.needsUpdate = true; flies.material.opacity = .6 + Math.sin(t * 3) * .3;
    jet.scale.y = 1 + Math.sin(t * 5) * .12; jet.position.y = 3.5 + Math.sin(t * 5) * .1;
  });
  GA.setQuality = q => { moonL.castShadow = q !== 'low'; };
  GA.zoneAt = (x, z) => (x > 44 ? 'Racing Area' : Math.hypot(x - PX, z - ZZ(PZ)) < 28 ? 'Pond Garden' : Math.hypot(x - GX, z - ZZ(GZ)) < 14 ? 'Gazebo' : 'Garden');
  GA.pads = []; GA.racePad = null; GA.track = null;

  /* ============ phase 2 — trees + the race circuit (needs track.json) ============ */
  GA.buildRace = track => {
    const hw = track ? track.width / 2 : 0, n = track ? track.center.length / 2 : 0, pts = track ? Float32Array.from(track.center) : null;
    // ---- nearest-point helper on the centre line (also used for off-road detection and trees) ----
    if (track) {
      const segD = (x, z, i) => { const j = (i + 1) % n, ax = pts[i * 2], az = pts[i * 2 + 1], bx2 = pts[j * 2], bz = pts[j * 2 + 1], dx = bx2 - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
      GA.track = { data: track, n, hw, pts, nearest(x, z, hint = -1) { let bi = 0, bd = 1e9; const test = i => { i = (i + n) % n; const d = segD(x, z, i); if (d < bd) { bd = d; bi = i; } };
        if (hint >= 0) { for (let k = -14; k <= 14; k++) test(hint + k); if (bd > hw * 2.5) { bd = 1e9; for (let i = 0; i < n; i++) test(i); } } else for (let i = 0; i < n; i++) test(i); return { i: bi, d: bd }; } };
    }
    const sx = track ? track.cps[0].x : 0, sz = track ? track.cps[0].z : 0;
    let inSign = -1; if (track) { let cz = 0; for (let i = 0; i < n; i++) cz += pts[i * 2 + 1]; inSign = cz / n < sz ? -1 : 1; }

    /* ---- trees: instanced trunks + foliage, with collision boxes (deterministic) ---- */
    { const placed = [], want = 290; let tries = 0;
      const blocked = (x, z) => { for (const [cx, cz, r] of noCover) if (Math.hypot(x - cx, z - cz) < r) return true; for (const [px2, pz2] of stones) if (Math.hypot(x - px2, z - ZZ(pz2)) < 3.4) return true;
        if (track) { if (GA.track.nearest(x, z).d < hw + 9) return true; if (x > sx - 32 && x < sx + 40 && Math.abs(z - sz) < 36) return true; } return false; };
      while (placed.length < want && tries++ < 9000) { const x = X0 + 6 + rand() * (X1 - X0 - 12), z = ZZ(ZN + 6 + rand() * (ZS - ZN - 16)); if (blocked(x, z) || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 5.2)) continue; placed.push([x, z, .9 + rand() * .7, rand()]); }
      const outer = []; for (let i = 0; i < 150; i++) { const a = i / 150 * TAU + rand() * .1, rx = 180 + rand() * 20, rz = 154 + rand() * 20; outer.push([Math.cos(a) * rx, ZZ(-46) + Math.sin(a) * rz, 1.4 + rand() * 1.0, rand()]); }
      const all = placed.concat(outer), trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .3, 1, 7), M('#33261b'), all.length), leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M('#fff', { flatShading: true }), all.length * 3);
      all.forEach(([x, z, s, r], i) => { dm.rotation.set(0, r * 6, 0); dm.position.set(x, 1.1 * s, z); dm.scale.set(s, 2.2 * s, s); dm.updateMatrix(); trunk.setMatrixAt(i, dm.matrix);
        for (let k = 0; k < 3; k++) { dm.position.set(x + (k - 1) * .25 * s, (2.6 + k * .9) * s, z + (k % 2) * .25 * s); dm.scale.setScalar((1.5 - k * .3) * s); dm.updateMatrix(); leaf.setMatrixAt(i * 3 + k, dm.matrix); leaf.setColorAt(i * 3 + k, new THREE.Color(r > .5 ? '#1e4a2d' : '#25553a').offsetHSL(0, 0, (k - 1) * .02)); } });
      placed.forEach(([x, z, s]) => GA.colliders.push({ b: [x - .35 * s, z - .35 * s, x + .35 * s, z + .35 * s] }));
      trunk.castShadow = leaf.castShadow = true; trunk.receiveShadow = leaf.receiveShadow = true; trunk.frustumCulled = leaf.frustumCulled = false; G.add(trunk, leaf); }

    if (!track) { B.build(G, mats); return; }

    /* ---- asphalt ribbon, curbs, start line ---- */
    const step = track.step, tan = i => { const a = (i + n - 1) % n, b = (i + 1) % n, dx = pts[b * 2] - pts[a * 2], dz = pts[b * 2 + 1] - pts[a * 2 + 1], l = Math.hypot(dx, dz); return [dx / l, dz / l]; };
    const ribbon = (o0, o1, vScale, y) => { const pos = [], uv = [], idx = []; for (let i = 0; i <= n; i++) { const k = i % n, [fx, fz] = tan(k), lx = fz, lz = -fx, cx = pts[k * 2], cz = pts[k * 2 + 1]; pos.push(cx + lx * o0, y, cz + lz * o0, cx + lx * o1, y, cz + lz * o1); const v = i * step / vScale; uv.push(0, v, 1, v); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => i % 3 === 1 ? 1 : 0), 3)); g.setIndex(idx); return g; };
    const asphalt = ctex(128, 128, (g, w, h) => { g.fillStyle = '#34343c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } g.fillStyle = '#e8e8e8'; g.fillRect(w * .03, 0, w * .02, h); g.fillRect(w * .95, 0, w * .02, h); g.fillStyle = '#d8c25a'; g.fillRect(w * .495, 0, w * .012, h * .5); }, [1, 1]);
    const curbT = ctex(16, 32, (g, w, h) => { g.fillStyle = '#e83a3a'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#f4f4f4'; g.fillRect(0, h / 2, w, h / 2); }, [1, 1]);
    const roadM = new THREE.MeshStandardMaterial({ map: asphalt, roughness: .85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), curbM = new THREE.MeshStandardMaterial({ map: curbT, roughness: .8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const road = new THREE.Mesh(ribbon(hw, -hw, 12, .04), roadM); road.receiveShadow = true; G.add(road);
    [[hw + 1.3, hw], [-hw, -hw - 1.3]].forEach(([a, b]) => { const c = new THREE.Mesh(ribbon(a, b, 3, .05), curbM); c.receiveShadow = true; G.add(c); });
    const checker = ctex(16, 128, (g, w, h) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); } }, [1, 1], true);
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, track.width), new THREE.MeshBasicMaterial({ map: checker, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 })); sl.rotation.order = 'YXZ'; sl.rotation.set(-PI / 2, -Math.atan2(track.cps[0].fz, track.cps[0].fx), 0); sl.position.set(sx, .06, sz); G.add(sl);

    /* ---- gates: glowing posts + thin bar; gate 0 = big start/finish arch ---- */
    track.cps.forEach((c, i) => { const lx = c.fz, lz = -c.fx, off = hw + 1.2, top = i === 0 ? 7 : 4.6;
      [-1, 1].forEach(s => { cyl('vc', i === 0 ? .35 : .16, top, c.x + lx * off * s, 0, c.z + lz * off * s, i === 0 ? '#e8e8f0' : '#cfd6e6'); B.add('glow', US, { x: c.x + lx * off * s, y: top + .1, z: c.z + lz * off * s, s: i === 0 ? .45 : .26, color: i === 0 ? '#ffd76f' : '#6fe0ff' }); });
    });
    { const c0 = track.cps[0], bm = new THREE.Mesh(new THREE.PlaneGeometry(track.width + 2.4, 2.2), new THREE.MeshBasicMaterial({ map: signTex(1024, 140, '', 'START  ·  FINISH', '#ffd76f'), side: THREE.DoubleSide })); bm.position.set(c0.x, 6.4, c0.z); bm.rotation.y = Math.atan2(c0.fx, c0.fz); G.add(bm); }
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(track.width, 4), new THREE.MeshBasicMaterial({ map: vgrad([[0, 'rgba(120,230,255,.05)'], [1, 'rgba(120,230,255,.55)']]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); curtain.visible = false; G.add(curtain);
    GA.setNextGate = i => { if (i == null || i < 0) { curtain.visible = false; return; } const c = track.cps[i]; curtain.visible = true; curtain.position.set(c.x, 2.0, c.z); curtain.rotation.y = Math.atan2(c.fx, c.fz); };

    /* ---- bollards (instanced, red/white) + lamps along the circuit ---- */
    { const items = []; const total = track.length; for (let s = 20; s < total - 20; s += 12) { if (s < 55 || s > total - 55) continue; const i = Math.round(s / step) % n, [fx, fz] = tan(i), lx = fz, lz = -fx; [1, -1].forEach(sd => items.push([pts[i * 2] + lx * (hw + 2.3) * sd, pts[i * 2 + 1] + lz * (hw + 2.3) * sd, items.length])); }
      const bo = new THREE.InstancedMesh(new THREE.CylinderGeometry(.17, .21, .9, 8), M('#fff'), items.length); items.forEach(([x, z, k], j) => { dm.position.set(x, .45, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); bo.setMatrixAt(j, dm.matrix); bo.setColorAt(j, new THREE.Color(k % 4 < 2 ? '#e83a3a' : '#f2f2f2')); }); bo.castShadow = true; G.add(bo); }
    for (let s = 40, k = 0; s < track.length - 40; s += 46, k++) { if (s < 60 || s > track.length - 60) continue; const i = Math.round(s / step) % n, [fx, fz] = tan(i), lx = fz, lz = -fx, sd = k % 2 ? 1 : -1, x = pts[i * 2] + lx * (hw + 5) * sd, z = pts[i * 2 + 1] + lz * (hw + 5) * sd;
      cyl('vc', .08, 4.2, x, 0, z, '#1d1d20'); B.add('glow', US, { x, y: 4.35, z, s: .26, color: '#d8f0ff' }); B.add('pool', new THREE.PlaneGeometry(1, 1), { x: x - lx * sd * 3.5, y: .07, z: z - lz * sd * 3.5, rx: -PI / 2, sx: 12, sy: 12, color: '#bcd8ff' }); }

    /* ---- pit lane, showroom pads, race control, grandstand (axis-aligned: the start straight runs along +x) ---- */
    if (Math.abs(track.cps[0].fz) < .02) {
      const dirx = Math.sign(track.cps[0].fx) || 1, ZI = d => sz + inSign * d, ZO = d => sz - inSign * d;
      // garage
      const GXc = sx, GZ = ZI(hw + 12.5); bx('vc', 28, 4.6, 6, GXc, 0, GZ, '#4a4658'); bx('vc', 29, .4, 8, GXc, 4.6, ZI(hw + 11.5), '#2f2c3a'); col(GXc, GZ, 14, 3);
      for (let k = -1.5; k <= 1.5; k++) { bx('glow', 4.6, 3, .1, GXc + k * 6.2, .3, ZI(hw + 9.45), '#ffe9b0'); bx('vc', 4.9, .25, .2, GXc + k * 6.2, 3.35, ZI(hw + 9.4), '#2a2630'); }
      const pit = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshBasicMaterial({ map: signTex(1024, 180, 'PIT LANE', 'Pick your ride', '#8fd8ff') })); pit.position.set(GXc, 5.9, ZI(hw + 9.2)); pit.rotation.y = inSign < 0 ? 0 : PI; G.add(pit);
      // showroom pads
      VEHICLE_IDS.forEach((id, k) => { const px = sx + (k - 1.5) * 6.2, pz = ZI(hw + 5), spec = VEHICLES[id], v = createVehicle(id, 0);
        v.group.position.set(px, .12, pz); v.group.rotation.y = Math.atan2(-track.cps[0].fx, -track.cps[0].fz); G.add(v.group); cyl('vs', 2.6, .12, px, 0, pz, '#3a3846');
        B.add('glow', new THREE.RingGeometry(2.3, 2.55, 40), { x: px, y: .15, z: pz, rx: -PI / 2, color: spec.paints[0].body }); B.add('pool', new THREE.PlaneGeometry(1, 1), { x: px, y: .16, z: pz, rx: -PI / 2, sx: 9, sy: 9, color: spec.paints[0].body });
        GA.pads.push({ kind: id, x: px, z: pz, r: 3.4, group: v.group, yaw: Math.atan2(-track.cps[0].fx, -track.cps[0].fz) }); });
      // race control booth
      const RX = sx + dirx * 17, RZ = ZI(hw + 6.5); bx('vc', 3.4, 3, 3.4, RX, 0, RZ, '#e9e4d6'); bx('vc', 4.2, .3, 4.2, RX, 3, RZ, '#c8403a'); col(RX, RZ, 1.9);
      bx('glow', 2.2, 1.0, .08, RX, 1.2, ZI(hw + 4.75), '#9fe0ff'); cyl('vc', .06, 6, RX + 1.6, 0, RZ, '#ccc'); bx('glow', 1.3, .8, .05, RX + 2.25, 5.2, RZ, '#ffffff');
      const rc = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), new THREE.MeshBasicMaterial({ map: signTex(512, 150, 'START A RACE', 'RACE CONTROL', '#ff8f6f') })); rc.position.set(RX, 3.9, ZI(hw + 4.68)); rc.rotation.y = inSign < 0 ? 0 : PI; G.add(rc);
      GA.racePad = { x: RX, z: ZI(hw + 3.6), r: 3.4 };
      B.add('glow', new THREE.RingGeometry(1.5, 1.75, 32), { x: RX, y: .15, z: ZI(hw + 3.6), rx: -PI / 2, color: '#ff8f6f' });
      // grandstand across the track
      for (let t = 0; t < 4; t++) { const d = hw + 4 + t * 1.8; bx('vs', 32, .9 + t * .9, 1.8, sx, 0, ZO(d), '#58566a'); bx('vc', 32, .12, .9, sx, .9 + t * .9, ZO(d - .45), ['#e83a3a', '#f2c14e', '#3cb878', '#4aa3df'][t]); }
      col(sx, ZO(hw + 7.6), 16, 3.8); [-15, 15].forEach(x => { bx('vc', .3, 6.8, .3, sx + x, 0, ZO(hw + 12), '#2a2630'); bx('vc', .3, 6.8, .3, sx + x, 0, ZO(hw + 3.4), '#2a2630'); }); bx('vc', 32, .3, 9.4, sx, 6.8, ZO(hw + 7.8), '#2f2c3a', { rx: inSign * -.06 });
      // flood-light towers
      [[-22, ZI(hw + 15)], [22, ZI(hw + 15)], [-22, ZO(hw + 14)], [22, ZO(hw + 14)]].forEach(([dx, z]) => { cyl('vc', .2, 11, sx + dx, 0, z, '#2a2630'); bx('glow', 2.6, .9, .3, sx + dx, 11, z + inSign * -.3, '#fff6dc'); B.add('pool', new THREE.PlaneGeometry(1, 1), { x: sx + dx, y: .08, z: z + (dx > 0 ? 0 : 0), rx: -PI / 2, sx: 26, sy: 26, color: '#cfe0ff' }); });
    } else console.warn('[garden] start straight is not axis-aligned: pit area skipped');
    B.build(G, mats);
  };
  return GA;
}
