/**
 * Родителски PIN.
 *
 * PIN-ът НИКОГА не се пази в открит вид. Пази се PBKDF2 отпечатък със
 * случайна сол. Устройството е семейно — по-голямото дете, което разлисти
 * localStorage, не бива да намери четири цифри.
 *
 * Четирицифрен PIN е слаба тайна по устройство и това е съзнателно: тук не
 * се пази банкова сметка, а се пречи на седемгодишно да си вдигне лимита.
 * Затова и итерациите са високи — правят налучкването бавно.
 */

const ITERATIONS = 150_000;
const KEY_BITS = 256;

/** Без 0/O и 1/I/L — родителят преписва кода на ръка. */
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function derive(secret: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );

  return new Uint8Array(bits);
}

export type Digest = { hash: string; salt: string };

/** Прави отпечатък на тайна със свежа сол. */
export async function hashSecret(secret: string): Promise<Digest> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(secret, salt);
  return { hash: toBase64(hash), salt: toBase64(salt) };
}

/**
 * Сравнението е с постоянно време.
 *
 * При четири цифри разликата е теоретична, но ранното напускане при първия
 * различен байт е навик, който не бива да се губи.
 */
function equalConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function verifySecret(secret: string, digest: Digest | null): Promise<boolean> {
  if (!digest?.hash || !digest.salt) return false;
  const expected = fromBase64(digest.hash);
  const actual = await derive(secret, fromBase64(digest.salt));
  return equalConstantTime(expected, actual);
}

/** Валиден PIN: точно четири цифри. */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Код за възстановяване.
 *
 * Няма сървър, значи няма писмо със „забравена парола". Кодът се показва
 * веднъж при създаването на PIN и е единственият път назад, ако родителят
 * забрави четирите цифри. Другият изход е изтриване на всички данни.
 */
export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map(
    (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length] ?? 'A',
  );
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/** Приема кода независимо от малки букви и липсващо тире. */
export function normalizeRecoveryCode(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
