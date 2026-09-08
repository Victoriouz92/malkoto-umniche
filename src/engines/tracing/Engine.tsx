import { useEffect, useRef, useState } from 'react';
import type { EngineProps } from '../types';
import type { TracingParams } from './schema';
import shared from '../shared/engine.module.css';
import c from '../shared/creative.module.css';

export function TracingEngine({ params, api, onComplete, onProgress }: EngineProps<TracingParams>) {
  const [step, setStep] = useState(0); const started = useRef(Date.now()); const attempts = useRef(0); const finished = useRef(false);
  useEffect(() => onProgress(step / params.points.length), [step, params.points.length, onProgress]);
  const tap = (index: number) => {
    if (finished.current) return; attempts.current += 1;
    if (index !== step) { api.sfx('soften'); return; }
    api.sfx('tap'); api.haptic('light'); const next = step + 1; setStep(next);
    if (next === params.points.length) { finished.current = true; api.sfx('complete'); api.celebrate(); window.setTimeout(() => onComplete({ completed: true, durationMs: Date.now() - started.current, correct: next, attempts: attempts.current, hintsUsed: 0 }), 500); }
  };
  const done = params.points.slice(0, step).map((p) => `${p.x},${p.y}`).join(' ');
  return <div className={shared.stage}><p className={shared.prompt}>Следвай пътечката</p><div className={c.board}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><polyline className={c.guide} points={params.points.map((p) => `${p.x},${p.y}`).join(' ')} />{step > 1 ? <polyline className={c.doneLine} points={done} /> : null}</svg>
    {params.points.map((p, i) => <button key={i} type="button" className={`${c.point} ${i === step ? c.pointNext : ''} ${i < step ? c.pointDone : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => tap(i)} aria-label={`точка ${i + 1}`}>{i < step ? '✓' : params.guide}</button>)}
  </div></div>;
}
