// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Canvas shapes and text only — no image files — in a
// deep-space teal/orange palette that reads at a glance: cyan drone, orange
// salvage, brown-grey asteroids, gold bullets.
import { DRONE, FIELD, FONT, HULL, LEVEL, PALETTE, SALVAGE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const NEBULAE = [
  { x: 210, y: 150, r: 260, color: 'rgba(29,47,110,0.55)' },
  { x: 1080, y: 560, r: 300, color: 'rgba(59,29,94,0.5)' },
  { x: 980, y: 110, r: 190, color: 'rgba(15,122,108,0.28)' },
];

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const levelLabel = cachedLabel('LEVEL ');
  const salvageLabel = cachedLabel('SALVAGE ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Convert CSS-pixel mouse coordinates to field coordinates. */
  function toField(cssX, cssY) {
    const ratio = window.devicePixelRatio || 1;
    return { x: (cssX * ratio - view.x) / view.scale, y: (cssY * ratio - view.y) / view.scale };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawSpace(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.spaceTop);
    gradient.addColorStop(1, PALETTE.spaceBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const nebula of NEBULAE) {
      const glow = context.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
      glow.addColorStop(0, nebula.color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = glow;
      context.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
    }
    for (const star of state.stars) {
      const alpha = 0.45 + 0.55 * Math.abs(Math.sin(state.elapsed * 1.5 + star.twinkle));
      context.globalAlpha = alpha;
      context.fillStyle = PALETTE.star;
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;
  }

  function drawAsteroid(a) {
    context.beginPath();
    for (let i = 0; i < a.verts.length; i += 1) {
      const angle = a.angle + (i / a.verts.length) * Math.PI * 2;
      const r = a.radius * a.verts[i];
      const x = a.x + Math.cos(angle) * r;
      const y = a.y + Math.sin(angle) * r;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = PALETTE.asteroid;
    context.fill();
    context.strokeStyle = PALETTE.asteroidEdge;
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.arc(a.x - a.radius * 0.25, a.y - a.radius * 0.25, a.radius * 0.28, 0, Math.PI * 2);
    context.fillStyle = PALETTE.asteroidDark;
    context.fill();
  }

  function drawSalvage(s) {
    const pulse = 1 + Math.sin(s.pulse) * 0.12;
    if (s.kind === 'shield') {
      context.save();
      context.translate(s.x, s.y);
      context.rotate(s.pulse * 0.4);
      context.strokeStyle = PALETTE.shield;
      context.lineWidth = 3;
      context.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * s.radius * pulse;
        const y = Math.sin(angle) * s.radius * pulse;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.stroke();
      context.fillStyle = PALETTE.shield;
      context.font = `bold 16px ${FONT}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('+', 0, 1);
      context.restore();
      return;
    }
    context.save();
    context.translate(s.x, s.y);
    context.rotate(s.pulse * 0.5);
    context.fillStyle = PALETTE.salvage;
    context.beginPath();
    context.moveTo(0, -s.radius * pulse);
    context.lineTo(s.radius * 0.8 * pulse, 0);
    context.lineTo(0, s.radius * pulse);
    context.lineTo(-s.radius * 0.8 * pulse, 0);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.salvageCore;
    context.beginPath();
    context.moveTo(0, -s.radius * 0.45 * pulse);
    context.lineTo(s.radius * 0.38 * pulse, 0);
    context.lineTo(0, s.radius * 0.45 * pulse);
    context.lineTo(-s.radius * 0.38 * pulse, 0);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawDrone(drone) {
    if (drone.invulnerable > 0 && Math.floor(drone.invulnerable * 10) % 2 === 0) return;
    context.save();
    context.translate(drone.x, drone.y);
    if (drone.shield) {
      context.strokeStyle = PALETTE.shield;
      context.globalAlpha = 0.7;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(0, 0, DRONE.radius + 8, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
    context.rotate(drone.angle + Math.PI / 2);
    // Hull: a sleek arrow-shaped drone.
    context.fillStyle = PALETTE.drone;
    context.beginPath();
    context.moveTo(0, -DRONE.radius);
    context.lineTo(DRONE.radius * 0.8, DRONE.radius * 0.7);
    context.lineTo(0, DRONE.radius * 0.35);
    context.lineTo(-DRONE.radius * 0.8, DRONE.radius * 0.7);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.droneDark;
    context.beginPath();
    context.arc(0, -2, 5, 0, Math.PI * 2);
    context.fill();
    // Turret barrel.
    context.strokeStyle = PALETTE.droneDark;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, -DRONE.radius * 0.4);
    context.lineTo(0, -DRONE.radius - 6);
    context.stroke();
    context.restore();
  }

  function drawField(state, aim) {
    drawSpace(state);
    for (const s of state.salvage) if (s.active) drawSalvage(s);
    for (const a of state.asteroids) if (a.active) drawAsteroid(a);
    for (const b of state.bullets) {
      if (!b.active) continue;
      context.strokeStyle = PALETTE.bullet;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    context.globalAlpha = 1;
    drawDrone(state.drone);
    if (aim) {
      context.strokeStyle = 'rgba(238,243,255,0.8)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(aim.x - 14, aim.y);
      context.lineTo(aim.x - 6, aim.y);
      context.moveTo(aim.x + 6, aim.y);
      context.lineTo(aim.x + 14, aim.y);
      context.moveTo(aim.x, aim.y - 14);
      context.lineTo(aim.x, aim.y - 6);
      context.moveTo(aim.x, aim.y + 6);
      context.lineTo(aim.x, aim.y + 14);
      context.stroke();
    }
  }

  function drawHud(state, muted) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 28, PALETTE.text, 'left', 'bold ');
    text(salvageLabel(`${state.salvageCount}/${LEVEL.salvagePerLevel * (LEVEL.winLevel - 1)}`), 24, 52, 18, PALETTE.gold, 'left');
    text(levelLabel(state.level), FIELD.width / 2, 18, 28, PALETTE.text, 'center', 'bold ');
    if (state.combo > 1) {
      text(`COMBO x${state.combo}`, FIELD.width / 2, 52, 20, PALETTE.salvage, 'center', 'bold ');
      context.fillStyle = PALETTE.salvage;
      context.fillRect(FIELD.width / 2 - 50, 78, 100 * Math.max(0, state.comboTimer / SALVAGE.comboWindow), 5);
    }
    const hearts = '♥'.repeat(state.hull) + '♡'.repeat(Math.max(0, HULL - state.hull));
    text(`HULL ${hearts}`, FIELD.width - 24, 18, 26, PALETTE.hull, 'right', 'bold ');
    if (state.drone.shield) text('SHIELD UP', FIELD.width - 24, 50, 16, PALETTE.shield, 'right', 'bold ');
    text('WASD / Arrows move · Mouse aim · Click / Space fire · P pause · M mute', FIELD.width / 2, FIELD.height - 26, 15, PALETTE.muted, 'center');
    if (muted) text('MUTED', 24, FIELD.height - 26, 15, PALETTE.muted, 'left');
    if (state.bannerTimer > 0) {
      context.textBaseline = 'alphabetic';
      context.globalAlpha = Math.min(1, state.bannerTimer);
      text(state.banner, FIELD.width / 2, 150, 34, PALETTE.gold, 'center', 'bold ');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(7,11,26,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 76, 46, PALETTE.text, 'center', 'bold ');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center', 'bold ');
  }

  const TITLE_LINES = [
    'Pilot a salvage drone through the asteroid belt.',
    'Collect 75 salvage to clear the sector. Blast rocks,',
    'chain pickups for a combo up to x5, grab shields.',
    'Move with WASD or Arrows. Aim with the mouse.',
    'Click or hold Space to fire. 3 hull — good luck, pilot.',
    '',
  ];
  const PAUSED_LINES = ['The belt will wait for you.'];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, aimCss, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    const aim = aimCss ? toField(aimCss.x, aimCss.y) : null;
    drawField(state, screen === SCREEN_PLAY ? aim : null);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('★ STAR SALVAGE ★', TITLE_LINES, 'Press Space or click to launch');
      return;
    }
    drawHud(state, muted);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('DRONE LOST', OVER_LINES, 'Press Space or click to fly again', PALETTE.hull);
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = bestLabel(best);
      drawPanel('SECTOR CLEARED!', WIN_LINES, 'Press Space or click to play again', PALETTE.gold);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
