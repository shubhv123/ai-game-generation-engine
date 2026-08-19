/**
 * ZzFX Micro Sound Synthesizer & Procedural Chiptune Engine
 * Built for Venator Arcade — 100% Client-Side Web Audio API Synthesis.
 * Zero external audio files, zero network latency.
 */

// ZzFX Core Audio Engine
let zzfxX = null;
const zzfxR = 44100;
let zzfxV = 0.35; // Master Volume

function getZzfxContext() {
  if (!zzfxX) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) zzfxX = new AudioCtx();
  }
  if (zzfxX && zzfxX.state === 'suspended') {
    zzfxX.resume();
  }
  return zzfxX;
}

// Global user interaction unlocker
if (typeof window !== 'undefined') {
  ['click', 'mousedown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => getZzfxContext(), { once: true, passive: true });
  });
}

// ZzFX Sound Generator
export function zzfx(...t) {
  return zzfxP(zzfxG(...t));
}

function zzfxP(...t) {
  const ctx = getZzfxContext();
  if (!ctx) return null;
  const e = ctx.createBufferSource();
  const f = ctx.createBuffer(t.length, t[0].length, zzfxR);
  t.map((d, i) => f.getChannelData(i).set(d));
  e.buffer = f;
  e.connect(ctx.destination);
  e.start();
  return e;
}

function zzfxG(
  q = 1,
  k = 0.05,
  c = 220,
  e = 0,
  t = 0,
  u = 0.1,
  j = 0,
  v = 1,
  m = 0,
  r = 0,
  s = 0,
  h = 0,
  w = 0,
  x = 0,
  y = 0,
  z = 0,
  A = 0,
  l = 1,
  B = 0,
  C = 0
) {
  let b = 2 * Math.PI,
    H = (v *= (500 * b) / zzfxR / zzfxR),
    J = ((1 - k) * zzfxR) | 0,
    D = (c *= ((1 + 2 * e * Math.random() - e) * b) / zzfxR),
    p = [],
    E = 0,
    n = 0,
    a = 0,
    G = 1,
    d = 0,
    F = 0,
    g = 0,
    N = 0,
    P = 0;
  t = (t * zzfxR) | 0;
  u = (u * zzfxR) | 0;
  j = (j * zzfxR) | 0;
  A = (A * zzfxR) | 0;
  B = (B * zzfxR) | 0;
  m *= (500 * b) / zzfxR ** 3;
  x *= b / zzfxR;
  s *= b / zzfxR;
  h = (h * zzfxR) | 0;
  w = (w * zzfxR) | 0;
  z = (z * zzfxR) | 0;
  C *= b / zzfxR;
  for (let K = (t + u + j + A + B) | 0, L = 0; L < K; ++L) {
    ++N >= h && ((N = 0), (d = 2 * Math.random() - 1));
    d && (G = d > 0 ? 1 : -1);
    p[L] =
      (L < t
        ? L / t
        : L < t + u
        ? 1 - ((L - t) / u) * (1 - y)
        : L < t + u + j
        ? y
        : L < K - B
        ? ((K - B - L) / A) * y
        : 0) *
      (L < t + u + j + A ? Math.sin(F) : 1) *
      (L < t + u ? (1 - k) + k * Math.cos(L / J * b) : 1) *
      Math.sin(a);
    a += D += v += m;
    F += x;
    g += s;
    P += C;
    q && (p[L] = p[L] * q);
  }
  return p;
}

