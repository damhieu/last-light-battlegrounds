import test from "node:test";
import assert from "node:assert/strict";
import { Navigation } from "../src/navigation.js";
import { DemoPilot } from "../src/demo.js";
import { viewportMetrics } from "../src/viewport.js";
import { AudioEngine } from "../src/audio.js";

test("visual viewport follows Safari toolbar, rotation and accidental zoom without cropping", () => {
  assert.deepEqual(
    viewportMetrics(
      { width: 430, height: 740, scale: 1, offsetTop: 42, offsetLeft: 0 },
      430,
      932,
    ),
    { width: 430, height: 740, left: 0, top: 42, scale: 1 },
  );
  assert.deepEqual(
    viewportMetrics(
      { width: 215, height: 400, scale: 2, offsetTop: 60, offsetLeft: 110 },
      430,
      932,
    ),
    { width: 430, height: 800, left: 110, top: 60, scale: 0.5 },
  );
  assert.equal(
    viewportMetrics({ width: 932, height: 360, scale: 1 }, 430, 932).width,
    932,
  );
});

test("navigation leaves a U-shaped dead end instead of cutting walls or orbiting", () => {
  const blocked = (x, z) =>
    (x > 3 && x < 5 && z > -12 && z < 12) ||
    (x > -5 && x < 5 && z > 10 && z < 12) ||
    (x > -5 && x < 5 && z > -12 && z < -10);
  const nav = new Navigation(blocked, 2, 80),
    start = { x: 0, z: 0 },
    goal = { x: 25, z: 0 };
  const route = nav.route(start, goal);
  assert(route.length > 2);
  let previous = start;
  for (const point of route) {
    assert(nav.clear(previous, point));
    previous = point;
  }
  assert(Math.hypot(previous.x - goal.x, previous.z - goal.z) < 3);
  assert(route.some((p) => p.x < 0 && Math.abs(p.z) >= 12));
});

test("a long turn is not marked stuck at 20, 30 or 60 FPS", () => {
  for (const fps of [20, 30, 60]) {
    const p = {
      x: 0,
      y: 5,
      z: 0,
      yaw: 0,
      pitch: 0,
      hp: 100,
      ammo: [30, 5, 25],
      reserve: [150, 30, 150],
      weapon: 0,
      grounded: true,
      hits: 0,
    };
    const g = {
      player: p,
      keys: new Set(),
      mouse: {},
      mode: "playing",
      bots: [{ x: 0, y: 5, z: 80, alive: true }],
      zone: { next: 285 },
      blocked: () => false,
      lineOfSight: () => false,
      reload: () => {},
      switchWeapon: (i) => (p.weapon = i),
    };
    const pilot = new DemoPilot(g);
    for (let t = 0; t < 8; t += 1 / fps) {
      pilot.update(1 / fps);
      if (g.keys.has("KeyW")) {
        p.x -= (Math.sin(p.yaw) * 5.2) / fps;
        p.z -= (Math.cos(p.yaw) * 5.2) / fps;
      }
    }
    assert(p.z > 20, `no forward progress at ${fps} FPS: ${p.z}`);
    assert(Math.abs(p.yaw) < Math.PI * 2);
    assert(pilot.stuck < 0.1);
  }
});

test("Safari unlock requests playback in the gesture and recovers suspended/closed audio", async () => {
  const savedWindow = globalThis.window;
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  let resumes = 0,
    starts = 0,
    contexts = 0;
  const node = () => ({
    gain: { value: 0 },
    connect() {
      return this;
    },
    start() {
      starts++;
    },
  });
  class Context {
    constructor() {
      this.state = "suspended";
      this.sampleRate = 44100;
      this.destination = {};
      contexts++;
    }
    createGain() {
      return node();
    }
    createBuffer(channels, n) {
      return { getChannelData: () => new Float32Array(n) };
    }
    createBufferSource() {
      return node();
    }
    addEventListener() {}
    resume() {
      resumes++;
      this.state = "running";
      return Promise.resolve();
    }
    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }
  }
  try {
    const session = { type: "ambient" };
    globalThis.window = { AudioContext: Context };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { audioSession: session },
    });
    const audio = new AudioEngine();
    const promise = audio.init();
    assert.equal(session.type, "playback");
    assert.equal(resumes, 1);
    assert.equal(starts, 1);
    assert(await promise);
    audio.suspend();
    assert.equal(audio.ctx.state, "suspended");
    assert(await audio.init());
    assert.equal(contexts, 1);
    audio.ctx.state = "closed";
    assert(await audio.init());
    assert.equal(contexts, 2);
    audio.ctx.resume = () => Promise.reject(new Error("NotAllowedError"));
    assert.equal(await audio.init(), false);
  } finally {
    globalThis.window = savedWindow;
    if (navigatorDescriptor)
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
  }
});
