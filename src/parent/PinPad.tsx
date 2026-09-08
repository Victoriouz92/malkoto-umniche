import { useEffect, useRef, useState } from 'react';
import { cx } from '@/design-system';
import { playEffect } from '@/core/audio';
import s from './PinPad.module.css';

type Props = {
  /** Извиква се, щом се съберат четири цифри. */
  onComplete: (pin: string) => void;
  /** Вдига разтърсване и изчиства въведеното. Брояч, не булево. */
  shakeSignal?: number;
  disabled?: boolean;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const PIN_LENGTH = 4;

/**
 * Четирицифрена клавиатура.
 *
 * Собствена, не `<input type="password">`: на телефон системната клавиатура
 * закрива половин екран и връща букви. Четири едри бутона са и по-бързи за
 * родител, който държи детето с другата ръка.
 */
export function PinPad({ onComplete, shakeSignal = 0, disabled = false }: Props) {
  const [value, setValue] = useState('');
  const [shaking, setShaking] = useState(false);

  /**
   * Подаването става ТОЧНО ВЕДНЪЖ за всяко попълване.
   *
   * Без пазача ефектът се презадейства при всяка смяна на `onComplete` —
   * а тя се сменя на всяка крачка от потока. Резултатът беше, че първите
   * четири цифри влизаха и като PIN, и като потвърждение, тоест
   * потвърждаването се прескачаше и сгрешен PIN минаваше безшумно.
   */
  const submitted = useRef(false);


  useEffect(() => {
    if (shakeSignal === 0) return;
    setValue('');
    submitted.current = false;
    setShaking(true);
    const id = window.setTimeout(() => setShaking(false), 400);
    return () => window.clearTimeout(id);
  }, [shakeSignal]);

  useEffect(() => {
    if (value.length !== PIN_LENGTH || submitted.current) return;
    submitted.current = true;

    // Изчакваме кадър, за да се види попълнената четвърта точка.
    const id = window.setTimeout(() => {
      onComplete(value);
      setValue('');
      submitted.current = false;
    }, 140);

    return () => window.clearTimeout(id);
  }, [value, onComplete]);

  const press = (digit: string) => {
    if (disabled || value.length >= PIN_LENGTH) return;
    playEffect('tap');
    setValue((v) => v + digit);
  };

  const back = () => {
    if (disabled) return;
    playEffect('soften');
    setValue((v) => v.slice(0, -1));
  };

  // Физическата клавиатура върши същото — родител на лаптоп не бива да
  // е принуден да мери с мишката.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div>
      <div className={cx(s.dots, shaking && s.shake)} aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={cx(s.dot, i < value.length && s.dotFilled)} />
        ))}
      </div>

      <div className={s.pad}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={s.key}
            disabled={disabled}
            onClick={() => press(key)}
          >
            {key}
          </button>
        ))}
        <span />
        <button type="button" className={s.key} disabled={disabled} onClick={() => press('0')}>
          0
        </button>
        <button
          type="button"
          className={cx(s.key, s.wide)}
          disabled={disabled || value.length === 0}
          aria-label="Изтрий последната цифра"
          onClick={back}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
