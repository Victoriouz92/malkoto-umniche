/**
 * Сглобява първата партида графика от Twemoji.
 *
 * Нищо ръчно. Пуска се веднъж и произвежда 40 обекта и 10 контурни
 * рисунки, всички по docs/ASSETS.md.
 *
 * Twemoji е избран пред OpenMoji заради лиценза: CC BY 4.0 иска само
 * атрибуция, докато CC BY-SA на OpenMoji е „заразен" и би заключил
 * бъдещата собствена графика в същия лиценз.
 *
 * Тази графика е ВРЕМЕННА. Целта ѝ е приложението да е играбилно и
 * тествано с деца, докато оригиналните рисунки се появят. Подмяната е
 * презаписване на файл — кодът не се пипа.
 *
 *   npm run build:assets
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = join(ROOT, 'node_modules', '@twemoji', 'svg');
const OUT = join(ROOT, 'src', 'assets', 'svg');

/**
 * id на актив → кодова точка на емоджито.
 *
 * Избрани са ЦЕЛИ ТЕЛА, където съществуват (🐄 вместо 🐮), защото
 * механиката със сенките иска разпознаваем силует, а една глава в
 * профил не го дава.
 */
const OBJECTS = {
  // Домашни животни
  'animal/cow': '1f404',
  'animal/pig': '1f416',
  'animal/sheep': '1f411',
  'animal/horse': '1f40e',
  'animal/chicken': '1f413',
  'animal/duck': '1f986',
  'animal/goat': '1f410',
  'animal/dog': '1f415',
  'animal/cat': '1f408',
  'animal/rabbit': '1f407',

  // Горски
  'animal/bear': '1f43b',
  'animal/fox': '1f98a',
  'animal/owl': '1f989',
  'animal/squirrel': '1f43f',
  'animal/hedgehog': '1f994',
  'animal/frog': '1f438',

  // Морски
  'animal/fish': '1f41f',
  'animal/whale': '1f40b',
  'animal/octopus': '1f419',
  'animal/crab': '1f980',

  // Храна
  'food/apple': '1f34e',
  'food/banana': '1f34c',
  'food/pear': '1f350',
  'food/grapes': '1f347',
  'food/strawberry': '1f353',
  'food/carrot': '1f955',
  'food/tomato': '1f345',
  'food/bread': '1f35e',

  // Превозни средства
  'vehicle/car': '1f697',
  'vehicle/bus': '1f68c',
  'vehicle/truck': '1f69a',
  'vehicle/tractor': '1f69c',
  'vehicle/train': '1f682',
  'vehicle/airplane': '2708',

  // Природа
  'nature/tree': '1f333',
  'nature/flower': '1f33c',
  'nature/sun': '2600',
  'nature/cloud': '2601',
  'nature/leaf': '1f341',
  'nature/mushroom': '1f344',
};

/**
 * Кои обекти получават и контурен вариант за оцветяване.
 *
 * Подбрани са обекти с 2–5 естествени зони. Едноцветните (слънце, лист)
 * дават една зона и оцветяването свършва с един тап.
 */
const LINEART = [
  'food/apple',
  'vehicle/car',
  'animal/frog',
  'animal/cat',
  'animal/fish',
  'nature/flower',
  'food/strawberry',
  'animal/duck',
  'animal/bear',
  'vehicle/bus',
];

// Twemoji рисува в 36×36. Свиваме до 240 и центрираме в 256 с 8px поле.
const SOURCE_SIZE = 36;
const CANVAS = 256;
const PADDING = 8;
const SCALE = (CANVAS - PADDING * 2) / SOURCE_SIZE;

const INK = '#2B2622';
// 8px контур в крайното платно, изразен в изходните единици.
const LINEART_STROKE = (8 / SCALE).toFixed(2);

function readSource(codepoint) {
  const file = join(SRC, `${codepoint}.svg`);
  if (!existsSync(file)) throw new Error(`Липсва изходен файл: ${codepoint}.svg`);
  return readFileSync(file, 'utf8');
}

/** Изважда съдържанието между <svg …> и </svg>. */
function innerOf(svg) {
  const open = /<svg\b[^>]*>/i.exec(svg);
  if (!open) throw new Error('Изходният файл няма <svg>');
  return svg.slice(open.index + open[0].length).replace(/<\/svg>\s*$/i, '').trim();
}

function wrap(inner, extraAttrs = '') {
  return `<svg viewBox="0 0 ${CANVAS} ${CANVAS}" xmlns="http://www.w3.org/2000/svg"${extraAttrs}>
  <g transform="translate(${PADDING} ${PADDING}) scale(${SCALE.toFixed(4)})">
    ${inner}
  </g>
</svg>
`;
}

function fillsIn(inner) {
  const seen = [];
  for (const m of inner.matchAll(/fill\s*=\s*"(#[0-9a-fA-F]{3,6})"/g)) {
    const c = m[1].toLowerCase();
    if (!seen.includes(c)) seen.push(c);
  }
  return seen;
}

function rgbOf(hex) {
  const h =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

/** Приблизително възприемана разлика. Достатъчно точна за сливане на оттенъци. */
function distance(a, b) {
  const [r1, g1, b1] = rgbOf(a);
  const [r2, g2, b2] = rgbOf(b);
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db,
  );
}

/**
 * Свежда палитрата до най-много `max` цвята.
 *
 * Емоджитата често ползват по три-четири почти еднакви сиви, които окото
 * не различава, но които надуват броя цветове и файла. Сливаме ги към
 * най-често срещания представител, като разширяваме прага, докато се
 * вместим. Ако и при най-широкия праг не стигнем — оставяме както е,
 * защото по-нататъшното сливане вече убива разпознаваемостта.
 */
