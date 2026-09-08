/**
 * Имената на формите и цветовете — БЕЗ React.
 *
 * Схемите на двигателите ги внасят, а те се четат от Node във валидатора.
 * Рисуването на самата форма живее в `Shape.tsx`.
 */

export const SHAPES = [
  'circle',
  'square',
  'triangle',
  'rectangle',
  'oval',
  'diamond',
  'star',
  'heart',
  'pentagon',
  'hexagon',
] as const;

export type ShapeName = (typeof SHAPES)[number];

/** Цветовете идват от палитрата на моливите — същите, които детето познава. */
export const SHAPE_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'brown',
  'grey',
] as const;

export type ShapeColor = (typeof SHAPE_COLORS)[number];

export const SHAPE_LABEL: Record<ShapeName, string> = {
  circle: 'кръг',
  square: 'квадрат',
  triangle: 'триъгълник',
  rectangle: 'правоъгълник',
  oval: 'овал',
  diamond: 'ромб',
  star: 'звезда',
  heart: 'сърце',
  pentagon: 'петоъгълник',
  hexagon: 'шестоъгълник',
};

export const COLOR_LABEL: Record<ShapeColor, string> = {
  red: 'червено',
  orange: 'оранжево',
  yellow: 'жълто',
  green: 'зелено',
  teal: 'синьо-зелено',
  blue: 'синьо',
  purple: 'лилаво',
  pink: 'розово',
  brown: 'кафяво',
  grey: 'сиво',
};

export function shapeLabel(shape: ShapeName, color: ShapeColor): string {
  return `${SHAPE_LABEL[shape]}, ${COLOR_LABEL[color]}`;
}
