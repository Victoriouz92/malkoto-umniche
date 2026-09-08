import { z } from 'zod';
import { tokenSchema } from '../shared/token';
import type { EngineSchema } from '../types';

/**
 * „Повече, по-малко“ и „Голямо и малко“ — механики m042 и m007.
 *
 * m042 е основата на числовия усет: детето сравнява количества, преди да
 * умее да ги брои. m007 сравнява размер и дава думите за него.
 */
export const compareParams = z.object({
  /**
   * `count` — коя група е по-многобройна (m042)
   * `size` — кой предмет е по-голям (m007)
   */
  mode: z.enum(['count', 'size']),

  /** Какво се пита. При `size`: повече = по-голямо. */
  ask: z.enum(['more', 'less']),

  rounds: z
    .array(
      z.object({
        left: z.object({ token: tokenSchema, count: z.number().int().min(1).max(12) }),
        right: z.object({ token: tokenSchema, count: z.number().int().min(1).max(12) }),
      }),
    )
    .min(1)
    .max(6),
});

export type CompareParams = z.infer<typeof compareParams>;

export const compareSchema: EngineSchema<CompareParams> = {
  id: 'compare',
  paramsSchema: compareParams.superRefine((value, ctx) => {
    value.rounds.forEach((round, index) => {
      if (value.mode === 'count' && round.left.count === round.right.count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rounds', index],
          message: 'двете групи са равни — няма верен отговор',
        });
      }
      if (value.mode === 'size' && round.left.token.scale === round.right.token.scale) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rounds', index],
          message: 'двата предмета са с еднакъв размер — няма верен отговор',
        });
      }
    });
  }),
};
