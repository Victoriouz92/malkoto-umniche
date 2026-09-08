import { z } from 'zod';
import { tokenSchema } from '../shared/token';
import type { EngineSchema } from '../types';

/**
 * „Продължи шарката“ и „Липсва от шарката“ — механики m023 и m024.
 *
 * m023 е с най-висока оценка в целия каталог заедно с още четири: откриването
 * на правило в повтаряща се редица е зародишът на алгебричното мислене.
 *
 * Един двигател покрива и двете механики: разликата е само къде е дупката.
 * `gapIndex` в края = „продължи“; по средата = „липсва“, което е по-трудно.
 */
export const patternParams = z.object({
  /** Пълната редица, включително елемента на мястото на дупката. */
  sequence: z.array(tokenSchema).min(4).max(12),

  /** Кой елемент е скрит. По подразбиране последният. */
  gapIndex: z.number().int().min(0),

  /**
   * Колко възможности се предлагат.
   * Разсейващите се вземат от самата редица — така всеки вариант е
   * правдоподобен и налучкването не помага.
   */
  choices: z.number().int().min(2).max(4).default(3),
});

export type PatternParams = z.infer<typeof patternParams>;

export const patternSchema: EngineSchema<PatternParams> = {
  id: 'pattern',
  paramsSchema: patternParams.superRefine((value, ctx) => {
    if (value.gapIndex >= value.sequence.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gapIndex'],
        message: 'дупката сочи извън редицата',
      });
    }
    // Правилото трябва да се вижда поне два пъти преди дупката, иначе
    // задачата е налучкване, а не откриване на правило (m023).
    if (value.gapIndex < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gapIndex'],
        message: 'преди дупката трябва да има поне три елемента, за да личи правилото',
      });
    }
  }),
};
