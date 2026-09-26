import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const materials = {};
function mat(c, metalness = 0) {
  const k = c + "_" + metalness;
  return (materials[k] ??= new THREE.MeshStandardMaterial({
    color: c,
    roughness: metalness ? 0.5 : 0.87,
    metalness,
  }));
}
function box(g, c, x, y, z, w, h, d, metal = 0) {
  const m = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.14),
    mat(c, metal),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function cyl(g, c, x, y, z, r1, r2, h, n = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), mat(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
function optimize(g) {
  const meshes = g.children.filter((m) => m.isMesh);
  const groups = new Map();
  for (const m of meshes) {
    m.updateMatrix();
    const geo = (
      m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
    ).applyMatrix4(m.matrix);
    if (!groups.has(m.material)) groups.set(m.material, []);
    groups.get(m.material).push(geo);
    g.remove(m);
    m.geometry.dispose();
  }
  for (const [m, gs] of groups) {
    const mesh = new THREE.Mesh(mergeGeometries(gs), m);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    gs.forEach((g) => g.dispose());
  }
}
export function createWeapon(type = 0, hands = false) {
  const g = new THREE.Group(),
    body = type === 1 ? 0x504b41 : 0x333e3d,
    metal = 0x263032,
    wood = type === 1 ? 0x80543a : 0x48524a;
  box(g, body, 0, 0, 0, 0.115, 0.16, 0.43, 0.55);
  box(g, metal, 0, 0.086, -0.05, 0.078, 0.025, 0.48, 0.7);
  box(g, wood, 0, -0.025, 0.31, 0.105, 0.17, 0.26);
  box(g, metal, 0, -0.008, 0.445, 0.13, 0.21, 0.025);
  box(g, wood, 0, -0.04, -0.31, 0.11, 0.11, 0.26);
  const barrel = cyl(
    g,
    metal,
    0,
    0.013,
    -0.58,
    0.021,
    0.021,
    type === 1 ? 0.44 : 0.28,
  );
  barrel.rotation.x = Math.PI / 2;
  const brake = cyl(
    g,
    metal,
    0,
    0.013,
    type === 1 ? -0.82 : -0.74,
    0.032,
    0.032,
    0.08,
  );
  brake.rotation.x = Math.PI / 2;
  const grip = box(g, wood, 0, -0.17, 0.1, 0.085, 0.22, 0.1);
  grip.rotation.x = -0.25;
  const mag = box(
    g,
    metal,
    0,
    -0.21,
    -0.1,
    0.065,
    type === 1 ? 0.12 : 0.27,
    0.15,
    0.5,
  );
  mag.rotation.x = type === 1 ? 0 : 0.15;
  box(g, metal, 0.064, 0.014, 0.12, 0.018, 0.045, 0.12, 0.7);
  for (let i = 0; i < 6; i++)
    box(g, metal, 0, 0.073, -0.22 - i * 0.043, 0.116, 0.018, 0.018, 0.6);
  if (type === 1) {
    const scope = cyl(g, 0x243233, 0, 0.17, -0.1, 0.052, 0.052, 0.35, 16);
    scope.rotation.x = Math.PI / 2;
    box(g, metal, 0, 0.115, -0.08, 0.035, 0.1, 0.12);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.042, 16),
      new THREE.MeshStandardMaterial({
        color: 0x3e9192,
        metalness: 0.85,
        roughness: 0.15,
      }),
    );
    lens.position.set(0, 0.17, 0.077);
    g.add(lens);
  } else {
    box(g, metal, 0, 0.15, 0.08, 0.11, 0.018, 0.05);
    for (const x of [-0.047, 0.047])
      box(g, metal, x, 0.124, 0.08, 0.014, 0.055, 0.05);
    box(g, 0xe26940, 0, 0.12, 0.08, 0.008, 0.008, 0.007);
    box(g, metal, 0, 0.105, -0.49, 0.016, 0.07, 0.025);
  }
  if (type === 2) {
    box(g, metal, 0, -0.27, -0.08, 0.06, 0.31, 0.095);
  }
  if (hands) {
    const hand = box(g, 0x95765b, -0.035, -0.12, -0.32, 0.105, 0.12, 0.16);
    hand.rotation.z = -0.3;
    const arm = box(g, 0x586154, -0.11, -0.24, -0.15, 0.13, 0.15, 0.35);
    arm.rotation.set(-0.45, 0, -0.2);
    box(g, 0x2d3834, -0.037, -0.11, -0.31, 0.116, 0.055, 0.17);
    box(g, 0x95765b, 0.047, -0.115, 0.11, 0.075, 0.095, 0.14);
    const a = box(g, 0x5e6858, 0.15, -0.25, 0.27, 0.14, 0.16, 0.32);
    a.rotation.set(0.35, -0.35, -0.3);
    box(g, 0x2d3834, 0.063, -0.14, 0.1, 0.1, 0.1, 0.1);
  }
  optimize(g);
  return g;
}
export function createSoldier(variant = 0) {
  const root = new THREE.Group();
  const uniform =
    variant === 0 ? 0x657366 : variant === 1 ? 0x806c52 : 0x5e6c71;
  const pants = 0x3d4841,
    vest = 0x414c3e,
    skin = 0xa98b6e;
  const torso = new THREE.Group();
  root.add(torso);
  torso.position.y = 1.13;
  box(torso, uniform, 0, 0.12, 0, 0.48, 0.59, 0.29);
  box(torso, vest, 0, 0.14, 0.03, 0.5, 0.47, 0.37);
  for (const x of [-0.15, 0, 0.15]) {
    box(torso, 0x5b624b, x, 0.05, -0.195, 0.12, 0.19, 0.085);
    box(torso, 0x71745b, x, 0.14, -0.24, 0.11, 0.027, 0.016);
  }
  box(torso, 0x28372e, 0, -0.19, 0, 0.49, 0.09, 0.32);
  box(torso, 0xaaa28a, 0, -0.19, -0.173, 0.08, 0.07, 0.025);
  box(torso, 0x525a46, 0, 0.15, 0.255, 0.39, 0.5, 0.24);
  box(torso, 0x434c39, 0, -0.02, 0.37, 0.29, 0.13, 0.065);
  for (const x of [-0.2, 0.2])
    box(torso, 0x38422f, x, 0.24, 0.03, 0.065, 0.55, 0.37);
  cyl(torso, skin, 0, 0.485, 0, 0.092, 0.1, 0.12);
  const head = new THREE.Group();
  head.position.y = 0.64;
  torso.add(head);
  box(head, skin, 0, 0, -0.02, 0.23, 0.26, 0.23);
  box(head, 0x383d30, 0, -0.08, -0.13, 0.24, 0.12, 0.05);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
    mat(0x505a46),
  );
  helmet.position.set(0, 0.06, 0);
  head.add(helmet);
  box(head, 0x3b4434, 0, 0.026, -0.03, 0.35, 0.06, 0.32);
  box(head, 0x202d2b, 0, 0.007, -0.151, 0.25, 0.085, 0.037);
  box(head, 0x555f50, 0.19, 0.015, 0, 0.044, 0.14, 0.12);
  box(head, 0x555f50, -0.19, 0.015, 0, 0.044, 0.14, 0.12);
  const arms = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 0.3, 0.32, 0);
    torso.add(g);
    box(g, uniform, 0, -0.12, 0, 0.15, 0.34, 0.17);
    box(g, uniform, 0, -0.31, -0.13, 0.14, 0.15, 0.3);
    box(g, skin, 0, -0.3, -0.32, 0.12, 0.13, 0.12);
    box(g, vest, 0, -0.12, -0.03, 0.16, 0.14, 0.18);
    optimize(g);
    arms.push(g);
  }
  const gun = createWeapon(0);
  gun.position.set(0.22, -0.01, -0.39);
  gun.scale.setScalar(0.78);
  torso.add(gun);
  const legs = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 0.135, 0.93, 0);
    root.add(g);
    box(g, pants, 0, -0.21, 0, 0.21, 0.44, 0.24);
    box(g, pants, 0, -0.61, 0, 0.17, 0.39, 0.2);
    box(g, 0x424b3d, 0, -0.43, -0.11, 0.17, 0.2, 0.09);
    box(g, 0x28312c, 0, -0.85, -0.05, 0.2, 0.18, 0.32);
    box(g, 0x766c51, s * 0.09, -0.17, 0.01, 0.09, 0.2, 0.19);
    optimize(g);
    legs.push(g);
  }
  optimize(head);
  optimize(torso);
  return {
    root,
    torso,
    head,
    arms,
    legs,
    animate(t, speed = 0, aim = false) {
      for (let i = 0; i < 2; i++) {
        legs[i].rotation.x = Math.sin(t * 9 + i * Math.PI) * 0.58 * speed;
        arms[i].rotation.x = Math.sin(t * 9 + i * Math.PI) * 0.12 * speed;
      }
      torso.rotation.z = Math.sin(t * 4.5) * 0.025 * speed;
      torso.position.y = 1.13 + Math.abs(Math.sin(t * 9)) * 0.035 * speed;
    },
  };
}
export function createLoot(type) {
  const root = new THREE.Group();
  const colors = {
    ammo: 0xe0b05d,
    med: 0xa8ccc0,
    armor: 0x80b9d4,
    weapon: 0xc0a0d7,
    grenade: 0xb2bc80,
  };
  const col = colors[type] || 0xe0b05d;
  if (type === "med") {
    box(root, 0xd2d4ba, 0, 0.16, 0, 0.45, 0.27, 0.32);
    box(root, 0x7b4940, 0, 0.302, 0, 0.1, 0.01, 0.24);
    box(root, 0x7b4940, 0, 0.303, 0, 0.27, 0.01, 0.09);
  } else if (type === "weapon") {
    const w = createWeapon(1);
    w.rotation.set(0, Math.PI / 2, 0.1);
    w.position.y = 0.15;
    root.add(w);
  } else if (type === "armor") {
    box(root, 0x455a55, 0, 0.23, 0, 0.4, 0.44, 0.17);
    for (const s of [-1, 1])
      box(root, 0x455a55, s * 0.13, 0.48, 0, 0.08, 0.13, 0.16);
  } else {
    box(
      root,
      type === "ammo" ? 0x79764a : 0x58634e,
      0,
      0.12,
      0,
      0.3,
      0.24,
      0.23,
    );
    box(root, col, 0, 0.24, 0, 0.17, 0.01, 0.14);
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.37, 0.42, 24),
    new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  root.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.18, 1.5, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  beam.position.y = 0.75;
  root.add(beam);
  root.userData.ring = ring;
  return root;
}
