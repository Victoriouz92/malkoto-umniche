import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/design-system';
import { TokenView } from '../shared/TokenView';
import { tokenKey } from '../shared/token';
import { variantRandom } from '../shared/variant';
import { compareVariant } from './variants';
import type { EngineProps } from '../types';
import type { CompareParams } from './schema';
import s from '../shared/engine.module.css';
import c from './Engine.module.css';

const PROMPT: Record<'count' | 'size', Record<'more' | 'less', string>> = {
  count: { more: 'Къде са повече?', less: 'Къде са по-малко?' },
  size: { more: 'Кое е по-голямо?', less: 'Кое е по-малко?' },
};

/**
 * „Повече и по-малко“ / „Голямо и малко“.
 *
 * След отговора двете страни се ПОДРЕЖДАТ една срещу друга и излишъкът се
 * откроява. Разликата се вижда, вместо да се обявява — това е разликата
 * между запомняне и разбиране (m042).
 */
export function CompareEngine({
  params: authored,
  activity,
  variant,
  api,
  onComplete,
  onProgress,
}: EngineProps<CompareParams>) {
  // Вариантът се строи ТУК, а не в обвивката: само двигателят знае кое в
  // неговите параметри може да се смени, без задачата да стане друга.
  const params = useMemo(
    () =>
      variant === 0 ? authored : compareVariant(authored, variantRandom(activity.id, variant)),
    [authored, activity.id, variant],
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState<'left' | 'right' | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const correct = useRef(0);
  const finished = useRef(false);

  const round = params.rounds[roundIndex];

  useEffect(() => {
    onProgress(roundIndex / params.rounds.length);
  }, [roundIndex, params.rounds.length, onProgress]);

  if (!round) return null;

  const value = (side: 'left' | 'right') =>
    params.mode === 'count' ? round[side].count : round[side].token.scale;

  const winner: 'left' | 'right' =
    params.ask === 'more'
      ? value('left') > value('right')
        ? 'left'
        : 'right'
      : value('left') < value('right')
        ? 'left'
        : 'right';

  const pick = (side: 'left' | 'right') => {
    if (answered) return;
    attempts.current += 1;

    if (side !== winner) {
      api.sfx('soften');
      return;
    }

    correct.current += 1;
    setAnswered(side);
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
    }, 1400);
  };

  const renderSide = (side: 'left' | 'right') => {
    const data = round[side];
    const isWinner = side === winner;

    return (
      <button
        type="button"
        className={cx(c.side, answered && isWinner && c.sideWin, answered && !isWinner && c.sideDim)}
        onClick={() => pick(side)}
        aria-label={`${side === 'left' ? 'лявата' : 'дясната'} страна`}
      >
        <span className={cx(c.group, answered && params.mode === 'count' && c.groupLined)}>
          {Array.from({ length: data.count }, (_, i) => (
            <span key={tokenKey(data.token, i)} className={c.unit}>
              <TokenView token={data.token} size="100%" />
            </span>
          ))}
        </span>
      </button>
    );
  };

  return (
    <div className={s.stage}>
      <p className={s.prompt}>{PROMPT[params.mode][params.ask]}</p>
      <div className={c.arena}>
        {renderSide('left')}
        <span className={c.versus} aria-hidden="true" />
        {renderSide('right')}
      </div>
    </div>
  );
}
