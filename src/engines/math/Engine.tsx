import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import type { EngineProps } from '../types';
import type { MathParams } from './schema';
import s from '../shared/engine.module.css';
import m from './Engine.module.css';

/**
 * „Събиране и изваждане с предмети“.
 *
 * При събиране двете групи стоят една до друга и се сливат след отговора.
 * При изваждане отнетите ИЗБЛЕДНЯВАТ, вместо да изчезнат — така се вижда
 * какво се е случило, а не само какъв е резултатът (m045).
 *
 * Записът с цифри стои успоредно с картинката през цялото време. Целта е
 * детето да свърже двете, а не да учи едното вместо другото.
 */
export function MathEngine({ params, api, onComplete, onProgress }: EngineProps<MathParams>) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const correct = useRef(0);
  const finished = useRef(false);

  const round = params.rounds[roundIndex];
  const result = round ? (params.op === 'add' ? round.a + round.b : round.a - round.b) : 0;

  const choices = useMemo(() => {
    if (!round) return [];
    const options = new Set<number>([result]);
    let spread = 1;
    while (options.size < params.choices) {
      if (result - spread >= 0) options.add(result - spread);
      if (options.size < params.choices) options.add(result + spread);
      spread += 1;
    }
    return shuffle([...options]);
  }, [round, result, params.choices]);

  useEffect(() => {
    onProgress(roundIndex / params.rounds.length);
  }, [roundIndex, params.rounds.length, onProgress]);

  if (!round) return null;

  const answer = (value: number) => {
    if (answered !== null) return;
    attempts.current += 1;

    if (value !== result) {
      api.sfx('soften');
      return;
    }

    correct.current += 1;
    setAnswered(value);
    api.sfx('correct');
    api.haptic('success');

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
    }, 1300);
  };

  const group = (count: number, faded = false) => (
    <span className={cx(m.group, faded && m.taken)}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={m.unit}>
          <Asset id={round.asset} size="100%" />
        </span>
      ))}
    </span>
  );

  return (
    <div className={s.stage}>
      <div className={m.scene}>
        {params.op === 'add' ? (
          <>
            {group(round.a)}
            <span className={m.sign} aria-hidden="true">
              +
            </span>
            {group(round.b)}
          </>
        ) : (
          <>
            {group(round.a - round.b)}
            <span className={m.sign} aria-hidden="true">
              −
            </span>
            {group(round.b, true)}
          </>
        )}
      </div>

      <p className={m.equation} aria-label={`${round.a} ${params.op === 'add' ? 'плюс' : 'минус'} ${round.b}`}>
        {round.a} {params.op === 'add' ? '+' : '−'} {round.b} ={' '}
        <span className={m.blank}>{answered ?? '?'}</span>
      </p>

      <div className={s.row}>
        {choices.map((value) => (
          <button
            key={value}
            type="button"
            className={cx(m.numeral, answered === value && m.numeralRight)}
            aria-label={`${value} ${assetLabel(round.asset)}`}
            onClick={() => answer(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
