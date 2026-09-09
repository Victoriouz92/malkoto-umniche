import { Card, Chips, Stack, Stepper, Toggle } from '@/design-system';
import { useApp, activeProfile } from '@/core/store/app';
import { SKILLS, THEMES } from '@/content/schema/constants';
import type { Skill, Theme } from '@/content/schema/constants';
import { skillLabel, themeLabel, t } from '@/i18n';
import s from '../parent.module.css';
import { AGE_STAGES } from '@/content/ageStages';

/**
 * Филтри на съдържанието.
 *
 * По подразбиране всичко следва възрастта на профила — родителят не бива
 * да настройва нищо, за да работи продуктът. Ръчният обхват е за случаите,
 * в които детето изпреварва или изостава от възрастта си.
 */
export function ContentTab() {
  const filter = useApp((st) => st.settings.filter);
  const updateSettings = useApp((st) => st.updateSettings);
  const profile = useApp(activeProfile);
  const updateProfile = useApp((st) => st.updateProfile);

  const set = (patch: Partial<typeof filter>) =>
    updateSettings({ filter: { ...filter, ...patch } });

  const toggleIn = <T extends string>(list: readonly T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const range = filter.ageOverride;
  const unlockedAgeMax = Math.max(profile?.age ?? 2, profile?.unlockedAgeMax ?? profile?.age ?? 2);

  return (
    <div className={s.section}>
      {profile ? (
        <Card variant="flat">
          <Stack gap={4}>
            <strong>{t('parent.content.forChild', { name: profile.name })}</strong>
            <p>{AGE_STAGES[range?.min ?? profile.age]}</p>
            <p className={s.muted}>
              {range
                ? t('parent.content.manualActive', { min: range.min, max: range.max })
                : t('parent.content.autoRange', {
                    age: profile.age,
                    max: unlockedAgeMax,
                  })}
            </p>
            {profile.age < 6 ? (
              <Toggle
                label={t('parent.content.unlockNext', { age: profile.age + 1 })}
                hint={t('parent.content.unlockNextHint')}
                checked={unlockedAgeMax > profile.age}
                onChange={(on) => {
                  updateProfile(profile.id, {
                    unlockedAgeMax: on ? Math.min(6, profile.age + 1) : profile.age,
                  });
                  set({ ageOverride: null });
                }}
              />
            ) : null}
          </Stack>
        </Card>
      ) : null}

      <Card variant="flat">
        <Stack gap={5}>
          <Toggle
            label={t('parent.content.custom')}
            hint={
              range
                ? t('parent.content.ageHint')
                : profile
                  ? `${t('parent.content.followProfile')} — ${profile.age} г.`
                  : t('parent.content.ageHint')
            }
            checked={range !== null}
            onChange={(on) =>
              set({
                ageOverride: on ? { min: profile?.age ?? 4, max: profile?.age ?? 6 } : null,
              })
            }
          />

          {range ? (
            <>
              <Stepper
                label="От възраст"
                value={range.min}
                min={2}
                max={range.max}
                format={(v) => `${v} години`}
                onChange={(v) => set({ ageOverride: { ...range, min: v } })}
              />
              <Stepper
                label="До възраст"
                value={range.max}
                min={range.min}
                max={6}
                format={(v) => `${v} години`}
                onChange={(v) => set({ ageOverride: { ...range, max: v } })}
              />
            </>
          ) : null}
        </Stack>
      </Card>

      <Card variant="flat">
        <Chips<Skill>
          label={t('parent.content.skills')}
          hint={t('parent.content.skillsHint')}
          options={SKILLS}
          selected={filter.skills}
          labelFor={skillLabel}
          onToggle={(skill) => set({ skills: toggleIn(filter.skills, skill) })}
        />
      </Card>

      <Card variant="flat">
        <Chips<Theme>
          label={t('parent.content.themes')}
          hint={t('parent.content.themesHint')}
          options={THEMES}
          selected={filter.themes}
          labelFor={themeLabel}
          onToggle={(theme) => set({ themes: toggleIn(filter.themes, theme) })}
        />
      </Card>
    </div>
  );
}
