import { AudioEngine } from "./audio.js";
import { BUILD_INFO } from "./build-info.js";
import { WEAPONS } from "./core.js";

// Development-only capture studio. No screen, microphone or camera permission needed.
export function installRecorder(g, ui) {
  const panel = document.createElement("div");
  panel.id = "record-panel";
  panel.style.cssText =
    "position:fixed;z-index:100;top:10px;left:10px;padding:12px;background:#142124;border:1px solid #efbd69;color:#eeeade;font:14px Arial;pointer-events:auto";
  panel.innerHTML =
    '<button id="record-demo">QUAY DEMO HD · 55 GIÂY</button><span id="record-status"> Sẵn sàng</span>';
  document.body.append(panel);
  panel.querySelector("button").onclick = async () => {
    const button = panel.querySelector("button"),
      status = panel.querySelector("span");
    button.disabled = true;
    try {
      await document.fonts.ready;
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const c = canvas.getContext("2d", { alpha: false });
      const stream = canvas.captureStream(30);
      g.audio.init();
      await g.audio.ctx.resume();
      const audio = g.audio.ctx.createMediaStreamDestination();
      g.audio.master.connect(audio);
      audio.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      const mime = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("Trình duyệt này chưa hỗ trợ ghi WebM.");
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 12000000,
        audioBitsPerSecond: 192000,
      });
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const saved = {
        ratio: g.renderer.getPixelRatio(),
        aspect: g.camera.aspect,
      };
      g.recordingSize = true;
      g.renderer.setPixelRatio(1);
      g.renderer.setSize(1080, 1440, false);
      g.camera.aspect = 0.75;
      g.camera.updateProjectionMatrix();
      g.start(false, { demo: true });
      const events = [];
      const originals = {};
      for (const method of ["tone", "burst"]) {
        originals[method] = g.audio[method];
        g.audio[method] = function (...args) {
          events.push({
            time: (performance.now() - started) / 1000,
            method,
            args,
          });
          return originals[method].apply(this, args);
        };
      }
      let started = performance.now(),
        stopped = false;
      const text = (
        value,
        x,
        y,
        size = 30,
        color = "#eeeade",
        weight = 600,
        font = "Barlow",
      ) => {
        c.fillStyle = color;
        c.font = `${weight} ${size}px "${font}", sans-serif`;
        c.fillText(value, x, y);
      };
      g.onRendered = (now) => {
        const t = (now - started) / 1000,
          p = g.player;
        c.fillStyle = "#101d20";
        c.fillRect(0, 0, 1080, 1920);
        c.drawImage(g.canvas, 0, 210, 1080, 1440);
        // Actual HUD values sampled from the running match.
        c.fillStyle = "#efbd69";
        c.fillRect(60, 57, 7, 78);
        text("LAST LIGHT", 89, 112, 70, "#eeeade", 700, "Barlow Condensed");
        text("B A T T L E G R O U N D S", 90, 153, 21, "#b3b9ac");
        c.fillStyle = "#efbd691f";
        c.fillRect(774, 68, 246, 59);
        text("BOT TỰ CHƠI", 798, 107, 26, "#efbd69");
        text("NORTHWATCH ISLAND", 60, 194, 22, "#b3b9ac", 500);
        text(
          `v${BUILD_INFO.version}  /  GAMEPLAY THẬT`,
          664,
          194,
          21,
          "#b3b9ac",
          500,
        );
        c.fillStyle = "#142124bd";
        c.fillRect(52, 246, 400, 72);
        text(
          `${g.bots.filter((b) => b.alive).length + (p.hp > 0 ? 1 : 0)} CÒN SỐNG`,
          77,
          293,
          31,
        );
        text(`${p.kills} HẠ GỤC`, 284, 293, 31, "#efbd69");
        c.globalAlpha = 0.9;
        c.drawImage(ui.el.minimap, 830, 244, 198, 198);
        c.globalAlpha = 1;
        c.strokeStyle = "#eeeade";
        c.lineWidth = 2;
        c.strokeRect(830, 244, 198, 198);
        if (g.mode === "playing") {
          if (g.mouse.aim && p.weapon === 1) {
            c.fillStyle = "#071112bf";
            c.beginPath();
            c.rect(0, 210, 1080, 1440);
            c.arc(540, 930, 400, 0, Math.PI * 2, true);
            c.fill("evenodd");
            c.strokeStyle = "#102025";
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(140, 930);
            c.lineTo(940, 930);
            c.moveTo(540, 530);
            c.lineTo(540, 1330);
            c.stroke();
          } else {
            c.strokeStyle = "#f6f0d7";
            c.lineWidth = 2;
            c.beginPath();
            for (const [x, y, ex, ey] of [
              [522, 930, 531, 930],
              [549, 930, 558, 930],
              [540, 912, 540, 921],
              [540, 939, 540, 948],
            ]) {
              c.moveTo(x, y);
              c.lineTo(ex, ey);
            }
            c.stroke();
          }
          if (g.hitTime > 0) {
            c.strokeStyle = "#efbd69";
            c.lineWidth = 4;
            c.beginPath();
            c.moveTo(531, 921);
            c.lineTo(549, 939);
            c.moveTo(549, 921);
            c.lineTo(531, 939);
            c.stroke();
          }
        }
        if (g.killTime > 0) {
          c.fillStyle = "#142124dd";
          c.fillRect(230, 1350, 620, 98);
          text("ĐÃ HẠ GỤC ĐỐI THỦ", 289, 1393, 28, "#efbd69");
          text(`${p.kills} ELIMINATIONS`, 288, 1430, 24);
        }
        const fade = c.createLinearGradient(0, 1460, 0, 1650);
        fade.addColorStop(0, "#101d2000");
        fade.addColorStop(1, "#101d20");
        c.fillStyle = fade;
        c.fillRect(0, 1460, 1080, 190);
        const phase =
          g.mode === "drop"
            ? "01 / TRIỂN KHAI BẰNG DÙ"
            : p.heal
              ? "HỒI PHỤC ĐỂ SINH TỒN"
              : p.reload
                ? "THAY ĐẠN · SẴN SÀNG"
                : g.pilot?.wantShoot
                  ? "CHẠM TRÁN TRÊN ĐẢO"
                  : "TÌM KIẾM ĐỐI THỦ";
        text(phase, 60, 1580, 34, "#efbd69", 600, "Barlow Condensed");
        text(
          WEAPONS[p.weapon].name,
          60,
          1678,
          62,
          "#eeeade",
          700,
          "Barlow Condensed",
        );
        text(
          `${p.ammo[p.weapon]} / ${p.reserve[p.weapon]}`,
          790,
          1678,
          50,
          "#eeeade",
          600,
          "Barlow Condensed",
        );
        c.fillStyle = "#32413d";
        c.fillRect(60, 1708, 710, 10);
        c.fillStyle = p.hp < 35 ? "#dc7662" : "#c8d3af";
        c.fillRect(60, 1708, (710 * p.hp) / 100, 10);
        text(
          `HP ${Math.ceil(p.hp)}  ·  GIÁP ${Math.ceil(p.armor)}`,
          60,
          1751,
          23,
          "#b3b9ac",
        );
        text("Thiết kế bởi Đàm Mạnh Hiếu", 60, 1831, 37, "#efbd69", 600);
        text(
          "CHƠI MIỄN PHÍ TRÊN TRÌNH DUYỆT & iPHONE",
          60,
          1874,
          22,
          "#b3b9ac",
          500,
        );
        if (t < 3.5) {
          c.fillStyle = "#102024b8";
          c.fillRect(60, 1030, 960, 245);
          text(
            "MỘT HÒN ĐẢO.",
            94,
            1122,
            74,
            "#eeeade",
            700,
            "Barlow Condensed",
          );
          text(
            "AI SẼ SỐNG SÓT?",
            94,
            1214,
            80,
            "#efbd69",
            700,
            "Barlow Condensed",
          );
        }
        if (t > 50.5) {
          c.fillStyle = "#101d20df";
          c.fillRect(0, 460, 1080, 1000);
          text("SẴN SÀNG", 90, 665, 100, "#eeeade", 700, "Barlow Condensed");
          text(
            "VÀO CHIẾN TRƯỜNG?",
            90,
            782,
            85,
            "#efbd69",
            700,
            "Barlow Condensed",
          );
          text(`${p.kills} HẠ GỤC  ·  BOT TỰ CHƠI`, 90, 869, 36);
          text("MỞ SAFARI → THÊM VÀO MH CHÍNH", 90, 1020, 32, "#eeeade");
          text("damhieu.github.io/", 90, 1150, 44, "#efbd69");
          text("last-light-battlegrounds/", 90, 1213, 44, "#efbd69");
          text("THỬ THÁCH 23 BOT. GIÀNH VỊ TRÍ #1.", 90, 1345, 30, "#b3b9ac");
        }
        status.textContent = ` Đang ghi ${Math.min(55, Math.floor(t))}/55s · ${p.kills} hạ gục`;
        if (t >= 55 && !stopped) {
          stopped = true;
          recorder.stop();
          g.onRendered = null;
        }
      };
      recorder.onstop = async () => {
        for (const method of ["tone", "burst"])
          g.audio[method] = originals[method];
        g.pause();
        status.textContent = " Đang lưu video…";
        const blob = new Blob(chunks, { type: mime });
        const download = document.createElement("a");
        download.href = URL.createObjectURL(blob);
        download.download = "last-light-demo.webm";
        download.textContent = " · TẢI WEBM";
        panel.append(download);
        try {
          const response = await fetch("/__recording", {
            method: "POST",
            body: blob,
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          // Render the same game sound events against an exact offline clock.
          // This avoids MediaRecorder audio clock drift under GPU/encoder load.
          const offline = new OfflineAudioContext(2, 48000 * 55, 48000);
          const track = new AudioEngine();
          track.ctx = offline;
          track.master = offline.createGain();
          track.master.gain.value = g.audio.volume;
          track.master.connect(offline.destination);
          track.noise = g.audio.noise;
          for (const event of events) {
            if (event.time < 55) {
              track.playbackTime = event.time;
              track[event.method](...event.args);
            }
          }
          const rendered = await offline.startRendering();
          const wav = pcmWave(rendered);
          const audioResponse = await fetch("/__recording?audio=1", {
            method: "POST",
            body: wav,
          });
          if (!audioResponse.ok)
            throw new Error("Không lưu được âm thanh đồng bộ");
          status.textContent = ` ĐÃ LƯU · ${(blob.size / 1048576).toFixed(1)} MB · ${g.player.kills} hạ gục`;
          panel.dataset.result = "saved";
        } catch (error) {
          status.textContent = ` Lỗi lưu: ${error.message}`;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "last-light-demo.webm";
          a.textContent = " TẢI VIDEO";
          panel.append(a);
        }
        g.audio.master.disconnect(audio);
        stream.getTracks().forEach((track) => track.stop());
        g.recordingSize = false;
        g.renderer.setPixelRatio(saved.ratio);
        g.renderer.setSize(innerWidth, innerHeight);
        g.camera.aspect = saved.aspect;
        g.camera.updateProjectionMatrix();
        button.disabled = false;
      };
      recorder.start(1000);
    } catch (error) {
      status.textContent = ` ${error.message}`;
      button.disabled = false;
      console.error(error);
    }
  };
}

function pcmWave(buffer) {
  const bytes = new ArrayBuffer(44 + buffer.length * 4),
    view = new DataView(bytes);
  const word = (offset, value) => {
    for (let i = 0; i < value.length; i++)
      view.setUint8(offset + i, value.charCodeAt(i));
  };
  word(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  word(8, "WAVE");
  word(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, 48000, true);
  view.setUint32(28, 192000, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  word(36, "data");
  view.setUint32(40, buffer.length * 4, true);
  const left = buffer.getChannelData(0),
    right = buffer.getChannelData(1);
  for (let i = 0; i < buffer.length; i++) {
    view.setInt16(44 + i * 4, Math.max(-1, Math.min(1, left[i])) * 32767, true);
    view.setInt16(
      46 + i * 4,
      Math.max(-1, Math.min(1, right[i])) * 32767,
      true,
    );
  }
  return new Blob([bytes], { type: "audio/wav" });
}
