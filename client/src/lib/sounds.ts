// Web Audio API sound effects — no external files needed
const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function ensureContext() {
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  if (!audioCtx) return;
  ensureContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Egg logged — satisfying "plop" + twinkle
export function playEggLogged() {
  if (!audioCtx) return;
  ensureContext();
  // Plop
  playTone(300, 0.15, "sine", 0.2);
  setTimeout(() => playTone(500, 0.12, "sine", 0.15), 80);
  setTimeout(() => playTone(700, 0.2, "sine", 0.1), 150);
}

// Click — subtle tick
export function playClick() {
  playTone(800, 0.05, "square", 0.06);
}

// Plus/increment — ascending blip
export function playPlus() {
  playTone(440, 0.08, "sine", 0.1);
  setTimeout(() => playTone(550, 0.08, "sine", 0.08), 50);
}

// Minus/decrement — descending blip
export function playMinus() {
  playTone(550, 0.08, "sine", 0.1);
  setTimeout(() => playTone(440, 0.08, "sine", 0.08), 50);
}

// Badge earned — celebratory fanfare
export function playBadgeEarned() {
  if (!audioCtx) return;
  ensureContext();
  playTone(523, 0.15, "sine", 0.12);
  setTimeout(() => playTone(659, 0.15, "sine", 0.12), 120);
  setTimeout(() => playTone(784, 0.15, "sine", 0.12), 240);
  setTimeout(() => playTone(1047, 0.3, "sine", 0.15), 360);
}

// Collector toggled — soft pop
export function playToggle() {
  playTone(600, 0.06, "sine", 0.08);
}
