import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export function writeServiceWorker(directory, base, revision) {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  const urls = walk(directory)
    .filter((f) => !f.endsWith("/sw.js"))
    .map((f) => base + f.slice(directory.length + 1));
  urls.push(base);
  const cache = "last-light-" + revision;
  writeFileSync(
    join(directory, "sw.js"),
    `// Generated for ${revision}. A waiting update activates after the game closes.
const CACHE=${JSON.stringify(cache)};
const ROOT=${JSON.stringify(base)};
const FILES=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('last-light-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;
 if(event.request.mode==='navigate') {
   event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match(ROOT+'index.html'))));
 } else if(FILES.includes(url.pathname)) {
   event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname, { ignoreVary: true }).then(hit=>hit||fetch(event.request))));
 }
});
`,
  );
  return urls;
}
