import { z } from 'zod';
import type { EngineSchema } from '../types';

export const BEATS = ['drum', 'bell', 'rest'] as const;
export type Beat = (typeof BEATS)[number];
export const rhythmParams = z
  .object({
    choices: z.array(z.enum(BEATS)).min(2).max(3),
    guided: z.boolean(),
    beatMs: z.number().int().min(500).max(1000),
    rounds: z.array(z.array(z.enum(BEATS)).min(3).max(8)).length(3),
  })
  .superRefine((p, ctx) => {
    if (
      new Set(p.choices).size !== p.choices.length ||
      p.rounds.some(
        (r) =>
          r.length !== p.rounds[0]!.length ||
          r.every((b) => b === 'rest') ||
          r.some((b) => !p.choices.includes(b)),
      ) ||
      new Set(p.rounds.map((r) => r.join(','))).size !== p.rounds.length
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Нужни са три различни равни по дължина ритъма, с разрешени звуци и поне един удар.',
      });
    }
  });
export type RhythmParams = z.infer<typeof rhythmParams>;
export function sameRhythm(target: readonly Beat[], answer: readonly (Beat | null)[]): boolean {
  return target.length === answer.length && target.every((beat, i) => beat === answer[i]);
}
export const rhythmSchema: EngineSchema<RhythmParams> = {
  id: 'rhythm',
  paramsSchema: rhythmParams,
};
