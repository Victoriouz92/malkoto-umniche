import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import type { EngineProps } from '../types';
import type { MatchingParams } from './schema';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

type Side = 'left' | 'right';
type Pick = { side: Side; key: string };

/**
 * „Свържи двойките“.
 *
 * Тап, не влачене: свързването на два далечни елемента с пръст през целия
 * екран е трудно движение. Тапваш единия, тапваш другия.
 *
 * Посоката НЕ е задължителна. Детето може да тръгне отдясно и да потвърди
 * отляво — за него двете картинки са равностойни и няма как да знае, че
 * едната колона е „първа“. Изискване за посока, която нищо на екрана не
 * показва, е скрито правило, а скритите правила изглеждат като счупена игра.
 *
 * Дясната колона е разбъркана независимо — иначе двойките стоят една
 * срещу друга и задачата изчезва.
 */
export function MatchingEngine({
  params,
  api,
  onComplete,
  onProgress,
}: EngineProps<MatchingParams>) {
  const left = useMemo(
    () => params.pairs.map((pair, i) => ({ ...pair, key: `p${i}` })),
    [params.pairs],
  );
  const right = useMemo(() => shuffle(left), [left]);

  /** Кое е избрано в момента и от коя колона. */
  const [selected, setSelected] = useState<Pick | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [nudging, setNudging] = useState<Pick | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    onProgress(matched.length / left.length);
  }, [matched.length, left.length, onProgress]);

  useEffect(() => {
    if (finished.current || matched.length === 0 || matched.length !== left.length) return;
    finished.current = true;

    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      correct: left.length,
      attempts: attempts.current,
      hintsUsed: 0,
    });
  }, [matched.length, left.length, api, onComplete]);

  const tap = (side: Side, key: string) => {
    if (matched.includes(key)) return;

    // Първи избор, или прещракване в рамките на същата колона.
    if (!selected || selected.side === side) {
      api.sfx('pick');
      setSelected({ side, key });
      return;
    }

    attempts.current += 1;

    if (selected.key === key) {
      api.sfx('correct');
      api.haptic('success');
      const pair = left.find((p) => p.key === key);
      if (pair) api.announce(assetLabel(pair.left));
      setMatched((m) => [...m, key]);
      setSelected(null);
      return;
    }

    api.sfx('soften');
    setNudging({ side, key });
    setSelected(null);
    window.setTimeout(() => setNudging(null), 440);
  };

  const isSelected = (side: Side, key: string) =>
    selected?.side === side && selected.key === key;
  const isNudging = (side: Side, key: string) =>
    nudging?.side === side && nudging.key === key;

  return (
    <div className={shared.stage}>
      <div className={s.columns}>
        <div className={s.column}>
          {left.map((pair) => {
            const isMatched = matched.includes(pair.key);
            return (
              <button
                key={pair.key}
                type="button"
                className={cx(
                  shared.item,
                  s.slot,
                  isSelected('left', pair.key) && shared.itemSelected,
                  isMatched && s.matched,
                  isNudging('left', pair.key) && shared.nudge,
                )}
                aria-label={assetLabel(pair.left)}
                aria-pressed={isSelected('left', pair.key)}
                onClick={() => tap('left', pair.key)}
              >
                <Asset id={pair.left} size="100%" />
              </button>
            );
          })}
        </div>

        <div className={s.column}>
          {right.map((pair) => {
            const isMatched = matched.includes(pair.key);
            return (
              <button
                key={pair.key}
                type="button"
                className={cx(
                  shared.item,
                  s.slot,
                  isSelected('right', pair.key) && shared.itemSelected,
                  isMatched && s.matched,
                  isNudging('right', pair.key) && shared.nudge,
                )}
                aria-label={
                  params.rightMode === 'silhouette'
                    ? `сянка: ${assetLabel(pair.right)}`
                    : assetLabel(pair.right)
                }
                aria-pressed={isSelected('right', pair.key)}
                onClick={() => tap('right', pair.key)}
              >
                <Asset
                  id={pair.right}
                  size="100%"
                  className={params.rightMode === 'silhouette' ? s.silhouette : undefined}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
