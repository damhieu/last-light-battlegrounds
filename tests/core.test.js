import test from "node:test";
import assert from "node:assert/strict";
import {
  CollisionWorld,
  seeded,
  heightAt,
  sphereHit,
  zoneAt,
  applyDamage,
  PHASES,
} from "../src/core.js";
test("deterministic terrain has level settlements and an ocean coastline", () => {
  assert.equal(heightAt(0, 0), 5);
  assert.equal(heightAt(100, 90), 6);
  assert.ok(heightAt(320, 320) < 0);
  const a = seeded(1),
    b = seeded(1);
  assert.deepEqual(Array.from({ length: 8 }, a), Array.from({ length: 8 }, b));
});
test("collision stops movement at a wall and permits sliding and jumping above it", () => {
  const w = new CollisionWorld();
  w.add(5, 0, 2, 10, 0, 3);
  const a = w.move({ x: 3, y: 0, z: 0 }, 1, 1, 0.4, 1.8);
  assert.equal(a.x, 3.6);
  assert.equal(a.z, 1);
  assert.equal(w.move({ x: 3, y: 4, z: 0 }, 1, 0, 0.4).x, 4);
});
test("hitscan is blocked by solid walls and parallel rays outside a wall pass", () => {
  const w = new CollisionWorld();
  w.add(5, 0, 2, 10, 0, 3);
  assert.equal(w.ray({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, 100), 4);
  assert.equal(w.ray({ x: 0, y: 4, z: 0 }, { x: 1, y: 0, z: 0 }, 100), 100);
});
test("hit spheres resolve front-facing hits, misses, and targets behind the shooter", () => {
  const o = { x: 0, y: 0, z: 0 },
    d = { x: 0, y: 0, z: -1 };
  assert.equal(sphereHit(o, d, { x: 0, y: 0, z: -10 }, 1), 9);
  assert.equal(sphereHit(o, d, { x: 2, y: 0, z: -10 }, 1), Infinity);
  assert.equal(sphereHit(o, d, { x: 0, y: 0, z: 10 }, 1), Infinity);
});
test("zone is continuous, never expands, and eventually closes completely", () => {
  let last = 285;
  for (let t = 0; t < 500; t += 0.1) {
    const z = zoneAt(t);
    assert.ok(z.radius <= last + 0.00001);
    assert.ok(z.radius >= 0);
    last = z.radius;
  }
  assert.equal(zoneAt(0).closing, false);
  assert.equal(zoneAt(45).closing, true);
  assert.equal(zoneAt(90).radius, 210);
  assert.equal(
    zoneAt(PHASES.reduce((a, p) => a + p.wait + p.shrink, 0)).radius,
    0,
  );
});
test("armor absorbs part of damage, runs out correctly, and health never goes negative", () => {
  const p = { hp: 100, armor: 20 };
  applyDamage(p, 50);
  assert.equal(p.armor, 0);
  assert.equal(p.hp, 70);
  applyDamage(p, 200);
  assert.equal(p.hp, 0);
});
test("falling onto cover finds the top surface, and ceilings stop upward movement", () => {
  const w = new CollisionWorld();
  w.add(0, 0, 2, 2, 0, 1.2);
  w.add(0, 0, 4, 4, 4, 0.25);
  assert.equal(w.floor(0, 0, 2, 0), 1.2);
  assert.equal(w.floor(3, 0, 2, 0), 0);
  assert.equal(w.ceiling(0, 0, 1, 1.8), 4);
});
test("sloped roofs support landing at the rendered height and stop projectiles", () => {
  const w = new CollisionWorld();
  w.roofs.push({ x: 0, z: 0, w: 10, d: 10, y: 5, rise: 2 });
  assert.equal(w.floor(0, 0, 20, 0), 7);
  assert.equal(w.floor(0, 2.5, 20, 0), 6);
  assert.equal(w.ray({ x: 0, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 20), 3);
  assert.equal(w.ray({ x: 9, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 20), 20);
});
