import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../src/content/activities/', import.meta.url);
const files = (await readdir(root)).filter((file) => file.endsWith('.json'));
const issues = [];

for (const file of files) {
  const activity = JSON.parse(await readFile(new URL(file, root), 'utf8'));
  const p = activity.params;
  if (activity.engine === 'memory' && (!p.mode || p.mode === 'pairs')) {
    if (activity.ageMax >= 4 && p.items.length < 4) issues.push(`${activity.id}: малка дъска остава достъпна след 3 г.`);
    if (activity.ageMax >= 5 && p.items.length < 5) issues.push(`${activity.id}: липсва усложняване на паметта след 4 г.`);
    if (activity.ageMax >= 6 && p.items.length < 6) issues.push(`${activity.id}: начална памет в каталога за 6 г.`);
  }
  if (!['coloring', 'drawing'].includes(activity.engine) && activity.ageMin === 2 && activity.ageMax >= 5) {
    issues.push(`${activity.id}: една и съща начална задача е означена за 2 и 5 г.`);
  }
  if (activity.engine === 'counting' && activity.ageMin >= 5 && p.guided !== false) {
    issues.push(`${activity.id}: отговорът се подсказва автоматично при броене за по-големите.`);
  }
  if (activity.ageMin <= 3 && activity.difficulty > 2) {
    issues.push(`${activity.id}: трудност ${activity.difficulty} започва от ${activity.ageMin} г.`);
  }
  if (activity.difficulty >= 4 && activity.ageMin < 5) {
    issues.push(`${activity.id}: висока трудност започва преди 5 г.`);
  }
  if (activity.ageMin <= 4 && activity.a11y?.requiresPrecision) {
    issues.push(`${activity.id}: изисква прецизност за дете до 4 г.`);
  }
  if (activity.ageMin <= 3 && activity.durationSec > 180) {
    issues.push(`${activity.id}: прекалено дълга единична активност за 2–3 г.`);
  }
}

if (issues.length > 0) {
  console.error(`✘ Възрастова проверка:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`✔ Възраст: ${files.length} активности — без рискови несъответствия.`);
}
