import { z } from 'zod';
import type { EngineSchema } from '../types';

const point = z.object({ x: z.number().min(5).max(95), y: z.number().min(5).max(95) });
export const connectDotsParams = z.object({ points: z.array(point).min(4).max(20), revealAsset: z.string().min(1) });
export type ConnectDotsParams = z.infer<typeof connectDotsParams>;
export const connectDotsSchema: EngineSchema<ConnectDotsParams> = { id: 'connect-dots', paramsSchema: connectDotsParams };
