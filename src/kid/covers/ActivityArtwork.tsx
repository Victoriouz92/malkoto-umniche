import type { CSSProperties } from 'react';
import { assetUrl } from '@/assets/registry';
import { Shape } from '@/engines/shared/Shape';
import type { ShapeColor, ShapeName } from '@/engines/shared/shapeNames';
import { describeCover } from './model';
import type { CoverSource } from './model';
import s from './Artwork.module.css';

const PALETTES = ['numbers', 'food', 'memory', 'letters', 'colors', 'animals'] as const;

/** Scalable illustrations made from the task itself; no network or paid assets. */
export function ActivityArtwork({ activity, index }: { activity: CoverSource; index: number }) {
  const cover = describeCover(activity, index);
  const color = PALETTES[index % PALETTES.length]!;
  return (
    <span className={s.artwork} data-layout={cover.layout} style={{
      '--art-bg': `var(--cat-${color}-bg)`, '--art-accent': `var(--cat-${color}-accent)`, '--art-ink': `var(--cat-${color}-ink)`,
    } as CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 300 170" className={s.canvas} focusable="false">
        <ellipse cx="150" cy="133" rx="116" ry="15" fill="var(--art-accent)" opacity=".45" />
        <circle cx="280" cy="13" r="58" fill="white" opacity=".42" />
        <circle cx="19" cy="148" r="33" fill="white" opacity=".28" />
        {cover.path && <path d={cover.path} fill="none" stroke="var(--art-ink)" strokeWidth="7"
          strokeLinecap="round" strokeLinejoin="round" strokeDasharray={cover.layout === 'tracing' ? '2 13' : undefined} />}
        {cover.items.map(({ picture, x, y, size, muted, rotation }, i) => (
          <g key={i} transform={`translate(${x - size / 2} ${y - size / 2}) rotate(${rotation ?? 0} ${size / 2} ${size / 2})`}>
            {['memory', 'letters', 'words', 'sorting'].includes(cover.layout) &&
              <rect x="-8" y="-8" width={size + 16} height={size + 16} rx="13" fill="white" stroke="var(--art-accent)" strokeWidth="2" />}
            {picture.kind === 'asset' ? <image href={assetUrl(picture.value) ?? undefined}
              width={size} height={size} style={muted ? { filter: 'brightness(0)', opacity: .3 } : undefined} />
              : picture.kind === 'shape' ? <svg width={size} height={size} viewBox="0 0 100 100">
                <Shape shape={picture.value as ShapeName} color={picture.color as ShapeColor} size={100} />
              </svg> : <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                fill="var(--art-ink)" fontSize={picture.value.length > 2 ? size * .55 : size * .88} fontWeight="900">{picture.value}</text>}
          </g>
        ))}
        {cover.layout === 'spot-difference' && <g stroke="var(--art-ink)" strokeWidth="5" fill="none">
          <circle cx="207" cy="87" r="31" /><path d="M229 110l25 25" strokeLinecap="round" />
        </g>}
      </svg>
      <span className={s.caption}>{cover.caption}</span>
    </span>
  );
}
