import { randomInt, shuffle } from '../shared/random';
import type { CompareParams } from './schema';

/** Границите идват от схемата: група под 1 или над 12 не се показва. */
const MIN_COUNT = 1;
const MAX_COUNT = 12;

/**
 * Варианти на „Повече и по-малко“.
 *
 * Две неща се менят и нито едно от тях не мени трудността:
 *
 *   • Страните се разменят. Децата бързо залепват за една страна и спират
 *     да сравняват; огледалният вариант ги връща към задачата.
 *   • Двете бройки се местят с еднаква стъпка — 2 срещу 6 става 3 срещу 7.
 *     Разликата остава същата, а разликата е трудността тук.
 */
export function compareVariant(params: CompareParams, random: () => number): CompareParams {
  const rounds = shuffle(params.rounds, random).map((round) => {
    const mirrored = random() < 0.5 ? { left: round.right, right: round.left } : round;
    if (params.mode !== 'count') return mirrored;

    const shift = randomInt(-2, 2, random);
    const left = mirrored.left.count + shift;
    const right = mirrored.right.count + shift;
    const inRange = (value: number) => value >= MIN_COUNT && value <= MAX_COUNT;
    if (shift === 0 || !inRange(left) || !inRange(right)) return mirrored;

    return {
      left: { ...mirrored.left, count: left },
      right: { ...mirrored.right, count: right },
    };
  });

  return { ...params, rounds };
}
