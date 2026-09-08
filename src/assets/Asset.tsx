import { useMemo } from 'react';
import { assetUrl } from './registry';
import type { AssetId } from './registry';
import { placeholderDataUri } from './placeholder';

type Props = {
  id: AssetId;
  /** Страна в пиксели. Графиката е квадратна. */
  size?: number | string;
  /**
   * Достъпно име. Ако липсва, картинката е декоративна и се скрива от
   * екранните четци — правилното поведение, когато съседен надпис вече
   * казва същото.
   */
  label?: string | undefined;
  className?: string | undefined;
  draggable?: boolean | undefined;
};

/**
 * Показва актив по id.
 *
 * Липсващ актив НЕ чупи екрана — рисува се процедурен заместител. Така
 * активност може да се напише и изпробва, преди графиката ѝ да съществува.
 */
export function Asset({ id, size = '100%', label, className, draggable = false }: Props) {
  const src = useMemo(() => assetUrl(id) ?? placeholderDataUri(id), [id]);

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      className={className}
      draggable={draggable}
      // Детето влачи предмети из целия екран; вграденото влачене на
      // браузъра се бори с това и показва призрачно копие.
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      decoding="async"
    />
  );
}
