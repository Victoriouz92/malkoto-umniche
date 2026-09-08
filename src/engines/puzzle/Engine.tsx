import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import { dropZone, useDrag } from '../shared/useDrag';
import type { EngineProps } from '../types';
import type { PuzzleParams } from './schema';
import s from '../shared/engine.module.css';
import m from '../matching/Engine.module.css';

/**
 * „Форма в отвор“.
 *
 * Отворите са силуети на самите предмети — филтър върху същата картинка,
 * без втори комплект графика.
 *
 * Като при сортирането, работят и влаченето, и тап-тап. На две години
 * второто е по-надеждното.
 *
 * Правила от каталога (m001): предмет, пуснат встрани, се връща; зоната се
 * приготвя, преди детето да е пуснало; няма време и няма провал.
 */
export function PuzzleEngine({ params, api, onComplete, onProgress }: EngineProps<PuzzleParams>) {
  const holes = useMemo(() => shuffle(params.pieces), [params.pieces]);

  const [placed, setPlaced] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    onProgress(placed.length / params.pieces.length);
  }, [placed.length, params.pieces.length, onProgress]);

  useEffect(() => {
    if (finished.current || placed.length === 0 || placed.length !== params.pieces.length) return;
    finished.current = true;

    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      correct: params.pieces.length,
      attempts: attempts.current,
      hintsUsed: 0,
    });
  }, [placed.length, params.pieces.length, api, onComplete]);

  const tryPlace = (piece: string, hole: string) => {
    if (placed.includes(piece)) return;
    attempts.current += 1;
    setSelected(null);

    if (piece === hole) {
      api.sfx('snap');
      api.haptic('success');
      api.announce(assetLabel(piece));
      setPlaced((p) => [...p, piece]);
      return;
    }

    api.sfx('soften');
    setNudging(piece);
    window.setTimeout(() => setNudging(null), 440);
  };

  const { bind, isOver, drag } = useDrag({
    onPick: (piece) => {
      api.sfx('pick');
      setSelected(piece);
    },
    onDrop: (piece, zoneId) => {
      if (zoneId === null) return;
      tryPlace(piece, zoneId);
    },
  });

  const loose = params.pieces.filter((p) => !placed.includes(p));

  return (
    <div className={s.stage}>
      {/* Отворите */}
      <div className={s.row}>
        {holes.map((hole) => {
          const filled = placed.includes(hole);
          return (
            <button
              key={hole}
              type="button"
              {...dropZone(hole)}
              className={cx(s.zone, isOver(hole) && s.zoneOver, filled && s.zoneFull)}
              aria-label={filled ? assetLabel(hole) : `отвор: ${assetLabel(hole)}`}
              onClick={() => {
                if (selected) tryPlace(selected, hole);
              }}
            >
              <Asset
                id={hole}
                size={72}
                className={filled ? undefined : m.silhouette}
              />
            </button>
          );
        })}
      </div>

      {/* Свободните предмети */}
      <div className={s.row}>
        {loose.map((piece) => {
          const dragProps = bind(piece, s.dragging);
          const isSelected = selected === piece && drag === null;

          return (
            <button
              key={piece}
              type="button"
              {...dragProps}
              className={cx(
                s.item,
                dragProps.className,
                isSelected && s.itemSelected,
                nudging === piece && s.nudge,
              )}
              aria-label={assetLabel(piece)}
              aria-pressed={isSelected}
              onClick={() => setSelected(piece)}
            >
              <Asset id={piece} size="100%" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
