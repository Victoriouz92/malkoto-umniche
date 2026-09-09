import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { activitySchema } from '../src/content/schema/activity';
import { allowedAgeRange, isActivityAllowed } from '../src/content/ageAccess';
import { levelFor } from '../src/core/adaptive/difficulty';
import { DEFAULT_SETTINGS } from '../src/core/store/types';
import type { ChildProfile } from '../src/core/store/types';

const all = readdirSync('src/content/activities').filter(f => f.endsWith('.json')).map(f =>
  activitySchema.parse(JSON.parse(readFileSync(`src/content/activities/${f}`, 'utf8'))));
const child = (age: number) => ({ age, unlockedAgeMax: age, skillRatings: {} }) as ChildProfile;
const forAge = (age: number) => all.filter(a => isActivityAllowed(a, allowedAgeRange(child(age), DEFAULT_SETTINGS.filter)));
for (let age = 2; age <= 6; age++) {
  const visible = forAge(age);
  assert(visible.length > 0);
  if (age > 2) assert(levelFor(child(age), ['working-memory']) > levelFor(child(age - 1), ['working-memory']));
  console.log(`${age} г.: ${visible.length} задачи`);
}
const two = new Set(forAge(2).filter(a => !['coloring', 'drawing'].includes(a.engine)).map(a => a.id));
assert.equal(forAge(5).filter(a => two.has(a.id)).length, 0, 'Началните задачи за 2 г. не са каталогът за 5 г.');
for (const age of [4, 5, 6]) {
  assert(!forAge(age).some(a => a.id === 'memory-farm-6'), 'Малката дъска не трябва да се предлага на по-големите.');
  assert(forAge(age).some(a => a.engine === 'memory' && a.params.mode === 'sequence'));
}
const unlocked = allowedAgeRange({ ...child(3), unlockedAgeMax: 4 }, DEFAULT_SETTINGS.filter);
assert.deepEqual(unlocked, { min: 3, max: 4 });
assert(isActivityAllowed(all.find(a => a.id === 'memory-order-friends')!, unlocked));
assert(!isActivityAllowed(all.find(a => a.id === 'memory-reverse-friends')!, unlocked));
const manual = allowedAgeRange(child(6), { ...DEFAULT_SETTINGS.filter, ageOverride: { min: 3, max: 3 } });
assert(isActivityAllowed(all.find(a => a.id === 'memory-farm-6')!, manual), 'Родителят може съзнателно да избере по-лесно ниво.');
console.log('✔ Възрастов подбор, различни задачи, начална трудност и родителско отключване.');
