import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useApp } from '@/core/store/app';
import type { Limits } from '@/core/store/types';

/**
 * Екранното време.
 *
 * Държи се отделно от постоянното хранилище: сесията е преходна и няма
 * какво да оцелява между отварянията. Към диска се записва наведнъж на
 * всеки десет секунди — не на всеки кадър, иначе IndexedDB работи повече
 * от играта.
 *
 * Правило: часовникът върви само когато детето наистина гледа. Скрит таб,
 * пауза и липса на профил спират броенето.
 */

const FLUSH_EVERY_MS = 10_000;
const TICK_MS = 1_000;

type SessionState = {
  /** Натрупано време в ТАЗИ сесия. */
  sessionMs: number;
  paused: boolean;
  /** Родителят е отключил и продължил след изчерпан лимит. */
  overrideUntil: number | null;
  /** Показано ли е вече предупреждението за мекия стоп. */
  warned: boolean;

  addMs: (ms: number) => void;
  reset: () => void;
  setPaused: (paused: boolean) => void;
  markWarned: () => void;
  grantOverride: (minutes: number) => void;
};

export const useSession = create<SessionState>()((set) => ({
  sessionMs: 0,
  paused: false,
  overrideUntil: null,
  warned: false,

  addMs: (ms) => set((s) => ({ sessionMs: s.sessionMs + ms })),
  reset: () => set({ sessionMs: 0, warned: false, overrideUntil: null, paused: false }),
  setPaused: (paused) => set({ paused }),
  markWarned: () => set({ warned: true }),
  grantOverride: (minutes) =>
    set({ overrideUntil: Date.now() + minutes * 60_000, warned: false }),
}));

// ── Пресмятане на оставащото ─────────────────────────────────────

export type TimeStatus = 'ok' | 'warning' | 'over' | 'unlimited';

export type TimeState = {
  status: TimeStatus;
  /** Оставащо време в милисекунди. `Infinity`, ако няма лимит. */
  remainingMs: number;
  /** Кой лимит е по-стегнатият в момента. */
  binding: 'daily' | 'session' | null;
  /** 0–1, за пръстена. Пълни се, не се изпразва. */
  usedFraction: number;
};

export function computeTime(
  limits: Limits,
  msTodayValue: number,
  sessionMs: number,
  overrideUntil: number | null,
): TimeState {
  if (overrideUntil !== null && Date.now() < overrideUntil) {
    return { status: 'ok', remainingMs: overrideUntil - Date.now(), binding: null, usedFraction: 0 };
  }

  const daily = limits.dailyMin === null ? Infinity : limits.dailyMin * 60_000;
  const session = limits.sessionMin === null ? Infinity : limits.sessionMin * 60_000;

  if (daily === Infinity && session === Infinity) {
    return { status: 'unlimited', remainingMs: Infinity, binding: null, usedFraction: 0 };
  }

  const dailyLeft = daily - msTodayValue;
  const sessionLeft = session - sessionMs;

  const binding: 'daily' | 'session' = dailyLeft <= sessionLeft ? 'daily' : 'session';
  const remainingMs = Math.min(dailyLeft, sessionLeft);

  const total = binding === 'daily' ? daily : session;
  const used = binding === 'daily' ? msTodayValue : sessionMs;
  const usedFraction = total === Infinity ? 0 : Math.min(1, Math.max(0, used / total));

  const warnAt = limits.softStopMin * 60_000;

  const status: TimeStatus =
    remainingMs <= 0 ? 'over' : remainingMs <= warnAt ? 'warning' : 'ok';

  return { status, remainingMs: Math.max(0, remainingMs), binding, usedFraction };
}

/** Готовото състояние за текущия профил. */
export function useTimeState(): TimeState {
  const limits = useApp((s) => s.settings.limits);
  const usage = useApp((s) => s.usage);
  const activeProfileId = useApp((s) => s.activeProfileId);
  const sessionMs = useSession((s) => s.sessionMs);
  const overrideUntil = useSession((s) => s.overrideUntil);

  const day = new Date();
  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const msTodayValue = activeProfileId ? (usage[activeProfileId]?.[key] ?? 0) : 0;

  return computeTime(limits, msTodayValue, sessionMs, overrideUntil);
}

// ── Часовникът ───────────────────────────────────────────────────

/**
 * Поставя се веднъж в детската обвивка.
 *
 * Брои само когато прозорецът е видим, има активен профил и няма пауза.
 * Дете, оставило таблета отворен на масата, не бива да си изяде лимита.
 */
export function useSessionClock(): void {
  const activeProfileId = useApp((s) => s.activeProfileId);
  const paused = useSession((s) => s.paused);
  const pending = useRef(0);

  useEffect(() => {
    if (!activeProfileId) return;

    const flush = () => {
      if (pending.current <= 0) return;
      useApp.getState().recordTime(pending.current);
      pending.current = 0;
    };

    const interval = window.setInterval(() => {
      if (document.hidden || useSession.getState().paused) return;
      useSession.getState().addMs(TICK_MS);
      pending.current += TICK_MS;
      if (pending.current >= FLUSH_EVERY_MS) flush();
    }, TICK_MS);

    // Записваме и при затваряне на таба — иначе последните секунди се губят.
    const onHide = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [activeProfileId, paused]);
}

/** „14 мин“ / „под минута“ — за детето и за родителя. */
export function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms)) return 'без ограничение';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes <= 0) return 'изтече';
  if (minutes === 1) return 'под минута';
  return `${minutes} мин`;
}
