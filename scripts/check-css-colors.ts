/**
 * Твърдо кодирани цветове в CSS — част от одита по T6.1.
 *
 * Правило 11 от DESIGN-BIBLE: цветовете живеят в `tokens.css`. ESLint го
 * налага за `.ts` и `.tsx`, но CSS-ът остана без пазач и там се насъбраха
 * над сто и петдесет стойности.
 *
 * Това не е само въпрос на ред. Цвят, изписан направо в CSS:
 *   • не се сменя в тъмната тема — остава светъл върху тъмен фон;
 *   • е невидим за `check-contrast.ts`, значи никой не проверява дали се
 *     чете.
 *
 * Пълното изчистване иска решение за всеки цвят поотделно и не се прави
 * наведнъж. Затова тук стои ХРАПОВИК: текущият брой е записан и може
 * само да НАМАЛЯВА. Нов твърдо кодиран цвят вдига червен build; изчистен
 * файл се сваля с една цифра в таблицата.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

/** Колко твърдо кодирани цвята има днес. Само надолу. */
const BASELINE: Readonly<Record<string, number>> = {
  'landing/landing.module.css': 47,
  'kid/kid.module.css': 26,
  'engines/rhythm/Engine.module.css': 17,
  'engines/route-program/Engine.module.css': 12,
  'engines/shopping/Engine.module.css': 12,
  'engines/memory/RecallEngine.module.css': 11,
  'engines/shape-builder/Engine.module.css': 10,
  'engines/road-builder/Engine.module.css': 7,
  'kid/SoftStop.module.css': 5,
  'engines/coloring/Engine.module.css': 3,
  'engines/letters/Engine.module.css': 2,
  'design-system/base.css': 1,
  'design-system/Button.module.css': 1,
  'design-system/preview/DesignSystemPreview.module.css': 1,
  'engines/shared/creative.module.css': 1,
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (extname(entry) === '.css') out.push(full);
  }
  return out;
}

const problems: string[] = [];
const improved: string[] = [];
let total = 0;

for (const file of walk(SRC)) {
  const name = relative(SRC, file).replaceAll('\\', '/');
  if (name === 'design-system/tokens.css') continue;

  const count = (readFileSync(file, 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
  total += count;
  const allowed = BASELINE[name] ?? 0;

  if (count > allowed) {
    problems.push(
      `${name}: ${count} твърдо кодирани цвята, допустими са ${allowed}. ` +
        'Ползвай токен от tokens.css.',
    );
  } else if (count < allowed) {
    improved.push(`${name}: вече ${count} вместо ${allowed} — свали числото в BASELINE.`);
  }
}

if (problems.length > 0) {
  console.error('✖ Нови твърдо кодирани цветове в CSS:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

if (improved.length > 0) {
  console.error('✖ Храповикът е остарял — има по-малко цветове, отколкото пише:\n');
  for (const line of improved) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`✔ CSS цветове: ${total} твърдо кодирани, нито един нов (дългът само намалява).`);
