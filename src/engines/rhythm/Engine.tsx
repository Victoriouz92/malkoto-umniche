import { useEffect, useRef, useState } from 'react';
import { Button } from '@/design-system';
import { playRhythm } from '@/core/audio/rhythm';
import { useApp } from '@/core/store/app';
import type { EngineProps } from '../types';
import { sameRhythm, type Beat, type RhythmParams } from './schema';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

const LABEL: Record<Beat, string> = { drum: 'Бум', bell: 'Дин', rest: 'Пауза' };
const SYMBOL: Record<Beat, string> = { drum: '●', bell: '◆', rest: '—' };

export function RhythmEngine({
  params,
  api,
  onProgress,
  onComplete,
}: EngineProps<RhythmParams>) {
  const [round, setRound] = useState(0);
  const target = params.rounds[round]!;
  const [answer, setAnswer] = useState<(Beat | null)[]>(() => target.map(() => null));
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState<'example' | 'answer' | null>(null);
  const [step, setStep] = useState(-1);
  const [heard, setHeard] = useState(false);
  const [solved, setSolved] = useState(false);
  const [show, setShow] = useState(params.guided);
  const [message, setMessage] = useState('Чуй примера. После подреди своя ритъм.');
  const sound = useApp((state) => state.settings.sound);
  const cancel = useRef<() => void>(() => {});
  const busy = useRef(false);
  const finished = useRef(false);
  const attempts = useRef(0);
  const hints = useRef(0);
  const started = useRef(Date.now());

  useEffect(
    () => onProgress(round / params.rounds.length),
    [round, params.rounds.length, onProgress],
  );
  useEffect(() => {
    const stop = () => {
      cancel.current();
      busy.current = false;
      setPlaying(null);
      setStep(-1);
    };
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      cancel.current();
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, []);
  useEffect(() => {
    cancel.current();
    busy.current = false;
    setPlaying(null);
    setStep(-1);
  }, [sound]);

  const play = (kind: 'example' | 'answer') => {
    if (busy.current) return;
    const sequence = kind === 'example' ? target : answer;
    if (sequence.some((b) => b === null)) return;
    busy.current = true;
    setPlaying(kind);
    setStep(-1);
    cancel.current = playRhythm(sequence as Beat[], params.beatMs, setStep, () => {
      busy.current = false;
      setPlaying(null);
      setStep(-1);
      if (kind === 'example') setHeard(true);
    });
  };
  const check = () => {
    if (busy.current || solved || answer.some((b) => b === null)) return;
    attempts.current++;
    const correct = sameRhythm(target, answer);
    setSolved(correct);
    setMessage(
      correct
        ? 'Точно така! Твоят ритъм съвпада с примера.'
        : 'Ритъмът е различен. Чуй пак или промени някое местенце.',
    );
    api.sfx(correct ? 'correct' : 'soften');
  };
  const next = () => {
    if (!solved || busy.current || finished.current) return;
    if (round + 1 === params.rounds.length) {
      finished.current = true;
      api.celebrate();
      onProgress(1);
      onComplete({
        completed: true,
        durationMs: Date.now() - started.current,
        correct: params.rounds.length,
        attempts: attempts.current,
        hintsUsed: hints.current,
      });
    } else {
      setRound(round + 1);
      setAnswer(params.rounds[round + 1]!.map(() => null));
      setSelected(0);
      setHeard(false);
      setSolved(false);
      setShow(params.guided);
      setMessage('Нов ритъм! Първо чуй примера.');
    }
  };
  return (
    <div className={`${shared.stage} ${s.stage}`}>
      <p className={s.badge}>
        Ритъм {round + 1} от {params.rounds.length}
      </p>
      <p className={s.intro}>
        ● Бум · ◆ Дин{params.choices.includes('rest') ? ' · — Тихо за един удар' : ''}
      </p>
      {!sound && (
        <p className={s.intro}>
          Звукът е изключен. Следвай символите — можеш да играеш и без звук.
        </p>
      )}
      <div className={s.example}>
        <Button disabled={!!playing} onClick={() => play('example')}>
          Чуй примера
        </Button>
        <div className={s.beats} data-long={target.length > 4} aria-label="Примерен ритъм">
          {target.map((beat, i) => (
            <span
              key={i}
              className={s.beat}
              data-active={playing === 'example' && step === i}
              aria-label={`Удар ${i + 1}: ${show || (playing === 'example' && step === i) ? LABEL[beat] : 'скрит'}`}
            >
              {show || (playing === 'example' && step === i) ? SYMBOL[beat] : '♪'}
            </span>
          ))}
        </div>
        {!show && (
          <button
            className={s.hint}
            disabled={!!playing || solved}
            onClick={() => {
              setShow(true);
              hints.current++;
            }}
          >
            Покажи ритъма със символи
          </button>
        )}
      </div>
      <p className={s.intro}>
        Избери местенце, после сложи звук{params.choices.includes('rest') ? ' или пауза' : ''}.
      </p>
      <div className={s.beats} data-long={target.length > 4} aria-label="Твоят ритъм">
        {answer.map((beat, i) => (
          <button
            key={i}
            className={s.beat}
            data-selected={selected === i}
            data-active={playing === 'answer' && step === i}
            aria-pressed={selected === i}
            aria-label={`Място ${i + 1}: ${beat ? LABEL[beat] : 'празно'}`}
            disabled={!!playing || solved || !heard}
            onClick={() => setSelected(i)}
          >
            <small>{i + 1}</small>
            {beat ? SYMBOL[beat] : '+'}
          </button>
        ))}
      </div>
      <div className={s.instruments}>
        {params.choices.map((beat) => (
          <button
            key={beat}
            disabled={!!playing || solved || !heard}
            onClick={() => {
              setAnswer((a) => a.map((v, i) => (i === selected ? beat : v)));
              setSelected((i) => Math.min(i + 1, target.length - 1));
            }}
          >
            <span aria-hidden="true">{SYMBOL[beat]}</span>
            {LABEL[beat]}
          </button>
        ))}
      </div>
      <p className={s.status} role="status">
        {playing
          ? playing === 'example'
            ? 'Слушаме примера…'
            : 'Твоят ритъм свири…'
          : message}
      </p>
      <div className={s.actions}>
        <Button
          variant="quiet"
          disabled={!!playing || answer.some((b) => b === null)}
          onClick={() => play('answer')}
        >
          Чуй моя ритъм
        </Button>
        {!solved ? (
          <Button
            disabled={!!playing || !heard || answer.some((b) => b === null)}
            onClick={check}
          >
            Провери ритъма
          </Button>
        ) : (
          <Button disabled={!!playing} onClick={next}>
            {round + 1 === params.rounds.length ? 'Готово!' : 'Следващ ритъм'}
          </Button>
        )}
      </div>
    </div>
  );
}