function mergeColors(inner, max) {
  const counts = new Map();
  for (const m of inner.matchAll(/fill\s*=\s*"(#[0-9a-fA-F]{3,6})"/g)) {
    const c = m[1].toLowerCase();
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  if (counts.size <= max) return { svg: inner, colors: counts.size, merged: 0 };

  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);

  for (const threshold of [24, 40, 60, 85, 115, 150]) {
    const reps = [];
    const mapping = new Map();
    for (const color of ordered) {
      const near = reps.find((r) => distance(r, color) < threshold);
      if (near) mapping.set(color, near);
      else {
        reps.push(color);
        mapping.set(color, color);
      }
    }
    if (reps.length <= max) {
      const svg = inner.replace(
        /fill\s*=\s*"(#[0-9a-fA-F]{3,6})"/g,
        (_m, c) => `fill="${mapping.get(String(c).toLowerCase()) ?? c}"`,
      );
      return { svg, colors: reps.length, merged: counts.size - reps.length };
    }
  }

  // Праговете не стигнаха (влак с 13 цвята). Взимаме `max`-те най-често
  // срещани цвята за представители и картираме всеки останал към най-близкия
  // от тях. Таванът е гарантиран.
  const reps = ordered.slice(0, max);
  const mapping = new Map(
    ordered.map((c) => [
      c,
      reps.reduce((best, r) => (distance(r, c) < distance(best, c) ? r : best), reps[0]),
    ]),
  );
  const svg = inner.replace(
    /fill\s*=\s*"(#[0-9a-fA-F]{3,6})"/g,
    (_m, c) => `fill="${mapping.get(String(c).toLowerCase()) ?? c}"`,
  );
  return { svg, colors: reps.length, merged: counts.size - reps.length };
}

/**
 * Прави контурна рисунка от плътен обект.
 *
 * Всяко запълване става бяло, всеки път получава тъмен контур. Пътищата,
 * които са СПОДЕЛЯЛИ един цвят, стават една зона за оцветяване — така
 * зоните излизат сами от рисунката, без някой да ги описва на ръка.
 */
function toLineart(inner) {
  const colors = fillsIn(inner);
  const regionOf = new Map(colors.map((c, i) => [c, `area-${i + 1}`]));

  const out = inner.replace(
    /fill\s*=\s*"(#[0-9a-fA-F]{3,6})"/g,
    (_match, color) =>
      `fill="#FFFFFF" data-region="${regionOf.get(String(color).toLowerCase())}"`,
  );

  return {
    svg: out,
    regions: regionOf.size,
    strokeAttrs: ` fill="#FFFFFF" stroke="${INK}" stroke-width="${LINEART_STROKE}" stroke-linejoin="round" stroke-linecap="round"`,
  };
}

// ── Изпълнение ───────────────────────────────────────────────────
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });

const report = [];
let written = 0;

for (const [id, codepoint] of Object.entries(OBJECTS)) {
  const raw = innerOf(readSource(codepoint));
  const { svg: inner, colors, merged } = mergeColors(raw, 6);
  const file = join(OUT, `${id}.svg`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, wrap(inner), 'utf8');
  written++;
  report.push({ id, colors, merged });
}

for (const id of LINEART) {
  const codepoint = OBJECTS[id];
  if (!codepoint) throw new Error(`Няма обект "${id}" за контурен вариант`);

  // Сливаме цветовете ПРЕДИ извеждането: зоните за оцветяване излизат от
  // цветовете, така че 13 оттенъка биха дали 13 ситни зони. Таванът от 5
  // е по-нисък от този за обектите — детето оцветява с пръст, не с мишка.
  const { svg: base } = mergeColors(innerOf(readSource(codepoint)), 5);
  const { svg, regions, strokeAttrs } = toLineart(base);
  const name = id.split('/')[1];
  const file = join(OUT, 'lineart', `${name}.svg`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, wrap(svg, strokeAttrs), 'utf8');
  written++;
  report.push({ id: `lineart/${name}`, colors: 2, regions });
}

writeFileSync(
  join(OUT, 'ATTRIBUTION.md'),
  `# Произход на графиката

Файловете в тази папка са **генерирани**, не рисувани на ръка. Не ги
редактирай директно — промените се губят при следващото пускане на
\`npm run build:assets\`.

## Източник

Изведени от [Twemoji](https://github.com/jdecked/twemoji), лицензиран под
**CC BY 4.0**. Изисква се посочване на източника навсякъде, където
графиката се показва публично.

Конвейерът мащабира 36×36 до 256×256 с поле от 8px и извежда контурните
варианти автоматично, като групира пътищата по общ цвят в зони за
оцветяване.

## Статус: временна

Тази графика съществува, за да е приложението играбилно и тествано с
деца, докато оригиналните рисунки се появят. Подмяната е презаписване на
файл — нито ред код не се променя.
`,
  'utf8',
);

const merged = report.filter((r) => (r.merged ?? 0) > 0);
const multi = report.filter((r) => r.colors > 6);

console.log(`\n✔ Графика: ${written} файла в src/assets/svg/`);
if (merged.length > 0) {
  console.log(`\n  Слети оттенъци в ${merged.length} обекта:`);
  for (const r of merged) console.log(`    ${r.id} — ${r.merged} слети, остават ${r.colors}`);
}
if (multi.length > 0) {
  console.log(`\n  ⚠ Още над 6 цвята: ${multi.map((r) => r.id).join(', ')}`);
}
console.log('');
