import { useState } from 'react';
import { Button, Card, Cluster, Stack, Stepper, TextInput } from '@/design-system';
import { AGE_BANDS, bandForAge } from '@/design-system';
import { useApp } from '@/core/store/app';
import { t } from '@/i18n';
import s from '../parent.module.css';

/** Профили на децата. Няколко деца на едно устройство е нормалният случай. */
export function ProfilesTab() {
  const profiles = useApp((st) => st.profiles);
  const activeProfileId = useApp((st) => st.activeProfileId);
  const addProfile = useApp((st) => st.addProfile);
  const updateProfile = useApp((st) => st.updateProfile);
  const removeProfile = useApp((st) => st.removeProfile);
  const setActiveProfile = useApp((st) => st.setActiveProfile);
  const filter = useApp((st) => st.settings.filter);
  const updateSettings = useApp((st) => st.updateSettings);

  const [name, setName] = useState('');
  const [age, setAge] = useState(5);
  const [confirming, setConfirming] = useState<string | null>(null);

  const canAdd = name.trim().length > 0;

  return (
    <div className={s.section}>
      {profiles.length === 0 ? (
        <p className={s.muted}>{t('parent.profiles.none')}</p>
      ) : (
        <div className={s.rows}>
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <div key={profile.id} className={s.row}>
                <div className={s.rowMain}>
                  <span className={s.rowTitle}>
                    {profile.name}{' '}
                    {isActive ? (
                      <span className={s.badge}>{t('parent.profiles.active')}</span>
                    ) : null}
                  </span>
                  <span className={s.muted}>
                    {profile.age} г. · {AGE_BANDS[bandForAge(profile.age)].label} ·{' '}
                    {Object.keys(profile.completed).length} завършени ·{' '}
                    {profile.stickers.length} стикера
                  </span>
                </div>

                <Cluster gap={2}>
                  {!isActive ? (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => setActiveProfile(profile.id)}
                    >
                      {t('parent.profiles.makeActive')}
                    </Button>
                  ) : null}
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setConfirming(profile.id)}
                  >
                    {t('action.delete')}
                  </Button>
                </Cluster>
              </div>
            );
          })}
        </div>
      )}

      {/* Изтриването на профил трие и цялата му статистика — затова пита. */}
      {confirming ? (
        <Card variant="flat">
          <Stack gap={3}>
            <strong>{t('parent.profiles.confirmRemove')}</strong>
            <Cluster>
              <Button
                variant="danger"
                onClick={() => {
                  removeProfile(confirming);
                  setConfirming(null);
                }}
              >
                {t('action.delete')}
              </Button>
              <Button variant="quiet" onClick={() => setConfirming(null)}>
                {t('action.cancel')}
              </Button>
            </Cluster>
          </Stack>
        </Card>
      ) : null}

      <Card variant="flat">
        <Stack gap={4}>
          <strong>{t('parent.profiles.add')}</strong>

          <TextInput
            label={t('parent.profiles.name')}
            hint={t('parent.profiles.nameHint')}
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
          />

          <Stepper
            label={t('parent.profiles.age')}
            value={age}
            min={2}
            max={6}
            format={(v) => `${v} години`}
            onChange={setAge}
          />

          <Cluster>
            <Button
              variant="primary"
              disabled={!canAdd}
              onClick={() => {
                const id = addProfile({ name, age });
                setActiveProfile(id);
                setName('');
                setAge(5);
              }}
            >
              {t('action.add')}
            </Button>
          </Cluster>
        </Stack>
      </Card>

      {/* Смяна на възрастта на активния профил — единственото, което се
          променя често, затова е отделно и близо. */}
      {activeProfileId ? (
        <Card variant="flat">
          <Stack gap={3}>
            <strong>{t('parent.profiles.active')}</strong>
            {profiles
              .filter((p) => p.id === activeProfileId)
              .map((p) => (
                <Stepper
                  key={p.id}
                  label={`${p.name} — ${t('parent.profiles.age')}`}
                  value={p.age}
                  min={2}
                  max={6}
                  format={(v) => `${v} години`}
                  onChange={(next) => {
                    updateProfile(p.id, {
                      age: next,
                      unlockedAgeMax: next,
                    });
                    updateSettings({ filter: { ...filter, ageOverride: null } });
                  }}
                />
              ))}
          </Stack>
        </Card>
      ) : null}
    </div>
  );
}
