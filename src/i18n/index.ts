import { bg } from './bg';
import type { TranslationKey } from './bg';

export type { TranslationKey };

export type Locale = 'bg';

/**
 * Базовите ключове на двойките за множествено число.
 * `time.minute#one` + `time.minute#other`  →  `time.minute`
 */
type PluralBaseOf<K> = K extends `${infer B}#other` ? B : never;
export type PluralKey = PluralBaseOf<TranslationKey>;

type Dict = Record<string, string>;

const DICTS: Record<Locale, Dict> = { bg };

let current: Locale = 'bg';

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  current = locale;
  document.documentElement.lang = locale;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

function lookup(key: string): string {
  const value = DICTS[current][key];
  if (value !== undefined) return value;

  // Липсващ ключ не бива да чупи екрана пред детето — показваме самия
  // ключ и крещим в конзолата по време на разработка.
  if (import.meta.env.DEV) {
    console.warn(`[i18n] Липсва ключ: ${key}`);
  }
  return key;
}

/** Превод по ключ, с незадължителна интерполация: t('kid.home.greeting', { name }) */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return interpolate(lookup(key), params);
}

/**
 * Превод с множествено число.
 * Българският има две форми: една за 1, друга за всичко останало (CLDR `bg`).
 */
export function tp(
  key: PluralKey,
  count: number,
  params?: Record<string, string | number>,
): string {
  const form = count === 1 ? 'one' : 'other';
  return interpolate(lookup(`${key}#${form}`), { count, ...params });
}

// ── Имена по идентификатор ───────────────────────────────────────
//
// Умения, теми и предмети се движат из кода като английски идентификатори
// (`visual-discrimination`, `animal.cow`). Пред потребителя обаче нямат работа
// на английски — нито пред детето, нито пред родителя в статистиката.
//
// Липсващ ключ връща самия идентификатор и вика в конзолата при разработка,
// вместо да остави празно място на екрана.

/** Име на предмет: `animal.cow` → „крава“. Ползва се и от речниковите игри. */
export function assetLabel(id: string): string {
  return lookup(`asset.${id}`);
}

/** Име на умение: `fine-motor` → „фина моторика“. */
export function skillLabel(skill: string): string {
  return lookup(`skill.${skill}`);
}

/** Име на тема: `farm` → „ферма“. */
export function themeLabel(theme: string): string {
  return lookup(`theme.${theme}`);
}

/**
 * Случайна похвала. Никога една и съща две поредни точки — повторението
 * убива Juicy Feedback точка 8 („свежо“).
 */
const PRAISE: TranslationKey[] = [
  'praise.1',
  'praise.2',
  'praise.3',
  'praise.4',
  'praise.5',
];
const NUDGE: TranslationKey[] = ['nudge.1', 'nudge.2', 'nudge.3'];

let lastPraise = -1;
let lastNudge = -1;

function pickFresh(pool: TranslationKey[], last: number): { key: TranslationKey; i: number } {
  if (pool.length === 0) throw new Error('Празен набор от фрази');
  let i = Math.floor(Math.random() * pool.length);
  if (i === last) i = (i + 1) % pool.length;
  return { key: pool[i] as TranslationKey, i };
}

export function praise(): string {
  const { key, i } = pickFresh(PRAISE, lastPraise);
  lastPraise = i;
  return t(key);
}

export function nudge(): string {
  const { key, i } = pickFresh(NUDGE, lastNudge);
  lastNudge = i;
  return t(key);
}
