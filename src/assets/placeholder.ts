/**
 * Процедурен заместител за липсваща графика.
 *
 * Смисълът: активност, която иска картинка, която още я няма, трябва да е
 * ИГРАЕМА, не счупена. Заместителят е разпознаваем (един и същ id дава
 * винаги един и същ вид), различим от съседите си и явно временен.
 *
 * Цветовете се четат от токените по време на изпълнение. Не се преписват
 * тук — иначе при смяна на палитрата заместителите щяха да останат в
 * старата и да изглеждат като чужди тела.
 */

const PALETTE = [
  'puzzles',
  'memory',
  'numbers',
  'letters',
  'colors',
  'shapes',
  'animals',
  'vehicles',
] as const;

const SHAPES = [
  '<circle cx="128" cy="128" r="76"/>',
  '<rect x="52" y="52" width="152" height="152" rx="32"/>',
  '<path d="M128 48 L208 196 L48 196 Z"/>',
  '<path d="M128 44 L204 128 L128 212 L52 128 Z"/>',
] as const;

/** Стабилен хеш: един и същ id дава един и същ вид при всяко пускане. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Инициалите на id-то: `animal.cow` → `AC` */
function initials(id: string): string {
  return id
    .split('.')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);
}

let tokenCache: CSSStyleDeclaration | null = null;

function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  tokenCache ??= getComputedStyle(document.documentElement);
  return tokenCache.getPropertyValue(name).trim() || fallback;
}

/** Изчиства кеша след смяна на темата. Извиква се от превключвателя на темата. */
export function refreshPlaceholderColors(): void {
  tokenCache = null;
}

/**
 * SVG на заместителя като data URI, годен за <img>.
 *
 * Цветовете се заковават в момента на създаване, а не се оставят като
 * `var(--…)`: вътре в <img> SVG-то е отделен документ и CSS променливите
 * на страницата не стигат до него.
 */
export function placeholderDataUri(id: string): string {
  const h = hash(id);
  const family = PALETTE[h % PALETTE.length] ?? 'shapes';
  const shape = SHAPES[(h >> 3) % SHAPES.length] ?? SHAPES[0];

  const bg = token(`--cat-${family}-bg`, 'rgb(240 235 225)');
  const accent = token(`--cat-${family}-accent`, 'rgb(150 140 125)');
  const ink = token(`--cat-${family}-ink`, 'rgb(60 52 44)');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">` +
    `<rect width="256" height="256" rx="40" fill="${bg}"/>` +
    `<g fill="${accent}" opacity="0.55">${shape}</g>` +
    `<text x="128" y="142" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="56" font-weight="800" fill="${ink}">${initials(id)}</text>` +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
