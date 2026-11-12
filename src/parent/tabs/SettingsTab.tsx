import { useState } from 'react';
import { Button, Card, Cluster, Stack, Toggle } from '@/design-system';
import { useApp } from '@/core/store/app';
import { setMood } from '@/core/audio';
import { clear as clearStorage } from 'idb-keyval';
import { t } from '@/i18n';
import s from '../parent.module.css';
import { BackupControls } from './BackupControls';

/** Звук, движение, тема — и изтриване на всичко. */
export function SettingsTab() {
  const settings = useApp((st) => st.settings);
  const updateSettings = useApp((st) => st.updateSettings);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);

  return (
    <div className={s.section}>
      {error ? (
        <p role="alert" className={s.error}>
          {error}
        </p>
      ) : null}
      <Card variant="flat">
        <Stack gap={2}>
          <Toggle
            label={t('parent.settings.sound')}
            checked={settings.sound}
            onChange={(on) => updateSettings({ sound: on })}
          />
          <Toggle
            label={t('parent.settings.music')}
            hint="По желание. Можете да я включите или изключите според предпочитанията на детето."
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
            hint="Ограничава движението и премахва декоративните анимации."
            checked={settings.reducedMotion}
            onChange={(on) => updateSettings({ reducedMotion: on })}
          />
          <Toggle
            label={t('parent.settings.theme')}
            checked={settings.theme === 'dark'}
            // Самото прилагане живее в App.tsx, за да важи и след
            // презареждане. Тук се пази само изборът.
            onChange={(on) => updateSettings({ theme: on ? 'dark' : 'light' })}
          />
        </Stack>
      </Card>

      <BackupControls />
      <Card variant="flat">
        <Stack gap={3}>
          <strong className={s.danger}>{t('parent.reset.title')}</strong>
          <span className={s.muted}>{t('parent.reset.body')}</span>

          {confirming ? (
            <Cluster>
              <Button
                variant="danger"
                disabled={resetting}
                onClick={() => {
                  setResetting(true);
                  void clearStorage()
                    .then(() => window.location.reload())
                    .catch(() => {
                      setResetting(false);
                      setError(
                        'Данните не можаха да се изтрият. Проверете съхранението в браузъра и опитайте отново.',
                      );
                    });
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
