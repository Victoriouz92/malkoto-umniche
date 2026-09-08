import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { variantRandom } from '../shared/variant';
import { lettersVariant } from './variants';
import type { EngineProps } from '../types';
import type { LettersParams } from './schema';
import s from '../shared/engine.module.css';
import l from './Engine.module.css';

/**
 * „Намери буквата“ и „С какво започва“.
 *
 * Буквите идват от шрифта, не от графика. Заради това всяка буква от
 * азбуката е налична още от днес, без никой да рисува трийсет файла.
 *
 * Правило от каталога (m051): думата се ИЗПИСВА при верен отговор.
 * Активността звучи, но не зависи от звука — работи и заглушена.
 */
export function LettersEngine(props: EngineProps<LettersParams>) {
  const { params: authored, activity, variant } = props;

  // Вариантът мени само подредбата — самите букви са подбрани от автора.
  const params = useMemo(
    () =>
      variant === 0 ? authored : lettersVariant(authored, variantRandom(activity.id, variant)),
    [authored, activity.id, variant],
  );

  // Двата режима са различни игри с общ речник от букви. Разделянето им на
  // два компонента ги държи прости; тук само се избира кой да се покаже.
  return params.mode === 'find' ? (
    <FindLetter {...props} params={params} />
  ) : (
    <InitialSound {...props} params={params} />
  );
}

type Props<M extends LettersParams['mode']> = EngineProps<Extract<LettersParams, { mode: M }>>;

function FindLetter({ params, api, onComplete, onProgress }: Props<'find'>) {
  const [found, setFound] = useState<number[]>([]);
  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const finished = useRef(false);

  const total = params.grid.filter((c) => c === params.target).length;
  const columns = params.grid.length <= 9 ? 3 : params.grid.length <= 16 ? 4 : 6;

  useEffect(() => {
    onProgress(found.length / Math.max(1, total));
  }, [found.length, total, onProgress]);

  useEffect(() => {
    if (finished.current || found.length === 0 || found.length !== total) return;
    finished.current = true;
    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      correct: total,
      attempts: attempts.current,
      hintsUsed: 0,
    });
  }, [found.length, total, api, onComplete]);

  const tap = (index: number, char: string) => {
    if (found.includes(index)) return;
    attempts.current += 1;

    if (char === params.target) {
      api.sfx('correct');
      api.haptic('success');
      setFound((f) => [...f, index]);
      return;
    }
    api.sfx('soften');
  };

  return (
    <div className={s.stage}>
      {/* Търсената буква стои видима през цялото време — не се разчита на памет. */}
      <div className={l.target} aria-label={`търси буквата ${params.target}`}>
        {params.target}
      </div>

      <p className={l.instruction}>Намери всички букви <strong>{params.target}</strong></p>

      <output className={l.tally} aria-live="polite">
        {found.length} / {total}
      </output>

      <div className={l.grid} style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}>
        {params.grid.map((char, index) => (
          <button
            key={index}
            type="button"
            className={cx(l.letter, found.includes(index) && l.found)}
            aria-label={char}
            onClick={() => tap(index, char)}
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  );
}

function InitialSound({ params, api, onComplete, onProgress }: Props<'initial'>) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const correct = useRef(0);
  const finished = useRef(false);

  const round = params.rounds[roundIndex];

  useEffect(() => {
    onProgress(roundIndex / params.rounds.length);
  }, [roundIndex, params.rounds.length, onProgress]);

  if (!round) return null;

  const word = assetLabel(round.asset);

  const pick = (char: string) => {
    if (answered) return;
    attempts.current += 1;

    if (char !== round.letter) {
      api.sfx('soften');
      return;
    }

    correct.current += 1;
    setAnswered(char);
    api.sfx('correct');
    api.haptic('success');
    api.speak(word);

    window.setTimeout(() => {
      const next = roundIndex + 1;
      if (next >= params.rounds.length) {
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
      setRoundIndex(next);
      setAnswered(null);
    }, 1600);
  };

  return (
    <div className={s.stage}>
      <div className={l.picture}>
        <Asset id={round.asset} size="100%" label={word} />
      </div>

      {/* Изписва се чак след верния отговор — иначе задачата се решава с четене. */}
      <p className={l.word}>
        {answered ? (
          <>
            <span className={l.wordFirst}>{word.charAt(0)}</span>
            {word.slice(1)}
          </>
        ) : null}
      </p>

      <div className={s.row}>
        {round.choices.map((char) => (
          <button
            key={char}
            type="button"
            className={cx(l.letter, answered === char && l.choiceRight)}
            aria-label={char}
            onClick={() => pick(char)}
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  );
}
