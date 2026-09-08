import { activitySchema } from './schema/activity';
import type { Activity } from './schema/activity';
import type { Category } from './schema/constants';

/**
 * Всички активности.
 *
 * Файлът, сложен в `activities/`, е регистриран още със слагането си —
 * няма списък, който да се разсинхронизира.
 *
 * Схемата се прилага САМО при разработка. В продукция `npm run check` вече
 * е минал върху същите файлове; повторната валидация на четиридесет (после
 * петстотин) JSON-а при всяко отваряне би била чиста загуба на време по
 * пътя към първия екран.
 */
const FILES: Record<string, unknown> = import.meta.glob('./activities/**/*.json', {
  eager: true,
  import: 'default',
});

function load(): Activity[] {
  const out: Activity[] = [];

  for (const [path, raw] of Object.entries(FILES)) {
    if (import.meta.env.DEV) {
      const parsed = activitySchema.safeParse(raw);
      if (!parsed.success) {
        console.error(`[content] Невалидна активност ${path}:`, parsed.error.issues);
        continue;
      }
      out.push(parsed.data);
    } else {
      out.push(raw as Activity);
    }
  }

  return out.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
}

export const ACTIVITIES: readonly Activity[] = load();

export function activityById(id: string): Activity | null {
  return ACTIVITIES.find((a) => a.id === id) ?? null;
}

export function activitiesInCategory(category: Category): Activity[] {
  return ACTIVITIES.filter((a) => a.category === category);
}

/** Категориите, в които изобщо има съдържание — празна плоскост е разочарование. */
export function populatedCategories(): Category[] {
  return [...new Set(ACTIVITIES.map((a) => a.category))];
}
