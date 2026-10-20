// Jugar: invitar a jugar (partidos/citas), ver qué canchas hay libres en una ciudad, apartarlas, dividir y pagar,
// y entrar a torneos. Todo va por funciones del servidor; en la demo de pruebas (E2E) se refleja en la base local.
import { supabase } from '$lib/data/supabase';
import { datos } from '$lib/data/datos.svelte';
import { db } from '$lib/data/db';
import { sincronizar } from '$lib/data/sync';
import { E2E } from '$lib/app/sesion.svelte';
import { confirmados, cuotaCancha, cuando, diaColombia, pesos, type Cancha, type Club, type Franja, type Inscripcion, type Partido, type Respuesta, type RespuestaPartido, type Torneo } from '../domain/jugar';
import { avisar, cobrar, motivo, nombreDe, yo } from './vinculos';
import { avisarInscripcion, avisarReservaApp, pagarFranjaEnApp, pagarTorneoEnApp, saldoQuilombo } from '$lib/club/app/club';

const marca = () => { const t = new Date().toISOString(); return { created_at: t, updated_at: t, deleted_at: null }; };
const refrescar = () => sincronizar().catch(() => undefined);

export const clubes = () => datos.clubes as Club[];
export const canchas = () => datos.canchas as Cancha[];
export const franjas = () => datos.franjas as Franja[];
export const club = (id: string | null | undefined) => (id ? clubes().find((c) => c.id === id) ?? null : null);
export const ciudades = () => [...new Set(clubes().map((c) => c.ciudad))].sort();
/** La franja con su cancha y su club */
export function franjaCompleta(id: string | null | undefined) {
  const f = id ? franjas().find((x) => x.id === id) : null;
  const ca = f ? canchas().find((c) => c.id === f.cancha_id) : null;
  const cl = ca ? club(ca.club_id) : null;
  return f && ca && cl ? { ...f, cancha: ca, club: cl } : null;
}

// ───────── Partidos (invitar a jugar / citas) ─────────
export const partidos = () => datos.partidos as Partido[];
export const partido = (id: string) => partidos().find((p) => p.id === id) ?? null;
export const respuestas = () => datos.respuestas as RespuestaPartido[];
export const miRespuesta = (pid: string) => respuestas().find((r) => r.partido_id === pid && r.user_id === yo())?.respuesta ?? null;
/** Los que vienen y me tocan (los creé o me invitaron), del más cercano al más lejano */
export const misPartidos = (ahora = Date.now()) =>
  partidos().filter((p) => p.estado !== 'cancelado' && new Date(p.cuando).getTime() > ahora - 3 * 3_600_000 && (p.creador === yo() || p.invitados.includes(yo())))
    .sort((a, b) => a.cuando.localeCompare(b.cuando));

export interface NuevoPartido { cuando: string; ciudad: string; invitados: string[]; cupos?: number; nota?: string | null; franja?: string | null }
export async function invitarAJugar(n: NuevoPartido): Promise<{ id?: string; error?: string }> {
  // Sin cancha hay que invitar a alguien; con cancha se puede reservar solo
  if (!n.invitados.length && !n.franja) return { error: 'Invita al menos a una persona' };
  const f = franjaCompleta(n.franja);
  if (E2E) {
    const id = crypto.randomUUID();
    await db.social_partidos.put({ ...marca(), id, creador: yo(), cuando: f?.inicio ?? n.cuando, ciudad: f?.club.ciudad ?? n.ciudad, club_id: f?.club.id ?? null, franja_id: f?.id ?? null, invitados: n.invitados, cupos: n.cupos ?? 4, nota: n.nota ?? null, estado: 'abierto' });
    await db.social_partido_respuestas.put({ ...marca(), id: crypto.randomUUID(), partido_id: id, user_id: yo(), respuesta: 'voy' });
    if (f) {
      const { cancha: _ca, club: _cl, ...fila } = f;
      await db.social_franjas.put({ ...fila, updated_at: marca().updated_at, estado: 'apartada', partido_id: id, origen: 'app', apartada_hasta: new Date(Date.now() + 2 * 3_600_000).toISOString() });
      await avisarReservaApp(fila, nombreDe(yo()));
    }
    await db.social_eventos.put({ ...marca(), id: crypto.randomUUID(), actor: yo(), participantes: [yo(), ...n.invitados], tipo: 'partido', ref: id, texto: `${nombreDe(yo())} ${n.invitados.length ? 'armó partido' : 'reservó cancha'}: ${cuando(f?.inicio ?? n.cuando)}${f ? ` en ${f.club.nombre}` : ''}` });
    return { id };
  }
  const { data, error } = await supabase.rpc('partido_crear', { p_cuando: n.cuando, p_ciudad: n.ciudad, p_invitados: n.invitados, p_cupos: n.cupos ?? 4, p_nota: n.nota ?? null, p_franja: n.franja ?? null });
  if (error) return { error: motivo(error) };
  avisar('partido', String(data));
  await refrescar();
  return { id: String(data) };
}
/** Reservar una cancha libre (solo o con gente): queda un partido a mi nombre con la cancha apartada */
export async function reservarCancha(franjaId: string, invitados: string[] = []) {
  const f = franjaCompleta(franjaId);
  if (!f || f.estado !== 'libre') return { error: 'Esa cancha ya no está libre. Elige otra hora.' };
  return invitarAJugar({ cuando: f.inicio, ciudad: f.club.ciudad, invitados, franja: franjaId, cupos: 4 });
}
/** Código corto de una reserva (para mostrar en el club) */
export function codigoReserva(franjaId: string) {
  let h = 5381;
  for (const c of franjaId) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  // Sin 0/O ni 1/I para que se dicte fácil en recepción
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) { s += A[h % A.length]; h = Math.floor(h / A.length) || (h ^ 0x9e3779b9) >>> 0; }
  return s;
}
/** Mis reservas: los partidos con cancha que armé o a los que voy, del más cercano al más lejano */
export const misReservas = () => misPartidos().filter((p) => p.franja_id && (p.creador === yo() || miRespuesta(p.id) === 'voy'));

