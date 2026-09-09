import { useEffect, useRef, useState } from 'react';
import { loadLineart } from '@/assets/registry';
import { cx } from '@/design-system';
import { t } from '@/i18n';
import type { EngineProps } from '../types';
import { CRAYONS, type ColoringParams, type Crayon } from './schema';
import { findRegions } from './regions';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

const SIZE = 768;
const COLOR_NAMES: Record<Crayon, string> = {
  red: 'Червено',
  orange: 'Оранжево',
  yellow: 'Жълто',
  green: 'Зелено',
  teal: 'Тюркоазено',
  blue: 'Синьо',
  purple: 'Лилаво',
  pink: 'Розово',
  brown: 'Кафяво',
  grey: 'Сиво',
  black: 'Черно',
};
type Drawing = ReturnType<typeof findRegions> & {
  original: ImageData;
  colors: Map<number, string>;
};

/** Bucket fill uses visible closed outlines, never shared SVG colour groups. */
export function ColoringEngine({
  params,
  api,
  onComplete,
  onProgress,
}: EngineProps<ColoringParams>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Drawing>();
  const history = useRef<{ region: number; previous: string | undefined }[]>([]);
  const started = useRef(Date.now());
  const taps = useRef(0);
  const finished = useRef(false);
  const [crayon, setCrayon] = useState<Crayon>(params.palette[0] ?? 'red');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState(1);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const palette = [...new Set([...params.palette, ...CRAYONS])];

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(false);
    setSelectedRegion(1);
    drawing.current = undefined;
    history.current = [];
    finished.current = false;
    taps.current = 0;
    started.current = Date.now();
    void (async () => {
      const markup = await loadLineart(params.lineart);
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup.replace('<svg ', `<svg width="${SIZE}" height="${SIZE}" `))}`;
      await img.decode();
      if (cancelled) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = 'white'; // Neutral raster paper, independent of the UI theme.
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const original = ctx.getImageData(0, 0, SIZE, SIZE);
      drawing.current = {
        original,
        ...findRegions(original.data, SIZE, SIZE),
        colors: new Map(),
      };
      setReady(true);
      setRevision((v) => v + 1);
    })().catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [params.lineart]);

  useEffect(() => {
    const model = drawing.current;
    onProgress(model?.regions.length ? model.colors.size / model.regions.length : 0);
  }, [revision, onProgress]);

  function renderRegion(region: number, color?: string) {
    const model = drawing.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (!model || !ctx) return;
    const swatch = document.createElement('canvas').getContext('2d')!;
    swatch.fillStyle = color ?? 'white';
    swatch.fillRect(0, 0, 1, 1);
    const rgb = swatch.getImageData(0, 0, 1, 1).data;
    const frame = ctx.getImageData(0, 0, SIZE, SIZE);
    for (const p of model.regions[region - 1] ?? []) {
      for (let c = 0; c < 3; c++) {
        // Preserve original edge shading, even when repainting a black region.
        frame.data[p * 4 + c] = Math.round((model.original.data[p * 4 + c]! * rgb[c]!) / 255);
      }
    }
    ctx.putImageData(frame, 0, 0);
    if (color) model.colors.set(region, color);
    else model.colors.delete(region);
    setRevision((v) => v + 1);
  }

  function paintRegion(region: number) {
    const model = drawing.current;
    const canvas = canvasRef.current;
    if (!ready || !model || !canvas || finished.current || region <= 0) return;
    const color = getComputedStyle(canvas).getPropertyValue(`--crayon-${crayon}`).trim();
    if (!color || model.colors.get(region) === color) return;
    history.current.push({ region, previous: model.colors.get(region) });
    renderRegion(region, color);
    taps.current++;
    api.sfx('drop');
  }

  const selectedPixels = drawing.current?.regions[selectedRegion - 1];
  const marker = selectedPixels?.[Math.floor(selectedPixels.length / 2)];

  return (
    <div className={shared.stage}>
      <p className={s.instruction}>Избери цвят и докосни вътре в очертанията.</p>
      {error && <p role="alert">Рисунката не се зареди. Отвори играта отново.</p>}
      <div className={s.canvas}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={
            ready
              ? 'Рисунка за оцветяване — докосни отделна затворена област'
              : t('sys.loading')
          }
          onClick={(event) => {
            const model = drawing.current;
            if (!model || !ready || finished.current) return;
            const box = event.currentTarget.getBoundingClientRect();
            const x = Math.floor(((event.clientX - box.left) * SIZE) / box.width);
            const y = Math.floor(((event.clientY - box.top) * SIZE) / box.height);
            if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
            const region = model.labels[y * SIZE + x]!;
            if (region <= 0) return;
            setSelectedRegion(region);
            paintRegion(region);
          }}
        />
        {keyboardMode && marker !== undefined && (
          <div className={s.markerLayer} aria-hidden="true">
            <span
              className={s.marker}
              style={{
                left: `${((marker % SIZE) / SIZE) * 100}%`,
                top: `${(Math.floor(marker / SIZE) / SIZE) * 100}%`,
              }}
            >
              {selectedRegion}
            </span>
          </div>
        )}
      </div>
      <details onToggle={(event) => setKeyboardMode(event.currentTarget.open)}>
        <summary>Оцветяване с клавиатура</summary>
        <div className={s.actions}>
          <label>
            Зона{' '}
            <select
              value={selectedRegion}
              onChange={(event) => setSelectedRegion(Number(event.target.value))}
            >
              {drawing.current?.regions.map((_, i) => (
                <option key={i} value={i + 1}>
                  Зона {i + 1}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={!ready} onClick={() => paintRegion(selectedRegion)}>
            Оцвети избраната зона
          </button>
        </div>
      </details>
      <div className={s.palette} role="group" aria-label={t('cat.colors')}>
        {palette.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={crayon === name}
            aria-label={COLOR_NAMES[name]}
            title={COLOR_NAMES[name]}
            className={cx(s.crayon, crayon === name && s.crayonOn)}
            style={{ background: `var(--crayon-${name})` }}
            onClick={() => {
              api.sfx('pick');
              setCrayon(name);
            }}
          />
        ))}
      </div>
      <div className={s.actions}>
        <button
          type="button"
          disabled={!history.current.length}
          onClick={() => {
            const last = history.current.pop();
            if (last) renderRegion(last.region, last.previous);
          }}
        >
          Върни последния цвят
        </button>
        <button
          type="button"
          disabled={!drawing.current?.colors.size}
          onClick={() => {
            if (finished.current) return;
            finished.current = true;
            api.sfx('complete');
            api.celebrate();
            onComplete({
              completed: true,
              durationMs: Date.now() - started.current,
              correct: taps.current,
              attempts: taps.current,
              hintsUsed: 0,
            });
          }}
        >
          Готово!
        </button>
      </div>
    </div>
  );
}
