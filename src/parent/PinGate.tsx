import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Cluster, Page, Stack, TextInput } from '@/design-system';
import { useApp } from '@/core/store/app';
import {
  generateRecoveryCode,
  hashSecret,
  isValidPin,
  normalizeRecoveryCode,
  verifySecret,
} from '@/core/security/pin';
import { t } from '@/i18n';
import { PinPad } from './PinPad';
import s from './parent.module.css';

type Step =
  | 'enter'
  | 'setup-enter'
  | 'setup-confirm'
  | 'setup-recovery'
  | 'recovery-code';

/** След толкова грешни опита вратата спира да отговаря за малко. */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

type Props = { onUnlocked: () => void; onCancel: () => void };

/**
 * Вратата към родителския режим.
 *
 * Три пътя: създаване на PIN, въвеждане и възстановяване. Забавянето след
 * пет грешни опита е срещу най-вероятния нападател — по-голямото дете,
 * което налучква.
 */
export function PinGate({ onUnlocked, onCancel }: Props) {
  const pin = useApp((st) => st.pin);
  const setPin = useApp((st) => st.setPin);
  const registerPinFailure = useApp((st) => st.registerPinFailure);
  const clearPinFailures = useApp((st) => st.clearPinFailures);

  const [step, setStep] = useState<Step>(pin.hash ? 'enter' : 'setup-enter');
  const [first, setFirst] = useState('');
  const [shake, setShake] = useState(0);
  const [message, setMessage] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);

  // Заключването идва от хранилището, не от паметта на компонента —
  // иначе презареждането го нулира.
  const lockedUntil = pin.lockedUntil ?? 0;
  const locked = Date.now() < lockedUntil;

  // Отброяването се вижда, вместо вратата да мълчи необяснимо.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!locked) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [locked]);

  const fail = useCallback((text: string) => {
    setMessage(text);
    setShake((n) => n + 1);
  }, []);

  const handle = useCallback(
    (entered: string) => {
      if (busy) return;

      if (step === 'enter') {
        setBusy(true);
        void verifySecret(entered, { hash: pin.hash ?? '', salt: pin.salt ?? '' }).then(
          (ok) => {
            setBusy(false);
            if (ok) {
              clearPinFailures();
              onUnlocked();
              return;
            }
            registerPinFailure(MAX_ATTEMPTS, LOCKOUT_MS);
            const willLock = pin.failedAttempts + 1 >= MAX_ATTEMPTS;
            fail(willLock ? t('parent.gate.locked') : t('parent.gate.wrong'));
          },
        );
        return;
      }

      if (step === 'setup-enter') {
        if (!isValidPin(entered)) {
          fail(t('parent.gate.wrong'));
          return;
        }
        setFirst(entered);
        setMessage('');
        setStep('setup-confirm');
        return;
      }

      if (step === 'setup-confirm') {
        if (entered !== first) {
          setFirst('');
          setStep('setup-enter');
          fail(t('parent.gate.mismatch'));
          return;
        }

        setBusy(true);
        const code = generateRecoveryCode();
        void Promise.all([hashSecret(entered), hashSecret(code)]).then(
          ([pinDigest, recoveryDigest]) => {
            setPin(pinDigest, recoveryDigest);
            setRecoveryCode(code);
            setBusy(false);
            setMessage('');
            setStep('setup-recovery');
          },
        );
      }
    },
    [
      busy,
      clearPinFailures,
      fail,
      first,
      onUnlocked,
      pin.failedAttempts,
      pin.hash,
      pin.salt,
      registerPinFailure,
      setPin,
      step,
    ],
  );

  const checkRecovery = () => {
    if (!pin.recoveryHash) {
      setMessage(t('parent.gate.recovery.none'));
      return;
    }
    setBusy(true);
    void verifySecret(normalizeRecoveryCode(codeInput), {
      hash: pin.recoveryHash,
      salt: pin.recoverySalt ?? '',
    }).then((ok) => {
      setBusy(false);
      if (!ok) {
        setMessage(t('parent.gate.recovery.wrong'));
        return;
      }
      clearPinFailures();
      setMessage('');
      setCodeInput('');
      setStep('setup-enter');
    });
  };

  const title =
    step === 'enter'
      ? t('parent.gate.title')
      : step === 'setup-enter'
        ? t('parent.gate.setup')
        : step === 'setup-confirm'
          ? t('parent.gate.confirm')
          : step === 'setup-recovery'
            ? t('parent.gate.recovery.title')
            : t('parent.gate.recovery.enter');

  return (
    <Page narrow>
      <Stack gap={6} className={s.gate}>
        <Stack gap={2}>
          <h1>{title}</h1>
          <p className={s.muted}>{t('parent.gate.hint')}</p>
        </Stack>

        {step === 'setup-recovery' ? (
          <Card variant="flat">
            <Stack gap={4}>
              <output className={s.recoveryCode}>{recoveryCode}</output>
              <p className={s.muted}>{t('parent.gate.recovery.hint')}</p>
              <Cluster center>
                <Button
                  variant="soft"
                  onClick={() => void navigator.clipboard?.writeText(recoveryCode)}
                >
                  {t('action.copy')}
                </Button>
                <Button variant="primary" onClick={onUnlocked}>
                  {t('parent.gate.recovery.saved')}
                </Button>
              </Cluster>
            </Stack>
          </Card>
        ) : step === 'recovery-code' ? (
          <Stack gap={4}>
            <TextInput
              label={t('parent.gate.recovery.enter')}
              value={codeInput}
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXX-XXXX"
              onChange={(e) => setCodeInput(e.target.value)}
              error={message || undefined}
            />
            <Cluster center>
              <Button variant="quiet" onClick={() => setStep('enter')}>
                {t('action.back')}
              </Button>
              <Button variant="primary" disabled={busy} onClick={checkRecovery}>
                {t('action.confirm')}
              </Button>
            </Cluster>
          </Stack>
        ) : (
          <Stack gap={4}>
            <PinPad onComplete={handle} shakeSignal={shake} disabled={busy || locked} />

            {message ? (
              <p className={s.error} role="alert">
                {message}
                {locked ? ` (${Math.ceil((lockedUntil - Date.now()) / 1000)} сек)` : ''}
              </p>
            ) : null}

            <Cluster center>
              <Button variant="quiet" size="sm" onClick={onCancel}>
                {t('action.back')}
              </Button>
              {step === 'enter' && pin.recoveryHash ? (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    setMessage('');
                    setStep('recovery-code');
                  }}
                >
                  {t('parent.gate.forgot')}
                </Button>
              ) : null}
            </Cluster>
          </Stack>
        )}
      </Stack>
    </Page>
  );
}
