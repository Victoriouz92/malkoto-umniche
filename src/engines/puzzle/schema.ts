import { z } from 'zod';
import type { EngineSchema } from '../types';

/**
 * „Форма в отвор“ — механика m001.
 *
 * Първата механика, достъпна на две години. Детето свързва предмета с
 * очертанието му и го поставя вътре.
 */
export const puzzleParams = z.object({
  /** Предметите, които трябва да намерят отворите си. */
  pieces: z.array(z.string().min(1)).min(2).max(6),
});

export type PuzzleParams = z.infer<typeof puzzleParams>;

export const puzzleSchema: EngineSchema<PuzzleParams> = {
  id: 'puzzle',
  paramsSchema: puzzleParams,
};
