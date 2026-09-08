import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import s from './Card.module.css';

export type CardVariant = 'plain' | 'flat' | 'raised' | 'tile';

type Props = Omit<HTMLAttributes<HTMLElement>, 'className'> & {
  variant?: CardVariant | undefined;
  /** Рендира се като <button>, ако е зададен onActivate. */
  onActivate?: (() => void) | undefined;
  as?: 'div' | 'section' | 'article' | 'li' | undefined;
  className?: string | undefined;
  children: ReactNode;
};

export function Card({
  variant = 'plain',
  onActivate,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: Props) {
  const cls = cx(
    s.root,
    variant === 'flat' && s.flat,
    variant === 'raised' && s.raised,
    variant === 'tile' && s.tile,
    onActivate && s.interactive,
    className,
  );

  if (onActivate) {
    return (
      <button type="button" onClick={onActivate} className={cls} {...rest}>
        {children}
      </button>
    );
  }

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
