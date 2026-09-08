import { z } from 'zod';
import type { EngineSchema } from '../types';

const placedObject = z.object({
  id: z.string().min(1),
  x: z.number().min(6).max(94),
  y: z.number().min(8).max(92),
  size: z.number().int().min(34).max(96).default(58),
  rotate: z.number().min(-30).max(30).default(0),
  opacity: z.number().min(0.48).max(1).default(0.78),
});

export const spotDifferenceParams = z.object({
  mode: z.enum(['hidden-objects', 'find-all']).default('hidden-objects'),
  scene: z.enum(['scene.farm', 'scene.forest', 'scene.ocean']),
  targets: z.array(placedObject).min(2).max(10),
  decoys: z.array(placedObject).max(10).default([]),
});

export type SpotDifferenceParams = z.infer<typeof spotDifferenceParams>;

export const spotDifferenceSchema: EngineSchema<SpotDifferenceParams> = {
  id: 'spot-difference',
  paramsSchema: spotDifferenceParams,
};
