import { useCallback, useEffect, useRef, useState } from 'react';
import { cx } from './cx';
import s from './HoldButton.module.css';

type Props = {
  label: string;
  /** Колко дълго трябва да се задържи, в милисекунди. */
  durationMs?: number;
  onComplete: () => void;
  className?: string | undefined;
};

/**
 * Изисква задържане, не тап.
 *
 * Пази изхода от детския режим. Тапът е движение, което тригодишно прави
 * стотици пъти на минута; задържането от три секунди — почти никога
 * случайно.
 *
 * Клавиатурата също работи: Enter или интервал задържани вършат същото,
 * иначе изходът щеше да е недостъпен за родител с помощна технология.
 */
export function HoldButton({ label, durationMs = 3000, onComplete, className }: Props) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const startRef = useRef(0);
  const doneRef = useRef(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    window.clearTimeout(timerRef.current);
    startRef.current = 0;
    setProgress(0);
  }, []);

  /**
   * Кадрите РИСУВАТ, таймерът РЕШАВА.
   *
   * `requestAnimationFrame` спира напълно, когато табът не композира кадри.
   * Ако задържането зависеше от него, родителят щеше да натиска бутон,
   * който никога не се задейства — и без път навън. Затова краят се решава
   * от `setTimeout`, а кадрите само пълнят лентата.
   */
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
    stop();
  }, [onComplete, stop]);

  const paint = useCallback(() => {
    if (startRef.current === 0) return;
    const elapsed = performance.now() - startRef.current;
    setProgress(Math.min(1, elapsed / durationMs));
    if (elapsed < durationMs) rafRef.current = requestAnimationFrame(paint);
  }, [durationMs]);

  const start = useCallback(() => {
    if (startRef.current !== 0) return;
    doneRef.current = false;
    startRef.current = performance.now();
    timerRef.current = window.setTimeout(finish, durationMs);
    rafRef.current = requestAnimationFrame(paint);
  }, [durationMs, finish, paint]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(timerRef.current);
    },
    [],
  );

  const holding = progress > 0;

  return (
    <button
      type="button"
      className={cx(s.root, holding && s.holding, className)}
      aria-label={label}
      // `aria-describedby` би бил излишен: изискването се вижда в надписа.
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') stop();
      }}
      onBlur={stop}
    >
      <span className={s.fill} style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      <span className={s.text}>{label}</span>
    </button>
  );
}
