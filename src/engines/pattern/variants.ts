import { randomInt } from '../shared/random';
import { sameToken } from '../shared/token';
import type { Token } from '../shared/token';
import type { PatternParams } from './schema';

/**
 * Дължината на повтарящата се единица, ако редицата е правилна.
 * Връща 0, когато правило няма — тогава редицата не се пипа.
 */
function unitLength(sequence: readonly Token[]): number {
  for (let unit = 1; unit <= Math.floor(sequence.length / 2); unit++) {
    let holds = true;
    for (let i = unit; i < sequence.length; i++) {
      const here = sequence[i];
      const base = sequence[i % unit];
      if (!here || !base || !sameToken(here, base)) {
        holds = false;
        break;
      }
    }
    if (holds) return unit;
  }
  return 0;
}

/**
 * Варианти на „Продължи шарката“.
 *
 * Шарката се ЗАВЪРТА: АБВ АБВ става БВА БВА. Правилото е същото, елементите
 * са същите, но отговорът е друг — детето не може да си спомни „беше
 * кръгче“, а трябва пак да прочете редицата.
 *
 * Дупката също се мести. В края е „продължи“; по средата е „липсва“ и е
 * по-трудно — затова средата се пази за по-късните варианти.
 */
export function patternVariant(params: PatternParams, random: () => number): PatternParams {
  const unit = unitLength(params.sequence);

  let sequence = params.sequence;
  if (unit > 1) {
    const shift = randomInt(1, unit - 1, random);
    sequence = params.sequence.map((token, i) => {
      const rotated = params.sequence[(i % unit) + shift < unit
        ? (i % unit) + shift
        : ((i % unit) + shift) % unit];
      return rotated ?? token;
    });
  }

  // Схемата иска поне три елемента преди дупката, за да личи правилото.
  const first = 3;
  const last = sequence.length - 1;
  const gapIndex = last > first ? randomInt(first, last, random) : params.gapIndex;

  return { ...params, sequence, gapIndex };
}
