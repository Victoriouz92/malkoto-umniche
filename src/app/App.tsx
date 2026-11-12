import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';

import { ErrorBoundary } from './ErrorBoundary';
import { Button, Page, Stack } from '@/design-system';
import { useAudioLifecycle } from '@/core/audio';
import { activeProfile, getHydrationFailure, useApp } from '@/core/store/app';
import {
  downloadJson,
  originalSavedData,
  storageNotice,
  enableTemporaryStorage,
  watchStorage,
} from '@/core/persistence/storage';
import { bandForAge } from '@/design-system/ageBand';
import { t } from '@/i18n';
import { LandingPage } from '@/landing/LandingPage';
import { RouteFrame } from './RouteFrame';

// Read saved profiles, PIN and settings before mounting any route.
export const hydration = Promise.resolve(useApp.persist.rehydrate());

/**
 * Hash рутиране.
 *
 * Приложението се инсталира като PWA и се пуска и от `file://`-подобни
 * контексти. Hash-ът работи навсякъде, без сървърна конфигурация — а
 * сървър тук изобщо няма.
 */

// Всеки маршрут е отделен chunk: детският режим никога не тегли
// родителския панел, и обратно. Пази перф бюджета от T6.2.
const KidHome = lazy(() => import('@/kid/KidHome').then((m) => ({ default: m.KidHome })));
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
const InformationPage = lazy(() =>
  import('@/landing/InformationPage').then((m) => ({ default: m.InformationPage })),
);
const GameReview = import.meta.env.DEV
  ? lazy(() => import('@/kid/preview/GameReview').then((m) => ({ default: m.GameReview })))
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
  {
    element: <RouteFrame />,
    children: [
      ...(GameReview ? [{ path: '/review/:activityId', element: <GameReview /> }] : []),
      { path: '/', element: <LandingPage /> },
      { path: '/kid', element: <KidHome /> },
      { path: '/c/:category', element: <CategoryScreen /> },
      { path: '/play/:activityId', element: <ActivityPlayer /> },
      { path: '/stickers', element: <StickerAlbum /> },
      { path: '/next', element: <NextActivity /> },
      { path: '/parent', element: <ParentHome /> },
      ...['help', 'privacy', 'credits'].map((page) => ({
        path: `/${page}`,
        element: <InformationPage section={page} />,
      })),
      ...(import.meta.env.DEV
        ? [
            { path: '/ds', element: <DesignSystemPreview /> },
            { path: '/core', element: <CorePreview /> },
          ]
        : []),
      { path: '*', element: <InformationPage section="missing" /> },
    ].map((route) => ({
      ...route,
      element:
        route.path === '/' ? (
          route.element
        ) : (
          <Suspense fallback={<Loading />}>{route.element}</Suspense>
        ),
    })),
  },
]);

export function App() {
  useEffect(() => {
    document.documentElement.dataset['appReady'] = 'true';
    return () => {
      delete document.documentElement.dataset['appReady'];
    };
  }, []);
  const [ready, setReady] = useState(() => useApp.persist.hasHydrated());
  const [startupError, setStartupError] = useState<unknown>(null);
  const notice = useSyncExternalStore(watchStorage, storageNotice, () => null);
  useEffect(() => {
    let mounted = true;
    void hydration.then(() => {
      if (mounted) {
        setStartupError(getHydrationFailure());
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Отключва звука при първи допир и млъква при загуба на фокус.
  useAudioLifecycle();

  /**
   * Темата се прилага при всяко зареждане, не само при превключване.
   *
   * Настройката се пазеше вярно, но `data-theme` се слагаше единствено в
   * момента на щракване върху превключвателя. След презареждане родител,
   * избрал тъмна тема на светло устройство, я получаваше обратно светла —
   * и обратното.
   */
  const theme = useApp((state) => state.settings.theme);
  const reducedMotion = useApp((state) => state.settings.reducedMotion);
  const age = useApp((state) => activeProfile(state)?.age ?? 2);
  useEffect(() => {
    document.documentElement.dataset['ageBand'] = bandForAge(age);
  }, [age]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset['theme'];
    else root.dataset['theme'] = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduced-motion', reducedMotion);
  }, [reducedMotion]);

  return (
    <ErrorBoundary>
      {startupError ? (
        <Page narrow>
          <Stack gap={4}>
            <h1>Данните не могат да се отворят</h1>
            <p>
              Запазените профили не са изтрити. Проверете дали браузърът разрешава съхранение на
              данни и опитайте отново.
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Опитай отново
            </Button>
            {originalSavedData() ? (
              <Button
                variant="soft"
                onClick={() => downloadJson(originalSavedData(), 'umniche-recovery.json')}
              >
                Изтегли копие на данните
              </Button>
            ) : null}
            <Button
              variant="quiet"
              onClick={() => {
                enableTemporaryStorage();
                void Promise.resolve(useApp.persist.rehydrate()).then(() =>
                  setStartupError(null),
                );
              }}
            >
              Продължи временно без запазване
            </Button>
          </Stack>
        </Page>
      ) : (
        <>
          {notice ? (
            <p className="storage-notice" role="status">
              {notice}
            </p>
          ) : null}
          {ready ? <RouterProvider router={router} /> : <Loading />}
        </>
      )}
    </ErrorBoundary>
  );
}