// ZzFX Preset Sound Library
export const ZZFX_PRESETS = {
  laser: [1.2, 0, 850, 0.03, 0.25, 0.5, 1, 1.2, 0, -9.4, 0, 0, 0, 0.1, 0, 0, 0, 0.6, 0.04, 0],
  shoot: [1.2, 0, 850, 0.03, 0.25, 0.5, 1, 1.2, 0, -9.4, 0, 0, 0, 0.1, 0, 0, 0, 0.6, 0.04, 0],
  bullet: [1.2, 0, 850, 0.03, 0.25, 0.5, 1, 1.2, 0, -9.4, 0, 0, 0, 0.1, 0, 0, 0, 0.6, 0.04, 0],
  explosion: [1.5, 0, 25, 0.04, 0, 0.4, 4, 1.9, 0, 0.1, 0, 0, 0.05, 0, 0, 0, 0, 0, -0.01, 0],
  hit: [1.4, 0, 80, 0.01, 0.05, 0.15, 1, 1.2, -9, 0, 0, 0, 0, 0.1, 0, 0, 0, 0.5, 0, 0],
  coin: [1.2, 0, 537, 0.02, 0.02, 0.22, 1, 1.59, -6.9, 0.5, 0, 0, 0, 1, 0, 0.1, 0, 0, 0, 0],
  pickup: [1.2, 0, 537, 0.02, 0.02, 0.22, 1, 1.59, -6.9, 0.5, 0, 0, 0, 1, 0, 0.1, 0, 0, 0, 0],
  jump: [1.3, 0, 140, 0.01, 0.1, 0.2, 1, 1.5, -4.4, 0, 0, 0, 0, 0.2, 0, 0, 0, -0.04, 0, 0],
  powerup: [1.2, 0, 250, 0.01, 0.05, 0.2, 1, 1.1, -7, 0, 0, 0, 0, 0.1, 0, 0, 0, 0.4, 0, 0],
  gameover: [1.5, 0, 120, 0.05, 0.1, 0.3, 1, 1.1, -10, 0, 0, 0, 0, 0.1, 0, 0, 0, 0.7, 0, 0],
  win: [1.3, 0, 523, 0.05, 0.05, 0.35, 1, 1.3, -5, 0, 0, 0, 0, 0.1, 0, 0, 0, 0.6, 0, 0],
  click: [0.8, 0, 300, 0, 0.02, 0.02, 0, 1.5, -10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

class SoundManager {
  constructor() {
    this.sfxEnabled = true;
    this.bgmEnabled = false;
    this.bgmTimer = null;
    this.currentStep = 0;
  }

  init() {
    getZzfxContext();
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  toggleBGM() {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.startChiptuneBGM();
    } else {
      this.stopChiptuneBGM();
    }
    return this.bgmEnabled;
  }

  playSound(name) {
    if (!this.sfxEnabled) return;
    this.init();
    const key = (name || 'click').toLowerCase();
    const preset = ZZFX_PRESETS[key] || ZZFX_PRESETS.click;
    try {
      zzfx(...preset);
    } catch (e) {
      console.warn('[SoundManager] zzfx error:', e);
    }
  }

  playClick() { this.playSound('click'); }
  playJump() { this.playSound('jump'); }
  playCoin() { this.playSound('coin'); }
  playLaser() { this.playSound('laser'); }
  playExplosion() { this.playSound('explosion'); }
  playPowerup() { this.playSound('powerup'); }
  playHit() { this.playSound('hit'); }
  playGameOver() { this.playSound('gameover'); }
  playWin() { this.playSound('win'); }

  // Procedural Chiptune BGM Generator
  startChiptuneBGM() {
    this.init();
    const ctx = getZzfxContext();
    if (!ctx) return;
    this.stopChiptuneBGM();
    this.bgmEnabled = true;

    const melody = [
      261.63, 329.63, 392.00, 523.25,
      392.00, 329.63, 261.63, 196.00,
      220.00, 261.63, 329.63, 440.00,
      392.00, 329.63, 293.66, 261.63
    ];
    const bass = [130.81, 130.81, 164.81, 196.00, 110.00, 110.00, 146.83, 130.81];
    const tempo = 135;
    const stepDuration = (60 / tempo) * 0.5;

    this.bgmTimer = setInterval(() => {
      if (!this.bgmEnabled || !zzfxX) return;
      const now = zzfxX.currentTime;
      const noteFreq = melody[this.currentStep % melody.length];
      const bassFreq = bass[Math.floor(this.currentStep / 2) % bass.length];

      try {
        const leadOsc = zzfxX.createOscillator();
        const leadGain = zzfxX.createGain();
        leadOsc.type = 'square';
        leadOsc.frequency.setValueAtTime(noteFreq, now);
        leadGain.gain.setValueAtTime(0.035, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.85);
        leadOsc.connect(leadGain);
        leadGain.connect(zzfxX.destination);
        leadOsc.start(now);
        leadOsc.stop(now + stepDuration * 0.9);

        if (this.currentStep % 2 === 0) {
          const bassOsc = zzfxX.createOscillator();
          const bassGain = zzfxX.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(bassFreq, now);
          bassGain.gain.setValueAtTime(0.05, now);
          bassGain.gain.exponentialRampToValueAtTime(0.005, now + stepDuration * 1.8);
          bassOsc.connect(bassGain);
          bassGain.connect(zzfxX.destination);
          bassOsc.start(now);
          bassOsc.stop(now + stepDuration * 1.85);
        }
      } catch (e) {}

      this.currentStep = (this.currentStep + 1) % 64;
    }, stepDuration * 1000);
  }

  stopChiptuneBGM() {
    this.bgmEnabled = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
if (typeof window !== 'undefined') {
  window.soundManager = soundManager;
  window.zzfx = zzfx;
  window.playSound = (name) => soundManager.playSound(name);
}
