// The game's rules and state, with no drawing and no browser in it: the
// salvage drone, drifting asteroids that split when shot, floating salvage,
// bullets, particles, combo, levels and the win/lose conditions. step()
// advances one fixed step and returns what happened as bit flags, so the
// caller can react (sound, announcements) without the world knowing about
// screens. Nothing here allocates after createWorld returns.
import { ASTEROID, DRONE, FIELD, HULL, LEVEL, POOL, SALVAGE, SHIELD } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_BREAK = 4;
export const EVENT_LEVEL = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;
export const EVENT_SHIELD = 64;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: random() * FIELD.width, y: random() * FIELD.height, size: 0.6 + random() * 1.8, twinkle: random() * Math.PI * 2 });
  }

  const drone = { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invulnerable: 0, shield: false };

  const asteroids = [];
  for (let i = 0; i < POOL.asteroid; i += 1) {
    asteroids.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 0, angle: 0, spin: 0, hp: 1, verts: [] });
  }
  const bullets = [];
  for (let i = 0; i < POOL.bullet; i += 1) bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const salvageItems = [];
  for (let i = 0; i < POOL.salvage; i += 1) {
    salvageItems.push({ active: false, kind: 'salvage', x: 0, y: 0, vx: 0, vy: 0, radius: 13, pulse: 0 });
  }
  const particles = [];
  for (let i = 0; i < POOL.particle; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
  }

  const state = {
    stars, drone, asteroids, bullets, salvage: salvageItems, particles,
    score: 0, hull: HULL, level: 1, salvageCount: 0, combo: 1, comboTimer: 0,
    elapsed: 0, asteroidTimer: 1, salvageTimer: 0.6, shieldTimer: SHIELD.interval,
    fireTimer: 0, shake: 0, banner: '', bannerTimer: 0, won: false,
  };

  function reset() {
    drone.x = FIELD.width / 2;
    drone.y = FIELD.height / 2;
    drone.vx = 0;
    drone.vy = 0;
    drone.angle = -Math.PI / 2;
    drone.invulnerable = 0;
    drone.shield = false;
    for (const a of asteroids) a.active = false;
    for (const b of bullets) b.active = false;
    for (const s of salvageItems) s.active = false;
    for (const p of particles) p.active = false;
    state.score = 0;
    state.hull = HULL;
    state.level = 1;
    state.salvageCount = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.elapsed = 0;
    state.asteroidTimer = 1;
    state.salvageTimer = 0.6;
    state.shieldTimer = SHIELD.interval;
    state.fireTimer = 0;
    state.shake = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.won = false;
  }

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (!p) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = 0.35 + random() * 0.45;
      p.life = p.maxLife;
      p.size = 1.5 + random() * 2.5;
      p.color = color;
    }
  }

  function spawnAsteroid(radius, x, y, vx, vy) {
    const a = free(asteroids);
    if (!a) return null;
    a.active = true;
    a.radius = radius;
    a.x = x;
    a.y = y;
    a.vx = vx;
    a.vy = vy;
    a.angle = random() * Math.PI * 2;
    a.spin = (random() - 0.5) * 1.6;
    a.hp = radius > ASTEROID.smallRadius + 4 ? 2 : 1;
    a.verts.length = 0;
    const n = 9;
    for (let i = 0; i < n; i += 1) a.verts.push(0.78 + random() * 0.28);
    return a;
  }

  function spawnAsteroidFromEdge() {
    let active = 0;
    for (const a of asteroids) if (a.active) active += 1;
    if (active >= ASTEROID.maxActive) return;
    const speed = ASTEROID.baseSpeed + ASTEROID.speedPerLevel * (state.level - 1) + random() * 45;
    const side = Math.floor(random() * 4);
    let x = 0;
    let y = 0;
    let angle = 0;
    if (side === 0) { x = -40; y = random() * FIELD.height; angle = (random() - 0.5) * 1.4; }
    else if (side === 1) { x = FIELD.width + 40; y = random() * FIELD.height; angle = Math.PI + (random() - 0.5) * 1.4; }
    else if (side === 2) { x = random() * FIELD.width; y = -40; angle = Math.PI / 2 + (random() - 0.5) * 1.4; }
    else { x = random() * FIELD.width; y = FIELD.height + 40; angle = -Math.PI / 2 + (random() - 0.5) * 1.4; }
    spawnAsteroid(ASTEROID.largeRadius, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  function spawnSalvage(kind) {
    const s = free(salvageItems);
    if (!s) return;
    s.active = true;
    s.kind = kind;
    s.x = 60 + random() * (FIELD.width - 120);
    s.y = 90 + random() * (FIELD.height - 180);
    s.vx = (random() - 0.5) * 24;
    s.vy = (random() - 0.5) * 24;
    s.radius = kind === 'shield' ? SHIELD.radius : 13;
    s.pulse = random() * Math.PI * 2;
  }

  function fireBullet() {
    const b = free(bullets);
    if (!b) return;
    b.active = true;
    b.x = drone.x + Math.cos(drone.angle) * (DRONE.radius + 8);
    b.y = drone.y + Math.sin(drone.angle) * (DRONE.radius + 8);
    b.vx = Math.cos(drone.angle) * DRONE.bulletSpeed + drone.vx * 0.4;
    b.vy = Math.sin(drone.angle) * DRONE.bulletSpeed + drone.vy * 0.4;
    b.life = 1.1;
  }

  function asteroidInterval() {
    return Math.max(ASTEROID.minInterval, ASTEROID.baseInterval * ASTEROID.intervalScale ** (state.level - 1));
  }

  /**
   * One fixed step. `move` is {x, y} in -1..1, `aim` the turret angle in
   * radians, `firing` whether the trigger is held. With `harmless` set (the
   * title screen's backdrop) things drift but nothing touches the drone and
   * nothing scores.
   */
  function step(dt, move, aim, firing, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }

    // Drone: accelerate toward the steering vector, drag, clamp to the field.
    drone.vx += move.x * DRONE.accel * dt;
    drone.vy += move.y * DRONE.accel * dt;
    const drag = Math.max(0, 1 - DRONE.drag * dt);
    drone.vx *= drag;
    drone.vy *= drag;
    const speed = Math.hypot(drone.vx, drone.vy);
    if (speed > DRONE.maxSpeed) {
      drone.vx = (drone.vx / speed) * DRONE.maxSpeed;
      drone.vy = (drone.vy / speed) * DRONE.maxSpeed;
    }
    drone.x = Math.min(FIELD.width - DRONE.radius, Math.max(DRONE.radius, drone.x + drone.vx * dt));
    drone.y = Math.min(FIELD.height - DRONE.radius, Math.max(DRONE.radius, drone.y + drone.vy * dt));
    drone.angle = aim;
    if (drone.invulnerable > 0) drone.invulnerable = Math.max(0, drone.invulnerable - dt);

    // Thrust sparks while moving fast.
    if (speed > 200 && random() < 0.35) {
      const p = free(particles);
      if (p) {
        p.active = true;
        p.x = drone.x - (drone.vx / speed) * DRONE.radius;
        p.y = drone.y - (drone.vy / speed) * DRONE.radius;
        p.vx = -drone.vx * 0.2 + (random() - 0.5) * 40;
        p.vy = -drone.vy * 0.2 + (random() - 0.5) * 40;
        p.maxLife = 0.3;
        p.life = 0.3;
        p.size = 2;
        p.color = '#37e0c8';
      }
    }

    if (!harmless) {
      state.fireTimer -= dt;
      if (firing && state.fireTimer <= 0) {
        fireBullet();
        state.fireTimer = DRONE.fireCooldown;
      }
    }

    // Spawning.
    state.asteroidTimer -= dt;
    if (state.asteroidTimer <= 0) {
      spawnAsteroidFromEdge();
      state.asteroidTimer += asteroidInterval();
    }
    state.salvageTimer -= dt;
    if (state.salvageTimer <= 0) {
      let active = 0;
      for (const s of salvageItems) if (s.active) active += 1;
      if (active < SALVAGE.maxActive) spawnSalvage('salvage');
      state.salvageTimer += SALVAGE.interval;
    }
    state.shieldTimer -= dt;
    if (state.shieldTimer <= 0) {
      spawnSalvage('shield');
      state.shieldTimer += SHIELD.interval;
    }

    // Bullets.
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) b.active = false;
    }

    // Asteroids drift and spin; bullets break them, big ones split in two.
    for (const a of asteroids) {
      if (!a.active) continue;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.angle += a.spin * dt;
      if (a.x < -90 || a.x > FIELD.width + 90 || a.y < -90 || a.y > FIELD.height + 90) {
        a.active = false;
        continue;
      }
      for (const b of bullets) {
        if (!b.active) continue;
        const rr = a.radius + 4;
        if (dist2(b.x, b.y, a.x, a.y) < rr * rr) {
          b.active = false;
          a.hp -= 1;
          burst(b.x, b.y, '#ffd166', 4, 120);
          if (a.hp > 0) break;
          a.active = false;
          events |= EVENT_BREAK;
          if (!harmless) state.score += ASTEROID.breakPoints;
          burst(a.x, a.y, '#c9a582', 14, 220);
          if (a.radius > ASTEROID.smallRadius + 4) {
            const base = Math.atan2(drone.y - a.y, drone.x - a.x);
            for (let k = 0; k < 2; k += 1) {
              const ang = base + (k === 0 ? 0.9 : -0.9);
              spawnAsteroid(ASTEROID.smallRadius, a.x, a.y, Math.cos(ang) * 110, Math.sin(ang) * 110);
            }
          }
          break;
        }
      }
    }

    // Salvage drifts, is magnetised toward the drone up close, and is collected on touch.
    for (const s of salvageItems) {
      if (!s.active) continue;
      s.pulse += dt * 4;
      const d2 = dist2(s.x, s.y, drone.x, drone.y);
      if (d2 < DRONE.magnetRadius * DRONE.magnetRadius) {
        const d = Math.sqrt(d2) || 1;
        s.vx += ((drone.x - s.x) / d) * DRONE.magnetPull * dt;
        s.vy += ((drone.y - s.y) / d) * DRONE.magnetPull * dt;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const rr = DRONE.radius + s.radius + 4;
      if (harmless || d2 >= rr * rr) continue;
      s.active = false;
      if (s.kind === 'shield') {
        drone.shield = true;
        events |= EVENT_SHIELD;
        burst(s.x, s.y, '#6ea8ff', 12, 160);
      } else {
        state.combo = state.comboTimer > 0 ? Math.min(SALVAGE.maxCombo, state.combo + 1) : 1;
        state.comboTimer = SALVAGE.comboWindow;
        state.score += SALVAGE.points * state.combo;
        state.salvageCount += 1;
        events |= EVENT_PICKUP;
        burst(s.x, s.y, '#ff9f1c', 10, 170);
        const level = Math.min(LEVEL.winLevel, 1 + Math.floor(state.salvageCount / LEVEL.salvagePerLevel));
        if (level > state.level) {
          state.level = level;
          state.banner = level >= LEVEL.winLevel ? 'SECTOR CLEARED!' : `LEVEL ${level} — FIELD GETS DENSER`;
          state.bannerTimer = 2.2;
          events |= EVENT_LEVEL;
          if (level >= LEVEL.winLevel) {
            state.won = true;
            events |= EVENT_WIN;
          }
        }
      }
    }

    // Drone vs asteroid: shield absorbs one hit, otherwise lose a hull point.
    if (!harmless && drone.invulnerable === 0) {
      for (const a of asteroids) {
        if (!a.active) continue;
        const rr = a.radius + DRONE.radius - 6;
        if (dist2(a.x, a.y, drone.x, drone.y) >= rr * rr) continue;
        a.active = false;
        burst(a.x, a.y, '#8a6f5c', 12, 200);
        if (drone.shield) {
          drone.shield = false;
          drone.invulnerable = DRONE.invulnerable;
          burst(drone.x, drone.y, '#6ea8ff', 16, 240);
          events |= EVENT_HIT;
          break;
        }
        state.hull -= 1;
        state.combo = 1;
        state.comboTimer = 0;
        drone.invulnerable = DRONE.invulnerable;
        state.shake = 10;
        burst(drone.x, drone.y, '#ff5d73', 22, 300);
        events |= EVENT_HIT;
        if (state.hull <= 0) {
          events |= EVENT_OVER;
          burst(drone.x, drone.y, '#37e0c8', 40, 380);
        }
        break;
      }
    }

    // Particles fade.
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
