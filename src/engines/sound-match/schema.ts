import { z } from 'zod';
import type { EngineSchema } from '../types';

/**
 * „Кой издава този звук“ — механика m085.
 *
 * Каталогът показа, че двегодишните имат само девет подходящи механики
 * срещу деветдесет и шест за шестгодишните. Тази е една от деветте —
 * затова е и първата, за която си струваше да се набавят записи.
 *
 * Слуховото разпознаване е отделен канал от зрителното и се упражнява
 * рядко. Дете, което познава кравата по картинка, невинаги я познава по звук.
 */
export const soundMatchParams = z.object({
  rounds: z
    .array(
      z.object({
        /** Кой предмет издава звука. Записът се намира по същото id. */
        sound: z.string().min(1),
        /** Картинките за избор, включително верния. */
        choices: z.array(z.string().min(1)).min(2).max(4),
      }),
    )
    .min(1)
    .max(8),

  /**
   * Пуска ли се звукът сам при започване на рунда.
   * За най-малките — да; те още не свързват бутона с действието.
   */
  autoPlay: z.boolean().default(true),
});

export type SoundMatchParams = z.infer<typeof soundMatchParams>;

export const soundMatchSchema: EngineSchema<SoundMatchParams> = {
  id: 'sound-match',
  paramsSchema: soundMatchParams.superRefine((value, ctx) => {
    value.rounds.forEach((round, index) => {
      if (!round.choices.includes(round.sound)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rounds', index, 'choices'],
          message: 'предметът, който издава звука, липсва сред картинките',
        });
      }
    });
  }),
};
