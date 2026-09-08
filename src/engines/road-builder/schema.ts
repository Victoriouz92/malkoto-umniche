import { z } from 'zod';
import type { EngineSchema } from '../types';
// Direction numbers go clockwise: up, right, down, left.
export function roadPorts(path: readonly number[], index: number): number[] {
  const cell = path[index]!;
  const direction = (neighbor: number) => neighbor === cell - 3 ? 0 : neighbor === cell + 1 ? 1 : neighbor === cell + 3 ? 2 : 3;
  return [index === 0 ? 3 : direction(path[index - 1]!), index === path.length - 1 ? 1 : direction(path[index + 1]!)];
}
export function roadSolved(path: readonly number[], turns: readonly number[]): boolean {
  if (turns.length !== path.length || turns.some(turn => !Number.isInteger(turn) || turn < 0 || turn > 3)) return false;
  return path.every((_, i) => {
    const ports = roadPorts(path, i);
    return ports.every(port => ports.includes((port + (turns[i] ?? 0)) % 4));
  });
}
export const roadBuilderParams = z.object({
  vehicle: z.string().min(1),
  paths: z.array(z.array(z.number().int().min(0).max(8)).min(3).max(9)).min(2).max(5),
}).superRefine((p, ctx) => p.paths.forEach((path, index) => {
  if (path[0] !== 3 || path[path.length - 1] !== 5 || new Set(path).size !== path.length) {
    ctx.addIssue({ code: 'custom', path: ['paths', index], message: 'Пътят трябва да започва отляво и да завършва вдясно, без повторени клетки' });
  }
  path.forEach((cell, i) => {
    const previous = path[i - 1];
    if (previous !== undefined && Math.abs(cell % 3 - previous % 3) + Math.abs(Math.floor(cell / 3) - Math.floor(previous / 3)) !== 1) {
      ctx.addIssue({ code: 'custom', path: ['paths', index], message: 'Пътят има несъседни отсечки' });
    }
  });
}));
export type RoadBuilderParams = z.infer<typeof roadBuilderParams>;
export const roadBuilderSchema: EngineSchema<RoadBuilderParams> = { id: 'road-builder', paramsSchema: roadBuilderParams };
