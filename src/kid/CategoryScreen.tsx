import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Cluster, Page, Stack, cx } from '@/design-system';
import { activitiesInCategory } from '@/content/registry';
import type { Activity } from '@/content/schema/activity';
import { ageLabel, allowedAgeRange, isActivityAllowed } from '@/content/ageAccess';
import { CATEGORIES } from '@/content/schema/constants';
import { CATEGORY_IDENTITY } from '@/content/categoryIdentity';
import { AGE_STAGES } from '@/content/ageStages';
import type { Category } from '@/content/schema/constants';
import { useApp, activeProfile } from '@/core/store/app';
import { useSessionClock } from '@/core/time/session';
import { playEffect } from '@/core/audio';
import { t } from '@/i18n';
import { SoftStop } from './SoftStop';
import { ActivityArtwork } from './covers/ActivityArtwork';
import s from './kid.module.css';

const WORLDS: Record<Category, { intro: string; image: string }> = {
  puzzles: { intro: 'Малко търпение. Голямо „успях!“', image: '/hero-malkoto-umniche.png' },
  memory: { intro: 'Погледни, запомни и открий отново.', image: '/slide-reading-wide.png' },
  numbers: { intro: 'Всяко откритие започва с едно, две, три.', image: '/slide-numbers-wide.png' },
  letters: { intro: 'От първата буква до първата дума.', image: '/slide-letters-wide.png' },
  colors: { intro: 'Място за всички цветове на въображението.', image: '/hero-malkoto-umniche.png' },
  shapes: { intro: 'Кръгчета, ъгълчета и нови открития.', image: '/slide-numbers-wide.png' },
  animals: { intro: 'Запознай се с малки и големи приятели.', image: '/slide-reading-wide.png' },
  vehicles: { intro: 'По пътя, по релсите и високо в небето.', image: '/hero-malkoto-umniche.png' },
  food: { intro: 'Вкусни открития за любопитни умничета.', image: '/slide-reading-wide.png' },
};

const PLAY_TYPES: Record<string, string> = {
  puzzle: 'Пъзели', memory: 'Двойки', matching: 'Свързване', sorting: 'Групиране',
  coloring: 'Оцветяване', counting: 'Броене', pattern: 'Редици',
  'odd-one-out': 'Открий различното', compare: 'Сравняване', sequencing: 'Подреждане',
  maze: 'Лабиринти', math: 'Смятане', letters: 'Открий буквата', drawing: 'Рисуване',
  'sound-match': 'Звуци', 'spot-difference': 'Търсене', tracing: 'Следвай линията',
  'connect-dots': 'Свържи точките', 'shape-builder': 'Строене', words: 'Думи',
  'semantic-choice': 'Познай',
  shopping: 'Пазаруване', 'road-builder': 'Построй път',
  'route-program': 'Програмирай маршрут',
  rhythm: 'Запомни и създай ритъм',
};

export function CategoryScreen() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  if (!CATEGORIES.includes(category as Category)) {
    return <Page centered><p>{t('sys.error.body')}</p><Button onClick={() => navigate('/kid')}>{t('action.back')}</Button></Page>;
  }
  return <CategoryContent key={category} category={category as Category} />;
}

