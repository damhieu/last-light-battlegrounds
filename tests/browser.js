// Integration tests exercise the actual rendered game's simulation, without input mocks.
// Development only. Open /?test=1 and use the Run checks button.
import { heightAt, zoneAt } from "../src/core.js";
export function installBrowserChecks(g) {
  const panel = document.createElement("section");
  panel.id = "test-panel";
  panel.style.cssText =
    "position:fixed;z-index:100;top:10px;left:10px;max-width:660px;max-height:90vh;overflow:auto;background:#10242a;color:#eff5df;border:1px solid #eabe6b;padding:18px;font:12px/1.6 monospace;pointer-events:auto;";
  panel.innerHTML =
    '<button id="run-checks" style="padding:10px 20px;background:#eabe6b;color:#10242a;border:0;cursor:pointer">Run integration checks</button><pre id="test-output">Ready</pre>';
  document.body.append(panel);
  panel.querySelector("button").onclick = async () => {
    const output = panel.querySelector("pre"),
      results = [];
    g.testing = true;
    const lock = g.requestLock;
    g.requestLock = () => {};
    const audio = g.audio;
    const savedVolume = audio.volume;
    audio.setVolume(0);
    const assert = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const tick = (seconds) => {
      for (let t = 0; t < seconds && g.active; t += 1 / 60) g.advance(1 / 60);
    };
    const setup = () => {
      g.start(true);
      g.testing = true;
      g.player.x = 0;
      g.player.z = 52;
      g.player.y = heightAt(0, 52);
      g.player.yaw = 0;
      g.player.pitch = 0;
      g.camera.updateMatrixWorld(true);
    };
    const check = async (name, fn) => {
      try {
        await fn();
        results.push({ name, pass: true });
      } catch (e) {
        results.push({ name, pass: false, error: e.message });
      }
      output.textContent = results
        .map(
          (r) =>
            `${r.pass ? "PASS" : "FAIL"} ${r.name}${r.error ? " — " + r.error : ""}`,
        )
        .join("\n");
      await new Promise((r) => setTimeout(r, 10));
    };
    try {
      await check(
        "World: 23 bots, 50+ supply pickups, real collision geometry",
        () => {
          setup();
          assert(g.bots.length === 23, "missing bots");
          assert(g.loot.length > 50, "missing loot");
          assert(g.world.collision.boxes.length > 300, "missing collisions");
        },
      );
      await check(
        "Parachute deployment lands and transitions to live combat",
        () => {
          g.start(false);
          tick(8);
          assert(g.mode === "playing", "drop did not land");
          assert(g.player.grounded, "not grounded");
          assert(g.player.hp > 0, "player died during drop");
          g.start(false);
          g.player.x = -17;
          g.player.z = -20;
          tick(7);
          assert(
            g.mode === "playing" && g.player.y > 9,
            "parachute passed through roof",
          );
        },
      );
      await check("Movement, sprint, stamina, crouch and jump", () => {
        setup();
        const z = g.player.z;
        g.keys.add("KeyW");
        tick(1);
        assert(g.player.z < z - 4, "walking failed");
        g.keys.add("ShiftLeft");
        const before = g.player.z;
        tick(1);
        assert(g.player.z < before - 8, "sprint failed");
        assert(g.player.stamina < 90, "no stamina use");
        g.keys.clear();
        g.player.vy = 6.3;
        g.player.grounded = false;
        const y = g.player.y;
        tick(0.2);
        assert(g.player.y > y + 0.5, "jump failed");
        tick(1);
        assert(g.player.grounded, "did not land");
        g.player.crouched = true;
        g.updateCamera(0.3);
        assert(g.camera.position.y - g.player.y < 1.3, "crouch camera failed");
      });
      await check(
        "Player enters doorways and walls prevent walking through buildings",
        () => {
          setup();
          const p = g.player;
          p.x = -17;
          p.z = -12;
          p.y = 5;
          p.yaw = 0;
          g.keys.add("KeyW");
          tick(1);
          g.keys.clear();
          assert(p.z < -16, "doorway blocked");
          p.x = -14;
          p.z = -12;
          p.y = 5;
          g.keys.add("KeyW");
          tick(1);
          g.keys.clear();
          assert(p.z > -15, "walked through wall");
        },
      );
      await check(
        "Shots consume ammo; reloading conserves magazine and reserve",
        () => {
          setup();
          const p = g.player;
          g.updateCamera(0.1);
          g.camera.updateMatrixWorld(true);
          g.shoot();
          assert(p.ammo[0] === 29, "shot not counted");
          g.reload();
          tick(2.5);
          assert(
            p.ammo[0] === 30 && p.reserve[0] === 149,
            "reload accounting incorrect",
          );
          g.player.cooldown = 0;
          g.shoot();
          g.reload();
          tick(2.5);
          assert(
            p.ammo[0] === 30 && p.reserve[0] === 148,
            "second reload failed",
          );
          g.switchWeapon(1);
          tick(0.3);
          assert(p.weapon === 1 && g.weaponModels[1].visible, "switch failed");
        },
      );
      await check(
        "Hitscan defeats a visible opponent and records kill / damage",
        () => {
          setup();
          const p = g.player,
            b = g.bots[0];
          p.x = 0;
          p.z = 52;
          p.y = 5;
          p.yaw = 0;
          p.pitch = 0;
          b.x = 0;
          b.z = 40;
          b.y = 5;
          b.hp = 20;
          b.armor = 0;
          b.model.root.position.set(0, 5, 40);
          g.updateCamera(0.1);
          g.camera.updateMatrixWorld(true);
          g.shoot();
          assert(!b.alive, "aimed shot missed target");
          assert(p.kills === 1 && p.hits === 1, "kill not recorded");
        },
      );
      await check("A solid house wall blocks bullets", () => {
        setup();
        const p = g.player,
          b = g.bots[0];
        p.x = -17;
        p.z = -31;
        p.y = 5;
        p.yaw = Math.PI;
        p.pitch = 0;
        b.x = -17;
        b.z = -20;
        b.y = 5;
        b.hp = 100;
        b.armor = 0;
        g.updateCamera(0.1);
        g.camera.updateMatrixWorld(true);
        g.shoot();
        assert(b.hp === 100, "bullet passed through wall");
      });
      await check(
        "Loot pickup updates ammo; health restores and movement cancels it",
        () => {
          setup();
          const p = g.player;
          g.addLoot(p.x, p.z, "ammo");
          g.updatePlayer(0.01);
          const n = p.reserve[0];
          g.pickup();
          assert(p.reserve[0] === n + 60, "pickup failed");
          p.hp = 20;
          g.heal();
          tick(3.7);
          assert(p.hp === 90 && p.meds === 2, "healing accounting failed");
          g.heal();
          g.keys.add("KeyW");
          tick(0.1);
          g.keys.clear();
          assert(p.heal === 0 && p.meds === 2, "moving did not cancel heal");
        },
      );
      await check("Grenade has a fuse and area damage", () => {
        setup();
        const p = g.player;
        g.updateCamera(0.1);
        g.camera.updateMatrixWorld(true);
        g.throwGrenade();
        assert(
          p.grenades === 2 && g.grenades.length === 1,
          "grenade not thrown",
        );
        const grenade = g.grenades[0],
          b = g.bots[0];
        b.x = 0;
        b.z = 40;
        b.y = 5;
        b.hp = 20;
        b.armor = 0;
        grenade.mesh.position.set(0, 5.2, 40);
        grenade.v.set(0, 0, 0);
        grenade.fuse = 0.01;
        g.updateGrenades(0.02);
        assert(g.grenades.length === 0 && !b.alive, "explosion failed");
      });
      await check(
        "Bots acquire targets, shoot, and reduce health in live mode",
        () => {
          setup();
          g.training = false;
          g.time = 12;
          g.rng = () => 0.1;
          g.zone = zoneAt(12);
          const b = g.bots[0];
          b.x = 0;
          b.z = 42;
          b.y = 5;
          b.fire = 0;
          b.think = 0;
          b.hp = 100;
          const before = g.player.hp;
          tick(12);
          assert(
            g.player.hp < before || g.player.armor < 75,
            "AI never hit player",
          );
        },
      );
      await check(
        "Pause freezes the match and resume preserves the state",
        () => {
          setup();
          const p = g.player;
          g.pause();
          assert(g.mode === "paused", "did not pause");
          const t = g.time;
          tick(3);
          assert(g.time === t, "paused clock advanced");
          g.resume();
          assert(g.mode === "playing" && g.player === p, "resume lost state");
        },
      );
      await check(
        "Zone damage ends the match and replay resets every resource",
        () => {
          setup();
          g.training = false;
          g.time = 420;
          g.player.hp = 1;
          g.player.x = 220;
          g.player.z = 0;
          tick(0.2);
          assert(
            g.mode === "ended" && !g.result.win,
            "zone did not finish match",
          );
          assert(g.result.rank > 1, "rank invalid");
          g.start(true);
          assert(
            g.player.hp === 100 &&
              g.player.kills === 0 &&
              g.player.ammo[0] === 30,
            "replay did not reset",
          );
        },
      );
      await check("Eliminating all opponents awards first place", () => {
        setup();
        for (const b of g.bots) g.killBot(b, true);
        assert(
          g.mode === "ended" && g.result.win && g.result.rank === 1,
          "no victory",
        );
        assert(g.result.kills === 23, "final kill count invalid");
      });
      await check(
        "Three consecutive restarts preserve bot / loot counts",
        () => {
          let count;
          for (let i = 0; i < 3; i++) {
            setup();
            count ??= g.loot.length;
            assert(
              g.bots.length === 23 && g.loot.length === count,
              "restart leaked entities",
            );
          }
        },
      );
      await check(
        "Autoplay uses live combat, scores hits and restores normal play",
        () => {
          const statsBefore = localStorage.getItem("lastlight-stats");
          g.start(false, { demo: true, seed: 260926 });
          tick(55);
          assert(g.player.shots > 0, "autoplay never fired");
          assert(
            g.player.hits > 0 && g.player.kills > 0,
            "autoplay never hit or eliminated a bot",
          );
          assert(
            g.player.ammo.every((n) => n >= 0),
            "autoplay bypassed ammo rules",
          );
          assert(g.player.hp > 0, "autoplay did not survive the demo");
          output.textContent += `\nDemo: ${g.player.kills} kills, ${g.player.shots} shots, ${Math.round(g.player.hp)} HP`;
          g.end(false, "TEST");
          assert(
            localStorage.getItem("lastlight-stats") === statsBefore,
            "demo changed player stats",
          );
          g.lobby();
          assert(
            !g.demo && !g.pilot && !g.keys.size,
            "demo controls leaked into lobby",
          );
          g.start(true);
          assert(!g.demo && !g.pilot, "normal play still uses autoplay");
        },
      );
      await check(
        "Autoplay completes whole matches across three seeds without stalled spinning",
        async () => {
          const summaries = [];
          for (const seed of [260926, 1337, 2026]) {
            g.start(false, { demo: true, seed });
            let windowStart = 0,
              windowTravel = 0,
              windowHits = 0,
              maxIdle = 0;
            for (let i = 0; i < 480 * 30 && g.active; i++) {
              g.advance(1 / 30);
              if (g.time - windowStart >= 12) {
                const movement = g.pilot.travel - windowTravel,
                  hits = g.player.hits - windowHits;
                if (movement < 2 && !hits && g.time > 15) maxIdle++;
                else maxIdle = 0;
                assert(
                  maxIdle < 2,
                  `seed ${seed} stalled at ${Math.round(g.time)}s (${g.pilot.state})`,
                );
                windowStart = g.time;
                windowTravel = g.pilot.travel;
                windowHits = g.player.hits;
                await new Promise((resolve) => setTimeout(resolve, 0));
              }
            }
            assert(g.mode === "ended", `seed ${seed} never finished`);
            assert(
              g.pilot.travel > 80,
              `seed ${seed} made no navigational progress`,
            );
            summaries.push({
              seed,
              seconds: Math.round(g.time),
              kills: g.player.kills,
              travel: Math.round(g.pilot.travel),
              rank: g.result.rank,
            });
          }
          panel.dataset.matches = JSON.stringify(summaries);
        },
      );
      if (document.body.classList.contains("touch-device"))
        await check(
          "Every mobile action is inside the safe frame and reachable",
          () => {
            setup();
            panel.style.display = "none";
            try {
              const frame = document
                .querySelector("#app")
                .getBoundingClientRect();
              const controls = [
                "joystick",
                "touch-shoot",
                "touch-aim",
                "touch-jump",
                "touch-reload",
                "touch-pickup",
                "touch-sprint",
                "touch-crouch",
                "pause-button",
                "sound-button",
                "heal-button",
                "grenade-button",
                "minimap-open",
              ].map((id) => document.getElementById(id));
              controls.push(
                ...document.querySelectorAll("#weapon-slots button"),
              );
              for (const el of controls) {
                const id = el.id || el.getAttribute("aria-label"),
                  r = el.getBoundingClientRect();
                assert(r.width >= 38 && r.height >= 38, `${id} too small`);
                assert(
                  r.left >= frame.left - 1 &&
                    r.right <= frame.right + 1 &&
                    r.top >= frame.top - 1 &&
                    r.bottom <= frame.bottom + 1,
                  `${id} clipped`,
                );
                const hit = document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                );
                assert(
                  el === hit || el.contains(hit),
                  `${id} covered by ${hit?.id || hit?.className}`,
                );
              }
            } finally {
              panel.style.display = "";
            }
          },
        );
    } finally {
      g.lobby();
      g.testing = false;
      g.requestLock = lock;
      audio.setVolume(savedVolume);
    }
    const passed = results.filter((r) => r.pass).length;
    output.textContent += `\n\n${passed}/${results.length} passed`;
    panel.dataset.result = passed === results.length ? "pass" : "fail";
    panel.dataset.passed = passed;
    panel.dataset.total = results.length;
    console.info("INTEGRATION_RESULTS " + JSON.stringify(results));
  };
}
