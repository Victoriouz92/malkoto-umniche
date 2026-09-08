import { Button, Card, Cluster, Stack, Stepper, Toggle } from '@/design-system';
import { useApp } from '@/core/store/app';
import { useSession, useTimeState, formatRemaining } from '@/core/time/session';
import { t } from '@/i18n';
import s from '../parent.module.css';

/**
 * Лимити на екранното време.
 *
 * Две числа и едно предупреждение. Мекият стоп е причината да има трето
 * поле: рязкото заключване пред четиригодишно произвежда сълзи, а не
 * приемане.
 */
export function LimitsTab() {
  const limits = useApp((st) => st.settings.limits);
  const updateSettings = useApp((st) => st.updateSettings);
  const msToday = useApp((st) => st.msToday);
  const time = useTimeState();
  const grantOverride = useSession((st) => st.grantOverride);
  const sessionMs = useSession((st) => st.sessionMs);

  const set = (patch: Partial<typeof limits>) =>
    updateSettings({ limits: { ...limits, ...patch } });

  const minutes = (ms: number) => `${Math.round(ms / 60_000)} мин`;

  return (
    <div className={s.section}>
      <Cluster gap={3}>
        <div className={s.stat}>
          <span className={s.statValue}>{minutes(msToday())}</span>
          <span className={s.statLabel}>{t('parent.limits.usedToday')}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{minutes(sessionMs)}</span>
          <span className={s.statLabel}>Тази сесия</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{formatRemaining(time.remainingMs)}</span>
          <span className={s.statLabel}>{t('parent.limits.remaining')}</span>
        </div>
      </Cluster>

      {time.status === 'over' ? (
        <Card variant="flat">
          <Stack gap={3}>
            <strong>{t('stop.now.title')}</strong>
            <Cluster>
              <Button variant="primary" onClick={() => grantOverride(10)}>
                {t('parent.limits.grant')}
              </Button>
            </Cluster>
          </Stack>
        </Card>
      ) : null}

      <Card variant="flat">
        <Stack gap={5}>
          <Toggle
            label={t('parent.limits.daily')}
            hint={t('parent.limits.dailyHint')}
            checked={limits.dailyMin !== null}
            onChange={(on) => set({ dailyMin: on ? 30 : null })}
          />
          {limits.dailyMin !== null ? (
            <Stepper
              label={t('parent.limits.daily')}
              value={limits.dailyMin}
              min={5}
              max={180}
              step={5}
              format={(v) => `${v} мин`}
              onChange={(v) => set({ dailyMin: v })}
            />
          ) : null}

          <Toggle
            label={t('parent.limits.session')}
            hint={t('parent.limits.sessionHint')}
            checked={limits.sessionMin !== null}
            onChange={(on) => set({ sessionMin: on ? 15 : null })}
          />
          {limits.sessionMin !== null ? (
            <Stepper
              label={t('parent.limits.session')}
              value={limits.sessionMin}
              min={5}
              max={60}
              step={5}
              format={(v) => `${v} мин`}
              onChange={(v) => set({ sessionMin: v })}
            />
          ) : null}

          <Stepper
            label={t('parent.limits.softStop')}
            hint={t('parent.limits.softStopHint')}
            value={limits.softStopMin}
            min={0}
            max={5}
            format={(v) => (v === 0 ? 'без предупреждение' : `${v} мин преди края`)}
            onChange={(v) => set({ softStopMin: v })}
          />
        </Stack>
      </Card>
    </div>
  );
}
