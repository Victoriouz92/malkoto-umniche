/**
 * Кои записи очаква приложението.
 *
 * Един списък, ползван и от `build-audio.mjs`, и от `check-audio.mjs`.
 * Имената съвпадат едно към едно с id-тата на графиката: `animal.cow`
 * ползва `animals/cow.ogg`. Затова активността не носи отделно поле за звук.
 */
export const EXPECTED = {
  animals: [
    'cow', 'pig', 'sheep', 'horse', 'chicken', 'duck',
    'goat', 'dog', 'cat', 'bear', 'fox', 'owl', 'frog', 'whale',
  ],
  vehicles: ['car', 'bus', 'truck', 'tractor', 'train', 'airplane'],
};

export const FOLDERS = Object.keys(EXPECTED);

export function isExpected(folder, name) {
  return EXPECTED[folder]?.includes(name) ?? false;
}
