import { BUILD_INFO, BUILD_TIME_LABEL } from "./build-info.js";
import { WEAPONS, heightAt, clamp } from "./core.js";
const icon = {
  cross:
    '<path d="M12 3v5m0 8v5M3 12h5m8 0h5"/><circle cx="12" cy="12" r="6"/>',
  arrow: '<path d="M5 19 19 5M5 5h14v14"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  gear: '<path d="m9 3-1 3-3 1-2 4 2 3 1 3 4 3 3-1 3 1 4-3 1-3-2-4-3-1-1-3z"/><circle cx="11" cy="12" r="3"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/>',
  med: '<path d="M4 4h16v16H4zM12 7v10M7 12h10"/>',
  chevron: '<path d="m8 4 8 8-8 8"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  bolt: '<path d="m14 2-9 12h6l-1 8 9-13h-6z"/>',
};
const svg = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon[name] || icon.cross}</svg>`;
const time = (t) =>
  `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;
const lootNames = {
  ammo: "ĐẠN TIẾP TẾ",
  med: "TÚI CỨU THƯƠNG",
  armor: "ÁO GIÁP CẤP 3",
  weapon: "KAR98K + ĐẠN",
  grenade: "LỰU ĐẠN ×2",
};
export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.mapOpen = false;
    this.inventoryOpen = false;
    this.feed = [];
    this.lastUI = 0;
    this.lastMap = 0;
    this.toastTimer = 0;
    this.render();
    this.bind();
    this.createMap();
    game.onEvent = (type, data) => this.event(type, data);
    game.onFrame = (dt) => this.update(dt);
  }
  render() {
    this.root.innerHTML = `
 <div class="film-grain"></div><div id="damage-vignette"></div><div id="zone-vignette"></div>
 <section id="lobby" class="lobby">
  <header class="topbar"><a class="brand" href="#" aria-label="Last Light"><span class="brand-mark">L<span>L</span></span><span>LAST LIGHT<small>B A T T L E G R O U N D S</small></span></a><nav><button class="nav-active">CHIẾN TRƯỜNG</button><button data-action="guide">HƯỚNG DẪN</button><button data-action="settings">CÀI ĐẶT</button></nav><div class="build-tag"><i></i> SẴN SÀNG CHIẾN ĐẤU <span>v${BUILD_INFO.version}</span></div></header>
  <div class="lobby-copy"><div class="eyebrow"><span class="small-line"></span> OPERATION NORTHWATCH</div><h1>ONE ISLAND.<br>ONE <em>SURVIVOR.</em></h1><p>Không có cơ hội thứ hai.<br>Nhặt trang bị. Làm chủ chiến trường.<br>Trở thành người sống sót cuối cùng.</p><div class="hero-meta"><span>${svg("cross")} GÓC NHÌN THỨ NHẤT</span><span>${svg("shield")} SOLO SINH TỒN</span></div><button class="text-link" data-action="guide">LÀM QUEN CHIẾN TRƯỜNG <span>↗</span></button><div class="quick-actions"><button id="install-iphone">CÀI TRÊN iPHONE ↗</button><button id="watch-demo">▶ XEM BOT CHƠI</button></div></div>
  <aside class="operator-tag"><span class="tag-line"></span><div><small>OPERATOR / 01</small><strong>THE PATHFINDER</strong><span>Đã sẵn sàng triển khai</span></div><span class="operator-cross">+</span></aside>
  <aside class="intel-card"><div class="card-label"><span>ĐIỂM TRIỂN KHAI</span><span>01 / 01</span></div><div class="intel-map"><canvas id="lobby-map" width="360" height="230" aria-label="Bản đồ đảo Northwatch"></canvas><span class="map-pin"></span><span class="map-coord">43° 17′ N / 16° 28′ E</span></div><h2>NORTHWATCH <span>↗</span></h2><p>Đảo ven biển · Thị trấn · Khu quân sự</p><div class="intel-footer"><span><i></i> HOÀNG HÔN</span><span>640 × 640 m</span></div></aside>
  <footer class="deployment"><div class="match-select"><small>CHẾ ĐỘ CHƠI</small><div class="mode-buttons"><button id="mode-solo" class="selected">SOLO SINH TỒN</button><button id="mode-practice">LUYỆN TẬP</button></div><p id="mode-description">Bạn + 23 bot · Vòng bo thu hẹp · Một người chiến thắng</p></div><div class="loadout-preview"><small>TRANG BỊ KHỞI ĐẦU</small><strong>M416 <span>/</span> Kar98k <span>/</span> UMP45</strong><span>3 cứu thương · 3 lựu đạn · Giáp cấp 2</span></div><button id="deploy" class="deploy-button"><span><small>ĐẢO ĐÃ SẴN SÀNG</small>VÀO CHIẾN TRƯỜNG</span>${svg("arrow")}</button></footer>
  <div class="lobby-bottom"><div class="build-credit" id="build-credit"><span class="designer-credit">Thiết kế bởi <strong>${BUILD_INFO.author}</strong></span><span class="build-details">v${BUILD_INFO.version} · Build: <time datetime="${BUILD_INFO.builtAt}">${BUILD_TIME_LABEL}</time></span></div><span>MỘT GAME BATTLE ROYALE ĐỘC LẬP · LẤY CẢM HỨNG TỪ PUBG</span></div>
 </section>
 <section id="hud" class="hidden">
  <div id="demo-badge" class="hidden">● BOT TỰ CHƠI <button id="stop-demo">VỀ SẢNH ↗</button></div><div class="compass"><div id="compass-ticks"></div><span class="compass-marker">▼</span><b id="heading">N</b></div>
  <div class="match-stats"><span><b id="alive">24</b> CÒN SỐNG</span><span><b id="kills">0</b> HẠ GỤC</span><button id="pause-button" aria-label="Tạm dừng">Ⅱ</button></div>
  <div class="zone-panel"><div class="zone-icon">${svg("shield")}</div><div><small id="zone-title">VÙNG AN TOÀN / 01</small><strong id="zone-time">00:45</strong></div><span id="zone-state">CHUẨN BỊ</span></div><div id="kill-feed"></div>
  <div id="drop-banner"><span>ĐANG TRIỂN KHAI</span><strong>NORTHWATCH</strong><small>W A S D di chuyển dù · SHIFT hạ nhanh</small><b id="altitude">50 m</b></div>
  <div id="crosshair"><i></i><i></i><i></i><i></i><b></b></div><div id="hit-marker">×</div><div id="damage-direction"></div>
  <div id="scope" class="hidden"><div class="scope-glass"><i></i><b></b><span>4× / MIL-DOT</span></div></div>
  <div id="loot-prompt" class="hidden"><kbd>E</kbd><span><small>NHẶT TRANG BỊ</small><b id="loot-name"></b></span></div>
  <div id="action-progress" class="hidden"><span id="action-label"></span><div><i id="action-fill"></i></div></div>
  <div id="kill-notice" class="hidden"><small>ĐÃ LOẠI ĐỐI THỦ</small><strong id="kill-name"></strong><span id="kill-detail"></span></div>
  <div class="player-panel"><div class="player-title">${svg("shield")} <strong>PATHFINDER</strong><span>SOLO / 01</span></div><div class="armor-row"><span id="armor-value">75</span><div><i id="armor-bar"></i></div></div><div class="health-row"><div><i id="health-bar"></i></div><b id="health-value">100</b></div><div class="stamina-track"><i id="stamina-bar"></i></div><div class="supplies"><button id="heal-button" aria-label="Dùng cứu thương"><kbd>H</kbd> ${svg("med")} <b id="meds">3</b></button><button id="grenade-button" aria-label="Ném lựu đạn"><kbd>G</kbd> ◈ <b id="grenades">3</b></button><span id="stance">ĐỨNG</span></div></div>
  <div class="weapon-panel"><div id="weapon-slots"><button class="active" aria-label="Trang bị M416"><kbd>1</kbd> M416</button><button aria-label="Trang bị Kar98k"><kbd>2</kbd> Kar98k</button><button aria-label="Trang bị UMP45"><kbd>3</kbd> UMP45</button></div><div class="weapon-main"><div><small id="weapon-mode">AUTO / 5.56 mm</small><strong id="weapon-name">M416</strong></div><div class="ammo"><b id="ammo">30</b><span>/ <i id="reserve">150</i></span></div></div><div class="weapon-hint"><kbd>R</kbd> THAY ĐẠN <span>·</span> CHUỘT PHẢI NGẮM</div></div>
  <div class="minimap-wrap" id="minimap-open" role="button" tabindex="0" aria-label="Mở bản đồ chiến thuật"><div class="minimap-label"><span>NORTHWATCH</span><kbd>M</kbd></div><canvas id="minimap" width="260" height="260" aria-label="Bản đồ nhỏ với vị trí và vòng bo"></canvas><div class="map-distance" id="map-distance">TRONG VÙNG AN TOÀN</div></div>
  <div class="bottom-hints"><span><kbd>SHIFT</kbd> Chạy</span><span><kbd>C</kbd> Ngồi</span><span><kbd>SPACE</kbd> Nhảy</span><span><kbd>TAB</kbd> Ba lô</span><span><kbd>ESC</kbd> Tạm dừng</span></div><span id="fps"></span>
 </section>
 <div id="toast" class="toast hidden"></div>
 <section id="tactical-map" class="modal hidden"><div class="map-modal"><div class="modal-heading"><div><small>BẢN ĐỒ CHIẾN THUẬT</small><h2>NORTHWATCH ISLAND</h2></div><button data-action="closemap" class="icon-button" aria-label="Đóng bản đồ">${svg("close")}</button></div><canvas id="full-map" width="700" height="700" aria-label="Bản đồ toàn đảo"></canvas><div class="map-legend"><span><i class="legend-player"></i> Vị trí của bạn</span><span><i class="legend-zone"></i> Vòng bo</span><span><i class="legend-next"></i> Vùng tiếp theo</span></div><p>Nhấn M để đóng · Trận đấu tiếp tục khi xem bản đồ</p></div></section>
 <section id="inventory" class="hidden"><small>TRANG BỊ CỦA BẠN</small><h2>BA LÔ</h2><div id="inventory-content"></div><p>1 / 2 / 3 đổi súng · H cứu thương · G lựu đạn<br>Nhấn TAB để đóng</p></section>
 <section id="pause" class="modal hidden"><div class="menu-panel"><small>LAST LIGHT / BATTLEGROUNDS</small><h2>TẠM DỪNG</h2><p>Trận đấu được giữ nguyên. Sẵn sàng khi bạn trở lại.</p><button id="resume" class="primary-button">TIẾP TỤC CHIẾN ĐẤU <span>↗</span></button><button data-action="settings" class="menu-button">CÀI ĐẶT ${svg("gear")}</button><button data-action="guide" class="menu-button">HƯỚNG DẪN ${svg("map")}</button><button id="return-lobby" class="menu-button">VỀ SẢNH <span>↗</span></button></div></section>
 <section id="settings" class="modal hidden"><div class="menu-panel"><div class="modal-heading"><div><small>TÙY CHỈNH TRẢI NGHIỆM</small><h2>CÀI ĐẶT</h2></div><button data-action="closesettings" class="icon-button" aria-label="Đóng cài đặt">${svg("close")}</button></div><label class="setting">Độ nhạy chuột / cảm ứng <output id="sensitivity-value">1.0</output><input id="sensitivity" type="range" min=".2" max="2.5" step=".1" value="${this.g.settings.sensitivity}"/></label><label class="setting">Âm lượng <output id="volume-value">55%</output><input id="volume" type="range" min="0" max="1" step=".05" value="${this.g.settings.volume}"/></label><label class="setting">Chất lượng hình ảnh<select id="quality"><option value="high">Cao · Bóng đổ & thảm cỏ</option><option value="medium">Cân bằng · Độ phân giải tiêu chuẩn</option><option value="low">Mượt · Tối ưu hiệu năng</option></select></label><label class="setting">Độ khó bot<select id="difficulty"><option value="easy">Tân binh</option><option value="normal">Chiến binh</option><option value="hard">Tinh nhuệ</option></select></label><button data-action="closesettings" class="primary-button">LƯU & TRỞ LẠI <span>↗</span></button></div></section>
 <section id="guide" class="modal hidden"><div class="guide-panel"><div class="modal-heading"><div><small>SỐNG SÓT LÀ NHIỆM VỤ DUY NHẤT</small><h2>LÀM CHỦ CHIẾN TRƯỜNG</h2></div><button data-action="closeguide" class="icon-button" aria-label="Đóng hướng dẫn">${svg("close")}</button></div><div class="guide-intro"><b>24 người. Một hòn đảo. Một người sống sót.</b><p>Di chuyển vào vòng trắng trên bản đồ. Vòng xanh thu hẹp dần và gây sát thương khi bạn ở bên ngoài. Dùng nhà, cây và vật chắn làm nơi ẩn nấp.</p></div><div class="controls-grid">${[
   ["W A S D", "Di chuyển"],
   ["CHUỘT", "Nhìn xung quanh"],
   ["CHUỘT TRÁI", "Bắn"],
   ["CHUỘT PHẢI / V", "Ngắm / kính 4×"],
   ["SHIFT", "Chạy nhanh / Hạ dù"],
   ["SPACE", "Nhảy"],
   ["C", "Đứng / ngồi"],
   ["R", "Thay đạn"],
   ["1 / 2 / 3", "Đổi vũ khí"],
   ["E", "Nhặt đồ gần bạn"],
   ["H", "Dùng cứu thương"],
   ["G", "Ném lựu đạn"],
   ["M", "Bản đồ chiến thuật"],
   ["TAB", "Xem ba lô"],
   ["ESC", "Tạm dừng"],
   ["↑ ↓ ← →", "Nhìn bằng bàn phím"],
 ]
   .map(([k, t]) => `<div><kbd>${k}</kbd><span>${t}</span></div>`)
   .join(
     "",
   )}</div><div class="guide-tip">${svg("bolt")} <p><b>MẸO CHIẾN THUẬT</b> Ngắm và ngồi giúp giảm độ tản đạn. Kar98k có kính 4×. Cứu thương mất 3,5 giây và cần đứng yên. Nhặt giáp để tăng cơ hội sống sót.</p></div><button data-action="closeguide" class="primary-button">ĐÃ RÕ. SẴN SÀNG TRIỂN KHAI. <span>↗</span></button></div></section>
 <section id="results" class="modal hidden"><div class="results-panel"><div id="result-eyebrow">KẾT THÚC TRẬN ĐẤU</div><h2 id="result-title"></h2><p id="result-subtitle"></p><div class="result-rank"><strong id="result-rank"></strong><span>/ 24</span></div><div class="result-stats"><div><b id="result-kills"></b><span>HẠ GỤC</span></div><div><b id="result-damage"></b><span>SÁT THƯƠNG</span></div><div><b id="result-time"></b><span>SỐNG SÓT</span></div><div><b id="result-accuracy"></b><span>CHÍNH XÁC</span></div></div><button id="play-again" class="primary-button">TRIỂN KHAI LẦN NỮA <span>↗</span></button><button id="results-lobby" class="text-link">TRỞ VỀ SẢNH</button></div></section>
 <div id="touch-controls" class="hidden"><div id="touch-look"></div><div id="joystick"><i></i></div><button id="touch-shoot" aria-label="Bắn">${svg("cross")}</button><button id="touch-aim" aria-label="Bật / tắt ngắm" aria-pressed="false">${svg("target")}</button><button id="touch-jump" aria-label="Nhảy">↑</button><button id="touch-reload" aria-label="Thay đạn">ĐẠN</button><button id="touch-pickup" aria-label="Nhặt đồ">NHẶT</button><button id="touch-sprint" aria-pressed="false">CHẠY</button><button id="touch-crouch" aria-pressed="false">NGỒI</button></div>
 `;
    this.el = {};
    for (const e of this.root.querySelectorAll("[id]")) this.el[e.id] = e;
    this.el.quality.value = this.g.settings.quality;
    this.el.difficulty.value = this.g.settings.difficulty;
    this.updateSettings();
  }
  bind() {
    this.training = false;
    this.el["watch-demo"].onclick = () => this.g.start(false, { demo: true });
    this.el["stop-demo"].onclick = () => this.g.lobby();
    this.el.deploy.onclick = () => this.g.start(this.training);
    this.el["mode-solo"].onclick = () => this.setMode(false);
    this.el["mode-practice"].onclick = () => this.setMode(true);
    this.el.resume.onclick = () => this.g.resume();
    this.el["pause-button"].onclick = () => this.g.pause();
    this.el["return-lobby"].onclick = this.el["results-lobby"].onclick = () =>
      this.g.lobby();
    this.el["play-again"].onclick = () =>
      this.g.start(this.g.demo ? false : this.training, { demo: this.g.demo });
    for (const b of this.root.querySelectorAll("[data-action]"))
      b.onclick = () => {
        const a = b.dataset.action;
        if (a === "settings" || a === "guide") this.show(a, true);
        if (a === "closesettings") {
          this.g.saveSettings();
          this.show("settings", false);
        }
        if (a === "closeguide") this.show("guide", false);
        if (a === "closemap") {
          this.mapOpen = false;
          this.show("tactical-map", false);
        }
      };
    this.el.sensitivity.oninput = () => {
      this.g.settings.sensitivity = +this.el.sensitivity.value;
      this.updateSettings();
    };
    this.el.volume.oninput = () => {
      this.g.settings.volume = +this.el.volume.value;
      this.g.audio.setVolume(this.g.settings.volume);
      this.updateSettings();
    };
    this.el.quality.onchange = () => this.g.setQuality(this.el.quality.value);
    this.el.difficulty.onchange = () =>
      (this.g.settings.difficulty = this.el.difficulty.value);
    [...this.el["weapon-slots"].children].forEach(
      (b, i) => (b.onclick = () => this.g.switchWeapon(i)),
    );
    this.el["heal-button"].onclick = () => this.g.heal();
    this.el["grenade-button"].onclick = () => this.g.throwGrenade();
    this.el["minimap-open"].onclick = () => this.event("map");
    this.el["minimap-open"].onkeydown = (e) => {
      if (e.code === "Enter") {
        e.stopPropagation();
        this.event("map");
      }
    };
    this.bindTouch();
    addEventListener(
      "keydown",
      (e) => {
        if (e.code !== "Escape") return;
        for (const id of ["guide", "settings"]) {
          if (!this.el[id].classList.contains("hidden")) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.show(id, false);
            this.g.saveSettings();
            return;
          }
        }
        if (this.mapOpen || this.inventoryOpen) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.mapOpen = this.inventoryOpen = false;
          this.show("tactical-map", false);
          this.show("inventory", false);
        }
      },
      { capture: true },
    );
  }
  bindTouch() {
    this.touch =
      matchMedia("(pointer: coarse)").matches ||
      (import.meta.env.DEV &&
        new URLSearchParams(location.search).has("touch"));
    document.body.classList.toggle("touch-device", this.touch);
    if (!this.touch) return;
    const g = this.g;
    const joy = this.el.joystick;
    let id = null,
      origin = {};
    const clear = () => {
      id = null;
      for (const k of ["KeyW", "KeyA", "KeyS", "KeyD"]) g.keys.delete(k);
      joy.firstElementChild.style.transform = "translate(0,0)";
    };
    joy.onpointerdown = (e) => {
      id = e.pointerId;
      origin = { x: e.clientX, y: e.clientY };
      joy.setPointerCapture(id);
    };
    joy.onpointermove = (e) => {
      if (e.pointerId !== id || !g.active) return;
      const x = clamp(e.clientX - origin.x, -40, 40),
        y = clamp(e.clientY - origin.y, -40, 40);
      joy.firstElementChild.style.transform = `translate(${x}px,${y}px)`;
      for (const [key, on] of [
        ["KeyW", y < -8],
        ["KeyS", y > 8],
        ["KeyA", x < -8],
        ["KeyD", x > 8],
      ])
        on ? g.keys.add(key) : g.keys.delete(key);
    };
    joy.onpointerup = joy.onpointercancel = joy.onlostpointercapture = clear;
    let last = null;
    const look = this.el["touch-look"];
    look.onpointerdown = (e) => {
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
      look.setPointerCapture(e.pointerId);
    };
    look.onpointermove = (e) => {
      if (!last || last.id !== e.pointerId || !g.active) return;
      const sensitivity =
        0.004 * g.settings.sensitivity * (g.mouse.aim ? 0.5 : 1);
      g.player.yaw -= (e.clientX - last.x) * sensitivity;
      g.player.pitch = clamp(
        g.player.pitch - (e.clientY - last.y) * sensitivity,
        -1.4,
        1.4,
      );
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    look.onpointerup =
      look.onpointercancel =
      look.onlostpointercapture =
        () => (last = null);
    this.el["touch-shoot"].onpointerdown = (e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!g.active) return;
      g.mouse.fire = true;
      g.shoot();
    };
    this.el["touch-shoot"].onpointerup =
      this.el["touch-shoot"].onpointercancel =
      this.el["touch-shoot"].onlostpointercapture =
        () => (g.mouse.fire = false);
    this.el["touch-aim"].onclick = () => {
      g.mouse.aim = !g.mouse.aim;
      this.el["touch-aim"].setAttribute("aria-pressed", g.mouse.aim);
    };
    this.el["touch-sprint"].onclick = () => {
      this.sprint = !this.sprint;
      this.sprint ? g.keys.add("ShiftLeft") : g.keys.delete("ShiftLeft");
      this.el["touch-sprint"].setAttribute("aria-pressed", this.sprint);
    };
    this.el["touch-crouch"].onclick = () => {
      g.player.crouched = !g.player.crouched;
      this.el["touch-crouch"].setAttribute("aria-pressed", g.player.crouched);
    };
    this.resetTouch = () => {
      clear();
      last = null;
      this.sprint = false;
      g.keys.delete("ShiftLeft");
      g.mouse.fire = g.mouse.aim = false;
      for (const name of ["sprint", "aim", "crouch"])
        this.el[`touch-${name}`].setAttribute(
          "aria-pressed",
          name === "crouch" && g.player.crouched,
        );
    };
    addEventListener("blur", this.resetTouch);
    this.el["touch-reload"].onclick = () => g.reload();
    this.el["touch-pickup"].onclick = () => g.pickup();
    this.el["touch-jump"].onclick = () => {
      if (g.player.grounded && g.mode === "playing") {
        g.player.vy = 6.3;
        g.player.grounded = false;
      }
    };
  }
  updateSettings() {
    this.el["sensitivity-value"].textContent =
      this.g.settings.sensitivity.toFixed(1);
    this.el["volume-value"].textContent =
      Math.round(this.g.settings.volume * 100) + "%";
  }
  setMode(training) {
    this.training = training;
    this.el["mode-solo"].classList.toggle("selected", !training);
    this.el["mode-practice"].classList.toggle("selected", training);
    this.el["mode-description"].textContent = training
      ? "Làm quen vũ khí · Bot không bắn trả · Không thu bo"
      : "Bạn + 23 bot · Vòng bo thu hẹp · Một người chiến thắng";
  }
  show(id, on) {
    this.el[id]?.classList.toggle("hidden", !on);
  }
  event(type, data) {
    const g = this.g;
    if (["start", "pause", "end", "lobby"].includes(type)) this.resetTouch?.();
    this.show("demo-badge", !!g.demo && (g.active || g.mode === "paused"));
    if (type === "start") {
      for (const id of [
        "lobby",
        "pause",
        "results",
        "guide",
        "settings",
        "inventory",
        "tactical-map",
      ])
        this.show(id, false);
      this.show("hud", true);
      this.show("touch-controls", this.touch && !g.demo);
      this.el["drop-banner"].querySelector("small").textContent = this.touch
        ? "Kéo cần di chuyển dù · CHẠY hạ nhanh"
        : "W A S D di chuyển dù · SHIFT hạ nhanh";
      this.mapOpen = this.inventoryOpen = false;
      this.feed = [];
    }
    if (type === "pause") {
      this.mapOpen = this.inventoryOpen = false;
      this.show("tactical-map", false);
      this.show("inventory", false);
      this.show("pause", true);
      this.show("touch-controls", false);
    }
    if (type === "resume") {
      this.show("pause", false);
      this.show("touch-controls", this.touch && !g.demo);
    }
    if (type === "lobby") {
      for (const id of [
        "hud",
        "pause",
        "results",
        "inventory",
        "tactical-map",
        "touch-controls",
        "settings",
        "guide",
      ])
        this.show(id, false);
      this.show("lobby", true);
      this.el["damage-vignette"].style.opacity = 0;
      this.el["zone-vignette"].style.opacity = 0;
      this.show("scope", false);
    }
    if (type === "toast") {
      this.el.toast.textContent = data;
      this.show("toast", true);
      this.toastTimer = 4;
    }
    if (type === "map") {
      this.mapOpen = !this.mapOpen;
      this.show("tactical-map", this.mapOpen);
    }
    if (type === "inventory") {
      this.inventoryOpen = !this.inventoryOpen;
      this.show("inventory", this.inventoryOpen);
    }
    if (type === "damage") {
      const b = g.bots.find((b) => b.name === data);
      if (b) {
        this.damageHeading =
          Math.atan2(b.x - g.player.x, -(b.z - g.player.z)) + g.player.yaw;
      }
    }
    if (type === "hit")
      this.el["hit-marker"].classList.toggle("headshot", data);
    if (type === "kill") {
      this.el["kill-name"].textContent = data.name;
      this.el["kill-detail"].textContent =
        `${data.headshot ? "HEADSHOT · " : ""}${data.kills} HẠ GỤC`;
    }
    if (type === "feed") {
      this.feed.unshift({ ...data, until: g.time + 7 });
      this.feed = this.feed.slice(0, 5);
    }
    if (type === "end") {
      this.show("results", true);
      this.show("pause", false);
      this.show("tactical-map", false);
      this.show("inventory", false);
      this.show("touch-controls", false);
      this.show("scope", false);
      this.el["result-title"].innerHTML = data.win
        ? "WINNER WINNER.<br><em>CHICKEN DINNER.</em>"
        : "CHIẾN BINH GỤC NGÃ.<br><em>ĐỪNG BỎ CUỘC.</em>";
      this.el["result-subtitle"].textContent = data.win
        ? "Bạn là người sống sót cuối cùng trên Northwatch."
        : `Bị hạ bởi ${data.killer || "đối thủ"}. Mỗi lần triển khai là một cơ hội mới.`;
      this.el["result-rank"].textContent = "#" + data.rank;
      this.el["result-kills"].textContent = data.kills;
      this.el["result-damage"].textContent = data.damage;
      this.el["result-time"].textContent = time(data.time);
      this.el["result-accuracy"].textContent = data.accuracy + "%";
    }
  }
  createMap() {
    const c = document.createElement("canvas");
    c.width = c.height = 700;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#344f55";
    ctx.fillRect(0, 0, 700, 700);
    for (let z = 0; z < 700; z += 3)
      for (let x = 0; x < 700; x += 3) {
        const wx = (x / 700 - 0.5) * 640,
          wz = (z / 700 - 0.5) * 640,
          h = heightAt(wx, wz);
        if (h < 0) continue;
        const shade = Math.floor(65 + h * 1.05);
        ctx.fillStyle =
          h < 2 ? "#8a896c" : `rgb(${shade + 12},${shade + 22},${shade + 7})`;
        ctx.fillRect(x, z, 3, 3);
      }
    ctx.strokeStyle = "#a8a17d";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(350, 105);
    ctx.lineTo(350, 595);
    ctx.moveTo(105, 350);
    ctx.lineTo(595, 350);
    ctx.stroke();
    for (const b of this.g.world.buildings) {
      ctx.fillStyle = "#b2ad95";
      ctx.fillRect(
        (b.x / 640 + 0.5) * 700 - (b.w / 640) * 350,
        (b.z / 640 + 0.5) * 700 - (b.d / 640) * 350,
        (b.w / 640) * 700,
        (b.d / 640) * 700,
      );
    }
    ctx.strokeStyle = "#d7d8b510";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 70, 0);
      ctx.lineTo(i * 70, 700);
      ctx.moveTo(0, i * 70);
      ctx.lineTo(700, i * 70);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#d9dcc0";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("NORTHWATCH", 350, 312);
    ctx.font = "11px sans-serif";
    ctx.fillText("HARBOR", 462, 470);
    ctx.fillText("PINE RIDGE", 195, 214);
    ctx.fillText("MILITARY", 465, 270);
    ctx.fillText("WEST FARM", 226, 498);
    this.mapBase = c;
    const lc = this.el["lobby-map"].getContext("2d");
    lc.drawImage(c, 0, 0, 360, 230);
  }
  drawMap(canvas, full = false) {
    const g = this.g,
      p = g.player,
      ctx = canvas.getContext("2d"),
      w = canvas.width;
    ctx.clearRect(0, 0, w, w);
    ctx.drawImage(this.mapBase, 0, 0, w, w);
    const project = (v) => (v / 640 + 0.5) * w;
    const zone = g.zone;
    if (zone && !g.training) {
      ctx.fillStyle = "#469ae838";
      ctx.beginPath();
      ctx.rect(0, 0, w, w);
      ctx.arc(w / 2, w / 2, (zone.radius / 640) * w, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.strokeStyle = "#85b9e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, (zone.radius / 640) * w, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#eceddf";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, (zone.next / 640) * w, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.translate(project(p.x), project(p.z));
    ctx.rotate(-p.yaw);
    ctx.fillStyle = "#edbd69";
    ctx.shadowBlur = 6;
    ctx.shadowColor = "#efbc5c";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.font = `bold ${full ? 15 : 11}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#f2eedf";
    ctx.fillText("N", w / 2, 18);
    if (g.training) {
      ctx.fillStyle = "#d78068";
      for (const b of g.bots) {
        if (b.alive) {
          ctx.beginPath();
          ctx.arc(project(b.x), project(b.z), full ? 3 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  update(dt) {
    const g = this.g,
      p = g.player;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.show("toast", false);
    }
    if (g.mode === "lobby") return;
    this.lastUI += dt;
    this.lastMap += dt;
    if (this.lastUI < 0.08) return;
    this.lastUI = 0;
    const alive = g.bots.filter((b) => b.alive).length + (p.hp > 0 ? 1 : 0);
    this.el.alive.textContent = alive;
    this.el.kills.textContent = p.kills;
    this.el["health-value"].textContent = Math.ceil(p.hp);
    this.el["health-bar"].style.width = p.hp + "%";
    this.el["health-bar"].classList.toggle("low", p.hp < 30);
    this.el["armor-bar"].style.width = p.armor + "%";
    this.el["armor-value"].textContent = Math.round(p.armor);
    this.el["stamina-bar"].style.width = p.stamina + "%";
    this.el.meds.textContent = p.meds;
    this.el.grenades.textContent = p.grenades;
    this.el.stance.textContent = p.crouched
      ? "ĐANG NGỒI"
      : p.speed > 6
        ? "CHẠY NHANH"
        : "ĐỨNG";
    this.el.ammo.textContent = p.ammo[p.weapon].toString().padStart(2, "0");
    this.el.ammo.classList.toggle("empty", p.ammo[p.weapon] === 0);
    this.el.reserve.textContent = p.reserve[p.weapon];
    this.el["weapon-name"].textContent = WEAPONS[p.weapon].name;
    this.el["weapon-mode"].textContent =
      (WEAPONS[p.weapon].auto ? "AUTO" : "BOLT ACTION") +
      " / " +
      WEAPONS[p.weapon].caliber;
    [...this.el["weapon-slots"].children].forEach((s, i) =>
      s.classList.toggle("active", i === p.weapon),
    );
    const zone = g.zone;
    if (zone) {
      this.el["zone-title"].textContent = g.training
        ? "KHU LUYỆN TẬP"
        : `VÙNG AN TOÀN / 0${zone.phase}`;
      this.el["zone-time"].textContent = g.training
        ? "∞"
        : time(zone.remaining);
      this.el["zone-state"].textContent = g.training
        ? "TỰ DO"
        : zone.closing
          ? "ĐANG THU HẸP"
          : "CHUẨN BỊ";
      this.el["zone-state"].classList.toggle(
        "closing",
        zone.closing && !g.training,
      );
    }
    const heading = ((((-p.yaw * 180) / Math.PI) % 360) + 360) % 360;
    this.el.heading.textContent = Math.round(heading) + "°";
    let ticks = "";
    for (let offset = -3; offset <= 3; offset++) {
      const deg = (Math.round(heading / 15) * 15 + offset * 15 + 360) % 360;
      const dirs = {
        0: "N",
        45: "NE",
        90: "E",
        135: "SE",
        180: "S",
        225: "SW",
        270: "W",
        315: "NW",
      };
      ticks += `<span style="transform:translateX(${(((deg - heading + 540) % 360) - 180) * 3.5}px)" class="${dirs[deg] ? "major" : ""}">${dirs[deg] || deg}<i></i></span>`;
    }
    this.el["compass-ticks"].innerHTML = ticks;
    this.show("drop-banner", g.mode === "drop");
    this.el.altitude.textContent =
      Math.max(0, Math.round(p.y - heightAt(p.x, p.z))) + " m";
    this.show(
      "crosshair",
      g.mode === "playing" && !this.mapOpen && !(g.mouse.aim && p.weapon === 1),
    );
    this.el.crosshair.classList.toggle("aiming", g.mouse.aim);
    this.el.crosshair.classList.toggle("moving", p.speed > 4);
    this.show(
      "scope",
      g.mode === "playing" && g.mouse.aim && p.weapon === 1 && !this.mapOpen,
    );
    this.el["hit-marker"].style.opacity = g.hitTime > 0 ? 1 : 0;
    this.el["damage-vignette"].style.opacity = g.damageTime > 0 ? 0.6 : 0;
    this.el["damage-direction"].style.opacity = g.damageTime > 0 ? 1 : 0;
    this.el["damage-direction"].style.transform =
      `rotate(${this.damageHeading || 0}rad)`;
    const outside = !g.training && zone && Math.hypot(p.x, p.z) > zone.radius;
    this.el["zone-vignette"].style.opacity = outside ? 0.35 : 0;
    this.el["map-distance"].textContent = outside
      ? `NGOÀI VÙNG AN TOÀN · ${Math.ceil(Math.hypot(p.x, p.z) - zone.radius)} m`
      : "TRONG VÙNG AN TOÀN";
    this.el["map-distance"].classList.toggle("danger", outside);
    this.show("loot-prompt", !!g.nearestLoot && g.mode === "playing");
    if (g.nearestLoot)
      this.el["loot-name"].textContent = lootNames[g.nearestLoot.type];
    this.show("kill-notice", g.killTime > 0 && g.mode === "playing");
    this.show("action-progress", p.reload > 0 || p.heal > 0);
    if (p.reload > 0 || p.heal > 0) {
      this.el["action-label"].textContent =
        p.reload > 0 ? "ĐANG THAY ĐẠN" : "ĐANG CỨU THƯƠNG";
      const ratio =
        p.reload > 0
          ? 1 - p.reload / WEAPONS[p.weapon].reload
          : 1 - p.heal / 3.5;
      this.el["action-fill"].style.width = ratio * 100 + "%";
    }
    this.feed = this.feed.filter((f) => f.until > g.time);
    this.el["kill-feed"].innerHTML = this.feed
      .map(
        (f) =>
          `<div class="${f.player ? "player-kill" : ""}"><b>${f.killer}</b><span>⌁</span>${f.victim}</div>`,
      )
      .join("");
    this.el.fps.textContent = Math.round(g.fps) + " FPS";
    if (this.lastMap > 0.2) {
      this.lastMap = 0;
      this.drawMap(this.el.minimap);
      if (this.mapOpen) this.drawMap(this.el["full-map"], true);
      if (this.inventoryOpen)
        this.el["inventory-content"].innerHTML =
          WEAPONS.map(
            (w, i) =>
              `<div class="inventory-row"><kbd>${i + 1}</kbd><strong>${w.name}<small>${w.caliber}</small></strong><b>${p.ammo[i]} / ${p.reserve[i]}</b></div>`,
          ).join("") +
          `<div class="inventory-row"><span>Cứu thương</span><b>${p.meds}</b></div><div class="inventory-row"><span>Lựu đạn</span><b>${p.grenades}</b></div><div class="inventory-row"><span>Độ bền áo giáp</span><b>${Math.round(p.armor)}%</b></div>`;
    }
  }
}
