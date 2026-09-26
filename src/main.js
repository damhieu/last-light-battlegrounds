import "./style.css";
import { Game } from "./game.js";
import { UI } from "./ui.js";
import { installMobile } from "./mobile.js";
const root = document.querySelector("#ui");
try {
  const game = new Game(document.querySelector("#game-canvas"));
  const ui = new UI(game, root);
  installMobile(game, ui);
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("record")
  ) {
    import("./recorder.js").then((m) => m.installRecorder(game, ui));
  }
  // Read-only diagnostics are also useful for reproducible browser checks.
  window.getGameState = () => game.snapshot();
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("test")) {
    window.__game = game;
    import("../tests/browser.js").then((m) => m.installBrowserChecks(game));
  }
  console.info("LAST LIGHT ready — 24 combatants / Northwatch Island");
} catch (error) {
  console.error(error);
  root.innerHTML = `<div style="pointer-events:auto;position:absolute;inset:0;display:grid;place-items:center;background:#142124;color:#eeeade;font-family:Arial;padding:30px"><div><h1 style="font-size:40px">LAST LIGHT</h1><p>Trình duyệt chưa khởi tạo được đồ họa 3D.</p><p>Hãy bật tăng tốc phần cứng và dùng Chrome, Edge hoặc Safari mới, rồi tải lại trang.</p><button onclick="location.reload()" style="background:#efbd69;color:#142124;padding:14px 24px">THỬ LẠI</button></div></div>`;
}
