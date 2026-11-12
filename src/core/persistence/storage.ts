import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

let temporary = false;
let notice: string | null = null;
let original: string | null = null;
const listeners = new Set<() => void>();
export const storageNotice = () => notice;
export function watchStorage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function warn(message: string): void {
  notice = message;
  listeners.forEach((listener) => listener());
}
export function enableTemporaryStorage(): void {
  temporary = true;
  warn(
    'Временен режим: напредъкът ще се загуби при затваряне. Разрешете съхранението в браузъра, за да се запазва.',
  );
}
export const originalSavedData = () => original;
export function downloadJson(value: unknown, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([typeof value === 'string' ? value : JSON.stringify(value, null, 2)], {
      type: 'application/json',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
  getItem: async (name) => {
    if (temporary) return null;
    original = (await get<string>(name)) ?? null;
    return original;
  },
  setItem: async (name, value) => {
    if (temporary) return;
    try {
      await set(name, value);
    } catch {
      warn(
        'Запазването не успя. Освободете място или разрешете съхранението в браузъра. Преди затваряне изтеглете резервно копие от родителските настройки.',
      );
    }
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
