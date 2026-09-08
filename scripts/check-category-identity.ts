import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { categoryOwner, sameSessionFamily } from '../src/content/categoryIdentity';

const root = resolve('src/content/activities');
assert.equal(sameSessionFamily({ category: 'animals', engine: 'sound-match' }, { category: 'vehicles', engine: 'sound-match' }), false);
assert.equal(sameSessionFamily({ category: 'shapes', engine: 'sequencing' }, { category: 'shapes', engine: 'compare' }), false);
assert.equal(sameSessionFamily({ category: 'numbers', engine: 'counting' }, { category: 'numbers', engine: 'counting' }), true);
let checked = 0;
for (const file of readdirSync(root, { recursive: true })) {
  if (typeof file !== 'string' || !file.endsWith('.json')) continue;
  const a = JSON.parse(readFileSync(resolve(root, file), 'utf8')) as {
    id: string; category: string; engine: string; params: unknown;
  };
  const owner = categoryOwner(a.engine, a.params);
  if (owner) assert.equal(a.category, owner, `${a.id}: задачата принадлежи на ${owner}`);
  checked++;
}
console.log(`✔ ${checked} активности: основните типове задачи имат един дом в каталога.`);
