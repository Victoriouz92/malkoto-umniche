/**
 * Съставя docs/mechanics/README.md от самите данни — T1.2 от PLAN.md.
 *
 * Класацията НЕ се пише на ръка. Написана веднъж, тя щеше да се разминава
 * с каталога още при първата промяна.
 *
 *   npm run build:mechanics
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIR = join(ROOT, 'docs', 'mechanics');

const CATEGORY_BG = {
  'visual-perception': 'Зрително възприятие',
  memory: 'Памет',
  'matching-classification': 'Съпоставяне и класифициране',
  'logic-reasoning': 'Логика и разсъждение',
  'spatial-construction': 'Пространство и построяване',
  numeracy: 'Числа и смятане',
  literacy: 'Букви и четене',
  'language-vocabulary': 'Език и речник',
  'fine-motor': 'Фина моторика',
  'attention-executive': 'Внимание и самоовладяване',
  'creativity-expression': 'Творчество',
  auditory: 'Слух',
  'social-emotional': 'Емоции и общуване',
  'everyday-knowledge': 'Знания за света',
};

const TIER_BG = {
  1: 'Ядро — задължително в MVP',
  2: 'Висока стойност',
  3: 'Добра',
  4: 'Допълваща',
};

/** Шестте двигателя на MVP-то (T4.2 от PLAN.md). */
const MVP_ENGINES = ['puzzle', 'memory', 'matching', 'sorting', 'coloring', 'counting'];

const all = readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && f !== 'schema.json')
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));

const ranked = [...all].sort(
  (a, b) => a.tier - b.tier || b.value - a.value || a.id.localeCompare(b.id),
);

const byEngine = new Map();
for (const m of all) {
  if (!byEngine.has(m.engine)) byEngine.set(m.engine, []);
  byEngine.get(m.engine).push(m);
}

const byCategory = new Map();
for (const m of all) {
  if (!byCategory.has(m.category)) byCategory.set(m.category, []);
  byCategory.get(m.category).push(m);
}

const ageCoverage = Array.from({ length: 7 }, (_, i) => {
  const age = i + 2;
  return { age, count: all.filter((m) => m.ageMin <= age && m.ageMax >= age).length };
});

const lines = [];
const w = (s = '') => lines.push(s);

w('# Каталог с образователни механики');
w();
w('> **Генериран файл.** Не го редактирай — промените се губят при следващото');
w('> пускане на `npm run build:mechanics`. Данните са в `0*.json` в тази папка.');
w();
w(`${all.length} механики за деца 2–8 г., подредени по образователна стойност.`);
w();
w('Каталогът НЕ е код. Той е основата, върху която се пишат активностите:');
w('всяка бъдеща активност посочва механиката, която реализира, и наследява');
w('от нея умения, възрастов обхват и правила за достъпност.');
w();

// ── Обобщение ────────────────────────────────────────────────────
w('## Обобщение');
w();
w('| Ниво | Какво значи | Брой |');
w('|---|---|---|');
for (const t of [1, 2, 3, 4]) {
  w(`| **T${t}** | ${TIER_BG[t]} | ${all.filter((m) => m.tier === t).length} |`);
}
w();
w('| Възраст | Подходящи механики |');
w('|---|---|');
for (const { age, count } of ageCoverage) w(`| ${age} г. | ${count} |`);
w();
const noFail = all.filter((m) => m.noFail).length;
w(`Механики без понятие за грешка: **${noFail}** от ${all.length}.`);
w();

// ── Класация ─────────────────────────────────────────────────────
w('## Класация');
w();
w('Стойността отчита обхвата на уменията, възрастовия диапазон, силата на');
w('доказателствата зад механиката и това колко пъти може да се преиграе,');
w('без да омръзне.');
w();
w('| # | Механика | Ниво | Ст. | Двигател | Възраст | Категория |');
w('|---|---|---|---|---|---|---|');
ranked.forEach((m, i) => {
  w(
    `| ${i + 1} | **${m.name}** <br><sub>${m.id} · ${m.slug}</sub> | T${m.tier} | ${m.value} | \`${m.engine}\` | ${m.ageMin}–${m.ageMax} | ${CATEGORY_BG[m.category]} |`,
  );
});
w();

// ── Двигатели ────────────────────────────────────────────────────
w('## Покритие по двигатели');
w();
w(`${all.length} механики се реализират от **${byEngine.size} двигателя**. Това е`);
w('целият смисъл на архитектурата: ново съдържание е нов JSON, не нов код.');
w();
w('| Двигател | Механики | Кои |');
w('|---|---|---|');
const engineRows = [...byEngine.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [engine, list] of engineRows) {
  const names = list.map((m) => m.name).join(', ');
  w(`| \`${engine}\` | ${list.length} | ${names} |`);
}
w();

// ── MVP ──────────────────────────────────────────────────────────
const mvp = ranked.filter((m) => MVP_ENGINES.includes(m.engine) && m.tier <= 2);
w('## Какво влиза в MVP-то');
w();
w('Шестте двигателя от T4.2 (`' + MVP_ENGINES.join('`, `') + '`) покриват');
w(`**${mvp.length}** механики от ниво T1 и T2 — предостатъчно за първите 40 активности.`);
w();
w('| Механика | Ниво | Двигател | Възраст |');
w('|---|---|---|---|');
for (const m of mvp) {
  w(`| ${m.name} | T${m.tier} | \`${m.engine}\` | ${m.ageMin}–${m.ageMax} |`);
}
w();

// ── Категории ────────────────────────────────────────────────────
w('## По категории');
w();
w('| Категория | Брой | Механики |');
w('|---|---|---|');
const catRows = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [cat, list] of catRows) {
  w(`| ${CATEGORY_BG[cat]} | ${list.length} | ${list.map((m) => m.name).join(', ')} |`);
}
w();

w('---');
w();
w('## Формат на запис');
w();
w('Схемата е в [`schema.json`](schema.json). Всеки запис описва целта,');
w('геймплей примката, правилата, идеите за обратна връзка, анимация и звук,');
w('съображенията за достъпност, темите и вариациите.');
w();
w('Проверка на целия каталог:');
w();
w('```bash');
w('npm run check:mechanics');
w('```');

writeFileSync(join(DIR, 'README.md'), lines.join('\n') + '\n', 'utf8');
console.log(`✔ docs/mechanics/README.md — ${all.length} механики, ${byEngine.size} двигателя`);
