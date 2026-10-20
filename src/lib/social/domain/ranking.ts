// Ranking nacional y resultados sin trampa. Un resultado de un partido amistoso solo vale (suma victoria/derrota y
// puntos) cuando LOS CUATRO jugadores lo confirman; si alguno dice que no, queda "en disputa" y lo resuelve el club
// donde se jugó (o se anula). En los torneos el resultado lo digita el club organizador y es oficial de una vez.
import type { PerfilPadel } from './padel';

export type EstadoResultado = 'pendiente' | 'valido' | 'disputado' | 'anulado';
export interface Resultado {
  id: string; partido_id: string | null; torneo_id: string | null; club_id: string | null;
  equipo_a: string[]; equipo_b: string[];
  /** [juegos de A, juegos de B] por set */
  sets: [number, number][];
  ganador: 'a' | 'b';
  propuesto_por: string | null;
  /** uid → 'si' (de acuerdo) | 'no' (no está de acuerdo) */
  confirmaciones: Record<string, 'si' | 'no'>;
  estado: EstadoResultado;
  /** Lo digitó el club (torneo o disputa resuelta) */
  oficial: boolean;
  /** Puntos que ganó/perdió cada uno (cuando quedó válido) */
  puntos: Record<string, number> | null;
  motivo: string | null;
  created_at: string; resuelto_en: string | null;
}

export const participantes = (r: Pick<Resultado, 'equipo_a' | 'equipo_b'>) => [...r.equipo_a, ...r.equipo_b];
export const faltanPorConfirmar = (r: Resultado) => participantes(r).filter((u) => r.confirmaciones[u] !== 'si');
/** Qué pasa con el resultado según las confirmaciones: todos sí → válido; alguno no → en disputa */
export function estadoSegun(r: Pick<Resultado, 'equipo_a' | 'equipo_b' | 'confirmaciones'>): EstadoResultado {
  const c = participantes(r).map((u) => r.confirmaciones[u]);
  if (c.includes('no')) return 'disputado';
  return c.every((x) => x === 'si') ? 'valido' : 'pendiente';
}
export const ganadores = (r: Resultado) => (r.ganador === 'a' ? r.equipo_a : r.equipo_b);
export const ganoUid = (r: Resultado, uid: string) => ganadores(r).includes(uid);
/** Gana el que gana más sets */
export function ganadorDeSets(sets: [number, number][]): 'a' | 'b' | null {
  const a = sets.filter(([x, y]) => x > y).length;
  const b = sets.filter(([x, y]) => y > x).length;
  return a === b ? null : a > b ? 'a' : 'b';
}

/**
 * Puntos tipo Elo por pareja: cada jugador gana o pierde según el promedio de su pareja contra la otra.
 * Ganarle a una pareja más fuerte da más puntos. K más alto en torneos.
 */
export function puntosElo(promA: number, promB: number, ganaA: boolean, k = 32) {
  const esperadoA = 1 / (1 + 10 ** ((promB - promA) / 400));
  const d = Math.round(k * ((ganaA ? 1 : 0) - esperadoA));
  return { a: d, b: -d };
}
export const promedio = (uids: string[], puntos: (u: string) => number) => uids.reduce((s, u) => s + puntos(u), 0) / Math.max(1, uids.length);

export interface PerfilRanking extends PerfilPadel { user_id: string; nombre: string; color?: string | null; avatar?: string | null; foto?: string | null; usuario?: string | null; puntos_ranking?: number | null; victorias?: number | null; derrotas?: number | null; racha?: number | null }
export interface FilaRanking { pos: number; perfil: PerfilRanking; puntos: number; victorias: number; derrotas: number; pct: number; racha: number }
/** La tabla del ranking (con filtros), de mayor a menor puntaje */
export function tablaRanking(perfiles: PerfilRanking[], f: { categoria?: number | null; ciudad?: string | null } = {}): FilaRanking[] {
  return perfiles
    .filter((p) => (p.puntos_ranking ?? 0) > 0 && (!f.categoria || p.categoria === f.categoria) && (!f.ciudad || p.ciudad === f.ciudad))
    .sort((a, b) => (b.puntos_ranking ?? 0) - (a.puntos_ranking ?? 0) || a.nombre.localeCompare(b.nombre))
    .map((p, i) => {
      const v = p.victorias ?? 0, d = p.derrotas ?? 0;
      return { pos: i + 1, perfil: p, puntos: p.puntos_ranking ?? 0, victorias: v, derrotas: d, pct: v + d ? Math.round((v / (v + d)) * 100) : 0, racha: p.racha ?? 0 };
    });
}
/** "3 victorias seguidas" / "2 derrotas seguidas" */
export const textoRacha = (r: number) => (r > 0 ? `🔥 ${r} ${r === 1 ? 'victoria' : 'victorias seguidas'}` : r < 0 ? `${-r} ${r === -1 ? 'derrota' : 'derrotas seguidas'}` : '');
