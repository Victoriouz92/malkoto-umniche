/**
 * Проверка на контраста — част от одита по T6.1.
 *
 * Правило 11 от DESIGN-BIBLE казва, че цветовете живеят в токени. Това го
 * прави проверимо: контрастът на всяка двойка, която реално се ползва
 * заедно, се смята тук и се сверява с WCAG 2.1.
 *
 * Защо машинно, а не „на око“: тъмната тема има собствени стойности за
 * всеки токен. Промяна в светлата тема, която изглежда добре, може тихо
 * да счупи тъмната — и обратно. Око, което гледа едната, не вижда другата.
 *
 * Прагове: 4.5:1 за обикновен текст, 3:1 за едър текст (≥24px или ≥19px
 * получер) и за границите на интерактивни елементи.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TOKENS = fileURLToPath(new URL('../src/design-system/tokens.css', import.meta.url));

type Theme = 'светла' | 'тъмна';

/** Двойка цветове, която реално се среща на екрана. */
type Pair = {
  fg: string;
  bg: string;
  /** Къде се вижда — за да е ясно какво да се гледа при провал. */
  where: string;
  /** Минимално допустимо отношение. */
  min: number;
};

const PAIRS: Pair[] = [
  // ── Основен текст ────────────────────────────────────────────
  { fg: '--c-ink', bg: '--c-bg', where: 'основен текст върху фона', min: 4.5 },
  { fg: '--c-ink', bg: '--c-surface', where: 'основен текст върху карта', min: 4.5 },
  { fg: '--c-ink-soft', bg: '--c-bg', where: 'второстепенен текст', min: 4.5 },
  { fg: '--c-ink-soft', bg: '--c-surface', where: 'второстепенен текст в карта', min: 4.5 },
  // Бледият е деклариран като „само едър текст или декор“ — затова 3:1.
  { fg: '--c-ink-faint', bg: '--c-bg', where: 'блед текст (само едър)', min: 3 },

  // ── Бутони ───────────────────────────────────────────────────
  // Ярките версии се ползват САМО на детски бутони: 28px получер, тоест
  // едър текст по WCAG, за който прагът е 3:1. Компонентът го налага —
  // виж бележката в Button.module.css.
  { fg: '--c-on-primary', bg: '--c-primary', where: 'детски основен бутон', min: 3 },
  { fg: '--c-on-secondary', bg: '--c-secondary', where: 'детски втори бутон', min: 3 },
  // Всичко под детския размер ползва наситената версия и иска пълните 4.5:1.
  { fg: '--c-on-primary', bg: '--c-primary-strong', where: 'основен бутон, дребен текст', min: 4.5 },
  { fg: '--c-on-secondary', bg: '--c-secondary-strong', where: 'втори бутон, дребен текст', min: 4.5 },
  { fg: '--c-primary-ink', bg: '--c-primary-soft', where: 'мек основен бутон', min: 4.5 },
  { fg: '--c-secondary-ink', bg: '--c-secondary-soft', where: 'мек втори бутон', min: 4.5 },
  { fg: '--c-primary-ink', bg: '--c-bg', where: 'основен цвят като текст', min: 4.5 },
  { fg: '--c-secondary-ink', bg: '--c-bg', where: 'втори цвят като текст', min: 4.5 },

  // ── Състояния ────────────────────────────────────────────────
  { fg: '--c-gentle', bg: '--c-bg', where: 'мек отказ (детски екран)', min: 3 },
  { fg: '--c-success-strong', bg: '--c-success-soft', where: 'успех', min: 4.5 },
  { fg: '--c-warn-strong', bg: '--c-warn-soft', where: 'внимание (родителски)', min: 4.5 },
  { fg: '--c-info-strong', bg: '--c-info-soft', where: 'информация', min: 4.5 },
  { fg: '--c-danger', bg: '--c-bg', where: 'опасност (само родителски)', min: 4.5 },

  // ── Граници ──────────────────────────────────────────────────
  { fg: '--c-border-strong', bg: '--c-bg', where: 'силна граница', min: 3 },
];

/** Категориите: надпис върху собствения си фон, на детски екран. */
const CATEGORIES = [
  'puzzles',
  'memory',
  'numbers',
  'letters',
  'colors',
  'shapes',
  'animals',
  'vehicles',
  'food',
];

