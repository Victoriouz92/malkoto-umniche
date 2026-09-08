import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import type { EngineProps } from '../types';
import type { MatchingParams } from './schema';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

/**
 * „Свържи двойките“.
 *
 * Тап, не влачене: свързването на два далечни елемента с пръст през целия
 * екран е трудно движение. Тапваш единия, тапваш другия.
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

  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [nudging, setNudging] = useState<string | null>(null);

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

  const pickRight = (key: string) => {
    if (!selected) {
      // Още нищо не е избрано отляво — подсказваме, без да наказваме.
      api.sfx('tap');
      return;
    }

    attempts.current += 1;

    if (selected === key) {
      api.sfx('correct');
      api.haptic('success');
      const pair = left.find((p) => p.key === key);
      if (pair) api.announce(assetLabel(pair.left));
      setMatched((m) => [...m, key]);
      setSelected(null);
      return;
    }

    api.sfx('soften');
    setNudging(key);
    setSelected(null);
    window.setTimeout(() => setNudging(null), 440);
  };

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
                  selected === pair.key && shared.itemSelected,
                  isMatched && s.matched,
                )}
                aria-label={assetLabel(pair.left)}
                aria-pressed={selected === pair.key}
                onClick={() => {
                  if (isMatched) return;
                  api.sfx('pick');
                  setSelected(pair.key);
                }}
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
                  isMatched && s.matched,
                  nudging === pair.key && shared.nudge,
                )}
                aria-label={
                  params.rightMode === 'silhouette'
                    ? `сянка: ${assetLabel(pair.right)}`
                    : assetLabel(pair.right)
                }
                onClick={() => {
                  if (isMatched) return;
                  pickRight(pair.key);
                }}
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
