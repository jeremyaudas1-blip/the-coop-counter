// Real chicken sound effects using audio files
// Files are in /public/sounds/ — served as static assets

let cluckAudio: HTMLAudioElement | null = null;
let roosterAudio: HTMLAudioElement | null = null;
let clickAudio: AudioContext | null = null;

function getClickCtx(): AudioContext {
  if (!clickAudio) clickAudio = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (clickAudio.state === "suspended") clickAudio.resume();
  return clickAudio;
}

function preload() {
  if (!cluckAudio) {
    cluckAudio = new Audio("./sounds/cluck.mp3");
    cluckAudio.preload = "auto";
    cluckAudio.volume = 0.7;
  }
  if (!roosterAudio) {
    roosterAudio = new Audio("./sounds/rooster.mp3");
    roosterAudio.preload = "auto";
    roosterAudio.volume = 0.6;
  }
}

function playAudioClip(audio: HTMLAudioElement | null) {
  if (!audio) return;
  // Reset to start so rapid taps re-trigger
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// Plus button — chicken cluck
export function playPlus() {
  preload();
  if (cluckAudio) {
    cluckAudio.playbackRate = 1.1; // slightly higher pitch for "up"
    playAudioClip(cluckAudio);
  }
}

// Minus button — chicken cluck (lower pitch)
export function playMinus() {
  preload();
  if (cluckAudio) {
    cluckAudio.playbackRate = 0.85; // lower pitch for "down"
    playAudioClip(cluckAudio);
  }
}

// Log Eggs — rooster crow
export function playEggLogged() {
  preload();
  playAudioClip(roosterAudio);
}

// Subtle UI click (synthesized — keeps it light)
export function playClick() {
  try {
    const ctx = getClickCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

// Collector toggle — soft pop (synthesized)
export function playToggle() {
  try {
    const ctx = getClickCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.08);
  } catch {}
}
