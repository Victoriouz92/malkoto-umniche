import { z } from 'zod';
import { CATEGORIES, ENGINE_IDS, SKILLS, THEMES } from './constants';

/**
 * Zod обвивките около списъците от `constants.ts`.
 *
 * Внасяй ОТТУК само когато ти трябва валидация. За обикновен списък в
 * интерфейса внасяй директно от `constants.ts` — иначе Zod влиза в chunk-а
 * на екрана без причина.
 */

export const engineId = z.enum(ENGINE_IDS);
export const skill = z.enum(SKILLS);
export const theme = z.enum(THEMES);
export const category = z.enum(CATEGORIES);

export {
  CATEGORIES,
  ENGINE_IDS,
  SKILLS,
  THEMES,
} from './constants';

export type { Category, EngineId, Skill, Theme } from './constants';
