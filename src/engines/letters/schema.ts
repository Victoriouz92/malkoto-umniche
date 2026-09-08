import { z } from 'zod';
import type { EngineSchema } from '../types';

/** Българската азбука — 30 букви. */
export const ALPHABET = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ'.split('');

const letter = z.string().refine((v) => ALPHABET.includes(v), {
  message: 'непозната буква за българската азбука',
});

/**
 * „Намери буквата“ (m049) и „С какво започва“ (m051).
 *
 * m051 е с оценка 10: чуването на първия звук в думата предсказва успеха
 * в четенето по-добре от наизустяването на азбуката.
 *
 * Буквите НЕ са графика — идват от Nunito, който вече е в проекта.
 */
export const lettersParams = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('find'),
    target: letter,
    /** Полето, в което се търси. Разсейващите са визуално близки букви. */
    grid: z.array(letter).min(6).max(24),
  }),
  z.object({
    mode: z.literal('initial'),
    rounds: z
      .array(
        z.object({
          asset: z.string().min(1),
          /** С коя буква започва името на предмета. */
          letter,
          /** Възможностите, включително верния отговор. */
          choices: z.array(letter).min(2).max(4),
        }),
      )
      .min(1)
      .max(8),
  }),
]);

export type LettersParams = z.infer<typeof lettersParams>;

export const lettersSchema: EngineSchema<LettersParams> = {
  id: 'letters',
  paramsSchema: lettersParams.superRefine((value, ctx) => {
    if (value.mode === 'find') {
      if (!value.grid.includes(value.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['grid'],
          message: 'търсената буква я няма в полето',
        });
      }
      return;
    }
    value.rounds.forEach((round, index) => {
      if (!round.choices.includes(round.letter)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rounds', index, 'choices'],
          message: 'верният отговор липсва сред възможностите',
        });
      }
    });
  }),
};
