import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { heightAt, seeded, CollisionWorld } from "./core.js";
const rand = seeded(8127);
const color = new THREE.Color();
export class World {
  constructor(scene) {
    this.scene = scene;
    this.collision = new CollisionWorld();
    this.buildings = [];
    this.lootSpots = [];
    this.static = [];
    this.materials = {};
    this.time = 0;
    this.makeMaterials();
    this.makeSky();
    this.makeTerrain();
    this.makeVillage();
    this.makeNature();
    this.makeProps();
    this.bake();
    this.makeZone();
  }
  mat(name, c, extra = {}) {
    const m = new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.88,
      ...extra,
    });
    this.materials[name] = m;
    return m;
  }
  makeMaterials() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "#b4ae9b";
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 5000; i++) {
      x.fillStyle = `rgba(${rand() > 0.5 ? "40,36,22" : "255,249,213"},${rand() * 0.12})`;
      x.fillRect(rand() * 128, rand() * 128, rand() * 3 + 1, rand() * 3 + 1);
    }
    const texture = new THREE.CanvasTexture(c);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.mat("plaster", 0xc9c4aa, { map: texture });
    this.mat("blue", 0x577773, { map: texture });
    this.mat("red", 0x97604d, { map: texture });
    this.mat("roof", 0x624a3c);
    this.mat("roofBlue", 0x374a4b);
    this.mat("trim", 0xd9ccac);
    this.mat("wood", 0x66503a);
    this.mat("metal", 0x404b48, { metalness: 0.55, roughness: 0.6 });
    this.mat("dark", 0x1e2b2b);
    this.mat("glass", 0x739994, { metalness: 0.6, roughness: 0.25 });
    this.mat("road", 0x797363);
    this.mat("line", 0xcac2a0);
    this.mat("crate", 0x687056);
    this.mat("sandbag", 0xa89e70);
    this.mat("rubber", 0x262c2a);
    this.mat("car", 0x708076, { metalness: 0.6, roughness: 0.4 });
    this.mat("rust", 0x9b5540);
  }
  mesh(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(
      geo,
      typeof mat === "string" ? this.materials[mat] : mat,
    );
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    this.static.push(m);
    return m;
  }
  box(mat, x, y, z, w, h, d, ry = 0, solid = false) {
    const m = this.mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, 0, ry, 0);
    if (solid) {
      const aw = Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d,
        ad = Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d;
      this.collision.add(x, z, aw, ad, y - h / 2, h);
    }
    return m;
  }
  makeSky() {
    this.scene.fog = new THREE.FogExp2(0xb4c3bd, 0.003);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1700, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color("#648c9c") },
          bottom: { value: new THREE.Color("#e1d8bc") },
        },
        vertexShader:
          "varying vec3 v; void main(){v=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){float h=normalize(v).y;vec3 c=mix(bottom,top,pow(max(h,0.),.48));float sun=pow(max(dot(normalize(v),normalize(vec3(-.7,.36,-.55))),0.),650.);c+=vec3(1.,.8,.48)*sun*1.5;gl_FragColor=vec4(c,1.);}",
      }),
    );
    this.scene.add(sky);
    this.scene.add(new THREE.HemisphereLight(0xd4e4ed, 0x7e8060, 2.2));
    const sun = new THREE.DirectionalLight(0xffe1a0, 3.1);
    sun.position.set(-120, 180, -100);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -65,
      right: 65,
      top: 65,
      bottom: -65,
      near: 1,
      far: 420,
    });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 128;
    const ctx = cv.getContext("2d");
    for (let i = 0; i < 30; i++) {
      const cx = 45 + rand() * 170,
        cy = 40 + rand() * 45,
        r = 20 + rand() * 40;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(255,251,235,.24)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
    }
    const map = new THREE.CanvasTexture(cv);
    for (let i = 0; i < 25; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map,
          transparent: true,
          depthWrite: false,
          opacity: 0.28 + rand() * 0.25,
          fog: false,
        }),
      );
      const a = rand() * Math.PI * 2;
      s.position.set(Math.cos(a) * 650, 100 + rand() * 100, Math.sin(a) * 650);
      s.scale.set(160 + rand() * 200, 60 + rand() * 80, 1);
      this.scene.add(s);
    }
  }
  makeTerrain() {
    const geo = new THREE.PlaneGeometry(760, 760, 200, 200);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position,
      colors = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        h = heightAt(x, z);
      p.setY(i, h);
      const n = rand() * 0.07;
      const c = h < 1 ? new THREE.Color(0xb8ac85) : new THREE.Color(0x777c4e);
      c.lerp(
        new THREE.Color(0x9a9864),
        0.5 + 0.5 * Math.sin(x * 0.041) * Math.sin(z * 0.033),
      );
      c.multiplyScalar(0.91 + n);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const tc = document.createElement("canvas");
    tc.width = tc.height = 128;
    const ctx = tc.getContext("2d");
    ctx.fillStyle = "#aaa994";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 16000; i++) {
      const v = 90 + rand() * 110;
      ctx.fillStyle = `rgba(${v},${v},${v * 0.9},.18)`;
      ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 2, 1 + rand() * 2);
    }
    const tex = new THREE.CanvasTexture(tc);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(150, 150);
    tex.colorSpace = THREE.SRGBColorSpace;
    const terrain = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: tex,
        roughness: 1,
      }),
    );
    terrain.receiveShadow = true;
    this.scene.add(terrain);
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          time: { value: 0 },
          fogColor: { value: new THREE.Color(0xb4c3bd) },
        },
        vertexShader:
          "varying vec3 v;void main(){v=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 v;uniform float time;uniform vec3 fogColor;void main(){float w=sin(v.x*.21+time)*sin(v.z*.17+time*.7)*.5+.5;vec3 c=mix(vec3(.12,.30,.34),vec3(.31,.49,.47),w*.28);float d=length(cameraPosition-v);c=mix(c,fogColor,1.-exp(-d*.0017));gl_FragColor=vec4(c,1.);}",
      }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -0.7;
    this.scene.add(this.water);
    // Two roads cross the settlement; the outlying roads follow the ground.
    for (const axis of [0, 1])
      for (let i = -220; i < 225; i += 5) {
        const x = axis === 0 ? i : 0,
          z = axis === 1 ? i : 0,
          y = heightAt(x, z) + 0.035;
        this.box(
          "road",
          x,
          y,
          z,
          axis === 0 ? 5.1 : 7,
          0.04,
          axis === 1 ? 5.1 : 7,
        );
        if (i % 15 === 0)
          this.box(
            "line",
            x,
            y + 0.035,
            z,
            axis === 0 ? 2.7 : 0.15,
            0.015,
            axis === 1 ? 2.7 : 0.15,
          );
      }
  }
  building(x, z, w, d, style = 0) {
    const h = 4.4,
      y = heightAt(x, z),
      m = ["plaster", "blue", "red"][style % 3],
      door = 2.15;
    this.buildings.push({ x, z, w, d, style });
    this.box("dark", x, y + 0.018, z, w, 0.035, d);
    // Open doorway and real window openings, so both sight and projectiles agree with the geometry.
    this.box(m, x, y + h / 2, z - d / 2, w, h, 0.35, 0, true);
    this.box(m, x - w / 2, y + h / 2, z, 0.35, h, d, 0, true);
    this.box(m, x + w / 2, y + h / 2, z, 0.35, h, d, 0, true);
    for (const s of [-1, 1]) {
      const cx = x + (s * (w + door)) / 4,
        sw = (w - door) / 2;
      this.box(m, cx, y + 0.62, z + d / 2, sw, 1.24, 0.35, 0, true);
      this.box(m, cx, y + 3.8, z + d / 2, sw, 1.2, 0.35, 0, true);
      const ww = 1.6,
        side = (sw - ww) / 2;
      for (const k of [-1, 1])
        this.box(
          m,
          cx + (k * (ww + side)) / 2,
          y + 2.21,
          z + d / 2,
          side,
          1.96,
          0.35,
          0,
          true,
        );
      this.box("trim", cx, y + 1.3, z + d / 2 + 0.16, ww + 0.2, 0.13, 0.4);
      this.box("trim", cx, y + 3.2, z + d / 2 + 0.16, ww + 0.2, 0.13, 0.4);
      this.box("wood", cx, y + 2.25, z + d / 2 + 0.2, 0.055, 1.85, 0.08);
    }
    this.box(m, x, y + 3.8, z + d / 2, door, 1.2, 0.35, 0, true);
    this.box("trim", x, y + h + 0.1, z, w + 0.5, 0.25, d + 0.6);
    this.collision.add(x, z, w, d, y + h - 0.1, 0.25);
    this.collision.roofs.push({
      x,
      z,
      w: w + 1,
      d: d + 1,
      y: y + h + 0.25,
      rise: 2.15,
    });
    // Pitched roof with ridge cap.
    const rise = 2.15,
      ang = Math.atan2(rise, d / 2 + 0.5),
      length = Math.hypot(d / 2 + 0.5, rise);
    for (const s of [-1, 1]) {
      const mroof = this.box(
        style === 1 ? "roofBlue" : "roof",
        x,
        y + h + rise / 2 + 0.23,
        z + s * (d / 4 + 0.25),
        w + 1,
        0.18,
        length,
      );
      mroof.rotation.x = s * ang;
    }
    this.box("roof", x, y + h + rise + 0.25, z, w + 1, 0.12, 0.18);
    const tri = new THREE.Shape();
    tri.moveTo(-d / 2, 0);
    tri.lineTo(d / 2, 0);
    tri.lineTo(0, rise);
    tri.closePath();
    for (const s of [-1, 1]) {
      const wall = this.mesh(
        new THREE.ShapeGeometry(tri),
        m,
        x + (s * w) / 2,
        y + h,
        z,
        0,
        (s * Math.PI) / 2,
      );
      wall.material = this.materials[m];
      wall.material.side = THREE.DoubleSide;
    }
    this.box("plaster", x - w * 0.25, y + h + 1.3, z - d * 0.17, 0.7, 2.6, 0.7);
    // Interior furnishings and supplies.
    this.box("wood", x + w * 0.25, y + 0.75, z - d * 0.2, 2, 0.15, 1);
    for (const a of [-0.8, 0.8])
      for (const b of [-0.35, 0.35])
        this.box(
          "wood",
          x + w * 0.25 + a,
          y + 0.35,
          z - d * 0.2 + b,
          0.12,
          0.7,
          0.12,
        );
    this.box("crate", x - w * 0.3, y + 0.5, z - d * 0.22, 1, 1, 1, 0, true);
    this.lootSpots.push(
      { x: x - 0.8, z: z + 1.2 },
      { x: x + w * 0.25, z: z - d * 0.2 },
    );
  }
  makeVillage() {
    for (const [x, z, w, d, s] of [
      [-17, -20, 12, 10, 0],
      [19, -22, 14, 11, 1],
      [-20, 20, 12, 12, 2],
      [20, 19, 13, 10, 0],
      [-44, -19, 13, 10, 1],
      [45, -24, 11, 12, 2],
      [-46, 22, 14, 10, 0],
      [46, 22, 12, 11, 1],
      [-18, 45, 12, 9, 1],
      [20, 47, 11, 10, 2],
    ])
      this.building(x, z, w, d, s);
    for (const [x, z, s] of [
      [100, 85, 1],
      [121, 92, 0],
      [90, 110, 2],
      [-110, 100, 0],
      [-91, 112, 2],
      [-128, 115, 1],
    ])
      this.building(x, z, 12, 10, s);
    // Low stone walls provide cover while preserving open alleys.
    for (const [x, z, w, d] of [
      [-34, 7, 13, 0.65],
      [36, 7, 14, 0.65],
      [-35, -36, 30, 0.7],
      [34, 35, 20, 0.7],
      [-60, 19, 0.7, 18],
      [62, -21, 0.7, 18],
    ]) {
      const y = heightAt(x, z);
      this.box("plaster", x, y + 0.65, z, w, 1.3, d, 0, true);
      this.box("trim", x, y + 1.32, z, w + 0.1, 0.15, d + 0.1);
    }
    // Industrial shipping yard.
    for (let i = 0; i < 9; i++) {
      const x = 90 + (i % 3) * 9,
        z = -72 - Math.floor(i / 3) * 8,
        y = heightAt(x, z),
        mat = i % 2 ? "rust" : "blue";
      this.box(mat, x, y + 1.4, z, 6, 2.8, 4, 0, true);
      for (let k = -2.8; k < 3; k += 0.55)
        this.box("metal", x + k, y + 1.4, z + 2.03, 0.045, 2.6, 0.06);
      this.lootSpots.push({ x: x + 3.7, z });
    }
    // A water tower visible above the town.
    const tx = -58,
      tz = -50,
      ty = heightAt(tx, tz);
    for (const a of [-2, 2])
      for (const b of [-2, 2])
        this.box("metal", tx + a, ty + 5, tz + b, 0.25, 10, 0.25, 0, true);
    this.mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 4, 16),
      "trim",
      tx,
      ty + 11,
      tz,
    );
    this.mesh(
      new THREE.ConeGeometry(3.5, 1.2, 16),
      "roofBlue",
      tx,
      ty + 13.6,
      tz,
    );
    // Roadside utility poles and sagging wires.
    for (let i = -140; i <= 150; i += 30) {
      const y = heightAt(i, 6);
      this.box("wood", i, y + 4.4, 6, 0.25, 8.8, 0.25);
      this.box("wood", i, y + 8.1, 6, 0.18, 0.2, 3);
      if (i < 150)
        for (const dz of [-1, 1]) {
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(i, y + 8.2, 6 + dz),
            new THREE.Vector3(i + 15, y + 6.5, 6 + dz),
            new THREE.Vector3(i + 30, heightAt(i + 30, 6) + 8.2, 6 + dz),
          );
          this.mesh(
            new THREE.TubeGeometry(curve, 12, 0.022, 3),
            "dark",
            0,
            0,
            0,
          );
        }
    }
    this.sign(-7, 6, "NORTHWATCH", "TOWN / 04");
    this.sign(73, -67, "RESTRICTED", "MILITARY STORAGE");
  }
  sign(x, z, title, subtitle) {
    const y = heightAt(x, z);
    this.box("metal", x, y + 1.3, z, 0.12, 2.6, 0.12);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 192;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#304645";
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = "#c3c7a9";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 176);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e0dfc4";
    ctx.font = "bold 45px sans-serif";
    ctx.fillText(title, 256, 83);
    ctx.font = "22px monospace";
    ctx.fillText(subtitle, 256, 137);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(3.7, 1.4),
      new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    m.position.set(x, y + 2.7, z);
    this.scene.add(m);
  }
  makeNature() {
    const trunkMat = this.mat("trunk", 0x615746),
      leafMat = this.mat("leaf", 0x465f43),
      rockMat = this.mat("rock", 0x86877b);
    const treePositions = [];
    for (let i = 0; i < 670; i++) {
      const x = (rand() - 0.5) * 580,
        z = (rand() - 0.5) * 580;
      if (
        Math.hypot(x, z) > 282 ||
        heightAt(x, z) < 2 ||
        Math.abs(x) < 10 ||
        Math.abs(z) < 10 ||
        this.buildings.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + 7 && Math.abs(z - b.z) < b.d / 2 + 7,
        ) ||
        (x > 75 && x < 122 && z < -58 && z > -98)
      )
        continue;
      treePositions.push({ x, z, y: heightAt(x, z), s: 0.7 + rand() * 0.7 });
    }
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.15, 0.3, 6, 6),
      trunkMat,
      treePositions.length,
    );
    const leaves = new THREE.InstancedMesh(
      new THREE.ConeGeometry(3.1, 5.3, 9),
      leafMat,
      treePositions.length * 3,
    );
    const dummy = new THREE.Object3D();
    treePositions.forEach((p, i) => {
      dummy.position.set(p.x, p.y + 3 * p.s, p.z);
      dummy.scale.setScalar(p.s);
      dummy.rotation.set(0, rand() * 6, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      for (let j = 0; j < 3; j++) {
        dummy.position.y = p.y + (4.5 + j * 1.8) * p.s;
        dummy.scale.set(
          p.s * (1 - j * 0.2),
          p.s * (1 - j * 0.13),
          p.s * (1 - j * 0.2),
        );
        dummy.updateMatrix();
        leaves.setMatrixAt(i * 3 + j, dummy.matrix);
        color.setHSL(
          0.24 + rand() * 0.04,
          0.17 + rand() * 0.1,
          0.24 + rand() * 0.09,
        );
        leaves.setColorAt(i * 3 + j, color);
      }
      this.collision.add(p.x, p.z, 0.55 * p.s, 0.55 * p.s, p.y, 7 * p.s);
    });
    trunks.castShadow = leaves.castShadow = true;
    trunks.receiveShadow = leaves.receiveShadow = true;
    this.scene.add(trunks, leaves);
    const rocks = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      rockMat,
      170,
    );
    for (let i = 0; i < 170; i++) {
      let x, z;
      do {
        x = (rand() - 0.5) * 560;
        z = (rand() - 0.5) * 560;
      } while (Math.abs(x) < 72 && Math.abs(z) < 72);
      const s = 1 + rand() * 3,
        y = heightAt(x, z);
      dummy.position.set(x, y + s * 0.3, z);
      dummy.rotation.set(rand(), rand() * 6, rand());
      dummy.scale.set(s, s * 0.7, s * 0.8);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      rocks.setColorAt(
        i,
        new THREE.Color().setHSL(0.12, 0.07, 0.44 + rand() * 0.15),
      );
      this.collision.add(x, z, s * 1.4, s * 1.4, y, s * 1.1);
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.scene.add(rocks);
    const grassGeo = new THREE.BufferGeometry();
    grassGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -0.1, 0, 0, 0.1, 0, 0, 0.025, 0.58, 0, 0, 0, -0.1, 0, 0, 0.1, 0, 0.4,
          0.01,
        ],
        3,
      ),
    );
    grassGeo.computeVertexNormals();
    const grass = new THREE.InstancedMesh(
      grassGeo,
      new THREE.MeshStandardMaterial({
        color: 0x8b9060,
        side: THREE.DoubleSide,
        roughness: 1,
      }),
      11000,
    );
    let count = 0;
    for (let i = 0; i < 17000 && count < 11000; i++) {
      const x = (rand() - 0.5) * 550,
        z = (rand() - 0.5) * 550,
        y = heightAt(x, z);
      if (
        y < 2 ||
        Math.abs(x) < 5 ||
        Math.abs(z) < 5 ||
        this.buildings.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + 1 && Math.abs(z - b.z) < b.d / 2 + 1,
        )
      )
        continue;
      dummy.position.set(x, y - 0.06, z);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.setScalar(0.6 + rand() * 1.3);
      dummy.updateMatrix();
      grass.setMatrixAt(count++, dummy.matrix);
    }
    grass.count = count;
    grass.receiveShadow = true;
    this.scene.add(grass);
    this.grass = grass;
  }
  makeProps() {
    for (const [x, z] of [
      [-10, -9],
      [32, 10],
      [-32, 43],
      [10, -52],
      [108, 69],
    ])
      this.car(x, z, rand() * 0.4);
    for (let i = 0; i < 50; i++) {
      const a = rand() * Math.PI * 2,
        r = 15 + rand() * 140,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      if (
        Math.abs(x) < 8 ||
        Math.abs(z) < 8 ||
        this.buildings.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + 2 && Math.abs(z - b.z) < b.d / 2 + 2,
        )
      )
        continue;
      const y = heightAt(x, z);
      this.box("crate", x, y + 0.6, z, 1.3, 1.2, 1.3, 0, true);
      for (const s of [-0.45, 0.45])
        this.box("metal", x + s, y + 0.61, z, 0.06, 1.23, 1.32);
      this.lootSpots.push({ x: x + 1.8, z });
    }
    for (const [x, z] of [
      [-8, 31],
      [8, -33],
      [68, -70],
      [104, 62],
    ]) {
      const y = heightAt(x, z);
      for (let i = -2; i <= 2; i++)
        for (let j = 0; j < 2; j++) {
          this.box(
            "sandbag",
            x + i * 0.95 + (j % 2) * 0.35,
            y + 0.22 + j * 0.4,
            z,
            0.92,
            0.42,
            0.6,
            0,
            j === 0,
          );
        }
      this.collision.add(x, z, 5, 0.7, y, 0.85);
    }
  }
  car(x, z, angle) {
    const y = heightAt(x, z);
    this.box("car", x, y + 0.9, z, 2.05, 0.7, 4.2, 0, true);
    this.box("car", x, y + 1.53, z + 0.15, 1.95, 0.75, 2.2);
    this.box("glass", x, y + 1.58, z - 1, 1.75, 0.5, 0.025);
    this.box("glass", x, y + 1.58, z + 1.28, 1.75, 0.5, 0.025);
    for (const s of [-1, 1]) {
      this.box("glass", x + s * 0.99, y + 1.55, z + 0.1, 0.025, 0.48, 1.8);
      for (const dz of [-1.25, 1.3])
        this.mesh(
          new THREE.CylinderGeometry(0.45, 0.45, 0.28, 12),
          "rubber",
          x + s * 1.05,
          y + 0.5,
          z + dz,
          0,
          0,
          Math.PI / 2,
        );
    }
    this.box("metal", x, y + 0.6, z - 2.16, 2.13, 0.16, 0.14);
    for (const s of [-0.7, 0.7])
      this.box("trim", x + s, y + 0.99, z - 2.12, 0.45, 0.25, 0.05);
  }
  bake() {
    const groups = new Map();
    for (const m of this.static) {
      m.updateMatrix();
      const geo = m.geometry.clone().applyMatrix4(m.matrix);
      if (!groups.has(m.material)) groups.set(m.material, []);
      groups.get(m.material).push(geo);
      m.geometry.dispose();
    }
    for (const [mat, geos] of groups) {
      const merged = mergeGeometries(geos);
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      geos.forEach((g) => g.dispose());
    }
    this.static = [];
  }
  makeZone() {
    this.zone = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 100, 120, 1, true),
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: { time: { value: 0 } },
        vertexShader:
          "varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec2 v;uniform float time;void main(){float waves=pow(abs(sin(v.x*420.+sin(v.y*18.+time)*2.)),28.);float scan=pow(abs(sin(v.y*80.-time*2.)),18.);float a=(.08+waves*.2+scan*.08)*(1.-v.y*.65);gl_FragColor=vec4(.24,.56,1.,a);}",
      }),
    );
    this.zone.position.y = 45;
    this.scene.add(this.zone);
    this.zone.visible = false;
  }
  update(time, player, zone) {
    this.water.material.uniforms.time.value = time;
    this.zone.material.uniforms.time.value = time;
    if (zone) {
      this.zone.visible = true;
      this.zone.scale.set(zone.radius, 1, zone.radius);
    }
    if (player) {
      this.sun.position.set(player.x - 90, player.y + 140, player.z - 80);
      this.sun.target.position.set(player.x, 0, player.z);
    }
  }
}
