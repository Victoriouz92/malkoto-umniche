import { assetLabel } from '@/i18n';
import { shapeLabel } from './shapeNames';
import type { Token } from './token';

/**
 * Надписът на един токен — за екранни четци и подсказки.
 *
 * Отделен от `TokenView.tsx`, за да остане онзи файл само с компоненти:
 * иначе Fast Refresh спира да работи и всяка промяна презарежда екрана.
 */
export function tokenLabel(token: Token): string {
  return token.kind === 'asset' ? assetLabel(token.id) : shapeLabel(token.shape, token.color);
}
