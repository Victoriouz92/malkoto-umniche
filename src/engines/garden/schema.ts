import { z } from 'zod';
import type { EngineSchema } from '../types';

const crop = z.enum(['food.strawberry', 'nature.flower']);
export const gardenParams = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('grow'), crop, waterAtStart: z.boolean(), lightAtStart: z.boolean() }),
  z.object({ mode: z.literal('compare'), crop, factor: z.enum(['water', 'light']) }),
]);

export type GardenParams = z.infer<typeof gardenParams>;
export type Care = { water: boolean; light: boolean };
export type Growth = 'seed' | 'sprout' | 'bloom';

/** A single observation in a simplified plant model. */
export function growth({ water, light }: Care): Growth {
  if (!water) return 'seed';
  return light ? 'bloom' : 'sprout';
}

export const gardenSchema: EngineSchema<GardenParams> = { id: 'garden', paramsSchema: gardenParams };
