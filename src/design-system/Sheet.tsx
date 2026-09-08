import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { cx } from './cx';
import s from './Sheet.module.css';

export type SheetPlacement = 'bottom' | 'center' | 'full';

type Props = {
  open: boolean;
  onClose: () => void;
  placement?: SheetPlacement;
  title?: string;
  /**
   * Забранява затваряне с Esc и клик встрани.
   * Задължително за мекия стоп и PIN вратата — детето не бива да може
   * да ги отхвърли случайно.
   */
  persistent?: boolean;
  panelClassName?: string | undefined;
  children: ReactNode;
};

export function Sheet({
  open,
  onClose,
  placement = 'bottom',
  title,
  persistent = false,
  panelClassName,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !persistent) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener('cancel', block);
    return () => el.removeEventListener('cancel', block);
  }, [persistent]);

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={title ? titleId : undefined}
      onClose={onClose}
      onClick={(e) => {
        // Клик върху самия <dialog> (не върху панела) = клик встрани.
        if (!persistent && e.target === ref.current) onClose();
      }}
    >
      <div className={cx(s.panel, s[placement], panelClassName)}>
        {placement === 'bottom' && !persistent ? <div className={s.grabber} /> : null}
        {title ? (
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </dialog>
  );
}
