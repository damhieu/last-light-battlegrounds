import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";
import { resolve } from "node:path";
import { writeServiceWorker } from "./scripts/pwa.js";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);
let isBuild = false;
const buildInfo = {
  version: pkg.version,
  author: "Đàm Mạnh Hiếu",
  builtAt: new Date().toISOString(),
  timeZone: "Asia/Ho_Chi_Minh",
  commit: process.env.GITHUB_SHA || null,
};

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  define: { __BUILD_INFO__: JSON.stringify(buildInfo) },
  plugins: [
    {
      name: "last-light-build-info",
      configResolved(config) {
        isBuild = config.command === "build";
      },
      closeBundle() {
        if (!isBuild) return;
        writeServiceWorker(
          resolve("dist"),
          process.env.BASE_PATH || "/",
          buildInfo.builtAt,
        );
      },
      configureServer(server) {
        // Local capture only: explicit dev flag, same-origin request, fixed output path.
        if (process.env.RECORD_DEMO !== "1") return;
        server.middlewares.use("/__recording", (req, res) => {
          if (
            req.method !== "POST" ||
            req.headers.origin !== `http://${req.headers.host}`
          ) {
            res.statusCode = 403;
            res.end();
            return;
          }
          let size = 0;
          const chunks = [];
          req.on("data", (chunk) => {
            size += chunk.length;
            if (size > 160 * 1024 * 1024) {
              req.destroy();
              return;
            }
            chunks.push(chunk);
          });
          req.on("end", () => {
            const output = `exports/v${pkg.version}`;
            const params = new URL(req.url, "http://localhost").searchParams;
            mkdirSync(output, { recursive: true });
            writeFileSync(
              resolve(
                output,
                params.has("audio")
                  ? "demo-audio.wav"
                  : params.has("telemetry")
                    ? "demo-telemetry.json"
                    : "demo-source.webm",
              ),
              Buffer.concat(chunks),
            );
            res.end("saved");
          });
        });
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "build-info.json",
          source: JSON.stringify(buildInfo, null, 2) + "\n",
        });
      },
    },
  ],
  build: { chunkSizeWarningLimit: 750 },
  server: { strictPort: true },
});
