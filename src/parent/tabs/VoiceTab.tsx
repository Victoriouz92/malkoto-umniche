import { useEffect, useRef, useState } from 'react';
import { Button, Card, Cluster, Stack } from '@/design-system';
import { activeProfile, useApp } from '@/core/store/app';
import {
  deletePraise,
  loadPraise,
  PRAISE_PHRASES,
  savePraise,
  playPraise,
  stopParentVoice,
  type PraiseId,
} from '@/core/audio/parentVoice';
import { t } from '@/i18n';
import s from '../parent.module.css';

export function VoiceTab() {
  const profile = useApp(activeProfile);
  const [saved, setSaved] = useState<Set<PraiseId>>(new Set());
  const [recording, setRecording] = useState<PraiseId | null>(null);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const stopTimer = useRef<number>();
  const profileId = profile?.id;

  useEffect(() => {
    mounted.current = true;
    if (!profileId)
      return () => {
        mounted.current = false;
      };
    let active = true;
    void Promise.all(
      PRAISE_PHRASES.map(async (phrase) => ({
        id: phrase.id,
        exists: Boolean(await loadPraise(profileId, phrase.id)),
      })),
    )
      .then((items) => {
        if (active)
          setSaved(new Set(items.filter((item) => item.exists).map((item) => item.id)));
      })
      .catch(() => {
        if (active)
          setError('Записите не могат да се отворят. Проверете съхранението в браузъра.');
      });
    return () => {
      active = false;
      mounted.current = false;
      window.clearTimeout(stopTimer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      stopParentVoice();
    };
  }, [profileId]);

  if (!profile) return <p className={s.muted}>{t('parent.profiles.none')}</p>;

  const start = async (phraseId: PraiseId) => {
    setError('');
    setRequesting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const chunks: BlobPart[] = [];
      const next = new MediaRecorder(media);
      recorder.current = next;
      next.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      next.addEventListener('stop', () => {
        window.clearTimeout(stopTimer.current);
        media.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        const blob = new Blob(chunks, { type: next.mimeType || 'audio/webm' });
        if (blob.size)
          void savePraise(profile.id, phraseId, blob)
            .then(() => {
              if (mounted.current) setSaved((current) => new Set(current).add(phraseId));
            })
            .catch(() => {
              if (mounted.current)
                setError('Записът не можа да се запази. Освободете място и опитайте отново.');
            });
        setRecording(null);
      });
      next.start();
      setRecording(phraseId);
      stopTimer.current = window.setTimeout(() => {
        if (next.state === 'recording') next.stop();
      }, 10_000);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (mounted.current) setError(t('parent.voice.micError'));
    } finally {
      if (mounted.current) setRequesting(false);
    }
  };

  const stop = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  const play = async (phraseId: PraiseId) => {
    try {
      await playPraise(profile.id, phraseId);
    } catch {
      setError('Записът не може да се пусне. Опитайте да го запишете отново.');
    }
  };

  return (
    <div className={s.section}>
      <Card variant="flat">
        <Stack gap={3}>
          {/* Родителят вижда бутон „Запиши“ до реплика и няма откъде да
              разбере кой записва, кога се чува и защо изобщо. Затова тук
              се обяснява целта, после моментът, после доброволността и
              чак накрая поверителността. */}
          <strong>
            {profile.name.trim()
              ? t('parent.voice.title', { name: profile.name })
              : t('parent.voice.titleNoName')}
          </strong>
          <p>{t('parent.voice.intro')}</p>
          <p className={s.muted}>{t('parent.voice.when')}</p>
          <p className={s.muted}>{t('parent.voice.optional')}</p>
          <p className={s.muted}>{t('parent.voice.privacy')}</p>
          <p className={s.muted}>
            Всеки запис е до 10 секунди. Напускането на раздела спира микрофона и прослушването.
          </p>
          {error ? (
            <p className={s.danger} role="alert">
              {error}
            </p>
          ) : null}
        </Stack>
      </Card>

      {PRAISE_PHRASES.map((phrase) => {
        const isRecording = recording === phrase.id;
        const exists = saved.has(phrase.id);
        return (
          <Card key={phrase.id} variant="flat" className={s.voicePhrase}>
            <Cluster gap={3} between>
              <Stack gap={1}>
                <strong>„{phrase.text}“</strong>
                <span className={s.muted}>
                  {exists ? t('parent.voice.recorded') : t('parent.voice.empty')}
                </span>
              </Stack>
              <Cluster gap={2}>
                {isRecording ? (
                  <Button variant="primary" onClick={stop}>
                    {t('parent.voice.stop')}
                  </Button>
                ) : (
                  <Button
                    variant={exists ? 'soft' : 'primary'}
                    disabled={recording !== null || requesting}
                    onClick={() => void start(phrase.id)}
                  >
                    {exists ? t('parent.voice.recordAgain') : t('parent.voice.record')}
                  </Button>
                )}
                {exists ? (
                  <>
                    <Button
                      variant="quiet"
                      disabled={recording !== null || requesting}
                      onClick={() => void play(phrase.id)}
                    >
                      {t('parent.voice.listen')}
                    </Button>
                    <Button
                      variant="quiet"
                      disabled={recording !== null || requesting}
                      onClick={() =>
                        void deletePraise(profile.id, phrase.id)
                          .then(() => {
                            setSaved((current) => {
                              const next = new Set(current);
                              next.delete(phrase.id);
                              return next;
                            });
                          })
                          .catch(() =>
                            setError('Записът не можа да се изтрие. Опитайте отново.'),
                          )
                      }
                    >
                      {t('action.delete')}
                    </Button>
                  </>
                ) : null}
              </Cluster>
            </Cluster>
          </Card>
        );
      })}
    </div>
  );
}
