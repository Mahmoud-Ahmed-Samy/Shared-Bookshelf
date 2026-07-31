// Mahmoud asked for some sound feedback on the UI. Claude - these are tiny
// synthesized beeps made with the Web Audio API instead of shipping actual
// audio files, so there's nothing extra to download or host. No mute
// toggle -- sound effects always play.

let ctx = null;

function getCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, duration = 0.08, type = 'sine', gain = 0.05, glideTo = null, delay = 0 }) {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  try {
    const start = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
    }
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch (e) {
    // A sound effect failing should never break the actual feature - fail silently
  }
}

export const sfx = {
  hover: () => tone({ freq: 720, duration: 0.045, type: 'sine', gain: 0.018 }),
  click: () => tone({ freq: 480, duration: 0.07, type: 'triangle', gain: 0.045, glideTo: 640 }),
  success: () => {
    tone({ freq: 520, duration: 0.09, type: 'triangle', gain: 0.05 });
    tone({ freq: 780, duration: 0.13, type: 'triangle', gain: 0.05, delay: 0.08 });
  },
  remove: () => tone({ freq: 320, duration: 0.16, type: 'sawtooth', gain: 0.04, glideTo: 110 }),
  error: () => {
    tone({ freq: 220, duration: 0.12, type: 'square', gain: 0.03 });
    tone({ freq: 175, duration: 0.16, type: 'square', gain: 0.03, delay: 0.1 });
  },
  // Claude - a soft frequency-sweep whose `duration` is passed in by the
  // caller (BookList's scroll animation), so the sound always lasts exactly
  // as long as the visual motion it's paired with instead of the two
  // drifting out of sync.
  whoosh: (duration = 0.5, direction = 1) => {
    const [freqStart, freqEnd] = direction >= 0 ? [260, 640] : [560, 220];
    tone({ freq: freqStart, duration, type: 'sine', gain: 0.03, glideTo: freqEnd });
  },
};
