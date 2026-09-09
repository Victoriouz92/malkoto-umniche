import { z } from 'zod';
import type { EngineSchema } from '../types';

/**
 * „Преброй и посочи“ — механика m039.
 *
 * Свързва броенето с цифрата. Каталогът я оценява с 10 от 10: това е
 * най-важната връзка в ранната математика.
 */
export const countingParams = z.object({
  guided: z.boolean().default(true),
  rounds: z
    .array(
      z.object({
        asset: z.string().min(1),
        count: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(8),

  /** Колко цифри да се предложат. Повече значи по-трудно. */
  choices: z.number().int().min(2).max(4).default(3),
});

export type CountingParams = z.infer<typeof countingParams>;

export const countingSchema: EngineSchema<CountingParams> = {
  id: 'counting',
  paramsSchema: countingParams,
};
