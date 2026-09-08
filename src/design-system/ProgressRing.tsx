import { useId } from 'react';

type Props = {
  /** 0–1. Стойности извън диапазона се притискат. */
  value: number;
  size?: number;
  thickness?: number;
  /** CSS цвят или var(). По подразбиране вторичният цвят. */
  color?: string;
  trackColor?: string;
  /** Достъпен надпис. Ако липсва, пръстенът е чисто декоративен. */
  label?: string;
  children?: React.ReactNode;
};

/**
 * Пръстен на прогреса.
 *
 * Използва се и за напредъка в активност, и за оставащото време в сесия.
 * И в двата случая пръстенът се ПЪЛНИ — никога не се изпразва. Празнеещ
 * пръстен пред 4-годишно е таймер за тревога (принцип 4 и 5 от PLAN.md).
 */
export function ProgressRing({
  value,
  size = 64,
  thickness = 8,
  color = 'var(--c-secondary)',
  trackColor = 'var(--c-surface-3)',
  label,
  children,
}: Props) {
  const id = useId();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flex: 'none' }}
      role={label ? 'progressbar' : undefined}
      aria-valuenow={label ? Math.round(clamped * 100) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={thickness}
        />
        <circle
          id={id}
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset var(--dur-slow) var(--ease-out)' }}
        />
      </svg>
      {children ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
