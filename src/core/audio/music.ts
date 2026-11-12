import { audio } from './context';

/**
 * Фонова музика — генеративна, не лупове.
 *
 * Пентатонична гама: никои два тона не звучат неприятно заедно, каквото и
 * да се падне. Затова случайният избор е безопасен и мелодията никога не се
 * повтаря буквално — за разлика от луп, който се усеща след третата минута.
 *
 * Нула байта в офлайн кеша.
 */

export type Mood = 'home' | 'focus' | 'celebrate' | 'calm' | 'woodland' | 'railway' | 'atelier';

type MoodSpec = {
  /** Полутонове над основния тон. Пентатоника: 0 2 4 7 9. */
  scale: number[];
  /** Основен тон в Hz. */
  root: number;
  /** Средно време между нотите в секунди. */
  interval: number;
  /** Случайно отклонение от интервала. */
  jitter: number;
  gain: number;
  /** Има ли тих продължителен тон отдолу. */
  drone: boolean;
  /** Октави, от които се избира нота. */
  octaves: number[];
  /** Semitones for the melody. Null is a rest. */
  motif?: readonly (number | null)[];
};

const MOODS: Record<Mood, MoodSpec> = {
  home: {
    scale: [0, 2, 4, 7, 9],
    root: 293.66, // ре
    interval: 3,
    jitter: 1.2,
    gain: 0.16,
    drone: true,
    octaves: [0, 1],
  },
  // По-рядко и по-тихо: детето мисли, музиката не бива да се бори с него.
  focus: {
    scale: [0, 2, 4, 7, 9],
    root: 261.63, // до
    interval: 5,
    jitter: 2,
    gain: 0.1,
    drone: true,
    octaves: [0],
  },
  celebrate: {
    scale: [0, 2, 4, 7, 9],
    root: 392.0, // сол
    interval: 0.9,
    jitter: 0.3,
    gain: 0.2,
    drone: false,
    octaves: [0, 1, 2],
  },
  calm: {
    scale: [0, 2, 7],
    root: 220.0, // ла
    interval: 6.5,
    jitter: 2.5,
    gain: 0.09,
    drone: true,
    octaves: [-1, 0],
  },
  woodland: {
    scale: [0, 2, 4, 7, 9],
    root: 261.63,
    interval: 0.57,
    jitter: 0,
    gain: 0.095,
    drone: false,
    octaves: [0],
    motif: [0, 4, 7, null, 4, 2, 0, null, 2, 4, 9, 7, 4, 2, 0, null],
  },
  railway: {
    scale: [0, 2, 4, 7, 9],
    root: 293.66,
    interval: 0.5,
    jitter: 0,
    gain: 0.085,
    drone: false,
    octaves: [0],
    motif: [0, 0, 4, null, 7, 7, 9, null, 7, 4, 2, null, 4, 2, 0, null],
  },
  atelier: {
    scale: [0, 2, 4, 7, 9],
    root: 246.94,
    interval: 0.68,
    jitter: 0,
    gain: 0.095,
    drone: false,
    octaves: [0],
    motif: [7, null, 4, 2, 4, null, 2, 0, 4, null, 7, 9, 7, 4, 2, null],
  },
};

function noteHz(spec: MoodSpec): number {
  const step = spec.scale[Math.floor(Math.random() * spec.scale.length)] ?? 0;
  const octave = spec.octaves[Math.floor(Math.random() * spec.octaves.length)] ?? 0;
  return spec.root * Math.pow(2, step / 12 + octave);
}

let timer: number | null = null;
let bus: GainNode | null = null;
let droneOsc: OscillatorNode | null = null;
let currentMood: Mood | null = null;

function playNote(
  ctx: AudioContext,
  out: GainNode,
  hz: number,
  gain: number,
  short = false,
): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = short ? 'triangle' : 'sine';
  osc.frequency.value = hz;

  // Бавна атака и дълго затихване — камбанка, не пиукане.
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + (short ? 0.025 : 0.5));
  env.gain.exponentialRampToValueAtTime(0.0001, now + (short ? 0.65 : 3.2));

  osc.connect(env).connect(out);
  osc.start(now);
  osc.stop(now + (short ? 0.72 : 3.4));
}

function schedule(spec: MoodSpec, beat = 0): void {
  const a = audio();
  if (!a || !bus || a.ctx.state !== 'running') return;

  if (spec.motif) {
    const step = spec.motif[beat % spec.motif.length];
    if (typeof step === 'number')
      playNote(a.ctx, bus, spec.root * 2 ** (step / 12), spec.gain, true);
    if (beat % 4 === 0) playNote(a.ctx, bus, spec.root / 2, spec.gain * 0.28, true);
  } else {
    playNote(a.ctx, bus, noteHz(spec), spec.gain);
  }

  const wait = (spec.interval + (Math.random() - 0.5) * 2 * spec.jitter) * 1000;
  timer = window.setTimeout(() => schedule(spec, beat + 1), Math.max(400, wait));
}

/** Пуска настроение. Смяната на настроение прелива, не реже. */
export function startMusic(mood: Mood, enabled: boolean): void {
  if (!enabled) {
    stopMusic();
    return;
  }
  if (currentMood === mood && bus) return;

  stopMusic();

  const a = audio();
  if (!a || a.ctx.state !== 'running') return;

  const spec = MOODS[mood];
  currentMood = mood;

  bus = a.ctx.createGain();
  bus.gain.setValueAtTime(0, a.ctx.currentTime);
  bus.gain.linearRampToValueAtTime(1, a.ctx.currentTime + 2);
  bus.connect(a.master);

  if (spec.drone) {
    const osc = a.ctx.createOscillator();
    const env = a.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = spec.root / 2;
    env.gain.setValueAtTime(0, a.ctx.currentTime);
    env.gain.linearRampToValueAtTime(spec.gain * 0.35, a.ctx.currentTime + 3);
    osc.connect(env).connect(bus);
    osc.start();
    droneOsc = osc;
  }

  schedule(spec);
}

export function stopMusic(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }

  const fading = bus;
  const drone = droneOsc;
  bus = null;
  droneOsc = null;
  currentMood = null;

  if (!fading) return;
  const a = audio();
  if (!a) return;

  const now = a.ctx.currentTime;
  fading.gain.cancelScheduledValues(now);
  fading.gain.setValueAtTime(fading.gain.value, now);
  fading.gain.linearRampToValueAtTime(0, now + 0.18);

  window.setTimeout(() => {
    drone?.stop();
    fading.disconnect();
  }, 220);
}

export function activeMood(): Mood | null {
  return currentMood;
}