export async function responderPartido(pid: string, r: Respuesta): Promise<string | null> {
  if (E2E) {
    const antes = respuestas().find((x) => x.partido_id === pid && x.user_id === yo());
    await db.social_partido_respuestas.put({ ...marca(), id: antes?.id ?? crypto.randomUUID(), partido_id: pid, user_id: yo(), respuesta: r });
    return null;
  }
  const { error } = await supabase.rpc('partido_responder', { p_partido: pid, p_respuesta: r });
  if (error) return motivo(error);
  await refrescar();
  return null;
}
export async function cancelarPartido(pid: string): Promise<string | null> {
  if (E2E) {
    const p = await db.social_partidos.get(pid);
    if (p) await db.social_partidos.put({ ...p, estado: 'cancelado' });
    for (const f of await db.social_franjas.toArray()) if (f.partido_id === pid && f.estado === 'apartada') await db.social_franjas.put({ ...f, estado: 'libre', partido_id: null });
    return null;
  }
  const { error } = await supabase.rpc('partido_cancelar', { p_partido: pid });
  if (error) return motivo(error);
  await refrescar();
  return null;
}

// ───────── Canchas disponibles ─────────
/** Trae del servidor las franjas libres de una ciudad para un día (en la demo ya están en la base local) */
export async function buscarFranjas(ciudad: string, dia: string): Promise<string | null> {
  if (E2E) return null;
  const { data, error } = await supabase.rpc('jugar_disponibles', { p_ciudad: ciudad, p_dia: dia });
  if (error) return motivo(error);
  if (data?.length) await db.social_franjas.bulkPut(data as Franja[]);
  return null;
}
/** Apartar la cancha de un partido (queda a nombre del partido; hay un plazo para pagarla) */
export async function apartar(franjaId: string, partidoId: string): Promise<string | null> {
  if (E2E) {
    const f = await db.social_franjas.get(franjaId);
    if (!f || f.estado !== 'libre') return 'Esa cancha ya la apartaron. Elige otra hora.';
    const p = await db.social_partidos.get(partidoId);
    const ca = canchas().find((c) => c.id === f.cancha_id);
    await db.social_franjas.put({ ...f, updated_at: marca().updated_at, estado: 'apartada', partido_id: partidoId, origen: 'app', apartada_hasta: new Date(Date.now() + 2 * 3_600_000).toISOString() });
    await avisarReservaApp(f as Franja, nombreDe(yo()));
    if (p) await db.social_partidos.put({ ...p, franja_id: franjaId, club_id: ca?.club_id ?? p.club_id, cuando: f.inicio });
    return null;
  }
  const { error } = await supabase.rpc('franja_apartar', { p_franja: franjaId, p_partido: partidoId });
  if (error) return motivo(error);
  await refrescar();
  await buscarFranjas(partido(partidoId)?.ciudad ?? '', diaColombia(new Date().toISOString())).catch(() => undefined);
  return null;
}

/** Dividir la cancha entre los que van: a cada uno (menos yo) le llega su parte como cobro */
export async function dividirCancha(pid: string): Promise<string | null> {
  const p = partido(pid);
  const f = franjaCompleta(p?.franja_id);
  if (!p || !f) return 'Primero aparta una cancha';
  const van = confirmados(p, respuestas());
  const otros = van.filter((u) => u !== yo());
  if (!otros.length) return 'Aún nadie confirmó';
  const cuota = cuotaCancha(f.precio, Math.max(van.length, 1));
  return cobrar(otros, otros.map(() => cuota), `Cancha ${f.club.nombre} · ${cuando(f.inicio)}`, pid);
}

/**
 * Pagar la cancha al club. El cobro en línea necesita una pasarela (Wompi/PSE) con llaves del comercio: el servidor
 * crea el pago (pago_crear) y, cuando esté configurada, devuelve la URL de checkout. Mientras tanto el pago queda
 * registrado como "por pagar en el club". En la demo se marca pagada.
 */