function CategoryContent({ category }: { category: Category }) {
  const navigate = useNavigate();
  const profile = useApp(activeProfile);
  const filter = useApp(st => st.settings.filter);
  const [kind, setKind] = useState('all');
  useSessionClock();
  const list = useMemo(() => activitiesInCategory(category), [category]);
  const range = allowedAgeRange(profile, filter);
  const fitting = list.filter(activity => isActivityAllowed(activity, range));
  const visible = fitting.filter(activity => kind === 'all' || activity.engine === kind);
  const kinds = [...new Set(fitting.map(activity => activity.engine))];
  const world = WORLDS[category];
  const completed = fitting.filter(activity => (profile?.completed[activity.id] ?? 0) > 0).length;
  // Stable across age and game-type filters.
  const indices = new Map(list.map((activity, index) => [activity.id, index]));

  return (
    <Page centered className={s.categoryPage}>
      <SoftStop />
      <Stack gap={6} className={s.catalogue} style={{
        '--category-bg': `var(--cat-${category}-bg)`,
        '--category-ink': `var(--cat-${category}-ink)`,
        '--category-accent': `var(--cat-${category}-accent)`,
      } as CSSProperties}>
        <Cluster between className={s.catalogueNav}>
          <Button variant="quiet" onClick={() => navigate('/kid')}>← Всички светове</Button>
          <button type="button" className={s.miniBrand} onClick={() => navigate('/')}>
            <img src="/icons/icon-192.png" alt="" />Малкото Умниче
          </button>
        </Cluster>
        <header className={s.worldHero}>
          <img className={s.worldImage} src={world.image} alt="" aria-hidden="true" />
          <div className={s.worldCopy}>
            <span className={s.worldEyebrow}>{CATEGORY_IDENTITY[category].name}</span>
            <h1>{t(`cat.${category}`)}</h1>
            <p>{CATEGORY_IDENTITY[category].purpose}</p>
            <p>{AGE_STAGES[range.min]}</p>
            <div className={s.worldFacts}>
              <span>За {ageLabel(range.min, range.max)}</span>
              <span>{fitting.length} {fitting.length === 1 ? 'игра' : 'игри'}</span>
              {completed > 0 && <span>✓ {completed} открити</span>}
            </div>
          </div>
        </header>
        <div className={s.catalogueToolbar}>
          <div><h2>С какво ти се играе?</h2><p>Избери картинка и започни своето откритие.</p></div>
          <span className={s.catalogueCount}>{visible.length} {visible.length === 1 ? 'игра' : 'игри'}</span>
        </div>
        {kinds.length > 1 && <div className={s.playFilters} role="group" aria-label="Вид игра">
          {['all', ...kinds].map(engine => <button type="button" key={engine}
            aria-pressed={kind === engine} onClick={() => setKind(engine)}>
            {engine === 'all' ? 'Всички' : PLAY_TYPES[engine]}
          </button>)}
        </div>}
        <div className={s.catalogueCards}>
          {visible.map(activity => <ActivityCard key={activity.id} activity={activity}
            index={indices.get(activity.id) ?? 0} played={profile?.completed[activity.id] ?? 0}
            onOpen={() => { playEffect('tap'); navigate(`/play/${activity.id}`); }} />)}
        </div>
        {visible.length === 0 && <p className={s.emptyCategory}>{t('kid.category.empty')}</p>}
        <footer className={s.worldFooter}>
          <img src="/icons/icon-192.png" alt="" />
          <p>Всяко дете открива света със своето темпо.</p>
          <Button variant="quiet" onClick={() => navigate('/kid')}>Към друг свят →</Button>
        </footer>
      </Stack>
    </Page>
  );
}

function ActivityCard({ activity, index, played, onOpen }: {
  activity: Activity; index: number; played: number; onOpen: () => void;
}) {
  return <button type="button" className={s.gameCard} onClick={onOpen} data-activity={activity.id}>
    <ActivityArtwork activity={activity} index={index} />
    <span className={s.gameCardBody}>
      <span className={s.gameCardType}>{activity.engine === 'memory' && activity.params.mode && activity.params.mode !== 'pairs'
        ? activity.params.mode === 'missing' ? 'Липсваща картинка' : activity.params.mode === 'reverse' ? 'Обратен ред' : 'Редица по памет'
        : PLAY_TYPES[activity.engine]}</span>
      <span className={s.gameCardTitle}>{t(activity.titleKey as never)}</span>
      <span className={s.gameCardMeta}>
        <span>{ageLabel(activity.ageMin, activity.ageMax)}</span>
        <span className={s.dots} aria-label={`Трудност ${activity.difficulty} от 5`}>
          {[1, 2, 3, 4, 5].map(n => <span key={n} className={cx(s.dot, n <= activity.difficulty && s.dotOn)} />)}
        </span>
        <span className={s.gameCardPlay} aria-label={played > 0 ? 'Вече изиграна' : 'Играй'}>{played > 0 ? '✓' : '↗'}</span>
      </span>
    </span>
  </button>;
}
