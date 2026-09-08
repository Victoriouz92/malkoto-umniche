import type { Activity } from '@/content/schema/activity';
import type { ChildProfile, ContentFilter } from '@/core/store/types';

export type AgeRange = { min: number; max: number };

/**
 * Единственото място, което решава кое съдържание вижда детето.
 * Старите профили нямат `unlockedAgeMax`, затова мигрират меко към собствената си възраст.
 */
export function allowedAgeRange(
  profile: ChildProfile | null,
  filter: ContentFilter,
): AgeRange {
  if (filter.ageOverride) {
    return { min: Math.max(2, filter.ageOverride.min), max: Math.min(6, filter.ageOverride.max) };
  }
  const age = Math.min(6, profile?.age ?? 2);
  return { min: age, max: Math.min(6, Math.max(age, profile?.unlockedAgeMax ?? age)) };
}

export function isActivityAllowed(activity: Activity, range: AgeRange): boolean {
  return activity.ageMin <= range.max && activity.ageMax >= range.min;
}

export function ageLabel(ageMin: number, ageMax: number): string {
  return ageMin === ageMax ? `${ageMin} г.` : `${ageMin}–${ageMax} г.`;
}
