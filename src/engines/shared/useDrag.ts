import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

/**
 * Влачене с пръст.
 *
 * Ползва се от половината механики (пъзел, сортиране, съпоставяне), затова
 * живее на едно място.
 *
 * Не ползва HTML5 drag & drop: той не работи на тъч и показва призрачно
 * копие, което не можем да управляваме. Pointer events работят еднакво с
 * пръст, мишка и писалка.
 *
 * Целите се намират през `elementsFromPoint`, а не през регистър с
 * координати — така не се налага да следим превъртане и преоразмеряване.
 */

export type DragState = {
  itemId: string;
  dx: number;
  dy: number;
  /** Зоната под пръста в момента, ако има такава. */
  overZone: string | null;
};

type Options = {
  /**
   * Извиква се при пускане. `zoneId` е `null`, ако пръстът е встрани —
   * тогава елементът се връща и НИЩО не се брои за грешка.
   */
  onDrop: (itemId: string, zoneId: string | null) => void;
  onPick?: ((itemId: string) => void) | undefined;
  disabled?: boolean | undefined;
};

/** Зоните се обявяват с този атрибут: `<div {...dropZone('bin-1')}>` */
export function dropZone(id: string) {
  return { 'data-drop-zone': id } as const;
}

function zoneAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const zone = el.closest<HTMLElement>('[data-drop-zone]');
    if (zone?.dataset['dropZone']) return zone.dataset['dropZone'];
  }
  return null;
}

export function useDrag({ onDrop, onPick, disabled = false }: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (itemId: string) => (e: ReactPointerEvent<HTMLElement>) => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      origin.current = { x: e.clientX, y: e.clientY };
      setDrag({ itemId, dx: 0, dy: 0, overZone: null });
      onPick?.(itemId);
    },
    [disabled, onPick],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      setDrag((current) => {
        if (!current) return current;
        return {
          ...current,
          dx: e.clientX - origin.current.x,
          dy: e.clientY - origin.current.y,
          overZone: zoneAt(e.clientX, e.clientY),
        };
      });
    },
    [],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      setDrag((current) => {
        if (current) onDrop(current.itemId, zoneAt(e.clientX, e.clientY));
        return null;
      });
    },
    [onDrop],
  );

  /**
   * Слага се върху влачимия елемент.
   *
   * `className` носи само слоя (`--z-drag` живее в CSS, не в кода);
   * `style` носи изместването, което по същността си е динамично.
   */
  const bind = useCallback(
    (itemId: string, draggingClass: string | undefined) => ({
      onPointerDown: handlePointerDown(itemId),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      'data-draggable': true,
      className: drag?.itemId === itemId ? draggingClass : undefined,
      style: dragStyle(drag, itemId),
    }),
    [drag, handlePointerDown, handlePointerMove, handlePointerUp],
  );

  return { drag, bind, isOver: (zoneId: string) => drag?.overZone === zoneId };
}

function dragStyle(drag: DragState | null, itemId: string): CSSProperties {
  if (drag?.itemId !== itemId) {
    return { touchAction: 'none', cursor: 'grab' };
  }
  return {
    touchAction: 'none',
    cursor: 'grabbing',
    transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)`,
    // Влаченият елемент не бива да закрива целта при търсенето ѝ.
    pointerEvents: 'none',
    position: 'relative',
  };
}
