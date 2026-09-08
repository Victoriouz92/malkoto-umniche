import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './design-system/tokens.css';
import './design-system/base.css';

import { App } from './app/App';

const container = document.getElementById('root');
if (!container) throw new Error('Липсва #root в index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Service worker.
 *
 * `autoUpdate` инсталира новата версия тихо. НЕ презареждаме страницата
 * сами — детето може да е насред активност и рестартът би изтрил
 * напредъка му. Новата версия влиза в сила при следващото отваряне.
 */
registerSW({ immediate: true });
