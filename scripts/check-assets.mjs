/**
 * Проверка на графиката срещу docs/ASSETS.md.
 *
 * Смисълът е един: художникът да разбере след ТРИ файла, че форматът е
 * сгрешен, а не след четиридесет.
 *
 *   npm run check:assets
 *   npm run check:assets -- design-source   (проверява шаблоните)
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2] ?? join('src', 'assets', 'svg');
const DIR = join(ROOT, target);

/** Профил на всеки клас графика. Класът се познава по първата папка. */
const PROFILES = {
  ui: { viewBox: '0 0 24 24', maxBytes: 4_000, strokeOnly: true },
  scene: { viewBox: '0 0 960 640', maxBytes: 40_000 },
  lineart: { viewBox: '0 0 256 256', maxBytes: 12_000, regions: true },
  _default: { viewBox: '0 0 256 256', maxBytes: 12_000, maxColors: 6 },
};

const BANNED = [
  [/<text[\s>]/i, '<text> — надписите идват от i18n, не от рисунката'],
  [/<image[\s>]/i, '<image> — вграден растер, чупи мащабирането и силуета'],
  [/<foreignObject[\s>]/i, '<foreignObject>'],
  [/<filter[\s>]/i, '<filter> — филтрите забиват слаби устройства'],
  [/<(linear|radial)Gradient[\s>]/i, 'градиент — ползвай два плътни тона'],
  [/<script[\s>]/i, '<script> в SVG'],
  [/\bfilter\s*=\s*"(?!none)/i, 'атрибут filter'],
];

const errors = [];
const warnings = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.toLowerCase().endsWith('.svg')) out.push(full);
  }
  return out;
}

/** Различните цветове, ползвани във fill/stroke. */
function colorsOf(src) {
  const found = new Set();
  for (const m of src.matchAll(/(?:fill|stroke)\s*[:=]\s*"?\s*(#[0-9a-fA-F]{3,8})/g)) {
    if (m[1]) found.add(m[1].toLowerCase());
  }
  return found;
}

const files = walk(DIR);

if (files.length === 0) {
  console.log(`ℹ Няма SVG файлове в ${target}.`);
  console.log('  Спецификацията и списъкът с първата партида са в docs/ASSETS.md.');
  process.exit(0);
}

for (const file of files) {
  const rel = relative(ROOT, file);
  const parts = relative(DIR, file).split(sep);
  const bucket = parts.length > 1 ? parts[0] : '(корен)';
  const profile = PROFILES[bucket] ?? PROFILES._default;
  const src = readFileSync(file, 'utf8');
  const bytes = Buffer.byteLength(src);

  const err = (m) => errors.push({ rel, m });
  const warn = (m) => warnings.push({ rel, m });

  // ── Път и име ──────────────────────────────────────────────
  if (parts.length !== 2) {
    err('Пътят трябва да е точно `категория/име.svg`');
  }
  for (const part of parts) {
    const name = part.replace(/\.svg$/, '');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      err(`"${name}": само малки букви, цифри и тире`);
    }
  }

  // ── Корен ──────────────────────────────────────────────────
  const root = /<svg\b[^>]*>/i.exec(src);
  if (!root) {
    err('Липсва <svg> елемент');
    continue;
  }
  const rootTag = root[0];

  const viewBox = /viewBox\s*=\s*"([^"]+)"/i.exec(rootTag)?.[1]?.trim().replace(/\s+/g, ' ');
  if (!viewBox) {
    err('Липсва viewBox');
  } else if (viewBox !== profile.viewBox) {
    err(`viewBox е "${viewBox}", а за клас "${bucket}" трябва "${profile.viewBox}"`);
  }

  // Отстоянието отпред е задължително: без него `stroke-width` се брои за `width`.
  if (/\s(width|height)\s*=/i.test(rootTag)) {
    err('Махни width/height от <svg> — размерът се задава от кода');
  }

  // ── Забранено съдържание ───────────────────────────────────
  for (const [pattern, label] of BANNED) {
    if (pattern.test(src)) err(`Забранено: ${label}`);
  }

  // ── Размер ─────────────────────────────────────────────────
  if (bytes > profile.maxBytes) {
    err(
      `${(bytes / 1024).toFixed(1)} KB надхвърля тавана от ${(profile.maxBytes / 1024).toFixed(0)} KB — пусни svgo`,
    );
  }

  // ── Правила по клас ────────────────────────────────────────
  if (profile.maxColors) {
    const colors = colorsOf(src);
    if (colors.size > profile.maxColors + 1) {
      err(`${colors.size} различни цвята при таван ${profile.maxColors} (+1 за контура)`);
    } else if (colors.size > profile.maxColors) {
      warn(`${colors.size} цвята — на ръба на допустимото`);
    }
    if ([...colors].some((c) => c === '#000' || c === '#000000')) {
      warn('Чисто черно — контурът трябва да е по-тъмен оттенък на самия обект');
    }
  }

  if (profile.regions) {
    const regions = [...src.matchAll(/data-region\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
    const distinct = new Set(regions);

    // Едно име НАРОЧНО може да стои върху няколко пътя: детето тапва едно
    // колело, а се оцветяват и двете. Броим различните зони, не повторенията.
    if (distinct.size === 0) {
      err('Контурна рисунка без нито един data-region — няма какво да се оцвети');
    } else if (distinct.size === 1) {
      warn('Само една зона — оцветяването се изчерпва с един тап');
    } else if (distinct.size > 8) {
      warn(`${distinct.size} зони — твърде ситно за малко дете, слей няколко`);
    }
    if (!/stroke\s*=\s*"#2[bB]2622"/.test(src)) {
      warn('Контурът не е #2B2622 — оцветяването ще изглежда различно от останалите');
    }
  }

  if (profile.strokeOnly) {
    if (!/stroke\s*=\s*"currentColor"/i.test(src)) {
      err('Интерфейсната икона трябва да е stroke="currentColor"');
    }
    if (/fill\s*=\s*"(?!none")/i.test(src)) {
      err('Интерфейсната икона е само контур — fill трябва да е "none"');
    }
  }

  // ── Чистота ────────────────────────────────────────────────
  if (/<(sodipodi|inkscape|dc):/i.test(src) || /<metadata[\s>]/i.test(src)) {
    warn('Редакторски метаданни — пусни `npx svgo`');
  }
}

// ── Отчет ────────────────────────────────────────────────────────
const group = (list) => {
  const byFile = new Map();
  for (const { rel, m } of list) {
    if (!byFile.has(rel)) byFile.set(rel, []);
    byFile.get(rel).push(m);
  }
  return byFile;
};

if (warnings.length > 0) {
  console.log(`\n⚠ ${warnings.length} предупреждения:\n`);
  for (const [rel, list] of group(warnings)) {
    console.log(`  ${rel}`);
    for (const m of list) console.log(`    ${m}`);
  }
}

if (errors.length > 0) {
  console.error(`\n✖ ${errors.length} проблема в графиката:\n`);
  for (const [rel, list] of group(errors)) {
    console.error(`  ${rel}`);
    for (const m of list) console.error(`    ${m}`);
  }
  console.error('\nСпецификацията е в docs/ASSETS.md\n');
  process.exit(1);
}

console.log(`\n✔ Графика: ${files.length} файла — всичко по спецификация.`);
