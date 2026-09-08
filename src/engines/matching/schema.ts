import { z } from 'zod';
import type { EngineSchema } from '../types';

/**
 * „Свържи двойките“ — механики m016 (еднакви) и m002 (сянка).
 *
 * Един двигател покрива и двете: разликата е само как се рисува дясната
 * колона. Точно затова каталогът и двигателите са отделни неща.
 */
export const matchingParams = z.object({
  pairs: z
    .array(
      z.object({
        left: z.string().min(1),
        right: z.string().min(1),
      }),
    )
    .min(2)
    .max(8),

  /**
   * `same` — двете страни изглеждат еднакво (m016)
   * `silhouette` — дясната е плътен силует (m002)
   *
   * Силуетът се получава от същата картинка чрез филтър, не изисква
   * отделен актив.
   */
  rightMode: z.enum(['same', 'silhouette']).default('same'),
});

export type MatchingParams = z.infer<typeof matchingParams>;

export const matchingSchema: EngineSchema<MatchingParams> = {
  id: 'matching',
  paramsSchema: matchingParams,
};
