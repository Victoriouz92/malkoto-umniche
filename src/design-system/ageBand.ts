import { useEffect } from 'react';

/**
 * Възрастови ленти.
 *
 * Единственото, което лентата променя ГЛОБАЛНО, е физическият мащаб на
 * интерфейса (тап-таргети, размер на шрифта) — виж tokens.css.
 * Филтрирането на съдържание по възраст е отделна грижа и живее в
 * content/, не тук.
 */
export type AgeBand = 'toddler' | 'preschool' | 'school';

export const AGE_BANDS: Record<AgeBand, { min: number; max: number; label: string }> = {
  toddler: { min: 2, max: 4, label: '2–4 години' },
  preschool: { min: 5, max: 6, label: '5–6 години' },
  school: { min: 7, max: 8, label: '7–8 години' },
};

export function bandForAge(age: number): AgeBand {
  if (age <= 4) return 'toddler';
  if (age <= 6) return 'preschool';
  return 'school';
}

/** Прилага лентата върху <html>, откъдето токените я четат. */
export function useApplyAgeBand(band: AgeBand): void {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset['ageBand'] = band;
    return () => {
      delete root.dataset['ageBand'];
    };
  }, [band]);
}
