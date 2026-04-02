// Web Audio API sound effects — no external files needed
// AudioContext is created lazily on first user interaction to satisfy browser autoplay policies.

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15, delay = 0) {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch {
    // Silent fail if audio isn't available
  }
}

// Egg logged — satisfying "plop" + twinkle
export function playEggLogged() {
  playTone(300, 0.15, "sine", 0.25);
  playTone(500, 0.12, "sine", 0.2, 0.08);
  playTone(700, 0.2, "sine", 0.15, 0.15);
}

// Click — subtle tick
export function playClick() {
  playTone(800, 0.06, "square", 0.08);
}

// Plus/increment — ascending blip
export function playPlus() {
  playTone(440, 0.1, "sine", 0.15);
  playTone(560, 0.1, "sine", 0.12, 0.06);
}

// Minus/decrement — descending blip
export function playMinus() {
  playTone(560, 0.1, "sine", 0.15);
  playTone(440, 0.1, "sine", 0.12, 0.06);
}

// Collector toggled — soft pop
export function playToggle() {
  playTone(600, 0.08, "sine", 0.12);
}
