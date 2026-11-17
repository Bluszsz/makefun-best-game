// Synthesised sound only: every effect is a short WebAudio oscillator (plus a
// filtered noise burst for explosions), so the game ships no audio files and
// makes no network request. The context is created lazily on the first user
// gesture, so browsers never autoplay sound before the player acts.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freqFrom, freqTo, duration, type, volume, delay) {
    if (!ensure() || muted) return;
    const start = context.currentTime + (delay || 0);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(duration, volume, cutoff) {
    if (!ensure() || muted) return;
    const start = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    /** Call from any gesture handler; safe to call repeatedly. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    shoot() {
      tone(720, 240, 0.09, 'square', 0.25);
    },
    pickup(combo) {
      const base = 520 + combo * 90;
      tone(base, base * 1.5, 0.12, 'sine', 0.4);
      tone(base * 2, base * 2.4, 0.1, 'sine', 0.18, 0.05);
    },
    breakRock() {
      noise(0.22, 0.5, 900);
      tone(180, 60, 0.2, 'triangle', 0.35);
    },
    hit() {
      noise(0.35, 0.6, 600);
      tone(220, 45, 0.35, 'sawtooth', 0.4);
    },
    shield() {
      tone(330, 660, 0.25, 'sine', 0.35);
      tone(660, 990, 0.2, 'sine', 0.2, 0.08);
    },
    levelUp() {
      const notes = [523, 659, 784, 1047];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], notes[i], 0.16, 'triangle', 0.32, i * 0.09);
    },
    win() {
      const notes = [523, 659, 784, 1047, 1319];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], notes[i], 0.22, 'triangle', 0.32, i * 0.12);
    },
    lose() {
      const notes = [392, 330, 262, 196];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], notes[i] * 0.9, 0.3, 'sawtooth', 0.25, i * 0.16);
    },
  };
}
