import { useEffect, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import type { EngineProps } from '../types';
import type { ConnectDotsParams } from './schema';
import shared from '../shared/engine.module.css';
import c from '../shared/creative.module.css';

export function ConnectDotsEngine({ params, api, onComplete, onProgress }: EngineProps<ConnectDotsParams>) {
  const [step, setStep] = useState(0); const started = useRef(Date.now()); const attempts = useRef(0); const finished = useRef(false);
  useEffect(() => onProgress(step / params.points.length), [step, params.points.length, onProgress]);
  const tap = (index: number) => { if (finished.current) return; attempts.current += 1; if (index !== step) { api.sfx('soften'); return; } const next = step + 1; setStep(next); api.sfx('snap'); if (next === params.points.length) { finished.current = true; api.celebrate(); window.setTimeout(() => onComplete({ completed: true, durationMs: Date.now() - started.current, correct: next, attempts: attempts.current, hintsUsed: 0 }), 700); } };
  if (step === params.points.length) return <div className={shared.stage}><div className={c.reveal}><Asset id={params.revealAsset} size="100%" /></div></div>;
  return <div className={shared.stage}><p className={shared.prompt}>Свържи точките по ред</p><div className={c.board}>
    <svg viewBox="0 0 100 100" aria-hidden="true">{step > 1 ? <polyline className={c.doneLine} points={params.points.slice(0, step).map((p) => `${p.x},${p.y}`).join(' ')} /> : null}</svg>
    {params.points.map((p, i) => <button key={i} type="button" className={`${c.point} ${i === step ? c.pointNext : ''} ${i < step ? c.pointDone : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => tap(i)} aria-label={`точка ${i + 1}`}>{i + 1}</button>)}
  </div></div>;
}
