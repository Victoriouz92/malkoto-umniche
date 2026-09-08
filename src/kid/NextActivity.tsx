import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Asset } from '@/assets/Asset';
import { ACTIVITIES } from '@/content/registry';
import { allowedAgeRange, isActivityAllowed } from '@/content/ageAccess';
import { SKILLS } from '@/content/schema/constants';
import { pickNext, weakestSkills } from '@/core/adaptive/difficulty';
import { activeProfile, useApp } from '@/core/store/app';
import { Button, Page, Stack } from '@/design-system';
import { skillLabel, t } from '@/i18n';
import s from './kid.module.css';

export function NextActivity() {
  const navigate = useNavigate();
  const profile = useApp(activeProfile);
  const filter = useApp((state) => state.settings.filter);
  const range = allowedAgeRange(profile, filter);
  const weak = useMemo(() => profile ? weakestSkills(profile, SKILLS, 3) : [], [profile]);
  const recommendation = useMemo(() => {
    if (!profile) return null;
    const eligible = ACTIVITIES.filter((activity) =>
      isActivityAllowed(activity, range) &&
      (filter.skills.length === 0 || activity.skills.some((skill) => filter.skills.includes(skill))) &&
      (filter.themes.length === 0 || activity.themes.some((theme) => filter.themes.includes(theme)))
    );
    return pickNext(eligible, profile, { preferSkills: weak, ageRange: range });
  }, [filter.skills, filter.themes, profile, range, weak]);

  if (!profile || !recommendation) return <Page centered><Button variant="primary" size="kid" onClick={() => navigate('/kid')}>{t('action.back')}</Button></Page>;
  const mainAsset = recommendation.assets[0];
  return <Page centered className={s.nextPage}><Stack gap={6} className={s.nextContent}>
    <button type="button" className={s.miniBrand} onClick={() => navigate('/kid')}><img src="/icons/icon-192.png" alt="" />{t('app.name')}</button>
    <div className={s.nextCard}>
      <span className={s.nextEyebrow}>Подбрано специално за {profile.name}</span>
      <h1>Какво да играя сега?</h1>
      <div className={s.nextArt}>{mainAsset ? <Asset id={mainAsset} size="100%" /> : <span>★</span>}</div>
      <h2>{t(recommendation.titleKey as never)}</h2>
      <p>Подходящо за упражняване на {weak.map(skillLabel).join(', ')}.</p>
      <Button variant="primary" size="kid" onClick={() => navigate(`/play/${recommendation.id}`)}>Започни играта</Button>
      <button type="button" className={s.nextAgain} onClick={() => navigate('/kid')}>Искам да избера сам</button>
    </div>
  </Stack></Page>;
}
