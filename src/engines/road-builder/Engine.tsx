import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Asset } from '@/assets/Asset';
import type { EngineProps } from '../types';
import { roadPorts, roadSolved } from './schema';
import type { RoadBuilderParams } from './schema';
import s from './Engine.module.css';

export function RoadBuilderEngine({ params, api, onProgress, onComplete }: EngineProps<RoadBuilderParams>) {
  const [round, setRound] = useState(0);
  const [turns, setTurns] = useState(() => params.paths[0]!.map(() => 1));
  const [solved, setSolved] = useState(false);
  const started = useRef(Date.now()), attempts = useRef(0), lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const path = params.paths[round]!;
  useEffect(() => onProgress(round / params.paths.length), [round, params.paths.length, onProgress]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function rotate(index: number) {
    if (lock.current) return;
    attempts.current++;
    const next = turns.map((turn, i) => i === index ? (turn + 1) % 4 : turn);
    setTurns(next);
    api.sfx('tap');
    if (roadSolved(path, next)) {
      lock.current = true; setSolved(true); api.sfx('correct'); api.announce('Пътят е готов!');
      timer.current = setTimeout(() => {
        if (round + 1 === params.paths.length) {
          api.celebrate();
          onComplete({ completed: true, durationMs: Date.now() - started.current,
            // Rotations are exploration, not incorrect answers.
            correct: attempts.current, attempts: attempts.current, hintsUsed: 0 });
        } else {
          setRound(round + 1); setTurns(params.paths[round + 1]!.map(() => 1)); setSolved(false); lock.current = false;
        }
      }, 1600);
    }
  }
  return <div className={s.workshop}>
    <span className={s.eyebrow}>ПЪТНИ СТРОИТЕЛИ · {round + 1} / {params.paths.length}</span>
    <h2>{solved ? 'Пътят е готов!' : 'Да свържем пътя!'}</h2>
    <p role="status">{solved ? 'Колата вече може да стигне до флагчето.' : 'Докосвай отсечките, за да ги завъртиш. Свържи колата с флагчето.'}</p>
    <div className={s.map}>
      <span className={s.departure}><Asset id={params.vehicle} size="100%" /></span>
      <div className={s.roads} role="group" aria-label="Завърти пътните отсечки">
        {Array.from({ length: 9 }, (_, cell) => {
          const index = path.indexOf(cell);
          if (index < 0) return <span key={cell} className={s.grass} aria-hidden="true">✿</span>;
          const ports = roadPorts(path, index);
          const ends = [[50, 0], [100, 50], [50, 100], [0, 50]];
          const from = ends[ports[0]!]!, to = ends[ports[1]!]!;
          const line = `M${from[0]} ${from[1]} L50 50 L${to[0]} ${to[1]}`;
          return <button key={cell} type="button" className={s.tile} disabled={solved}
            onClick={() => rotate(index)} aria-label={`Завърти отсечка ${cell + 1}`}
            style={{ '--turn': `${(turns[index] ?? 0) * 90}deg` } as CSSProperties}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d={line} fill="none" stroke={solved ? 'var(--cat-numbers-ink)' : 'var(--cat-vehicles-ink)'} strokeWidth="30" strokeLinejoin="round" />
              <path d={line} fill="none" stroke="white" strokeWidth="3" strokeDasharray="8 7" />
            </svg>
          </button>;
        })}
      </div>
      <span className={s.destination} aria-label="Край на пътя">{solved ? '✓' : '⚑'}</span>
    </div>
    <p className={s.hint}>Пътят трябва да се допира по краищата на всяка отсечка.</p>
  </div>;
}
