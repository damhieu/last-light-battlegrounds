import * as THREE from "three";
import { DemoPilot } from "./demo.js";
import { World } from "./world.js";
import { createSoldier, createWeapon, createLoot } from "./models.js";
import { AudioEngine } from "./audio.js";
import {
  WEAPONS,
  clamp,
  heightAt,
  seeded,
  sphereHit,
  zoneAt,
  applyDamage,
} from "./core.js";
const V = THREE.Vector3;
const BOT_NAMES = [
  "Kestrel",
  "Nomad",
  "Ghost_07",
  "Raven",
  "Sierra",
  "Maverick",
  "Wolfpack",
  "Atlas",
  "Cobalt",
  "Falcon",
  "Drifter",
  "Echo",
  "Viper",
  "Scout",
  "Ash",
  "Rook",
  "Delta",
  "Flint",
  "Havoc",
  "Orion",
  "Talon",
  "Wraith",
  "Hunter",
];
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.camera = new THREE.PerspectiveCamera(
      72,
      innerWidth / innerHeight,
      0.06,
      1800,
    );
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.world = new World(this.scene);
    this.audio = new AudioEngine();
    this.mode = "lobby";
    this.keys = new Set();
    this.mouse = { fire: false, aim: false };
    this.settings = {
      sensitivity: 1,
      volume: 0.55,
      quality: matchMedia("(pointer: coarse)").matches ? "medium" : "high",
      difficulty: "normal",
    };
    try {
      Object.assign(
        this.settings,
        JSON.parse(localStorage.getItem("lastlight-settings") || "{}"),
      );
    } catch {}
    this.audio.setVolume(this.settings.volume);
    this.bots = [];
    this.loot = [];
    this.effects = [];
    this.grenades = [];
    this.time = 0;
    this.elapsed = 0;
    this.frameCount = 0;
    this.fps = 60;
    this.recoil = 0;
    this.flash = 0;
    this.hitTime = 0;
    this.damageTime = 0;
    this.killTime = 0;
    this.player = this.newPlayer();
    this.weaponModels = WEAPONS.map((_, i) => createWeapon(i, true));
    this.weaponRoot = new THREE.Group();
    this.camera.add(this.weaponRoot);
    this.weaponModels.forEach((m) => {
      m.visible = false;
      this.weaponRoot.add(m);
    });
    this.weaponRoot.visible = false;
    this.weaponRoot.scale.setScalar(0.68);
    this.muzzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.21, 7),
      new THREE.MeshBasicMaterial({
        color: 0xffdd84,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      }),
    );
    this.muzzle.rotation.x = -Math.PI / 2;
    this.muzzle.position.set(0, 0.015, -0.85);
    this.weaponRoot.add(this.muzzle);
    this.muzzle.visible = false;
    this.parachute = new THREE.Group();
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x7c8162,
        side: THREE.DoubleSide,
        roughness: 1,
      }),
    );
    canopy.scale.y = 0.36;
    canopy.position.y = 3.8;
    this.parachute.add(canopy);
    for (const x of [-1, 1])
      for (const z of [-1, 1]) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new V(x * 0.45, -0.35, z * 0.2),
            new V(x * 2.1, 3.8, z * 2.1),
          ]),
          new THREE.LineBasicMaterial({ color: 0xbebba2 }),
        );
        this.parachute.add(line);
      }
    this.camera.add(this.parachute);
    this.parachute.visible = false;
    this.lobbySoldier = createSoldier(0);
    this.lobbySoldier.root.position.set(7, 5, 15);
    this.lobbySoldier.root.rotation.y = Math.PI + 0.25;
    this.lobbySoldier.root.scale.setScalar(2);
    this.scene.add(this.lobbySoldier.root);
    this.targetCamera = new V(11, 8.2, 23);
    this.camera.position.copy(this.targetCamera);
    this.camera.lookAt(5.5, 7, 14);
    this.bindInput();
    this.setQuality(this.settings.quality);
    this.last = performance.now();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }
  newPlayer() {
    return {
      x: 7,
      y: 55,
      z: 52,
      yaw: 0,
      pitch: 0,
      vy: 0,
      hp: 100,
      armor: 75,
      stamina: 100,
      kills: 0,
      damage: 0,
      shots: 0,
      hits: 0,
      weapon: 0,
      ammo: WEAPONS.map((w) => w.mag),
      reserve: WEAPONS.map((w) => w.reserve),
      meds: 3,
      grenades: 3,
      reload: 0,
      heal: 0,
      cooldown: 0,
      grounded: false,
      crouched: false,
      speed: 0,
      step: 0,
    };
  }
  emit(type, data) {
    this.onEvent?.(type, data);
  }
  start(training = false, options = {}) {
    this.demo = !!options.demo;
    this.pilot = this.demo ? new DemoPilot(this) : null;
    this.clearMatch();
    this.training = training;
    this.player = this.newPlayer();
    this.time = 0;
    this.zone = zoneAt(0);
    this.rng = seeded(
      options.seed ?? (this.demo ? 260926 : Date.now() % 999999),
    );
    this.mode = training ? "playing" : "drop";
    this.elapsed = 0;
    this.result = null;
    this.waypoint = null;
    this.lobbySoldier.root.visible = false;
    this.world.zone.visible = !training;
    this.weaponRoot.visible = training;
    this.parachute.visible = !training;
    this.weaponModels.forEach((w, i) => (w.visible = i === 0));
    if (training) {
      this.player.y = heightAt(7, 52);
      this.player.grounded = true;
    }
    this.spawnBots();
    this.spawnLoot();
    this.audio.init();
    this.requestLock();
    this.emit("start");
    this.emit(
      "toast",
      training
        ? "KHU LUYỆN TẬP · Bot không bắn trả"
        : "NORTHWATCH · Điều khiển dù bằng W A S D",
    );
  }
  clearMatch() {
    for (const b of this.bots) {
      this.scene.remove(b.model.root);
      b.model.root.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          if (o.material.isMeshBasicMaterial) o.material.dispose();
        }
      });
    }
    for (const l of this.loot) this.disposeLoot(l);
    for (const e of this.effects) this.removeEffect(e);
    for (const g of this.grenades) {
      this.scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
    }
    this.bots = [];
    this.loot = [];
    this.effects = [];
    this.grenades = [];
    this.keys.clear();
    this.mouse.fire = this.mouse.aim = false;
    this.flash =
      this.damageTime =
      this.hitTime =
      this.killTime =
      this.recoil =
        0;
  }
  disposeLoot(l) {
    this.scene.remove(l.mesh);
    l.mesh.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material.isMeshBasicMaterial) o.material.dispose();
      }
    });
  }
  spawnBots() {
    for (let i = 0; i < 23; i++) {
      let x, z;
      for (let k = 0; k < 100; k++) {
        const a = this.rng() * Math.PI * 2,
          r = 45 + this.rng() * 200;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        if (!this.blocked(x, z, heightAt(x, z))) break;
      }
      if (i === 0) {
        x = 7;
        z = 8;
      }
      if (this.training) {
        x = -38 + (i % 8) * 11;
        z = -10 - Math.floor(i / 8) * 28;
        if (this.blocked(x, z, heightAt(x, z))) {
          x += 6;
          z += 9;
        }
      }
      const model = createSoldier(i % 3);
      model.root.position.set(x, heightAt(x, z), z);
      this.scene.add(model.root);
      this.bots.push({
        id: i,
        name: BOT_NAMES[i],
        x,
        z,
        y: heightAt(x, z),
        hp: 100,
        armor: 25,
        alive: true,
        model,
        yaw: this.rng() * 6,
        think: this.rng() * 0.2,
        fire: 2 + this.rng() * 4,
        target: null,
        dx: 0,
        dz: 0,
        speed: 0,
        roam: this.rng() * 6,
        stuck: 0,
        alert: 0,
      });
    }
  }
  blocked(x, z, y) {
    for (const b of this.world.collision.nearby(x, z))
      if (
        x + 0.65 > b.minX &&
        x - 0.65 < b.maxX &&
        z + 0.65 > b.minZ &&
        z - 0.65 < b.maxZ &&
        y + 1.7 > b.minY &&
        y < b.maxY
      )
        return true;
    return false;
  }
  spawnLoot() {
    const types = ["ammo", "med", "armor", "weapon", "grenade"];
    for (let i = 0; i < this.world.lootSpots.length; i++) {
      const spot = this.world.lootSpots[i];
      this.addLoot(spot.x, spot.z, types[i % 5]);
    }
    this.addLoot(8, 46, "ammo");
    this.addLoot(5, 46, "med");
    this.addLoot(10, 47, "armor");
  }
  addLoot(x, z, type) {
    const mesh = createLoot(type);
    mesh.position.set(x, heightAt(x, z) + 0.08, z);
    this.scene.add(mesh);
    this.loot.push({ x, z, type, mesh, active: true });
  }
  requestLock() {
    if (this.demo || matchMedia("(pointer: coarse)").matches) return;
    try {
      const r = this.canvas.requestPointerLock?.();
      r?.catch(() => {
        this.pointerFallback = true;
        this.emit(
          "toast",
          "Giữ chuột phải và kéo để nhìn / ngắm · Phím mũi tên cũng dùng để nhìn",
        );
      });
    } catch {
      this.pointerFallback = true;
      this.emit("toast", "Giữ chuột phải và kéo để nhìn / ngắm");
    }
  }
  bindInput() {
    addEventListener("resize", () => {
      if (this.recordingSize) return;
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    document.addEventListener("pointerlockchange", () => {
      if (
        !document.pointerLockElement &&
        (this.mode === "playing" || this.mode === "drop")
      )
        this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pause();
    });
    addEventListener("blur", () => {
      this.keys.clear();
      this.mouse.fire = this.mouse.aim = false;
      if (this.active) this.pause();
    });
    addEventListener("keydown", (e) => {
      if (
        [
          "Space",
          "Tab",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code) &&
        this.mode !== "lobby"
      )
        e.preventDefault();
      if (e.target.matches("input,select")) return;
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === "Escape") {
        if (this.active) this.pause();
        else if (this.mode === "paused") this.resume();
        return;
      }
      if (!this.active) return;
      if (e.code === "KeyV") this.mouse.aim = !this.mouse.aim;
      if (e.code === "KeyR") this.reload();
      if (e.code === "KeyE") this.pickup();
      if (e.code === "KeyH") this.heal();
      if (e.code === "KeyG") this.throwGrenade();
      if (e.code === "Digit1") this.switchWeapon(0);
      if (e.code === "Digit2") this.switchWeapon(1);
      if (e.code === "Digit3") this.switchWeapon(2);
      if (e.code === "KeyM") this.emit("map");
      if (e.code === "Tab") this.emit("inventory");
      if (e.code === "KeyC") this.player.crouched = !this.player.crouched;
      if (
        e.code === "Space" &&
        this.player.grounded &&
        this.mode === "playing"
      ) {
        this.player.vy = 6.3;
        this.player.grounded = false;
        this.player.heal = 0;
      }
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    this.canvas.addEventListener("click", () => {
      if (this.active && !document.pointerLockElement && !this.pointerFallback)
        this.requestLock();
    });
    addEventListener("mousedown", (e) => {
      if (!this.active || e.target !== this.canvas) return;
      if (e.button === 0) {
        this.mouse.fire = true;
        this.shoot();
      }
      if (e.button === 2) this.mouse.aim = true;
    });
    addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouse.fire = false;
      if (e.button === 2) this.mouse.aim = false;
    });
    addEventListener("contextmenu", (e) => {
      if (this.mode !== "lobby") e.preventDefault();
    });
    addEventListener("mousemove", (e) => {
      if (!this.active) return;
      if (
        document.pointerLockElement !== this.canvas &&
        !(
          this.pointerFallback &&
          e.target === this.canvas &&
          (e.buttons === 1 || e.buttons === 2)
        )
      )
        return;
      const s = 0.0021 * this.settings.sensitivity * (this.mouse.aim ? 0.5 : 1);
      this.player.yaw -= e.movementX * s;
      this.player.pitch = clamp(
        this.player.pitch - e.movementY * s,
        -1.45,
        1.4,
      );
    });
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        if (!this.active) return;
        e.preventDefault();
        this.switchWeapon((this.player.weapon + (e.deltaY > 0 ? 1 : 2)) % 3);
      },
      { passive: false },
    );
  }
  get active() {
    return this.mode === "playing" || this.mode === "drop";
  }
  pause() {
    if (!this.active) return;
    this.previousMode = this.mode;
    this.mode = "paused";
    this.keys.clear();
    this.mouse.fire = this.mouse.aim = false;
    document.exitPointerLock?.();
    this.emit("pause");
  }
  resume() {
    if (this.mode !== "paused") return;
    this.mode = this.previousMode || "playing";
    this.audio.init();
    this.requestLock();
    this.emit("resume");
  }
  lobby() {
    this.demo = false;
    this.pilot = null;
    this.mode = "lobby";
    document.exitPointerLock?.();
    this.clearMatch();
    this.lobbySoldier.root.visible = true;
    this.weaponRoot.visible = false;
    this.world.zone.visible = false;
    this.parachute.visible = false;
    this.emit("lobby");
  }
  setQuality(q) {
    this.settings.quality = q;
    this.renderer.setPixelRatio(
      q === "high"
        ? Math.min(devicePixelRatio, 1.5)
        : q === "medium"
          ? 1
          : 0.75,
    );
    this.renderer.shadowMap.enabled = q !== "low";
    this.world.grass.visible = q !== "low";
  }
  saveSettings() {
    this.audio.setVolume(this.settings.volume);
    try {
      localStorage.setItem("lastlight-settings", JSON.stringify(this.settings));
    } catch {}
  }
  switchWeapon(i) {
    if (this.player.weapon === i) return;
    this.player.weapon = i;
    this.player.reload = 0;
    this.player.heal = 0;
    this.player.cooldown = 0.24;
    this.mouse.aim = false;
    this.weaponModels.forEach((w, j) => (w.visible = i === j));
    this.audio.burst(0.1, 0.09, 1500);
  }
  reload() {
    const p = this.player,
      w = WEAPONS[p.weapon];
    if (
      p.reload ||
      p.ammo[p.weapon] === w.mag ||
      p.reserve[p.weapon] <= 0 ||
      this.mode !== "playing"
    )
      return;
    p.reload = w.reload;
    p.heal = 0;
    this.mouse.aim = false;
    this.audio.reload();
  }
  heal() {
    const p = this.player;
    if (p.heal || p.hp >= 100 || p.meds <= 0 || this.mode !== "playing") {
      if (p.hp >= 100) this.emit("toast", "Máu đã đầy");
      else if (p.meds <= 0) this.emit("toast", "Không còn túi cứu thương");
      return;
    }
    p.heal = 3.5;
    p.reload = 0;
    this.emit("toast", "Đang cứu thương · Đứng yên 3,5 giây");
  }
  pickup() {
    const l = this.nearestLoot,
      p = this.player;
    if (!l) return;
    let msg = "";
    if (l.type === "ammo") {
      p.reserve = p.reserve.map((n, i) => n + (i === 1 ? 10 : 60));
      msg = "+60 đạn súng trường · +10 đạn bắn tỉa";
    }
    if (l.type === "med") {
      p.meds++;
      msg = "+1 túi cứu thương";
    }
    if (l.type === "armor") {
      p.armor = 100;
      msg = "Áo giáp cấp 3 · 100%";
    }
    if (l.type === "weapon") {
      p.reserve[1] += 15;
      p.ammo[1] = 5;
      this.switchWeapon(1);
      msg = "Kar98k · Đã trang bị +15 đạn";
    }
    if (l.type === "grenade") {
      p.grenades += 2;
      msg = "+2 lựu đạn";
    }
    l.active = false;
    this.disposeLoot(l);
    this.nearestLoot = null;
    this.audio.pickup();
    this.emit("toast", msg);
  }
  shoot() {
    const p = this.player,
      w = WEAPONS[p.weapon];
    if (this.mode !== "playing" || p.cooldown > 0 || p.reload > 0 || p.heal > 0)
      return;
    if (p.ammo[p.weapon] <= 0) {
      this.reload();
      return;
    }
    p.ammo[p.weapon]--;
    p.shots++;
    p.cooldown = w.rate;
    this.recoil += w.recoil;
    this.flash = 0.055;
    p.pitch = clamp(p.pitch + w.recoil * 0.27, -1.45, 1.4);
    this.audio.shot(p.weapon);
    const origin = this.camera.position.clone(),
      dir = new V();
    this.camera.getWorldDirection(dir);
    const spread =
      w.spread *
      (this.mouse.aim ? 0.22 : 1) *
      (p.speed > 1 ? 1.6 : 1) *
      (p.crouched ? 0.6 : 1);
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();
    let distance = this.rayTerrain(
        origin,
        dir,
        this.world.collision.ray(origin, dir, w.range),
      ),
      target = null,
      headshot = false;
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const body = sphereHit(
          origin,
          dir,
          new V(bot.x, bot.y + 1.02, bot.z),
          0.48,
        ),
        head = sphereHit(origin, dir, new V(bot.x, bot.y + 1.78, bot.z), 0.23);
      const d = Math.min(body, head);
      if (d < distance) {
        distance = d;
        target = bot;
        headshot = head < body;
      }
    }
    const end = origin.clone().addScaledVector(dir, distance);
    const muzzle = this.camera.localToWorld(new V(0.21, -0.16, -0.8));
    this.tracer(muzzle, end, 0xffe0a0, 0.06);
    if (target) {
      const damage =
        w.damage * (headshot ? 2.35 : 1) * (distance > 120 ? 0.83 : 1);
      p.hits++;
      p.damage += Math.min(target.hp, damage);
      applyDamage(target, damage);
      target.target = p;
      target.alert = 5;
      this.hitTime = 0.17;
      this.audio.hit();
      this.particles(end, headshot ? 0xffd27d : 0xd5c6a0, 7, 2);
      this.emit("hit", headshot);
      if (target.hp <= 0) this.killBot(target, true, headshot);
    } else if (distance < w.range) this.particles(end, 0xcbb991, 5, 1.7);
  }
  rayTerrain(o, d, max) {
    for (let t = 2; t < max; t += 2) {
      const x = o.x + d.x * t,
        z = o.z + d.z * t;
      if (o.y + d.y * t < heightAt(x, z) + 0.1) return t;
    }
    return max;
  }
  lineOfSight(a, b) {
    const o = new V(a.x, a.y + 1.5, a.z),
      end = new V(b.x, b.y + 1.2, b.z),
      dist = o.distanceTo(end),
      d = end.sub(o).normalize();
    return (
      this.world.collision.ray(o, d, dist) >= dist - 0.5 &&
      this.rayTerrain(o, d, dist) >= dist - 2
    );
  }
  killBot(b, player = false, headshot = false) {
    if (!b.alive) return;
    b.alive = false;
    b.hp = 0;
    b.model.root.rotation.z = Math.PI / 2;
    b.model.root.position.y = b.y + 0.25;
    this.addLoot(
      b.x,
      b.z,
      player ? "ammo" : ["med", "ammo", "armor"][b.id % 3],
    );
    if (player) {
      this.player.kills++;
      this.killTime = 3;
      this.audio.kill();
      this.emit("kill", { name: b.name, headshot, kills: this.player.kills });
    }
    this.emit("feed", {
      killer: player ? "BẠN" : b.lastAttacker || "VÒNG BO",
      victim: b.name,
      player,
    });
    if (this.mode === "playing" && this.bots.every((b) => !b.alive))
      this.end(true);
  }
  damagePlayer(amount, source) {
    if (this.mode !== "playing") return;
    applyDamage(this.player, amount);
    this.player.heal = 0;
    this.damageTime = 0.6;
    this.audio.hurt();
    this.emit("damage", source);
    if (this.player.hp <= 0) this.end(false, source);
  }
  throwGrenade() {
    const p = this.player;
    if (!p.grenades || this.mode !== "playing") return;
    p.grenades--;
    p.heal = 0;
    const dir = new V();
    this.camera.getWorldDirection(dir);
    dir.y += 0.24;
    dir.normalize();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x465942 }),
    );
    mesh.position.copy(this.camera.position).addScaledVector(dir, 0.8);
    this.scene.add(mesh);
    this.grenades.push({ mesh, v: dir.multiplyScalar(19), fuse: 2.7 });
    this.audio.burst(0.1, 0.1, 1400);
    this.emit("toast", "Lựu đạn đã ném");
  }
  updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i],
        p = g.mesh.position;
      g.v.y -= 12 * dt;
      const next = this.world.collision.move(
        p,
        g.v.x * dt,
        g.v.z * dt,
        0.15,
        0.2,
      );
      if (Math.abs(next.x - p.x) < Math.abs(g.v.x * dt) * 0.5) g.v.x *= -0.4;
      if (Math.abs(next.z - p.z) < Math.abs(g.v.z * dt) * 0.5) g.v.z *= -0.4;
      p.x = next.x;
      p.z = next.z;
      p.y += g.v.y * dt;
      const floor = heightAt(p.x, p.z) + 0.13;
      if (p.y < floor) {
        p.y = floor;
        g.v.y = Math.abs(g.v.y) * 0.35;
        g.v.x *= 0.75;
        g.v.z *= 0.75;
      }
      g.mesh.rotation.x += dt * 6;
      g.fuse -= dt;
      if (g.fuse <= 0) {
        this.audio.explosion(
          Math.hypot(p.x - this.player.x, p.z - this.player.z),
        );
        this.particles(p, 0xffc176, 40, 10);
        this.particles(p, 0x626254, 25, 6);
        for (const b of this.bots) {
          if (!b.alive) continue;
          const dist = Math.hypot(p.x - b.x, p.z - b.z);
          if (dist < 13 && this.lineOfSight({ x: p.x, y: p.y, z: p.z }, b)) {
            const damage = 155 * (1 - dist / 13);
            applyDamage(b, damage);
            this.player.damage += damage;
            if (b.hp <= 0) this.killBot(b, true);
          }
        }
        const dist = p.distanceTo(
          new V(this.player.x, this.player.y + 0.5, this.player.z),
        );
        if (dist < 12) this.damagePlayer(110 * (1 - dist / 12), "LỰU ĐẠN");
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        g.mesh.material.dispose();
        this.grenades.splice(i, 1);
      }
    }
  }
  tracer(start, end, col, life) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]),
      m = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.75,
        }),
      );
    this.scene.add(m);
    this.effects.push({ mesh: m, life, max: life });
  }
  particles(pos, col, count, speed) {
    const positions = [],
      vel = [];
    for (let i = 0; i < count; i++) {
      positions.push(pos.x, pos.y, pos.z);
      vel.push(
        (Math.random() - 0.5) * speed,
        Math.random() * speed,
        (Math.random() - 0.5) * speed,
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const mesh = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: col,
        size: speed > 5 ? 0.18 : 0.07,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.scene.add(mesh);
    this.effects.push({
      mesh,
      life: speed > 5 ? 1.3 : 0.5,
      max: speed > 5 ? 1.3 : 0.5,
      vel,
    });
  }
  removeEffect(e) {
    this.scene.remove(e.mesh);
    e.mesh.geometry.dispose();
    e.mesh.material.dispose();
  }
  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.removeEffect(e);
        this.effects.splice(i, 1);
        continue;
      }
      e.mesh.material.opacity = e.life / e.max;
      if (e.vel) {
        const p = e.mesh.geometry.attributes.position;
        for (let j = 0; j < p.count; j++) {
          e.vel[j * 3 + 1] -= 9 * dt;
          p.setXYZ(
            j,
            p.getX(j) + e.vel[j * 3] * dt,
            p.getY(j) + e.vel[j * 3 + 1] * dt,
            p.getZ(j) + e.vel[j * 3 + 2] * dt,
          );
        }
        p.needsUpdate = true;
      }
    }
  }
  updatePlayer(dt) {
    const p = this.player;
    let mx = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0),
      mz = (this.keys.has("KeyS") ? 1 : 0) - (this.keys.has("KeyW") ? 1 : 0);
    const len = Math.hypot(mx, mz);
    if (len) {
      mx /= len;
      mz /= len;
    }
    if (this.keys.has("ArrowLeft")) p.yaw += dt * 1.6;
    if (this.keys.has("ArrowRight")) p.yaw -= dt * 1.6;
    if (this.keys.has("ArrowUp")) p.pitch = clamp(p.pitch + dt, -1.45, 1.4);
    if (this.keys.has("ArrowDown")) p.pitch = clamp(p.pitch - dt, -1.45, 1.4);
    if (p.stamina <= 0) p.exhausted = true;
    if (p.stamina >= 25) p.exhausted = false;
    const sprint =
      this.keys.has("ShiftLeft") &&
      !p.exhausted &&
      p.stamina > 0 &&
      !this.mouse.aim &&
      !p.crouched &&
      len > 0 &&
      this.mode === "playing";
    let speed =
      this.mode === "drop"
        ? 9
        : p.crouched
          ? 2.6
          : this.mouse.aim
            ? 3.3
            : sprint
              ? 9
              : 5.2;
    if (p.heal) speed = 0;
    p.speed = speed * len;
    if (sprint) p.stamina = Math.max(0, p.stamina - dt * 17);
    else p.stamina = Math.min(100, p.stamina + dt * 12);
    const dx = (mx * Math.cos(p.yaw) + mz * Math.sin(p.yaw)) * speed * dt,
      dz = (-mx * Math.sin(p.yaw) + mz * Math.cos(p.yaw)) * speed * dt;
    if (this.mode === "drop") {
      p.x += dx;
      p.z += dz;
      const landingHeight = this.world.collision.floor(
        p.x,
        p.z,
        p.y,
        heightAt(p.x, p.z),
      );
      p.y -= (this.keys.has("ShiftLeft") ? 14 : 7) * dt;
      if (p.y <= landingHeight) {
        p.y = landingHeight;
        p.grounded = true;
        this.mode = "playing";
        this.parachute.visible = false;
        this.weaponRoot.visible = true;
        this.audio.burst(0.2, 0.25, 500);
        this.emit("land");
        this.emit("toast", "ĐÃ TIẾP ĐẤT · Tìm trang bị và vào vùng an toàn");
      }
    } else {
      const moved = this.world.collision.move(
        p,
        dx,
        dz,
        0.38,
        p.crouched ? 1.15 : 1.8,
      );
      p.x = moved.x;
      p.z = moved.z;
      const beforeY = p.y;
      p.vy -= 18 * dt;
      p.y += p.vy * dt;
      const ground = this.world.collision.floor(
        p.x,
        p.z,
        beforeY,
        heightAt(p.x, p.z),
      );
      if (p.vy > 0) {
        const ceiling = this.world.collision.ceiling(
          p.x,
          p.z,
          beforeY,
          p.crouched ? 1.15 : 1.8,
        );
        if (p.y + (p.crouched ? 1.15 : 1.8) > ceiling) {
          p.y = ceiling - (p.crouched ? 1.15 : 1.8);
          p.vy = 0;
        }
      }
      if (p.y <= ground) {
        if (!p.grounded && p.vy < -15)
          this.damagePlayer((-p.vy - 15) * 3, "RƠI TỪ TRÊN CAO");
        p.y = ground;
        p.vy = 0;
        p.grounded = true;
      } else {
        p.grounded = false;
      }
      if (len && p.grounded && p.speed > 0) {
        p.step += dt;
        if (p.step > (sprint ? 0.29 : 0.43)) {
          this.audio.step(sprint);
          p.step = 0;
        }
      }
    }
    const radius = Math.hypot(p.x, p.z);
    if (radius > 306) {
      p.x *= 306 / radius;
      p.z *= 306 / radius;
    }
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.reload > 0) {
      p.reload -= dt;
      if (p.reload <= 0) {
        p.reload = 0;
        const n = Math.min(
          WEAPONS[p.weapon].mag - p.ammo[p.weapon],
          p.reserve[p.weapon],
        );
        p.ammo[p.weapon] += n;
        p.reserve[p.weapon] -= n;
        this.audio.burst(0.07, 0.14, 2500);
      }
    }
    if (p.heal > 0) {
      if (len) p.heal = 0;
      else {
        p.heal -= dt;
        if (p.heal <= 0) {
          p.heal = 0;
          p.hp = Math.min(100, p.hp + 70);
          p.meds--;
          this.audio.pickup();
          this.emit("toast", "Cứu thương hoàn tất · +70 HP");
        }
      }
    }
    if (this.mouse.fire && WEAPONS[p.weapon].auto) this.shoot();
    this.nearestLoot = null;
    let distance = 2.8;
    for (const l of this.loot) {
      if (!l.active) continue;
      const d = Math.hypot(l.x - p.x, l.z - p.z);
      if (d < distance && Math.abs(p.y - heightAt(l.x, l.z)) < 2.5) {
        distance = d;
        this.nearestLoot = l;
      }
      l.mesh.children.at(-1).rotation.y += dt;
    }
  }
  updateBots(dt) {
    for (const b of this.bots) {
      if (!b.alive) continue;
      if (!this.training && Math.hypot(b.x, b.z) > this.zone.radius) {
        b.hp -= dt * this.zone.damage;
        if (b.hp <= 0) {
          b.lastAttacker = "VÒNG BO";
          this.killBot(b);
          continue;
        }
      }
      b.avoid = Math.max(0, (b.avoid || 0) - dt);
      b.think -= dt;
      b.fire -= dt;
      b.alert = Math.max(0, b.alert - dt);
      if (b.think <= 0) {
        b.think = 0.18 + this.rng() * 0.1;
        let target = null,
          dist = 95;
        const targets = [this.player, ...this.bots];
        for (const t of targets) {
          if (
            t === b ||
            t.alive === false ||
            t.hp <= 0 ||
            (t === this.player && this.mode === "drop")
          )
            continue;
          const d = Math.hypot(t.x - b.x, t.z - b.z);
          if (d < dist && this.lineOfSight(b, t)) {
            dist = d;
            target = t;
          }
        }
        b.target = target;
        b.dx = b.dz = 0;
        b.speed = 0;
        if (this.training) {
          b.roam += 0.09;
          b.yaw = Math.atan2(b.x - this.player.x, b.z - this.player.z);
        } else if (b.avoid > 0) {
          b.dx = Math.sin(b.roam);
          b.dz = Math.cos(b.roam);
          b.speed = 3.8;
        } else if (Math.hypot(b.x, b.z) > this.zone.next * 0.9) {
          const d = Math.hypot(b.x, b.z);
          b.dx = -b.x / d;
          b.dz = -b.z / d;
          b.speed = 4.4;
        } else if (target) {
          const tx = target.x - b.x,
            tz = target.z - b.z,
            d = Math.hypot(tx, tz);
          b.yaw = Math.atan2(-tx, -tz);
          const side = Math.sin(this.time * 0.7 + b.id) > 0 ? 1 : -1;
          if (d > 32) {
            b.dx = tx / d;
            b.dz = tz / d;
            b.speed = 2.4;
          } else {
            b.dx = (-tz / d) * side;
            b.dz = (tx / d) * side;
            b.speed = 1.9;
          }
        } else {
          if (this.rng() < 0.05) b.roam += (this.rng() - 0.5) * 2;
          b.dx = Math.sin(b.roam);
          b.dz = Math.cos(b.roam);
          b.speed = 1.65;
          b.yaw = Math.atan2(-b.dx, -b.dz);
        }
        if (
          target &&
          !this.training &&
          this.time > 10 &&
          b.fire <= 0 &&
          dist < 85
        ) {
          const diff = this.settings.difficulty,
            interval = diff === "hard" ? 0.7 : diff === "easy" ? 1.6 : 1.1;
          b.fire = interval + this.rng() * 0.7;
          const origin = new V(b.x, b.y + 1.4, b.z),
            end = new V(target.x, target.y + 1.1, target.z);
          this.tracer(origin, end, 0xffc27b, 0.09);
          const pd = Math.hypot(b.x - this.player.x, b.z - this.player.z);
          if (pd < 100)
            this.audio.shot(0, pd, clamp((b.x - this.player.x) / 50, -1, 1));
          let chance = clamp(0.85 - dist * 0.008, 0.12, 0.8);
          if (target === this.player) {
            chance *= diff === "easy" ? 0.45 : diff === "hard" ? 1.05 : 0.7;
            if (this.player.speed > 6) chance *= 0.65;
          }
          if (this.rng() < chance) {
            const damage =
              target === this.player
                ? diff === "hard"
                  ? 16
                  : diff === "easy"
                    ? 7
                    : 11
                : 21;
            if (target === this.player) this.damagePlayer(damage, b.name);
            else {
              target.lastAttacker = b.name;
              applyDamage(target, damage);
              if (target.hp <= 0) this.killBot(target);
            }
          }
        }
      }
      if (b.speed) {
        const prevX = b.x,
          prevZ = b.z;
        const m = this.world.collision.move(
          b,
          b.dx * b.speed * dt,
          b.dz * b.speed * dt,
          0.4,
          1.85,
        );
        b.x = m.x;
        b.z = m.z;
        b.y = heightAt(b.x, b.z);
        if (Math.hypot(b.x - prevX, b.z - prevZ) < b.speed * dt * 0.3) {
          b.stuck += dt;
          if (b.stuck > 0.3) {
            b.roam += 1.8;
            b.avoid = 1.7;
            b.dx = Math.sin(b.roam);
            b.dz = Math.cos(b.roam);
            b.target = null;
            b.stuck = 0;
          }
        } else b.stuck = 0;
      }
      b.model.root.position.set(b.x, b.y, b.z);
      b.model.root.rotation.y = b.yaw;
      b.model.animate(this.time + b.id, b.speed / 4, !!b.target);
    }
  }
  updateCamera(dt) {
    const p = this.player;
    const bob = p.grounded
      ? Math.sin(this.time * (p.speed > 6 ? 15 : 10)) *
        0.026 *
        Math.min(p.speed / 4, 1)
      : 0;
    this.camera.position.set(p.x, p.y + (p.crouched ? 1.12 : 1.7) + bob, p.z);
    this.camera.rotation.set(p.pitch + this.recoil * 0.4, p.yaw, 0, "YXZ");
    const ads = this.mouse.aim && this.mode === "playing" && p.reload <= 0;
    const fov = ads ? (p.weapon === 1 ? 25 : 48) : p.speed > 6 ? 78 : 72;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fov, 12, dt);
    this.camera.updateProjectionMatrix();
    this.recoil = THREE.MathUtils.damp(this.recoil, 0, 13, dt);
    const aimX = ads ? 0 : 0.22,
      aimY = ads ? -0.083 : -0.19;
    this.weaponRoot.position.x = THREE.MathUtils.damp(
      this.weaponRoot.position.x,
      aimX,
      15,
      dt,
    );
    this.weaponRoot.position.y =
      THREE.MathUtils.damp(this.weaponRoot.position.y, aimY, 15, dt) +
      bob * 0.11;
    this.weaponRoot.position.z = -0.61 + this.recoil * 0.7;
    this.weaponRoot.rotation.set(
      -this.recoil * 2 + (p.reload ? Math.sin(p.reload * 3) * 0.25 : 0),
      0,
      p.reload ? -0.5 : p.speed > 6 ? -0.18 : 0,
    );
    this.weaponRoot.visible = this.mode !== "drop" && !(ads && p.weapon === 1);
    this.flash -= dt;
    this.muzzle.visible = this.flash > 0;
    this.muzzle.rotation.z = Math.random() * 6;
  }
  end(win, killer) {
    if (this.mode === "ended") return;
    this.result = {
      win,
      killer,
      kills: this.player.kills,
      rank: win ? 1 : this.bots.filter((b) => b.alive).length + 1,
      time: this.time,
      damage: Math.round(this.player.damage),
      accuracy: this.player.shots
        ? Math.round((this.player.hits / this.player.shots) * 100)
        : 0,
    };
    this.mode = "ended";
    this.mouse.fire = this.mouse.aim = false;
    document.exitPointerLock?.();
    if (!this.testing && !this.demo)
      try {
        const stats = JSON.parse(
          localStorage.getItem("lastlight-stats") ||
            '{"matches":0,"wins":0,"kills":0}',
        );
        stats.matches++;
        stats.wins += win ? 1 : 0;
        stats.kills += this.player.kills;
        localStorage.setItem("lastlight-stats", JSON.stringify(stats));
      } catch {}
    this.emit("end", this.result);
  }
  frame(now) {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.elapsed += dt;
    this.frameCount++;
    this.fps = THREE.MathUtils.lerp(this.fps, 1 / Math.max(dt, 0.001), 0.025);
    if (this.mode === "lobby") {
      const a = this.elapsed * 0.045;
      this.camera.position.set(
        11 + Math.sin(a) * 1.4,
        8.05 + Math.sin(a * 0.7) * 0.12,
        23,
      );
      this.camera.lookAt(5.5, 7, 14);
      this.lobbySoldier.animate(this.elapsed, 0.07);
      this.world.update(this.elapsed, { x: 7, y: 5, z: 15 }, null);
    } else if (this.active && !this.testing) {
      this.advance(dt);
    }
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.(dt);
    this.onRendered?.(now);
    requestAnimationFrame(this.frame);
  }
  advance(dt) {
    this.time += dt;
    const prev = this.zone;
    this.zone = zoneAt(this.time);
    if (!this.training && prev && prev.closing !== this.zone.closing) {
      this.audio.zone();
      this.emit(
        "toast",
        this.zone.closing
          ? "VÒNG BO ĐANG THU HẸP · Vào vùng an toàn"
          : "Vùng an toàn tiếp theo đã xuất hiện",
      );
    }
    this.pilot?.update(dt);
    this.updatePlayer(dt);
    if (this.active) this.updateBots(dt);
    if (this.active) this.updateGrenades(dt);
    if (
      !this.training &&
      this.mode === "playing" &&
      Math.hypot(this.player.x, this.player.z) > this.zone.radius
    )
      this.damagePlayerContinuous(dt * this.zone.damage);
    this.updateCamera(dt);
    if (this.pilot?.wantShoot && this.active) this.shoot();
    this.updateEffects(dt);
    this.hitTime = Math.max(0, this.hitTime - dt);
    this.damageTime = Math.max(0, this.damageTime - dt);
    this.killTime = Math.max(0, this.killTime - dt);
    this.world.update(this.time, this.player, this.training ? null : this.zone);
  }
  damagePlayerContinuous(d) {
    this.player.hp = Math.max(0, this.player.hp - d);
    this.damageTime = 0.25;
    if (this.player.hp <= 0) this.end(false, "VÒNG BO");
  }
  snapshot() {
    return {
      mode: this.mode,
      demo: !!this.demo,
      time: this.time,
      player: { ...this.player },
      bots: this.bots.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        z: b.z,
        hp: b.hp,
        alive: b.alive,
      })),
      zone: this.zone,
      loot: this.loot.filter((l) => l.active).length,
      effects: this.effects.length,
      drawCalls: this.renderer.info.render.calls,
      fps: this.fps,
      result: this.result,
    };
  }
}
