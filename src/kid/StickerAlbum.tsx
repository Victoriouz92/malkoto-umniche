import { useNavigate } from 'react-router-dom';
import { Button, Cluster, Page, Stack, cx } from '@/design-system';
import { useApp, activeProfile } from '@/core/store/app';
import { useSessionClock } from '@/core/time/session';
import { t } from '@/i18n';
import { SoftStop } from './SoftStop';
import { PageArtwork } from '@/artwork/PageArtwork';
import s from './kid.module.css';

const COLS = 4;
const ROWS = 3;
const PIECES_PER_PUZZLE = COLS * ROWS;

const PUZZLE_ALBUM = [
  { src: '/page-art/album-garden-600.webp', title: 'Градината на приятелите' },
  { src: '/page-art/album-stream-600.webp', title: 'Приключение по поточето' },
  { src: '/page-art/album-clouds-600.webp', title: 'Над пухкавите облаци' },
  { src: '/page-art/album-lanterns-600.webp', title: 'Вечерта на фенерите' },
] as const;

/** Всяка уникално завършена активност разкрива едно ново парче. */
export function StickerAlbum() {
  const navigate = useNavigate();
  const profile = useApp(activeProfile);
  const earned = profile?.stickers.length ?? 0;

  useSessionClock();

  return (
    <Page centered className={s.puzzleAlbumPage}>
      <SoftStop />
      <Stack gap={6} className={s.puzzleAlbumContent}>
        <Cluster between>
          <Button variant="quiet" iconOnly glyph="←" aria-label={t('action.back')} onClick={() => void navigate('/kid')} />
          <div className={s.albumHeading}>
            <img src="/icons/icon-192.webp" alt="" aria-hidden="true" />
            <div><span>Малкото Умниче</span><h1>{t('kid.stickers.title')}</h1></div>
          </div>
          <span style={{ width: 'var(--tap)' }} aria-hidden="true" />
        </Cluster>

        <div className={s.albumIntro}>
          <PageArtwork scene="album" className={s.albumScene} />
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
