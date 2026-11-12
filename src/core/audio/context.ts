/**
 * Общият аудио контекст.
 *
 * Браузърите не позволяват звук преди първо действие на потребителя. Затова
 * контекстът се създава мързеливо и се отключва при първия допир — а не при
 * зареждане, където би останал вечно спрян.
 */

/** −12 dBFS. Таван за слушалки на дете, близо до ухото. */
const MASTER_GAIN = 0.25;

type Chain = { ctx: AudioContext; master: GainNode };

let chain: Chain | null = null;
let unlocked = false;

function create(): Chain | null {
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  return { ctx, master };
}

/** Взима контекста, като го създава при нужда. `null`, ако браузърът не може. */
export function audio(): Chain | null {
  try {
    if (chain?.ctx.state === 'closed') chain = null;
    chain ??= create();
  } catch {
    return null;
  }
  return chain;
}

/** Audio permission or an unavailable output must never leave a game waiting forever. */
export async function resumeAudio(): Promise<Chain | null> {
  const a = audio();
  if (!a) return null;
  const running = (): boolean => a.ctx.state === 'running';
  if (running()) return a;
  let timer: number | undefined;
  try {
    await Promise.race([
      a.ctx.resume(),
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, 600);
      }),
    ]);
    return running() ? a : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Отключва звука. Извиква се от първия допир където и да е в приложението.
 * Безопасно е да се вика много пъти.
 */
export async function unlockAudio(): Promise<void> {
  if (unlocked && chain?.ctx.state === 'running') return;
  unlocked = Boolean(await resumeAudio());
}

export function isUnlocked(): boolean {
  return unlocked;
}

/** Заглушава всичко за 60 ms — при загуба на фокус или при пауза. */
export function duckAll(): void {
  const a = chain;
  if (!a) return;
  const now = a.ctx.currentTime;
  a.master.gain.cancelScheduledValues(now);
  a.master.gain.setValueAtTime(a.master.gain.value, now);
  a.master.gain.linearRampToValueAtTime(0, now + 0.06);
}

export function restoreAll(): void {
  const a = chain;
  if (!a) return;
  const now = a.ctx.currentTime;
  a.master.gain.cancelScheduledValues(now);
  a.master.gain.setValueAtTime(a.master.gain.value, now);
  a.master.gain.linearRampToValueAtTime(MASTER_GAIN, now + 0.12);
}
