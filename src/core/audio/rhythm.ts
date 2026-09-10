import { audio } from './context';
import { useApp } from '@/core/store/app';
import type { Beat } from '@/engines/rhythm/schema';

/** Schedule on the audio clock, not on repeated JS timers. Returns immediate cancellation. */
export function playRhythm(
  beats: readonly Beat[],
  beatMs: number,
  onStep: (index: number) => void,
  onEnd: () => void,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const voices: OscillatorNode[] = [];
  const stop = () => {
    cancelled = true;
    clearTimeout(timer);
    voices.forEach((voice) => {
      try {
        voice.stop();
      } catch {
        /* Already ended. */
      }
    });
  };
  void (async () => {
    let chain = null;
    try {
      if (useApp.getState().settings.sound) {
        chain = audio();
        if (chain) await chain.ctx.resume();
      }
    } catch {
      chain = null;
    }
    if (cancelled) return;
    const begin = performance.now() + 80;
    if (chain && useApp.getState().settings.sound) {
      const { ctx, master } = chain;
      const start = ctx.currentTime + 0.08;
      beats.forEach((beat, i) => {
        if (beat === 'rest') return;
        const voice = ctx.createOscillator();
        const gain = ctx.createGain();
        const at = start + (i * beatMs) / 1000;
        voice.type = 'sine';
        voice.frequency.setValueAtTime(beat === 'drum' ? 180 : 660, at);
        if (beat === 'drum') voice.frequency.exponentialRampToValueAtTime(65, at + 0.16);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.35, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.28);
        voice.connect(gain).connect(master);
        voice.onended = () => {
          voice.disconnect();
          gain.disconnect();
        };
        voices.push(voice);
        voice.start(at);
        voice.stop(at + 0.3);
      });
    }
    let previous = -1;
    const tick = () => {
      if (cancelled) return;
      const index = Math.floor((performance.now() - begin) / beatMs);
      if (index >= beats.length) {
        onEnd();
        return;
      }
      if (index !== previous && index >= 0) {
        previous = index;
        onStep(index);
      }
      timer = setTimeout(tick, 25);
    };
    tick();
  })();
  return stop;
}
