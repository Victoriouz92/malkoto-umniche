import { useEffect, useRef, useState } from 'react';
import { Button, cx } from '@/design-system';
import { t } from '@/i18n';
import type { EngineProps } from '../types';
import type { DrawingParams } from './schema';
import { CRAYONS, type Crayon } from '../coloring/schema';
import s from '../shared/engine.module.css';
import d from './Engine.module.css';
import c from '../coloring/Engine.module.css';

/**
 * „Рисувай свободно“.
 *
 * Няма цел и няма оценка — единственото място в продукта без правилно.
 * Затова тук няма и `soften`: не съществува ход, който да е неверен.
 *
 * Рисува се в canvas, а не в SVG: детето прави стотици точки в секунда и
 * всяка от тях като DOM елемент би задавила слаб таблет.
 */
export function DrawingEngine({
  params,
  activity,
  api,
  onComplete,
  onProgress,
}: EngineProps<DrawingParams>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokes = useRef(0);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  const [crayon, setCrayon] = useState<Crayon>(params.palette[0] ?? 'red');
  const [width, setWidth] = useState(params.widths[0] ?? 12);
  const [dirty, setDirty] = useState(false);
  const paletteLimit = activity.ageMin <= 2 ? 8 : 10;
  const palette = [
    ...new Set([
      ...params.palette.filter((name) => name !== 'black'),
      ...CRAYONS.filter((name) => name !== 'black' && !params.palette.includes(name)),
    ]),
  ].slice(0, paletteLimit - 1).concat('black' as const);

  /** Платното следва размера си на екрана, за да не е размазано. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx?.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    onProgress(dirty ? 1 : 0);
  }, [dirty, onProgress]);

  const colorOf = (name: Crayon): string => {
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue(`--crayon-${name}`).trim();
  };

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const begin = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current += 1;

    const p = at(e);
    ctx.strokeStyle = colorOf(crayon);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // Една точка е също рисунка — тапът трябва да остави следа.
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();

    if (!dirty) {
      setDirty(true);
      api.sfx('pick');
    }
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = at(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
    api.sfx('soften');
  };

  const done = () => {
    if (finished.current) return;
    finished.current = true;
    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      // Всеки щрих е успех: тук няма верни и грешни ходове.
      correct: strokes.current,
      attempts: strokes.current,
      hintsUsed: 0,
    });
  };

  return (
    <div className={s.stage}>
      <canvas
        ref={canvasRef}
        className={d.canvas}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        role="img"
        aria-label={t('cat.colors')}
      />

      <div className={c.palette} role="radiogroup" aria-label={t('cat.colors')}>
        {palette.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={crayon === name}
            aria-label={name}
            className={cx(c.crayon, crayon === name && c.crayonOn)}
            style={{ background: `var(--crayon-${name})` }}
            onClick={() => {
              api.sfx('tap');
              setCrayon(name);
            }}
          />
        ))}
      </div>

      <div className={d.tools}>
        {params.widths.map((w) => (
          <button
            key={w}
            type="button"
            aria-label={`дебелина ${w}`}
            aria-pressed={width === w}
            className={cx(d.width, width === w && d.widthOn)}
            onClick={() => setWidth(w)}
          >
            <span style={{ width: w, height: w }} />
          </button>
        ))}

        <Button variant="quiet" size="sm" onClick={clear} disabled={!dirty}>
          {t('action.delete')}
        </Button>
        <Button variant="primary" size="sm" onClick={done} disabled={!dirty}>
          {t('action.done')}
        </Button>
      </div>
    </div>
  );
}
