// Four cartoon vehicles (3 cars, 1 scooter bike) built from primitives: cel-shaded (toon) + inverted-hull outlines,
// merged into ~5 draw calls each. The driver is the normal Avatar in its sitting pose; the seat is at the vehicle origin.
// Physics is a simple arcade model. `top` speeds are mirrored on the server (server/race.js) for time validation.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Batch } from './kit.js';

export const VEHICLES = {
  bubble: { id: 'bubble', name: 'Bubbly', type: 'car', blurb: 'Cute, nimble and easy to drive',
    top: 24, acc: 14, brake: 26, turn: 2.2, off: .5, sitY: .36, r: 1.05, wheel: .38,
    paints: [{ body: '#ff8fb1', accent: '#fff4f8', trim: '#ff5c8a' }, { body: '#7fd6ff', accent: '#ffffff', trim: '#3aa6e8' }] },
  racer: { id: 'racer', name: 'Zippy', type: 'car', blurb: 'Fastest on the straights',
    top: 30, acc: 12, brake: 28, turn: 1.8, off: .4, sitY: .2, r: 1.0, wheel: .4,
    paints: [{ body: '#ef4538', accent: '#ffffff', trim: '#23212b' }, { body: '#3c7dff', accent: '#ffe14a', trim: '#1c2540' }] },
  buggy: { id: 'buggy', name: 'Bouncer', type: 'car', blurb: 'Big wheels, loves the grass',
    top: 25, acc: 13, brake: 24, turn: 1.95, off: .85, sitY: .64, r: 1.15, wheel: .55,
    paints: [{ body: '#ffc93c', accent: '#2fb36d', trim: '#2b2b33' }, { body: '#b36bff', accent: '#ffe14a', trim: '#2b2b33' }] },
  moto: { id: 'moto', name: 'Scooter', type: 'bike', blurb: 'Quick, light, leans into corners',
    top: 28, acc: 17, brake: 26, turn: 2.5, off: .55, sitY: .6, r: .8, wheel: .38,
    paints: [{ body: '#46c7b5', accent: '#fff6df', trim: '#1f7f73' }, { body: '#ff7a59', accent: '#fff6df', trim: '#b0401f' }] }
};
export const VEHICLE_IDS = Object.keys(VEHICLES);

/* ---------- shared materials ---------- */
let toonGrad = null;
const gradient = () => toonGrad || (toonGrad = (() => { const t = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })());
let M0 = null;
const mats = () => M0 || (M0 = {
  toon: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient() }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  glass: new THREE.MeshPhongMaterial({ color: '#bfe6ff', transparent: true, opacity: .38, shininess: 90, side: THREE.DoubleSide, depthWrite: false }),
  line: new THREE.MeshBasicMaterial({ color: '#241a2e', side: THREE.BackSide })
});
const RB = (w, h, d, r = .08) => new RoundedBoxGeometry(w, h, d, 3, r);
const SPH = new THREE.SphereGeometry(1, 18, 12), CYL = new THREE.CylinderGeometry(1, 1, 1, 18);
const capC = new Map(), CAP = (r, l) => { const k = r + '_' + l; if (!capC.has(k)) capC.set(k, new THREE.CapsuleGeometry(r, l, 4, 10)); return capC.get(k); };
const HEART = (() => { const h = new THREE.Shape(); h.moveTo(0, -.5); h.bezierCurveTo(-.15, -.35, -.5, -.1, -.5, .15); h.bezierCurveTo(-.5, .4, -.2, .5, 0, .28); h.bezierCurveTo(.2, .5, .5, .4, .5, .15); h.bezierCurveTo(.5, -.1, .15, -.35, 0, -.5); const g = new THREE.ExtrudeGeometry(h, { depth: .15, bevelEnabled: false, curveSegments: 10 }); g.center(); return g; })();
const HALF_TORUS = (R, r) => new THREE.TorusGeometry(R, r, 8, 20, Math.PI);
const WHEEL_CACHE = new Map();

