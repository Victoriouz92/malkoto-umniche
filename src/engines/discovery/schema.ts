import { z } from 'zod';
import type { EngineSchema } from '../types';

export const discoveryParams = z.object({
  mode: z.enum(['match', 'recall', 'group']),
  rounds: z.array(z.object({
    examples: z.array(z.string().min(1)).min(1).max(2),
    choices: z.array(z.string().min(1)).min(2).max(4),
    answer: z.string().min(1),
    sign: z.string().max(3).optional(),
    clue: z.string().min(3).optional(),
  })).min(1).max(4),
}).superRefine(({ mode, rounds }, ctx) => {
  for (const [index, round] of rounds.entries()) {
    const { answer, examples, choices, clue } = round;
    const validExamples = mode === 'group'
      ? examples.length === 2 && new Set(examples).size === 2 && !examples.some((item) => choices.includes(item)) && Boolean(clue)
      : examples.length === 1 && examples[0] === answer;
    if (!validExamples || !choices.includes(answer) || new Set(choices).size !== choices.length) {
      ctx.addIssue({ code: 'custom', path: ['rounds', index], message: 'Невалидни примери или избори.' });
    }
  }
});

export type DiscoveryParams = z.infer<typeof discoveryParams>;
export const discoverySchema: EngineSchema<DiscoveryParams> = {
  id: 'discovery',
  paramsSchema: discoveryParams,
};
