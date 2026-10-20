import { describe, expect, it } from 'vitest';
import { completa, falta, partesIguales, saldoDe } from './billetera';

describe('saldo Quilombo', () => {
  it('suma recargas y resta pagos de esa persona', () => {
    const m = [{ user_id: 'a', monto: 200_000 }, { user_id: 'a', monto: -40_000 }, { user_id: 'b', monto: 50_000 }];
    expect(saldoDe(m, 'a')).toBe(160_000);
    expect(saldoDe(m, 'c')).toBe(0);
  });
});
describe('pagar entre varios', () => {
  it('mitad y mitad, y entre tres sin perder pesos', () => {
    expect(partesIguales(120_000, 2)).toEqual([60_000, 60_000]);
    const tres = partesIguales(160_000, 3);
    expect(tres.reduce((s, x) => s + x, 0)).toBe(160_000);
    expect(tres[0] % 100).toBe(0);
  });
  it('queda completa solo cuando todos pagaron su parte', () => {
    const d = { total: 120_000, partes: [{ user_id: 'a', monto: 60_000, estado: 'pagada' as const, pagado_en: 'x' }, { user_id: 'b', monto: 60_000, estado: 'pendiente' as const, pagado_en: null }] };
    expect(completa(d)).toBe(false);
    expect(falta(d)).toBe(60_000);
    d.partes[1].estado = 'pagada' as never;
    expect(completa(d)).toBe(true);
  });
});
