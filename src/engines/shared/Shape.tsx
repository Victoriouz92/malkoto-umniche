import { useMemo } from 'react';
import { SHAPE_LABEL, COLOR_LABEL } from './shapeNames';
import type { ShapeColor, ShapeName } from './shapeNames';

/**
 * Геометричните форми се ИЗЧИСЛЯВАТ, не се рисуват.
 *
 * Обещанието от docs/ASSETS.md: кръг, квадрат, триъгълник, звезда и сърце
 * не са графика, която някой трябва да направи. Те са математика — идеално
 * точни, безплатни и в произволен цвят.
 */

/** Правилен многоъгълник, върхът нагоре. */
function polygon(sides: number, radius = 44, cx = 50, cy = 50): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }
  return points.join(' ');
}

function star(points = 5, outer = 46, inner = 20, cx = 50, cy = 50): string {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    out.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`);
  }
  return out.join(' ');
}

const HEART =
  'M50 86 C 20 64, 8 44, 8 30 C 8 16, 19 8, 30 8 C 39 8, 46 14, 50 22 ' +
  'C 54 14, 61 8, 70 8 C 81 8, 92 16, 92 30 C 92 44, 80 64, 50 86 Z';

type Props = {
  shape: ShapeName;
  color: ShapeColor;
  size?: number | string;
  className?: string | undefined;
};

export function Shape({ shape, color, size = '100%', className }: Props) {
  const body = useMemo(() => {
    const fill = `var(--crayon-${color})`;
    switch (shape) {
      case 'circle':
        return <circle cx="50" cy="50" r="44" fill={fill} />;
      case 'square':
        return <rect x="8" y="8" width="84" height="84" rx="10" fill={fill} />;
      case 'rectangle':
        return <rect x="4" y="22" width="92" height="56" rx="10" fill={fill} />;
      case 'oval':
        return <ellipse cx="50" cy="50" rx="46" ry="30" fill={fill} />;
      case 'triangle':
        return <polygon points={polygon(3)} fill={fill} />;
      case 'diamond':
        return <polygon points={polygon(4)} fill={fill} />;
      case 'pentagon':
        return <polygon points={polygon(5)} fill={fill} />;
      case 'hexagon':
        return <polygon points={polygon(6)} fill={fill} />;
      case 'star':
        return <polygon points={star()} fill={fill} />;
      case 'heart':
        return <path d={HEART} fill={fill} />;
    }
  }, [shape, color]);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${SHAPE_LABEL[shape]}, ${COLOR_LABEL[color]}`}
    >
      {body}
    </svg>
  );
}
