import type { SequencingParams } from './schema';

/**
 * Варианти на „Подреди по ред“.
 *
 * Тук вариантът е скъп: редът на случката е смисъл, а не подредба, и
 * обръщането ѝ би било грешна задача. Затова се обръща само подреждането
 * по големина — „от малкото към голямото“ става „от голямото към малкото“.
 * Това е различно умение със същите картинки, не същото наопаки.
 *
 * За разказ и числа вариант няма: разбъркването на плочките при всяко
 * пускане вече прави задачата различна.
 */
export function sequencingVariant(params: SequencingParams, variant: number): SequencingParams {
  if (params.kind !== 'size-asc' && params.kind !== 'size-desc') return params;
  if (variant % 2 === 0) return params;

  return {
    ...params,
    items: [...params.items].reverse(),
    kind: params.kind === 'size-asc' ? 'size-desc' : 'size-asc',
  };
}
