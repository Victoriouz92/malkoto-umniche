import { z } from 'zod';
import { tokenSchema } from '../shared/token';
import type { EngineSchema } from '../types';

/**
 * „Подреди случката“, „Подреди числата“, подреждане по големина —
 * механики m061, m043 и вариант на m007.
 *
 * m061 е с най-висока стойност: разказът има начало, среда и край, а това
 * е основата на разбирането при четене.
 */
export const sequencingParams = z.object({
  /** Верният ред Е редът в масива. На екрана се показват разбъркани. */
  items: z.array(tokenSchema).min(3).max(8),

  /** Какво подрежда детето — само за подсказката отгоре. */
  kind: z.enum(['story', 'size-asc', 'size-desc', 'number']).default('story'),
});

export type SequencingParams = z.infer<typeof sequencingParams>;

export const sequencingSchema: EngineSchema<SequencingParams> = {
  id: 'sequencing',
  paramsSchema: sequencingParams,
};
