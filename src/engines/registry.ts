import type { EngineId } from '@/content/schema/constants';
import type { EngineModule, LoadedEngine } from './types';

/**
 * Кой двигател с кой компонент се рисува.
 *
 * Всеки запис е мързелив внос. Детето, което играе пъзел, не тегли кода на
 * паметта или на оцветяването — това е разликата между 200 KB и 2 MB,
 * когато двигателите станат двайсет.
 *
 * Приведението към `LoadedEngine` е единственото място, където типът на
 * `params` се губи. Безопасно е, защото плеърът валидира params със
 * схемата на СЪЩИЯ двигател, преди да го покаже.
 */
const ENGINES: Partial<Record<EngineId, EngineModule>> = {
  shopping: { id: 'shopping', load: () => import('./shopping/Engine').then(m => m.ShoppingEngine as LoadedEngine) },
  'road-builder': { id: 'road-builder', load: () => import('./road-builder/Engine').then(m => m.RoadBuilderEngine as LoadedEngine) },
  puzzle: {
    id: 'puzzle',
    load: () => import('./puzzle/Engine').then((m) => m.PuzzleEngine as LoadedEngine),
  },
  memory: {
    id: 'memory',
    load: () => import('./memory/Engine').then((m) => m.MemoryEngine as LoadedEngine),
  },
  matching: {
    id: 'matching',
    load: () => import('./matching/Engine').then((m) => m.MatchingEngine as LoadedEngine),
  },
  sorting: {
    id: 'sorting',
    load: () => import('./sorting/Engine').then((m) => m.SortingEngine as LoadedEngine),
  },
  coloring: {
    id: 'coloring',
    load: () => import('./coloring/Engine').then((m) => m.ColoringEngine as LoadedEngine),
  },
  counting: {
    id: 'counting',
    load: () => import('./counting/Engine').then((m) => m.CountingEngine as LoadedEngine),
  },
  pattern: {
    id: 'pattern',
    load: () => import('./pattern/Engine').then((m) => m.PatternEngine as LoadedEngine),
  },
  'odd-one-out': {
    id: 'odd-one-out',
    load: () => import('./odd-one-out/Engine').then((m) => m.OddOneOutEngine as LoadedEngine),
  },
  compare: {
    id: 'compare',
    load: () => import('./compare/Engine').then((m) => m.CompareEngine as LoadedEngine),
  },
  sequencing: {
    id: 'sequencing',
    load: () => import('./sequencing/Engine').then((m) => m.SequencingEngine as LoadedEngine),
  },
  maze: {
    id: 'maze',
    load: () => import('./maze/Engine').then((m) => m.MazeEngine as LoadedEngine),
  },
  math: {
    id: 'math',
    load: () => import('./math/Engine').then((m) => m.MathEngine as LoadedEngine),
  },
  letters: {
    id: 'letters',
    load: () => import('./letters/Engine').then((m) => m.LettersEngine as LoadedEngine),
  },
  drawing: {
    id: 'drawing',
    load: () => import('./drawing/Engine').then((m) => m.DrawingEngine as LoadedEngine),
  },
  'sound-match': {
    id: 'sound-match',
    load: () => import('./sound-match/Engine').then((m) => m.SoundMatchEngine as LoadedEngine),
  },
  'spot-difference': {
    id: 'spot-difference',
    load: () =>
      import('./spot-difference/Engine').then((m) => m.SpotDifferenceEngine as LoadedEngine),
  },
  tracing: {
    id: 'tracing',
    load: () => import('./tracing/Engine').then((m) => m.TracingEngine as LoadedEngine),
  },
  'connect-dots': {
    id: 'connect-dots',
    load: () => import('./connect-dots/Engine').then((m) => m.ConnectDotsEngine as LoadedEngine),
  },
  'shape-builder': {
    id: 'shape-builder',
    load: () => import('./shape-builder/Engine').then((m) => m.ShapeBuilderEngine as LoadedEngine),
  },
  words: {
    id: 'words',
    load: () => import('./words/Engine').then((m) => m.WordsEngine as LoadedEngine),
  },
  'semantic-choice': {
    id: 'semantic-choice',
    load: () =>
      import('./semantic-choice/Engine').then((m) => m.SemanticChoiceEngine as LoadedEngine),
  },
};

export function engineModule(id: EngineId): EngineModule | null {
  return ENGINES[id] ?? null;
}

export function isEngineAvailable(id: EngineId): boolean {
  return id in ENGINES;
}
