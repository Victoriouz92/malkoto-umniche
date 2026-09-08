import { useEffect, useRef, useState } from 'react';
import { Button, Card, Cluster, Stack } from '@/design-system';
import { activeProfile, useApp } from '@/core/store/app';
import {
  deletePraise,
  loadPraise,
  PRAISE_PHRASES,
  savePraise,
  type PraiseId,
} from '@/core/audio/parentVoice';
import { t } from '@/i18n';
import s from '../parent.module.css';

export function VoiceTab() {
  const profile = useApp(activeProfile);
  const [saved, setSaved] = useState<Set<PraiseId>>(new Set());
  const [recording, setRecording] = useState<PraiseId | null>(null);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    void Promise.all(
      PRAISE_PHRASES.map(async (phrase) => ({
        id: phrase.id,
        exists: Boolean(await loadPraise(profile.id, phrase.id)),
      })),
    ).then((items) => {
      if (active) setSaved(new Set(items.filter((item) => item.exists).map((item) => item.id)));
    });
    return () => {
      active = false;
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [profile]);

  if (!profile) return <p className={s.muted}>{t('parent.profiles.none')}</p>;

  const start = async (phraseId: PraiseId) => {
    setError('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const next = new MediaRecorder(media);
      stream.current = media;
      recorder.current = next;
      next.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      next.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: next.mimeType || 'audio/webm' });
        void savePraise(profile.id, phraseId, blob).then(() => {
          setSaved((current) => new Set(current).add(phraseId));
        });
        media.getTracks().forEach((track) => track.stop());
        setRecording(null);
      });
      next.start();
      setRecording(phraseId);
    } catch {
      setError(t('parent.voice.micError'));
    }
  };

  const stop = () => recorder.current?.stop();

  const play = async (phraseId: PraiseId) => {
    const blob = await loadPraise(profile.id, phraseId);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
    await audio.play();
  };

  return (
    <div className={s.section}>
      <Card variant="flat">
        <Stack gap={3}>
          <strong>{t('parent.voice.title', { name: profile.name })}</strong>
          <p className={s.muted}>{t('parent.voice.privacy')}</p>
          {error ? <p className={s.danger}>{error}</p> : null}
        </Stack>
      </Card>

      {PRAISE_PHRASES.map((phrase) => {
        const isRecording = recording === phrase.id;
        const exists = saved.has(phrase.id);
        return (
          <Card key={phrase.id} variant="flat" className={s.voicePhrase}>
            <Cluster gap={3} between>
              <strong>„{phrase.text}“</strong>
              <Cluster gap={2}>
                {isRecording ? (
                  <Button variant="primary" onClick={stop}>{t('parent.voice.stop')}</Button>
                ) : (
                  <Button
                    variant={exists ? 'soft' : 'primary'}
                    disabled={recording !== null}
                    onClick={() => void start(phrase.id)}
                  >
                    {exists ? t('parent.voice.recordAgain') : t('parent.voice.record')}
                  </Button>
                )}
                {exists ? (
                  <>
                    <Button variant="quiet" onClick={() => void play(phrase.id)}>
                      {t('parent.voice.listen')}
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => void deletePraise(profile.id, phrase.id).then(() => {
                        setSaved((current) => {
                          const next = new Set(current);
                          next.delete(phrase.id);
                          return next;
                        });
                      })}
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
