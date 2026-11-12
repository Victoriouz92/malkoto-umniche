import { useEffect, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { Button } from '@/design-system';
import { assetLabel, t } from '@/i18n';
import type { EngineProps } from '../types';
import type { DiscoveryParams } from './schema';
import s from './Engine.module.css';

export function DiscoveryEngine({ params, api, onComplete, onProgress }: EngineProps<DiscoveryParams>) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'look' | 'choose' | 'found'>(
    params.mode === 'recall' ? 'look' : 'choose',
  );
  const [wrong, setWrong] = useState(false);
  const stats = useRef({ started: Date.now(), attempts: 0, hints: 0, finished: false });
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const recall = params.mode === 'recall';
  const round = params.rounds[index]!;
  const last = index === params.rounds.length - 1;

  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [index, phase]);

  function choose(item: string) {
    stats.current.attempts++;
    if (item !== round.answer) {
      api.sfx('soften');
      setWrong(true);
      return;
    }
    setWrong(false);
    moved.current = true;
    api.sfx('correct');
    api.haptic('success');
    onProgress((index + 1) / params.rounds.length);
    setPhase('found');
  }

  function advance() {
    if (!last) {
      setIndex(index + 1);
      setPhase(recall ? 'look' : 'choose');
      return;
    }
    if (stats.current.finished) return;
    stats.current.finished = true;
    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      correct: params.rounds.length,
      attempts: stats.current.attempts,
      hintsUsed: stats.current.hints,
      durationMs: Date.now() - stats.current.started,
    });
  }

  const example = phase !== 'choose' || !recall;
  return (
    <section className={s.scene} data-mode={params.mode}>
      <h2 ref={heading} tabIndex={-1}>
        {phase === 'found' ? t('discovery.found', { item: assetLabel(round.answer) })
          : phase === 'look' ? t('discovery.look')
          : recall ? t('discovery.remember')
          : round.clue ?? t('discovery.match')}
      </h2>
      <div className={s.example}>
        {round.sign ? <span className={s.sign}>{round.sign}</span> : null}
        {phase === 'found' ? <Asset id={round.answer} label={assetLabel(round.answer)} size={106} />
          : example ? round.examples.map((item) => (
            <Asset id={item} label={assetLabel(item)} size={84} key={item} />
          )) : <span className={s.hidden} aria-hidden="true">?</span>}
      </div>
      {phase === 'choose' ? (
        <>
          <div className={s.choices}>
            {round.choices.map((item) => (
              <button key={item} className={s.choice} type="button"
                aria-label={assetLabel(item)} onClick={() => choose(item)}>
                <Asset id={item} size="100%" />
              </button>
            ))}
          </div>
          <span className={s.feedback} role="status">{wrong ? t('discovery.retry') : ''}</span>
          {recall ? <Button size="sm" onClick={() => {
            stats.current.hints++;
            moved.current = true;
            setWrong(false);
            setPhase('look');
          }}>{t('discovery.peek')}</Button> : null}
        </>
      ) : (
        <Button variant="primary" size="kid" onClick={phase === 'found' ? advance : () => {
          moved.current = true;
          setPhase('choose');
        }}>{t(phase === 'found' && last ? 'action.done' : 'action.continue')}</Button>
      )}
    </section>
  );
}
