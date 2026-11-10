import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel, t } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import { dropZone, useDrag } from '../shared/useDrag';
import type { EngineProps } from '../types';
import type { PuzzleParams } from './schema';
import s from '../shared/engine.module.css';
import p from './Engine.module.css';

function habitat(pieces: readonly string[]) {
  if (pieces.some((piece) => piece.startsWith('vehicle.'))) return 'station';
  if (pieces.some((piece) => piece.startsWith('food.'))) return 'orchard';
  if (pieces.includes('animal.whale')) return 'sea';
  if (pieces.includes('animal.fox')) return 'forest';
  if (pieces.includes('animal.cow')) return 'farm';
  return 'home';
}

/**
 * „Форма в отвор“.
 *
 * Отворите са силуети на самите предмети — филтър върху същата картинка,
 * без втори комплект графика.
 *
 * Като при сортирането, работят и влаченето, и тап-тап. На две години
 * второто е по-надеждното.
 *
 * Правила от каталога (m001): предмет, пуснат встрани, се връща; зоната се
 * приготвя, преди детето да е пуснало; няма време и няма провал.
 */
export function PuzzleEngine({ params, api, onComplete, onProgress }: EngineProps<PuzzleParams>) {
  const holes = useMemo(() => shuffle(params.pieces), [params.pieces]);

  const [placed, setPlaced] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  /**
   * Отвор, тапнат ПРЕДИ предмета. Детето не знае, че играта очаква
   * определен ред — а тап, който не прави нищо, изглежда като счупена игра.
   */
  const [armedHole, setArmedHole] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const hintsUsed = useRef(0);
  const finished = useRef(false);
  const nudgeTimer = useRef<number | undefined>();
  const pieceButtons = useRef(new Map<string, HTMLButtonElement>());
  const restoreFocus = useRef(false);

  useEffect(() => () => window.clearTimeout(nudgeTimer.current), []);

  const loose = params.pieces.filter((piece) => !placed.includes(piece));
  const nextPiece = loose[0];

  useEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    if (nextPiece) pieceButtons.current.get(nextPiece)?.focus();
  }, [nextPiece, placed.length]);

  useEffect(() => {
    onProgress(placed.length / params.pieces.length);
  }, [placed.length, params.pieces.length, onProgress]);

  useEffect(() => {
    if (finished.current || placed.length === 0 || placed.length !== params.pieces.length) return;
    finished.current = true;

    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      correct: params.pieces.length,
      attempts: attempts.current,
      hintsUsed: hintsUsed.current,
    });
  }, [placed.length, params.pieces.length, api, onComplete]);

  const tryPlace = (piece: string, hole: string, keyboard = false) => {
    if (placed.includes(piece) || placed.includes(hole)) return;
    attempts.current += 1;
    setSelected(null);
    setArmedHole(null);

    if (piece === hole) {
      restoreFocus.current = keyboard;
      if (hint === piece) setHint(null);
      api.sfx('snap');
      api.haptic('success');
      api.announce(assetLabel(piece));
      setPlaced((p) => [...p, piece]);
      return;
    }

    api.sfx('soften');
    api.announce(t('puzzle.tryAgain'));
    setNudging(piece);
    window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => setNudging(null), 440);
  };

  const { bind, isOver, drag } = useDrag({
    onPick: () => {
      api.sfx('pick');
      setSelected(null);
      setArmedHole(null);
    },
    onDrop: (piece, zoneId) => {
      if (zoneId === null) return;
      tryPlace(piece, zoneId);
    },
  });

  const scene = habitat(params.pieces);
  const showHint = () => {
    const piece = selected ?? armedHole ?? nextPiece;
    if (!piece || hint === piece) return;
    hintsUsed.current += 1;
    setHint(piece);
    api.announce(t('puzzle.hintMessage', { item: assetLabel(piece) }));
  };

  return (
    <div className={p.scene} data-habitat={scene}>
      <div className={p.landscape} aria-hidden="true">
        <svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMax slice">
          <circle cx="655" cy="78" r="59" className={p.sun} />
          <path d="M0 215Q130 111 280 215T580 204Q715 129 800 175V360H0Z" className={p.ridge} />
          <path d="M0 275Q176 210 352 271T800 242V360H0Z" className={p.ground} />
        </svg>
        <span className={p.scenery}>
          <Asset id={scene === 'station' ? 'vehicle.train' : scene === 'sea' ? 'animal.fish' : 'nature.flower'} size="100%" />
        </span>
      </div>
      <header className={p.guide}>
        <h2>{t(`puzzle.scene.${scene}`)}</h2>
        <p>{t('puzzle.instruction')}</p>
      </header>
      <div className={p.holes} role="group" aria-label={t('puzzle.holes')}>
        {holes.map((hole) => {
          const filled = placed.includes(hole);
          const revealed = hint === hole;
          return (
            <button
              key={hole}
              type="button"
              {...dropZone(hole)}
              className={cx(
                p.hole,
                (isOver(hole) || armedHole === hole) && p.chosen,
                filled && p.filled,
                revealed && p.revealed,
              )}
              disabled={filled}
              aria-label={t(filled ? 'puzzle.placed' : 'puzzle.hole', { item: assetLabel(hole) })}
              aria-pressed={!filled ? armedHole === hole : undefined}
              onClick={(event) => {
                if (selected) {
                  tryPlace(selected, hole, event.detail === 0);
                  return;
                }
                api.sfx('pick');
                setArmedHole(hole);
              }}
            >
              <Asset
                id={hole}
                size="100%"
                className={filled || revealed ? undefined : p.shadow}
              />
              {filled ? <span className={p.mark} aria-hidden="true">✓</span> : null}
              {revealed ? <span className={p.mark} aria-hidden="true">✦</span> : null}
            </button>
          );
        })}
      </div>

      <div className={p.pieces} role="group" aria-label={t('puzzle.pieces')}>
        {loose.map((piece) => {
          const dragProps = bind(piece, s.dragging);
          const isSelected = selected === piece && drag === null;

          return (
            <button
              key={piece}
              type="button"
              {...dragProps}
              ref={(node) => {
                if (node) pieceButtons.current.set(piece, node);
                else pieceButtons.current.delete(piece);
              }}
              className={cx(
                p.piece,
                dragProps.className,
                isSelected && p.chosen,
                hint === piece && p.revealed,
                nudging === piece && s.nudge,
              )}
              aria-label={assetLabel(piece)}
              aria-pressed={isSelected}
              onClick={(event) => {
                if (armedHole) {
                  tryPlace(piece, armedHole, event.detail === 0);
                  return;
                }
                api.sfx('pick');
                setSelected(piece);
              }}
            >
              <Asset id={piece} size="100%" />
              {hint === piece ? <span className={p.mark} aria-hidden="true">✦</span> : null}
            </button>
          );
        })}
      </div>
      <button type="button" className={p.hint} onClick={showHint}>
        <span aria-hidden="true">✦ </span>{t('puzzle.hint')}
      </button>
    </div>
  );
}
