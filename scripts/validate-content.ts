/**
 * Валидатор на съдържанието — T0.6 от PLAN.md.
 *
 * Пуска се в `npm run check`, значи и преди всеки build. Счупена активност
 * трябва да вдигне ЧЕРВЕН BUILD, а не бял екран пред тригодишно дете.
 *
 * Проверява:
 *   1. всеки JSON срещу базовата Activity схема
 *   2. уникалност на id
 *   3. съвпадение между id на файла и id в него
 *   4. че titleKey и parentNoteKey съществуват в българския речник
 *   5. че asset id-тата са регистрирани (щом манифестът се появи, T2.7)
 *
 * Проверката на `params` срещу схемата на конкретния двигател се добавя в
 * T2.3, когато двигателите вече съществуват.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, basename, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activitySchema } from '../src/content/schema/activity';
import { schemaFor, implementedEngines } from '../src/engines/schemas';
import { bg } from '../src/i18n/bg';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ACTIVITIES_DIR = join(ROOT, 'src', 'content', 'activities');
const ASSETS_DIR = join(ROOT, 'src', 'assets', 'svg');
const MECHANICS_DIR = join(ROOT, 'docs', 'mechanics');

type Problem = { file: string; message: string };

const problems: Problem[] = [];
const seenIds = new Map<string, string>();

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (extname(entry) === '.json') out.push(full);
  }
  return out;
}

/**
 * Регистрираните активи.
 *
 * Чете се направо от папката — точно както прави Vite по време на build.
 * Междинен манифест би бил още едно място, което да се разсинхронизира.
 */
function knownAssetIds(): Set<string> {
  const ids = new Set<string>();
  for (const file of walkSvg(ASSETS_DIR)) {
    ids.add(
      relative(ASSETS_DIR, file)
        .replace(/\.svg$/, '')
        .split(sep)
        .join('.'),
    );
  }
  return ids;
}

function walkSvg(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkSvg(full));
    else if (extname(entry) === '.svg') out.push(full);
  }
  return out;
}

type Mechanic = { id: string; engine: string; ageMin: number; ageMax: number; name: string };

/** Каталогът с механики — активностите се сверяват срещу него. */
function loadMechanics(): Map<string, Mechanic> {
  const map = new Map<string, Mechanic>();
  if (!existsSync(MECHANICS_DIR)) return map;
  for (const file of readdirSync(MECHANICS_DIR)) {
    if (!file.endsWith('.json') || file === 'schema.json') continue;
    const list = JSON.parse(readFileSync(join(MECHANICS_DIR, file), 'utf8')) as Mechanic[];
    for (const m of list) map.set(m.id, m);
  }
  return map;
}

const files = walk(ACTIVITIES_DIR);
const assetIds = knownAssetIds();
const mechanics = loadMechanics();
const dictKeys = new Set(Object.keys(bg));

