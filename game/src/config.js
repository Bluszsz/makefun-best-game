// STAR SALVAGE — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const DRONE = {
  radius: 16,
  accel: 1500,
  maxSpeed: 340,
  drag: 2.2,
  fireCooldown: 0.22,
  bulletSpeed: 620,
  invulnerable: 1.6,
  magnetRadius: 130,
  magnetPull: 420,
};

export const HULL = 3;

/** Salvage needed per level; reaching level 6 wins the sector. */
export const LEVEL = { salvagePerLevel: 15, winLevel: 6 };

export const ASTEROID = {
  maxActive: 26,
  baseInterval: 1.15,
  intervalScale: 0.86,
  minInterval: 0.34,
  baseSpeed: 55,
  speedPerLevel: 14,
  largeRadius: 34,
  smallRadius: 17,
  breakPoints: 15,
  hitPoints: 5,
};

export const SALVAGE = {
  maxActive: 7,
  interval: 1.5,
  points: 10,
  comboWindow: 4,
  maxCombo: 5,
};

export const SHIELD = { interval: 26, radius: 14 };

/** How many of each thing can exist at once; pools are allocated once, at boot. */
export const POOL = { asteroid: 40, bullet: 24, salvage: 12, particle: 220 };

export const PALETTE = {
  backdrop: '#070b1a',
  spaceTop: '#0b1030',
  spaceBottom: '#131a3d',
  nebulaA: '#1d2f6e',
  nebulaB: '#3b1d5e',
  star: '#dfe8ff',
  drone: '#37e0c8',
  droneDark: '#0f7a6c',
  bullet: '#ffe066',
  asteroid: '#8a6f5c',
  asteroidDark: '#5d483a',
  asteroidEdge: '#c9a582',
  salvage: '#ff9f1c',
  salvageCore: '#ffd166',
  shield: '#6ea8ff',
  hull: '#ff5d73',
  panel: '#101736',
  panelEdge: '#37e0c8',
  text: '#eef3ff',
  muted: '#9aa7cc',
  gold: '#ffd166',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'star-salvage.best';
