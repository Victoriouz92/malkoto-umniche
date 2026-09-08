import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import { sequencingVariant } from './variants';
import { TokenView } from '../shared/TokenView';
import { tokenLabel } from '../shared/tokenLabel';
import { tokenKey } from '../shared/token';
import type { EngineProps } from '../types';
import type { SequencingParams } from './schema';
import s from '../shared/engine.module.css';
import q from './Engine.module.css';

const PROMPT: Record<SequencingParams['kind'], string> = {
  story: 'Подреди по ред',
  'size-asc': 'От най-малкото към най-голямото',
  'size-desc': 'От най-голямото към най-малкото',
  number: 'Подреди числата',
};

/**
 * „Подреди по ред“.
 *
 * Детето тапва елементите в правилния ред; всеки верен ход заема следващото
 * място в лентата отгоре. Няма влачене — подреждането е достатъчно трудна
 * задача и без него.
 *
 * Грешният тап връща меко и НЕ нулира вече подреденото (m061: поставена
 * картинка може да се премести, но не се губи прогрес).
 */
export function SequencingEngine({
  params: authored,
  variant,
  api,
  onComplete,
  onProgress,
}: EngineProps<SequencingParams>) {
  // Вариантът се строи ТУК, а не в обвивката: само двигателят знае кое в
  // неговите параметри може да се смени, без задачата да стане друга.
  const params = useMemo(() => sequencingVariant(authored, variant), [authored, variant]);

  const items = useMemo(
    () =>
      shuffle(
        params.items.map((token, order) => ({ token, order, key: tokenKey(token, order) })),
      ),
    [params.items],
  );

  const [placed, setPlaced] = useState<number[]>([]);
  const [nudging, setNudging] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const correct = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    onProgress(placed.length / params.items.length);
  }, [placed.length, params.items.length, onProgress]);

  useEffect(() => {
    if (finished.current || placed.length === 0 || placed.length !== params.items.length) return;
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
  }, [placed.length, params.items.length, api, onComplete]);

  const pick = (order: number, key: string) => {
    if (placed.includes(order)) return;
    attempts.current += 1;

    if (order === placed.length) {
      correct.current += 1;
      api.sfx('snap');
      api.haptic('success');
      setPlaced((p) => [...p, order]);
      return;
    }

    api.sfx('soften');
    setNudging(key);
    window.setTimeout(() => setNudging(null), 440);
  };

  return (
    <div className={s.stage}>
      <p className={s.prompt}>{PROMPT[params.kind]}</p>

      {/* Лентата с местата. Пълни се отляво надясно. */}
      <div className={q.track}>
        {params.items.map((_, index) => {
          const order = placed[index];
          const item = order === undefined ? null : items.find((i) => i.order === order);
          return (
            <div key={index} className={cx(q.slot, item && q.slotFull)}>
              {item ? <TokenView token={item.token} size="100%" /> : <span>{index + 1}</span>}
            </div>
          );
        })}
      </div>

      <div className={s.row}>
        {items
          .filter((item) => !placed.includes(item.order))
          .map((item) => (
            <button
              key={item.key}
              type="button"
              className={cx(s.item, nudging === item.key && s.nudge)}
              aria-label={tokenLabel(item.token)}
              onClick={() => pick(item.order, item.key)}
            >
              <TokenView token={item.token} size="100%" />
            </button>
          ))}
      </div>
    </div>
  );
}
