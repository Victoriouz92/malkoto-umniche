import { z } from 'zod';
import { SKILLS, THEMES } from '@/content/schema/constants';
import { DEFAULT_SETTINGS } from '@/core/store/types';
import type { AppState } from '@/core/store/types';

// Content Security Policy deliberately forbids dynamically evaluated code.
z.config({ jitless: true });

const counter = z.number().finite().nonnegative();
const hash = z
  .string()
  .regex(/^[A-Za-z0-9+/]{43}=$/)
  .nullable();
const salt = z
  .string()
  .regex(/^[A-Za-z0-9+/]{22}==$/)
  .nullable();
const age = z
  .number()
  .int()
  .min(2)
  .max(8)
  .transform((value) => Math.min(6, value));
const profile = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  age,
  unlockedAgeMax: age.optional(),
  avatar: z.string().nullable().default(null),
  createdAt: counter,
  skillRatings: z.partialRecord(z.enum(SKILLS), z.number().min(0).max(1)),
  completed: z.record(z.string(), counter),
  stickers: z.array(z.string()),
  totalMs: counter,
});
const stateSchema = z.object({
  version: z.number().int().min(1).max(2),
  profiles: z.array(profile).max(100),
  activeProfileId: z.string().nullable(),
  settings: z.object({
    sound: z.boolean(),
    music: z.boolean(),
    voice: z.boolean(),
    reducedMotion: z.boolean(),
    theme: z.enum(['system', 'light', 'dark']),
    limits: z.object({
      dailyMin: counter.nullable(),
      sessionMin: counter.nullable(),
      softStopMin: counter,
    }),
    filter: z
      .object({
        ageOverride: z.object({ min: age, max: age }).nullable(),
        skills: z.array(z.enum(SKILLS)),
        themes: z.array(z.enum(THEMES)),
      })
      .default(DEFAULT_SETTINGS.filter),
  }),
  pin: z.object({
    hash,
    salt,
    recoveryHash: hash,
    recoverySalt: salt,
    failedAttempts: counter,
    lockedUntil: counter.nullable(),
  }),
  usage: z.record(z.string(), z.record(z.string(), counter)),
});

/** Validate both disk state and backups before they can replace live data. */
export function parseSavedState(value: unknown): AppState {
  const state = stateSchema.parse(value);
  if (new Set(state.profiles.map((child) => child.id)).size !== state.profiles.length) {
    throw new Error('Duplicate profile IDs');
  }
  if (Boolean(state.pin.hash) !== Boolean(state.pin.salt)) throw new Error('Incomplete PIN');
  if (Boolean(state.pin.recoveryHash) !== Boolean(state.pin.recoverySalt))
    throw new Error('Incomplete recovery code');
  const range = state.settings.filter.ageOverride;
  if (range && range.min > range.max) throw new Error('Invalid age range');
  if (
    state.activeProfileId &&
    !state.profiles.some((child) => child.id === state.activeProfileId)
  ) {
    throw new Error('Missing active profile');
  }
  return {
    ...state,
    version: 2,
    profiles: state.profiles.map((child) => ({
      ...child,
      unlockedAgeMax: Math.max(child.age, child.unlockedAgeMax ?? child.age),
    })),
  };
}
