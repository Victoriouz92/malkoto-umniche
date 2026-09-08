import { z } from 'zod';
import type { EngineSchema } from '../types';

const round = z.object({
  prompt: z.string().min(3),
  choices: z.array(z.string().min(1)).min(2).max(4),
  answer: z.string().min(1),
  explanation: z.string().min(3),
});

export const semanticChoiceParams = z.object({
  rounds: z.array(round).min(1).max(8),
});

export type SemanticChoiceParams = z.infer<typeof semanticChoiceParams>;

export const semanticChoiceSchema: EngineSchema<SemanticChoiceParams> = {
  id: 'semantic-choice',
  paramsSchema: semanticChoiceParams.superRefine((value, ctx) => {
    value.rounds.forEach((item, index) => {
      if (!item.choices.includes(item.answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rounds', index, 'choices'],
          message: 'верният отговор липсва сред изборите',
        });
      }
      if (new Set(item.choices).size !== item.choices.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rounds', index, 'choices'],
          message: 'изборите трябва да са различни',
        });
      }
    });
  }),
};
