import { useEffect, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import type { EngineProps } from '../types';
import { orderMatches } from './schema';
import type { ShoppingParams } from './schema';
import s from './Engine.module.css';

export function ShoppingEngine({ params, api, onProgress, onComplete }: EngineProps<ShoppingParams>) {
  const [round, setRound] = useState(0);
  const [basket, setBasket] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [listHidden, setListHidden] = useState(false);
  const hints = useRef(0);
  const attempts = useRef(0), started = useRef(Date.now()), locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const order = params.orders[round]!;
  useEffect(() => onProgress(round / params.orders.length), [round, params.orders.length, onProgress]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function checkout() {
    if (locked.current || (params.rememberList && !listHidden)) return;
    attempts.current++;
    if (!orderMatches(order, basket)) {
      setMessage('Сравни кошницата със списъка. Докосни продукт в кошницата, за да го върнеш.');
      api.sfx('soften');
      return;
    }
    locked.current = true;
    setReady(true);
    setMessage('Всичко е точно!');
    api.sfx('correct');
    timer.current = setTimeout(() => {
      if (round + 1 === params.orders.length) {
        api.celebrate();
        onComplete({ completed: true, durationMs: Date.now() - started.current,
          correct: params.orders.length, attempts: attempts.current, hintsUsed: hints.current });
      } else {
        setRound(round + 1); setBasket([]); setReady(false); setListHidden(false); setMessage(''); locked.current = false;
      }
    }, 1400);
  }
  return <div className={s.shop}>
    <span className={s.eyebrow}>МАЛКИЯТ ПАЗАР · {round + 1} / {params.orders.length}</span>
    <h2>{order.title}</h2>
    <p>{params.rememberList ? 'Запомни продуктите и количествата. Скрий списъка и пазарувай по памет.' : 'Погледни списъка и напълни кошницата с точните количества.'}</p>
    {(!params.rememberList || !listHidden) && <div className={s.list} aria-label="Списък за пазаруване">
      {order.items.map(item => <div key={item.asset} className={s.listItem}>
        <Asset id={item.asset} size={48} /><strong>{item.count} × {assetLabel(item.asset)}</strong>
        <span aria-label={`${item.count} броя`}>{Array.from({ length: item.count }, (_, i) => <i key={i} />)}</span>
      </div>)}
    </div>}
    {params.rememberList && <button type="button" disabled={ready} onClick={() => {
      if (listHidden) hints.current++;
      setListHidden(!listHidden);
    }}>{listHidden ? 'Покажи списъка отново' : 'Запомних — скрий списъка'}</button>}
    <div className={s.shelf} role="group" aria-label="Продукти на пазара">
      {params.shelf.map(asset => <button key={asset} type="button" aria-label={`Добави ${assetLabel(asset)}`}
        disabled={ready || (params.rememberList && !listHidden) || basket.length >= 18} onClick={() => { setBasket(items => [...items, asset]); api.sfx('pick'); }}>
        <Asset id={asset} size={60} /><span>{assetLabel(asset)}</span>
      </button>)}
    </div>
    <div className={s.basket} data-ready={ready} role="group" aria-label="Твоята кошница">
      {basket.length === 0 ? <span>Твоята кошница е тук</span> : basket.map((asset, i) =>
        <button type="button" key={i} disabled={ready} aria-label={`Върни ${assetLabel(asset)}`}
          onClick={() => { setBasket(items => items.filter((_, index) => index !== i)); api.sfx('tap'); }}>
          <Asset id={asset} size={42} /><span aria-hidden="true">−</span>
        </button>)}
    </div>
    <p className={s.message} role="status">{message || 'Можеш да върнеш продукт с едно докосване.'}</p>
    <button className={s.checkout} type="button" disabled={ready || !basket.length || (params.rememberList && !listHidden)} onClick={checkout}>
      {ready ? '✓ Кошницата е готова' : 'Провери кошницата'}
    </button>
  </div>;
}
