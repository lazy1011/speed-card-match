'use client';

/**
 * Lightweight sound effects synthesized with the Web Audio API — no audio files
 * needed (nothing to license, host, or preload). UNO-style: shuffle, draw,
 * flip, match alert, claim, wrong-buzz, win fanfare.
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Resume the audio context on the first user gesture (browsers require this). */
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    getCtx();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

/** A single oscillator "blip" with an exponential pitch slide and gain envelope. */
function tone(opts: {
  freq: number;
  type?: OscillatorType;
  duration: number;
  gain?: number;
  slideTo?: number;
  delay?: number;
}) {
  const c = getCtx();
  if (!c || muted) return;
  const start = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + opts.duration);
  const peak = opts.gain ?? 0.15;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + opts.duration + 0.02);
}

/** A short filtered white-noise burst — used for card "swish"/riffle sounds. */
function noise(opts: {
  duration: number;
  gain?: number;
  filterFreq?: number;
  filterType?: BiquadFilterType;
  delay?: number;
}) {
  const c = getCtx();
  if (!c || muted) return;
  const start = c.currentTime + (opts.delay ?? 0);
  const frames = Math.floor(c.sampleRate * opts.duration);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = opts.filterType ?? 'bandpass';
  filter.frequency.value = opts.filterFreq ?? 2500;
  const g = c.createGain();
  const peak = opts.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(start);
  src.stop(start + opts.duration + 0.02);
}

export const sfx = {
  cardPick(selecting: boolean) {
    // Crisp tick up when selecting, soft tick down when deselecting
    if (selecting) {
      noise({ duration: 0.05, gain: 0.22, filterFreq: 4000, filterType: 'bandpass' });
      tone({ freq: 1100, type: 'triangle', duration: 0.07, gain: 0.1, slideTo: 800 });
    } else {
      noise({ duration: 0.04, gain: 0.14, filterFreq: 2500, filterType: 'bandpass' });
      tone({ freq: 650, type: 'triangle', duration: 0.06, gain: 0.08, slideTo: 420 });
    }
  },
  cardPlay() {
    // Whoosh + thud — UNO-style spin to pile
    noise({ duration: 0.18, gain: 0.28, filterFreq: 3500, filterType: 'highpass' });
    noise({ duration: 0.14, gain: 0.18, filterFreq: 900, filterType: 'lowpass', delay: 0.12 });
    tone({ freq: 110, type: 'sine', duration: 0.1, gain: 0.1, delay: 0.14 });
  },
  skip() {
    // Short descending tick
    tone({ freq: 440, type: 'triangle', duration: 0.08, gain: 0.1, slideTo: 300 });
  },
  bluffCaught() {
    // Dramatic reveal — high sting then crash
    tone({ freq: 880, type: 'sawtooth', duration: 0.1, gain: 0.18 });
    tone({ freq: 660, type: 'sawtooth', duration: 0.15, gain: 0.16, delay: 0.08 });
    noise({ duration: 0.3, gain: 0.15, filterFreq: 600, filterType: 'lowpass', delay: 0.18 });
  },
  legitPlay() {
    // Calm rising confirm
    tone({ freq: 523, type: 'triangle', duration: 0.12, gain: 0.14 });
    tone({ freq: 659, type: 'triangle', duration: 0.14, gain: 0.14, delay: 0.1 });
  },
  seriesDiscard() {
    // Soft descending sweep
    tone({ freq: 400, type: 'sine', duration: 0.35, gain: 0.12, slideTo: 180 });
  },
  rankPicked() {
    // Short upward chime — new series starting
    tone({ freq: 600, type: 'triangle', duration: 0.1, gain: 0.14 });
    tone({ freq: 800, type: 'triangle', duration: 0.12, gain: 0.16, delay: 0.08 });
    tone({ freq: 1000, type: 'triangle', duration: 0.14, gain: 0.14, delay: 0.16 });
  },
  draw() {
    // Quick upward swish.
    noise({ duration: 0.18, gain: 0.18, filterFreq: 1800, filterType: 'highpass' });
  },
  flip() {
    // Crisp snap/click.
    noise({ duration: 0.06, gain: 0.25, filterFreq: 3500, filterType: 'bandpass' });
    tone({ freq: 520, type: 'square', duration: 0.05, gain: 0.06 });
  },
  shuffle() {
    // A few riffle bursts in sequence.
    for (let i = 0; i < 6; i++) {
      noise({ duration: 0.07, gain: 0.14, filterFreq: 2200 + i * 120, delay: i * 0.09 });
    }
  },
  match() {
    // Attention chime, two rising notes.
    tone({ freq: 740, type: 'triangle', duration: 0.14, gain: 0.18 });
    tone({ freq: 988, type: 'triangle', duration: 0.18, gain: 0.18, delay: 0.12 });
  },
  claim() {
    // Happy little arpeggio.
    tone({ freq: 660, type: 'triangle', duration: 0.12, gain: 0.16 });
    tone({ freq: 880, type: 'triangle', duration: 0.12, gain: 0.16, delay: 0.1 });
    tone({ freq: 1175, type: 'triangle', duration: 0.16, gain: 0.16, delay: 0.2 });
  },
  wrong() {
    // Low descending buzz.
    tone({ freq: 220, type: 'sawtooth', duration: 0.28, gain: 0.16, slideTo: 90 });
  },
  win() {
    // Fanfare.
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) =>
      tone({ freq: f, type: 'triangle', duration: 0.22, gain: 0.2, delay: i * 0.13 })
    );
  },
};
