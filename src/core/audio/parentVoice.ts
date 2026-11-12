import { del, delMany, get, set } from 'idb-keyval';

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
type StoredRecording = { type: string; bytes: ArrayBuffer };

export async function savePraise(
  profileId: string,
  phraseId: PraiseId,
  recording: Blob,
): Promise<void> {
  // WebKit can reject Blob persistence; structured binary data works across engines.
  await set(key(profileId, phraseId), {
    type: recording.type,
    bytes: await recording.arrayBuffer(),
  } satisfies StoredRecording);
}

export async function loadPraise(profileId: string, phraseId: PraiseId): Promise<Blob | null> {
  const saved = await get<Blob | StoredRecording>(key(profileId, phraseId));
  if (saved instanceof Blob) return saved;
  return saved?.bytes instanceof ArrayBuffer
    ? new Blob([saved.bytes], { type: saved.type })
    : null;
}

export async function deletePraise(profileId: string, phraseId: PraiseId): Promise<void> {
  await del(key(profileId, phraseId));
}

export async function deleteProfilePraise(profileId: string): Promise<void> {
  stopParentVoice();
  await delMany(PRAISE_PHRASES.map((phrase) => key(profileId, phrase.id)));
}

let currentVoice: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let playbackVersion = 0;

export function stopParentVoice(): void {
  playbackVersion++;
  currentVoice?.pause();
  currentVoice = null;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
}

async function playBlob(recording: Blob, version: number): Promise<void> {
  if (version !== playbackVersion || document.hidden) return;
  const url = URL.createObjectURL(recording);
  const audio = new Audio(url);
  currentVoice = audio;
  currentUrl = url;
  const release = () => {
    if (currentVoice === audio) stopParentVoice();
  };
  audio.addEventListener('ended', release, { once: true });
  audio.addEventListener('error', release, { once: true });
  try {
    await audio.play();
  } catch {
    release();
  }
}

export async function playPraise(profileId: string, phraseId: PraiseId): Promise<void> {
  stopParentVoice();
  const version = playbackVersion;
  const blob = await loadPraise(profileId, phraseId);
  if (blob) await playBlob(blob, version);
}

export async function playRandomPraise(profileId: string): Promise<void> {
  stopParentVoice();
  const version = playbackVersion;
  const available: Blob[] = [];
  for (const phrase of PRAISE_PHRASES) {
    const recording = await loadPraise(profileId, phrase.id);
    if (recording) available.push(recording);
  }
  if (available.length === 0) return;

  const recording = available[Math.floor(Math.random() * available.length)];
  if (!recording) return;
  await playBlob(recording, version);
}
