import { lazy, Suspense } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';

import { ErrorBoundary } from './ErrorBoundary';
import { Page, Stack } from '@/design-system';
import { useAudioLifecycle } from '@/core/audio';
import { t } from '@/i18n';

/**
 * Hash рутиране.
 *
 * Приложението се инсталира като PWA и се пуска и от `file://`-подобни
 * контексти. Hash-ът работи навсякъде, без сървърна конфигурация — а
 * сървър тук изобщо няма.
 */

// Всеки маршрут е отделен chunk: детският режим никога не тегли
// родителския панел, и обратно. Пази перф бюджета от T6.2.
const KidHome = lazy(() =>
  import('@/kid/KidHome').then((m) => ({ default: m.KidHome })),
);
const LandingPage = lazy(() =>
  import('@/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const ParentHome = lazy(() =>
  import('@/parent/ParentHome').then((m) => ({ default: m.ParentHome })),
);
const DesignSystemPreview = lazy(() =>
  import('@/design-system/preview/DesignSystemPreview').then((m) => ({
    default: m.DesignSystemPreview,
  })),
);
const CorePreview = lazy(() =>
  import('@/core/preview/CorePreview').then((m) => ({ default: m.CorePreview })),
);
const CategoryScreen = lazy(() =>
  import('@/kid/CategoryScreen').then((m) => ({ default: m.CategoryScreen })),
);
const ActivityPlayer = lazy(() =>
  import('@/kid/ActivityPlayer').then((m) => ({ default: m.ActivityPlayer })),
);
const StickerAlbum = lazy(() =>
  import('@/kid/StickerAlbum').then((m) => ({ default: m.StickerAlbum })),
);
const NextActivity = lazy(() =>
  import('@/kid/NextActivity').then((m) => ({ default: m.NextActivity })),
);
const GameReview = import.meta.env.DEV
  ? lazy(() => import('@/kid/preview/GameReview').then(m => ({ default: m.GameReview })))
  : null;

function Loading() {
  return (
    <Page>
      <Stack center>
        <p>{t('sys.loading')}</p>
      </Stack>
    </Page>
  );
}

const router = createHashRouter([
  ...(GameReview ? [{ path: '/review/:activityId', element: <GameReview /> }] : []),
  { path: '/', element: <LandingPage /> },
  { path: '/kid', element: <KidHome /> },
  { path: '/c/:category', element: <CategoryScreen /> },
  { path: '/play/:activityId', element: <ActivityPlayer /> },
  { path: '/stickers', element: <StickerAlbum /> },
  { path: '/next', element: <NextActivity /> },
  { path: '/parent', element: <ParentHome /> },
  { path: '/ds', element: <DesignSystemPreview /> },
  { path: '/core', element: <CorePreview /> },
]);

export function App() {
  // Отключва звука при първи допир и млъква при загуба на фокус.
  useAudioLifecycle();

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
}
