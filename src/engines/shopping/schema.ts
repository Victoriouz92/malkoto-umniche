import { z } from 'zod';
import type { EngineSchema } from '../types';
const ingredient = z.object({ asset: z.string().min(1), count: z.number().int().min(1).max(5) });
export const shoppingParams = z.object({
  shelf: z.array(z.string().min(1)).min(3).max(6),
  orders: z.array(z.object({ title: z.string().min(1), items: z.array(ingredient).min(2).max(3) })).min(2).max(5),
}).superRefine((p, ctx) => {
  if (new Set(p.shelf).size !== p.shelf.length) ctx.addIssue({ code: 'custom', message: 'Повторени продукти на рафта' });
  p.orders.forEach((order, i) => {
    if (new Set(order.items.map(v => v.asset)).size !== order.items.length) ctx.addIssue({ code: 'custom', path: ['orders', i], message: 'Повторен продукт в списъка' });
    order.items.forEach(item => { if (!p.shelf.includes(item.asset)) ctx.addIssue({ code: 'custom', message: `Липсва продукт ${item.asset}` }); });
  });
});
export type ShoppingParams = z.infer<typeof shoppingParams>;
export function orderMatches(order: ShoppingParams['orders'][number], basket: readonly string[]): boolean {
  return basket.length === order.items.reduce((n, item) => n + item.count, 0) &&
    order.items.every(item => basket.filter(asset => asset === item.asset).length === item.count);
}
export const shoppingSchema: EngineSchema<ShoppingParams> = { id: 'shopping', paramsSchema: shoppingParams };
