import assert from 'node:assert/strict';
import { orderMatches, shoppingParams } from '../src/engines/shopping/schema';
import { roadBuilderParams, roadSolved } from '../src/engines/road-builder/schema';

const order = { title: 'Пикник', items: [{ asset: 'apple', count: 2 }, { asset: 'bread', count: 1 }] };
assert.ok(orderMatches(order, ['bread', 'apple', 'apple']));
for (const basket of [[], ['apple', 'bread'], ['apple', 'bread', 'bread'], ['apple', 'apple', 'carrot'], ['apple', 'apple', 'bread', 'carrot']]) {
  assert.equal(orderMatches(order, basket), false, `Invalid basket accepted: ${basket.join(',')}`);
}
assert.equal(shoppingParams.safeParse({ shelf: ['apple', 'carrot', 'banana'], orders: [order, order] }).success, false);

const paths = [[3, 4, 5], [3, 0, 1, 2, 5], [3, 6, 7, 4, 1, 2, 5]];
assert.ok(roadBuilderParams.safeParse({ vehicle: 'vehicle.car', paths }).success);
assert.equal(roadBuilderParams.safeParse({ vehicle: 'vehicle.car', paths: [[3, 1, 5], [3, 4, 5]] }).success, false);
// Independent edge-connectivity check, covering every rotation of every shipped road.
const offsets = [-3, 1, 3, -1];
let checked = 0;
for (const path of paths) {
  assert.ok(roadSolved(path, path.map(() => 0)));
  assert.equal(roadSolved(path, path.map(() => 1)), false);
  assert.equal(roadSolved(path, []), false);
  for (let state = 0; state < 4 ** path.length; state++) {
    const turns = path.map((_, i) => Math.floor(state / 4 ** i) % 4);
    const ports = path.map((cell, i) => {
      const before = i === 0 ? cell - 1 : path[i - 1]!;
      const after = i === path.length - 1 ? cell + 1 : path[i + 1]!;
      return [before, after].map(neighbor => (offsets.indexOf(neighbor - cell) + turns[i]!) % 4);
    });
    const connected = ports[0]!.includes(3) && ports.at(-1)!.includes(1) && path.slice(1).every((cell, j) => {
      const direction = offsets.indexOf(cell - path[j]!);
      return ports[j]!.includes(direction) && ports[j + 1]!.includes((direction + 2) % 4);
    });
    assert.equal(roadSolved(path, turns), connected, `Road mismatch: ${path.join(',')} / ${turns.join(',')}`);
    checked++;
  }
}
console.log(`✔ Пазаруване: точни количества и неподходящи продукти; пътища: ${checked} конфигурации.`);
