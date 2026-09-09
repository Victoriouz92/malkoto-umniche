import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import type { EngineProps } from '../types';
import { shuffle } from '../shared/random';
import { variantRandom } from '../shared/variant';
import type { MemoryParams } from './schema';
import s from './RecallEngine.module.css';

/** The child controls study time. Reopening the model is recorded as a hint. */
export function RecallEngine({ params, activity, variant, api, onComplete, onProgress }: EngineProps<MemoryParams>) {
  const [task, setTask] = useState(0);
  const [studying, setStudying] = useState(true);
  const [answers, setAnswers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [solved, setSolved] = useState(false);
  const started = useRef(Date.now()), attempts = useRef(0), correct = useRef(0), hints = useRef(0);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const rounds = 3;
  const model = useMemo(() => {
    // Each task has a fresh arrangement, independent of the answer-button order.
    const random = variantRandom(activity.id, variant * rounds + task);
    const sequence = shuffle(params.items, random).slice(0, params.length);
    return { sequence, missing: Math.floor(random() * sequence.length), choices: shuffle(params.items, random) };
  }, [params.items, params.length, activity.id, variant, task]);
  const expected = params.mode === 'missing' ? [model.sequence[model.missing]!]
    : params.mode === 'reverse' ? [...model.sequence].reverse() : model.sequence;
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => onProgress((task + answers.length / expected.length) / rounds), [task, answers.length, expected.length, onProgress]);

  function choose(asset: string) {
    if (studying || locked.current) return;
    attempts.current++;
    if (asset !== expected[answers.length]) {
      api.sfx('soften'); setMessage('Опитай отново. Можеш да погледнеш още веднъж.'); return;
    }
    correct.current++;
    const next = [...answers, asset];
    setAnswers(next); setMessage('Точно така!'); api.sfx('correct');
    if (next.length !== expected.length) return;
    locked.current = true; setSolved(true);
    timer.current = setTimeout(() => {
      if (task + 1 === rounds) {
        api.celebrate();
        onComplete({ completed: true, durationMs: Date.now() - started.current,
          correct: correct.current, attempts: attempts.current, hintsUsed: hints.current });
      } else {
        setTask(t => t + 1); setAnswers([]); setStudying(true); setSolved(false); setMessage(''); locked.current = false;
      }
    }, 1100);
  }

  return <div className={s.stage}>
    <span className={s.badge}>Предизвикателство {task + 1} от {rounds}</span>
    <h2>{params.mode === 'missing' ? 'Кой се скри?' : params.mode === 'reverse' ? 'Отзад напред!' : 'Запомни редицата'}</h2>
    <p>{studying ? 'Разгледай спокойно. Натисни „Запомних“, когато си готов.'
      : params.mode === 'missing' ? 'Една картинка изчезна. Коя беше тя?'
      : params.mode === 'reverse' ? 'Посочи картинките от последната към първата.' : 'Посочи картинките в същия ред.'}</p>
    <div className={s.row} aria-label={studying ? 'Картинки за запомняне' : 'Скрита задача'}>
      {model.sequence.map((asset, i) => {
        const visible = studying || solved || (params.mode === 'missing' && i !== model.missing);
        return <div className={s.slot} key={i}><small>{i + 1}</small>
          {visible ? <Asset id={asset} size={64} /> : <span aria-label="Скрита картинка">?</span>}
        </div>;
      })}
    </div>
    {studying ? <button className={s.action} type="button" onClick={() => { setStudying(false); setMessage(''); }}>Запомних →</button>
      : <>
        {params.mode !== 'missing' && <div className={s.row} aria-label="Твоят отговор">
          {expected.map((_, i) => <div className={s.answer} key={i}>{answers[i] ? <Asset id={answers[i]} size={48} /> : i + 1}</div>)}
        </div>}
        <div className={s.row} role="group" aria-label="Избери картинка">
          {model.choices.map(asset => <button className={s.choice} key={asset} type="button" disabled={solved || answers.includes(asset)}
            aria-label={assetLabel(asset)} onClick={() => choose(asset)}><Asset id={asset} size={60} /></button>)}
        </div>
        <button className={s.hint} type="button" disabled={solved} onClick={() => {
          hints.current++; setStudying(true); setAnswers([]); setMessage('');
        }}>Покажи отново</button>
      </>}
    <p role="status">{message}</p>
  </div>;
}
