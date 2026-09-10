import { z } from 'zod';
import type { EngineSchema } from '../types';

export const DIRECTIONS = ['up', 'right', 'down', 'left'] as const;
export type Direction = (typeof DIRECTIONS)[number];
const missionSchema = z.object({
  size: z.number().int().min(3).max(5),
  start: z.number().int().min(0),
  goal: z.number().int().min(0),
  blocks: z.array(z.number().int().min(0)),
  stop: z.number().int().min(0).optional(),
});
export type Mission = z.infer<typeof missionSchema>;

export function stepTo(cell: number, direction: Direction, mission: Mission): number | null {
  const x = cell % mission.size;
  const y = Math.floor(cell / mission.size);
  const nx = x + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0);
  const ny = y + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0);
  if (nx < 0 || ny < 0 || nx >= mission.size || ny >= mission.size) return null;
  const next = ny * mission.size + nx;
  return mission.blocks.includes(next) ? null : next;
}

/** BFS includes the visited-stop flag, so hints respect the whole task. */
export function routeSolution(mission: Mission): Direction[] | null {
  const queue = [
    { cell: mission.start, stopped: mission.stop === undefined, path: [] as Direction[] },
  ];
  const seen = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i]!;
    if (state.cell === mission.goal && state.stopped) return state.path;
    for (const dir of DIRECTIONS) {
      const cell = stepTo(state.cell, dir, mission);
      if (cell === null) continue;
      const stopped = state.stopped || cell === mission.stop;
      const key = `${cell}:${stopped}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ cell, stopped, path: [...state.path, dir] });
    }
  }
  return null;
}

export function runRoute(mission: Mission, commands: readonly Direction[]) {
  const trace = [mission.start];
  let stopped = mission.stop === undefined;
  for (let i = 0; i < commands.length; i++) {
    const next = stepTo(trace[trace.length - 1]!, commands[i]!, mission);
    if (next === null) return { trace, success: false, blockedAt: i };
    trace.push(next);
    stopped ||= next === mission.stop;
  }
  return { trace, success: trace[trace.length - 1] === mission.goal && stopped, blockedAt: -1 };
}

export const routeProgramParams = z
  .object({
    maxCommands: z.number().int().min(3).max(16),
    missions: z.array(missionSchema).min(3).max(5),
  })
  .superRefine((p, ctx) =>
    p.missions.forEach((m, i) => {
      const points = [m.start, m.goal, ...m.blocks, ...(m.stop === undefined ? [] : [m.stop])];
      const invalid =
        points.some((n) => n >= m.size * m.size) || new Set(points).size !== points.length;
      if (invalid) {
        ctx.addIssue({
          code: 'custom',
          path: ['missions', i],
          message: 'Клетките трябва да са валидни и различни.',
        });
        return;
      }
      const solution = routeSolution(m);
      if (!solution || solution.length > p.maxCommands)
        ctx.addIssue({
          code: 'custom',
          path: ['missions', i],
          message: 'Няма решение в позволения брой команди.',
        });
    }),
  );
export type RouteProgramParams = z.infer<typeof routeProgramParams>;
export const routeProgramSchema: EngineSchema<RouteProgramParams> = {
  id: 'route-program',
  paramsSchema: routeProgramParams,
};
