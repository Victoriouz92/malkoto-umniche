import { renderToString } from 'react-dom/server';
import { createPath, Router } from 'react-router-dom';
import type { Navigator } from 'react-router-dom';
import { LandingPage } from './LandingPage';

const unavailable = () => {
  throw new Error('Navigation is unavailable during static rendering');
};
// Match the client HashRouter even before hydration or when opening a new tab.
const navigator: Navigator = {
  createHref: (to) => '#' + (typeof to === 'string' ? to : createPath(to)),
  go: unavailable,
  push: unavailable,
  replace: unavailable,
};

/** One source of truth for the readable HTML and the interactive landing page. */
export function renderLanding(): string {
  return renderToString(
    <Router location="/" navigator={navigator} static>
      <LandingPage />
    </Router>,
  );
}
