import type { ComponentType } from 'react';
import type { z } from 'zod';
import type { Activity } from '@/content/schema/activity';
import type { EngineId } from '@/content/schema/constants';

/**
 * Договорът между двигател и активност.
 *
 * Това е най-важният файл в проекта. Ако договорът е стегнат, 500
 * активности се добавят без нито ред код. Ако е разхлабен, на шейсетата
 * активност се пише всичко наново.
 */

// ── Какво двигателят може да поиска от приложението ──────────────

export type SfxName =
  | 'tap'
  | 'pick'
  | 'drop'
  | 'snap'
  | 'soften'
  | 'correct'
  | 'complete'
  | 'sticker'
  | 'chime';

export type HapticKind = 'light' | 'success' | 'soft';

export type EngineApi = {
  /** Звуков ефект. Мълчи, ако звукът е изключен — двигателят не проверява. */
  sfx: (name: SfxName) => void;

  /** Кратка вибрация, ако устройството и настройките я позволяват. */
  haptic: (kind: HapticKind) => void;

  /**
   * Празнуване: конфети плюс похвала.
   * При `prefers-reduced-motion` конфетите не се рисуват, а похвалата остава.
   */
  celebrate: (origin?: { x: number; y: number }) => void;

  /** Изговаря текст, ако е налице глас. Никога не е единственият носител. */
  speak: (text: string) => void;

  /**
   * Съобщава на екранния четец, без да прекъсва.
   * Ползва се за неща, които зрящото дете вижда: „остават три“.
   */
  announce: (message: string) => void;

  /** Възрастовата лента — двигателят мени според нея темпо и мащаб. */
  ageBand: 'toddler' | 'preschool' | 'school';

  /**
   * Дали активността е в режим без грешка.
   * Идва от `activity.noFail` и се налага от схемата за деца до 4 г.
   */
  noFail: boolean;
};

// ── Какво двигателят връща ───────────────────────────────────────

export type ActivityResult = {
  /** Стигна ли се до край, или детето е излязло. */
  completed: boolean;
  durationMs: number;
  /** Верни ходове. */
  correct: number;
  /** Всички опити, включително неверните. */
  attempts: number;
  hintsUsed: number;
};

/**
 * Оценката се смята тук, а не във всеки двигател поотделно.
 * Захранва адаптивната трудност (T2.6).
 */
export function successRate(result: ActivityResult): number {
  if (result.attempts <= 0) return 0;
  return Math.min(1, result.correct / result.attempts);
}

// ── Какво двигателят получава ────────────────────────────────────

export type EngineProps<P> = {
  params: P;
  activity: Activity;
  /**
   * Кой вариант на задачата да се построи.
   *
   * 0 означава „както е написано в JSON-а“. По-големите стойности дават
   * същата задача с друго съдържание — друга подредба, други числа в
   * рамките, зададени от автора. Така една карта става серия, вместо да
   * се повтаря дословно.
   *
   * Двигател, който не поддържа варианти, просто не гледа това поле.
   */
  variant: number;
  api: EngineApi;
  /** Извиква се веднъж, когато активността приключи. */
  onComplete: (result: ActivityResult) => void;
  /** Напредък 0–1. Пълни пръстена в обвивката. */
  onProgress: (fraction: number) => void;
};

// ── Определение на двигател ──────────────────────────────────────

/**
 * Схемата и компонентът са НАРОЧНО разделени.
 *
 * Схемата се внася и от Node (валидаторът в `npm run check`), а компонентът
 * влачи React и DOM. Ако живеят в един файл, валидаторът спира да работи.
 */
export type EngineSchema<P = unknown> = {
  id: EngineId;
  /**
   * Входът е `unknown` нарочно.
   *
   * Полета с `.default()` са незадължителни в JSON-а и задължителни след
   * разбора — точно за това служат. `z.ZodType<P>` изисква двете страни да
   * съвпадат и би направил всеки default невъзможен.
   */
  paramsSchema: z.ZodType<P, z.ZodTypeDef, unknown>;
};

/**
 * Двигател, какъвто го вижда регистърът.
 *
 * Параметрите са `unknown`, защото регистърът е разнороден: пъзелът и
 * паметта имат съвсем различни `params`. Връзката между двете се прави на
 * ЕДНО място — в плеъра, който първо валидира `params` със схемата на
 * същия двигател и чак тогава ги подава. Типът се губи само между тези
 * два реда, а валидацията е реална, не декларативна.
 */
export type LoadedEngine = ComponentType<EngineProps<never>>;

export type EngineModule = {
  id: EngineId;
  /** Мързеливо зареждане: детският режим не тегли двигатели, които не ползва. */
  load: () => Promise<LoadedEngine>;
};
