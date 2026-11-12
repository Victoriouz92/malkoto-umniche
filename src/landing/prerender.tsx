import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

/** One source of truth for the readable HTML and the interactive landing page. */
export function renderLanding(): string {
  return renderToString(
    <StaticRouter location="/">
      <LandingPage />
    </StaticRouter>,
  );
}
