import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Cluster, Grid, Page, Stack, Confetti, ProgressRing } from '@/design-system';
import { Asset } from '@/assets/Asset';
import { ASSET_IDS, assetsIn } from '@/assets/registry';
import { playEffect, setMood } from '@/core/audio';
import type { Mood } from '@/core/audio';
import { useApp, activeProfile } from '@/core/store/app';
import { levelFor, targetFor, scoreFromResult } from '@/core/adaptive/difficulty';
import { SKILLS } from '@/content/schema/constants';
import type { Skill } from '@/content/schema/constants';
import type { SfxName } from '@/engines/types';
import { t, assetLabel, skillLabel } from '@/i18n';
import s from '@/design-system/preview/DesignSystemPreview.module.css';

/**
 * Витрина на ядрото (Фаза 2).
 *
 * Не е продуктов екран. Служи да се чуе всеки звук, да се види всеки актив
 * и да се провери, че хранилището и адаптивната трудност наистина работят —
 * преди двигателите да ги ползват.
 */

const SFX_NAMES: SfxName[] = [
  'tap',
  'pick',
  'drop',
  'snap',
  'soften',
  'correct',
  'complete',
  'sticker',
  'chime',
];

const MOODS: Mood[] = ['home', 'focus', 'celebrate', 'calm'];

