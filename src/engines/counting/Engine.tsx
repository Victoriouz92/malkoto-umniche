import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import { variantRandom } from '../shared/variant';
import { countingVariant } from './variants';
import type { EngineProps } from '../types';
import type { CountingParams } from './schema';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

/**
 * „Преброй и посочи“.
 *
 * Правила от каталога (m039):
 *   • тапнатият предмет се ОТБЕЛЯЗВА, за да не се брои два пъти
 *   • преброеното не изчезва — детето трябва да вижда цялата група
 *   • всяко броене вдига тона с една стъпка: слухът помага на редицата
 *   • няма ограничение във времето
 */
export function CountingEngine({
  params: authored,
  activity,
  variant,
  api,
  onComplete,
  onProgress,
}: EngineProps<CountingParams>) {
  // Вариантът се строи ТУК, а не в обвивката: само двигателят знае кое в
  // неговите параметри може да се смени, без задачата да стане друга.
  const params = useMemo(
    () =>
      variant === 0
        ? authored
        : countingVariant(authored, variantRandom(activity.id, variant)),
    [authored, activity.id, variant],
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [counted, setCounted] = useState<number[]>([]);
  const [answered, setAnswered] = useState<number | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const correct = useRef(0);
  const finished = useRef(false);

  const round = params.rounds[roundIndex];

  /** Вариантите се строят около верния отговор, не произволно. */
  const choices = useMemo(() => {
    if (!round) return [];
    const options = new Set<number>([round.count]);
    let spread = 1;
    while (options.size < params.choices) {
      if (round.count - spread >= 1) options.add(round.count - spread);
      if (options.size < params.choices) options.add(round.count + spread);
      spread += 1;
    }
    return shuffle([...options]);
  }, [round, params.choices]);

  useEffect(() => {
    onProgress(roundIndex / params.rounds.length);
  }, [roundIndex, params.rounds.length, onProgress]);

  if (!round) return null;

  const tapObject = (index: number) => {
    if (counted.includes(index)) return;
    const next = [...counted, index];
    setCounted(next);

    // Височината расте с всяко броене — редицата се чува, не само се вижда.
    api.sfx('tap');
    api.announce(String(next.length));
  };

  const answer = (value: number) => {
    if (answered !== null || (params.guided && counted.length < round.count)) return;
    attempts.current += 1;

    if (value !== round.count) {
      api.sfx('soften');
      return;
    }

    correct.current += 1;
    setAnswered(value);
    api.sfx('correct');
    api.haptic('success');

    window.setTimeout(() => {
      const nextIndex = roundIndex + 1;

      if (nextIndex >= params.rounds.length) {
        if (finished.current) return;
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
        return;
      }

      setRoundIndex(nextIndex);
      setCounted([]);
      setAnswered(null);
    }, 900);
  };

  return (
    <div className={shared.stage}>
      <div className={s.objects}>
        {Array.from({ length: round.count }, (_, i) => (
          <button
            key={i}
            type="button"
            className={cx(s.object, counted.includes(i) && s.counted)}
            aria-label={`${assetLabel(round.asset)} ${i + 1}`}
            aria-pressed={counted.includes(i)}
            onClick={() => tapObject(i)}
          >
            <Asset id={round.asset} size="100%" />
          </button>
        ))}
      </div>

      {params.guided && <output className={s.tally} aria-live="polite">
        {counted.length > 0 ? counted.length : ''}
      </output>}

      <div className={s.choices}>
        {choices.map((value) => (
          <button
            key={value}
            type="button"
            className={cx(
              s.numeral,
              params.guided && counted.length < round.count && s.numeralLocked,
              answered === value && s.numeralRight,
            )}
            disabled={params.guided && counted.length < round.count}
            onClick={() => answer(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {params.guided && counted.length < round.count ? (
        <p className={s.countHint}>Докосни всеки предмет, докато броиш.</p>
      ) : <p className={s.countHint}>Колко са общо? Можеш да отбелязваш предметите, докато броиш.</p>}
    </div>
  );
}
