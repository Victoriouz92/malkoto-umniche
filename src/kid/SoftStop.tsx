import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, HoldButton, Sheet, Stack } from '@/design-system';
import { playEffect } from '@/core/audio';
import { useSession, useTimeState, formatRemaining } from '@/core/time/session';
import { t } from '@/i18n';
import s from './SoftStop.module.css';

/**
 * Мекият стоп.
 *
 * Два екрана, не един.
 *
 * Първият идва МИНУТА ПРЕДИ края и се затваря — казва „още малко“, за да
 * може детето да довърши това, което прави. Вторият идва на нулата и не се
 * затваря.
 *
 * Рязкото заключване пред четиригодишно произвежда сълзи и усещане, че
 * устройството го е предало. Предупреждението превръща края в нещо, което
 * детето е видяло да идва.
 */
export function SoftStop() {
  const navigate = useNavigate();
  const time = useTimeState();
  const warned = useSession((s) => s.warned);
  const markWarned = useSession((s) => s.markWarned);
  const setPaused = useSession((s) => s.setPaused);

  const chimed = useRef(false);

  // Часовникът спира, докато свърши времето — иначе минутите текат зад
  // екран, който детето не може да махне.
  useEffect(() => {
    setPaused(time.status === 'over');
  }, [time.status, setPaused]);

  useEffect(() => {
    if (time.status === 'warning' && !chimed.current) {
      chimed.current = true;
      playEffect('chime');
    }
    if (time.status === 'ok') chimed.current = false;
  }, [time.status]);

  const showWarning = time.status === 'warning' && !warned;
  const showStop = time.status === 'over';

  return (
    <>
      <Sheet
        open={showWarning}
        onClose={markWarned}
        placement="bottom"
        title={t('stop.soon.title')}
      >
        <Stack gap={4}>
          <p>{t('stop.soon.body')}</p>
          <p style={{ color: 'var(--c-ink-soft)' }}>
            {t('parent.limits.remaining')}: {formatRemaining(time.remainingMs)}
          </p>
          <Button variant="primary" size="kid" block onClick={markWarned}>
            {t('action.continue')}
          </Button>
        </Stack>
      </Sheet>

      <Sheet
        open={showStop}
        onClose={() => undefined}
        placement="full"
        persistent
        panelClassName={s.stopPanel}
      >
        <div className={s.stopScene}>
          <div className={s.stopCard}>
            <img src="/icons/icon-192.png" alt="" aria-hidden="true" />
            <span className={s.stopEyebrow}>Малкото Умниче</span>
            <h2>{t('stop.now.title')}</h2>
            <p>{t('stop.now.body')}</p>
            <div className={s.goodbye}>Днес открихме нещо ново. Сега е време за почивка.</div>

            {/* Задържането пази родителската врата от случаен детски тап. */}
            <div className={s.parentGate}>
              <span>Само за възрастни</span>
              <HoldButton label={t('stop.parentUnlock')} onComplete={() => navigate('/parent')} />
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}
