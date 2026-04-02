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
  } catch {}
}

// Chicken squawk — short nasal burst with rapid pitch bend (bawk!)
function playSquawk(pitchStart: number, pitchEnd: number, volume = 0.2) {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // Main squawk — sawtooth for that raspy chicken quality
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(pitchStart, now);
    osc1.frequency.exponentialRampToValueAtTime(pitchEnd, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(pitchStart * 0.7, now + 0.12);
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.setValueAtTime(volume * 0.8, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Noise burst layer for the "cluck" texture
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(pitchStart * 1.5, now);
    noiseFilter.Q.setValueAtTime(5, now);
    noiseGain.gain.setValueAtTime(volume * 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.1);
  } catch {}
}

// Plus button — upward squawk (bawk!)
export function playPlus() {
  playSquawk(400, 800, 0.18);
}

// Minus button — downward squawk (buk!)
export function playMinus() {
  playSquawk(700, 350, 0.15);
}

// Egg logged — rooster crow (cock-a-doodle-doo!)
export function playEggLogged() {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // Phase 1: "cock" — short sharp rising note
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = "sawtooth";
    o1.frequency.setValueAtTime(400, now);
    o1.frequency.exponentialRampToValueAtTime(900, now + 0.1);
    g1.gain.setValueAtTime(0.2, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    o1.connect(g1); g1.connect(ctx.destination);
    o1.start(now); o1.stop(now + 0.12);

    // Phase 2: "a" — brief middle note
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = "sawtooth";
    o2.frequency.setValueAtTime(700, now + 0.14);
    o2.frequency.exponentialRampToValueAtTime(600, now + 0.22);
    g2.gain.setValueAtTime(0.15, now + 0.14);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    o2.connect(g2); g2.connect(ctx.destination);
    o2.start(now + 0.14); o2.stop(now + 0.24);

    // Phase 3: "doodle" — warbling high note
    const o3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    o3.type = "sawtooth";
    o3.frequency.setValueAtTime(800, now + 0.26);
    o3.frequency.exponentialRampToValueAtTime(1100, now + 0.35);
    o3.frequency.exponentialRampToValueAtTime(900, now + 0.42);
    o3.frequency.exponentialRampToValueAtTime(1050, now + 0.48);
    g3.gain.setValueAtTime(0.18, now + 0.26);
    g3.gain.setValueAtTime(0.15, now + 0.4);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    o3.connect(g3); g3.connect(ctx.destination);
    o3.start(now + 0.26); o3.stop(now + 0.5);

    // Phase 4: "doo" — long sustained descending note
    const o4 = ctx.createOscillator();
    const g4 = ctx.createGain();
    o4.type = "sawtooth";
    o4.frequency.setValueAtTime(1000, now + 0.52);
    o4.frequency.exponentialRampToValueAtTime(500, now + 0.9);
    o4.frequency.exponentialRampToValueAtTime(350, now + 1.1);
    g4.gain.setValueAtTime(0.2, now + 0.52);
    g4.gain.setValueAtTime(0.15, now + 0.7);
    g4.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    o4.connect(g4); g4.connect(ctx.destination);
    o4.start(now + 0.52); o4.stop(now + 1.1);

    // Noise texture over the whole crow for breathiness
    const bufSize = ctx.sampleRate * 1.1;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1);
    const ns = ctx.createBufferSource();
    ns.buffer = buf;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass"; nf.frequency.setValueAtTime(1200, now); nf.Q.setValueAtTime(3, now);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.04, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    ns.connect(nf); nf.connect(ng); ng.connect(ctx.destination);
    ns.start(now); ns.stop(now + 1.1);
  } catch {}
}

// Click — subtle tick
export function playClick() {
  playTone(800, 0.06, "square", 0.08);
}

// Collector toggled — soft pop
export function playToggle() {
  playTone(600, 0.08, "sine", 0.12);
}