for (const file of files) {
  const rel = relative(ROOT, file);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    problems.push({ file: rel, message: `Невалиден JSON: ${(err as Error).message}` });
    continue;
  }

  const result = activitySchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.length ? issue.path.join('.') : '(корен)';
      problems.push({ file: rel, message: `${path}: ${issue.message}` });
    }
  }

  /**
   * Проверките отдолу работят и върху файл, паднал на схемата.
   *
   * Ако спрем при първата грешка, авторът на съдържание оправя по един
   * проблем на пускане. При стотици активности това е часове чакане за
   * нищо — затова четем каквото можем директно от суровия обект.
   */
  const shape = (raw ?? {}) as Partial<Record<string, unknown>>;
  const id = typeof shape['id'] === 'string' ? shape['id'] : null;

  const expected = basename(file, '.json');
  if (id !== null && expected !== id) {
    problems.push({
      file: rel,
      message: `Името на файла ("${expected}") не съвпада с id ("${id}")`,
    });
  }

  if (id !== null) {
    const previous = seenIds.get(id);
    if (previous) {
      problems.push({ file: rel, message: `Дублирано id, вече е ползвано в ${previous}` });
    } else {
      seenIds.set(id, rel);
    }
  }

  for (const field of ['titleKey', 'parentNoteKey'] as const) {
    const key = shape[field];
    if (typeof key === 'string' && !dictKeys.has(key)) {
      problems.push({ file: rel, message: `${field}: липсва ключ в речника — "${key}"` });
    }
  }

  if (Array.isArray(shape['assets'])) {
    for (const asset of shape['assets']) {
      if (typeof asset === 'string' && !assetIds.has(asset)) {
        problems.push({ file: rel, message: `Нерегистриран asset: "${asset}"` });
      }
    }
  }

  // ── params срещу схемата на двигателя ──────────────────────────
  // Тук е истинската полза от разделянето: активността носи свободен
  // `params`, а всеки двигател казва как изглежда неговият.
  const engine = shape['engine'];
  if (typeof engine === 'string') {
    const engineSchema = schemaFor(engine as never);
    if (!engineSchema) {
      problems.push({
        file: rel,
        message: `Двигателят "${engine}" още не е реализиран — активността не може да се пусне`,
      });
    } else {
      const parsed = engineSchema.paramsSchema.safeParse(shape['params']);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const path = issue.path.length ? issue.path.join('.') : '(корен)';
          problems.push({ file: rel, message: `params.${path}: ${issue.message}` });
        }
      }
    }
  }

  // ── Сверяване с каталога ───────────────────────────────────────
  // Кръговете за броене трябва да вървят плавно нагоре. Скок като 5 → 2 създава
  // рязко различен брой действия и изглежда като случайно съдържание.
  if (engine === 'counting') {
    const params = shape['params'];
    const rounds =
      params && typeof params === 'object' && Array.isArray((params as Record<string, unknown>)['rounds'])
        ? ((params as Record<string, unknown>)['rounds'] as unknown[])
        : [];
    const counts = rounds
      .map((round) =>
        round && typeof round === 'object' ? (round as Record<string, unknown>)['count'] : null,
      )
      .filter((count): count is number => typeof count === 'number');
    for (let index = 1; index < counts.length; index += 1) {
      const previous = counts[index - 1] ?? 0;
      const current = counts[index] ?? 0;
      if (current < previous || current - previous > 2) {
        problems.push({
          file: rel,
          message: `Кръговете за броене трябва да нарастват плавно; намерен е скок ${previous} → ${current}`,
        });
      }
    }
  }

  const mechanicId = shape['mechanic'];
  if (typeof mechanicId === 'string' && mechanics.size > 0) {
    const mechanic = mechanics.get(mechanicId);
    if (!mechanic) {
      problems.push({ file: rel, message: `Няма механика "${mechanicId}" в каталога` });
    } else {
      if (shape['engine'] !== mechanic.engine) {
        problems.push({
          file: rel,
          message: `Двигателят е "${String(shape['engine'])}", а механика ${mechanicId} („${mechanic.name}“) се реализира от "${mechanic.engine}"`,
        });
      }
      const lo = shape['ageMin'];
      const hi = shape['ageMax'];
      if (typeof lo === 'number' && lo < mechanic.ageMin) {
        problems.push({
          file: rel,
          message: `ageMin ${lo} е под долната граница ${mechanic.ageMin} на механика ${mechanicId}`,
        });
      }
      if (typeof hi === 'number' && hi > mechanic.ageMax) {
        problems.push({
          file: rel,
          message: `ageMax ${hi} е над горната граница ${mechanic.ageMax} на механика ${mechanicId}`,
        });
      }
    }
  }
}

// ── Отчет ────────────────────────────────────────────────────────
if (problems.length > 0) {
  console.error(`\n✖ ${problems.length} проблема в съдържанието:\n`);
  for (const p of problems) console.error(`  ${p.file}\n    ${p.message}`);
  console.error('');
  process.exit(1);
}

const implemented = implementedEngines();
const notes: string[] = [
  `${assetIds.size} актива`,
  `${mechanics.size} механики`,
  implemented.length > 0
    ? `${implemented.length} реализирани двигателя`
    : 'още няма реализиран двигател (Фаза 4)',
];

console.log(
  `✔ Съдържание: ${files.length} ${files.length === 1 ? 'активност' : 'активности'} — всичко валидно.`,
);
console.log(`  (${notes.join('; ')})`);
