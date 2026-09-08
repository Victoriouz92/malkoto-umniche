import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import { variantRandom } from '../shared/variant';
import { patternVariant } from './variants';
import { TokenView } from '../shared/TokenView';
import { tokenLabel } from '../shared/tokenLabel';
import { sameToken, tokenKey } from '../shared/token';
import type { Token } from '../shared/token';
import type { EngineProps } from '../types';
import type { PatternParams } from './schema';
import s from '../shared/engine.module.css';
import p from './Engine.module.css';

/**
 * „Продължи шарката“ / „Липсва от шарката“.
 *
 * След верен избор редицата продължава САМА още два хода — така правилото
 * се показва, вместо да се обяснява (m023).
 */
export function PatternEngine({
  params: authored,
  activity,
  variant,
  api,
  onComplete,
  onProgress,
}: EngineProps<PatternParams>) {
  // Вариантът се строи ТУК, а не в обвивката: само двигателят знае кое в
  // неговите параметри може да се смени, без задачата да стане друга.
  const params = useMemo(
    () =>
      variant === 0 ? authored : patternVariant(authored, variantRandom(activity.id, variant)),
    [authored, activity.id, variant],
  );

  const answer = params.sequence[params.gapIndex];

  /** Разсейващите идват от самата редица — всеки вариант е правдоподобен. */
  const options = useMemo<Token[]>(() => {
    if (!answer) return [];
    const others: Token[] = [];
    for (const token of params.sequence) {
      if (sameToken(token, answer)) continue;
      if (others.some((o) => sameToken(o, token))) continue;
      others.push(token);
    }
    return shuffle([answer, ...others.slice(0, params.choices - 1)]);
  }, [params.sequence, params.choices, answer]);

  const [solved, setSolved] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [nudging, setNudging] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    onProgress(solved ? 1 : 0);
  }, [solved, onProgress]);

  useEffect(() => {
    if (!solved || finished.current) return;

    // Кратка пауза: редицата се доизписва, преди активността да приключи.
    const id = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      api.sfx('complete');
      api.celebrate();
      onComplete({
        completed: true,
        durationMs: Date.now() - startedAt.current,
        correct: 1,
        attempts: attempts.current,
        hintsUsed: 0,
      });
    }, 1400);

    return () => window.clearTimeout(id);
  }, [solved, api, onComplete]);

  if (!answer) return null;

  const pick = (token: Token, key: string) => {
    if (solved) return;
    attempts.current += 1;

    if (sameToken(token, answer)) {
      api.sfx('correct');
      api.haptic('success');
      api.announce(tokenLabel(token));
      setSolved(true);
      window.setTimeout(() => setReveal(true), 500);
      return;
    }

    api.sfx('soften');
    setNudging(key);
    window.setTimeout(() => setNudging(null), 440);
  };

  /** Показаната редица: дупката се запълва при верен избор, после расте. */
  const shown = params.sequence.slice(0, solved && reveal ? undefined : params.gapIndex + 1);

  return (
    <div className={s.stage}>
      <div className={p.strip}>
        {shown.map((token, i) => {
          const isGap = i === params.gapIndex;
          return (
            <div
              key={tokenKey(token, i)}
              className={cx(p.cell, isGap && !solved && p.cellGap, isGap && solved && s.pop)}
            >
              {isGap && !solved ? (
                <span className={p.question} aria-label="липсва">
                  ?
                </span>
              ) : (
                <TokenView token={token} size="100%" />
              )}
            </div>
          );
        })}
      </div>

      {!solved ? (
        <div className={s.row}>
          {options.map((token, i) => {
            const key = tokenKey(token, i);
            return (
              <button
                key={key}
                type="button"
                className={cx(s.item, nudging === key && s.nudge)}
                aria-label={tokenLabel(token)}
                onClick={() => pick(token, key)}
              >
                <TokenView token={token} size="100%" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
