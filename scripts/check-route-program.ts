import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  routeProgramParams,
  routeSolution,
  runRoute,
  stepTo,
  type Mission,
} from '../src/engines/route-program/schema';

for (const age of [4, 5, 6]) {
  const activity = JSON.parse(
    readFileSync(`src/content/activities/train-program-${age}.json`, 'utf8'),
  ) as { params: unknown; ageMin: number; ageMax: number };
  const params = routeProgramParams.parse(activity.params);
  assert.equal(activity.ageMin, age);
  assert.equal(activity.ageMax, age);
  for (const mission of params.missions) {
    const solution = routeSolution(mission)!;
    assert.ok(solution.length <= params.maxCommands);
    assert.ok(runRoute(mission, solution).success);
    assert.ok(!runRoute(mission, []).success);
    assert.ok(!runRoute(mission, solution.slice(0, -1)).success);
  }
}
const map: Mission = { size: 3, start: 0, goal: 2, blocks: [4], stop: 6 };
assert.equal(stepTo(2, 'right', map), null, 'No row wrapping');
assert.equal(stepTo(0, 'up', map), null, 'No leaving the board');
assert.equal(stepTo(1, 'down', map), null, 'No crossing obstacles');
assert.equal(runRoute(map, ['right', 'right']).success, false, 'A stop cannot be skipped');
assert.equal(runRoute(map, ['up']).blockedAt, 0);
assert.ok(runRoute(map, routeSolution(map)!).success);
assert.equal(
  routeProgramParams.safeParse({ maxCommands: 3, missions: [map, map, map] }).success,
  false,
);
assert.equal(
  routeProgramParams.safeParse({ maxCommands: 16, missions: [{ ...map, goal: 20 }, map, map] })
    .success,
  false,
);
assert.equal(
  routeProgramParams.safeParse({
    maxCommands: 16,
    missions: [{ ...map, blocks: [1, 3] }, map, map],
  }).success,
  false,
);
console.log(
  '✔ Train programming: nine solvable missions, boundaries, obstacles, mandatory stops.',
);
