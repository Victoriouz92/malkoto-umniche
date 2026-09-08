import { useState } from 'react';
import { Button, Card, Cluster, Stack, Toggle } from '@/design-system';
import { useApp } from '@/core/store/app';
import { setMood } from '@/core/audio';
import { clear as clearStorage } from 'idb-keyval';
import { t } from '@/i18n';
import s from '../parent.module.css';

/** Звук, движение, тема — и изтриване на всичко. */
export function SettingsTab() {
  const settings = useApp((st) => st.settings);
  const updateSettings = useApp((st) => st.updateSettings);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={s.section}>
      <Card variant="flat">
        <Stack gap={2}>
          <Toggle
            label={t('parent.settings.sound')}
            checked={settings.sound}
            onChange={(on) => updateSettings({ sound: on })}
          />
          <Toggle
            label={t('parent.settings.music')}
            hint="Изключена по подразбиране — детето мисли, музиката не помага."
            checked={settings.music}
            onChange={(on) => {
              updateSettings({ music: on });
              if (!on) setMood(null);
            }}
          />
          <Toggle
            label={t('parent.settings.voice')}
            hint="Пуска записаните насърчителни реплики от раздел „Моят глас“."
            checked={settings.voice}
            onChange={(on) => updateSettings({ voice: on })}
          />
          <Toggle
            label={t('parent.settings.motion')}
            hint="Свива анимациите до почти мигновени. Не ги изключва — детето губи обратната връзка."
            checked={settings.reducedMotion}
            onChange={(on) => updateSettings({ reducedMotion: on })}
          />
          <Toggle
            label={t('parent.settings.theme')}
            checked={settings.theme === 'dark'}
            onChange={(on) => {
              const theme = on ? 'dark' : 'light';
              updateSettings({ theme });
              document.documentElement.dataset['theme'] = theme;
            }}
          />
        </Stack>
      </Card>

      <Card variant="flat">
        <Stack gap={3}>
          <strong className={s.danger}>{t('parent.reset.title')}</strong>
          <span className={s.muted}>{t('parent.reset.body')}</span>

          {confirming ? (
            <Cluster>
              <Button
                variant="danger"
                onClick={() => {
                  void clearStorage().then(() => window.location.reload());
                }}
              >
                {t('action.delete')}
              </Button>
              <Button variant="quiet" onClick={() => setConfirming(false)}>
                {t('action.cancel')}
              </Button>
            </Cluster>
          ) : (
            <Cluster>
              <Button variant="quiet" onClick={() => setConfirming(true)}>
                {t('parent.reset.title')}
              </Button>
            </Cluster>
          )}
        </Stack>
      </Card>
    </div>
  );
}