function wheelGeo(r, w, hub) { // tyre + hub + spokes in one vertex-coloured geometry (axis = X)
  const key = `${r}_${w}_${hub}`; if (WHEEL_CACHE.has(key)) return WHEEL_CACHE.get(key);
  const b = new Batch(); b.add('t', CYL, { sx: r, sy: w, sz: r, rz: Math.PI / 2, color: '#2a2630' });
  b.add('t', CYL, { x: w * .52, sx: r * .62, sy: .04, sz: r * .62, rz: Math.PI / 2, color: hub }); b.add('t', CYL, { x: -w * .52, sx: r * .62, sy: .04, sz: r * .62, rz: Math.PI / 2, color: hub });
  b.add('t', CYL, { x: w * .56, sx: r * .16, sy: .05, sz: r * .16, rz: Math.PI / 2, color: '#ffffff' }); b.add('t', CYL, { x: -w * .56, sx: r * .16, sy: .05, sz: r * .16, rz: Math.PI / 2, color: '#ffffff' });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; b.add('t', CYL, { x: 0, sx: r * .05, sy: w * 1.02, sz: r * .05, rz: Math.PI / 2, rx: a, color: '#9aa0ab' }); }
  const g = b.take('t'); WHEEL_CACHE.set(key, g); return g;
}

