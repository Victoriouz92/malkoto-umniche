import { shuffle } from '../shared/random';
import type { LettersParams } from './schema';

/**
 * Варианти на „Намери буквата“ и „С какво започва“.
 *
 * Буквите и разсейващите остават тези, които авторът е избрал — те са
 * подбрани да си приличат визуално и това е самата задача. Мени се само
 * къде стоят. При второто пускане детето не помни „беше горе вдясно“, а
 * трябва пак да разпознае формата на буквата.
 */
export function lettersVariant(params: LettersParams, random: () => number): LettersParams {
  if (params.mode === 'find') {
    return { ...params, grid: shuffle(params.grid, random) };
  }

  return {
    ...params,
    rounds: shuffle(params.rounds, random).map((round) => ({
      ...round,
      choices: shuffle(round.choices, random),
    })),
  };
}
