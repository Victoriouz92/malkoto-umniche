import { useCallback, useEffect, useRef, useState } from 'react';
import { loadLineart } from '@/assets/registry';
import { cx } from '@/design-system';
import { t } from '@/i18n';
import type { EngineProps } from '../types';
import { CRAYONS, type ColoringParams, type Crayon } from './schema';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

/**
 * „Оцвети с тап“.
 *
 * Контурната рисунка се вгражда в документа, а не в `<img>`: само така
 * може да се пипа `fill` на отделна зона. Файловете идват от нашия build,
 * не от потребител.
 *
 * НЯМА правилен цвят. Активността приключва, когато всяка зона е била
 * оцветена поне веднъж — но детето може да продължи да я преоцветява
 * колкото иска.
 */
export function ColoringEngine({
  params,
  activity,
  api,
  onComplete,
  onProgress,
}: EngineProps<ColoringParams>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [crayon, setCrayon] = useState<Crayon>(params.palette[0] ?? 'red');
  const [ready, setReady] = useState(false);
  const [touchedCount, setTouchedCount] = useState(0);

  const touched = useRef(new Set<string>());
  const totalRegions = useRef(0);
  const startedAt = useRef(Date.now());
  const taps = useRef(0);
  const finished = useRef(false);
  const paletteLimit = activity.ageMin <= 2 ? 8 : 10;
  const palette = [
    ...new Set([
      ...params.palette.filter((name) => name !== 'black'),
      ...CRAYONS.filter((name) => name !== 'black' && !params.palette.includes(name)),
    ]),
  ].slice(0, paletteLimit - 1).concat('black' as const);

  useEffect(() => {
    let cancelled = false;

    void loadLineart(params.lineart).then((markup) => {
      if (cancelled || !hostRef.current) return;
      hostRef.current.innerHTML = markup;

      const regions = hostRef.current.querySelectorAll<SVGElement>('[data-region]');
      totalRegions.current = new Set([...regions].map((el) => el.dataset['region'] ?? '')).size;

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [params.lineart]);

  /**
   * Един слушател върху контейнера вместо по един на зона.
   *
   * Зоната често е няколко пътя с едно име (двете колела например) —
   * тапваш едното, оцветяват се и двете.
   */
  const paint = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as Element | null;
      const region = target?.closest<SVGElement>('[data-region]')?.dataset['region'];
      if (!region || !hostRef.current) return;

      const color = `var(--crayon-${crayon})`;
      for (const el of hostRef.current.querySelectorAll<SVGElement>(
        `[data-region="${region}"]`,
      )) {
        el.style.fill = color;
      }

      taps.current += 1;
      api.sfx('drop');

      if (!touched.current.has(region)) {
        touched.current.add(region);
        setTouchedCount(touched.current.size);
      }
    },
    [crayon, api],
  );

  useEffect(() => {
    if (totalRegions.current === 0) return;
    onProgress(touchedCount / totalRegions.current);
  }, [touchedCount, onProgress]);

  useEffect(() => {
    if (finished.current || totalRegions.current === 0) return;
    if (touchedCount < totalRegions.current) return;

    finished.current = true;
    api.sfx('complete');
    api.celebrate();

    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      // Няма верни и грешни ходове — всеки тап е успех.
      correct: taps.current,
      attempts: taps.current,
      hintsUsed: 0,
    });
  }, [touchedCount, api, onComplete]);

  return (
    <div className={shared.stage}>
      <div
        ref={hostRef}
        className={s.canvas}
        onPointerDown={paint}
        role="img"
        aria-label={ready ? t('cat.colors') : t('sys.loading')}
      />

      <div className={s.palette} role="radiogroup" aria-label={t('cat.colors')}>
        {palette.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={crayon === name}
            aria-label={name}
            className={cx(s.crayon, crayon === name && s.crayonOn)}
            style={{ background: `var(--crayon-${name})` }}
            onClick={() => {
              api.sfx('pick');
              setCrayon(name);
            }}
          />
        ))}
      </div>
    </div>
  );
}