/** Build a vehicle. Returns { group, update(dt, speed, steer), dispose() } — speed is signed m/s, steer -1..1 (right = +). */
export function createVehicle(kind, variant = 0) {
  const spec = VEHICLES[kind] || VEHICLES.bubble, pal = spec.paints[variant % spec.paints.length], m = mats();
  const b = new Batch(), A = (key, geo, o = {}) => b.add(key, geo, o);
  const body = pal.body, acc = pal.accent, trim = pal.trim, dark = '#2a2630', chrome = '#d6dbe3';
  const wheelsAt = []; let steerWheel = null, fork = null, frontPivots = [];
  const group = new THREE.Group(), lean = new THREE.Group(); group.add(lean);

  if (kind === 'bubble') {
    A('toon', RB(1.5, .5, 2.9, .22), { y: .58, z: .05, color: body });
    [[-1, -1.05], [1, -1.05], [-1, 1.0], [1, 1.0]].forEach(([s, z]) => A('toon', SPH, { x: s * .88, y: .58, z, sx: .42, sy: .7, sz: .78, color: trim }));
    A('toon', SPH, { y: .8, z: -1.0, sx: .8, sy: .34, sz: .85, color: body }); A('toon', SPH, { y: .8, z: 1.05, sx: .75, sy: .33, sz: .72, color: body });
    A('toon', RB(.9, .7, .22, .1), { y: 1.0, z: .42, color: trim }); A('toon', RB(.85, .16, .7, .06), { y: .47, z: .06, color: acc });
    A('toon', RB(1.3, .2, .4, .08), { y: .98, z: -.72, color: trim });
    [-1, 1].forEach(s => { A('toon', CAP(.045, 1.0), { x: s * .62, y: 1.28, z: -.7, rz: .15, rx: -.55, color: trim }); });
    A('toon', CAP(.09, 1.2), { y: .4, z: -1.78, rz: Math.PI / 2, color: acc }); A('toon', CAP(.09, 1.2), { y: .4, z: 1.72, rz: Math.PI / 2, color: acc });
    A('toon', CYL, { x: .55, y: 1.1, z: 1.15, sx: .02, sy: .8, sz: .02, color: dark }); A('toon', SPH, { x: .55, y: 1.52, z: 1.15, s: .06, color: '#ff5c8a' });
    A('toon', HEART, { y: 1.13, z: -1.12, sx: .5, sy: .5, sz: 1, rx: -Math.PI / 2, color: acc });
    A('glow', SPH, { x: -.52, y: .74, z: -1.72, sx: .17, sy: .17, sz: .1, color: '#fff3c4' }); A('glow', SPH, { x: .52, y: .74, z: -1.72, sx: .17, sy: .17, sz: .1, color: '#fff3c4' });
    A('glow', RB(.3, .1, .06, .02), { x: -.55, y: .72, z: 1.5, color: '#ff4a4a' }); A('glow', RB(.3, .1, .06, .02), { x: .55, y: .72, z: 1.5, color: '#ff4a4a' });
    A('glass', RB(1.2, .42, .04, .02), { y: 1.28, z: -.66, rx: -.55 });
    steerWheel = { pos: [0, 1.02, -.42], tilt: -.9, R: .19 };
    [[-.93, -1.05, 1], [.93, -1.05, 1], [-.93, 1.0, 0], [.93, 1.0, 0]].forEach(([x, z, f]) => wheelsAt.push({ x, z, f: !!f, r: spec.wheel, w: .34 }));
  } else if (kind === 'racer') {
    A('toon', RB(1.2, .38, 3.3, .16), { y: .5, color: body });
    A('toon', CAP(.32, 1.3), { y: .52, z: -1.55, rx: Math.PI / 2, sx: 1, sz: .75, color: body });
    [-1, 1].forEach(s => { A('toon', RB(.55, .38, 1.5, .14), { x: s * .9, y: .5, z: .2, color: body }); A('toon', RB(.4, .16, .5, .05), { x: s * .9, y: .55, z: -.5, color: trim }); A('toon', RB(.1, .3, .6, .04), { x: s * 1.0, y: .3, z: -2.0, color: body }); });
    A('toon', RB(2.0, .07, .5, .03), { y: .28, z: -2.05, color: acc });
    [-.5, .5].forEach(s => A('toon', CYL, { x: s, y: .92, z: 1.4, sx: .04, sy: .6, sz: .04, color: dark })); A('toon', RB(1.9, .07, .55, .03), { y: 1.25, z: 1.5, color: acc });
    [-1, 1].forEach(s => A('toon', RB(.05, .4, .7, .02), { x: s * .97, y: 1.2, z: 1.5, color: body }));
    A('toon', HALF_TORUS(.34, .045), { y: .7, z: .62, color: dark }); A('toon', RB(.7, .55, .2, .08), { y: .82, z: .4, color: trim }); A('toon', RB(.65, .14, .6, .05), { y: .4, z: .1, color: trim });
    A('toon', RB(.18, .03, 2.5, .01), { y: .705, z: -.6, color: acc }); A('toon', RB(.18, .03, 2.5, .01), { x: .32, y: .705, z: -.6, color: acc }); A('toon', RB(.18, .03, 2.5, .01), { x: -.32, y: .705, z: -.6, color: acc });
    [-.35, .35].forEach(s => A('toon', CYL, { x: s, y: .62, z: 1.72, sx: .07, sy: .3, sz: .07, rx: Math.PI / 2, color: chrome }));
    A('glow', SPH, { x: -.2, y: .6, z: -2.05, sx: .1, sy: .08, sz: .08, color: '#fff3c4' }); A('glow', SPH, { x: .2, y: .6, z: -2.05, sx: .1, sy: .08, sz: .08, color: '#fff3c4' }); A('glow', RB(.5, .08, .05, .02), { y: .75, z: 1.68, color: '#ff4a4a' });
    A('glass', RB(.8, .26, .03, .01), { y: .98, z: -.56, rx: -.7 });
    steerWheel = { pos: [0, .86, -.4], tilt: -.8, R: .15 };
    [[-.95, -1.25, 1], [.95, -1.25, 1], [-1.0, 1.2, 0], [1.0, 1.2, 0]].forEach(([x, z, f]) => wheelsAt.push({ x, z, f: !!f, r: spec.wheel, w: .4 }));
  } else if (kind === 'buggy') {
    A('toon', RB(1.4, .28, 2.6, .1), { y: .62, color: dark }); A('toon', RB(1.1, .3, 1.0, .12), { y: .8, z: -1.0, color: body }); A('toon', RB(1.2, .3, .9, .1), { y: .78, z: .95, color: body });
    [[-1.15, -1.3], [1.15, -1.3], [-1.15, 1.2], [1.15, 1.2]].forEach(([x, z]) => A('toon', RB(.55, .14, 1.3, .06), { x, y: 1.05, z, color: acc }));
    const bar = (x1, y1, z1, x2, y2, z2) => { const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dx, dy, dz), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize()); A('toon', CAP(.04, Math.max(.01, L - .08)), { x: (x1 + x2) / 2, y: (y1 + y2) / 2, z: (z1 + z2) / 2, q, color: trim }); };
    [-1, 1].forEach(s => { bar(s * .62, .75, .5, s * .62, 1.95, .35); bar(s * .62, .75, -.5, s * .62, 1.5, -.45); bar(s * .62, 1.95, .35, s * .62, 1.5, -.45); bar(s * .62, .75, .9, s * .62, 1.95, .35); });
    bar(-.62, 1.95, .35, .62, 1.95, .35); bar(-.62, 1.5, -.45, .62, 1.5, -.45);
    A('toon', RB(.8, .6, .2, .08), { y: 1.05, z: .45, color: trim }); A('toon', RB(.8, .14, .7, .05), { y: .78, z: .1, color: trim });
    A('toon', CYL, { y: 1.0, z: 1.6, sx: .45, sy: .3, sz: .45, rx: Math.PI / 2, color: dark }); A('toon', CYL, { y: 1.0, z: 1.76, sx: .22, sy: .05, sz: .22, rx: Math.PI / 2, color: acc });
    A('toon', CAP(.06, 1.5), { y: .55, z: -1.78, rz: Math.PI / 2, color: dark }); [-.35, .35].forEach(s => A('toon', CYL, { x: s, y: .72, z: 1.45, sx: .06, sy: .3, sz: .06, rx: Math.PI / 2, color: chrome }));
    A('glow', RB(1.0, .1, .12, .03), { y: 1.95, z: -.5, color: '#fff3c4' }); A('glow', SPH, { x: -.4, y: .85, z: -1.52, sx: .13, sy: .13, sz: .08, color: '#fff3c4' }); A('glow', SPH, { x: .4, y: .85, z: -1.52, sx: .13, sy: .13, sz: .08, color: '#fff3c4' });
    steerWheel = { pos: [0, 1.15, -.42], tilt: -.9, R: .18 };
    [[-1.15, -1.3, 1], [1.15, -1.3, 1], [-1.15, 1.2, 0], [1.15, 1.2, 0]].forEach(([x, z, f]) => wheelsAt.push({ x, z, f: !!f, r: spec.wheel, w: .5 }));
  } else { // moto scooter
    A('toon', RB(.5, .1, .9, .04), { y: .3, z: -.25, color: acc }); A('toon', RB(.52, .46, 1.15, .2), { y: .45, z: .6, color: body });
    A('toon', RB(.5, .9, .14, .06), { y: .75, z: -.72, rx: .22, color: body }); A('toon', RB(.44, .12, .95, .05), { y: .74, z: .3, color: trim });
    A('toon', RB(.42, .3, .38, .06), { y: .98, z: 1.0, color: acc }); A('toon', CAP(.05, .5), { x: .2, y: .45, z: 1.15, rx: Math.PI / 2, color: '#b8bcc6' });
    A('glow', RB(.3, .08, .05, .02), { y: .62, z: 1.2, color: '#ff4a4a' });
    // steering fork (rotates with steer) is built as its own group below
    wheelsAt.push({ x: 0, z: .85, r: spec.wheel, w: .22, f: false }); wheelsAt.push({ x: 0, z: -.95, r: spec.wheel, w: .22, f: true, fork: true });
  }

  // merge static parts
  const toon = b.take('toon'), glow = b.take('glow'), glassG = b.take('glass');
  const tm = new THREE.Mesh(toon, m.toon); tm.castShadow = true; lean.add(tm);
  if (toon) { const og = toon.clone(), p = og.attributes.position, n = og.attributes.normal, e = .035; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * e, p.getY(i) + n.getY(i) * e, p.getZ(i) + n.getZ(i) * e); lean.add(new THREE.Mesh(og, m.line)); }
  if (glow) lean.add(new THREE.Mesh(glow, m.glow)); if (glassG) { const gm = new THREE.Mesh(glassG, m.glass); gm.renderOrder = 2; lean.add(gm); }
  // steering wheel (cars)
  let swMesh = null;
  if (steerWheel) { const sg = new THREE.Group(); sg.position.set(...steerWheel.pos); sg.rotation.x = steerWheel.tilt; lean.add(sg);
    const sb = new Batch(); sb.add('t', new THREE.TorusGeometry(steerWheel.R, .03, 6, 18), { color: '#2a2630' }); sb.add('t', CYL, { sx: .03, sy: steerWheel.R * 2, sz: .03, rz: Math.PI / 2, color: '#2a2630' }); sb.add('t', CYL, { sx: .045, sy: .06, sz: .045, rx: Math.PI / 2, color: acc });
    swMesh = new THREE.Mesh(sb.take('t'), m.toon); sg.add(swMesh); }
  // wheels
  const wheels = [];
  for (const w of wheelsAt) {
    const pivot = new THREE.Group(); pivot.position.set(w.x, w.r, w.z); const mesh = new THREE.Mesh(wheelGeo(w.r, w.w, kind === 'racer' ? '#ffd24a' : acc), m.toon); mesh.castShadow = true; mesh.userData.shared = true; pivot.add(mesh);
    wheels.push({ pivot, mesh, front: w.f, r: w.r, fork: w.fork }); if (!w.fork) lean.add(pivot);
  }
  if (kind === 'moto') { // front end: fork + handlebar + headlight steer together around the head tube
    const fg = new THREE.Group(); fg.position.set(0, .7, -.68); lean.add(fg);
    const fb = new Batch(); fb.add('t', CAP(.035, .36), { y: -.18, z: -.14, rx: -.7, x: .09, color: '#b8bcc6' }); fb.add('t', CAP(.035, .36), { y: -.18, z: -.14, rx: -.7, x: -.09, color: '#b8bcc6' });
    fb.add('t', CAP(.03, .72), { y: .46, rz: Math.PI / 2, color: '#2a2630' }); [-1, 1].forEach(s => fb.add('t', CYL, { x: s * .36, y: .46, sx: .045, sy: .12, sz: .045, rz: Math.PI / 2, color: '#2a2630' }));
    fb.add('t', CAP(.025, .24), { y: .24, color: '#b8bcc6' }); fb.add('t', RB(.34, .18, .24, .08), { y: .66, z: -.02, color: body }); fb.add('t', RB(.5, .12, .5, .05), { y: .32, z: -.06, color: body });
    [-1, 1].forEach(s => { fb.add('t', CAP(.012, .12), { x: s * .3, y: .62, z: .06, rz: s * .5, color: '#2a2630' }); fb.add('t', SPH, { x: s * .35, y: .72, z: .06, sx: .07, sy: .05, sz: .03, color: '#cfe8ff' }); });
    fg.add(new THREE.Mesh(fb.take('t'), m.toon));
    const hl = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); hl.position.set(0, .66, -.17); hl.scale.z = .6; fg.add(hl);
    const fw = wheels.find(w => w.fork); fw.pivot.position.set(0, .38 - .7, -.95 + .68); fg.add(fw.pivot); fork = fg; // wheel sits in the fork group (so it steers)
  }

  let spin = 0, roll = 0, steerS = 0;
  return {
    group, spec, kind,
    update(dt, speed, steer) {
      spin += speed / spec.wheel * dt; steerS += (steer - steerS) * Math.min(1, dt * 10);
      for (const w of wheels) { w.mesh.rotation.x = -spin; if (w.front && !w.fork) w.pivot.rotation.y = -steerS * .5; }
      if (fork) fork.rotation.y = -steerS * .45;
      if (swMesh) swMesh.rotation.z = -steerS * 1.3;
      const f = Math.min(1, Math.abs(speed) / spec.top), want = kind === 'moto' ? -steerS * .32 * f : steerS * .07 * f; roll += (want - roll) * Math.min(1, dt * 6);
      lean.rotation.z = roll; group.userData.roll = roll;
    },
    dispose() { group.traverse(o => { if (o.isMesh && o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
  };
}

/** Arcade physics step. s = {x,z,yaw,v,steer}; input = {throttle,steer} in -1..1 (steer right = +). */
export function driveStep(s, spec, input, dt, offroad, locked) {
  const thr = locked ? 0 : input.throttle, vmax = spec.top * (offroad ? spec.off : 1);
  const want = thr >= 0 ? thr * vmax : thr * vmax * .4;
  let rate;
  if (thr === 0) rate = 7; else if (Math.sign(want) === Math.sign(s.v) || s.v === 0) rate = Math.abs(want) >= Math.abs(s.v) ? spec.acc * (1 - Math.min(1, Math.abs(s.v) / (spec.top * 1.1)) * .55) : 14; else rate = spec.brake;
  if (s.v < want) s.v = Math.min(want, s.v + rate * dt); else if (s.v > want) s.v = Math.max(want, s.v - rate * dt);
  if (locked) s.v = 0;
  const sp = Math.abs(s.v), auth = Math.min(1, sp / 5) * (1 - .38 * Math.min(1, sp / spec.top));
  s.steer += (input.steer - s.steer) * Math.min(1, dt * 9);
  s.yaw -= s.steer * spec.turn * auth * (s.v >= 0 ? 1 : -1) * dt;
  s.x += -Math.sin(s.yaw) * s.v * dt; s.z += -Math.cos(s.yaw) * s.v * dt;
}
