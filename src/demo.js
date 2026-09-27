import { clamp } from "./core.js";
import { Navigation } from "./navigation.js";
const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Drives ordinary player controls. No teleports, unlimited ammunition or immunity.
export class DemoPilot {
  constructor(game) {
    this.g = game;
    this.navigation = game.navigation ??= new Navigation((x, z, y) =>
      game.blocked(x, z, y),
    );
    this.think = 0;
    this.target = null;
    this.path = [];
    this.planIn = 0;
    this.stuck = 0;
    this.walking = false;
    this.travel = 0;
    this.replans = 0;
    this.state = "drop";
    this.noHit = 0;
    this.lastHits = 0;
    this.reposition = 0;
  }
  update(dt) {
    const g = this.g,
      p = g.player;
    const moved = this.last
      ? Math.hypot(p.x - this.last.x, p.z - this.last.z)
      : 0;
    this.travel += moved;
    // Turning, reloading, healing and aiming are not failed movement attempts.
    this.stuck = this.walking && moved < dt * 0.5 ? this.stuck + dt : 0;
    this.last = { x: p.x, z: p.z };
    this.walking = false;
    g.keys.clear();
    g.mouse.fire = false;
    this.wantShoot = false;
    if (g.mode === "drop") {
      p.pitch = -0.3;
      this.state = "drop";
      return;
    }
    if (g.mode !== "playing") return;
    if (g.nearestLoot) g.pickup();
    if (p.hp < 48 && p.meds && !p.heal) g.heal();
    if (p.heal) {
      g.mouse.aim = false;
      this.state = "heal";
      return;
    }
    if (!p.ammo[p.weapon]) g.reload();
    this.think -= dt;
    this.planIn -= dt;
    this.reposition = Math.max(0, this.reposition - dt);
    if (this.think <= 0) {
      this.think = 0.4;
      const live = g.bots
        .filter((b) => b.alive)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
        );
      const candidate =
        live.find(
          (b) => Math.hypot(b.x - p.x, b.z - p.z) < 140 && g.lineOfSight(p, b),
        ) || live[0];
      if (candidate !== this.target) {
        this.target = candidate;
        this.planIn = 0;
        this.noHit = 0;
      }
    }
    const b = this.target;
    if (!b?.alive) {
      this.think = 0;
      return;
    }
    const distance = Math.hypot(b.x - p.x, b.z - p.z),
      outside = Math.hypot(p.x, p.z) > g.zone.next * 0.88;
    const visible =
      distance < 140 && g.lineOfSight(p, b) && !outside && !this.reposition;
    if (visible) {
      this.state = "combat";
      let weapon = p.weapon;
      if (distance > 85) weapon = 1;
      else if (distance < 22) weapon = 2;
      else if (
        (weapon === 1 && distance < 60) ||
        (weapon === 2 && distance > 30)
      )
        weapon = 0;
      if (!p.ammo[weapon] && !p.reserve[weapon])
        weapon = p.ammo.findIndex((n, i) => n + p.reserve[i] > 0);
      if (weapon >= 0 && weapon !== p.weapon && !p.reload)
        g.switchWeapon(weapon);
      p.crouched = false;
      const yaw = Math.atan2(p.x - b.x, p.z - b.z),
        error = angle(yaw - p.yaw);
      const pitch =
        Math.atan2(b.y + 1.2 - (p.y + 1.7), distance) - g.recoil * 0.4;
      p.pitch += (pitch - p.pitch) * (1 - Math.exp(-12 * dt));
      p.yaw += clamp(error, -1.8 * dt, 1.8 * dt);
      g.mouse.aim = true;
      this.wantShoot =
        Math.abs(error) < 0.018 &&
        Math.abs(p.pitch - pitch) < 0.02 &&
        !p.reload;
      if (p.hits !== this.lastHits) {
        this.noHit = 0;
        this.lastHits = p.hits;
      } else if (this.wantShoot) this.noHit += dt;
      if (this.noHit > 3.5) {
        this.reposition = 2.5;
        this.planIn = 0;
        this.noHit = 0;
      }
      return;
    }
    this.state = outside ? "zone" : "navigate";
    g.mouse.aim = false;
    p.crouched = false;
    const goal = outside ? { x: 0, z: 0 } : b;
    if (this.stuck > 0.65) {
      this.path = [];
      this.planIn = 0;
      this.stuck = 0;
      if (p.grounded) {
        p.vy = 6.3;
        p.grounded = false;
      }
    }
    if (this.planIn <= 0 || !this.path.length) {
      this.path = this.navigation.route(p, goal);
      this.planIn = 2.5;
      this.replans++;
    }
    while (
      this.path.length &&
      Math.hypot(this.path[0].x - p.x, this.path[0].z - p.z) < 1.1
    )
      this.path.shift();
    const next = this.path[0];
    if (!next) {
      this.planIn = Math.min(this.planIn, 0.5);
      return;
    }
    const yaw = Math.atan2(p.x - next.x, p.z - next.z),
      error = angle(yaw - p.yaw);
    p.yaw += clamp(error, -1.8 * dt, 1.8 * dt);
    p.pitch += (0 - p.pitch) * Math.min(1, dt * 4);
    if (Math.abs(error) < 0.35) {
      g.keys.add("KeyW");
      this.walking = true;
      if (Math.hypot(next.x - p.x, next.z - p.z) > 5) g.keys.add("ShiftLeft");
    }
  }
}
