import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import { TokenView } from '../shared/TokenView';
import { tokenLabel } from '../shared/tokenLabel';
import { tokenKey } from '../shared/token';
import type { EngineProps } from '../types';
import type { OddOneOutParams } from './schema';
import s from '../shared/engine.module.css';
import o from './Engine.module.css';

/**
 * „Кое не си прилича“.
 *
 * След верния избор изключението се ОТДЕЛЯ настрани, а останалите се
 * събират в група. Така детето вижда защо са едно — правилото се показва,
 * не се обявява (m008, m025).
 */
export function OddOneOutEngine({
  params,
  api,
  onComplete,
  onProgress,
}: EngineProps<OddOneOutParams>) {
  /** Разбъркваме, но помним кой беше изключението. */
  const items = useMemo(
    () =>
      shuffle(
        params.items.map((token, index) => ({
          token,
          key: tokenKey(token, index),
          odd: index === params.oddIndex,
        })),
      ),
    [params.items, params.oddIndex],
  );

  const [solved, setSolved] = useState(false);
  const [nudging, setNudging] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    onProgress(solved ? 1 : 0);
  }, [solved, onProgress]);

  useEffect(() => {
    if (!solved || finished.current) return;

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
    }, params.showGrouping ? 1600 : 800);

    return () => window.clearTimeout(id);
  }, [solved, api, onComplete, params.showGrouping]);

  const pick = (key: string, isOdd: boolean) => {
    if (solved) return;
    attempts.current += 1;

    if (isOdd) {
      api.sfx('correct');
      api.haptic('success');
      setSolved(true);
      return;
    }

    api.sfx('soften');
    setNudging(key);
    window.setTimeout(() => setNudging(null), 440);
  };

  return (
    <div className={s.stage}>
      <div className={cx(s.row, solved && params.showGrouping && o.grouped)}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={cx(
              s.item,
              nudging === item.key && s.nudge,
              solved && item.odd && o.odd,
              solved && !item.odd && o.same,
            )}
            aria-label={tokenLabel(item.token)}
            onClick={() => pick(item.key, item.odd)}
          >
            <TokenView token={item.token} size="100%" />
          </button>
        ))}
      </div>
    </div>
  );
}
