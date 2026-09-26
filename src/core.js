export const WORLD_SIZE = 640;
export const WEAPONS = [
  {
    name: "M416",
    type: "SÚNG TRƯỜNG",
    caliber: "5.56 mm",
    mag: 30,
    reserve: 150,
    damage: 28,
    rate: 0.105,
    reload: 2.2,
    spread: 0.007,
    recoil: 0.018,
    range: 220,
    auto: true,
    color: 0x414946,
  },
  {
    name: "Kar98k",
    type: "SÚNG BẮN TỈA",
    caliber: "7.62 mm",
    mag: 5,
    reserve: 30,
    damage: 82,
    rate: 1.05,
    reload: 3,
    spread: 0.0018,
    recoil: 0.05,
    range: 380,
    auto: false,
    color: 0x73513a,
  },
  {
    name: "UMP45",
    type: "SÚNG TIỂU LIÊN",
    caliber: ".45 ACP",
    mag: 25,
    reserve: 150,
    damage: 23,
    rate: 0.078,
    reload: 1.8,
    spread: 0.014,
    recoil: 0.012,
    range: 105,
    auto: true,
    color: 0x343b3d,
  },
];
export function seeded(seed = 1337) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const edge = 1 - clamp((r - 230) / 100, 0, 1);
  const h =
    4 +
    Math.sin(x * 0.019) * Math.cos(z * 0.016) * 6 +
    Math.sin(x * 0.05 + z * 0.028) * 1.5;
  const hill =
    27 * Math.exp(-((x + 145) ** 2 + (z + 105) ** 2) / 6500) +
    20 * Math.exp(-((x - 150) ** 2 + (z + 145) ** 2) / 7500);
  // The central hamlet and military compound have walkable, level foundations.
  let v = h + hill;
  for (const [cx, cz, rr, hh] of [
    [0, 0, 68, 5],
    [100, 90, 43, 6],
    [-105, 100, 37, 5],
  ]) {
    const d = Math.hypot(x - cx, z - cz),
      f = 1 - clamp((d - rr) / 24, 0, 1);
    v = lerp(v, hh, f);
  }
  return v * edge - 6 * (1 - edge);
}
export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.roofs = [];
    this.cells = new Map();
  }
  add(x, z, w, d, y, h) {
    const b = {
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      minY: y,
      maxY: y + h,
    };
    this.boxes.push(b);
    for (let gx = Math.floor(b.minX / 16); gx <= Math.floor(b.maxX / 16); gx++)
      for (
        let gz = Math.floor(b.minZ / 16);
        gz <= Math.floor(b.maxZ / 16);
        gz++
      ) {
        const k = `${gx},${gz}`;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k).push(b);
      }
    return b;
  }
  nearby(x, z) {
    const set = new Set();
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        for (const box of this.cells.get(
          `${Math.floor(x / 16) + a},${Math.floor(z / 16) + b}`,
        ) || [])
          set.add(box);
    return set;
  }
  move(pos, dx, dz, r = 0.45, h = 1.8) {
    const out = { x: pos.x + dx, y: pos.y, z: pos.z };
    for (const b of this.nearby(out.x, out.z)) {
      if (pos.y + h <= b.minY + 0.08 || pos.y >= b.maxY - 0.1) continue;
      if (
        out.x + r > b.minX &&
        out.x - r < b.maxX &&
        out.z + r > b.minZ &&
        out.z - r < b.maxZ
      ) {
        out.x = dx > 0 ? b.minX - r : dx < 0 ? b.maxX + r : out.x;
      }
    }
    out.z += dz;
    for (const b of this.nearby(out.x, out.z)) {
      if (pos.y + h <= b.minY + 0.08 || pos.y >= b.maxY - 0.1) continue;
      if (
        out.x + r > b.minX &&
        out.x - r < b.maxX &&
        out.z + r > b.minZ &&
        out.z - r < b.maxZ
      ) {
        out.z = dz > 0 ? b.minZ - r : dz < 0 ? b.maxZ + r : out.z;
      }
    }
    return out;
  }
  floor(x, z, previousY, terrain) {
    let floor = terrain;
    for (const b of this.nearby(x, z)) {
      if (
        x > b.minX - 0.1 &&
        x < b.maxX + 0.1 &&
        z > b.minZ - 0.1 &&
        z < b.maxZ + 0.1 &&
        b.maxY <= previousY + 0.15
      )
        floor = Math.max(floor, b.maxY);
    }
    for (const roof of this.roofs) {
      if (
        Math.abs(x - roof.x) <= roof.w / 2 &&
        Math.abs(z - roof.z) <= roof.d / 2
      ) {
        const y =
          roof.y + roof.rise * (1 - Math.abs(z - roof.z) / (roof.d / 2));
        if (y <= previousY + 0.35) floor = Math.max(floor, y);
      }
    }
    return floor;
  }
  ceiling(x, z, previousY, h) {
    let ceiling = Infinity;
    for (const b of this.nearby(x, z)) {
      if (
        x > b.minX - 0.3 &&
        x < b.maxX + 0.3 &&
        z > b.minZ - 0.3 &&
        z < b.maxZ + 0.3 &&
        b.minY >= previousY + h - 0.05
      )
        ceiling = Math.min(ceiling, b.minY);
    }
    return ceiling;
  }
  ray(origin, dir, max = 500) {
    let nearest = max;
    for (const b of this.boxes) {
      let lo = 0,
        hi = nearest;
      for (const [a, mi, ma] of [
        ["x", "minX", "maxX"],
        ["y", "minY", "maxY"],
        ["z", "minZ", "maxZ"],
      ]) {
        if (Math.abs(dir[a]) < 1e-8) {
          if (origin[a] < b[mi] || origin[a] > b[ma]) {
            hi = -1;
            break;
          }
        } else {
          let t1 = (b[mi] - origin[a]) / dir[a],
            t2 = (b[ma] - origin[a]) / dir[a];
          if (t1 > t2) [t1, t2] = [t2, t1];
          lo = Math.max(lo, t1);
          hi = Math.min(hi, t2);
        }
      }
      if (hi >= lo && hi >= 0) nearest = Math.min(nearest, lo);
    }
    for (const roof of this.roofs)
      for (const side of [-1, 1]) {
        const slope = (side * roof.rise) / (roof.d / 2);
        const denominator = dir.y + slope * dir.z;
        if (Math.abs(denominator) < 1e-8) continue;
        const t =
          (roof.y + roof.rise - origin.y - slope * (origin.z - roof.z)) /
          denominator;
        if (t < 0 || t >= nearest) continue;
        const x = origin.x + dir.x * t - roof.x;
        const z = origin.z + dir.z * t - roof.z;
        if (
          Math.abs(x) <= roof.w / 2 &&
          z * side >= 0 &&
          Math.abs(z) <= roof.d / 2
        )
          nearest = t;
      }
    return nearest;
  }
}
export function sphereHit(origin, dir, center, radius) {
  const x = origin.x - center.x,
    y = origin.y - center.y,
    z = origin.z - center.z;
  const b = x * dir.x + y * dir.y + z * dir.z,
    c = x * x + y * y + z * z - radius * radius,
    d = b * b - c;
  if (d < 0) return Infinity;
  const t = -b - Math.sqrt(d);
  return t >= 0 ? t : Infinity;
}
export const PHASES = [
  { wait: 45, shrink: 45, r: 210 },
  { wait: 30, shrink: 40, r: 145 },
  { wait: 25, shrink: 35, r: 85 },
  { wait: 20, shrink: 30, r: 42 },
  { wait: 15, shrink: 25, r: 15 },
  { wait: 10, shrink: 25, r: 0 },
];
export function zoneAt(time) {
  let start = 285;
  for (let i = 0; i < PHASES.length; i++) {
    const p = PHASES[i];
    if (time < p.wait)
      return {
        radius: start,
        next: p.r,
        phase: i + 1,
        closing: false,
        remaining: p.wait - time,
        damage: 2 + i * 1.6,
      };
    time -= p.wait;
    if (time < p.shrink)
      return {
        radius: lerp(start, p.r, time / p.shrink),
        next: p.r,
        phase: i + 1,
        closing: true,
        remaining: p.shrink - time,
        damage: 2 + i * 1.6,
      };
    time -= p.shrink;
    start = p.r;
  }
  return {
    radius: 0,
    next: 0,
    phase: 6,
    closing: true,
    remaining: 0,
    damage: 18,
  };
}
export function applyDamage(entity, amount) {
  const absorbed = Math.min(entity.armor, amount * 0.48);
  entity.armor = Math.max(0, entity.armor - absorbed);
  entity.hp = Math.max(0, entity.hp - (amount - absorbed));
  return amount - absorbed;
}
