import { z } from 'zod';
import type { EngineSchema } from '../types';

export const wordsParams = z.object({
  word: z.string().min(2).max(16),
  syllables: z.array(z.string().min(1).max(6)).min(2).max(5),
  picture: z.string().min(1),
}).refine(({ word, syllables }) => syllables.join('') === word, { path: ['syllables'] });
export type WordsParams = z.infer<typeof wordsParams>;
export const wordsSchema: EngineSchema<WordsParams> = { id: 'words', paramsSchema: wordsParams };
