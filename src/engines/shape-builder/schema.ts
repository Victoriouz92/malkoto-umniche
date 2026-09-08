import { z } from 'zod';
import type { EngineSchema } from '../types';
import { BLUEPRINTS } from './blueprints';

export const shapeBuilderParams = z.object({
  blueprint: z.enum(['house', 'rocket', 'flower']).optional(),
  model: z.array(z.string().min(1)).min(2).max(8),
  choices: z.array(z.string().min(1)).min(2).max(8),
  revealAsset: z.string().min(1).optional(),
});
export type ShapeBuilderParams = z.infer<typeof shapeBuilderParams>;
export const shapeBuilderSchema: EngineSchema<ShapeBuilderParams> = {
  id: 'shape-builder',
  paramsSchema: shapeBuilderParams.superRefine((params, ctx) => {
    const required = params.blueprint
      ? BLUEPRINTS[params.blueprint].pieces.map(piece => `shape.${piece.shape}`)
      : params.model;
    for (const id of required) if (!params.choices.includes(id)) ctx.addIssue({
      code: z.ZodIssueCode.custom, path: ['choices'], message: `Липсва необходима форма: ${id}`,
    });
  }),
};
