/**
 * Регистър на графиката.
 *
 * Няма ръчно поддържан манифест. Vite обхожда `svg/` при build и оттам
 * излиза списъкът — файл, сложен в папката, е регистриран още със
 * слагането си. Един източник на истина, нула разминавания.
 *
 * Пътят става id:  svg/animal/cow.svg  →  animal.cow
 */

/** Само адресите — 50 низа, влизат в основния chunk без значение. */
const URLS: Record<string, string> = import.meta.glob('./svg/**/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
});

/**
 * Изходният код на контурните рисунки. Зарежда се мързеливо: нужен е само
 * на двигателя за оцветяване, който трябва да пипа `fill` по зони, а това
 * иска SVG-то да е вътре в документа, не в <img>.
 */
const LINEART_SOURCE = import.meta.glob('./svg/lineart/*.svg', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/**
 * Записаните звуци.
 *
 * Живеят при графиката, а не в `public/`, точно за да минат оттук: така
 * списъкът се извежда от папката, вместо да се поддържа на две места, а
 * липсващ файл се вижда веднага, не при първото пускане пред детето.
 *
 * Папката е в множествено число (`animals`), а id-то — в единствено
 * (`animal.cow`). Затова се превежда при обхождането.
 */
const SOUND_URLS: Record<string, string> = import.meta.glob('./audio/**/*.ogg', {
  query: '?url',
  import: 'default',
  eager: true,
});

function idFromPath(path: string): string {
  return path
    .replace(/^\.\/svg\//, '')
    .replace(/\.svg$/, '')
    .replace(/\//g, '.');
}

const byId = new Map<string, string>();
for (const [path, url] of Object.entries(URLS)) {
  byId.set(idFromPath(path), url);
}

const SOUND_FOLDER_TO_PREFIX: Record<string, string> = {
  animals: 'animal',
  vehicles: 'vehicle',
};

const soundById = new Map<string, string>();
for (const [path, url] of Object.entries(SOUND_URLS)) {
  const match = /^\.\/audio\/([^/]+)\/(.+)\.ogg$/.exec(path);
  const folder = match?.[1];
  const name = match?.[2];
  const prefix = folder ? SOUND_FOLDER_TO_PREFIX[folder] : undefined;
  if (prefix && name) soundById.set(`${prefix}.${name}`, url);
}

const lineartById = new Map<string, () => Promise<string>>();
for (const [path, load] of Object.entries(LINEART_SOURCE)) {
  lineartById.set(idFromPath(path), load);
}

export type AssetId = string;

/** Всички регистрирани id-та, подредени. Ползва се от витрината и от тестове. */
export const ASSET_IDS: readonly AssetId[] = [...byId.keys()].sort();

/** Адресът на актива, или `null`, ако липсва. Извикващият показва заместител. */
export function assetUrl(id: AssetId): string | null {
  return byId.get(id) ?? null;
}

export function hasAsset(id: AssetId): boolean {
  return byId.has(id);
}

/** Изходният код на контурна рисунка. Хвърля, ако id-то не е контурно. */
export async function loadLineart(id: AssetId): Promise<string> {
  const load = lineartById.get(id);
  if (!load) throw new Error(`Няма контурна рисунка с id "${id}"`);
  return load();
}

export function isLineart(id: AssetId): boolean {
  return lineartById.has(id);
}

/** Адресът на записа за даден предмет, или `null`, ако няма такъв. */
export function soundUrl(id: AssetId): string | null {
  return soundById.get(id) ?? null;
}

export function hasSound(id: AssetId): boolean {
  return soundById.has(id);
}

/** Всички предмети, за които има записан звук. */
export const SOUND_IDS: readonly AssetId[] = [...soundById.keys()].sort();

/** Всички id-та в дадена категория: assetsIn('animal') → ['animal.bear', …] */
export function assetsIn(category: string): AssetId[] {
  const prefix = `${category}.`;
  return ASSET_IDS.filter((id) => id.startsWith(prefix));
}
