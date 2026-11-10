import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describeCover } from '../src/kid/covers/model';
import { schemaFor } from '../src/engines/schemas';
import { recipe } from './library-recipes.mjs';

const baseline = {
  puzzles: 48, memory: 29, numbers: 21, letters: 26, colors: 16,
  shapes: 11, animals: 10, vehicles: 9, food: 11,
};
const ages = [2, 3, 4, 5, 6];
const minimum = 6;
const root = new URL('../src/content/activities/', import.meta.url);
const destination = new URL('./expedition/', root);
const translations = new URL('../src/i18n/libraryActivities.ts', import.meta.url);
const originals = readdirSync(root).filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(new URL(file, root), 'utf8')));
const check = process.argv.includes('--check');
const toWrite = new Map();
const dictionary = {};
const rows = [];

function keyFor(activity) {
  const { params, engine } = activity;
  // Reordering answer buttons or shuffled pieces alone is not a new task.
  if (engine === 'puzzle') return engine + JSON.stringify([...params.pieces].sort());
  if (engine === 'matching') return engine + JSON.stringify([
    params.rightMode ?? 'same', params.pairs.map(({ left, right }) => left + ':' + right).sort(),
  ]);
  if (engine === 'memory') return engine + JSON.stringify([
    params.mode ?? 'pairs', params.mode && params.mode !== 'pairs' ? params.length : 0, [...params.items].sort(),
  ]);
  if (engine === 'letters' && params.mode === 'find') {
    return engine + JSON.stringify([params.target, [...params.grid].sort()]);
  }
  if (engine === 'drawing') return engine + JSON.stringify(params.prompt ?? params);
  if (engine === 'coloring') return engine + JSON.stringify([params.lineart, [...params.palette].sort()]);
  if (engine === 'road-builder') return engine + JSON.stringify([...params.paths].map(JSON.stringify).sort());
  if (engine === 'discovery' || engine === 'sound-match') {
    return engine + JSON.stringify([params.mode, params.rounds.map((round) => [
      round.answer ?? round.sound, [...(round.examples ?? [])].sort(), [...round.choices].sort(),
    ]).map(JSON.stringify).sort()]);
  }
  return engine + JSON.stringify(params);
}

for (const [category, before] of Object.entries(baseline)) {
  const current = originals.filter((activity) => activity.category === category);
  assert.equal(current.length, before, 'Frozen baseline changed for ' + category);
  const counts = ages.map((age) => current.filter(({ ageMin, ageMax }) => age >= ageMin && age <= ageMax).length);
  const seenTasks = new Set(current.map(keyFor));
  const seenCovers = new Set(current.map((activity) => JSON.stringify(describeCover(activity, 0))));
  const titlesByAge = new Map(ages.map((age) => [age, new Set()]));
  const attempts = new Map(ages.map((age) => [age, 0]));
  const selected = [];

  for (let added = 0; added < before * 2; added++) {
    const lowest = Math.min(...counts);
    const index = counts.indexOf(lowest);
    const age = ages[index];
    let found = false;

    for (let retries = 0; retries < 2_000; retries++) {
      const sequence = attempts.get(age);
      attempts.set(age, sequence + 1);
      const candidate = recipe(category, age, sequence);
      if (!candidate || titlesByAge.get(age).has(candidate.title)) continue;
      const signature = keyFor(candidate);
      const cover = JSON.stringify(describeCover(candidate, 0));
      if (seenTasks.has(signature) || seenCovers.has(cover)) continue;
      schemaFor(candidate.engine).paramsSchema.parse(candidate.params);
      seenTasks.add(signature);
      seenCovers.add(cover);
      titlesByAge.get(age).add(candidate.title);
      selected.push({ age, candidate });
      counts[index]++;
      found = true;
      break;
    }
    assert(found, 'Insufficient unique tasks for ' + category + ', age ' + age);
  }

  assert(counts.every((count) => count >= minimum), 'Age coverage below minimum in ' + category);
  rows.push({ category, total: before * 3, ...Object.fromEntries(ages.map((age, index) => [age + ' г.', counts[index]])) });

  for (const [index, { age, candidate }] of selected.entries()) {
    const id = ['expedition', category, age, String(index + 1).padStart(2, '0')].join('-');
    const titleKey = 'act.' + id;
    const parentNoteKey = 'note.' + id;
    dictionary[titleKey] = candidate.title;
    dictionary[parentNoteKey] = candidate.note;
    const sound = candidate.engine === 'sound-match';
    const isArt = candidate.engine === 'coloring' || candidate.engine === 'drawing';
    const activity = {
      id, schemaVersion: 1, category, engine: candidate.engine, mechanic: candidate.mechanic,
      ageMin: age, ageMax: age, difficulty: isArt ? 1 : Math.min(4, age - 1),
      titleKey, parentNoteKey, skills: candidate.skills,
      themes: candidate.themes.length ? candidate.themes : ['toys'],
      durationSec: age <= 3 ? 60 : 90, assets: candidate.assets, params: candidate.params,
      a11y: { colorIndependent: true, requiresAudio: sound, requiresPrecision: false },
      noFail: true,
    };
    toWrite.set(new URL(id + '.json', destination), JSON.stringify(activity) + '\n');
  }
}

if (!check) mkdirSync(destination, { recursive: true });
const expected = new Set([...toWrite.keys()].map((file) => fileURLToPath(file)));
for (const name of readdirSync(destination)) {
  assert(expected.has(fileURLToPath(new URL(name, destination))), 'Unexpected generated file: ' + name);
}
toWrite.set(translations, '// Generated by npm run generate:library.\nexport const libraryActivityBg = ' +
  JSON.stringify(dictionary, null, 2) + ' as const;\n');
for (const [file, content] of toWrite) {
  if (check) assert.equal(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), content, 'Regenerate ' + fileURLToPath(file));
  else writeFileSync(file, content);
}
console.table(rows);
console.log('✓ ' + (toWrite.size - 1) + ' new tasks and ' + rows.reduce((total, row) => total + row.total, 0) + ' total.');
