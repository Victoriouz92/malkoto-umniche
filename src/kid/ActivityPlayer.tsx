import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Confetti, ProgressRing, Stack, cx } from '@/design-system';
import { Asset } from '@/assets/Asset';
import { ACTIVITIES, activityById } from '@/content/registry';
import { sameSessionFamily } from '@/content/categoryIdentity';
import type { Activity } from '@/content/schema/activity';
import { ageLabel, allowedAgeRange, isActivityAllowed } from '@/content/ageAccess';
import { engineModule } from '@/engines/registry';
import { schemaFor } from '@/engines/schemas';
import type { ActivityResult } from '@/engines/types';
import { useEngineApi } from '@/core/engineApi';
import { activeProfile, useApp } from '@/core/store/app';
import { scoreFromResult, targetFor } from '@/core/adaptive/difficulty';
import { playEffect } from '@/core/audio';
import { useSessionClock } from '@/core/time/session';
import { praise, t } from '@/i18n';
import { SoftStop } from './SoftStop';
import s from './ActivityPlayer.module.css';
import '@/engines/shared/playful.css';

/**
 * Една карта от каталога отваря кратка игрова сесия, а не единичен въпрос.
 * По-тежките двигатели са в два кръга; бързите — в три. Свободните дейности
 * нямат изкуствен край и затова остават самостоятелни.
 */
/**
 * Колко РАЗЛИЧНИ кръга може да даде една активност сама по себе си.
 *
 * За тези двигатели серията не зависи от това дали в каталога има съседни
 * карти: когато няма, кръговете се допълват с варианти на самата активност.
 * Точно това спасява групите с една-единствена активност — памет за
 * животни, шарки с животни и още седем такива.
 *
 * Числото не е пожелание. Подреждането по големина има точно две посоки и
 * трети вариант би повторил първия; броенето и шарките имат повече. Ако тук
 * пише повече, отколкото двигателят може, детето получава същата задача два
 * пъти в един и същ сеанс.
 */
const VARIANT_DEPTH: Readonly<Record<string, number>> = {
  counting: 6,
  compare: 4,
  letters: 4,
  pattern: 8,
  sequencing: 2,
  sorting: 4,
  'sound-match': 4,
  // Паметта няма `variants.ts` и не ѝ трябва: дъската се разбърква наново
  // при всяко пускане, а дъската Е задачата. Числото тук само разрешава
  // втори кръг върху същите картинки — точно както се преиграва памет.
  memory: 3,
};

const SESSION_ROUNDS_BY_ENGINE: Readonly<Record<string, number>> = {
  counting: 3,
  letters: 3,
  compare: 3,
  math: 3,
  'odd-one-out': 3,
  pattern: 3,
  sequencing: 3,
  'sound-match': 3,
  memory: 2,
  matching: 2,
  sorting: 2,
  puzzle: 2,
  maze: 2,
  'spot-difference': 2,
  tracing: 2,
  'connect-dots': 2,
  'shape-builder': 2,
  words: 2,
};

/** Един кръг от серията: коя активност и кой неин вариант. */
type SeriesRound = { activity: Activity; variant: number };

/** Колко дълго стои преходът между два кръга. Достатъчно, за да се забележи. */
const ROUND_BREAK_MS = 1100;

/** Спокойни илюстрации по ръбовете — фон, а не част от задачата. */
const FALLBACK_DECOR = ['animal.bear', 'animal.dog', 'nature.flower', 'nature.cloud'] as const;
const CATEGORY_DECOR: Readonly<Record<string, readonly string[]>> = {
  numbers: ['nature.flower', 'food.apple', 'nature.mushroom', 'nature.sun'],
  letters: ['animal.owl', 'nature.flower', 'nature.cloud', 'nature.leaf'],
  memory: ['animal.bear', 'animal.dog', 'nature.flower', 'nature.cloud'],
  puzzles: ['animal.dog', 'animal.bear', 'nature.flower', 'nature.cloud'],
  colors: ['nature.flower', 'animal.duck', 'food.strawberry', 'nature.sun'],
  shapes: ['animal.bear', 'nature.flower', 'nature.cloud', 'nature.mushroom'],
  animals: ['animal.bear', 'animal.dog', 'nature.flower', 'nature.leaf'],
  vehicles: ['vehicle.car', 'vehicle.airplane', 'nature.cloud', 'nature.sun'],
  food: ['food.apple', 'food.strawberry', 'nature.flower', 'food.pear'],
};

