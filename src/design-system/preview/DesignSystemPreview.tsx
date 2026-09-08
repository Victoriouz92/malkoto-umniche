import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../Button';
import type { ButtonVariant } from '../Button';
import { Card } from '../Card';
import { Sheet } from '../Sheet';
import { ProgressRing } from '../ProgressRing';
import { Confetti } from '../Confetti';
import { Cluster, Grid, Page, Stack } from '../Layout';
import { AGE_BANDS, useApplyAgeBand } from '../ageBand';
import type { AgeBand } from '../ageBand';
import { CATEGORIES } from '@/content/schema/constants';
import type { Category } from '@/content/schema/constants';
import { t, praise } from '@/i18n';
import s from './DesignSystemPreview.module.css';

/**
 * Жива витрина на дизайн системата.
 *
 * Не е продуктов екран, а инструмент: тук се вижда веднага дали един
 * токен е счупен и дали контрастът работи в двете теми. Достъпен е на
 * маршрут /ds.
 */

const NEUTRALS = [
  '--c-bg',
  '--c-surface',
  '--c-surface-2',
  '--c-surface-3',
  '--c-border',
  '--c-ink',
  '--c-ink-soft',
  '--c-ink-faint',
];

const BRAND = [
  '--c-primary',
  '--c-primary-strong',
  '--c-primary-ink',
  '--c-primary-soft',
  '--c-secondary',
  '--c-secondary-strong',
  '--c-secondary-soft',
];

const STATUS = ['--c-success', '--c-gentle', '--c-warn', '--c-info', '--c-danger'];

/**
 * Вариантите на бутона: за какво служат и как се казват в кода.
 * И двете са нужни — надписът казва кога да го ползваш, кодът какво да напишеш.
 */
const VARIANTS: [ButtonVariant, string][] = [
  ['strong', 'основно'],
  ['secondary', 'второстепенно'],
  ['soft', 'меко'],
  ['quiet', 'тихо'],
  ['danger', 'опасно'],
];

const TYPE_SCALE = [
  ['--fs-xs', '14'],
  ['--fs-sm', '16'],
  ['--fs-md', '18'],
  ['--fs-lg', '22'],
  ['--fs-xl', '28'],
  ['--fs-2xl', '36'],
  ['--fs-3xl', '48'],
  ['--fs-4xl', '72'],
] as const;

const CATEGORY_GLYPH: Record<Category, string> = {
  puzzles: '◧',
  memory: '⬒',
  numbers: '3',
  letters: 'А',
  colors: '●',
  shapes: '▲',
  animals: '⌒',
  vehicles: '▭',
  food: '●',
};

