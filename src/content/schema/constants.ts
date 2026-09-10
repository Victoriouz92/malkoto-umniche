/**
 * Затворените списъци на проекта — БЕЗ никакви зависимости.
 *
 * Отделени са от `enums.ts` нарочно. Интерфейсът има нужда от списъка с
 * категории, но няма нужда от Zod; ако двете живеят в един файл, всеки
 * екран, който показва категория, повлича валидатора в своя chunk.
 * (Първата версия правеше точно това и надуваше витрината с 50 KB.)
 *
 * Zod схемите се строят върху тези списъци в `enums.ts`.
 * Добавяне на стойност тук е продуктово решение, не техническо.
 */

export const ENGINE_IDS = [
  'puzzle',
  'memory',
  'matching',
  'sorting',
  'sequencing',
  'counting',
  'tracing',
  'coloring',
  'maze',
  'pattern',
  'connect-dots',
  'spot-difference',
  'shape-builder',
  'letters',
  'words',
  'math',
  'sound-match',
  'drawing',
  'compare',
  'odd-one-out',
  'semantic-choice',
  'shopping',
  'road-builder',
  'route-program',
] as const;

export const SKILLS = [
  'visual-discrimination',
  'visual-memory',
  'working-memory',
  'auditory-memory',
  'spatial-reasoning',
  'logic',
  'pattern-recognition',
  'classification',
  'counting',
  'number-sense',
  'arithmetic',
  'measurement',
  'symmetry',
  'letter-recognition',
  'phonological-awareness',
  'reading',
  'vocabulary',
  'listening',
  'narrative',
  'fine-motor',
  'hand-eye-coordination',
  'sustained-attention',
  'inhibitory-control',
  'cognitive-flexibility',
  'sequencing',
  'problem-solving',
  'creativity',
  'emotion-recognition',
  'social-reasoning',
  'everyday-knowledge',
  'rhythm',
  'pitch-discrimination',
] as const;

export const THEMES = [
  'farm',
  'forest',
  'ocean',
  'jungle',
  'space',
  'vehicles',
  'food',
  'home',
  'city',
  'seasons',
  'weather',
  'body',
  'music',
  'shapes',
  'dinosaurs',
  'insects',
  'toys',
  'clothes',
  'garden',
  'pets',
] as const;

/** Деветте плоскости на детския начален екран. */
export const CATEGORIES = [
  'puzzles',
  'memory',
  'numbers',
  'letters',
  'colors',
  'shapes',
  'animals',
  'vehicles',
  'food',
] as const;

export type EngineId = (typeof ENGINE_IDS)[number];
export type Skill = (typeof SKILLS)[number];
export type Theme = (typeof THEMES)[number];
export type Category = (typeof CATEGORIES)[number];
