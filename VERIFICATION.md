# Verification — 26 September 2026

Production build: passed (`npm run build`). Game served at http://127.0.0.1:5188/.

## Automated logic tests

`npm test`: **8 / 8 passed**.

Coverage: deterministic terrain and RNG; wall collisions and sliding; hitscan obstruction; ray/sphere targeting; continuous six-phase zone closure; armor depletion; elevated surfaces and ceilings; sloped roof support and projectile collision.

## In-engine browser integration checks

Development page `/?test=1`, executed in the Codex in-app browser: **14 / 14 passed**.

- World initialization: 23 bots, supply items, physical obstacles.
- Parachute descent, ground landing, roof landing and transition to combat.
- Walking, sprinting, stamina, crouch and jumping.
- Open doors permit movement; walls prevent passage.
- Shooting, magazine/reserve accounting, repeated reloading and weapon changes.
- Hitscan damage, elimination and kill credit.
- Solid walls stop bullets.
- Supply pickup, healing and movement cancellation.
- Grenade fuse, explosion and area damage.
- Bot target acquisition and attacks on the player.
- Pause/resume preserves state and freezes match time.
- Zone death, placement and fresh match resources on replay.
- Eliminating all opponents awards victory and first place.
- Repeated restarts preserve entity counts.

## Manual browser checks

Verified actual controls for weapon switching, 4× scope, shooting, reloading, map opening/closing, pause, guide, settings and return to lobby. Escape closes a nested menu before resuming gameplay. Production console contained no errors or warnings during the final check.

Inspected rendered UI at 1440×900 and 390×844. Confirmed Vietnamese labels, local font assets, responsive lobby, and unobstructed deployment controls. Touch controls are implemented; no physical touchscreen test was performed.

## Scope

Single-player battle royale against bots. No online multiplayer or drivable vehicles. Procedural stylized 3D models and synthesized audio, with no PUBG asset dependencies. WebGL2 is required. Pointer-lock restrictions in embedded browsers have a drag-to-look and arrow-key fallback. Best experienced with a desktop keyboard and mouse.

## Version 1.2.0 — iPhone & bot demo

- 10 Node tests passed: gameplay core, repository-scoped offline fallback, portable manifest, real PNG dimensions.
- 15 in-engine browser checks passed, including a 55-second autoplay simulation that fires, hits and eliminates opponents, survives, and releases control on returning to the lobby.
- Touch layout inspected at 844×390 and 390×844. Real UI clicks verified shooting (ammo 30 → 29), aim/crouch/sprint toggles, reload, pause/resume and input reset.
- iPhone installation panel visually inspected at 390×844; instructions link to Apple Safari documentation.
- Real gameplay capture: portrait 1080×1920, approximately 55 seconds, with HUD, author credit and a link to play. H.264/AAC MP4 at 30 fps. Audio events are rendered with the game sound engine against a precise offline clock to avoid browser capture drift.
- No physical iPhone hardware was available for this verification; touch layout checks used the desktop browser with a development-only touch override.

- Offline smoke test passed with the production bundle under `/last-light-battlegrounds/`: cache completed, local preview server stopped (HTTP unreachable), page reloaded from service worker, practice match launched with 24 combatants and no console errors. Immutable same-origin asset lookup ignores response Vary differences between precache and module/CSS requests.
- Final Facebook artifact verified by ffprobe: 1080×1920 H.264, 30 fps, 55.000-second MP4; AAC stereo audio duration 55.000 seconds. Final recorded match: 6 eliminations. Audio peak −5.4 dBFS (no clipping).

## Version 1.2.1 — Safari viewport, audio and autoplay (27 September 2026)

- Production build passed; 14/14 Node tests passed. New regressions cover Safari visual viewport resize/zoom/offset, navigation out of a U-shaped enclosure without crossing walls, long turns at 20/30/60 FPS, and synchronous audio unlock plus suspended/closed context recovery.
- 17/17 in-engine browser checks passed at 430×932 with touch controls and simulated safe-area insets. No console warnings or errors. The test includes bounds, minimum hit sizes and center-point occlusion checks for movement, combat, audio, pause, healing, grenades, map and all three weapon buttons.
- Three whole autoplay matches completed with no pair of consecutive 12-second windows lacking both movement and successful hits:

| Seed   | Match time | Eliminations | Distance travelled | Placement |
| ------ | ---------: | -----------: | -----------------: | --------: |
| 260926 |       80 s |           14 |              388 m |         1 |
| 1337   |       93 s |           14 |              413 m |         1 |
| 2026   |      102 s |           13 |              527 m |         1 |

- All 16 mobile controls were inside the usable frame and reachable at 430×932, 390×700, 375×667, 932×430, 844×390 and 667×375. Portrait insets: top 59 / bottom 34 px. Landscape insets: left/right 59 / bottom 21 px. Small landscape layout also inspected visually for overlapping text.
- Actual browser clicks verified sound activation, pause, settings sound test (suspended → ready), and resume. The game requests Safari's `playback` audio session when supported, resumes Web Audio inside the tap, and exposes a visible recovery button. Hardware audio output, Safari toolbar transitions and native pinch gestures still need a physical iPhone check; desktop emulation and API mocks cannot establish those results.
- Screenshot: `exports/iphone-v1.2.1-portrait.png` (local QA artifact, not committed). iPhone installation/troubleshooting instructions updated in `IPHONE.md`.

### Replacement Facebook video

- Re-recorded the fixed v1.2.1 game. Final capture: 10 eliminations, 35 hits, approximately 225 m travelled; telemetry sampled throughout all 55 seconds has no 5-second window with a full stationary spin and no successful hits.
- Capture HUD now draws the minimap and counters above the scope vignette, and removes that vignette during reloads to match the rendered camera. The renderer restores to the usable viewport after capture.
- Final deliverable: `exports/Last-Light-Facebook-HD-v1.2.1.mp4`, 1080×1920, H.264, 30 fps, 55.000 seconds, AAC stereo at 48 kHz, 33,425,702 bytes. Audio event timing comes from the actual recorded match, gain +5 dB, final peak −6.4 dBFS.
- Full-file decode and black-frame scan passed. No freeze longer than one second during gameplay; the detector only flags the intentionally static closing card. Contact sheet and opening/closing frames inspected for text clipping and HUD visibility.
- Versioned source video, WAV, telemetry and QA metadata are in `exports/v1.2.1/`. The default video/cover filenames now point to copies of the corrected assets; original assets are preserved under `exports/v1.2.0/`. Capture tools remain development-only and media stays outside Git.
