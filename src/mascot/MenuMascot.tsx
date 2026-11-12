import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/core/store/app';
import s from './panda.module.css';

type Spot = { left: number; top: number; size: number; pose: string; turn: number };
const MENU = /^(?:\/$|\/kid$|\/c\/[^/]+$|\/stickers$|\/next$)/;

function overlaps(
  a: DOMRect | { left: number; top: number; right: number; bottom: number },
  b: DOMRect,
) {
  return (
    a.left < b.right + 8 && a.right > b.left - 8 && a.top < b.bottom + 8 && a.bottom > b.top - 8
  );
}

/** Check the visible part of each peek against controls and actual text lines. */
function freeSpot(previous: string): Spot | undefined {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = w < 600 ? 96 : 128;
  const candidates: Spot[] = [
    { left: 12, top: -size * 0.36, size, pose: 'top-left', turn: 180 },
    { left: w - size - 12, top: -size * 0.36, size, pose: 'top-right', turn: 180 },
    { left: -size * 0.3, top: h * 0.46, size, pose: 'left', turn: 22 },
    { left: w - size * 0.7, top: h * 0.46, size, pose: 'right', turn: -22 },
    { left: 8, top: h - size * 0.7, size, pose: 'bottom-left', turn: 10 },
    { left: w - size - 8, top: h - size * 0.7, size, pose: 'bottom-right', turn: -10 },
  ];
  // Narrow screens often have space beside the greeting rather than in a corner.
  for (const fraction of [0.1, 0.22, 0.34, 0.58, 0.7, 0.82]) {
    candidates.push(
      { left: -size * 0.3, top: h * fraction, size, pose: `left-${fraction}`, turn: 12 },
      { left: w - size * 0.7, top: h * fraction, size, pose: `right-${fraction}`, turn: -12 },
    );
  }
  const blocked: DOMRect[] = [];
  candidates.push(
    ...candidates
      .filter(
        (candidate) =>
          candidate.pose.startsWith('right-') || candidate.pose.startsWith('left-'),
      )
      .map((candidate) => ({
        ...candidate,
        pose: `${candidate.pose}-upside`,
        turn: candidate.turn + 180,
      })),
  );
  document
    .querySelectorAll<HTMLElement>(
      'button,a,input,select,textarea,[role="button"],[role="tab"],h1,h2,h3,p,label,[role="alert"],dialog,[aria-modal="true"]',
    )
    .forEach((element) => {
      if (!element.getClientRects().length) return;
      if (element.matches('h1,h2,h3,p,label')) {
        const range = document.createRange();
        range.selectNodeContents(element);
        blocked.push(...range.getClientRects());
      } else blocked.push(element.getBoundingClientRect());
    });
  const start = Math.floor(Math.random() * candidates.length);
  return [...candidates.slice(start), ...candidates.slice(0, start)].find((spot) => {
    if (spot.pose === previous) return false;
    const radians = (spot.turn * Math.PI) / 180;
    const half = (size * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)))) / 2;
    const visible = {
      left: Math.max(0, spot.left + size / 2 - half),
      top: Math.max(0, spot.top + size / 2 - half),
      right: Math.min(w, spot.left + size / 2 + half),
      bottom: Math.min(h, spot.top + size / 2 + half),
    };
    return !blocked.some((rect) => overlaps(visible, rect));
  });
}

export function MenuMascot() {
  const { pathname } = useLocation();
  const reduced = useApp((state) => state.settings.reducedMotion);
  return MENU.test(pathname) && !reduced ? <ActiveMenuMascot key={pathname} /> : null;
}

function ActiveMenuMascot() {
  const [spot, setSpot] = useState<Spot | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    let previous = '';
    let showing = false;
    let blurred = false;
    let disposed = false;
    const hide = () => {
      if (showing) setSpot(null);
      showing = false;
    };
    const schedule = (delay: number) => {
      clearTimeout(timer);
      if (disposed || media.matches || document.hidden || blurred) return;
      timer = setTimeout(() => {
        if (!ready.current) {
          schedule(7000);
          return;
        }
        const next = freeSpot(previous);
        if (!next) {
          schedule(7000);
          return;
        }
        previous = next.pose;
        showing = true;
        setSpot(next);
        timer = setTimeout(() => {
          hide();
          schedule(35000 + Math.random() * 20000);
        }, 4500);
      }, delay);
    };
    const reset = () => {
      hide();
      schedule(12000);
    };
    const blur = () => {
      blurred = true;
      clearTimeout(timer);
      hide();
    };
    const focus = () => {
      blurred = false;
      reset();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'resize'] as const;
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    media.addEventListener('change', reset);
    schedule(12000);
    return () => {
      disposed = true;
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      media.removeEventListener('change', reset);
    };
  }, []);

  return (
    <div className={s.viewport} aria-hidden="true">
      {/* Load before the first peek, including on slow connections. */}
      <img
        className={s.preload}
        data-mascot-atlas
        src="/mascot/panda-wave.webp"
        alt=""
        onLoad={() => {
          ready.current = true;
        }}
      />
      {spot ? (
        <span
          className={s.peek}
          data-menu-mascot
          data-placement={spot.pose}
          style={{
            left: spot.left,
            top: spot.top,
            width: spot.size,
            height: spot.size,
            rotate: `${spot.turn}deg`,
          }}
        >
          <span className={`${s.sprite} ${s.wave}`} />
        </span>
      ) : null}
    </div>
  );
}
