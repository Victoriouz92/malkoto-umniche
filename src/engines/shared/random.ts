/**
 * Разбъркване със seed.
 *
 * Всяка активност се разбърква различно при всяко пускане — иначе детето
 * запомня подредбата, а не съдържанието. Но seed-ът е предвидим по време
 * на разработка, което прави поведението възпроизводимо при проверка.
 */

/** mulberry32 — малък, бърз, достатъчно равномерен. */
export function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates. Връща НОВ масив, входният остава непокътнат. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

/** Няколко различни елемента от списък. */
export function sample<T>(items: readonly T[], count: number, random: () => number = Math.random): T[] {
  return shuffle(items, random).slice(0, Math.min(count, items.length));
}

/** Цяло число в [min, max]. */
export function randomInt(min: number, max: number, random: () => number = Math.random): number {
  return min + Math.floor(random() * (max - min + 1));
}
