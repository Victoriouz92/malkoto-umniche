import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import { variantRandom } from '../shared/variant';
import { sortingVariant } from './variants';
import { dropZone, useDrag } from '../shared/useDrag';
import type { EngineProps } from '../types';
import type { SortingParams } from './schema';
import s from '../shared/engine.module.css';

/**
 * „Подреди в кошници“ — механика m018.
 *
 * ДВА начина да се играе, не един:
 *   1. влачене — естественото движение
 *   2. тап върху предмет, после тап върху кошница
 *
 * Вторият не е само за достъпност. Влаченето иска задържане и плъзгане
 * едновременно; на три години това още не върви гладко, а тап-тап върви.
 *
 * Останалите правила от каталога: грешната кошница ВРЪЩА предмета, без да
 * го брои за провал; купчината намалява видимо; няма време.
 */
export function SortingEngine({
  params: authored,
  activity,
  variant,
  api,
  onComplete,
  onProgress,
}: EngineProps<SortingParams>) {
  // Вариантът се строи ТУК, а не в обвивката: само двигателят знае кое в
  // неговите параметри може да се смени, без задачата да стане друга.
  const params = useMemo(
    () =>
      variant === 0 ? authored : sortingVariant(authored, variantRandom(activity.id, variant)),
    [authored, activity.id, variant],
  );

  const items = useMemo(
    () => shuffle(params.items.map((item, i) => ({ ...item, key: `${item.asset}-${i}` }))),
    [params.items],
  );

  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const correct = useRef(0);
  const finished = useRef(false);

  const placedCount = Object.keys(placed).length;

  useEffect(() => {
    onProgress(placedCount / items.length);
  }, [placedCount, items.length, onProgress]);

  useEffect(() => {
    if (finished.current || placedCount === 0 || placedCount !== items.length) return;
    finished.current = true;

    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      correct: correct.current,
      attempts: attempts.current,
      hintsUsed: 0,
    });
  }, [placedCount, items.length, api, onComplete]);

  /** Единственото място, където се решава дали ходът е верен. */
  const tryPlace = (key: string, binId: string) => {
    const item = items.find((i) => i.key === key);
    if (!item || key in placed) return;

    attempts.current += 1;
    setSelected(null);

    if (binId === item.bin) {
      correct.current += 1;
      api.sfx('drop');
      api.haptic('success');
      api.announce(assetLabel(item.asset));
      setPlaced((p) => ({ ...p, [key]: binId }));
      return;
    }

    // Меко връщане: никакво червено, никакъв рязък звук, нищо не се отнема.
    api.sfx('soften');
    setNudging(key);
    window.setTimeout(() => setNudging(null), 440);
  };

  const { bind, isOver, drag } = useDrag({
    onPick: (key) => {
      api.sfx('pick');
      setSelected(key);
    },
    onDrop: (key, zoneId) => {
      // Пуснат встрани: нищо не се случва и нищо не се брои. Ако е бил
      // само тапнат (без местене), изборът остава — това е път 2.
      if (zoneId === null) return;
      tryPlace(key, zoneId);
    },
  });

  const remaining = items.filter((i) => !(i.key in placed));

  return (
    <div className={s.stage}>
      {/* Купчината. Намалява видимо — това е целият брояч на прогреса. */}
      <div className={s.row}>
        {remaining.map((item) => {
          const dragProps = bind(item.key, s.dragging);
          const isSelected = selected === item.key && drag === null;

          return (
            <button
              key={item.key}
              type="button"
              {...dragProps}
              className={cx(
                s.item,
                dragProps.className,
                isSelected && s.itemSelected,
                nudging === item.key && s.nudge,
              )}
              aria-label={assetLabel(item.asset)}
              aria-pressed={isSelected}
              onClick={() => setSelected(item.key)}
            >
              <Asset id={item.asset} size="100%" />
            </button>
          );
        })}
      </div>

      {/* Кошниците. Обявяват се с пример, не с надпис. */}
      <div className={s.row}>
        {params.bins.map((bin) => {
          const count = Object.values(placed).filter((b) => b === bin.id).length;
          return (
            <button
              key={bin.id}
              type="button"
              {...dropZone(bin.id)}
              className={cx(s.zone, isOver(bin.id) && s.zoneOver, count > 0 && s.zoneFull)}
              aria-label={`кошница: ${assetLabel(bin.asset)}`}
              onClick={() => {
                if (selected) tryPlace(selected, bin.id);
              }}
            >
              <Asset id={bin.asset} size={64} />
              {count > 0 ? (
                <span className={s.zoneLabel} aria-hidden="true">
                  {'●'.repeat(Math.min(count, 6))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
