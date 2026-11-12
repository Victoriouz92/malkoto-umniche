import { useEffect, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { t } from '@/i18n';
import { shuffle } from '../shared/random';
import type { EngineProps } from '../types';
import type { WordsParams } from './schema';
import shared from '../shared/engine.module.css';
import c from '../shared/creative.module.css';

export function WordsEngine({ params, api, onComplete, onProgress }: EngineProps<WordsParams>) {
  const [choices] = useState(() => shuffle(params.syllables.map((part, id) => ({ part, id }))));
  const [built, setBuilt] = useState<number[]>([]);
  const started = useRef(Date.now());
  const attempts = useRef(0);
  const finishTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(finishTimer.current), []);

  function pick(part: string, id: number) {
    if (built.includes(id) || finishTimer.current !== undefined) return;
    attempts.current++;
    if (part !== params.syllables[built.length]) {
      api.sfx('soften');
      api.announce(t('words.retry'));
      return;
    }
    const count = built.length + 1;
    setBuilt([...built, id]);
    onProgress(count / params.syllables.length);
    api.sfx('correct');
    if (count !== params.syllables.length) return;
    api.speak(params.word);
    api.celebrate();
    finishTimer.current = window.setTimeout(() => onComplete({
      completed: true, durationMs: Date.now() - started.current, correct: count,
      attempts: attempts.current, hintsUsed: 0,
    }), 650);
  }

  return (
    <div className={shared.stage}>
      <p>{t('words.instruction')}</p>
      <div className={c.picture}><Asset id={params.picture} size="100%" /></div>
      <div className={c.word}>
        {params.syllables.map((part, index) => (
          <span key={index} className={c.syllable + (index < built.length ? ' ' + c.syllableDone : '')}>
            {index < built.length ? part : '•'}
          </span>
        ))}
      </div>
      <div className={shared.row}>
        {choices.map(({ part, id }) => (
          <button key={id} type="button" className={c.syllable}
            disabled={built.includes(id)} onClick={() => pick(part, id)}>{part}</button>
        ))}
      </div>
    </div>
  );
}
