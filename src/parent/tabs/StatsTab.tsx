import { Card, Cluster, Stack } from '@/design-system';
import { useApp, activeProfile } from '@/core/store/app';
import type { Skill } from '@/content/schema/constants';
import { skillLabel, t, tp } from '@/i18n';
import s from '../parent.module.css';

/**
 * Статистика.
 *
 * Показва се на РОДИТЕЛЯ, не на детето — затова тук има числа и сравнения,
 * каквито в детския режим са забранени. И тук обаче няма сравнение с други
 * деца: единственият ориентир е самото дете отпреди седмица.
 */

const DAY_NAMES = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Последните седем дни, най-старият пръв. */
function lastSevenDays(): { key: string; label: string; isToday: boolean }[] {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      key: dayKey(d),
      label: DAY_NAMES[d.getDay()] ?? '',
      isToday: i === 0,
    });
  }
  return out;
}

export function StatsTab() {
  const profile = useApp(activeProfile);
  const usage = useApp((st) => st.usage);

  if (!profile) {
    return (
      <div className={s.section}>
        <p className={s.muted}>{t('parent.profiles.none')}</p>
      </div>
    );
  }

  const byDay = usage[profile.id] ?? {};
  const days = lastSevenDays().map((d) => ({ ...d, ms: byDay[d.key] ?? 0 }));
  const peak = Math.max(1, ...days.map((d) => d.ms));
  const weekMs = days.reduce((sum, d) => sum + d.ms, 0);
  const todayMs = days.at(-1)?.ms ?? 0;

  const completedCount = Object.values(profile.completed).reduce((a, b) => a + b, 0);

  const rated = Object.entries(profile.skillRatings) as [Skill, number][];
  const sorted = [...rated].sort((a, b) => b[1] - a[1]);
  const strongest = sorted.slice(0, 3);
  const weakest = [...sorted].reverse().slice(0, 3);

  const minutes = (ms: number) => Math.round(ms / 60_000);

  if (completedCount === 0 && weekMs === 0) {
    return (
      <div className={s.section}>
        <p className={s.muted}>{t('parent.stats.empty')}</p>
      </div>
    );
  }

  return (
    <div className={s.section}>
      <Cluster gap={3}>
        <div className={s.stat}>
          <span className={s.statValue}>{minutes(todayMs)}</span>
          <span className={s.statLabel}>{t('parent.stats.today')} (мин)</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{minutes(weekMs)}</span>
          <span className={s.statLabel}>{t('parent.stats.week')} (мин)</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{completedCount}</span>
          <span className={s.statLabel}>{t('parent.stats.completed')}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{profile.stickers.length}</span>
          <span className={s.statLabel}>{t('parent.stats.stickers')}</span>
        </div>
      </Cluster>

      <Card variant="flat">
        <Stack gap={3}>
          <strong>{t('parent.stats.week')}</strong>
          <div className={s.bars}>
            {days.map((d) => (
              <div key={d.key} className={s.barCol}>
                <div className={s.barTrack}>
                  <div
                    className={`${s.bar} ${d.isToday ? s.barToday : ''}`}
                    style={{ height: `${(d.ms / peak) * 100}%` }}
                    // Стойността се чете и от екранен четец, не само се вижда.
                    role="img"
                    aria-label={`${d.label}: ${tp('time.minute', minutes(d.ms))}`}
                  />
                </div>
                <span className={s.barLabel}>{d.label}</span>
              </div>
            ))}
          </div>
        </Stack>
      </Card>

      {rated.length > 0 ? (
        <Card variant="flat">
          <Stack gap={4}>
            <strong>{t('parent.stats.bySkill')}</strong>

            <Stack gap={1}>
              <span className={s.muted}>{t('parent.stats.strongest')}</span>
              {strongest.map(([skill, value]) => (
                <SkillBar key={skill} skill={skill} value={value} />
              ))}
            </Stack>

            <Stack gap={1}>
              <span className={s.muted}>{t('parent.stats.weakest')}</span>
              {weakest.map(([skill, value]) => (
                <SkillBar key={skill} skill={skill} value={value} />
              ))}
            </Stack>
          </Stack>
        </Card>
      ) : null}
    </div>
  );
}

function SkillBar({ skill, value }: { skill: Skill; value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className={s.skillRow}>
      <div>
        <div style={{ fontSize: 'var(--fs-sm)' }}>{skillLabel(skill)}</div>
        <div
          className={s.skillTrack}
          role="img"
          aria-label={`${skillLabel(skill)}: ${percent}%`}
        >
          <div className={s.skillFill} style={{ width: `${percent}%` }} />
        </div>
      </div>
      <span className={s.muted} style={{ textAlign: 'right' }}>
        {percent}%
      </span>
    </div>
  );
}