function Swatch({ token }: { token: string }) {
  return (
    <div className={s.swatch}>
      <div className={s.chip} style={{ background: `var(${token})` }} />
      <span className={s.swatchName}>{token}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystemPreview() {
  const [band, setBand] = useState<AgeBand>('preschool');
  const [sheet, setSheet] = useState<'none' | 'bottom' | 'center' | 'full'>('none');
  const [shots, setShots] = useState(0);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useApplyAgeBand(band);

  return (
    <Page centered>
      <Confetti trigger={shots} />

      <Stack gap={4}>
        <Cluster between>
          <h1>Дизайн система</h1>
          <Button variant="quiet" size="sm" onClick={() => navigate('/')}>
            {t('action.back')}
          </Button>
        </Cluster>

        <p className={s.note}>
          Всичко тук чете токени от <code>tokens.css</code>. Смени темата на устройството, за да
          провериш тъмния вариант — компонентите не знаят нищо за цветове.
        </p>
      </Stack>

      <Section title="Възрастова лента">
        <Stack gap={4}>
          <Cluster center>
            {(Object.keys(AGE_BANDS) as AgeBand[]).map((key) => (
              <Button
                key={key}
                variant={band === key ? 'secondary' : 'soft'}
                onClick={() => setBand(key)}
              >
                {AGE_BANDS[key].label}
              </Button>
            ))}
          </Cluster>
          <p style={{ color: 'var(--c-ink-soft)', fontSize: 'var(--fs-sm)' }}>
            Лентата променя <code>--tap</code>, <code>--tap-lg</code> и отстоянията. Бутоните и
            плоскостите отдолу растат заедно с нея.
          </p>
        </Stack>
      </Section>

      <Section title="Неутрални">
        <Grid min="9rem">
          {NEUTRALS.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </Grid>
      </Section>

      <Section title="Бранд">
        <Grid min="9rem">
          {BRAND.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </Grid>
      </Section>

      <Section title="Статуси">
        <Stack gap={4}>
          <Grid min="9rem">
            {STATUS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </Grid>
          <p className={s.note}>
            <strong>--c-gentle</strong> (лилаво) заменя червеното в детския режим.{' '}
            <strong>--c-danger</strong> се ползва само в родителския панел.
          </p>
        </Stack>
      </Section>

      <Section title="Категории">
        <Grid min="11rem">
          {CATEGORIES.map((cat) => (
            <Card
              key={cat}
              variant="tile"
              className={s.tile}
              onActivate={() => setMessage(t(`cat.${cat}`))}
              style={
                {
                  '--tile-bg': `var(--cat-${cat}-bg)`,
                  '--tile-ink': `var(--cat-${cat}-ink)`,
                  '--tile-accent': `var(--cat-${cat}-accent)`,
                } as React.CSSProperties
              }
            >
              <div className={s.tileIcon} aria-hidden="true">
                {CATEGORY_GLYPH[cat]}
              </div>
              <span className={s.tileLabel}>{t(`cat.${cat}`)}</span>
            </Card>
          ))}
        </Grid>
        <p className={s.note} style={{ marginTop: 'var(--sp-4)' }}>
          Знаците са временни. Всяка плоскост носи икона <em>и</em> надпис — цветът никога не е
          единственият носител на смисъла.
        </p>
      </Section>

      <Section title="Типография">
        <Stack gap={0}>
          {TYPE_SCALE.map(([token, px]) => (
            <div key={token} className={s.typeRow}>
              <span className={s.typeMeta}>{px}px</span>
              <span style={{ fontSize: `var(${token})`, fontWeight: 'var(--fw-bold)' }}>
                Ежко Ябълков
              </span>
            </div>
          ))}
        </Stack>
      </Section>

      <Section title="Бутони">
        <Stack gap={6}>
          <Cluster center>
            <Button variant="primary" size="kid">
              {t('action.play')}
            </Button>
            <Button variant="secondary" size="kid">
              {t('action.again')}
            </Button>
            <Button
              variant="primary"
              size="kid"
              iconOnly
              glyph="♪"
              aria-label={t('action.listen')}
            />
          </Cluster>

          <Cluster center>
            {VARIANTS.map(([variant, label]) => (
              <Button key={variant} variant={variant}>
                <span className={s.variantLabel}>
                  {label}
                  <span className={s.variantCode}>{variant}</span>
                </span>
              </Button>
            ))}
            <Button variant="soft" disabled>
              изключен
            </Button>
          </Cluster>

          <Cluster center>
            <Button variant="soft" size="sm">
              малък
            </Button>
            <Button variant="soft" size="md">
              среден
            </Button>
            <Button variant="soft" size="kid">
              детски
            </Button>
          </Cluster>
        </Stack>
      </Section>

      <Section title="Прогрес">
        <Cluster gap={6} center>
          {[0.15, 0.4, 0.75, 1].map((v) => (
            <ProgressRing key={v} value={v} size={80} label={`${Math.round(v * 100)}%`}>
              <strong style={{ fontSize: 'var(--fs-md)' }}>{Math.round(v * 100)}</strong>
            </ProgressRing>
          ))}
          <ProgressRing value={0.6} size={80} color="var(--c-primary)" />
        </Cluster>
      </Section>

      <Section title="Панели">
        <Cluster center>
          <Button variant="soft" onClick={() => setSheet('bottom')}>
            Долен лист
          </Button>
          <Button variant="soft" onClick={() => setSheet('center')}>
            Центриран
          </Button>
          <Button variant="soft" onClick={() => setSheet('full')}>
            Пълен екран (устойчив)
          </Button>
        </Cluster>
      </Section>

      <Section title="Празнуване">
        <Stack gap={4}>
          <Cluster center>
            <Button
              variant="primary"
              size="kid"
              onClick={() => {
                setShots((n) => n + 1);
                setMessage(praise());
              }}
            >
              {t('complete.title')}
            </Button>
            {message ? (
              <strong style={{ fontSize: 'var(--fs-xl)', color: 'var(--c-primary-ink)' }}>
                {message}
              </strong>
            ) : null}
          </Cluster>
          <p className={s.note}>
            При <code>prefers-reduced-motion</code> конфетите не се рисуват — похвалата остава.
          </p>
        </Stack>
      </Section>

      <Sheet
        open={sheet === 'bottom'}
        onClose={() => setSheet('none')}
        placement="bottom"
        title="Долен лист"
      >
        <p>Стига до палеца. Затваря се с плъзгане надолу, Esc или клик встрани.</p>
        <Button variant="primary" onClick={() => setSheet('none')}>
          {t('action.done')}
        </Button>
      </Sheet>

      <Sheet
        open={sheet === 'center'}
        onClose={() => setSheet('none')}
        placement="center"
        title="Центриран диалог"
      >
        <p>За родителския панел на широк екран.</p>
        <Button variant="primary" onClick={() => setSheet('none')}>
          {t('action.done')}
        </Button>
      </Sheet>

      <Sheet
        open={sheet === 'full'}
        onClose={() => setSheet('none')}
        placement="full"
        persistent
        title={t('stop.now.title')}
      >
        <p>{t('stop.now.body')}</p>
        <p style={{ color: 'var(--c-ink-soft)', fontSize: 'var(--fs-sm)' }}>
          Устойчив панел: Esc и кликът встрани са изключени. Така изглежда мекият стоп — детето
          не може да го отхвърли случайно.
        </p>
        <Button variant="quiet" onClick={() => setSheet('none')}>
          {t('stop.parentUnlock')}
        </Button>
      </Sheet>
    </Page>
  );
}
