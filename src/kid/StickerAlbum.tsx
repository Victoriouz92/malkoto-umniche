import { useNavigate } from 'react-router-dom';
import { Button, Cluster, Page, Stack, cx } from '@/design-system';
import { useApp, activeProfile } from '@/core/store/app';
import { useSessionClock } from '@/core/time/session';
import { t } from '@/i18n';
import s from './kid.module.css';

const COLS = 4;
const ROWS = 3;
const PIECES_PER_PUZZLE = COLS * ROWS;

const PUZZLE_ALBUM = [
  { src: '/hero-malkoto-umniche.png', title: 'Пандата и големият пъзел' },
  { src: '/slide-numbers-wide.png', title: 'Приключение край водопада' },
  { src: '/slide-reading-wide.png', title: 'Горската библиотека' },
  { src: '/slide-letters-wide.png', title: 'Вълшебните букви' },
] as const;

/** Всяка уникално завършена активност разкрива едно ново парче. */
export function StickerAlbum() {
  const navigate = useNavigate();
  const profile = useApp(activeProfile);
  const earned = profile?.stickers.length ?? 0;

  useSessionClock();

  return (
    <Page centered className={s.puzzleAlbumPage}>
      <Stack gap={6} className={s.puzzleAlbumContent}>
        <Cluster between>
          <Button variant="quiet" iconOnly glyph="←" aria-label={t('action.back')} onClick={() => navigate('/kid')} />
          <div className={s.albumHeading}>
            <img src="/icons/icon-192.png" alt="" aria-hidden="true" />
            <div><span>Малкото Умниче</span><h1>{t('kid.stickers.title')}</h1></div>
          </div>
          <span style={{ width: 'var(--tap)' }} aria-hidden="true" />
        </Cluster>

        <div className={s.albumIntro}>
          <strong>{earned} открити парчета</strong>
          <p>Всяка нова завършена игра разкрива част от следващата картина.</p>
        </div>

        <div className={s.puzzleGallery}>
          {PUZZLE_ALBUM.map((puzzle, puzzleIndex) => {
            const revealed = Math.max(0, Math.min(PIECES_PER_PUZZLE, earned - puzzleIndex * PIECES_PER_PUZZLE));
            const complete = revealed === PIECES_PER_PUZZLE;
            return (
              <article key={puzzle.src} className={cx(s.puzzleBoard, complete && s.puzzleComplete)}>
                <div className={s.puzzleMeta}>
                  <div><span>Картина {puzzleIndex + 1}</span><h2>{puzzle.title}</h2></div>
                  <strong>{complete ? 'Готова!' : `${revealed} / ${PIECES_PER_PUZZLE}`}</strong>
                </div>
                <div className={s.puzzlePieces} aria-label={`${revealed} от ${PIECES_PER_PUZZLE} открити парчета`}>
                  {Array.from({ length: PIECES_PER_PUZZLE }, (_, pieceIndex) => {
                    const row = Math.floor(pieceIndex / COLS);
                    const col = pieceIndex % COLS;
                    const visible = pieceIndex < revealed;
                    return (
                      <span
                        key={pieceIndex}
                        className={cx(s.puzzlePiece, visible && s.puzzlePieceVisible)}
                        style={visible ? {
                          backgroundImage: `url(${puzzle.src})`,
                          backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
                          backgroundPosition: `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`,
                        } : undefined}
                        aria-hidden="true"
                      >
                        {!visible ? '✦' : null}
                      </span>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </Stack>
    </Page>
  );
}
