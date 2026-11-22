// World assembly: Museum (museum.js), House (below, unchanged), Garden + race track (garden.js).
import * as THREE from 'three';
import { makeKit, M, ctex, wood, grass, sky } from './kit.js';
import { buildMuseum } from './museum.js';
import { buildGarden } from './garden.js';

export function buildWorld(scene) {
  const K = makeKit(scene), { locs, loc, add, box, wall, light, seat, glow, door, tree, bench } = K;
  buildMuseum(K);

  /* ================================ HOUSE ================================ */
  const Z0 = 100, HO = loc('house', { name: 'House', spawn: { x: -4, z: Z0 + 2, ry: -Math.PI / 2 }, bounds: [-38, Z0 - 28, 38, Z0 + 26],
    sky: { bg: sky([[0, '#5a7fb5'], [.45, '#e9b48c'], [.7, '#f6d2a2'], [1, '#c98f6b']]), fog: ['#e2b48f', 40, 130] }, music: .7, ambience: 'house' });
  const hw = M('#efe7da', { roughness: .95 }), hfloor = M('#fff', { map: wood([6, 4]), roughness: .55 });
  add(HO, new THREE.PlaneGeometry(200, 200), M('#fff', { map: grass([50, 50]), roughness: 1 }), 0, -.01, Z0, { rx: -Math.PI / 2, shadow: false });
  add(HO, new THREE.PlaneGeometry(22, 16), hfloor, 0, 0, Z0, { rx: -Math.PI / 2, shadow: false });
  add(HO, new THREE.PlaneGeometry(22, 16), M('#f6f1e8'), 0, 2.99, Z0, { rx: Math.PI / 2, shadow: false });
  box(HO, 22.6, .3, 16.6, 0, 3, Z0, M('#bfb4a2'), {}); // roof slab
  wall(HO, 'x', Z0 - 8, -11, 11, 3, hw, [{ a: -2, b: 2, low: 1, high: 2.3, glass: true }, { a: 5, b: 9, low: 1, high: 2.3, glass: true }]);
  wall(HO, 'x', Z0 + 8, -11, 11, 3, hw, [{ a: -10, b: -2, low: 0, high: 2.5, glass: true }, { a: 4, b: 8, low: 1, high: 2.3, glass: true }]);
  wall(HO, 'z', 11, Z0 - 8, Z0 + 8, 3, hw, [{ a: Z0 - 3, b: Z0 + 3, low: .9, high: 2.3, glass: true }]);
  wall(HO, 'z', -11, Z0 - 8, Z0 + 8, 3, hw, [{ a: Z0 - 1.1, b: Z0 + 1.1 }]);
  wall(HO, 'z', 0, Z0 - 8, Z0 + 8, 3, hw, [{ a: Z0 - 4, b: Z0 + 4, high: 2.4 }], .2);
  wall(HO, 'x', Z0, 0, 11, 3, hw, [{ a: 4.2, b: 5.8 }], .2);
  const front = door(HO, 'ho-front', -11, Z0, 'z', 2.2, 1, M('#6b4a2e', { roughness: .5 }), { portal: { label: 'Open the front door' } });
  const bedroom = door(HO, 'ho-bed', 5, Z0, 'x', 1.6, 1, M('#d8cfbf', { roughness: .6 }));
  bedroom.label = 'Open / close the bedroom door'; front.label = 'Open / close the front door';
  // living room
  const sofaM = M('#5b6b7a', { roughness: .95 }), cushion = M('#c9a24a', { roughness: .9 });
  box(HO, 3, .45, 1, -6, 0, Z0 - 6.2, sofaM, { col: true }); box(HO, 3, .55, .25, -6, .45, Z0 - 6.6, sofaM); box(HO, .25, .3, .9, -7.5, .45, Z0 - 6.2, sofaM); box(HO, .25, .3, .9, -4.5, .45, Z0 - 6.2, sofaM);
  box(HO, .4, .4, .12, -6.8, .45, Z0 - 6.2, cushion); seat(HO, -6.6, .5, Z0 - 6.1, Math.PI, 'Sit on the sofa'); seat(HO, -5.4, .5, Z0 - 6.1, Math.PI, 'Sit on the sofa');
  box(HO, 1.1, .38, 1, -2.2, 0, Z0 - 2.6, M('#8a5a44'), { col: true }); box(HO, .12, .8, 1, -2.7, .38, Z0 - 2.6, M('#8a5a44')); seat(HO, -2.0, .45, Z0 - 2.6, -Math.PI / 2, 'Sit in the armchair');
  box(HO, 1.6, .4, .8, -6, 0, Z0 - 3.6, M('#5a4030'), { col: true }); box(HO, 4, .02, 3, -5.8, .01, Z0 - 3.8, M('#8b3a3a'));
  box(HO, 2.4, .5, .5, -6, 0, Z0 + 1.2, M('#4a3426'), { col: true }); box(HO, 1.8, 1, .06, -6, .75, Z0 + 1.15, M('#0b0b0d', { roughness: .2 }));
  box(HO, 1.4, 2.2, .35, -10.6, 0, Z0 - 6.5, M('#4a3426'), { col: true });
  for (let i = 0; i < 4; i++) box(HO, 1.2, .04, .3, -10.6, .5 + i * .5, Z0 - 6.5, M('#6b4a32'));
  tree(HO, -9.5, Z0 + 5, .35, '#5a3b25', '#3d7a3d');
  light(HO, '#ffd9a8', 12, 14, -6, 2.6, Z0 - 2); light(HO, '#ffd9a8', 8, 12, -6, 2.6, Z0 + 4);
  // kitchen
  const cab = M('#e9e6e0', { roughness: .5 }), top = M('#3a3a40', { roughness: .3 });
  box(HO, 9, .9, .7, 5.5, 0, Z0 - 7.5, cab, { col: true }); box(HO, 9, .05, .75, 5.5, .9, Z0 - 7.5, top); box(HO, 1.2, 2.1, .8, 9.8, 0, Z0 - 7.5, M('#c8ccd2', { metalness: .6, roughness: .3 }), { col: true });
  box(HO, 2.6, .9, 1.1, 4.5, 0, Z0 - 4.8, cab, { col: true }); box(HO, 2.7, .05, 1.2, 4.5, .9, Z0 - 4.8, top);
  box(HO, 1.8, .06, 1.1, 7.8, .72, Z0 - 3.2, M('#6b4a32'), { col: true });
  [[7.1, -3.7, 0], [8.5, -3.7, 0], [7.1, -2.7, Math.PI], [8.5, -2.7, Math.PI]].forEach(([x, z, y]) => { box(HO, .42, .06, .42, x, .42, Z0 + z, M('#2b2b2b')); box(HO, .42, .45, .05, x, .45, Z0 + z + (y ? .2 : -.2), M('#2b2b2b')); seat(HO, x, .46, Z0 + z, y ? 0 : Math.PI, 'Sit at the table'); });
  box(HO, .1, .72, .1, 7.8, 0, Z0 - 3.2, M('#2b2b2b')); light(HO, '#fff0d0', 10, 12, 6, 2.6, Z0 - 4);
  // bedroom
  box(HO, 2.2, .35, 2.4, 8.6, 0, Z0 + 5.4, M('#4a3426'), { col: true }); box(HO, 2, .22, 2.2, 8.6, .35, Z0 + 5.4, M('#f1ede6')); box(HO, 2.2, 1, .12, 8.6, 0, Z0 + 6.6, M('#4a3426'));
  box(HO, .7, .15, .4, 8.1, .56, Z0 + 6.2, M('#fff')); box(HO, .7, .15, .4, 9.1, .56, Z0 + 6.2, M('#fff')); box(HO, 2, .06, .9, 8.6, .57, Z0 + 4.8, M('#7d2e3b'));
  seat(HO, 7.35, .5, Z0 + 5.4, Math.PI / 2, 'Sit on the bed'); seat(HO, 9.85, .5, Z0 + 5.4, -Math.PI / 2, 'Sit on the bed');
  box(HO, .5, .5, .5, 6.9, 0, Z0 + 7.5, M('#4a3426'), { col: true }); box(HO, 2, 2.3, .6, 2.6, 0, Z0 + 7.5, M('#6b5240'), { col: true });
  light(HO, '#ffcf99', 7, 9, 6.9, 1.3, Z0 + 7.3); glow(HO, 6.9, 1.0, Z0 + 7.5, .2, .25, .2, '#ffe2b8');
  // balcony
  box(HO, 8.6, .12, 4, -6, -.0, Z0 + 10, M('#8a7a68'), {}); for (let i = 0; i <= 8; i++) box(HO, .06, 1, .06, -10.2 + i * 1.05, 0, Z0 + 12, M('#222')); box(HO, 8.6, .06, .08, -6, 1, Z0 + 12, M('#222'));
  box(HO, .06, 1, 4, -10.3, 0, Z0 + 10, M('#222')); box(HO, .06, 1, 4, -1.7, 0, Z0 + 10, M('#222'));
  HO.colliders.push({ b: [-10.4, Z0 + 11.9, -1.6, Z0 + 12.2] }, { b: [-10.4, Z0 + 8, -10.2, Z0 + 12] }, { b: [-1.8, Z0 + 8, -1.6, Z0 + 12] });
  [-8, -4.4].forEach(x => { box(HO, .6, .08, .6, x, .45, Z0 + 10.6, M('#6b4a32')); box(HO, .6, .5, .08, x, .5, Z0 + 10.3, M('#6b4a32')); seat(HO, x, .5, Z0 + 10.6, Math.PI, 'Sit on the balcony'); });
  light(HO, '#ffb87a', 6, 10, -6, 2.4, Z0 + 10);
  // distant scenery: mountains + lake beyond the balcony
  for (let i = 0; i < 9; i++) add(HO, new THREE.ConeGeometry(18 + (i % 3) * 8, 22 + (i * 7) % 16, 5), M(i % 2 ? '#51607a' : '#3f4a63', { flatShading: true, fog: true }), -80 + i * 22, 9, Z0 + 95 + (i % 2) * 14, { shadow: false });
  add(HO, new THREE.PlaneGeometry(200, 60), M('#6fa3c8', { metalness: .6, roughness: .12 }), 0, .02, Z0 + 46, { rx: -Math.PI / 2, shadow: false });
  // lawn: path, trees, flowers, bench, gate
  for (let i = 0; i < 13; i++) add(HO, new THREE.CylinderGeometry(.6, .6, .04, 10), M('#b9b2a4'), -13 - i * 1.4, .02, Z0 + Math.sin(i * .5) * .5, { shadow: false });
  [[-18, 10], [-24, -12], [-30, 14], [-14, -16], [-26, 22], [20, 14], [22, -14], [-33, -4], [18, 22]].forEach(([x, z]) => tree(HO, x, Z0 + z, 1 + Math.abs(x % 3) * .1));
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 6, 5), M('#fff'), 160), dm = new THREE.Object3D(), fcols = ['#e76f8a', '#f2c14e', '#fff', '#a78bfa', '#ff9e5e'];
  for (let i = 0; i < 160; i++) { const bx = -16 + (i % 40) * .22, bz = Z0 + 3 + Math.floor(i / 40) * .35; dm.position.set(bx + Math.random() * .1, .15, bz); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix); fl.setColorAt(i, new THREE.Color(fcols[i % 5])); } HO.group.add(fl);
  box(HO, .25, 3, .25, -34, 0, Z0 - 1.6, M('#d8cfbf'), { col: true }); box(HO, .25, 3, .25, -34, 0, Z0 + 1.6, M('#d8cfbf'), { col: true }); box(HO, .3, .3, 3.5, -34, 3, Z0, M('#d8cfbf'));
    HO.portals.push({ x: -33, z: Z0, r: 1.8, to: 'garden', label: 'Walk through the gate → Garden' });
  const sun = new THREE.DirectionalLight('#ffd2a0', 2.2); sun.position.set(30, 25, Z0 + 30); sun.target.position.set(0, 0, Z0); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 100 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004;
  HO.group.add(sun, sun.target, new THREE.HemisphereLight('#ffe7c9', '#556b4a', .75)); HO.sun = sun;

  bench(HO, -18, Z0 - 3.5, Math.PI); // lawn bench (was declared with the garden code originally)
  buildGarden(K);

  /* ----- shared helpers ----- */
  const all = Object.values(locs);
  const world = {
    locs, all,
    show(id) { all.forEach(l => l.group.visible = l.id === id); },
    // circle (r) vs colliders; returns corrected [x,z]
    collide(L, x, z, r = .32) {
      const [x0, z0, x1, z1] = L.bounds; x = Math.min(x1 - r, Math.max(x0 + r, x)); z = Math.min(z1 - r, Math.max(z0 + r, z));
      for (const c of L.colliders) { if (c.off) continue; const [a, b, cx, d] = c.b; const px = Math.max(a, Math.min(x, cx)), pz = Math.max(b, Math.min(z, d)); let dx = x - px, dz = z - pz, dd = dx * dx + dz * dz;
        if (dd < r * r) { if (dd < 1e-8) { dx = x < (a + cx) / 2 ? -1 : 1; dz = 0; dd = 1; } const l = Math.sqrt(dd), k = (r - l) / (l || 1); x += dx * k; z += dz * k; } }
      return [x, z];
    },
    updateDoors(L, dt) { for (const d of L.doors) { d.t += ((d.open ? 1 : 0) - d.t) * Math.min(1, dt * 6); d.pivot.rotation.y = d.t * 1.5 * (d.axis === 'x' ? -d.hinge : d.hinge) * (d.axis === 'x' ? 1 : -1); } },
    tick(L, t, dt, player) { L.tick.forEach(f => f(t, dt, player)); this.updateDoors(L, dt); },
    setQuality(q) { all.forEach(l => l.setQuality?.(q)); },
    /** called once after track.json is fetched (null = no race track) */
    buildRace(track) { locs.garden.buildRace(track); }
  };
  return world;
}
