import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import type { EngineProps } from '../types';
import type { SemanticChoiceParams } from './schema';
import s from '../shared/engine.module.css';
import c from './Engine.module.css';

export function SemanticChoiceEngine({
  params,
  api,
  onComplete,
  onProgress,
}: EngineProps<SemanticChoiceParams>) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const correct = useRef(0);
  const finished = useRef(false);
  const round = params.rounds[roundIndex];
  const choices = useMemo(() => shuffle(round?.choices ?? []), [round]);

  useEffect(() => {
    onProgress(roundIndex / params.rounds.length);
  }, [roundIndex, params.rounds.length, onProgress]);

  if (!round) return null;

  const pick = (choice: string) => {
    if (answered) return;
    attempts.current += 1;

    if (choice !== round.answer) {
      api.sfx('soften');
      setNudging(choice);
      window.setTimeout(() => setNudging(null), 420);
      return;
    }

    correct.current += 1;
    setAnswered(choice);
    api.sfx('correct');
    api.haptic('success');
    api.speak(round.explanation);

    window.setTimeout(() => {
      const next = roundIndex + 1;
      if (next >= params.rounds.length) {
        if (finished.current) return;
        finished.current = true;
        onProgress(1);
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
    }, 1500);
  };

  return (
    <div className={s.stage}>
      <p className={s.prompt}>{round.prompt}</p>
      <div className={s.row}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={cx(
              c.choice,
              nudging === choice && s.nudge,
              answered === choice && c.correct,
            )}
            aria-label={assetLabel(choice)}
            onClick={() => pick(choice)}
          >
            <Asset id={choice} size="100%" label={assetLabel(choice)} />
          </button>
        ))}
      </div>
      <p className={cx(c.explanation, answered && c.visible)} aria-live="polite">
        {answered ? round.explanation : '\u00a0'}
      </p>
    </div>
  );
}
