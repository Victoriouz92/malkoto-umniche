import { z } from 'zod';
import { SHAPES, SHAPE_COLORS } from './shapeNames';

/**
 * Едно „нещо“ на екрана — само схемата и чистите помощници.
 *
 * Половината механики (шарки, кое не си пасва, подреждане, сравняване)
 * работят еднакво добре с картинка и с геометрична форма. Вместо два
 * двигателя за всяка, има един тип, който е и двете.
 *
 * ВАЖНО: този файл НЕ внася React, DOM или i18n. Валидаторът в
 * `npm run check` го чете от Node през схемите на двигателите. Рисуването
 * и надписите живеят в `TokenView.tsx`.
 */
export const tokenSchema = z.union([
  z.object({
    kind: z.literal('asset'),
    id: z.string().min(1),
    /** Мащаб 0.3–1 — за задачи по големина. */
    scale: z.number().min(0.3).max(1).default(1),
  }),
  z.object({
    kind: z.literal('shape'),
    shape: z.enum(SHAPES),
    color: z.enum(SHAPE_COLORS),
    scale: z.number().min(0.3).max(1).default(1),
  }),
]);

export type Token = z.infer<typeof tokenSchema>;

/** Две неща са еднакви, ако изглеждат еднакво — това вижда детето. */
export function sameToken(a: Token, b: Token): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'asset' && b.kind === 'asset') return a.id === b.id && a.scale === b.scale;
  if (a.kind === 'shape' && b.kind === 'shape') {
    return a.shape === b.shape && a.color === b.color && a.scale === b.scale;
  }
  return false;
}

export function tokenKey(token: Token, index: number): string {
  return token.kind === 'asset'
    ? `a:${token.id}:${token.scale}:${index}`
    : `s:${token.shape}:${token.color}:${token.scale}:${index}`;
}
