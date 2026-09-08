import { z } from 'zod';
import { category, engineId, skill, theme } from './enums';

/**
 * Базовата схема на активност.
 *
 * Обхваща всичко, което е ОБЩО за 20-те двигателя. Полето `params` тук е
 * нетипизирано нарочно: всеки двигател носи собствена Zod схема за него и
 * валидаторът я прилага във втора стъпка (T2.3 от PLAN.md). Така един
 * счупен JSON вдига червен build, а не бял екран пред детето.
 */

export const SCHEMA_VERSION = 1;

const a11yProfile = z.object({
  /** Може ли активността да се реши без цветово зрение. */
  colorIndependent: z.boolean(),
  /** Изисква ли задължително звук. Ако true, трябва и текстова алтернатива. */
  requiresAudio: z.boolean(),
  /** Изисква ли прецизно плъзгане (важно при слаб фин моторен контрол). */
  requiresPrecision: z.boolean().default(false),
});

export const activitySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id: само малки букви, цифри и тире'),
    schemaVersion: z.literal(SCHEMA_VERSION),
    engine: engineId,

    /**
     * Коя механика от каталога реализира активността (`docs/mechanics/`).
     *
     * Не е украса: валидаторът сверява двигателя и възрастовия обхват срещу
     * записа в каталога. Така изследването не остава документ, който никой
     * не отваря, а обвързва всяка активност с основанието да съществува.
     */
    mechanic: z.string().regex(/^m\d{3}$/, 'mechanic: id от каталога, напр. "m009"'),

    titleKey: z.string().min(1),
    category: category,

    ageMin: z.number().int().min(2).max(6),
    ageMax: z.number().int().min(2).max(6),
    difficulty: z.number().int().min(1).max(5),

    skills: z.array(skill).min(1).max(6),
    themes: z.array(theme).min(1).max(3),

    /** Очаквана продължителност в секунди. Пази срещу активности без край. */
    durationSec: z.number().int().min(15).max(600),

    /** Asset id-та, които активността ползва. Проверяват се срещу манифеста. */
    assets: z.array(z.string().min(1)).default([]),

    /** Валидира се от схемата на конкретния двигател. */
    params: z.record(z.unknown()),

    /** Бележка за родителя — защо тази активност е полезна. */
    parentNoteKey: z.string().min(1),

    a11y: a11yProfile,

    /**
     * Меко поведение при грешка: неверният избор се връща, без да се
     * отчита като провал.
     */
    noFail: z.boolean().default(false),
  })
  .superRefine((a, ctx) => {
    if (a.ageMax < a.ageMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ageMax'],
        message: 'ageMax не може да е под ageMin',
      });
    }

    // Принцип 2 от PLAN.md е задължение на схемата, не на добрата воля.
    if (a.ageMin <= 4 && !a.noFail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['noFail'],
        message:
          'Активност за деца до 4 г. трябва да е noFail: true (принцип 2 от PLAN.md)',
      });
    }

    // Ако звукът е задължителен, детето без звук трябва да има изход.
    if (a.a11y.requiresAudio && a.a11y.colorIndependent === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['a11y'],
        message:
          'Активност, която изисква и звук, и цветово зрение, е недостъпна за твърде много деца',
      });
    }
  });

export type Activity = z.infer<typeof activitySchema>;
