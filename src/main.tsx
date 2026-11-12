import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { registerOfflineSupport } from '@/core/pwa';

import './design-system/tokens.css';
import './design-system/base.css';
// Public HTML has to be styled before JavaScript replaces it.
import './landing/landing.module.css';

import { App, hydration } from './app/App';
import { getHydrationFailure } from '@/core/store/app';

const container = document.getElementById('root');
if (!container) throw new Error('Липсва #root в index.html');

void hydration.then(() => {
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  );
  if ((!window.location.hash || window.location.hash === '#/') && !getHydrationFailure()) {
    // Finish adopting public HTML before a hash navigation can change the route.
    flushSync(() => {
      hydrateRoot(container, app);
    });
  } else createRoot(container).render(app);
});

/**
 * Service worker.
 *
 * Обновяването се предлага само извън играта. Единствено прозорецът,
 * в който родителят е натиснал „Обнови“, може да се презареди;
 * друга отворена игра запазва текущите ходове.
 */
if (import.meta.env.PROD) registerOfflineSupport();