/**
 * Обвивката около всяка активност — T4.4.
 *
 * Двигателят се занимава само с играта. Всичко останало живее тук:
 * зареждане, валидация на параметрите, прогрес, изход, празнуване, стикер,
 * записване на резултата и бележката за родителя.
 *
 * Така двайсетте двигателя остават прости, а промяна в края на активността
 * се прави на едно място, не двайсет пъти.
 */
/**
 * Различна активност е РАЗЛИЧНО нещо, не същото с нови параметри.
 *
 * Без този ключ React Router преизползва същия компонент при смяна на
 * `:activityId` — и екранът „готово“ от предишната активност остава да
 * виси върху новата.
 */
export function ActivityPlayer() {
  const { activityId } = useParams<{ activityId: string }>();
  return <ActivityScreen key={activityId} />;
}

function ActivityScreen() {
  const navigate = useNavigate();
  const { activityId } = useParams<{ activityId: string }>();
  const activity = activityId ? activityById(activityId) : null;

  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ActivityResult | null>(null);
  const [shots, setShots] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('');
  const [round, setRound] = useState(1);
  /** Номерът на кръга, който предстои, докато тече преходът между кръговете. */
  const [pendingRound, setPendingRound] = useState<number | null>(null);
  /** Кое поред минаване е това. Всяко „Играй пак“ дава нови варианти. */
  const [pass, setPass] = useState(0);
  const accumulated = useRef<ActivityResult>({
    completed: true,
    durationMs: 0,
    correct: 0,
    attempts: 0,
    hintsUsed: 0,
  });

  const soundOn = useApp((st) => st.settings.sound);
  const profile = useApp(activeProfile);
  const filter = useApp((st) => st.settings.filter);
  const updateSettings = useApp((st) => st.updateSettings);
  const recordCompletion = useApp((st) => st.recordCompletion);
  const awardSticker = useApp((st) => st.awardSticker);
  const stickerGiven = useRef(false);

  useSessionClock();

  const celebrate = useCallback(() => {
    setShots((n) => n + 1);
    setMessage(praise());
  }, []);

  /**
   * Двигателят празнува в края на СВОЯ кръг, без да знае за серията.
   * Обвивката знае — и затова тя решава кога празнуването е истинско.
   */
  const finalRound = useRef(true);
  const isFinalRound = useCallback(() => finalRound.current, []);

  const api = useEngineApi({
    noFail: activity?.noFail ?? true,
    onCelebrate: celebrate,
    isFinalRound,
  });
  const ageRange = allowedAgeRange(profile, filter);
  const { min: allowedMin, max: allowedMax } = ageRange;
  const series = useMemo<SeriesRound[]>(() => {
    if (!activity) return [];
    const desiredRounds = SESSION_ROUNDS_BY_ENGINE[activity.engine] ?? 1;
    // Recall games contain three complete tasks; do not append pair-matching rounds.
    if (activity.engine === 'memory' && activity.params.mode && activity.params.mode !== 'pairs') {
      return [{ activity, variant: pass }];
    }
    if (desiredRounds === 1) return [{ activity, variant: pass }];

    /**
     * В една кратка сесия трудността може да се вдигне най-много с една
     * степен. Адаптивното ниво решава дали изобщо да направим тази крачка.
     * Така увереното дете получава леко предизвикателство, а останалите
     * упражняват същото ниво, без внезапен скок.
     */
    const adaptiveTarget = profile ? targetFor(profile, activity.skills) : activity.difficulty;
    const sessionCeiling = Math.max(
      activity.difficulty,
      Math.min(activity.difficulty + 1, adaptiveTarget),
    );

    const byProgression = (left: Activity, right: Activity) =>
      Math.abs(left.difficulty - sessionCeiling) -
        Math.abs(right.difficulty - sessionCeiling) || right.difficulty - left.difficulty;

    const candidates = ACTIVITIES.filter(
      (candidate) =>
        candidate.id !== activity.id &&
        sameSessionFamily(activity, candidate) &&
        isActivityAllowed(candidate, { min: allowedMin, max: allowedMax }),
    );

    const sameTheme = candidates.filter((c) => c.category === activity.category);
    const suitable = (candidate: Activity) =>
      candidate.difficulty >= activity.difficulty && candidate.difficulty <= sessionCeiling;

    const sameThemeProgression = sameTheme.filter(suitable).sort(byProgression);
    const sameThemeFallback = sameTheme
      .filter((candidate) => !suitable(candidate))
      .sort(byProgression);

    // След всяко завършване започваме от следващ подходящ съсед. Така
    // „Играй пак“ не повтаря постоянно една и съща тройка.
    const completed = profile?.completed[activity.id] ?? 0;
    const rotate = (list: Activity[]) => {
      if (list.length === 0) return list;
      const offset = completed % list.length;
      return [...list.slice(offset), ...list.slice(0, offset)];
    };

    const list: SeriesRound[] = [{ activity, variant: pass }];
    const add = (next: Activity, variant: number) => {
      if (list.length < desiredRounds) list.push({ activity: next, variant });
    };

    // 1. Съседи от същата категория — сесията остава по една тема.
    for (const sibling of rotate(sameThemeProgression)) add(sibling, pass);

    // 2. Няма достатъчно? Значи същата задача, но преоблечена.
    const depth = VARIANT_DEPTH[activity.engine] ?? 1;
    for (let used = 1; used < depth; used++) add(activity, pass + used);

    /**
     * Последен резерв: останалите по-лесни съседи в същата категория.
     *
     * Не прескачаме към чужда категория или рязко по-висока трудност.
     */
    for (const sibling of rotate(sameThemeFallback.filter(c => c.difficulty <= sessionCeiling))) add(sibling, pass);

    return list;
  }, [activity, allowedMin, allowedMax, profile, pass]);
  const totalRounds = series.length || 1;
  const currentRound = series[round - 1];
  const roundActivity = currentRound?.activity ?? activity;
  const roundVariant = currentRound?.variant ?? 0;

  useEffect(() => {
    finalRound.current = round >= totalRounds;
  }, [round, totalRounds]);

  /**
   * Кратък цветен преход между кръговете.
   *
   * Без него детето вижда как една задача се сменя с друга в същия миг и не
   * разбира, че е започнало ново. Преходът не носи награда — само казва
   * „сега идва следващото“.
   */
  useEffect(() => {
    if (pendingRound === null) return;
    const id = window.setTimeout(() => {
      setRound(pendingRound);
      setAttempt((value) => value + 1);
      setPendingRound(null);
    }, ROUND_BREAK_MS);
    return () => window.clearTimeout(id);
  }, [pendingRound]);
  const expectedDurationSec = series.reduce(
    (total, entry) => total + entry.activity.durationSec,
    0,
  );

  /** Мързеливият компонент се решава веднъж, по id на двигателя. */
  const Engine = useMemo(() => {
    if (!activity) return null;
    const mod = engineModule(activity.engine);
    if (!mod) return null;
    return lazy(() => mod.load().then((component) => ({ default: component })));
  }, [activity]);

  /**
   * Параметрите се валидират ТУК, преди да стигнат до двигателя.
   *
   * Това е мястото, което оправдава приведението на типа в регистъра:
   * двигателят получава точно това, което схемата му е приела.
   */
  const params = useMemo(() => {
    if (!roundActivity) return null;
    const schema = schemaFor(roundActivity.engine);
    if (!schema) return null;
    const parsed = schema.paramsSchema.safeParse(roundActivity.params);
    return parsed.success ? parsed.data : null;
  }, [roundActivity]);

  const finish = useCallback(
    (r: ActivityResult) => {
      if (!activity) return;
      setResult(r);

      recordCompletion(activity.id, activity.skills, scoreFromResult(r, expectedDurationSec));

      /**
       * Стикерът се дава по АКТИВНОСТ, не по картинка.
       *
       * Много активности започват с една и съща картинка (кравата се среща
       * в пет), а стикер по картинка значеше пет завършени игри да дадат
       * един стикер. Албумът трябва да показва какво е НАПРАВИЛО детето,
       * не кои картинки е видяло.
       *
       * Албумът само расте — оттам нищо не се маха (правило 3).
       */
      if (!stickerGiven.current) {
        stickerGiven.current = true;
        awardSticker(activity.id);
        playEffect('sticker');
      }
    },
    [activity, expectedDurationSec, recordCompletion, awardSticker],
  );

  const finishRound = useCallback(
    (roundResult: ActivityResult) => {
      const combined = {
        completed: accumulated.current.completed && roundResult.completed,
        durationMs: accumulated.current.durationMs + roundResult.durationMs,
        correct: accumulated.current.correct + roundResult.correct,
        attempts: accumulated.current.attempts + roundResult.attempts,
        hintsUsed: accumulated.current.hintsUsed + roundResult.hintsUsed,
      };
      accumulated.current = combined;

      if (round < totalRounds) {
        setProgress(round / totalRounds);
        setPendingRound(round + 1);
        return;
      }

      finish(combined);
    },
    [finish, round, totalRounds],
  );

  const again = () => {
    setResult(null);
    setProgress(0);
    setMessage('');
    stickerGiven.current = false;
    setRound(1);
    setPendingRound(null);
    setPass((value) => value + 1);
    accumulated.current = {
      completed: true,
      durationMs: 0,
      correct: 0,
      attempts: 0,
      hintsUsed: 0,
    };
    setAttempt((n) => n + 1);
  };

  if (!activity) {
    return (
      <Stack gap={4} center className={s.shell}>
        <p>{t('sys.error.body')}</p>
        <Button variant="primary" size="kid" onClick={() => navigate('/kid')}>
          {t('action.back')}
        </Button>
      </Stack>
    );
  }

  if (!Engine || !params) {
    return (
      <Stack gap={4} center className={s.shell}>
        <p>{t('sys.error.title')}</p>
        <Button variant="primary" size="kid" onClick={() => navigate('/kid')}>
          {t('action.back')}
        </Button>
      </Stack>
    );
  }

  const allowed = isActivityAllowed(activity, ageRange);
  if (!allowed) {
    return (
      <Stack gap={4} center className={s.shell}>
        <p>{t('kid.activity.locked')}</p>
        <Button variant="primary" size="kid" onClick={() => navigate('/kid')}>
          {t('action.back')}
        </Button>
      </Stack>
    );
  }

  /**
   * Правило 5 от DESIGN-BIBLE.md: приложението работи без звук.
   *
   * „Кой издава този звук“ е единственото изключение по същността си —
   * без звук няма задача. Затова не се показва счупено, а се обяснява
   * и се предлага изход. Проверката е ТУК, а не в двигателя: обвивката
   * се грижи за общите неща.
   */
  if (activity.a11y.requiresAudio && !soundOn) {
    return (
      <div className={s.shell}>
        <Stack gap={5} center className={s.play}>
          <h2>{t('sys.needsSound.title')}</h2>
          <p style={{ color: 'var(--c-ink-soft)', maxWidth: '28rem', textAlign: 'center' }}>
            {t('sys.needsSound.body')}
          </p>
          <Button variant="primary" size="kid" onClick={() => updateSettings({ sound: true })}>
            {t('action.enableSound')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/kid')}>
            {t('action.back')}
          </Button>
        </Stack>
      </div>
    );
  }

  // След проверките по-горе активността е налична, значи и кръгът е валиден.
  const playedActivity: Activity = roundActivity ?? activity;
  const sticker = activity.assets[0];

  return (
    <div
      className={s.shell}
      style={
        {
          '--activity-bg': `var(--cat-${activity.category}-bg)`,
          '--activity-ink': `var(--cat-${activity.category}-ink)`,
          '--activity-accent': `var(--cat-${activity.category}-accent)`,
        } as React.CSSProperties
      }
    >
      <Confetti trigger={shots} />
      <SoftStop />

      <div className={s.decor} aria-hidden="true">
        {(CATEGORY_DECOR[activity.category] ?? FALLBACK_DECOR).map((assetId, index) => (
          <span key={`${assetId}-${index}`} className={s.decorItem}>
            <Asset id={assetId} size="100%" />
          </span>
        ))}
      </div>

      <div className={s.bar}>
        <Button
          variant="quiet"
          size="sm"
          iconOnly
          glyph="✕"
          aria-label={t('action.exit')}
          onClick={() => navigate('/kid')}
        />
        <span className={s.titleWrap}>
          <img className={s.guideMascot} src="/icons/icon-192.png" alt="" aria-hidden="true" />
          <span className={s.title}>
            {t(playedActivity.titleKey as never)}
            <small>{t(`cat.${activity.category}`)} · {ageLabel(playedActivity.ageMin, playedActivity.ageMax)}</small>
          </span>
        </span>
        <ProgressRing value={progress} size={44} thickness={6} />
      </div>

      <div className={s.play}>
        {result ? (
          <div className={s.done}>
            <span className={s.praise}>{message || t('complete.title')}</span>

            {sticker ? (
              <div className={s.sticker}>
                <Asset id={sticker} size="100%" />
              </div>
            ) : null}

            <span style={{ color: 'var(--c-ink-soft)' }}>{t('complete.sticker')}</span>

            <div className={s.actions}>
              <Button variant="primary" size="kid" onClick={again}>
                {t('action.again')}
              </Button>
              <Button variant="soft" size="kid" onClick={() => navigate('/kid')}>
                {t('action.done')}
              </Button>
              <Button variant="soft" size="kid" onClick={() => navigate('/next')}>
                ✨ Следваща игра
              </Button>
            </div>

            {/* Бележката е за родителя, който минава покрай екрана.
                Задължително поле — виж правило 10 в DESIGN-BIBLE.md. */}
            <p className={s.parentNote}>
              <span className={s.parentNoteLabel}>{t('parent.note.label')}</span>
              {t(activity.parentNoteKey as never)}
            </p>
          </div>
        ) : pendingRound !== null ? (
          /* Преходът между кръговете: цвят, номер и точки — без награда.
             Точките само се пълнят, никога не се изпразват (правило 3). */
          <div className={s.break} aria-live="polite">
            <span className={s.breakLabel}>
              {t('kid.activity.round', { round: pendingRound, total: totalRounds })}
            </span>
            <span className={s.breakDots}>
              {Array.from({ length: totalRounds }, (_, i) => (
                <span
                  key={i}
                  className={cx(s.breakDot, i < pendingRound - 1 && s.breakDotDone)}
                />
              ))}
            </span>
          </div>
        ) : (
          <Suspense fallback={<p>{t('sys.loading')}</p>}>
            <div className={cx(s.roundShell, 'playful-game')}>
              {totalRounds > 1 ? (
                <span className={s.roundBadge}>
                  {t('kid.activity.round', { round, total: totalRounds })}
                </span>
              ) : null}
              <Engine
                key={attempt}
                params={params as never}
                activity={playedActivity}
                variant={roundVariant}
                api={api}
                onProgress={(fraction) => setProgress((round - 1 + fraction) / totalRounds)}
                onComplete={finishRound}
              />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
