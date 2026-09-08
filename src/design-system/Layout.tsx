import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx';
import s from './Layout.module.css';

type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

function gapStyle(gap?: Gap, extra?: CSSProperties): CSSProperties | undefined {
  if (gap === undefined) return extra;
  return { ...extra, ['--gap' as string]: gap === 0 ? '0' : `var(--sp-${gap})` };
}

type StackProps = {
  gap?: Gap | undefined;
  center?: boolean | undefined;
  between?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
};

/** Вертикална колона с еднакво отстояние. */
export function Stack({ gap, center, between, className, style, children }: StackProps) {
  return (
    <div
      className={cx(s.stack, center && s.center, between && s.between, className)}
      style={gapStyle(gap, style)}
    >
      {children}
    </div>
  );
}

/** Хоризонтален ред, който се пренася на нов ред при нужда. */
export function Cluster({ gap, center, between, className, style, children }: StackProps) {
  return (
    <div
      className={cx(s.cluster, center && s.center, between && s.between, className)}
      style={gapStyle(gap, style)}
    >
      {children}
    </div>
  );
}

type GridProps = StackProps & {
  /** Минимална ширина на колона, напр. '16rem'. */
  min?: string | undefined;
};

/** Автоматична решетка — начален екран, албум със стикери, статистики. */
export function Grid({ gap, min, className, style, children }: GridProps) {
  return (
    <div
      className={cx(s.grid, className)}
      style={gapStyle(gap, min ? { ...style, ['--min' as string]: min } : style)}
    >
      {children}
    </div>
  );
}

type PageProps = {
  narrow?: boolean | undefined;
  /**
   * Центрира текста. За детските екрани и витрините.
   * Родителският панел го оставя изключен — плътни данни се четат по левия ръб.
   */
  centered?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
};

/** Ограничена по ширина страница със safe-area отстояния. */
export function Page({ narrow, centered, className, children }: PageProps) {
  return (
    <div
      className={cx(s.page, narrow && s.pageNarrow, centered && s.pageCentered, className)}
    >
      {children}
    </div>
  );
}
