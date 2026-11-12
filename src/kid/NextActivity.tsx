import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLocation, useNavigate } from 'react-router-dom';
import { Asset } from '@/assets/Asset';
import { ACTIVITIES } from '@/content/registry';
import { allowedAgeRange, isActivityAllowed, matchesContentFilter } from '@/content/ageAccess';
import { SKILLS } from '@/content/schema/constants';
import { pickNext, weakestSkills } from '@/core/adaptive/difficulty';
import { activeProfile, useApp } from '@/core/store/app';
import { Button, Page, Stack } from '@/design-system';
import { skillLabel, t } from '@/i18n';
import { useSessionClock } from '@/core/time/session';
import { SoftStop } from './SoftStop';
import s from './kid.module.css';

export function NextActivity() {
  const navigate = useNavigate();
  const state: unknown = useLocation().state;
  const excluded = state && typeof state === 'object' && 'exclude' in state &&
    typeof state.exclude === 'string' ? state.exclude : undefined;
  const profile = useApp(useShallow((store) => {
    const active = activeProfile(store);
    // Elapsed time updates each second; it should not redraw the suggestion.
    return active ? { ...active, totalMs: 0 } : null;
  }));
  const filter = useApp((state) => state.settings.filter);
  const sound = useApp((state) => state.settings.sound);
  const { min, max } = allowedAgeRange(profile, filter);
  useSessionClock();
  const weak = useMemo(() => profile ? weakestSkills(profile, SKILLS, 3) : [], [profile]);
  const recommendation = useMemo(() => {
    if (!profile) return null;
    const ageRange = { min, max };
    const eligible = ACTIVITIES.filter((activity) =>
      isActivityAllowed(activity, ageRange) &&
      (sound || !activity.a11y.requiresAudio) &&
      matchesContentFilter(activity, filter)
    );
    return pickNext(eligible, profile, {
      preferSkills: weak, ageRange, exclude: excluded ? [excluded] : [],
    });
  }, [excluded, filter, max, min, profile, sound, weak]);

  if (!profile || !recommendation) return <Page centered><Stack center gap={4}><p>{t('kid.next.empty')}</p><Button variant="primary" size="kid" onClick={() => void navigate('/kid')}>{t('action.back')}</Button></Stack></Page>;
  const mainAsset = recommendation.assets[0];
  return <Page centered className={s.nextPage}><Stack gap={6} className={s.nextContent}>
    <SoftStop />
    <button type="button" className={s.miniBrand} onClick={() => void navigate('/kid')}><img src="/icons/icon-192.webp" alt="" />{t('app.name')}</button>
    <div className={s.nextCard}>
      <span className={s.nextEyebrow}>{t('kid.next.eyebrow', { name: profile.name })}</span>
      <h1>{t('kid.next.title')}</h1>
      <div className={s.nextArt}>{mainAsset ? <Asset id={mainAsset} size="100%" /> : <span>★</span>}</div>
      <h2>{t(recommendation.titleKey as never)}</h2>
      <p>{t('kid.next.skills', { skills: recommendation.skills.map(skillLabel).join(', ') })}</p>
      <Button variant="primary" size="kid" onClick={() => void navigate(`/play/${recommendation.id}`)}>{t('kid.next.start')}</Button>
      <button type="button" className={s.nextAgain} onClick={() => void navigate('/kid')}>{t('kid.next.choose')}</button>
    </div>
  </Stack></Page>;
}
