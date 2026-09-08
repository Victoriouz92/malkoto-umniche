import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { Shape } from '../shared/Shape';
import type { ShapeColor } from '../shared/shapeNames';
import { shuffle } from '../shared/random';
import type { EngineProps } from '../types';
import { BLUEPRINTS } from './blueprints';
import type { BuildingPiece } from './blueprints';
import type { ShapeBuilderParams } from './schema';
import s from './Engine.module.css';

export function ShapeBuilderEngine({ params, api, onComplete, onProgress }: EngineProps<ShapeBuilderParams>) {
  const blueprint = params.blueprint ? BLUEPRINTS[params.blueprint] : undefined;
  const pieces: BuildingPiece[] = blueprint?.pieces ?? params.model.map((id, i) => ({
    shape: id.replace('shape.', '') as BuildingPiece['shape'], color: 'teal',
    x: 15 + i * (70 / Math.max(1, params.model.length - 1)), y: 50, size: 22,
  }));
  const [built, setBuilt] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [choices] = useState(() => shuffle(params.choices));
  const [hint, setHint] = useState('');
  const started = useRef(Date.now());
  const attempts = useRef(0);
  const finished = useRef(false);
  const completionTimer = useRef<ReturnType<typeof setTimeout>>();
  const lock = useRef(false);
  const current = pieces[built];
  const expected = current ? `shape.${current.shape}` : '';
  useEffect(() => { onProgress(built / pieces.length); lock.current = false; }, [built, pieces.length, onProgress]);
  useEffect(() => () => clearTimeout(completionTimer.current), []);

  function select(id: string) {
    if (finished.current) return;
    setSelected(id);
    setHint('Сега докосни очертанието.');
    api.sfx('pick');
  }
  function place() {
    if (!selected || finished.current || lock.current) return;
    attempts.current += 1;
    if (selected !== expected) {
      setHint(`Тук ни трябва ${assetLabel(expected).toLowerCase()}.`);
      api.sfx('soften');
      return;
    }
    lock.current = true;
    const next = built + 1;
    setBuilt(next);
    setSelected(null);
    setHint('');
    api.sfx('snap');
    api.announce(`Поставени ${next} от ${pieces.length} части.`);
    if (next === pieces.length) {
      finished.current = true;
      api.celebrate();
      completionTimer.current = setTimeout(() => onComplete({
        completed: true, durationMs: Date.now() - started.current,
        correct: next, attempts: attempts.current, hintsUsed: 0,
      }), 1800);
    }
  }

  return <div className={s.workshop}>
    <div className={s.heading}>
      <span className={s.eyebrow}>МАЛКА РАБОТИЛНИЦА</span>
      <h2>{built === pieces.length ? 'Виж какво построи!' : `Да построим ${blueprint?.label ?? 'картинка'}!`}</h2>
      <p aria-live="polite">{hint || (current ? 'Избери форма долу. После я постави в очертанието.' : 'Всички части са на мястото си.')}</p>
    </div>
    <div className={s.workspace}>
      <aside className={s.example}>
        <span>Образец</span>
        <svg viewBox="0 0 100 100" aria-label={blueprint?.label ?? 'Образец'} role="img">
          {params.blueprint === 'flower' && <path d="M50 42V93" stroke="var(--crayon-green)" strokeWidth="5" />}
          {pieces.map((piece, index) => <g key={index} transform={`translate(${piece.x - piece.size / 2} ${piece.y - piece.size / 2}) rotate(${piece.rotation ?? 0} ${piece.size / 2} ${piece.size / 2})`}>
            <Shape shape={piece.shape} color={piece.color as ShapeColor} size={piece.size} />
          </g>)}
        </svg>
      </aside>
      <div className={s.board}>
        {params.blueprint === 'flower' && <span className={s.stem} />}
        {pieces.map((piece, index) => {
          const done = index < built;
          const active = index === built;
          const style = { left: `${piece.x}%`, top: `${piece.y}%`, width: `${piece.size}%`, height: `${piece.size}%`,
            '--piece-rotation': `${piece.rotation ?? 0}deg` } as CSSProperties;
          return <span key={index} className={s.piece} data-done={done} data-active={active} style={style}>
            <Shape shape={piece.shape} color={piece.color as ShapeColor} />
            {active && <button type="button" className={s.placeTarget} disabled={!selected}
              onClick={place} aria-label={`Постави ${assetLabel(expected).toLowerCase()}`} />}
          </span>;
        })}
      </div>
    </div>
    <div className={s.progress} aria-label={`${built} от ${pieces.length} части`}>
      {pieces.map((_, i) => <span key={i} data-done={i < built} />)}
    </div>
    <div className={s.tray} role="group" aria-label="Избери форма">
      {choices.map(id => <button key={id} type="button" onClick={() => select(id)} disabled={finished.current}
        aria-label={assetLabel(id)} aria-pressed={selected === id} className={s.choice}>
        <Asset id={id} size="100%" />
      </button>)}
    </div>
  </div>;
}
