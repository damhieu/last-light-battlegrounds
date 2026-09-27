export class AudioEngine {
  constructor() {
    this.volume = 0.55;
    this.ctx = null;
    this.steps = 0;
  }
  init() {
    // Safari otherwise treats Web Audio as ambient/ringer audio. Playback uses
    // media volume, including when the iPhone Ring/Silent switch is enabled.
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch {}
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return Promise.resolve(false);
        this.ctx = new Context();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
        const n = this.ctx.sampleRate * 2;
        this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
        this.ctx.addEventListener("statechange", () =>
          this.onState?.(this.ctx.state),
        );
      }
      // Both resume and buffer start happen synchronously within the tap. iOS
      // may revoke activation after asynchronous work or an app interruption.
      const context = this.ctx;
      const resumed = context.resume();
      const unlock = context.createBufferSource();
      unlock.buffer = context.createBuffer(1, 1, context.sampleRate);
      unlock.connect(this.master);
      unlock.start(0);
      return Promise.resolve(resumed)
        .then(() => {
          this.onState?.(context.state);
          return context.state === "running";
        })
        .catch(() => {
          this.onState?.(context.state);
          return false;
        });
    } catch {
      this.onState?.("unavailable");
      return Promise.resolve(false);
    }
  }
  suspend() {
    if (this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
  }
  test() {
    return this.init().then((ready) => {
      if (ready) {
        this.tone(523, 0.16, 0.2);
        setTimeout(() => this.tone(784, 0.22, 0.2), 180);
      }
      return ready;
    });
  }
  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
  tone(freq, dur, vol = 0.15, type = "sine", end = 0) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = this.playbackTime ?? c.currentTime,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (end) o.frequency.exponentialRampToValueAtTime(end, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur);
  }
  burst(duration, volume, frequency = 1600, pan = 0) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = this.playbackTime ?? c.currentTime,
      s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain(),
      p = c.createStereoPanner();
    s.buffer = this.noise;
    f.type = "lowpass";
    f.frequency.setValueAtTime(frequency, t);
    f.frequency.exponentialRampToValueAtTime(120, t + duration);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    p.pan.value = pan;
    s.connect(f).connect(g).connect(p).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + duration);
  }
  shot(type = 0, distance = 0, pan = 0) {
    const v = 1 / (1 + distance * 0.065);
    this.burst(
      type === 1 ? 0.42 : 0.2,
      0.45 * v,
      type === 1 ? 2800 : 1800,
      pan,
    );
    this.tone(type === 1 ? 95 : 150, 0.13, 0.24 * v, "triangle", 35);
  }
  step(sprint = false) {
    this.burst(0.075, sprint ? 0.12 : 0.065, 500 + Math.random() * 400);
  }
  hit() {
    this.tone(700, 0.06, 0.15, "triangle", 180);
  }
  kill() {
    this.tone(500, 0.14, 0.13, "sine", 850);
    setTimeout(() => this.tone(950, 0.18, 0.09), 100);
  }
  pickup() {
    this.tone(700, 0.09, 0.1);
    setTimeout(() => this.tone(1100, 0.15, 0.07), 75);
  }
  reload() {
    this.burst(0.12, 0.15, 3500);
    setTimeout(() => this.burst(0.08, 0.16, 2200), 650);
  }
  hurt() {
    this.burst(0.2, 0.26, 650);
    this.tone(55, 0.2, 0.13);
  }
  explosion(distance = 0) {
    this.burst(1.1, 0.85 / (1 + distance * 0.03), 1900);
    this.tone(65, 0.6, 0.5 / (1 + distance * 0.03), "sine", 22);
  }
  zone() {
    this.tone(330, 0.45, 0.08);
    setTimeout(() => this.tone(260, 0.5, 0.06), 500);
  }
}
