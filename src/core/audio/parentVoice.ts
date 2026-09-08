import { del, get, set } from 'idb-keyval';

export const PRAISE_PHRASES = [
  { id: 'bravo', text: 'Бравооо!' },
  { id: 'very-good', text: 'Много добре!' },
  { id: 'wonderful', text: 'Страхотно се справи!' },
  { id: 'you-did-it', text: 'Успя!' },
  { id: 'exactly', text: 'Точно така!' },
  { id: 'super', text: 'Супер!' },
  { id: 'proud', text: 'Гордея се с теб!' },
  { id: 'keep-going', text: 'Продължавай така!' },
] as const;

export type PraiseId = (typeof PRAISE_PHRASES)[number]['id'];

const key = (profileId: string, phraseId: PraiseId) =>
  `tinymind:voice:${profileId}:${phraseId}`;

export async function savePraise(
  profileId: string,
  phraseId: PraiseId,
  recording: Blob,
): Promise<void> {
  await set(key(profileId, phraseId), recording);
}

export async function loadPraise(
  profileId: string,
  phraseId: PraiseId,
): Promise<Blob | null> {
  return (await get<Blob>(key(profileId, phraseId))) ?? null;
}

export async function deletePraise(profileId: string, phraseId: PraiseId): Promise<void> {
  await del(key(profileId, phraseId));
}

let currentVoice: HTMLAudioElement | null = null;

export async function playRandomPraise(profileId: string): Promise<void> {
  const available: Blob[] = [];
  for (const phrase of PRAISE_PHRASES) {
    const recording = await loadPraise(profileId, phrase.id);
    if (recording) available.push(recording);
  }
  if (available.length === 0) return;

  const recording = available[Math.floor(Math.random() * available.length)];
  if (!recording) return;
  currentVoice?.pause();
  const url = URL.createObjectURL(recording);
  const audio = new Audio(url);
  currentVoice = audio;
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
  await audio.play().catch(() => URL.revokeObjectURL(url));
}
