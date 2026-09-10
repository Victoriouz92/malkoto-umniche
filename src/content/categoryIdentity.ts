import type { Category } from './schema/constants';

/** Ownership follows the learning task, never the decorative animal or object. */
export const CATEGORY_IDENTITY: Record<Category, { name: string; purpose: string }> = {
  puzzles: { name: 'Клуб на откривателите', purpose: 'Търсим, свързваме и разгадаваме логически загадки.' },
  memory: { name: 'Малки майстори на паметта', purpose: 'Откриваме двойки, помним редици и разгадаваме какво се е скрило.' },
  numbers: { name: 'Лаборатория за числа', purpose: 'Броим, сравняваме количества и откриваме как се събират.' },
  letters: { name: 'Приключения с буквите', purpose: 'Разпознаваме букви, свързваме ги със звукове и строим думи.' },
  colors: { name: 'Ателие на въображението', purpose: 'Рисуваме, оцветяваме и оставяме своя цветна следа.' },
  shapes: { name: 'Работилница за малки строители', purpose: 'Сравняваме размери и строим картинки от геометрични части.' },
  animals: { name: 'Изследователи на природата', purpose: 'Откриваме кой как звучи и къде живее.' },
  vehicles: { name: 'Малки пътешественици', purpose: 'Свързваме пътища и откриваме кой с какво пътува.' },
  food: { name: 'Малки помощници на пазара', purpose: 'Пазаруваме по списък и научаваме откъде идва храната.' },
};

const OWNERS: Readonly<Record<string, Category>> = {
  rhythm: 'memory',
  'route-program': 'vehicles',
  puzzle: 'puzzles', matching: 'puzzles', maze: 'puzzles', pattern: 'puzzles',
  'odd-one-out': 'puzzles', 'spot-difference': 'puzzles', 'connect-dots': 'puzzles',
  memory: 'memory', counting: 'numbers', math: 'numbers',
  letters: 'letters', words: 'letters', coloring: 'colors', drawing: 'colors',
  'shape-builder': 'shapes', sequencing: 'shapes', shopping: 'food', 'road-builder': 'vehicles',
};

export function categoryOwner(engine: string, params: unknown): Category | undefined {
  if (engine === 'compare') {
    const mode = params && typeof params === 'object' && 'mode' in params ? params.mode : undefined;
    return mode === 'count' ? 'numbers' : 'shapes';
  }
  return OWNERS[engine];
}

export function sameSessionFamily(
  first: { category: string; engine: string; params?: Record<string, unknown> },
  next: { category: string; engine: string; params?: Record<string, unknown> },
): boolean {
  return first.category === next.category && first.engine === next.engine &&
    first.params?.mode === next.params?.mode;
}
