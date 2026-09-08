import { z } from 'zod';
import type { EngineSchema } from '../types';

/**
 * „Обърни двойките“ — механика m009 от каталога.
 *
 * Най-високо оценената механика в целия каталог: покрива 3–8 г., развива
 * зрителна и работна памет и се преиграва безкрайно.
 */
export const memoryParams = z.object({
  /** Кои предмети образуват двойки. Всеки се появява по два пъти. */
  items: z.array(z.string().min(1)).min(2).max(12),

  /**
   * Колко стоят отворени несъвпадналите карти.
   * По-дълго за малките — те се нуждаят от повече време да погледнат.
   */
  flipBackMs: z.number().int().min(600).max(4000).default(1600),
});

export type MemoryParams = z.infer<typeof memoryParams>;

export const memorySchema: EngineSchema<MemoryParams> = {
  id: 'memory',
  paramsSchema: memoryParams,
};
