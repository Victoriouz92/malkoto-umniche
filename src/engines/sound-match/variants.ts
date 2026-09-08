import { shuffle } from '../shared/random';
import type { SoundMatchParams } from './schema';

/**
 * Варианти на „Кой издава този звук“.
 *
 * Тук вариантът има особена тежест. Двегодишните имат девет подходящи
 * механики в целия каталог и по-малко от двайсет активности — при тях
 * повторението Е ученето. Но повторението на ТОЧНО същия въпрос не е:
 * детето запомня „лявата картинка“ и спира да слуша.
 *
 * Затова се мени редът на въпросите и се пренареждат двойките: „крава или
 * котка“ става „крава или патица“. Всички картинки идват от самата
 * активност, значи няма как да се появи нерегистриран актив.
 */
export function soundMatchVariant(
  params: SoundMatchParams,
  random: () => number,
): SoundMatchParams {
  const pool = [
    ...new Set(params.rounds.flatMap((round) => [round.sound, ...round.choices])),
  ];

  const rounds = shuffle(params.rounds, random).map((round) => {
    const others = shuffle(
      pool.filter((id) => id !== round.sound),
      random,
    );

    // Няма достатъчно различни картинки? Тогава остават авторските.
    if (others.length < round.choices.length - 1) {
      return { ...round, choices: shuffle(round.choices, random) };
    }

    return {
      ...round,
      choices: shuffle([round.sound, ...others.slice(0, round.choices.length - 1)], random),
    };
  });

  return { ...params, rounds };
}
