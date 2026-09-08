import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import type { EngineProps } from '../types';
import type { SpotDifferenceParams } from './schema';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

/** Визуално търсене върху сцена: „скрити предмети“ и „намери всички“. */
export function SpotDifferenceEngine({ params, api, onComplete, onProgress }: EngineProps<SpotDifferenceParams>) {
  const [found, setFound] = useState<Set<number>>(() => new Set());
  const [nudging, setNudging] = useState(false);
  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const finished = useRef(false);

  useEffect(() => onProgress(found.size / params.targets.length), [found, onProgress, params.targets.length]);

  useEffect(() => {
    if (found.size !== params.targets.length || finished.current) return;
    const id = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      api.sfx('complete'); api.celebrate();
      onComplete({ completed: true, durationMs: Date.now() - startedAt.current, correct: params.targets.length, attempts: attempts.current, hintsUsed: 0 });
    }, 900);
    return () => window.clearTimeout(id);
  }, [api, found.size, onComplete, params.targets.length]);

  const find = (index: number) => {
    if (found.has(index) || finished.current) return;
    attempts.current += 1; api.sfx('correct'); api.haptic('success');
    api.announce(`Намерено: ${assetLabel(params.targets[index]?.id ?? '')}`);
    setFound((old) => new Set(old).add(index));
  };

  const miss = () => {
    if (finished.current) return;
    attempts.current += 1; api.sfx('soften'); setNudging(true);
    window.setTimeout(() => setNudging(false), 380);
  };

  const styleFor = (item: SpotDifferenceParams['targets'][number]): CSSProperties => ({
    left: `${item.x}%`, top: `${item.y}%`,
    '--rotate': `${item.rotate}deg`, '--object-size': `${item.size}px`,
    '--object-opacity': item.opacity,
  } as CSSProperties);

  return <div className={shared.stage}>
    <div className={s.targets} aria-label="Предмети за намиране">
      {params.targets.map((target, index) => <div key={`${target.id}-${index}`} className={cx(s.target, found.has(index) && s.targetFound)} aria-label={`${assetLabel(target.id)}: ${found.has(index) ? 'намерено' : 'търси'}`}><Asset id={target.id} size="100%" /></div>)}
    </div>
    <output className={s.counter} aria-live="polite">Намерени: {found.size} / {params.targets.length}</output>
    <div className={cx(s.scene, nudging && s.nudge)} onPointerDown={(event) => { if (event.target === event.currentTarget || event.target === event.currentTarget.firstChild) miss(); }}>
      <Asset id={params.scene} className={s.background} label="сцена" />
      {params.decoys.map((item, index) => <span key={`decoy-${item.id}-${index}`} className={cx(s.placed, s.decoy)} style={styleFor(item)} aria-hidden="true"><Asset id={item.id} size="100%" /></span>)}
      {params.targets.map((item, index) => <button key={`${item.id}-${index}`} type="button" className={cx(s.placed, found.has(index) && s.found)} style={styleFor(item)} aria-label={`Намери: ${assetLabel(item.id)}`} disabled={found.has(index)} onPointerDown={(event) => event.stopPropagation()} onClick={() => find(index)}><Asset id={item.id} size="100%" /></button>)}
    </div>
  </div>;
}
