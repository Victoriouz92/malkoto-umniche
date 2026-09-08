import { useNavigate } from 'react-router-dom';
import { Button, Card, Cluster, HoldButton, Page, ProgressRing, Stack } from '@/design-system';
import { ACTIVITIES, activitiesInCategory, populatedCategories } from '@/content/registry';
import { allowedAgeRange, isActivityAllowed } from '@/content/ageAccess';
import type { Category } from '@/content/schema/constants';
import { useApp, activeProfile } from '@/core/store/app';
import { useSessionClock, useTimeState, formatRemaining } from '@/core/time/session';
import { playEffect } from '@/core/audio';
import { Asset } from '@/assets/Asset';
import { t } from '@/i18n';
import { SoftStop } from './SoftStop';
import s from './kid.module.css';

/**
 * Детският начален екран — T4.1.
 *
 * Едри плоскости, по една на категория. Показват се САМО категориите, в
 * които има съдържание: празна плоскост е обещание, което не се спазва.
 *
 * Всяка плоскост носи и картинки, и надпис — цветът никога не е
 * единственият носител на смисъла.
 */
export function KidHome() {
  const navigate = useNavigate();
  const profile = useApp(activeProfile);
  const filter = useApp((st) => st.settings.filter);
  const time = useTimeState();

  useSessionClock();

  const range = allowedAgeRange(profile, filter);
  const categories = populatedCategories().filter((category) =>
    activitiesInCategory(category).some((activity) => isActivityAllowed(activity, range)),
  );

  // Първо пускане: детето не може да си направи профил само.
  if (!profile) {
    return (
      <Page centered>
        <Stack gap={8}>
          <Stack gap={2}>
            <h1>{t('app.name')}</h1>
            <p style={{ color: 'var(--c-ink-soft)' }}>{t('app.tagline')}</p>
          </Stack>

          <Card variant="flat">
            <Stack gap={3}>
              <strong>{t('parent.profiles.none')}</strong>
              <p style={{ color: 'var(--c-ink-soft)' }}>{t('parent.gate.hint')}</p>
            </Stack>
          </Card>

          <Cluster center>
            <Button variant="primary" size="kid" onClick={() => navigate('/parent')}>
              {t('parent.profiles.createFirst')}
            </Button>
          </Cluster>
        </Stack>
      </Page>
    );
  }

  return (
    <Page centered className={s.homePage}>
      <SoftStop />

      <Stack gap={6} className={s.homeContent}>
        <div className={s.homeDecor} aria-hidden="true">
          <span><Asset id="nature.sun" size="100%" /></span>
          <span><Asset id="nature.cloud" size="100%" /></span>
          <span><Asset id="animal.bear" size="100%" /></span>
          <span><Asset id="nature.flower" size="100%" /></span>
        </div>

        <Cluster between>
          <button type="button" className={s.miniBrand} onClick={() => navigate('/')}>
            <img src="/icons/icon-192.png" alt="" aria-hidden="true" />
            {t('app.name')}
          </button>
          <span className={s.ageRange}>{profile.age} г.</span>
        </Cluster>

        <Stack gap={2} className={s.homeIntro}>
          <img className={s.introMascot} src="/icons/icon-192.png" alt="" aria-hidden="true" />
          <h1>{t('kid.home.greeting', { name: profile.name })}</h1>
          <p style={{ color: 'var(--c-ink-soft)' }}>{t('kid.home.pick')}</p>
        </Stack>

        {/* Пръстенът се ПЪЛНИ с изиграното. Празнеещ пръстен пред
            четиригодишно е таймер за тревога, не обратна връзка. */}
        {time.status !== 'unlimited' ? (
          <Cluster center gap={3}>
            <ProgressRing
              value={time.usedFraction}
              size={48}
              thickness={7}
              label={`${t('parent.limits.remaining')}: ${formatRemaining(time.remainingMs)}`}
            />
            <span style={{ color: 'var(--c-ink-soft)', fontSize: 'var(--fs-sm)' }}>
              {formatRemaining(time.remainingMs)}
            </span>
          </Cluster>
        ) : null}

        <div className={s.tiles}>
          {categories.map((category) => (
            <CategoryTile
              key={category}
              category={category}
              range={range}
              onOpen={() => {
                playEffect('tap');
                navigate(`/c/${category}`);
              }}
            />
          ))}
        </div>

        <Cluster center gap={4}>
          <Button variant="primary" size="kid" onClick={() => navigate('/next')}>
            ✨ Какво да играя?
          </Button>
          <Button variant="soft" size="kid" onClick={() => navigate('/stickers')}>
            {t('kid.stickers.title')} · {profile.stickers.length}
          </Button>
        </Cluster>

        <Cluster center>
          <HoldButton label={t('stop.parentUnlock')} onComplete={() => navigate('/parent')} />
        </Cluster>
      </Stack>
    </Page>
  );
}

type CategoryArt = { glyph?: string; assets?: readonly string[]; palette?: boolean };

const CATEGORY_ART: Record<Category, CategoryArt> = {
  puzzles: { glyph: '🧩' },
  memory: { glyph: '🧠' },
  numbers: { glyph: '123' },
  letters: { glyph: 'АБВ' },
  colors: { palette: true },
  shapes: { glyph: '△○□' },
  animals: { assets: ['animal.bear', 'animal.dog'] },
  vehicles: { assets: ['vehicle.car', 'vehicle.bus'] },
  food: { assets: ['food.apple', 'food.strawberry'] },
};

function CategoryTile({
  category,
  range,
  onOpen,
}: {
  category: Category;
  range: { min: number; max: number };
  onOpen: () => void;
}) {
  const list = activitiesInCategory(category).filter((activity) =>
    isActivityAllowed(activity, range),
  );
  const art = CATEGORY_ART[category];

  return (
    <button
      type="button"
      className={s.tile}
      onClick={onOpen}
      style={
        {
          '--tile-bg': `var(--cat-${category}-bg)`,
          '--tile-ink': `var(--cat-${category}-ink)`,
        } as React.CSSProperties
      }
    >
      <span className={s.tileArt} aria-hidden="true">
        {art.palette ? (
          <span className={s.colorPalette}>
            {['red', 'yellow', 'green', 'blue', 'purple'].map((color) => (
              <span
                key={color}
                className={s.colorDot}
                style={{ background: `var(--crayon-${color})` }}
              />
            ))}
          </span>
        ) : art.assets ? (
          art.assets.map((assetId) => (
            <span key={assetId} className={s.categoryAsset}>
              <Asset id={assetId} size="100%" />
            </span>
          ))
        ) : (
          <span className={s.categoryGlyph}>{art.glyph}</span>
        )}
      </span>
      <span className={s.tileLabel}>{t(`cat.${category}`)}</span>
      <span className={s.tileCount}>
        {list.length} {list.length === 1 ? 'игра' : 'игри'}
      </span>
    </button>
  );
}

/** Общият брой активности — ползва се и от витрината на ядрото. */
export const TOTAL_ACTIVITIES = ACTIVITIES.length;
