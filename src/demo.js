import { clamp, heightAt } from "./core.js";

// The spectator drives the same movement, weapon, ammo and damage rules as a player.
export class DemoPilot {
  constructor(game) {
    this.g = game;
    this.think = 0;
    this.target = null;
    this.stuck = 0;
    this.detour = 0;
  }
  update(dt) {
    const g = this.g,
      p = g.player;
    g.keys.clear();
    g.mouse.fire = false;
    this.wantShoot = false;
    if (g.mode === "drop") {
      p.pitch = -0.3;
      return;
    }
    if (g.mode !== "playing") return;
    if (g.nearestLoot) g.pickup();
    if (p.hp < 48 && p.meds && !p.heal) g.heal();
    if (p.heal) {
      g.mouse.aim = false;
      return;
    }
    if (!p.ammo[p.weapon]) g.reload();
    this.think -= dt;
    if (this.think <= 0) {
      this.think = 0.25;
      const live = g.bots.filter((b) => b.alive);
      live.sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
      );
      this.target =
        live.find(
          (b) => Math.hypot(b.x - p.x, b.z - p.z) < 145 && g.lineOfSight(p, b),
        ) || live[0];
    }
    const b = this.target;
    if (!b || !b.alive) {
      this.think = 0;
      return;
    }
    const dx = b.x - p.x,
      dz = b.z - p.z,
      distance = Math.hypot(dx, dz);
    const visible = distance < 145 && g.lineOfSight(p, b);
    let yaw = Math.atan2(-dx, -dz);
    if (visible) {
      const desired = distance > 65 ? 1 : distance < 22 ? 2 : 0;
      if (desired !== p.weapon && !p.reload) g.switchWeapon(desired);
      p.crouched = distance > 55 && !p.reload;
      const aimHeight = p.weapon === 1 ? 1.78 : 1.15;
      const pitch =
        Math.atan2(
          b.y + aimHeight - (p.y + (p.crouched ? 1.12 : 1.7)),
          distance,
        ) -
        g.recoil * 0.4;
      p.pitch += (pitch - p.pitch) * (1 - Math.exp(-12 * dt));
      g.mouse.aim = true;
      const error = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
      p.yaw += clamp(error, -1.8 * dt, 1.8 * dt);
      this.wantShoot =
        Math.abs(error) < 0.02 &&
        Math.abs(p.pitch - pitch) < 0.025 &&
        !p.reload;
      if (p.reload && distance < 35) g.keys.add("KeyD");
    } else {
      g.mouse.aim = false;
      p.crouched = false;
      const outside = Math.hypot(p.x, p.z) > g.zone.next * 0.9;
      if (outside) yaw = Math.atan2(p.x, p.z);
      if (
        this.last &&
        Math.hypot(p.x - this.last.x, p.z - this.last.z) < dt * 0.7
      )
        this.stuck += dt;
      else this.stuck = 0;
      if (this.stuck > 0.35) {
        this.detour = 1.2;
        this.detourYaw = p.yaw + Math.PI / 2;
        this.stuck = 0;
      }
      if (this.detour > 0) {
        this.detour -= dt;
        yaw = this.detourYaw;
      }
      // Probe alternate directions before walking into walls or tree trunks.
      for (const offset of [0, 0.55, -0.55, 1.1, -1.1, 1.65, -1.65, Math.PI]) {
        const angle = yaw + offset,
          x = p.x - Math.sin(angle) * 2.8,
          z = p.z - Math.cos(angle) * 2.8;
        if (!g.blocked(x, z, heightAt(x, z))) {
          yaw = angle;
          break;
        }
      }
      const error = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
      p.yaw += clamp(error, -1.5 * dt, 1.5 * dt);
      p.pitch += (0 - p.pitch) * dt * 3;
      if (Math.abs(error) < 0.7) {
        g.keys.add("KeyW");
        g.keys.add("ShiftLeft");
      }
    }
    this.last = { x: p.x, z: p.z };
  }
}
