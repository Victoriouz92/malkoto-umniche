import { randomInt, sample, shuffle } from '../shared/random';
import type { CountingParams } from './schema';

/**
 * Варианти на „Преброй и посочи“.
 *
 * Авторът задава ДИАПАЗОНА, не конкретните бройки: ако в JSON-а пише 8, 9 и
 * 10, задачата е „броене между осем и десет“. Вариантът избира други
 * бройки в същия диапазон и разменя предметите. Трудността е същата,
 * защото най-голямото число не се мени — а то определя колко тежко е
 * броенето.
 */
export function countingVariant(params: CountingParams, random: () => number): CountingParams {
  const counts = params.rounds.map((round) => round.count);
  if (counts.length === 0) return params;

  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (min === max) return params;

  // Възходящият ред е нарочен при малките — броенето върви нагоре.
  const ascending = counts.every((count, i) => i === 0 || count >= (counts[i - 1] ?? count));

  const span = max - min + 1;
  const pool = Array.from({ length: span }, (_, i) => min + i);
  const picked =
    span >= counts.length
      ? sample(pool, counts.length, random)
      : counts.map(() => randomInt(min, max, random));

  // Крайните стойности се пазят: иначе вариантът тихо олекотява задачата.
  if (!picked.includes(max)) picked[picked.length - 1] = max;
  if (ascending) picked.sort((a, b) => a - b);

  const assets = shuffle([...new Set(params.rounds.map((round) => round.asset))], random);

  return {
    ...params,
    rounds: picked.map((count, i) => ({
      count,
      asset: assets[i % assets.length] ?? (params.rounds[i]?.asset ?? ''),
    })),
  };
}
