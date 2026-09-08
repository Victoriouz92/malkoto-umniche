import { useMemo } from 'react';
import { useApp, activeProfile } from '@/core/store/app';
import { playEffect } from '@/core/audio';
import { playRandomPraise } from '@/core/audio/parentVoice';
import { bandForAge } from '@/design-system';
import type { EngineApi, SfxName } from '@/engines/types';

/**
 * Сглобява `EngineApi` от настройките и профила.
 *
 * Двигателят получава едно нещо и не знае нищо за хранилището, за звука или
 * за възрастовите ленти. Това е границата, зад която двайсетте двигателя
 * остават прости.
 */

const HAPTIC_PATTERNS: Record<'light' | 'success' | 'soft', number | number[]> = {
  light: 8,
  success: [12, 40, 12],
  soft: 4,
};

/** Област за съобщения към екранен четец. Създава се при първа нужда. */
let liveRegion: HTMLElement | null = null;

function announceTo(message: string): void {
  if (typeof document === 'undefined') return;
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'tm-sr-only';
    document.body.appendChild(liveRegion);
  }
  // Изчистването преди записа кара четците да прочетат и повторено съобщение.
  liveRegion.textContent = '';
  window.setTimeout(() => {
    if (liveRegion) liveRegion.textContent = message;
  }, 50);
}

export type CelebrateHandler = (origin?: { x: number; y: number }) => void;

export function useEngineApi(options: {
  noFail: boolean;
  onCelebrate: CelebrateHandler;
  /**
   * Дали текущият кръг е последният в серията.
   *
   * Двигателят не знае, че е част от серия — той празнува в края на СВОЯ
   * кръг. Ако серията продължава, това празнуване е преждевременна награда:
   * конфетите казват „свърши“, а всъщност предстои още задача. Затова
   * решението се взема ТУК, на едно място, вместо шестнайсет пъти в
   * двигателите.
   *
   * Функция, а не булево: обвивката сменя кръга, без да пресъздава api-то.
   */
  isFinalRound?: () => boolean;
}): EngineApi {
  const profile = useApp(activeProfile);
  const voice = useApp((s) => s.settings.voice);
  const reducedMotion = useApp((s) => s.settings.reducedMotion);

  const age = profile?.age ?? 5;
  const { noFail, onCelebrate, isFinalRound } = options;

  return useMemo<EngineApi>(
    () => ({
      ageBand: bandForAge(age),
      noFail,

      sfx: (name: SfxName) => {
        // Финалният акорд се пази за истинския край. По средата на серията
        // същият момент звучи като „готово, следва още“ — светло, но кратко.
        if (name === 'complete' && isFinalRound && !isFinalRound()) {
          playEffect('chime');
          return;
        }
        playEffect(name);
      },

      haptic: (kind) => {
        if (reducedMotion) return;
        navigator.vibrate?.(HAPTIC_PATTERNS[kind]);
      },

      celebrate: (origin) => {
        // Правило 3: прогресът само расте — но наградата идва веднъж, накрая.
        // Между кръговете детето вече е получило звук и преход; конфетите и
        // гласът на родителя остават за края на цялата серия.
        if (isFinalRound && !isFinalRound()) return;
        onCelebrate(origin);
        if (voice && profile) void playRandomPraise(profile.id);
      },

      // Няма синтетичен говор. Инструкцията винаги присъства визуално;
      // записаният близък човек се използва само за насърчение.
      speak: () => undefined,

      announce: announceTo,
    }),
    [age, noFail, voice, reducedMotion, onCelebrate, isFinalRound, profile],
  );
}
