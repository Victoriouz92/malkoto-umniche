/**
 * Проверка на каталога с механики — T1.1 от PLAN.md.
 *
 * Сто записа, писани на ръка, гарантирано съдържат грешки. Тази проверка
 * ги хваща, преди каталогът да послужи за основа на съдържанието.
 *
 * Списъците с двигатели, умения и теми се четат ДИРЕКТНО от
 * src/content/schema/constants.ts — за да не се разминат каталогът и кодът.
 *
 *   npm run check:mechanics
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIR = join(ROOT, 'docs', 'mechanics');
const CONSTANTS = join(ROOT, 'src', 'content', 'schema', 'constants.ts');

/** Изважда `export const NAME = [...] as const` от TypeScript файла. */
function constantList(source, name) {
  const block = new RegExp(`export const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`).exec(
    source,
  );
  if (!block?.[1]) throw new Error(`Не намирам ${name} в constants.ts`);
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const ts = readFileSync(CONSTANTS, 'utf8');
const ENGINES = constantList(ts, 'ENGINE_IDS');
const SKILLS = constantList(ts, 'SKILLS');
const THEMES = constantList(ts, 'THEMES');

const CATEGORIES = [
  'visual-perception',
  'memory',
  'matching-classification',
  'logic-reasoning',
  'spatial-construction',
  'numeracy',
  'literacy',
  'language-vocabulary',
  'fine-motor',
  'attention-executive',
  'creativity-expression',
  'auditory',
  'social-emotional',
  'everyday-knowledge',
];

const MIN_ITEMS = {
  skills: 1,
  rules: 2,
  feedback: 2,
  animation: 1,
  audio: 1,
  a11y: 1,
  themes: 1,
  variations: 2,
  assetsNeeded: 1,
};

const REQUIRED = [
  'id', 'slug', 'name', 'category', 'tier', 'value', 'engine',
  'ageMin', 'ageMax', 'difficulty', 'goal', 'skills', 'loop', 'rules',
  'feedback', 'animation', 'audio', 'a11y', 'themes', 'variations',
  'noFail', 'assetsNeeded',
];

const problems = [];
const seenIds = new Map();
const seenSlugs = new Map();
const all = [];

if (!existsSync(DIR)) {
  console.log('ℹ Няма папка docs/mechanics.');
  process.exit(0);
}

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && f !== 'schema.json')
  .sort();

for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  } catch (err) {
    problems.push([file, `Невалиден JSON: ${err.message}`]);
    continue;
  }
  if (!Array.isArray(data)) {
    problems.push([file, 'Файлът трябва да съдържа масив от механики']);
    continue;
  }

  for (const m of data) {
    const where = `${file} → ${m?.id ?? '(без id)'}`;
    const err = (msg) => problems.push([where, msg]);

    for (const field of REQUIRED) {
      if (m[field] === undefined) err(`липсва поле "${field}"`);
    }
    if (typeof m.id !== 'string') continue;

    if (!/^m\d{3}$/.test(m.id)) err(`id "${m.id}" не е във вида m000`);
    if (seenIds.has(m.id)) err(`дублирано id, вече е в ${seenIds.get(m.id)}`);
    else seenIds.set(m.id, file);

    if (typeof m.slug === 'string') {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.slug)) err(`slug "${m.slug}" е в грешен вид`);
      if (seenSlugs.has(m.slug)) err(`дублиран slug, вече е в ${seenSlugs.get(m.slug)}`);
      else seenSlugs.set(m.slug, m.id);
    }

    if (!CATEGORIES.includes(m.category)) err(`непозната категория "${m.category}"`);
    if (!ENGINES.includes(m.engine)) err(`непознат двигател "${m.engine}"`);

    if (!(Number.isInteger(m.tier) && m.tier >= 1 && m.tier <= 4)) err('tier трябва да е 1–4');
    if (!(Number.isInteger(m.value) && m.value >= 1 && m.value <= 10)) err('value трябва да е 1–10');

    for (const field of ['ageMin', 'ageMax']) {
      const v = m[field];
      if (!(Number.isInteger(v) && v >= 2 && v <= 8)) err(`${field} трябва да е 2–8`);
    }
    if (m.ageMax < m.ageMin) err('ageMax е под ageMin');

    if (!Array.isArray(m.difficulty) || m.difficulty.length !== 2) {
      err('difficulty трябва да е [най-лесен, най-труден]');
    } else {
      const [lo, hi] = m.difficulty;
      const ok = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
      if (!ok(lo) || !ok(hi)) err('стойностите в difficulty трябва да са 1–5');
      else if (lo > hi) err('difficulty е обърнато');
    }

    for (const [field, min] of Object.entries(MIN_ITEMS)) {
      const v = m[field];
      if (!Array.isArray(v)) err(`"${field}" трябва да е списък`);
      else if (v.length < min) err(`"${field}" иска поне ${min} елемента, има ${v.length}`);
    }

    for (const s of m.skills ?? []) if (!SKILLS.includes(s)) err(`непознато умение "${s}"`);
    for (const t of m.themes ?? []) if (!THEMES.includes(t)) err(`непозната тема "${t}"`);

    if (typeof m.noFail !== 'boolean') err('noFail трябва да е булево');
    // Принцип 2 от PLAN.md важи и за каталога, не само за активностите.
    else if (m.ageMin <= 4 && m.noFail !== true) {
      err('механика за деца до 4 г. трябва да е noFail: true');
    }

    // Името е кратко по замисъл („Къде беше“); целта и примката — не.
    for (const [field, min] of [['name', 4], ['goal', 30], ['loop', 30]]) {
      if (typeof m[field] !== 'string' || m[field].trim().length < min) {
        err(`"${field}" е празно или твърде кратко (иска поне ${min} знака)`);
      }
    }

    all.push(m);
  }
}

if (problems.length > 0) {
  console.error(`\n✖ ${problems.length} проблема в каталога:\n`);
  for (const [where, msg] of problems) console.error(`  ${where}\n    ${msg}`);
  console.error('');
  process.exit(1);
}

// ── Отчет ────────────────────────────────────────────────────────
const byCategory = new Map();
const byEngine = new Map();
const byTier = new Map();
for (const m of all) {
  byCategory.set(m.category, (byCategory.get(m.category) ?? 0) + 1);
  byEngine.set(m.engine, (byEngine.get(m.engine) ?? 0) + 1);
  byTier.set(m.tier, (byTier.get(m.tier) ?? 0) + 1);
}

console.log(`\n✔ Каталог: ${all.length} механики в ${files.length} файла — всичко валидно.\n`);
console.log(
  `  Нива: ${[1, 2, 3, 4].map((t) => `T${t}=${byTier.get(t) ?? 0}`).join('  ')}`,
);

const uncovered = ENGINES.filter((e) => !byEngine.has(e));
if (uncovered.length > 0) {
  console.log(`\n  Двигатели без нито една механика: ${uncovered.join(', ')}`);
}

const missingCategories = CATEGORIES.filter((c) => !byCategory.has(c));
if (missingCategories.length > 0) {
  console.log(`  Категории без записи: ${missingCategories.join(', ')}`);
}
console.log('');
