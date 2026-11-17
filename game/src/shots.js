// The screenshot scenes behind ?shot=start|play|action|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (chase the nearest salvage, shoot the nearest rock, veer
// away from rocks that get too close), so the frame is what a real game looks
// like and the same seed always gives the same frame. The end scene's pilot
// never moves or fires, so the belt catches it — as a hurried player is.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const ACTION_SECONDS = 85;
const END_LIMIT_SECONDS = 600;

/** Nearest active salvage (either kind) to the drone, or null. */
function nearestSalvage(state) {
  const drone = state.drone;
  let best = null;
  let bestD = Infinity;
  for (const s of state.salvage) {
    if (!s.active) continue;
    const dx = s.x - drone.x;
    const dy = s.y - drone.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Nearest active asteroid to the drone, or null. */
function nearestAsteroid(state) {
  const drone = state.drone;
  let best = null;
  let bestD = Infinity;
  for (const a of state.asteroids) {
    if (!a.active) continue;
    const dx = a.x - drone.x;
    const dy = a.y - drone.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return { asteroid: best, dist: Math.sqrt(bestD) };
}

/** The good pilot: chase salvage, dodge close rocks, shoot the nearest rock. */
function autopilot(state) {
  const drone = state.drone;
  const salvage = nearestSalvage(state);
  const { asteroid, dist } = nearestAsteroid(state);
  let tx = salvage ? salvage.x : FIELD.width / 2;
  let ty = salvage ? salvage.y : FIELD.height / 2;
  if (asteroid && dist < 170) {
    // A rock this close wins over the salvage: run from it.
    tx = drone.x + (drone.x - asteroid.x);
    ty = drone.y + (drone.y - asteroid.y);
  }
  const dx = tx - drone.x;
  const dy = ty - drone.y;
  const move = {
    x: dx > 24 ? 1 : dx < -24 ? -1 : 0,
    y: dy > 24 ? 1 : dy < -24 ? -1 : 0,
  };
  let aim = Math.atan2(dy, dx);
  let firing = false;
  if (asteroid && dist < 540) {
    aim = Math.atan2(asteroid.y - drone.y, asteroid.x - drone.x);
    firing = true;
  }
  return { move, aim, firing };
}

function simulate(world, seconds, pilot) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const { move, aim, firing } = pilot(world.state);
    events = world.step(STEP, move, aim, firing, false);
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  return events;
}

/**
 * Set `world` to the named scene (start, play, action or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'action' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, -Math.PI / 2, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    const idle = () => ({ move: { x: 0, y: 0 }, aim: -Math.PI / 2, firing: false });
    simulate(world, END_LIMIT_SECONDS, idle);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  const seconds = name === 'action' ? ACTION_SECONDS : PLAY_SECONDS;
  const events = simulate(world, seconds, autopilot);
  if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
  const over = world.state.hull === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