/** Pagar la cancha completa: con tarjeta/PSE/Nequi ('app') o con el saldo Quilombo */
export async function pagarCancha(pid: string, metodo: 'app' | 'saldo' = 'app'): Promise<{ url?: string; pendiente?: boolean; error?: string }> {
  const p = partido(pid);
  if (!p?.franja_id) return { error: 'Primero aparta una cancha' };
  if (E2E) {
    const err = await pagarFranjaEnApp(p.franja_id, nombreDe(yo()), metodo, yo());
    if (err) return { error: err };
    await db.social_partidos.put({ ...(await db.social_partidos.get(pid))!, updated_at: marca().updated_at, estado: 'confirmado' });
    return {};
  }
  const { data, error } = await supabase.rpc('pago_crear', { p_partido: pid });
  if (error) return { error: motivo(error) };
  const r = (data as { url: string | null }[] | null)?.[0];
  await refrescar();
  return r?.url ? { url: r.url } : { pendiente: true };
}

// ───────── Torneos ─────────
export const torneos = () => (datos.torneos as Torneo[]).slice().sort((a, b) => a.inicio.localeCompare(b.inicio));
export const torneo = (id: string) => torneos().find((t) => t.id === id) ?? null;
export const misInscripciones = () => (datos.inscripciones as Inscripcion[]).filter((i) => (i.user_id === yo() || i.pareja === yo()) && i.estado !== 'cancelada');
export const inscritoEn = (tid: string) => misInscripciones().some((i) => i.torneo_id === tid);

/** Cómo paga la inscripción: con tarjeta (queda inscrito de una) o subiendo el comprobante (el club lo revisa) */
export type PagoInscripcion = { metodo: 'tarjeta' } | { metodo: 'saldo' } | { metodo: 'comprobante'; comprobante: string };
export async function inscribirme(tid: string, categoria: number, pareja: string | null, pago: PagoInscripcion | null = null): Promise<string | null> {
  const t = torneo(tid);
  if (!t) return 'Ese torneo ya no está';
  if (E2E) {
    const conSaldo = pago?.metodo === 'saldo';
    if (t.precio && conSaldo && saldoQuilombo(yo()) < t.precio) return `Saldo insuficiente: tienes ${pesos(saldoQuilombo(yo()))} y la inscripción es de ${pesos(t.precio)}`;
    const iid = crypto.randomUUID();
    const estado = !t.precio || pago?.metodo === 'tarjeta' || conSaldo ? 'inscrito' : pago?.metodo === 'comprobante' ? 'comprobante' : 'pendiente_pago';
    const fila = { ...marca(), id: iid, torneo_id: tid, user_id: yo(), pareja, categoria, estado, metodo: pago?.metodo ?? null, comprobante: pago?.metodo === 'comprobante' ? pago.comprobante : null, nota_club: null };
    await db.social_inscripciones.put(fila);
    if (t.precio && (pago?.metodo === 'tarjeta' || conSaldo)) await pagarTorneoEnApp({ ...fila, estado: 'pendiente_pago' } as Inscripcion, t, nombreDe(yo()), conSaldo ? 'saldo' : 'app');
    await db.social_torneos.put({ ...(await db.social_torneos.get(tid))!, updated_at: marca().updated_at, inscritos: t.inscritos + 1 });
    await avisarInscripcion(t, `${nombreDe(yo())}${pareja ? ` y ${nombreDe(pareja)}` : ''}`, categoria);
    await db.social_eventos.put({ ...marca(), id: crypto.randomUUID(), actor: yo(), participantes: [yo(), ...(pareja ? [pareja] : [])], tipo: 'torneo', ref: tid, texto: `${nombreDe(yo())}${pareja ? ` y ${nombreDe(pareja)}` : ''} se inscribió en ${t.nombre} (${categoria}ª)` });
    return null;
  }
  const { error } = await supabase.rpc('torneo_inscribirse', { p_torneo: tid, p_categoria: categoria, p_pareja: pareja });
  if (error) return motivo(error);
  await refrescar();
  return null;
}

/** Subir otro comprobante cuando el club rechazó el anterior: vuelve a revisión */
export async function reenviarComprobante(iid: string, comprobante: string): Promise<string | null> {
  const i = await db.social_inscripciones.get(iid);
  if (!i) return 'Esa inscripción ya no está';
  await db.social_inscripciones.put({ ...i, estado: 'comprobante', metodo: 'comprobante', comprobante, nota_club: null, updated_at: marca().updated_at });
  const t = torneo(i.torneo_id);
  if (t) await avisarInscripcion(t, `${nombreDe(yo())} (nuevo comprobante)`, i.categoria);
  return null;
}
/** Mi inscripción (la más reciente, no cancelada) en un torneo */
export const miInscripcion = (tid: string) => misInscripciones().filter((i) => i.torneo_id === tid).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0] ?? null;
