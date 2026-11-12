import { useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { Button } from '@/design-system';
import { t } from '@/i18n';
import type { EngineProps } from '../types';
import { growth } from './schema';
import type { Care, GardenParams, Growth } from './schema';
import s from './Engine.module.css';

function Plant({ crop, stage }: { crop: GardenParams['crop']; stage: Growth }) {
  return (
    <span className={s.plant} data-stage={stage} aria-hidden="true">
      {stage === 'bloom' ? <span className={s.crop}><Asset id={crop} size="100%" /></span> : null}
      <svg className={s.plantArt} viewBox="0 0 120 118">
        {stage === 'seed' ? <ellipse className={s.seed} cx="60" cy="70" rx="10" ry="6" transform="rotate(-20 60 70)" /> : (
          <path className={s.stem} d="M61 83Q65 63 59 37M62 66Q41 66 32 48Q52 45 62 66ZM62 57Q73 40 94 41Q88 57 62 57Z" />
        )}
        <path className={s.pot} d="M19 79H101L89 112Q60 121 31 112Z" />
        <path className={s.rim} d="M19 80H101" />
      </svg>
    </span>
  );
}

const condition = (factor: keyof Care, present: boolean) =>
  t(`garden.${factor}.${present ? 'yes' : 'no'}`);

export function GardenEngine({ params, api, onComplete, onProgress }: EngineProps<GardenParams>) {
  const [care, setCare] = useState<Care>(() => params.mode === 'grow'
    ? { water: params.waterAtStart, light: params.lightAtStart }
    : { water: true, light: true });
  const [observed, setObserved] = useState<Growth | null>(null);
  const [guess, setGuess] = useState<'left' | 'right' | null>(null);
  const startedAt = useRef(Date.now());
  const observations = useRef(0);
  const finished = useRef(false);
  const firstHasResource = params.crop === 'nature.flower';
  const factor = params.mode === 'compare' ? params.factor : null;

  function observe() {
    const stage = growth(care);
    observations.current += 1;
    setObserved(stage);
    onProgress(factor || stage === 'bloom' ? 0.75 : 0.35);
    api.sfx(stage === 'bloom' ? 'chime' : 'tap');
  }

  function toggle(resource: keyof Care) {
    setCare((current) => ({ ...current, [resource]: !current[resource] }));
    setObserved(null);
    api.sfx('pick');
  }

  function finish() {
    if (finished.current) return;
    finished.current = true;
    api.sfx('complete');
    api.celebrate();
    onComplete({ completed: true, durationMs: Date.now() - startedAt.current,
      correct: 0, attempts: observations.current, hintsUsed: 0 });
  }

  return (
    <section className={s.greenhouse} aria-label={t('garden.title')}>
      <header className={s.heading}>
        <h2>{t('garden.title')}</h2>
        <p>{t(factor ? 'garden.compare' : 'garden.grow')}</p>
      </header>
      {factor ? (
        <div className={s.beds} role="group" aria-label={t('garden.choose')}>
          {(['left', 'right'] as const).map((side) => {
            const present = side === 'left' ? firstHasResource : !firstHasResource;
            const stage = observed ? growth({ ...care, [factor]: present }) : 'seed';
            const label = condition(factor, present);
            return (
              <button key={side} type="button" className={s.bed}
                aria-label={observed ? `${label} · ${t(`garden.stage.${stage}`)}` : label}
                aria-pressed={guess === side} aria-disabled={observed !== null}
                onClick={() => { if (!observed) setGuess(side); }}>
                <span aria-hidden="true" className={s.conditionIcon}>{factor === 'water' ? '💧' : '☀'}{present ? ' ✓' : ' —'}</span>
                <Plant crop={params.crop} stage={stage} />
                <span>{label}</span>
                {observed ? <strong>{t(`garden.stage.${stage}`)}</strong> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className={s.single}><Plant crop={params.crop} stage={observed ?? 'seed'} /></div>
          <div className={s.tools} role="group" aria-label={t('garden.tools')}>
            <Button variant="soft" aria-pressed={care.water} onClick={() => toggle('water')}>
              <span aria-hidden="true">💧 </span>{condition('water', care.water)}
            </Button>
            <Button variant="soft" aria-pressed={care.light} onClick={() => toggle('light')}>
              <span aria-hidden="true">☀ </span>{condition('light', care.light)}
            </Button>
          </div>
        </>
      )}
      <div className={s.observation} role="status">
        {observed ? t(factor ? `garden.compare.${factor}` : `garden.result.${observed}`) : null}
      </div>
      <div className={s.tools}>
        {observed === 'bloom' ? (
          <Button size="kid" variant="primary" onClick={finish}>{t('action.done')}</Button>
        ) : (
          <Button size="kid" variant="primary" disabled={factor !== null && guess === null} onClick={observe}>
            {t('garden.observe')}
          </Button>
        )}
      </div>
    </section>
  );
}
