import { shuffle } from '../shared/random';
import type { SortingParams } from './schema';

/**
 * Варианти на „Подреди в кошници“.
 *
 * Предметите вече се разбъркват при всяко пускане, но КОШНИЦИТЕ стояха на
 * едно и също място. Дете, което е играло веднъж, спира да гледа какво
 * събира кошницата и започва да помни „животните са вляво“ — а това е
 * точно умението, което задачата трябва да изгради.
 *
 * Затова вариантът разменя местата на кошниците. Съдържанието им не се
 * пипа: коя кошница какво събира е решение на автора.
 */
export function sortingVariant(params: SortingParams, random: () => number): SortingParams {
  return {
    ...params,
    bins: shuffle(params.bins, random),
    items: shuffle(params.items, random),
  };
}
