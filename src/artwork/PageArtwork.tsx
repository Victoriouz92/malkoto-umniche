import type { Category } from '@/content/schema/constants';

export type Scene =
  | Category
  | 'kid-home'
  | 'album'
  | 'next'
  | 'help'
  | 'privacy'
  | 'credits'
  | 'missing'
  | 'parent-gate'
  | 'parent-profiles'
  | 'parent-limits'
  | 'parent-content'
  | 'parent-stats'
  | 'parent-voice'
  | 'parent-settings'
  | 'rest'
  | 'album-garden'
  | 'album-stream'
  | 'album-clouds'
  | 'album-lanterns';

/** Each scene belongs to one screen. Small brand marks remain shared intentionally. */
export function PageArtwork({
  scene,
  className,
  sizes = '(max-width: 600px) 100vw, 600px',
}: {
  scene: Scene;
  className?: string | undefined;
  sizes?: string;
}) {
  return (
    <img
      className={className}
      data-page-art={scene}
      src={`/page-art/${scene}-600.webp`}
      srcSet={`/page-art/${scene}-600.webp 600w, /page-art/${scene}-1200.webp 1200w`}
      sizes={sizes}
      width={1536}
      height={1024}
      decoding="async"
      alt=""
      aria-hidden="true"
    />
  );
}
