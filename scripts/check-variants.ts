/**
 * Проверка на вариантите.
 *
 * Вариантът преоблича задачата — и точно затова може тихо да я счупи:
 * две равни групи в „кое е повече“ нямат верен отговор, а дупка на трета
 * позиция в шарката прави правилото невидимо. Такъв дефект не се вижда в
 * кода; вижда се от дете, което гледа задача без решение.
 *
 * Затова всеки вариант на всяка активност минава през СЪЩАТА схема, през
 * която минава и авторският JSON. Ако не мине — червен build.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activitySchema } from '../src/content/schema/activity';
import { schemaFor } from '../src/engines/schemas';
import { variantRandom } from '../src/engines/shared/variant';
import { countingVariant } from '../src/engines/counting/variants';
import { compareVariant } from '../src/engines/compare/variants';
import { lettersVariant } from '../src/engines/letters/variants';
import { patternVariant } from '../src/engines/pattern/variants';
import { sequencingVariant } from '../src/engines/sequencing/variants';
import { sortingVariant } from '../src/engines/sorting/variants';
import { soundMatchVariant } from '../src/engines/sound-match/variants';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ACTIVITIES_DIR = join(ROOT, 'src', 'content', 'activities');

/** Докъде се проверява. Повече от това дете не изиграва на един път. */
const VARIANTS = 8;

const BUILDERS: Record<string, (params: never, random: () => number, variant: number) => unknown> =
  {
    counting: (params, random) => countingVariant(params, random),
    compare: (params, random) => compareVariant(params, random),
    letters: (params, random) => lettersVariant(params, random),
    pattern: (params, random) => patternVariant(params, random),
    sequencing: (params, _random, variant) => sequencingVariant(params, variant),
    sorting: (params, random) => sortingVariant(params, random),
    'sound-match': (params, random) => soundMatchVariant(params, random),
  };

const problems: string[] = [];
let checked = 0;

for (const entry of readdirSync(ACTIVITIES_DIR)) {
  if (extname(entry) !== '.json') continue;

  const raw = JSON.parse(readFileSync(join(ACTIVITIES_DIR, entry), 'utf8')) as unknown;
  const activity = activitySchema.safeParse(raw);
  if (!activity.success) continue; // Базовият валидатор вече го е докладвал.

  const build = BUILDERS[activity.data.engine];
  if (!build) continue;

  const engineSchema = schemaFor(activity.data.engine);
  if (!engineSchema) continue;

  const authored = engineSchema.paramsSchema.safeParse(activity.data.params);
  if (!authored.success) continue;

  for (let variant = 1; variant <= VARIANTS; variant++) {
    const produced = build(
      authored.data as never,
      variantRandom(activity.data.id, variant),
      variant,
    );
    const result = engineSchema.paramsSchema.safeParse(produced);
    checked += 1;

    if (!result.success) {
      const first = result.error.issues[0];
      problems.push(
        `${activity.data.id} · вариант ${variant}: ${first?.path.join('.') ?? ''} — ${first?.message ?? 'невалиден'}`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error('✖ Счупени варианти:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`✔ Варианти: ${checked} проверени — всички валидни.`);
