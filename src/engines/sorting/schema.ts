import { z } from 'zod';
import type { EngineSchema } from '../types';

/**
 * „Подреди в кошници“ — механика m018.
 *
 * Кошницата се обявява с ПРИМЕР, не с надпис: детето на три години не
 * чете, а „ето такива неща“ разбира веднага. Надписът е допълнение за
 * родителя и за екранния четец.
 */
export const sortingParams = z.object({
  bins: z
    .array(
      z.object({
        id: z.string().min(1),
        /** Представителен предмет — това, което кошницата събира. */
        asset: z.string().min(1),
        labelKey: z.string().optional(),
      }),
    )
    .min(2)
    .max(4),

  items: z
    .array(
      z.object({
        asset: z.string().min(1),
        /** В коя кошница принадлежи. Сверява се с `bins[].id`. */
        bin: z.string().min(1),
      }),
    )
    .min(3)
    .max(12),
});

export type SortingParams = z.infer<typeof sortingParams>;

export const sortingSchema: EngineSchema<SortingParams> = {
  id: 'sorting',
  paramsSchema: sortingParams.superRefine((value, ctx) => {
    const ids = new Set(value.bins.map((b) => b.id));
    value.items.forEach((item, index) => {
      if (!ids.has(item.bin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'bin'],
          message: `няма кошница с id "${item.bin}"`,
        });
      }
    });
  }),
};
