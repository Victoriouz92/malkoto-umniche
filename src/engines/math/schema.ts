import { z } from 'zod';
import type { EngineSchema } from '../types';

/**
 * „Събиране с предмети“ и „Изваждане с предмети“ — механики m044 и m045.
 *
 * Ключовото правило от каталога: предметите ОСТАВАТ видими. Детето трябва
 * да може да брои по всяко време — иначе събирането се превръща в правило
 * за запомняне вместо в нещо, което се вижда.
 */
export const mathParams = z.object({
  op: z.enum(['add', 'sub']),

  rounds: z
    .array(
      z.object({
        asset: z.string().min(1),
        a: z.number().int().min(1).max(20),
        b: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(8),

  choices: z.number().int().min(2).max(4).default(3),
});

export type MathParams = z.infer<typeof mathParams>;

export const mathSchema: EngineSchema<MathParams> = {
  id: 'math',
  paramsSchema: mathParams.superRefine((value, ctx) => {
    value.rounds.forEach((round, index) => {
      if (value.op === 'sub' && round.b > round.a) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rounds', index, 'b'],
          message: 'изваждаемото е по-голямо — резултатът щеше да е отрицателен',
        });
      }
      if (value.op === 'add' && round.a + round.b > 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rounds', index],
          message: 'сборът надхвърля 20',
        });
      }
    });
  }),
};
