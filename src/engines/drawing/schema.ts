import { z } from 'zod';
import { CRAYONS } from '../coloring/schema';
import type { EngineSchema } from '../types';

/**
 * „Рисувай свободно“ — механика m069.
 *
 * Единственото място в продукта, където няма правилно. Няма цел, няма
 * оценка, няма край — детето само решава кога е готово.
 *
 * Затова и активността се смята за завършена в мига, в който се появи
 * първата линия: тук „успех“ значи „опита“.
 */
export const drawingParams = z.object({
  palette: z.array(z.enum(CRAYONS)).min(2).max(10),

  /** Дебелини на четката. По-малко избор за по-малките. */
  widths: z.array(z.number().int().min(4).max(48)).min(1).max(4),
});

export type DrawingParams = z.infer<typeof drawingParams>;

export const drawingSchema: EngineSchema<DrawingParams> = {
  id: 'drawing',
  paramsSchema: drawingParams,
};
