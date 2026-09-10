import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rhythmParams, sameRhythm } from '../src/engines/rhythm/schema';
import { activitySchema } from '../src/content/schema/activity';

for (const age of [3, 4, 5, 6]) {
  const activity = activitySchema.parse(
    JSON.parse(readFileSync(`src/content/activities/rhythm-studio-${age}.json`, 'utf8')),
  );
  const p = rhythmParams.parse(activity.params);
  for (const target of p.rounds) {
    assert(sameRhythm(target, [...target]));
    assert(!sameRhythm(target, target.slice(1)));
    assert(
      !sameRhythm(
        target,
        target.map(() => null),
      ),
    );
    assert(
      !sameRhythm(
        target,
        target.map((b, i) => (i ? b : b === 'drum' ? 'bell' : 'drum')),
      ),
    );
  }
  assert.equal(p.guided, age === 3);
  assert.equal(p.choices.includes('rest'), age >= 5);
  assert(
    !rhythmParams.safeParse({ ...p, rounds: [p.rounds[0], p.rounds[0], p.rounds[0]] }).success,
  );
  assert(!rhythmParams.safeParse({ ...p, beatMs: 0 }).success);
  assert(
    !rhythmParams.safeParse({ ...p, rounds: [['rest', 'rest', 'rest'], ...p.rounds.slice(1)] })
      .success,
  );
}
console.log('✔ Ритъм: 12 фрази, точен ред, паузи, непълни отговори и невалидно съдържание.');
