// Star Salvage, a best-game-01 entry (Node 22, standard library only): pilot a salvage drone
// through an asteroid belt, in this directory's game/ folder — plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library and no network request),
// and the program hands it in. It copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
// The drone flies with inertia, aims its turret with the mouse, and shoots asteroids that split
// into smaller ones; collected salvage builds a combo up to x5 and raises the level every 15
// salvage, a shield pickup absorbs one hit, and 75 salvage clears the sector. Three hull, a pause
// screen, and synthesised WebAudio sound, all drawn on canvas. The 4 screenshots in screenshots/
// are deterministic scenes (seeded, ?shot=...&seed=1, listed in shots.json); the first by name is
// the cover.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Fail at once, with a plain message, when a file the hand-in needs is not beside this file. */
function requireFile(path: string): void {
  if (!existsSync(path)) {
    process.stderr.write(`best game: missing ${path}: the entry cannot be handed in without it\n`);
    process.exit(2);
  }
}

// The page the browser loads, and every screenshot shots.json promises, must be present before
// anything is copied: a silent partial hand-in would score worse than a clear failure.
requireFile(join(here, 'game', 'index.html'));
let expectedShots: string[];
try {
  expectedShots = (JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8')) as { name: string }[]).map(
    (shot) => shot.name,
  );
} catch {
  process.stderr.write('best game: shots.json beside main.ts is not a JSON list of {name} shots\n');
  process.exit(2);
}
for (const name of expectedShots) requireFile(join(here, 'screenshots', name));

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
