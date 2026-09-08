import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * Съхранение върху IndexedDB.
 *
 * Не localStorage: там всичко е низ, лимитът е около 5 MB и записът е
 * синхронен — тоест блокира рисуването точно докато детето влачи нещо.
 * IndexedDB е асинхронна и събира спокойно статистиката за месеци напред.
 *
 * Нищо от това не напуска устройството. Няма бекенд и няма акаунти.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

/** Днешната дата като `2026-08-27`. Ключ за дневната употреба. */
export function today(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Пази само последните 60 дни статистика — иначе расте без край. */
export function trimHistory<T>(byDay: Record<string, T>, keepDays = 60): Record<string, T> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const limit = cutoff.toISOString().slice(0, 10);

  const out: Record<string, T> = {};
  for (const [day, value] of Object.entries(byDay)) {
    if (day >= limit) out[day] = value;
  }
  return out;
}
