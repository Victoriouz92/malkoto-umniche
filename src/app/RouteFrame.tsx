import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PwaNotice } from './PwaNotice';
import { MenuMascot } from '@/mascot/MenuMascot';

/** A new screen starts at the top and gives keyboard readers a clear heading. */
export function RouteFrame() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    window.scrollTo(0, 0);
    const focusHeading = () => {
      const heading = [...document.querySelectorAll<HTMLElement>('main h1')].find(
        (element) => element.getClientRects().length > 0,
      );
      if (!heading) return false;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    });
    return () => observer.disconnect();
  }, [pathname]);
  return (
    <>
      <Outlet />
      <MenuMascot />
      <PwaNotice />
    </>
  );
}
