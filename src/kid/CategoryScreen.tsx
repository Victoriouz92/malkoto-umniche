import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Cluster, Page, Stack, cx } from '@/design-system';
import { Asset } from '@/assets/Asset';
import { activitiesInCategory } from '@/content/registry';
import type { Activity } from '@/content/schema/activity';
import { ageLabel, allowedAgeRange, isActivityAllowed, matchesContentFilter } from '@/content/ageAccess';
import { CATEGORIES } from '@/content/schema/constants';
import { CATEGORY_IDENTITY } from '@/content/categoryIdentity';
import type { Category } from '@/content/schema/constants';
import { useApp, activeProfile } from '@/core/store/app';
import { useSessionClock } from '@/core/time/session';
import { playEffect } from '@/core/audio';
import { t } from '@/i18n';
import { SoftStop } from './SoftStop';
import { ActivityArtwork } from './covers/ActivityArtwork';
import s from './kid.module.css';

const WORLDS: Record<Category, { image: string; figures?: readonly [string, string, string] }> = {
  puzzles: { image: 'hero-malkoto-umniche', figures: ['shape.star', 'shape.triangle', 'animal.fox'] },
  memory: { image: 'slide-reading-wide', figures: ['animal.owl', 'animal.owl', 'nature.cloud'] },
  numbers: { image: 'slide-numbers-wide' },
  letters: { image: 'slide-letters-wide' },
  colors: { image: 'hero-malkoto-umniche', figures: ['nature.flower', 'shape.heart', 'nature.sun'] },
  shapes: { image: 'slide-numbers-wide', figures: ['shape.triangle', 'shape.circle', 'shape.square'] },
  animals: { image: 'slide-reading-wide', figures: ['animal.bear', 'animal.frog', 'animal.fox'] },
  vehicles: { image: 'hero-malkoto-umniche', figures: ['vehicle.train', 'vehicle.airplane', 'vehicle.bus'] },
  food: { image: 'slide-reading-wide', figures: ['food.strawberry', 'food.pear', 'food.carrot'] },
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
  garden: 'Отглеждане',
  'discovery:match': 'Същата картинка',
  'discovery:recall': 'Спомни си картинката',
  'discovery:group': 'Намери семейството',
  'memory:missing': 'Липсваща картинка',
  'memory:sequence': 'Редица по памет',
  'memory:reverse': 'Обратен ред',
  'letters:initial': 'Първи звук',
};

function playType(activity: Activity): string {
  const { engine, params } = activity;
  const type = engine + ':' + String(params.mode);
  return Object.hasOwn(PLAY_TYPES, type) ? type : engine;
}

const PAGE_SIZE = 12;

export function CategoryScreen() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  if (!CATEGORIES.includes(category as Category)) {
    return <Page centered><p>{t('sys.error.body')}</p><Button onClick={() => void navigate('/kid')}>{t('action.back')}</Button></Page>;
  }
  return <CategoryContent key={category} category={category as Category} />;
}

