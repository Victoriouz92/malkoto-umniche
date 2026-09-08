import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { Shape } from './Shape';
import type { Token } from './token';

/**
 * Рисуването на един токен.
 *
 * Отделено от `token.ts` нарочно: схемата се чете от Node във валидатора, а
 * този файл влачи React, картинките и речника. В един файл валидаторът
 * спира да работи.
 */
export function TokenView({ token, size = '100%' }: { token: Token; size?: number | string }) {
  const inner =
    token.kind === 'asset' ? (
      <Asset id={token.id} size={size} label={assetLabel(token.id)} />
    ) : (
      <Shape shape={token.shape} color={token.color} size={size} />
    );

  if (token.scale === 1) return inner;

  // Мащабът се прилага тук, а не в двата вида поотделно: така „по-малката
  // крава“ и „по-малкият кръг“ се смаляват по един и същ начин и редицата
  // остава подравнена.
  return (
    <span
      style={{
        display: 'grid',
        placeItems: 'center',
        width: '100%',
        height: '100%',
        transform: `scale(${token.scale})`,
      }}
    >
      {inner}
    </span>
  );
}
