import { describe, expect, it } from 'vitest';
import { etiquetaPara, repartirIgual, tipo, codigoAmigo } from './vinculos';
import { gano, setValido, textoMarcador, historia } from './social';
import { lineaJugador, textoCategoria } from './padel';
import { confirmados, cuotaCancha, disponibles, faltan, puedeInscribirse, type Franja, type Partido, type Torneo } from './jugar';

describe('vínculos', () => {
  it('solo hay amigo, pareja de juego y rival', () => {
    expect(tipo('pareja_juego').nombre).toBe('Pareja de juego');
    expect(tipo('socios').id).toBe('amigo'); // tipos viejos de Selffin caen en amigo
  });
  it('la etiqueta propia solo la ve quien propuso', () => {
    const v = { id: '1', user_a: 'a', user_b: 'b', tipo: 'pareja_juego', etiqueta: 'Mi drive', estado: 'activa', verificada: false };
    expect(etiquetaPara(v, 'a')).toBe('Mi drive');
    expect(etiquetaPara(v, 'b')).toBe('Pareja de juego');
  });
  it('reparte sin perder pesos', () => {
    const p = repartirIgual(160_000, 3);
    expect(p.reduce((a, b) => a + b, 0)).toBe(160_000);
  });
  it('lee el código de un link de amigo', () => expect(codigoAmigo('https://quilombo.app/?amigo=ABCDE23456')).toBe('abcde23456'));
});

describe('pádel', () => {
  it('sets válidos', () => {
    expect(setValido([6, 4])).toBe(true);
    expect(setValido([7, 6])).toBe(true);
    expect(setValido([6, 5])).toBe(false);
    expect(setValido([8, 6])).toBe(false);
  });
  it('marcador y ganador', () => {
    const m = { sets: [[6, 4], [3, 6], [7, 5]] as [number, number][] };
    expect(textoMarcador(m)).toBe('6-4 · 3-6 · 7-5');
    expect(gano(m)).toBe(true);
  });
  it('perfil de jugador', () => {
    expect(textoCategoria(4)).toBe('4ª categoría');
    expect(textoCategoria(9)).toBeNull();
    expect(lineaJugador({ categoria: 3, club_base: 'La 70', ciudad: 'Medellín' })).toBe('3ª · La 70 · Medellín');
  });
  it('historia cuenta partidos juntos', () => {
    const h = historia('a', 'b', { desde: null, eventos: [], cobros: [], publicaciones: [{ autor: 'a', con: ['b', 'c'], tipo: 'resultado_partido', marcador: null }] });
    expect(h.partidos).toBe(1);
  });
});

describe('jugar', () => {
  const ahora = Date.parse('2026-10-12T15:00:00Z');
  const club = { id: 'c1', nombre: 'La 70', ciudad: 'Medellín', zona: null, direccion: null, lat: null, lng: null };
  const cancha = { id: 'k1', club_id: 'c1', nombre: 'Cancha 1', techada: true, tipo: 'cristal' as const };
  const f = (id: string, inicio: string, estado: Franja['estado'] = 'libre'): Franja => ({ id, cancha_id: 'k1', inicio, fin: inicio, precio: 160_000, estado, partido_id: null });
  it('canchas libres por ciudad y día (hora de Colombia), sin las pasadas ni las ocupadas', () => {
    const fs = [f('a', '2026-10-13T00:00:00Z'), f('b', '2026-10-12T23:00:00Z'), f('c', '2026-10-12T12:00:00Z'), f('d', '2026-10-12T22:00:00Z', 'apartada')];
    // 00:00 UTC del 13 = 7 p. m. del 12 en Colombia
    expect(disponibles(fs, [cancha], [club], 'Medellín', '2026-10-12', ahora).map((x) => x.id)).toEqual(['b', 'a']);
    expect(disponibles(fs, [cancha], [club], 'Cali', '2026-10-12', ahora)).toEqual([]);
  });
  it('confirmados y cupos', () => {
    const p: Partido = { id: 'p', creador: 'a', cuando: '', ciudad: 'Medellín', club_id: null, franja_id: null, invitados: ['b', 'c', 'd'], cupos: 4, nota: null, estado: 'abierto', created_at: '' };
    const rs = [{ id: '1', partido_id: 'p', user_id: 'b', respuesta: 'voy' as const }, { id: '2', partido_id: 'p', user_id: 'c', respuesta: 'no' as const }];
    expect(confirmados(p, rs)).toEqual(['a', 'b']);
    expect(faltan(p, rs)).toBe(2);
    expect(cuotaCancha(160_000, 4)).toBe(40_000);
  });
  it('torneos: cierre, cupos y categoría', () => {
    const t: Torneo = { id: 't', nombre: 'Open', ciudad: 'Medellín', club_id: null, inicio: '', fin: '', categorias: [4, 5], cupos: 2, inscritos: 1, precio: 0, estado: 'inscripciones', cierre: '2026-10-20T00:00:00Z' };
    expect(puedeInscribirse(t, 4, false, ahora).ok).toBe(true);
    expect(puedeInscribirse(t, 2, false, ahora).motivo).toMatch(/4ª, 5ª/);
    expect(puedeInscribirse({ ...t, inscritos: 2 }, 4, false, ahora).motivo).toBe('Sin cupos');
    expect(puedeInscribirse(t, 4, false, Date.parse('2026-10-21T00:00:00Z')).motivo).toBe('Inscripciones cerradas');
  });
});
