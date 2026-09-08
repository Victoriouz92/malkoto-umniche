import { audio } from './context';
import type { SfxName } from '@/engines/types';

/**
 * Звуковите ефекти — синтезирани, не записани.
 *
 * Нула байта в офлайн кеша и под 5 ms забавяне. При деца това не е дребно:
 * звук за „правилно“, закъснял с 60 ms, вече не се свързва с действието.
 *
 * Стойностите идват от таблицата в docs/AUDIO.md.
 */

type Voice = {
  /** Начална честота в Hz. */
  freq: number;
  /** Крайна честота, ако тонът се плъзга. */
  to?: number;
  type?: OscillatorType;
  /** Продължителност в секунди. */
  dur: number;
  /** Върхова сила, 0–1, спрямо общото ниво. */
  gain?: number;
  /** Забавяне от началото на звука. */
  at?: number;
  /** Дълбочина на вибрато в Hz. */
  vibrato?: number;
};

const SFX: Record<SfxName, Voice[]> = {
  tap: [{ freq: 660, dur: 0.04, gain: 0.5 }],

  pick: [{ freq: 520, to: 780, dur: 0.09, gain: 0.5 }],

  drop: [{ freq: 440, to: 660, type: 'triangle', dur: 0.12, gain: 0.6 }],

  snap: [
    { freq: 880, dur: 0.07, gain: 0.55 },
    { freq: 1320, dur: 0.07, gain: 0.3 },
  ],

  // Низходящ и тих. Казва „не там“, не „сгреши“ — виж правило 2 в
  // DESIGN-BIBLE.md. Никога възходящ и никога рязък.
  soften: [{ freq: 400, to: 320, type: 'sine', dur: 0.18, gain: 0.3 }],

  correct: [
    { freq: 660, dur: 0.26, gain: 0.5 },
    { freq: 880, dur: 0.26, gain: 0.4, at: 0.04 },
  ],

  // До–ми–сол–до
  complete: [
    { freq: 523, dur: 0.18, gain: 0.5 },
    { freq: 659, dur: 0.18, gain: 0.5, at: 0.12 },
    { freq: 784, dur: 0.18, gain: 0.5, at: 0.24 },
    { freq: 1047, dur: 0.32, gain: 0.55, at: 0.36 },
  ],

  sticker: [
    { freq: 587, dur: 0.2, gain: 0.45 },
    { freq: 784, dur: 0.2, gain: 0.45, at: 0.14 },
    { freq: 988, dur: 0.24, gain: 0.5, at: 0.28 },
    { freq: 1175, dur: 0.42, gain: 0.5, at: 0.42, vibrato: 8 },
  ],

  // Много тихо. Само подсказва, че времето свършва — не стряска.
  chime: [
    { freq: 520, dur: 0.7, gain: 0.18 },
    { freq: 390, dur: 0.9, gain: 0.15, at: 0.35 },
  ],
};

/** Само един звук в даден момент — наслагването звучи като повреда. */
let active: GainNode | null = null;

function stopActive(ctx: AudioContext): void {
  if (!active) return;
  const now = ctx.currentTime;
  active.gain.cancelScheduledValues(now);
  active.gain.setValueAtTime(active.gain.value, now);
  active.gain.linearRampToValueAtTime(0, now + 0.02);
  active = null;
}

function playVoice(ctx: AudioContext, out: GainNode, v: Voice, start: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = v.type ?? 'sine';
  const at = start + (v.at ?? 0);
  const peak = v.gain ?? 0.5;

  osc.frequency.setValueAtTime(v.freq, at);
  if (v.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, v.to), at + v.dur);
  }

  if (v.vibrato !== undefined) {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 6;
    lfoGain.gain.value = v.vibrato;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(at);
    lfo.stop(at + v.dur);
  }

  // Мека обвивка: рязката атака щрака, а щракането дразни.
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + v.dur);

  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + v.dur + 0.02);
}

/**
 * Изсвирва ефект. Мълчи, ако звукът е изключен — двигателят не проверява
 * настройката, а просто вика.
 */
export function playSfx(name: SfxName, enabled: boolean): void {
  if (!enabled) return;
  const a = audio();
  if (!a || a.ctx.state === 'suspended') return;

  const voices = SFX[name];
  const bus = a.ctx.createGain();
  bus.gain.value = 1;
  bus.connect(a.master);

  stopActive(a.ctx);
  active = bus;

  const start = a.ctx.currentTime;
  for (const v of voices) playVoice(a.ctx, bus, v, start);

  const total = Math.max(...voices.map((v) => (v.at ?? 0) + v.dur));
  window.setTimeout(() => {
    bus.disconnect();
    if (active === bus) active = null;
  }, (total + 0.1) * 1000);
}
