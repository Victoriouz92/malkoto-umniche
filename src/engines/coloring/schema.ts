import { z } from 'zod';
import type { EngineSchema } from '../types';

/** Моливите, които съществуват. Съответстват на `--crayon-*` в tokens.css. */
export const CRAYONS = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'brown',
  'grey',
  'black',
] as const;

export type Crayon = (typeof CRAYONS)[number];

/**
 * „Оцвети с тап“ — механика m078.
 *
 * Достъпна е и на две години: най-краткият път от намерение до последствие.
 * НЯМА правилен цвят — синя крава е напълно допустима.
 */
export const coloringParams = z.object({
  /** Контурен актив, напр. `lineart.apple`. */
  lineart: z.string().min(1),

  /** По-малка палитра за малките: десет молива са твърде много избори. */
  palette: z.array(z.enum(CRAYONS)).min(2).max(10),
});

export type ColoringParams = z.infer<typeof coloringParams>;

export const coloringSchema: EngineSchema<ColoringParams> = {
  id: 'coloring',
  paramsSchema: coloringParams,
};
