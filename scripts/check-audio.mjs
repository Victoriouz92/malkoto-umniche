/**
 * Проверка на звуковите записи.
 *
 * Смисълът е същият като при графиката: човекът, който сваля файловете,
 * да разбере след ТРИ файла, че нещо не е наред, а не след двайсет.
 *
 * Какво НЕ проверява: продължителност и сила на звука. И двете искат
 * декодиране, което Node не може без външна зависимост. Те се проверяват
 * в браузъра, когато файловете се вържат към двигателя.
 *
 *   npm run check:audio
 */
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED } from './audio-manifest.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIR = join(ROOT, 'src', 'assets', 'audio');

const ALLOWED = ['.ogg', '.mp3'];

/** Груба преценка за дължина: 1.5 s качествен звук се събира в тези рамки. */
const MIN_BYTES = 4_000;
const MAX_BYTES = 120_000;

const problems = [];
const notes = [];
let found = 0;

for (const [folder, names] of Object.entries(EXPECTED)) {
  const path = join(DIR, folder);

  if (!existsSync(path)) {
    notes.push(`папка audio/${folder} още не съществува (${names.length} файла)`);
    continue;
  }

  const files = readdirSync(path).filter((f) => !f.startsWith('.') && f !== 'README.md');
  const byName = new Map();

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const name = basename(file, ext);

    if (!ALLOWED.includes(ext)) {
      problems.push([`audio/${folder}/${file}`, `форматът ${ext} не се поддържа — ползвай .ogg или .mp3`]);
      continue;
    }
    if (!names.includes(name)) {
      problems.push([`audio/${folder}/${file}`, `няма картинка с това име — очаквам едно от: ${names.join(', ')}`]);
      continue;
    }

    const bytes = statSync(join(path, file)).size;
    if (bytes < MIN_BYTES) {
      problems.push([`audio/${folder}/${file}`, `${bytes} B е прекалено малко — файлът вероятно е празен`]);
    } else if (bytes > MAX_BYTES) {
      problems.push([
        `audio/${folder}/${file}`,
        `${(bytes / 1024).toFixed(0)} KB е много за 1.5 s — отрежи тишината и свали качеството`,
      ]);
    }

    byName.set(name, true);
    found++;
  }

  const missing = names.filter((n) => !byName.has(n));
  if (missing.length > 0) notes.push(`audio/${folder}: липсват ${missing.join(', ')}`);
}

const total = Object.values(EXPECTED).reduce((sum, list) => sum + list.length, 0);

if (problems.length > 0) {
  console.error(`\n✖ ${problems.length} проблема със звука:\n`);
  for (const [where, message] of problems) console.error(`  ${where}\n    ${message}`);
  console.error('\nСпецификацията е в docs/AUDIO.md\n');
  process.exit(1);
}

console.log(`\n✔ Звук: ${found} от ${total} записа на място.`);
for (const note of notes) console.log(`  ${note}`);
if (found === 0) {
  console.log('  Списъкът и изискванията са в docs/AUDIO.md');
}
console.log('');
