import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import { Button } from './Button';
import s from './Form.module.css';

/**
 * Формови примитиви за родителския панел.
 *
 * Правило, което важи за всички: избраното състояние никога не се носи
 * само от цвят. Ключето мести палеца, чипът показва отметка.
 */

// ── Обвивка на поле ──────────────────────────────────────────────

type FieldProps = {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className={s.field}>
      <span className={s.label}>{label}</span>
      {children}
      {error ? <span className={s.error}>{error}</span> : null}
      {!error && hint ? <span className={s.hint}>{hint}</span> : null}
    </div>
  );
}

// ── Текстово поле ────────────────────────────────────────────────

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
};

export function TextInput({ label, hint, error, ...rest }: TextInputProps) {
  const id = useId();
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={s.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        {...rest}
      />
      {error ? (
        <span id={`${id}-note`} className={s.error}>
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-note`} className={s.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

// ── Ключе ────────────────────────────────────────────────────────

type ToggleProps = {
  label: string;
  hint?: string | undefined;
  checked: boolean;
  onChange: (next: boolean) => void;
};

export function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={s.toggleRow}
      onClick={() => onChange(!checked)}
    >
      <span className={s.toggleText}>
        <span className={s.label}>{label}</span>
        {hint ? <span className={s.hint}>{hint}</span> : null}
      </span>
      <span className={cx(s.track, checked && s.trackOn)} aria-hidden="true">
        <span className={s.thumb} />
      </span>
    </button>
  );
}

// ── Брояч ────────────────────────────────────────────────────────

type StepperProps = {
  label: string;
  hint?: string | undefined;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Как се изписва стойността, напр. „30 минути“. */
  format?: (value: number) => string;
  onChange: (next: number) => void;
};

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const shown = format ? format(value) : String(value);

  return (
    <Field label={label} hint={hint}>
      <div className={s.stepper}>
        <Button
          variant="soft"
          size="sm"
          iconOnly
          glyph="−"
          aria-label={`Намали: ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        />
        <output className={s.stepperValue} aria-live="polite">
          {shown}
        </output>
        <Button
          variant="soft"
          size="sm"
          iconOnly
          glyph="+"
          aria-label={`Увеличи: ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
        />
      </div>
    </Field>
  );
}

// ── Чипове ───────────────────────────────────────────────────────

type ChipsProps<T extends string> = {
  label: string;
  hint?: string | undefined;
  options: readonly T[];
  selected: readonly T[];
  labelFor: (value: T) => string;
  onToggle: (value: T) => void;
};

export function Chips<T extends string>({
  label,
  hint,
  options,
  selected,
  labelFor,
  onToggle,
}: ChipsProps<T>) {
  return (
    <Field label={label} hint={hint}>
      <div className={s.chips} role="group" aria-label={label}>
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              className={cx(s.chip, on && s.chipOn)}
              onClick={() => onToggle(option)}
            >
              {on ? (
                <span className={s.chipMark} aria-hidden="true">
                  ✓
                </span>
              ) : null}
              {labelFor(option)}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
