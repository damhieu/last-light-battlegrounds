import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { writeServiceWorker } from "../scripts/pwa.js";

test("GitHub Pages precache remains inside its repo and serves the offline app shell", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lastlight-pwa-"));
  try {
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "index.html"), "game");
    writeFileSync(join(dir, "assets/game-hash.js"), "game");
    const files = writeServiceWorker(dir, "/last-light-battlegrounds/", "test");
    assert(
      files.every((file) => file.startsWith("/last-light-battlegrounds/")),
    );
    const events = {};
    let fetched = false;
    const requests = [];
    const cache = {
      match: async (key) => {
        requests.push(key);
        return "cached game";
      },
      addAll: async (urls) => assert.deepEqual(urls.length, files.length),
    };
    runInNewContext(readFileSync(join(dir, "sw.js"), "utf8"), {
      URL,
      self: {
        location: { origin: "https://example.com" },
        clients: { claim: async () => {} },
        addEventListener: (name, fn) => (events[name] = fn),
      },
      caches: {
        open: async () => cache,
        keys: async () => ["last-light-old"],
        delete: async () => true,
      },
      fetch: async () => {
        fetched = true;
        throw Error("offline");
      },
    });
    let response;
    events.fetch({
      request: {
        url: "https://example.com/last-light-battlegrounds/?from=home",
        method: "GET",
        mode: "navigate",
      },
      respondWith: (p) => (response = p),
    });
    assert.equal(await response, "cached game");
    assert(fetched);
    assert(requests.includes("/last-light-battlegrounds/index.html"));
    events.fetch({
      request: {
        url: "https://example.com/last-light-battlegrounds/assets/game-hash.js?cache=1",
        method: "GET",
        mode: "cors",
      },
      respondWith: (p) => (response = p),
    });
    assert.equal(await response, "cached game");
    assert.equal(
      requests.at(-1),
      "/last-light-battlegrounds/assets/game-hash.js",
    );
    response = null;
    events.fetch({
      request: {
        url: "https://example.com/another-repo/",
        method: "GET",
        mode: "navigate",
      },
      respondWith: (p) => (response = p),
    });
    assert.equal(response, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Home-screen manifest uses portable relative paths and real PNG icons", () => {
  const manifest = JSON.parse(
    readFileSync("public/manifest.webmanifest", "utf8"),
  );
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const data = readFileSync("public/" + icon.src);
    const size = Number(icon.sizes.split("x")[0]);
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
  }
  const apple = readFileSync("public/apple-touch-icon.png");
  assert.equal(apple.readUInt32BE(16), 180);
});
