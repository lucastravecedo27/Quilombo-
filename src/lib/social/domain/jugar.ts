// Jugar: invitaciones a partidos (citas), canchas disponibles por ciudad, apartar y torneos.
// Funciones puras: las usan las pantallas y las pruebas.

export interface Club { id: string; nombre: string; ciudad: string; zona: string | null; direccion: string | null; lat: number | null; lng: number | null }
export interface Cancha { id: string; club_id: string; nombre: string; techada: boolean; tipo: 'cristal' | 'muro' | 'panoramica' }
/**
 * 90 min de una cancha. estado: libre → apartada (por un partido, con plazo para pagar) → pagada; el club puede
 * bloquearla (mantenimiento, clase). cliente/origen dicen a nombre de quién quedó y si fue por la app o en el club.
 */
export interface Franja {
  id: string; cancha_id: string; inicio: string; fin: string; precio: number; estado: 'libre' | 'apartada' | 'pagada' | 'bloqueada';
  partido_id: string | null; apartada_hasta?: string | null;
  cliente?: string | null; telefono?: string | null; origen?: 'app' | 'club' | null; llegaron?: string | null; nota?: string | null;
}

export type EstadoPartido = 'abierto' | 'confirmado' | 'jugado' | 'cancelado';
export type Respuesta = 'voy' | 'quizas' | 'no';
export interface Partido {
  id: string; creador: string; cuando: string; ciudad: string; club_id: string | null; franja_id: string | null;
  invitados: string[]; cupos: number; nota: string | null; estado: EstadoPartido; created_at: string;
}
export interface RespuestaPartido { id: string; partido_id: string; user_id: string; respuesta: Respuesta }

export interface Torneo {
  id: string; nombre: string; ciudad: string; club_id: string | null; inicio: string; fin: string;
  categorias: number[]; cupos: number; inscritos: number; precio: number; estado: 'inscripciones' | 'en_juego' | 'terminado'; cierre: string;
  /** Lo que el club cuenta del torneo: formato, premios, cuenta para el comprobante */
  descripcion?: string | null; premios?: string | null; formato?: string | null; cuenta_pago?: string | null;
}
/**
 * estado: pendiente_pago (aún no paga) → comprobante (subió el comprobante, el club lo revisa) → inscrito;
 * con tarjeta pasa directo a inscrito. El club puede rechazar el comprobante (rechazada).
 */
export interface Inscripcion {
  id: string; torneo_id: string; user_id: string; pareja: string | null; categoria: number;
  estado: 'inscrito' | 'pendiente_pago' | 'comprobante' | 'rechazada' | 'cancelada';
  metodo?: 'tarjeta' | 'saldo' | 'comprobante' | null;
  /** Foto del comprobante (en la demo, como imagen comprimida dentro de la fila) */
  comprobante?: string | null;
  nota_club?: string | null;
  created_at?: string;
}

/** Quiénes van (el creador siempre cuenta) */
export function confirmados(p: Partido, rs: RespuestaPartido[]): string[] {
  const si = rs.filter((r) => r.partido_id === p.id && r.respuesta === 'voy').map((r) => r.user_id);
  return [...new Set([p.creador, ...si])];
}
export const faltan = (p: Partido, rs: RespuestaPartido[]) => Math.max(0, p.cupos - confirmados(p, rs).length);

/** Franjas libres de una ciudad para un día (YYYY-MM-DD, hora de Colombia), de la más temprana a la más tarde */
export function disponibles(franjas: Franja[], canchas: Cancha[], clubes: Club[], ciudad: string, dia: string, ahora = Date.now()): (Franja & { cancha: Cancha; club: Club })[] {
  const cl = new Map(clubes.filter((c) => c.ciudad === ciudad).map((c) => [c.id, c]));
  const ca = new Map(canchas.filter((c) => cl.has(c.club_id)).map((c) => [c.id, c]));
  return franjas
    .filter((f) => f.estado === 'libre' && ca.has(f.cancha_id) && diaColombia(f.inicio) === dia && new Date(f.inicio).getTime() > ahora)
    .map((f) => { const cancha = ca.get(f.cancha_id)!; return { ...f, cancha, club: cl.get(cancha.club_id)! }; })
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.club.nombre.localeCompare(b.club.nombre));
}
/** Fecha (YYYY-MM-DD) en hora de Colombia (UTC-5, sin horario de verano) */
export const diaColombia = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
/** "7:00 p. m." en hora de Colombia */
export const horaColombia = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
/** "sáb 12 oct · 7:00 p. m." */
export function cuando(iso: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace(/[.,]/g, '').replace(/\s+/g, ' ');
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} · ${horaColombia(iso)}`;
}

/** Lo que le toca a cada jugador de la cancha (4 por defecto), redondeado a cientos */
export const cuotaCancha = (precio: number, jugadores = 4) => Math.ceil(precio / Math.max(1, jugadores) / 100) * 100;

/** ¿Me puedo inscribir? (con inscripciones abiertas, cupo y mi categoría dentro de las del torneo) */
export function puedeInscribirse(t: Torneo, miCategoria: number | null | undefined, yaInscrito: boolean, ahora = Date.now()): { ok: boolean; motivo?: string } {
  if (yaInscrito) return { ok: false, motivo: 'Ya estás inscrito' };
  if (t.estado !== 'inscripciones' || new Date(t.cierre).getTime() < ahora) return { ok: false, motivo: 'Inscripciones cerradas' };
  if (t.inscritos >= t.cupos) return { ok: false, motivo: 'Sin cupos' };
  if (miCategoria && t.categorias.length && !t.categorias.includes(miCategoria)) return { ok: false, motivo: `Es para ${t.categorias.map((c) => c + 'ª').join(', ')}` };
  return { ok: true };
}

/** "$ 120.000" (pesos colombianos, sin decimales) */
export const pesos = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO');
