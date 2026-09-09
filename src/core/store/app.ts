import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage, today, trimHistory } from '@/core/persistence/storage';
import { DEFAULT_SETTINGS } from './types';
import type { AppState, ChildProfile, Settings } from './types';
import type { Skill } from '@/content/schema/constants';
import type { Digest } from '@/core/security/pin';

const STATE_VERSION = 2;
const clampProductAge = (age: number) => Math.min(6, Math.max(2, Math.round(age)));

/**
 * Действията са СВОЙСТВА с функционален тип, не методи.
 *
 * Zustand ги подава на компонентите отделно от обекта (`useApp(s => s.addProfile)`),
 * а методният синтаксис кара TypeScript да ги смята за свързани с `this` —
 * което тук никога не е вярно и вдига `unbound-method`.
 */
type Actions = {
  addProfile: (input: { name: string; age: number; avatar?: string | null }) => string;
  updateProfile: (id: string, patch: Partial<Omit<ChildProfile, 'id'>>) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  setPin: (pin: Digest, recovery: Digest) => void;
  clearPin: () => void;
  /** Отчита грешен опит и заключва вратата след определен брой. */
  registerPinFailure: (maxAttempts: number, lockoutMs: number) => void;
  clearPinFailures: () => void;

  /** Отчита изиграно време за активния профил. */
  recordTime: (ms: number) => void;
  /** Отчита завършена активност и обновява оценките по умения. */
  recordCompletion: (activityId: string, skills: Skill[], score: number) => void;
  awardSticker: (stickerId: string) => void;

  msToday: (profileId?: string) => number;
};

export type AppStore = AppState & Actions;

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Плавно приближаване към новия резултат.
 *
 * Едно слабо представяне не бива да срутва оценката, нито едно добро да я
 * изстреля — детето има лоши дни, а трудността трябва да се движи бавно.
 */
const LEARNING_RATE = 0.25;

export const useApp = create<AppStore>()(
  persist(
    (set, get) => ({
      version: STATE_VERSION,
      profiles: [],
      activeProfileId: null,
      settings: DEFAULT_SETTINGS,
      pin: {
        hash: null,
        salt: null,
        recoveryHash: null,
        recoverySalt: null,
        failedAttempts: 0,
        lockedUntil: null,
      },
      usage: {},

      addProfile: ({ name, age, avatar = null }) => {
        const profile: ChildProfile = {
          id: newId(),
          name: name.trim(),
          age: clampProductAge(age),
          unlockedAgeMax: clampProductAge(age),
          avatar,
          createdAt: Date.now(),
          skillRatings: {},
          completed: {},
          stickers: [],
          totalMs: 0,
        };
        set((s) => ({
          profiles: [...s.profiles, profile],
          activeProfileId: s.activeProfileId ?? profile.id,
        }));
        return profile.id;
      },

      updateProfile: (id, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      removeProfile: (id) =>
        set((s) => {
          const usage = { ...s.usage };
          delete usage[id];
          const profiles = s.profiles.filter((p) => p.id !== id);
          return {
            profiles,
            usage,
            activeProfileId:
              s.activeProfileId === id ? (profiles[0]?.id ?? null) : s.activeProfileId,
          };
        }),

      setActiveProfile: (id) => set({ activeProfileId: id }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setPin: (pin, recovery) =>
        set({
          pin: {
            hash: pin.hash,
            salt: pin.salt,
            recoveryHash: recovery.hash,
            recoverySalt: recovery.salt,
            failedAttempts: 0,
            lockedUntil: null,
          },
        }),

      clearPin: () =>
        set({
          pin: {
            hash: null,
            salt: null,
            recoveryHash: null,
            recoverySalt: null,
            failedAttempts: 0,
            lockedUntil: null,
          },
        }),

      registerPinFailure: (maxAttempts, lockoutMs) =>
        set((s) => {
          const attempts = s.pin.failedAttempts + 1;
          const locked = attempts >= maxAttempts;
          return {
            pin: {
              ...s.pin,
              failedAttempts: locked ? 0 : attempts,
              lockedUntil: locked ? Date.now() + lockoutMs : s.pin.lockedUntil,
            },
          };
        }),

      clearPinFailures: () =>
        set((s) => ({ pin: { ...s.pin, failedAttempts: 0, lockedUntil: null } })),

      recordTime: (ms) => {
        const { activeProfileId } = get();
        if (!activeProfileId || ms <= 0) return;
        const day = today();

        set((s) => {
          const forProfile = { ...(s.usage[activeProfileId] ?? {}) };
          forProfile[day] = (forProfile[day] ?? 0) + ms;

          return {
            usage: { ...s.usage, [activeProfileId]: trimHistory(forProfile) },
            profiles: s.profiles.map((p) =>
              p.id === activeProfileId ? { ...p, totalMs: p.totalMs + ms } : p,
            ),
          };
        });
      },

      recordCompletion: (activityId, skills, score) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;

        set((s) => ({
          profiles: s.profiles.map((p) => {
            if (p.id !== activeProfileId) return p;

            const skillRatings = { ...p.skillRatings };
            for (const skill of skills) {
              const previous = skillRatings[skill] ?? Math.max(0, Math.min(1, (p.age - 2) / 4));
              skillRatings[skill] = previous + (score - previous) * LEARNING_RATE;
            }

            return {
              ...p,
              skillRatings,
              completed: {
                ...p.completed,
                [activityId]: (p.completed[activityId] ?? 0) + 1,
              },
            };
          }),
        }));
      },

      awardSticker: (stickerId) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === activeProfileId && !p.stickers.includes(stickerId)
              ? { ...p, stickers: [...p.stickers, stickerId] }
              : p,
          ),
        }));
      },

      msToday: (profileId) => {
        const s = get();
        const id = profileId ?? s.activeProfileId;
        if (!id) return 0;
        return s.usage[id]?.[today()] ?? 0;
      },
    }),
    {
      name: 'tinymind',
      version: STATE_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        version: s.version,
        profiles: s.profiles,
        activeProfileId: s.activeProfileId,
        settings: s.settings,
        pin: s.pin,
        usage: s.usage,
      }),
      migrate: (persisted) => {
        const saved = persisted as AppState;
        return {
          ...saved,
          profiles: (saved.profiles ?? []).map((profile) => ({
            ...profile,
            age: clampProductAge(profile.age),
            unlockedAgeMax: clampProductAge(profile.unlockedAgeMax ?? profile.age),
          })),
          settings: {
            ...saved.settings,
            filter: {
              ...saved.settings.filter,
              ageOverride: saved.settings.filter.ageOverride
                ? {
                    min: clampProductAge(saved.settings.filter.ageOverride.min),
                    max: clampProductAge(saved.settings.filter.ageOverride.max),
                  }
                : null,
            },
          },
        };
      },
    },
  ),
);

// ── Селектори ────────────────────────────────────────────────────

export function activeProfile(s: AppStore): ChildProfile | null {
  return s.profiles.find((p) => p.id === s.activeProfileId) ?? null;
}

export function hasPin(s: AppStore): boolean {
  return s.pin.hash !== null;
}
