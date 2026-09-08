import { z } from 'zod';
import type { EngineSchema } from '../types';

const point = z.object({ x: z.number().min(5).max(95), y: z.number().min(5).max(95) });
export const tracingParams = z.object({ points: z.array(point).min(4).max(20), guide: z.string().min(1).max(3).default('●') });
export type TracingParams = z.infer<typeof tracingParams>;
export const tracingSchema: EngineSchema<TracingParams> = { id: 'tracing', paramsSchema: tracingParams };
