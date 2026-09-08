import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import s from './Button.module.css';

export type ButtonVariant =
  | 'primary'
  | 'strong'
  | 'secondary'
  | 'soft'
  | 'quiet'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'kid';

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Икона преди надписа. */
  glyph?: ReactNode | undefined;
  /** Заема цялата налична ширина. */
  block?: boolean | undefined;
  className?: string | undefined;
};

type LabelledProps = BaseProps & {
  iconOnly?: false | undefined;
  children: ReactNode;
};

/**
 * Бутон само с икона.
 *
 * Типът ИЗИСКВА aria-label. Икона без надпис е невидима за екранен четец,
 * а родителският панел трябва да е достъпен. Компонентът нарочно не минава
 * през forwardRef — обединеният тип (union) се запазва само при обикновена
 * функция, а тъкмо той налага това правило.
 */
type IconOnlyProps = BaseProps & {
  iconOnly: true;
  children?: never;
  'aria-label': string;
};

export type ButtonProps = LabelledProps | IconOnlyProps;

export function Button(props: ButtonProps) {
  const {
    variant = 'soft',
    size = 'md',
    glyph,
    block,
    className,
    children,
    iconOnly,
    ...domProps
  } = props;

  const sizeClass = iconOnly
    ? size === 'kid'
      ? s.iconKid
      : s.icon
    : s[size];

  return (
    <button
      type="button"
      {...domProps}
      className={cx(s.root, s[variant], sizeClass, block && s.block, className)}
    >
      {glyph ? (
        <span className={s.glyph} aria-hidden="true">
          {glyph}
        </span>
      ) : null}
      {children}
    </button>
  );
}