function CategoryContent({ category }: { category: Category }) {
  const navigate = useNavigate();
  const profile = useApp(activeProfile);
  const filter = useApp(st => st.settings.filter);
  const [kind, setKind] = useState('all');
  const [age, setAge] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  useSessionClock();
  const list = useMemo(() => activitiesInCategory(category), [category]);
  const range = allowedAgeRange(profile, filter);
  const ages = Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index);
  const defaultAge = profile && ages.includes(profile.age) ? profile.age : range.min;
  const selectedAge = age !== null && ages.includes(age) ? age : defaultAge;
  const fitting = list.filter(activity => isActivityAllowed(activity, { min: selectedAge, max: selectedAge })
    && matchesContentFilter(activity, filter));
  const kinds = [...new Set(fitting.map(playType))];
  const selectedKind = kinds.includes(kind) ? kind : 'all';
  const visible = fitting.filter(activity => selectedKind === 'all' || playType(activity) === selectedKind);
  const world = WORLDS[category];
  const completed = fitting.filter(activity => (profile?.completed[activity.id] ?? 0) > 0).length;
  // Stable across age and game-type filters.
  const indices = useMemo(() => new Map(list.map((activity, index) => [activity.id, index])), [list]);

  return (
    <Page centered className={s.categoryPage}>
      <SoftStop />
      <Stack gap={6} className={s.catalogue} style={{
        '--category-bg': `var(--cat-${category}-bg)`,
        '--category-ink': `var(--cat-${category}-ink)`,
        '--category-accent': `var(--cat-${category}-accent)`,
      } as CSSProperties}>
        <Cluster between className={s.catalogueNav}>
          <Button variant="quiet" onClick={() => void navigate('/kid')}>← Всички светове</Button>
          <button type="button" className={s.miniBrand} onClick={() => void navigate('/')}>
            <img src="/icons/icon-192.webp" alt="" />Малкото Умниче
          </button>
        </Cluster>
        <header className={s.worldHero} data-category={category}>
          <img className={s.worldImage}
            src={`/optimized/${world.image}-800.webp`}
            srcSet={`/optimized/${world.image}-800.webp 800w, /optimized/${world.image}-1600.webp 1600w`}
            sizes="(max-width: 800px) 100vw, 1100px"
            alt="" aria-hidden="true" />
          {world.figures ? <div className={s.worldFigures} key={selectedAge} aria-hidden="true">
            {world.figures.map((figure, index) => <span key={index}>
              <Asset id={figure} size="100%" />
            </span>)}
          </div> : null}
          <div className={s.worldCopy}>
            <span className={s.worldEyebrow}>{CATEGORY_IDENTITY[category].name}</span>
            <h1>{t(`cat.${category}`)}</h1>
            <p>{CATEGORY_IDENTITY[category].purpose}</p>
            <div className={s.worldFacts}>
              <span>За {ageLabel(selectedAge, selectedAge)}</span>
              <span>{fitting.length} {fitting.length === 1 ? 'игра' : 'игри'}</span>
              {completed > 0 && <span>✓ {completed} открити</span>}
            </div>
          </div>
        </header>
        {ages.length > 1 ? <div className={s.playFilters} role="group" aria-label={t('kid.category.age')}>
          {ages.map((value) => <button key={value} type="button" aria-pressed={value === selectedAge}
            onClick={() => { setAge(value); setKind('all'); setLimit(PAGE_SIZE); }}>
            {ageLabel(value, value)}
          </button>)}
        </div> : null}
        <div className={s.catalogueToolbar}>
          <div><h2>С какво ти се играе?</h2><p>Избери картинка и започни своето откритие.</p></div>
          <span className={s.catalogueCount}>{visible.length} {visible.length === 1 ? 'игра' : 'игри'}</span>
        </div>
        {kinds.length > 1 && <div className={s.playFilters} role="group" aria-label="Вид игра">
          {['all', ...kinds].map(engine => <button type="button" key={engine}
            aria-pressed={selectedKind === engine} onClick={() => { setKind(engine); setLimit(PAGE_SIZE); }}>
            {engine === 'all' ? 'Всички' : PLAY_TYPES[engine]}
          </button>)}
        </div>}
        <div className={s.catalogueCards}>
          {visible.slice(0, limit).map(activity => <ActivityCard key={activity.id} activity={activity}
            index={indices.get(activity.id) ?? 0} played={profile?.completed[activity.id] ?? 0}
            onOpen={() => { playEffect('tap'); void navigate(`/play/${activity.id}`); }} />)}
        </div>
        {visible.length > PAGE_SIZE ? <div className={s.catalogueMore}>
          <span role="status">{t('kid.category.shown', { shown: Math.min(limit, visible.length), total: visible.length })}</span>
          {limit < visible.length ? <Button variant="soft" onClick={() => setLimit(limit + PAGE_SIZE)}>
            {t('kid.category.more')}
          </Button> : null}
        </div> : null}
        {visible.length === 0 && <p className={s.emptyCategory}>{t('kid.category.empty')}</p>}
        <footer className={s.worldFooter}>
          <img src="/icons/icon-192.webp" alt="" />
          <p>Всяко дете открива света със своето темпо.</p>
          <Button variant="quiet" onClick={() => void navigate('/kid')}>Към друг свят →</Button>
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
      <span className={s.gameCardType}>{PLAY_TYPES[playType(activity)]}</span>
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
