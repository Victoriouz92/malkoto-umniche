import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describeCover } from '../src/kid/covers/model';
import type { CoverSource } from '../src/kid/covers/model';
import { SHAPES, SHAPE_COLORS } from '../src/engines/shared/shapeNames';

const root = resolve('src/content/activities');
const activities = readdirSync(root, { recursive: true }).filter((name): name is string =>
  typeof name === 'string' && name.endsWith('.json')).map(name =>
  JSON.parse(readFileSync(resolve(root, name), 'utf8')) as CoverSource & { category: string; difficulty: number });
activities.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
const problems: string[] = [];
const seen = new Map<string, string>();
const indices = new Map<string, number>();
for (const activity of activities) {
  const index = indices.get(activity.category) ?? 0;
  indices.set(activity.category, index + 1);
  const cover = describeCover(activity, index % 6);
  if (!cover.items.length && !cover.path) problems.push(`${activity.id}: празна корица`);
  for (const item of cover.items) {
    if (![item.x, item.y, item.size].every(Number.isFinite) || item.size <= 0) problems.push(`${activity.id}: невалидни координати`);
    const picture = item.picture;
    if (picture.kind === 'asset') {
      if (!existsSync(resolve('src/assets/svg', picture.value.replaceAll('.', '/') + '.svg'))) problems.push(`${activity.id}: липсва ${picture.value}`);
      if (!JSON.stringify(activity.params).includes(picture.value) && !activity.assets.includes(picture.value)) problems.push(`${activity.id}: несвързана картинка ${picture.value}`);
    }
    if (picture.kind === 'shape' && (!SHAPES.includes(picture.value as typeof SHAPES[number]) || !SHAPE_COLORS.includes(picture.color as typeof SHAPE_COLORS[number]))) problems.push(`${activity.id}: невалидна форма`);
  }
  const signature = activity.category + JSON.stringify(cover);
  if (seen.has(signature)) problems.push(`${activity.id}: еднаква корица с ${seen.get(signature)}`);
  seen.set(signature, activity.id);
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log(`✔ ${activities.length} корици: без празни изображения, чужди предмети и еднакви корици в категория.`);
