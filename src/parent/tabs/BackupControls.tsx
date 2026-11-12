import { useState } from 'react';
import { Button, Card, Cluster, Stack } from '@/design-system';
import { useApp } from '@/core/store/app';
import { downloadJson } from '@/core/persistence/storage';
import { parseSavedState } from '@/core/persistence/savedState';
import type { AppState } from '@/core/store/types';
import s from '../parent.module.css';

export function BackupControls() {
  const [pending, setPending] = useState<AppState | null>(null);
  const [message, setMessage] = useState('');
  return (
    <Card variant="flat">
      <Stack gap={3}>
        <h2>Резервно копие</h2>
        <p className={s.muted}>
          Запазете профилите, напредъка, настройките и родителския PIN във файл. Пазете го
          лично. Гласовите записи не се включват. Данните не се изпращат към сървър.
        </p>
        <Cluster>
          <Button
            variant="soft"
            onClick={() => {
              const { version, profiles, activeProfileId, settings, pin, usage } =
                useApp.getState();
              downloadJson(
                {
                  format: 'malkoto-umniche-backup',
                  version: 1,
                  state: { version, profiles, activeProfileId, settings, pin, usage },
                },
                'umniche-backup.json',
              );
            }}
          >
            Изтегли резервно копие
          </Button>
          <label className={s.backupFile}>
            Възстанови от файл
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                setPending(null);
                setMessage('');
                if (!file) return;
                if (file.size > 2_000_000) {
                  setMessage('Файлът е твърде голям. Изберете резервно копие до 2 MB.');
                  return;
                }
                void file
                  .text()
                  .then((text) => {
                    const value: unknown = JSON.parse(text);
                    if (
                      !value ||
                      typeof value !== 'object' ||
                      !('format' in value) ||
                      value.format !== 'malkoto-umniche-backup' ||
                      !('version' in value) ||
                      value.version !== 1 ||
                      !('state' in value)
                    )
                      throw new Error('Invalid backup');
                    setPending(parseSavedState(value.state));
                  })
                  .catch(() =>
                    setMessage(
                      'Този файл не е валидно резервно копие. Текущите данни са запазени.',
                    ),
                  );
              }}
            />
          </label>
        </Cluster>
        {pending ? (
          <Stack gap={3}>
            <p>
              Копието съдържа {pending.profiles.length} профила. Възстановяването заменя
              текущите профили, напредък, настройки и PIN. Първо изтеглете копие на текущите
              данни.
            </p>
            <Cluster>
              <Button
                variant="primary"
                onClick={() => {
                  useApp.setState(pending);
                  setPending(null);
                  setMessage(
                    'Резервното копие е възстановено. При следващ вход използвайте PIN-а от копието.',
                  );
                }}
              >
                Потвърди възстановяването
              </Button>
              <Button variant="quiet" onClick={() => setPending(null)}>
                Отказ
              </Button>
            </Cluster>
          </Stack>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
      </Stack>
    </Card>
  );
}
