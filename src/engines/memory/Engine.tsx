import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import type { EngineProps } from '../types';
import type { MemoryParams } from './schema';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

type Card = { key: string; asset: string };

/**
 * „Обърни двойките“.
 *
 * Правила от каталога (m009), които са задължителни, не украса:
 *   • несъвпадналите карти се обръщат обратно СЛЕД ПАУЗА, не веднага
 *   • съвпадналите остават отворени и избледняват — нищо не изчезва
 *   • няма брояч на ходовете и няма ограничение във времето
 */
export function MemoryEngine({ params, api, onComplete, onProgress }: EngineProps<MemoryParams>) {
  const cards = useMemo<Card[]>(
    () =>
      shuffle(
        params.items.flatMap((asset, i) => [
          { key: `${asset}-a-${i}`, asset },
          { key: `${asset}-b-${i}`, asset },
        ]),
      ),
    [params.items],
  );

  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const finished = useRef(false);

  const columns = cards.length <= 4 ? 2 : cards.length <= 8 ? 4 : cards.length <= 12 ? 4 : 6;
  const pairsFound = matched.length / 2;

  useEffect(() => {
    onProgress(pairsFound / params.items.length);
  }, [pairsFound, params.items.length, onProgress]);

  useEffect(() => {
    if (open.length !== 2) return;

    const [first, second] = open;
    const a = cards.find((c) => c.key === first);
    const b = cards.find((c) => c.key === second);
    attempts.current += 1;
    setLocked(true);

    if (a && b && a.asset === b.asset) {
      api.sfx('correct');
      api.haptic('success');
      api.announce(assetLabel(a.asset));
      setMatched((m) => [...m, a.key, b.key]);
      setOpen([]);
      setLocked(false);
      return;
    }

    // Пауза, за да успее детето да погледне, после меко обръщане назад.
    const flipDelay = api.ageBand === 'toddler' ? Math.min(params.flipBackMs, 1300) : Math.min(params.flipBackMs, 850);
    const id = window.setTimeout(() => {
      api.sfx('soften');
      setOpen([]);
      setLocked(false);
    }, flipDelay);

    return () => window.clearTimeout(id);
  }, [open, cards, api, params.flipBackMs]);

  useEffect(() => {
    if (finished.current || matched.length === 0 || matched.length !== cards.length) return;
    finished.current = true;

    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      correct: params.items.length,
      attempts: attempts.current,
      hintsUsed: 0,
    });
  }, [matched.length, cards.length, api, onComplete, params.items.length]);

  const flip = (card: Card) => {
    if (locked || open.includes(card.key) || matched.includes(card.key)) return;
    api.sfx('tap');
    setOpen((current) => (current.length < 2 ? [...current, card.key] : current));
  };

  return (
    <div className={shared.stage}>
      <div className={s.board} style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}>
        {cards.map((card) => {
          const isOpen = open.includes(card.key) || matched.includes(card.key);
          const isMatched = matched.includes(card.key);

          return (
            <button
              key={card.key}
              type="button"
              className={cx(s.card, isOpen && s.cardOpen, isMatched && s.matched)}
              onClick={() => flip(card)}
              aria-label={isOpen ? assetLabel(card.asset) : 'скрита карта'}
              aria-pressed={isOpen}
            >
              {isMatched ? (
                <span className={s.completedFace}>
                  <Asset id={card.asset} size="100%" />
                  <span className={s.check} aria-hidden="true">✓</span>
                </span>
              ) : (
                <>
                  <span className={cx(s.face, s.back)} aria-hidden="true">
                    ?
                  </span>
                  <span className={cx(s.face, s.front)}>
                    <Asset id={card.asset} size="100%" />
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