for (const category of CATEGORIES) {
  PAIRS.push({
    fg: `--cat-${category}-ink`,
    bg: `--cat-${category}-bg`,
    where: `надпис на категория „${category}“`,
    min: 4.5,
  });
  PAIRS.push({
    fg: `--cat-${category}-ink`,
    bg: '--c-bg',
    where: `категория „${category}“ върху общия фон`,
    min: 4.5,
  });
}

// ── Четене на токените ─────────────────────────────────────────

const css = readFileSync(TOKENS, 'utf8');

/**
 * Светлите стойности са обикновените токени. Тъмните живеят веднъж, като
 * `--dk-*`, и се включват от два контекста — системното предпочитание и
 * ръчния превключвател. Затова тъмната тема се чете от `--dk-*`, а не от
 * блоковете, които само пренасочват.
 */
function readTheme(theme: Theme): Map<string, string> {
  const values = new Map<string, string>();

  for (const [, name, value] of css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})/g)) {
    if (!name || !value) continue;
    if (name.startsWith('--dk-')) continue;
    values.set(name, value);
  }
  if (theme === 'светла') return values;

  for (const [, name, value] of css.matchAll(/--dk-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})/g)) {
    if (name && value) values.set(`--${name}`, value);
  }
  return values;
}

/** Изрязва блок по началния му ред, броейки отварящи и затварящи скоби. */
function extractBlock(opener: string): string | null {
  const at = css.indexOf(opener);
  if (at < 0) return null;
  let depth = 0;
  for (let i = at; i < css.length; i++) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(at, i + 1);
    }
  }
  return null;
}

/**
 * Двата контекста, които включват тъмната тема, трябва да включват едно и
 * също. Ако се разминат, поправка на едното място тихо чупи другото — а
 * разликата се вижда само на устройство с точно тази настройка.
 */
function checkThemeBlocksMatch(): string[] {
  const media = extractBlock("@media (prefers-color-scheme: dark) {");
  const manual = extractBlock(":root[data-theme='dark'] {");
  if (!media || !manual) return ['не намирам двата блока за тъмна тема'];

  const names = (block: string) =>
    [...block.matchAll(/(--[a-z0-9-]+):\s*var\(--dk-/g)].map((m) => m[1]).sort();

  const fromMedia = names(media);
  const fromManual = names(manual);
  const onlyMedia = fromMedia.filter((n) => !fromManual.includes(n));
  const onlyManual = fromManual.filter((n) => !fromMedia.includes(n));

  const issues: string[] = [];
  if (fromMedia.length === 0) issues.push('системният блок не включва нито един тъмен токен');
  for (const name of onlyMedia) issues.push(`${name} липсва в ръчната тъмна тема`);
  for (const name of onlyManual) issues.push(`${name} липсва в системната тъмна тема`);
  return issues;
}

// ── Смятане по WCAG 2.1 ────────────────────────────────────────

function channel(part: number): number {
  const c = part / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.slice(0, 7);
  const r = Number.parseInt(full.slice(1, 3), 16);
  const g = Number.parseInt(full.slice(3, 5), 16);
  const b = Number.parseInt(full.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

// ── Проверката ─────────────────────────────────────────────────

const problems: string[] = [];
const missing: string[] = [];
let checked = 0;

for (const theme of ['светла', 'тъмна'] as const) {
  const values = readTheme(theme);

  for (const pair of PAIRS) {
    const fg = values.get(pair.fg);
    const bg = values.get(pair.bg);

    if (!fg || !bg) {
      const unknown = !fg ? pair.fg : pair.bg;
      if (!missing.includes(unknown)) missing.push(unknown);
      continue;
    }

    checked += 1;
    const value = ratio(fg, bg);
    if (value < pair.min) {
      problems.push(
        `${theme} тема · ${pair.where}: ${value.toFixed(2)}:1, трябва ${pair.min}:1 ` +
          `(${pair.fg} ${fg} върху ${pair.bg} ${bg})`,
      );
    }
  }
}

if (missing.length > 0) {
  console.error('✖ Липсващи токени:\n');
  for (const name of missing) console.error(`  ${name}`);
  process.exit(1);
}

const drift = checkThemeBlocksMatch();
if (drift.length > 0) {
  console.error('✖ Двата блока за тъмна тема се разминават:\n');
  for (const issue of drift) console.error(`  ${issue}`);
  process.exit(1);
}

if (problems.length > 0) {
  console.error('✖ Недостатъчен контраст:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `✔ Контраст: ${checked} двойки в двете теми — всички по WCAG 2.1 AA;` +
    ' двата блока за тъмна тема съвпадат.',
);
