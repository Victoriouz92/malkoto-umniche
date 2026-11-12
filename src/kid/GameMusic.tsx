import { useEffect, useState } from 'react';
import type { Category } from '@/content/schema/constants';
import { unlockAudio } from '@/core/audio';
import { startMusic, stopMusic } from '@/core/audio/music';
import type { Mood } from '@/core/audio/music';
import { useApp } from '@/core/store/app';
import { useSession, useTimeState } from '@/core/time/session';
import { t } from '@/i18n';
import s from './ActivityPlayer.module.css';

const tracks: Record<Category, Mood> = {
  puzzles: 'woodland',
  memory: 'atelier',
  numbers: 'railway',
  letters: 'atelier',
  colors: 'atelier',
  shapes: 'railway',
  animals: 'woodland',
  vehicles: 'railway',
  food: 'woodland',
};

export function GameMusic({ category, paused }: { category: Category; paused: boolean }) {
  const preference = useApp((store) => store.settings.music);
  const [playing, setPlaying] = useState(preference);
  const { status } = useTimeState();
  const warned = useSession((store) => store.warned);
  const allowed = playing && !paused && status !== 'over' && (status !== 'warning' || warned);

  useEffect(() => {
    if (!allowed) return;
    let mounted = true;
    void unlockAudio().then(() => {
      if (mounted) startMusic(tracks[category], true);
    });
    return () => {
      mounted = false;
      stopMusic();
    };
  }, [allowed, category]);

  return (
    <button className={s.music} type="button" aria-label={t('kid.activity.music')}
      aria-pressed={playing} onClick={() => {
        if (!playing) void unlockAudio();
        setPlaying(!playing);
      }}>
      <span aria-hidden="true">♪</span>
    </button>
  );
}
