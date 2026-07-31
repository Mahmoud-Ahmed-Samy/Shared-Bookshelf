// Ambient background music using Web Audio API — no audio files needed.
// Architecture: per-chord, three layered oscillators (root/fifth/high) fed
// through a low-pass filter → gain → convolver reverb → master gain → output.
let ctx = null;
let masterGain = null;
let convolver = null;
let nodes = [];
let _playing = false;
let intervalId = null;

function getCtx() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();

  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.72, ctx.currentTime);
  masterGain.connect(ctx.destination);

  // Simple synthetic reverb: white-noise impulse response
  convolver = ctx.createConvolver();
  const rate = ctx.sampleRate;
  const length = rate * 2.4;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let c = 0; c < 2; c++) {
    const ch = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2);
    }
  }
  convolver.buffer = impulse;
  convolver.connect(masterGain);

  return ctx;
}

// Each chord: [root, third/fifth, upper voice] frequencies in Hz
// Warm C-major loop: Cmaj9 → Fmaj7 → Am9 → G(add9)
const CHORDS = [
  { freqs: [65.41, 130.81, 196.00, 261.63, 329.63], label: 'Cmaj9'  },
  { freqs: [87.31, 174.61, 261.63, 349.23, 440.00], label: 'Fmaj7'  },
  { freqs: [55.00, 110.00, 164.81, 220.00, 293.66], label: 'Am9'    },
  { freqs: [98.00, 196.00, 246.94, 293.66, 392.00], label: 'Gadd9'  },
];

const CHORD_DURATION = 7;
const FADE_IN = 1.2;
const FADE_OUT = 1.4;
let chordIndex = 0;

function playChord(chord, when) {
  const audioCtx = getCtx();
  if (!audioCtx) return;

  chord.freqs.forEach((freq, i) => {
    try {
      const osc = audioCtx.createOscillator();
      // Bottom two voices: sine for warmth; upper voices: triangle for presence
      osc.type = i < 2 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, when);

      // Slight detuning per voice for natural width (+/- 2 cents)
      osc.detune.setValueAtTime((i % 2 === 0 ? 1 : -1) * 1.8, when);

      const noteGain = audioCtx.createGain();
      // Bass voices quieter; upper voices more present
      const peakGain = i === 0 ? 0.10 : i === 1 ? 0.07 : 0.045;
      noteGain.gain.setValueAtTime(0.0001, when);
      noteGain.gain.linearRampToValueAtTime(peakGain, when + FADE_IN);
      noteGain.gain.setValueAtTime(peakGain, when + CHORD_DURATION - FADE_OUT);
      noteGain.gain.linearRampToValueAtTime(0.0001, when + CHORD_DURATION);

      // Stereo pan: spread voices slightly left/right
      const panner = audioCtx.createStereoPanner?.();
      if (panner) {
        panner.pan.setValueAtTime((i / chord.freqs.length - 0.5) * 0.5, when);
      }

      // Low-pass filter for warmth
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, when);
      filter.Q.setValueAtTime(0.5, when);

      osc.connect(filter);
      filter.connect(noteGain);
      if (panner) {
        noteGain.connect(panner);
        panner.connect(convolver);
        panner.connect(masterGain); // dry signal
      } else {
        noteGain.connect(convolver);
        noteGain.connect(masterGain);
      }

      osc.start(when);
      osc.stop(when + CHORD_DURATION + 0.1);
      nodes.push(osc);
    } catch (_) {}
  });
}

function scheduleNext() {
  const audioCtx = getCtx();
  if (!audioCtx || !_playing) return;
  playChord(CHORDS[chordIndex % CHORDS.length], audioCtx.currentTime);
  chordIndex += 1;
}

export const music = {
  get playing() { return _playing; },

  start() {
    const audioCtx = getCtx();
    if (!audioCtx || _playing) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    _playing = true;
    chordIndex = 0;
    scheduleNext();
    intervalId = setInterval(scheduleNext, (CHORD_DURATION - FADE_OUT * 0.8) * 1000);
  },

  stop() {
    _playing = false;
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
    nodes.forEach((n) => { try { n.stop(); } catch (_) {} });
    nodes = [];
  },

  toggle() {
    if (_playing) { this.stop(); } else { this.start(); }
    return _playing;
  },
};
