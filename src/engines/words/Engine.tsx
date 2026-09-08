import { useEffect, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { shuffle } from '../shared/random';
import type { EngineProps } from '../types';
import type { WordsParams } from './schema';
import shared from '../shared/engine.module.css';
import c from '../shared/creative.module.css';

export function WordsEngine({ params, api, onComplete, onProgress }: EngineProps<WordsParams>) {
  const [built, setBuilt] = useState<string[]>([]); const [choices] = useState(() => shuffle(params.syllables)); const started = useRef(Date.now()); const attempts = useRef(0); const finished = useRef(false);
  useEffect(() => onProgress(built.length / params.syllables.length), [built.length, params.syllables.length, onProgress]);
  const pick = (part: string) => { if (finished.current) return; attempts.current += 1; if (part !== params.syllables[built.length]) { api.sfx('soften'); return; } const next = [...built, part]; setBuilt(next); api.sfx('correct'); if (next.length === params.syllables.length) { finished.current = true; api.speak(params.word); api.celebrate(); window.setTimeout(() => onComplete({ completed: true, durationMs: Date.now() - started.current, correct: next.length, attempts: attempts.current, hintsUsed: 0 }), 900); } };
  return <div className={shared.stage}><div className={c.picture}><Asset id={params.picture} size="100%" /></div><div className={c.word}>{params.syllables.map((part, i) => <span key={i} className={`${c.syllable} ${i < built.length ? c.syllableDone : ''}`}>{i < built.length ? part : '•'}</span>)}</div><div className={shared.row}>{choices.map((part) => <button key={part} type="button" className={c.syllable} disabled={built.includes(part)} onClick={() => pick(part)}>{part}</button>)}</div></div>;
}
