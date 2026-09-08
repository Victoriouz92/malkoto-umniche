import type { EngineId } from '@/content/schema/constants';
import type { EngineSchema } from './types';

import { puzzleSchema } from './puzzle/schema';
import { memorySchema } from './memory/schema';
import { matchingSchema } from './matching/schema';
import { sortingSchema } from './sorting/schema';
import { coloringSchema } from './coloring/schema';
import { countingSchema } from './counting/schema';
import { patternSchema } from './pattern/schema';
import { oddOneOutSchema } from './odd-one-out/schema';
import { compareSchema } from './compare/schema';
import { sequencingSchema } from './sequencing/schema';
import { mazeSchema } from './maze/schema';
import { mathSchema } from './math/schema';
import { lettersSchema } from './letters/schema';
import { drawingSchema } from './drawing/schema';
import { soundMatchSchema } from './sound-match/schema';
import { spotDifferenceSchema } from './spot-difference/schema';
import { tracingSchema } from './tracing/schema';
import { connectDotsSchema } from './connect-dots/schema';
import { shapeBuilderSchema } from './shape-builder/schema';
import { wordsSchema } from './words/schema';
import { semanticChoiceSchema } from './semantic-choice/schema';
import { shoppingSchema } from './shopping/schema';
import { roadBuilderSchema } from './road-builder/schema';

/**
 * Схемите на параметрите, по един запис за всеки двигател.
 *
 * Този файл НЕ внася React и не докосва DOM — валидаторът в `npm run check`
 * го чете от Node. Затова схемата на двигателя живее в собствен `schema.ts`,
 * отделно от `Engine.tsx`.
 *
 * Двигател без запис тук означава, че активност за него не може да се
 * пусне: по-добре червен build, отколкото бял екран пред детето.
 */
const SCHEMAS: Partial<Record<EngineId, EngineSchema>> = {
  puzzle: puzzleSchema,
  memory: memorySchema,
  matching: matchingSchema,
  sorting: sortingSchema,
  coloring: coloringSchema,
  counting: countingSchema,
  pattern: patternSchema,
  'odd-one-out': oddOneOutSchema,
  compare: compareSchema,
  sequencing: sequencingSchema,
  maze: mazeSchema,
  math: mathSchema,
  letters: lettersSchema,
  drawing: drawingSchema,
  'sound-match': soundMatchSchema,
  'spot-difference': spotDifferenceSchema,
  tracing: tracingSchema,
  'connect-dots': connectDotsSchema,
  'shape-builder': shapeBuilderSchema,
  words: wordsSchema,
  'semantic-choice': semanticChoiceSchema,
  shopping: shoppingSchema,
  'road-builder': roadBuilderSchema,
};

export function schemaFor(engine: EngineId): EngineSchema | null {
  return SCHEMAS[engine] ?? null;
}

export function implementedEngines(): EngineId[] {
  return Object.keys(SCHEMAS) as EngineId[];
}
