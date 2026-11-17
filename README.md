# ★ Star Salvage

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Bluszsz/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Bluszsz/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01)

Pilot a salvage drone through the asteroid belt. Collect **75 salvage** to
clear the sector — blast rocks apart (big ones split in two), chain pickups
for a combo up to **x5**, grab shield pickups that absorb a hit, and survive
a belt that gets denser every level. You have **3 hull**: lose them all and
the drone is lost.

## Play

Serve `game/` statically (no build step) and open it in a desktop browser:

```bash
node serve.ts   # http://localhost:8080
```

Or open `game/index.html` from any static file server. The game is fully
offline: no network requests, no external assets — all art is drawn on
canvas and all sound is synthesised with WebAudio.

| Control | Action |
| --- | --- |
| WASD / Arrow keys | Fly the drone |
| Mouse | Aim the turret |
| Click / hold Space | Fire |
| P / Esc | Pause |
| M | Mute |

## Screenshots

Deterministic scenes, seeded (`?shot=…&seed=1`, `window.__shotReady`):

- `1-start.jpg` — title screen
- `2-play.jpg` — gameplay with HUD (score, salvage, level, hull, combo)
- `3-action.jpg` — level 4, dense belt, combo running
- `4-end.jpg` — game over with score and restart prompt

## Structure

- `game/index.html` — canvas page, nothing else
- `game/src/config.js` — tuning numbers and palette
- `game/src/random.js` — seeded RNG (mulberry32)
- `game/src/audio.js` — synthesised WebAudio effects
- `game/src/input.js` — keyboard + mouse input
- `game/src/world.js` — rules: drone, asteroids, salvage, combo, levels, win/lose
- `game/src/render.js` — drawing only: space, HUD, panels
- `game/src/shots.js` — deterministic screenshot scenes + autopilot
- `game/src/main.js` — boot, fixed-step loop, screens
- `main.ts` — Node 22 stdlib-only entry: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` via `vendor/makefun-game.ts`
- `vendor/makefun-game.ts` — make.fun library, copied from the kit, unmodified

## Licence

MIT — see [LICENSE](LICENSE).
