/** Tiny Web Audio synth. No audio files, no network. */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

export type SoundName = "tap" | "place" | "erase" | "error" | "hint" | "complete" | "win" | "lose";

interface Tone {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  delay?: number;
  slideTo?: number;
}

const SOUNDS: Record<SoundName, Tone[]> = {
  tap: [{ frequency: 520, duration: 0.04, type: "sine", gain: 0.05 }],
  place: [
    { frequency: 660, duration: 0.07, type: "sine", gain: 0.08 },
    { frequency: 880, duration: 0.09, type: "sine", gain: 0.05, delay: 0.04 },
  ],
  erase: [{ frequency: 380, duration: 0.06, type: "triangle", gain: 0.06, slideTo: 260 }],
  error: [
    { frequency: 190, duration: 0.12, type: "triangle", gain: 0.08 },
    { frequency: 150, duration: 0.16, type: "triangle", gain: 0.06, delay: 0.09 },
  ],
  hint: [
    { frequency: 520, duration: 0.08, type: "sine", gain: 0.06 },
    { frequency: 780, duration: 0.12, type: "sine", gain: 0.05, delay: 0.07 },
  ],
  complete: [
    { frequency: 660, duration: 0.08, type: "sine", gain: 0.06 },
    { frequency: 880, duration: 0.1, type: "sine", gain: 0.06, delay: 0.07 },
    { frequency: 1100, duration: 0.16, type: "sine", gain: 0.05, delay: 0.15 },
  ],
  win: [
    { frequency: 523.25, duration: 0.16, type: "sine", gain: 0.08 },
    { frequency: 659.25, duration: 0.16, type: "sine", gain: 0.08, delay: 0.12 },
    { frequency: 783.99, duration: 0.16, type: "sine", gain: 0.08, delay: 0.24 },
    { frequency: 1046.5, duration: 0.4, type: "sine", gain: 0.07, delay: 0.38 },
  ],
  lose: [
    { frequency: 330, duration: 0.18, type: "triangle", gain: 0.06 },
    { frequency: 262, duration: 0.22, type: "triangle", gain: 0.06, delay: 0.14 },
    { frequency: 196, duration: 0.4, type: "triangle", gain: 0.05, delay: 0.3 },
  ],
};

export function playSound(name: SoundName, volume = 0.6): void {
  if (volume <= 0) return;
  const ctx = getContext();
  if (!ctx) return;
  for (const tone of SOUNDS[name]) {
    const start = ctx.currentTime + (tone.delay ?? 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    if (tone.slideTo) oscillator.frequency.exponentialRampToValueAtTime(tone.slideTo, start + tone.duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, tone.gain * volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.02);
  }
}

export type HapticName = "tap" | "error" | "win";

const PATTERNS: Record<HapticName, number | number[]> = {
  tap: 10,
  error: [18, 40, 18],
  win: [20, 40, 20, 40, 60],
};

export function haptic(name: HapticName): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[name]);
  } catch {
    // Some browsers expose vibrate but reject calls without a gesture.
  }
}

export function hapticsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function muteAudio(): void {
  if (context && context.state === "running") void context.suspend();
}
