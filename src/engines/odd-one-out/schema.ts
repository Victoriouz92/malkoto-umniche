import { z } from 'zod';
import { tokenSchema } from '../shared/token';
import type { EngineSchema } from '../types';

/**
 * „Кое не си прилича“ и „Кое не е по правилото“ — механики m008 и m025.
 *
 * m008 е визуална (различава се по цвят, размер или форма), m025 е
 * смислова (всички са животни, едно не е). Двигателят е един; разликата е
 * само в съдържанието — точно това е ползата от каталога.
 */
export const oddOneOutParams = z.object({
  items: z.array(tokenSchema).min(3).max(6),

  /** Кой елемент е изключението. */
  oddIndex: z.number().int().min(0),

  /**
   * Показва ли се групата, след като детето е отговорило.
   * За смисловите правила е нужно: детето вижда КАКВО е обединявало
   * останалите, вместо само да чуе „вярно“.
   */
  showGrouping: z.boolean().default(true),
});

export type OddOneOutParams = z.infer<typeof oddOneOutParams>;

export const oddOneOutSchema: EngineSchema<OddOneOutParams> = {
  id: 'odd-one-out',
  paramsSchema: oddOneOutParams.superRefine((value, ctx) => {
    if (value.oddIndex >= value.items.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['oddIndex'],
        message: 'изключението сочи извън списъка',
      });
    }
  }),
};
