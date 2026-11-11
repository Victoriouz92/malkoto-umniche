import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { soundUrl } from '@/assets/registry';
import { assetLabel, t } from '@/i18n';
import { cx } from '@/design-system';
import { shuffle } from '../shared/random';
import { variantRandom } from '../shared/variant';
import { soundMatchVariant } from './variants';
import type { EngineProps } from '../types';
import type { SoundMatchParams } from './schema';
import s from '../shared/engine.module.css';
import m from './Engine.module.css';

/**
 * „Кой издава този звук“.
 *
 * Правила от каталога (m085):
 *   • звукът може да се чуе ПАК, неограничено — без наказание за слушане
 *   • при верен избор животното се раздвижва и звукът се повтаря
 *   • картинките са едри и добре раздалечени
 *
 * Записът се пуска през `<audio>`, не през синтезатора: това е единственото
 * в продукта, което не може да се синтезира.
 */
export function SoundMatchEngine({
  params: authored,
  activity,
  variant,
  api,
  onComplete,
  onProgress,
}: EngineProps<SoundMatchParams>) {
  // Вариантът се строи ТУК, а не в обвивката: само двигателят знае кое в
  // неговите параметри може да се смени, без задачата да стане друга.
  const params = useMemo(
    () =>
      variant === 0
        ? authored
        : soundMatchVariant(authored, variantRandom(activity.id, variant)),
    [authored, activity.id, variant],
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimer = useRef<number>();
  const transitionTimer = useRef<number>();
  const playbackAllowed = useRef(!document.hidden);
  const startedAt = useRef(Date.now());
  const attempts = useRef(0);
  const correct = useRef(0);
  const finished = useRef(false);

  const round = params.rounds[roundIndex];

  /** Разбъркваме, за да не стои верният винаги на едно място. */
  const [choices, setChoices] = useState<string[]>(() => (round ? shuffle(round.choices) : []));

  const play = useCallback(() => {
    if (!playbackAllowed.current || document.hidden) return;
    const url = round ? soundUrl(round.sound) : null;
    if (!url) return;

    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlaying(true);
    const stopped = () => {
      if (audioRef.current === audio) setPlaying(false);
    };
    audio.addEventListener('ended', stopped, { once: true });
    audio.addEventListener('error', stopped, { once: true });
    void audio.play().catch(stopped);
  }, [round]);

  useEffect(() => {
    if (!round) return;
    setChoices(shuffle(round.choices));
    if (params.autoPlay) {
      // Малко закъснение: рундът трябва да се появи, преди да звучи.
      playbackTimer.current = window.setTimeout(play, 450);
    }
    return () => window.clearTimeout(playbackTimer.current);
  }, [roundIndex, round, params.autoPlay, play]);

  useEffect(() => {
    const stop = () => {
      window.clearTimeout(playbackTimer.current);
      audioRef.current?.pause();
      setPlaying(false);
    };
    const onBlur = () => {
      playbackAllowed.current = false;
      stop();
    };
    const onFocus = () => {
      playbackAllowed.current = !document.hidden;
    };
    const onVisibility = () => {
      playbackAllowed.current = !document.hidden && document.hasFocus();
      if (!playbackAllowed.current) stop();
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(playbackTimer.current);
      window.clearTimeout(transitionTimer.current);
      audioRef.current?.pause();
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    onProgress(roundIndex / params.rounds.length);
  }, [roundIndex, params.rounds.length, onProgress]);

  if (!round) return null;

  const pick = (choice: string) => {
    if (answered) return;
    attempts.current += 1;

    if (choice !== round.sound) {
      api.sfx('soften');
      // Пускаме звука пак: грешката значи „чуй още веднъж“, не „сгреши“.
      window.clearTimeout(playbackTimer.current);
      playbackTimer.current = window.setTimeout(play, 300);
      return;
    }

    correct.current += 1;
    window.clearTimeout(playbackTimer.current);
    setAnswered(choice);
    api.sfx('correct');
    api.haptic('success');
    api.announce(assetLabel(choice));

    transitionTimer.current = window.setTimeout(() => {
      const next = roundIndex + 1;
      if (next >= params.rounds.length) {
        if (finished.current) return;
        finished.current = true;
        api.sfx('complete');
        api.celebrate();
        onComplete({
          completed: true,
          durationMs: Date.now() - startedAt.current,
          correct: correct.current,
          attempts: attempts.current,
          hintsUsed: 0,
        });
        return;
      }
      setRoundIndex(next);
      setAnswered(null);
    }, 1500);
  };

  return (
    <div className={s.stage}>
      <button
        type="button"
        className={cx(m.speaker, playing && m.playing)}
        onClick={play}
        aria-label={t('action.listen')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="M4 9h4l5-4v14l-5-4H4z" strokeLinejoin="round" />
          <path d="M17 8a5 5 0 0 1 0 8" strokeLinecap="round" />
          <path d="M20 5a9 9 0 0 1 0 14" strokeLinecap="round" />
        </svg>
      </button>

      <p className={m.hint}>{t('action.listen')}</p>

      <div className={s.row}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={cx(
              s.item,
              answered === choice && m.right,
              answered !== null && answered !== choice && m.dimmed,
            )}
            aria-label={assetLabel(choice)}
            onClick={() => pick(choice)}
          >
            <Asset id={choice} size="100%" />
          </button>
        ))}
      </div>
    </div>
  );
}
