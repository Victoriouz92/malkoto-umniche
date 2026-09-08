import { z } from 'zod';
import type { EngineSchema } from '../types';

/**
 * „Лабиринт“ — механика m034.
 *
 * Първата истинска среща с обмислянето преди действие: детето трябва да
 * погледне напред, вместо да тръгне и да види.
 *
 * Лабиринтът се ГЕНЕРИРА от три числа. Един JSON дава един и същ лабиринт
 * при всяко пускане (заради seed-а), но десет JSON-а дават десет различни
 * без нито един ръчно нарисуван.
 */
export const mazeParams = z.object({
  /** Клетки по хоризонтала и вертикала. Повече = по-дълъг път. */
  cols: z.number().int().min(2).max(10),
  rows: z.number().int().min(2).max(10),

  /** Един и същ seed дава един и същ лабиринт — задачата е повторима. */
  seed: z.number().int().min(0),

  /** Какво чака в края. Дава смисъл на пътя. */
  goalAsset: z.string().min(1),

  /** Кой върви. */
  travellerAsset: z.string().min(1),
});

export type MazeParams = z.infer<typeof mazeParams>;

export const mazeSchema: EngineSchema<MazeParams> = {
  id: 'maze',
  paramsSchema: mazeParams,
};
