import type { Skill, Theme } from '@/content/schema/constants';

/**
 * Всичко, което приложението помни.
 *
 * Живее единствено на устройството. Няма сървър, няма акаунт, няма
 * синхронизация — това е продуктово решение, не техническо ограничение.
 */

export type ChildProfile = {
  id: string;
  name: string;
  /** 2–6. Определя възрастовата лента и филтрирането на съдържание. */
  age: number;
  /** Най-високата отключена възраст. По подразбиране съвпада с `age`. */
  unlockedAgeMax: number;
  /** Asset id за аватар, или `null` за автоматичен. */
  avatar: string | null;
  createdAt: number;

  /**
   * Оценка по умение, 0–1. Захранва адаптивната трудност.
   * Липсващо умение значи „още не е пробвано“.
   */
  skillRatings: Partial<Record<Skill, number>>;

  /** Колко пъти е завършена всяка активност. */
  completed: Record<string, number>;

  /** Спечелени стикери. Оттук нищо не се маха — правило 3. */
  stickers: string[];

  /** Общо време в приложението, милисекунди. */
  totalMs: number;
};

export type ContentFilter = {
  /** `null` значи „по възрастта на профила“. */
  ageOverride: { min: number; max: number } | null;
  /** Празен списък значи „без ограничение“. */
  skills: Skill[];
  themes: Theme[];
};

export type Limits = {
  /** Минути на ден. `null` = без ограничение. */
  dailyMin: number | null;
  /** Минути в една сесия. `null` = без ограничение. */
  sessionMin: number | null;
  /** Колко минути преди края идва предупреждението. Правило: мек стоп. */
  softStopMin: number;
};

export type Settings = {
  sound: boolean;
  music: boolean;
  voice: boolean;
  reducedMotion: boolean;
  theme: 'system' | 'light' | 'dark';
  limits: Limits;
  filter: ContentFilter;
};

export type PinState = {
  hash: string | null;
  salt: string | null;
  /**
   * Отпечатък на кода за възстановяване.
   *
   * Няма сървър, значи няма писмо със „забравена парола“. Кодът се показва
   * веднъж при създаването на PIN и е единственият път назад.
   */
  recoveryHash: string | null;
  recoverySalt: string | null;

  /**
   * Забавянето след поредица грешни опити се ПАЗИ на диска.
   *
   * Ако живееше само в паметта, презареждането щеше да го нулира — а точно
   * това ще опита по-голямото дете, което налучква.
   */
  failedAttempts: number;
  lockedUntil: number | null;
};

/** Употреба по профил и по ден, в милисекунди. */
export type Usage = Record<string, Record<string, number>>;

export type AppState = {
  version: number;
  profiles: ChildProfile[];
  activeProfileId: string | null;
  settings: Settings;
  pin: PinState;
  usage: Usage;
};

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  // Изключена нарочно. Дете, което решава задача, не се нуждае от съпровод,
  // а много родители го намират за досаден. Пуска се съзнателно.
  music: false,
  voice: true,
  reducedMotion: false,
  theme: 'system',
  limits: {
    dailyMin: 30,
    sessionMin: 15,
    softStopMin: 1,
  },
  filter: {
    ageOverride: null,
    skills: [],
    themes: [],
  },
};
