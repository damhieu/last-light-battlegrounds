export function installMobile(game, ui) {
  const panel = document.createElement("section");
  panel.className = "modal hidden";
  panel.id = "iphone-install";
  panel.innerHTML = `<div class="install-panel"><div class="modal-heading"><div><small>CHIẾN TRƯỜNG TRONG TÚI BẠN</small><h2>CHƠI TRÊN iPHONE</h2></div><button class="icon-button" aria-label="Đóng hướng dẫn iPhone">×</button></div><div class="install-app"><img src="${import.meta.env.BASE_URL}apple-touch-icon.png" alt="Biểu tượng Last Light" width="64" height="64"><div><strong>LAST LIGHT</strong><span>Thêm vào màn hình chính · Miễn phí</span></div></div><ol class="install-steps"><li><b>Mở bằng Safari</b><p>Truy cập game trong Safari. Nếu đang mở từ Facebook, chọn mở liên kết bằng trình duyệt ngoài.</p></li><li><b>Chia sẻ → Thêm vào MH chính</b><p>Nhấn nút Chia sẻ (ô vuông có mũi tên lên). Chọn “Thêm vào MH chính” / “Add to Home Screen”. Nếu chưa thấy, cuộn xuống hoặc chọn Sửa tác vụ.</p></li><li><b>Thêm LAST LIGHT</b><p>Bật “Mở dưới dạng ứng dụng web” nếu có, rồi nhấn “Thêm”. Chạm biểu tượng LAST LIGHT để chơi.</p></li></ol><div class="install-tip"><b>XOAY NGANG ĐỂ CHƠI THOẢI MÁI</b><p>Tắt khóa xoay màn hình. Kéo cần bên trái để di chuyển, vuốt bên phải để nhìn. Nút CHẠY và NGỒI bật/tắt; chạm tên súng để đổi vũ khí.</p></div><p id="offline-state" role="status">Lần đầu cần mạng để tải game. Trạng thái lưu ngoại tuyến sẽ hiện ở đây.</p><a class="text-link" href="https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios" target="_blank" rel="noopener">HƯỚNG DẪN CỦA APPLE ↗</a><button class="primary-button install-close">ĐÃ HIỂU · TRỞ LẠI GAME ↗</button></div>`;
  ui.root.append(panel);
  const close = () => panel.classList.add("hidden");
  panel.querySelectorAll("button").forEach((b) => (b.onclick = close));
  document.querySelector("#install-iphone").onclick = () =>
    panel.classList.remove("hidden");
  addEventListener(
    "keydown",
    (e) => {
      if (e.code === "Escape" && !panel.classList.contains("hidden")) {
        close();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  const status = panel.querySelector("#offline-state");
  const standalone =
    matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone)
    document.querySelector("#install-iphone").textContent =
      "ĐÃ CÀI · HƯỚNG DẪN";
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(async (registration) => {
        await navigator.serviceWorker.ready;
        status.textContent =
          "Đã lưu game để chơi ngoại tuyến trên trình duyệt này. iOS có thể dọn bộ nhớ khi thiếu dung lượng.";
        if (registration.waiting)
          status.textContent +=
            " Có bản mới: đóng các cửa sổ game rồi mở lại để cập nhật.";
      })
      .catch(() => {
        status.textContent =
          "Chưa lưu được game ngoại tuyến. Bạn vẫn có thể chơi khi có mạng.";
      });
  } else if (import.meta.env.DEV)
    status.textContent =
      "Chế độ phát triển: bộ nhớ ngoại tuyến chỉ bật ở bản xuất bản.";
  // Reacquire screen wake lock only while a match is visible. Unsupported browsers simply skip it.
  let wake,
    wakePending = false;
  async function syncWake() {
    if (
      game.active &&
      !document.hidden &&
      navigator.wakeLock &&
      !wake &&
      !wakePending
    ) {
      wakePending = true;
      try {
        const acquired = await navigator.wakeLock.request("screen");
        if (!game.active || document.hidden) {
          await acquired.release();
          return;
        }
        wake = acquired;
        acquired.addEventListener("release", () => {
          if (wake === acquired) wake = null;
        });
      } catch {
      } finally {
        wakePending = false;
      }
    } else if (!game.active && wake) {
      await wake.release();
      wake = null;
    }
  }
  const onEvent = game.onEvent;
  game.onEvent = (type, data) => {
    onEvent?.(type, data);
    if (["start", "resume", "pause", "end", "lobby"].includes(type)) syncWake();
  };
  document.addEventListener("visibilitychange", syncWake);
}
