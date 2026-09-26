import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);
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
