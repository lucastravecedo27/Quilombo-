import { describe, expect, it } from 'vitest';
import { estadoSegun, ganadorDeSets, puntosElo, tablaRanking } from './ranking';
import { codigoNuevo, leerCodigoCuenta, qrTarjeta, tarjetaDerivada } from '$lib/club/domain/club';

const r = { equipo_a: ['a1', 'a2'], equipo_b: ['b1', 'b2'] };

describe('resultados sin trampa', () => {
  it('solo vale cuando los cuatro confirman', () => {
    expect(estadoSegun({ ...r, confirmaciones: { a1: 'si', a2: 'si', b1: 'si' } })).toBe('pendiente');
    expect(estadoSegun({ ...r, confirmaciones: { a1: 'si', a2: 'si', b1: 'si', b2: 'si' } })).toBe('valido');
  });
  it('si uno no está de acuerdo queda en disputa', () => {
    expect(estadoSegun({ ...r, confirmaciones: { a1: 'si', a2: 'si', b1: 'si', b2: 'no' } })).toBe('disputado');
  });
  it('gana quien gana más sets', () => {
    expect(ganadorDeSets([[6, 4], [3, 6], [7, 5]])).toBe('a');
    expect(ganadorDeSets([[6, 4], [3, 6]])).toBeNull();
  });
  it('ganarle a una pareja más fuerte da más puntos', () => {
    const sorpresa = puntosElo(1200, 1600, true).a;
    const esperado = puntosElo(1600, 1200, true).a;
    expect(sorpresa).toBeGreaterThan(esperado);
    expect(puntosElo(1500, 1500, false)).toEqual({ a: -16, b: 16 });
  });
  it('la tabla filtra por categoría y ordena por puntos', () => {
    const t = tablaRanking([
      { user_id: '1', nombre: 'A', categoria: 4, puntos_ranking: 1200, victorias: 3, derrotas: 1 },
      { user_id: '2', nombre: 'B', categoria: 4, puntos_ranking: 1500 },
      { user_id: '3', nombre: 'C', categoria: 3, puntos_ranking: 1900 }
    ], { categoria: 4 });
    expect(t.map((f) => [f.pos, f.perfil.nombre])).toEqual([[1, 'B'], [2, 'A']]);
    expect(t[1].pct).toBe(75);
  });
});

describe('modo crucero', () => {
  it('lee el código del QR o digitado', () => {
    expect(leerCodigoCuenta(qrTarjeta('M7K4QZ'))).toBe('M7K4QZ');
    expect(leerCodigoCuenta(' m7k4qz ')).toBe('M7K4QZ');
    expect(leerCodigoCuenta('hola mundo')).toBeNull();
  });
  it('no repite códigos abiertos y no usa letras confusas', () => {
    let k = 0;
    const azar = () => [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5][k++ % 8];
    expect(codigoNuevo(['AAAAAA'], azar)).not.toBe('AAAAAA');
    expect(codigoNuevo([], Math.random)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
  it('cada jugador tiene su tarjeta: siempre la misma y distinta a la de los demás', () => {
    const ids = Array.from({ length: 500 }, (_, k) => `00000000-0000-4000-b200-${String(k).padStart(12, '0')}`);
    const cods = ids.map(tarjetaDerivada);
    expect(new Set(cods).size).toBe(ids.length);
    expect(tarjetaDerivada(ids[7])).toBe(cods[7]);
    expect(leerCodigoCuenta(cods[3])).toBe(cods[3]);
  });
});