const DEMO_SKILLS: Skill[] = ['visual-discrimination', 'counting', 'pattern-recognition'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function CorePreview() {
  const navigate = useNavigate();
  const [shots, setShots] = useState(0);
  const [mood, setActiveMood] = useState<Mood | null>(null);

  const profile = useApp(activeProfile);
  const profiles = useApp((st) => st.profiles);
  const sound = useApp((st) => st.settings.sound);
  const music = useApp((st) => st.settings.music);
  const addProfile = useApp((st) => st.addProfile);
  const removeProfile = useApp((st) => st.removeProfile);
  const updateSettings = useApp((st) => st.updateSettings);
  const recordCompletion = useApp((st) => st.recordCompletion);
  const recordTime = useApp((st) => st.recordTime);
  const msToday = useApp((st) => st.msToday);

  const animals = assetsIn('animal');

  return (
    <Page centered>
      <Confetti trigger={shots} />

      <Cluster between>
        <h1>Ядро</h1>
        <Button variant="quiet" size="sm" onClick={() => navigate('/')}>
          {t('action.back')}
        </Button>
      </Cluster>

      {/* ── Звук ─────────────────────────────────────────────── */}
      <Section title="Звукови ефекти">
        <Stack gap={4}>
          <p className={s.note}>
            Всичко се синтезира през WebAudio — нула байта, под 5 ms забавяне.
            Браузърът пуска звук чак след първи допир, затова първият бутон
            може да мълчи.
          </p>
          <Cluster center>
            {SFX_NAMES.map((name) => (
              <Button key={name} variant="soft" onClick={() => playEffect(name)}>
                {t(`sfx.${name}`)}
              </Button>
            ))}
          </Cluster>
          <Cluster center>
            <Button
              variant={sound ? 'secondary' : 'quiet'}
              onClick={() => updateSettings({ sound: !sound })}
            >
              Звук: {sound ? 'включен' : 'изключен'}
            </Button>
          </Cluster>
        </Stack>
      </Section>

      <Section title="Фонова музика">
        <Stack gap={4}>
          <Cluster center>
            {MOODS.map((m) => (
              <Button
                key={m}
                variant={mood === m ? 'secondary' : 'soft'}
                onClick={() => {
                  if (!music) updateSettings({ music: true });
                  setActiveMood(m);
                  setMood(m);
                }}
              >
                {t(`mood.${m}`)}
              </Button>
            ))}
            <Button
              variant="quiet"
              onClick={() => {
                setActiveMood(null);
                setMood(null);
              }}
            >
              Спри
            </Button>
          </Cluster>
          <p className={s.note}>
            Генеративна, не луп: пентатонична гама, случайни ноти на 3–6
            секунди. Никога не се повтаря буквално.
          </p>
        </Stack>
      </Section>

      {/* ── Графика ──────────────────────────────────────────── */}
      <Section title={`Графика (${ASSET_IDS.length} актива)`}>
        <Stack gap={4}>
          <Grid min="5rem" gap={3}>
            {animals.map((id) => (
              <Card key={id} variant="flat" style={{ padding: 'var(--sp-2)' }}>
                <Asset id={id} size={64} label={assetLabel(id)} />
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-ink-soft)' }}>
                  {assetLabel(id)}
                </span>
              </Card>
            ))}
          </Grid>

          <p className={s.note}>
            Долните три id-та не съществуват. Вместо счупена картинка се
            рисува процедурен заместител — активност може да се напише и
            изпробва, преди графиката ѝ да я има.
          </p>
          <Cluster gap={3} center>
            {['animal.dragon', 'food.pizza', 'vehicle.rocket'].map((id) => (
              <Card key={id} variant="flat" style={{ padding: 'var(--sp-2)' }}>
                <Asset id={id} size={64} label={id} />
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-ink-soft)' }}>
                  {id}
                </span>
              </Card>
            ))}
          </Cluster>
        </Stack>
      </Section>

      {/* ── Профили ──────────────────────────────────────────── */}
      <Section title="Профили и хранилище">
        <Stack gap={4}>
          <Cluster center>
            <Button
              variant="primary"
              onClick={() => addProfile({ name: `Дете ${profiles.length + 1}`, age: 5 })}
            >
              Добави профил
            </Button>
            {profile ? (
              <Button variant="quiet" onClick={() => removeProfile(profile.id)}>
                Изтрий активния
              </Button>
            ) : null}
          </Cluster>

          {profile ? (
            <Card variant="flat">
              <Stack gap={3}>
                <Cluster between>
                  <strong>
                    {profile.name}, {profile.age} г.
                  </strong>
                  <span style={{ color: 'var(--c-ink-soft)', fontSize: 'var(--fs-sm)' }}>
                    днес: {Math.round(msToday() / 1000)} сек · общо:{' '}
                    {Math.round(profile.totalMs / 1000)} сек
                  </span>
                </Cluster>

                <Cluster center>
                  <Button variant="soft" size="sm" onClick={() => recordTime(30_000)}>
                    +30 секунди
                  </Button>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => recordCompletion('demo-good', DEMO_SKILLS, 0.9)}
                  >
                    Завършена добре
                  </Button>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => recordCompletion('demo-weak', DEMO_SKILLS, 0.2)}
                  >
                    Завършена трудно
                  </Button>
                </Cluster>

                <Stack gap={2}>
                  {DEMO_SKILLS.map((skill) => {
                    const value = profile.skillRatings[skill] ?? 0.5;
                    return (
                      <Cluster key={skill} gap={3} center>
                        <ProgressRing value={value} size={44} thickness={6} />
                        <span style={{ fontSize: 'var(--fs-sm)' }}>
                          {skillLabel(skill)} — {value.toFixed(2)}
                        </span>
                      </Cluster>
                    );
                  })}
                </Stack>

                <p className={s.note}>
                  Ниво по тези умения: <strong>{levelFor(profile, DEMO_SKILLS).toFixed(2)}</strong>{' '}
                  → целева трудност <strong>{targetFor(profile, DEMO_SKILLS)}</strong> от 5.
                  Оценката се движи бавно нарочно — детето има лоши дни.
                </p>
              </Stack>
            </Card>
          ) : (
            <p className={s.note}>Няма профил. Добави един, за да видиш останалото.</p>
          )}
        </Stack>
      </Section>

      {/* ── Оценяване ────────────────────────────────────────── */}
      <Section title="Оценка на резултат">
        <Stack gap={3}>
          {[
            { label: 'Всичко вярно, бързо', r: { completed: true, durationMs: 40_000, correct: 8, attempts: 8, hintsUsed: 0 } },
            { label: 'Всичко вярно, бавно', r: { completed: true, durationMs: 140_000, correct: 8, attempts: 8, hintsUsed: 0 } },
            { label: 'Половината, с подсказки', r: { completed: true, durationMs: 90_000, correct: 4, attempts: 8, hintsUsed: 2 } },
            { label: 'Излязло по средата', r: { completed: false, durationMs: 20_000, correct: 2, attempts: 3, hintsUsed: 0 } },
          ].map(({ label, r }) => (
            <Cluster key={label} gap={3} center>
              <ProgressRing value={scoreFromResult(r)} size={44} thickness={6} />
              <span style={{ fontSize: 'var(--fs-sm)' }}>
                {label} — <strong>{scoreFromResult(r).toFixed(2)}</strong>
              </span>
            </Cluster>
          ))}
          <p className={s.note}>
            Точността тежи 70%, темпото 30%. Дете, което е решило всичко вярно,
            но бавно, е разбрало задачата — а разбирането е целта.
          </p>
        </Stack>
      </Section>

      <Section title="Празнуване">
        <Cluster center>
          <Button
            variant="primary"
            size="kid"
            onClick={() => {
              setShots((n) => n + 1);
              playEffect('complete');
            }}
          >
            Празнувай
          </Button>
          <span style={{ color: 'var(--c-ink-soft)', fontSize: 'var(--fs-sm)' }}>
            {SKILLS.length} умения, {ASSET_IDS.length} актива
          </span>
        </Cluster>
      </Section>
    </Page>
  );
}
