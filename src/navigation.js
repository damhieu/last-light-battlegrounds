import { heightAt } from "./core.js";

// Static navigation grid: each edge is checked along its entire length, not just
// at the destination. This prevents paths cutting through thin walls/corners.
export class Navigation {
  constructor(blocked, step = 3, limit = 303) {
    this.blocked = blocked;
    this.step = step;
    this.limit = limit;
    this.size = Math.floor((limit * 2) / step) + 1;
    this.free = new Map();
    this.edges = new Map();
  }
  point(id) {
    return {
      x: (id % this.size) * this.step - this.limit,
      z: Math.floor(id / this.size) * this.step - this.limit,
    };
  }
  id(p) {
    const x = Math.max(
        0,
        Math.min(this.size - 1, Math.round((p.x + this.limit) / this.step)),
      ),
      z = Math.max(
        0,
        Math.min(this.size - 1, Math.round((p.z + this.limit) / this.step)),
      );
    return z * this.size + x;
  }
  open(id) {
    if (!this.free.has(id)) {
      const p = this.point(id);
      this.free.set(
        id,
        Math.hypot(p.x, p.z) < this.limit &&
          !this.blocked(p.x, p.z, heightAt(p.x, p.z)),
      );
    }
    return this.free.get(id);
  }
  clear(a, b) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5));
    for (let i = 1; i <= n; i++) {
      const x = a.x + ((b.x - a.x) * i) / n,
        z = a.z + ((b.z - a.z) * i) / n;
      if (this.blocked(x, z, heightAt(x, z))) return false;
    }
    return true;
  }
  edge(a, b) {
    const key = Math.min(a, b) * this.size * this.size + Math.max(a, b);
    if (!this.edges.has(key))
      this.edges.set(
        key,
        this.open(b) && this.clear(this.point(a), this.point(b)),
      );
    return this.edges.get(key);
  }
  nearest(p, reachable = false) {
    const center = this.id(p),
      cx = center % this.size,
      cz = Math.floor(center / this.size);
    let best = null,
      distance = Infinity;
    for (let z = -3; z <= 3; z++)
      for (let x = -3; x <= 3; x++) {
        if (
          cx + x < 0 ||
          cx + x >= this.size ||
          cz + z < 0 ||
          cz + z >= this.size
        )
          continue;
        const id = (cz + z) * this.size + cx + x,
          q = this.point(id),
          d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < distance && this.open(id) && (!reachable || this.clear(p, q))) {
          best = id;
          distance = d;
        }
      }
    return best;
  }
  route(start, goal) {
    if (this.clear(start, goal)) return [{ x: goal.x, z: goal.z }];
    const from = this.nearest(start, true),
      to = this.nearest(goal);
    if (from === null || to === null) return [];
    const end = this.point(to),
      heap = [],
      cost = new Map([[from, 0]]),
      parent = new Map(),
      closed = new Set();
    const score = (id) => {
      const p = this.point(id);
      return Math.hypot(p.x - end.x, p.z - end.z);
    };
    const push = (id, value) => {
      let i = heap.length;
      heap.push({ id, value });
      while (i) {
        const j = (i - 1) >> 1;
        if (heap[j].value <= value) break;
        heap[i] = heap[j];
        i = j;
      }
      heap[i] = { id, value };
    };
    const pop = () => {
      const first = heap[0],
        last = heap.pop();
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let j = i * 2 + 1;
          if (j + 1 < heap.length && heap[j + 1].value < heap[j].value) j++;
          if (heap[j].value >= last.value) break;
          heap[i] = heap[j];
          i = j;
        }
        heap[i] = last;
      }
      return first.id;
    };
    let best = from;
    push(from, score(from));
    while (heap.length && closed.size < 16000) {
      const id = pop();
      if (closed.has(id)) continue;
      closed.add(id);
      if (score(id) < score(best)) best = id;
      if (id === to) break;
      const x = id % this.size,
        z = Math.floor(id / this.size);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        if (
          x + dx < 0 ||
          x + dx >= this.size ||
          z + dz < 0 ||
          z + dz >= this.size
        )
          continue;
        const next = id + dz * this.size + dx;
        if (closed.has(next) || !this.edge(id, next)) continue;
        const value = cost.get(id) + Math.hypot(dx, dz) * this.step;
        if (value < (cost.get(next) ?? Infinity)) {
          cost.set(next, value);
          parent.set(next, id);
          push(next, value + score(next));
        }
      }
    }
    const path = [];
    for (let id = best; id !== undefined; id = parent.get(id)) {
      path.push(this.point(id));
      if (id === from) break;
    }
    path.reverse();
    // Keep turns that are necessary for clearance; skip redundant grid nodes.
    const smooth = [];
    let anchor = start;
    for (let i = 0; i < path.length;) {
      let next = i;
      while (next + 1 < path.length && this.clear(anchor, path[next + 1]))
        next++;
      smooth.push(path[next]);
      anchor = path[next];
      i = next + 1;
    }
    return smooth;
  }
}
