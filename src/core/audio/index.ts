import { useEffect } from 'react';
import { useApp } from '@/core/store/app';
import { duckAll, restoreAll, unlockAudio } from './context';
import { playSfx } from './sfx';
import { startMusic, stopMusic } from './music';
import { stopParentVoice } from './parentVoice';
import type { Mood } from './music';
import type { SfxName } from '@/engines/types';

export type { Mood };
export { unlockAudio };

/**
 * Свързва звука с настройките.
 *
 * Двигателите никога не питат дали звукът е включен — просто викат. Тук се
 * решава дали ще се чуе. Едно място за проверка вместо двайсет.
 */
export function playEffect(name: SfxName): void {
  playSfx(name, useApp.getState().settings.sound);
}

export function setMood(mood: Mood | null): void {
  const { music } = useApp.getState().settings;
  if (mood === null || !music) stopMusic();
  else startMusic(mood, true);
}

/**
 * Поставя се веднъж в корена на приложението.
 *
 * Върши три неща, всяко от които е бъг, ако липсва:
 *   1. отключва звука при първия допир (браузърите не позволяват по-рано)
 *   2. млъква, когато приложението загуби фокус — телефонът звъни, приложението мълчи
 *   3. спира музиката, когато родителят я изключи от настройките
 */
export function useAudioLifecycle(): void {
  const music = useApp((s) => s.settings.music);
  const voice = useApp((s) => s.settings.voice);

  useEffect(() => {
    const unlock = () => {
      void unlockAudio();
    };
    window.addEventListener('pointerdown', unlock, { once: false, passive: true });
    window.addEventListener('pointerup', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { once: false, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('pointerup', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        duckAll();
        stopParentVoice();
      } else restoreAll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onBlur = () => {
      duckAll();
      stopParentVoice();
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', restoreAll);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', restoreAll);
    };
  }, []);

  useEffect(() => {
    if (!music) stopMusic();
  }, [music]);
  useEffect(() => {
    if (!voice) stopParentVoice();
  }, [voice]);
}
