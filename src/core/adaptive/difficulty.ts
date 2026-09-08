import type { ActivityResult } from '@/engines/types';
import type { Activity } from '@/content/schema/activity';
import type { ChildProfile } from '@/core/store/types';
import type { Skill } from '@/content/schema/constants';

/**
 * Адаптивна трудност.
 *
 * Flow theory в най-приложимия си вид: твърде лесно е скучно, твърде
 * трудно е тревожно, а между двете има тесен коридор, в който детето играе,
 * без да усеща времето. Целта е да го държим в него.
 *
 * Настройката е БАВНА нарочно. Детето има лоши дни и разсеяни следобеди;
 * трудността не бива да подскача заради една активност.
 */

/** Стойност при първа среща с умение — среда на скалата. */
const UNKNOWN_LEVEL = 0.5;

/**
 * Превръща резултата в оценка 0–1.
 *
 * Точността тежи повече от бързината. Дете, което е решило всичко вярно, но
 * бавно, е разбрало задачата — а разбирането е целта, не скоростта.
 */
export function scoreFromResult(result: ActivityResult, expectedSec: number): number {
  if (!result.completed) return 0;

  const accuracy = result.attempts > 0 ? result.correct / result.attempts : 0;

  const actualSec = result.durationMs / 1000;
  // Под очакваното време = 1; двойно над него = 0. Плавно между тях.
  const pace = Math.max(0, Math.min(1, 2 - actualSec / Math.max(1, expectedSec)));

  // Подсказките не са провал, но показват, че задачата е била на ръба.
  const hintPenalty = Math.min(0.3, result.hintsUsed * 0.1);

  return Math.max(0, Math.min(1, accuracy * 0.7 + pace * 0.3 - hintPenalty));
}

/** Средното ниво на детето по дадените умения, 0–1. */
export function levelFor(profile: ChildProfile, skills: readonly Skill[]): number {
  if (skills.length === 0) return UNKNOWN_LEVEL;
  const sum = skills.reduce((acc, s) => acc + (profile.skillRatings[s] ?? UNKNOWN_LEVEL), 0);
  return sum / skills.length;
}

/**
 * Трудността, която търсим при това ниво.
 *
 * Целим малко НАД текущото ниво, не точно на него: коридорът на потока е
 * там, където е нужно леко усилие.
 */
export function targetDifficulty(level: number): 1 | 2 | 3 | 4 | 5 {
  const stretched = Math.min(1, level + 0.1);
  const value = Math.round(1 + stretched * 4);
  return Math.min(5, Math.max(1, value)) as 1 | 2 | 3 | 4 | 5;
}

/** Съкратен път: нивото на профила по уменията на активността. */
export function targetFor(profile: ChildProfile, skills: readonly Skill[]): number {
  return targetDifficulty(levelFor(profile, skills));
}

// ── Подбор на следваща активност ─────────────────────────────────

export type PickOptions = {
  /** Умения, върху които да се наблегне. Празно = без предпочитание. */
  preferSkills?: readonly Skill[];
  /** Изключва точно тези id-та — обикновено току-що изиграното. */
  exclude?: readonly string[];
  /** Позволява подбор извън възрастта на профила (родителска настройка). */
  ageRange?: { min: number; max: number } | undefined;
};

/**
 * Избира следващата активност.
 *
 * Ред на предпочитание:
 *   1. подходяща по възраст и филтри
 *   2. трудност близо до целевата
 *   3. по-рядко играна
 *   4. случайност, за да не е всеки ден един и същ ред
 */
export function pickNext(
  activities: readonly Activity[],
  profile: ChildProfile,
  options: PickOptions = {},
): Activity | null {
  const { preferSkills = [], exclude = [], ageRange } = options;

  const min = ageRange?.min ?? profile.age;
  const max = ageRange?.max ?? profile.age;

  const eligible = activities.filter(
    (a) => a.ageMin <= max && a.ageMax >= min && !exclude.includes(a.id),
  );
  if (eligible.length === 0) return null;

  const scored = eligible.map((activity) => {
    const skills = preferSkills.length > 0 ? preferSkills : activity.skills;
    const target = targetFor(profile, skills);

    // Колкото по-далеч е трудността от целевата, толкова по-нежелана.
    const distance = Math.abs(activity.difficulty - target);
    const fit = Math.max(0, 3 - distance) / 3;

    const played = profile.completed[activity.id] ?? 0;
    const freshness = 1 / (1 + played);

    const overlap =
      preferSkills.length === 0
        ? 0.5
        : activity.skills.filter((s) => preferSkills.includes(s)).length /
          preferSkills.length;

    const jitter = Math.random() * 0.15;

    return { activity, weight: fit * 0.5 + freshness * 0.25 + overlap * 0.2 + jitter };
  });

  scored.sort((a, b) => b.weight - a.weight);
  return scored[0]?.activity ?? null;
}

/**
 * Уменията, които изостават най-много — за препоръките в родителския панел.
 * Умение, което още не е пробвано, се брои за изоставащо: то е празнина.
 */
export function weakestSkills(profile: ChildProfile, all: readonly Skill[], count = 3): Skill[] {
  return [...all]
    .sort((a, b) => (profile.skillRatings[a] ?? 0) - (profile.skillRatings[b] ?? 0))
    .slice(0, count);
}
