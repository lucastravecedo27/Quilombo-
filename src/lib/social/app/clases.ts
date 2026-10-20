// Clases con profesor (demo): el profesor publica horarios en un club (la cancha queda apartada para la clase) y los
// jugadores reservan con el profesor que quieran pagando con su saldo Quilombo. Al reservar, la cancha queda pagada.
import { db } from '$lib/data/db';
import { datos } from '$lib/data/datos.svelte';
import { debitar, registrar, registrarPago, reembolsar } from '$lib/club/app/club';
import { cuando, pesos, type Club, type Franja } from '../domain/jugar';
import { promedioEstrellas, puedoReservar, quedan, type Clase, type Profesor, type ResenaClase } from '../domain/clases';
import { nombreDe, yo } from './vinculos';

const ahora = () => new Date().toISOString();
const corto = (uid: string) => nombreDe(uid).split(' ')[0];

export const profesores = () => datos.profesores as Profesor[];
export const profesor = (uid: string) => profesores().find((p) => p.user_id === uid) ?? null;
export const esProfesor = (uid = yo()) => !!profesor(uid);
export const clases = () => datos.clases as Clase[];
export const clase = (id: string) => clases().find((c) => c.id === id) ?? null;
/** Los horarios de un profesor que vienen */
export const clasesDe = (uid: string, desde = Date.now()) => clases().filter((c) => c.profesor === uid && c.estado !== 'cancelada' && Date.parse(c.fin) > desde);
/** Los que tienen cupo, de los que vienen */
export const disponiblesDe = (uid: string) => clasesDe(uid).filter((c) => c.estado === 'abierta' && quedan(c) > 0 && Date.parse(c.inicio) > Date.now());
/** Las clases que reservé */
export const misClases = (uid = yo()) => clases().filter((c) => c.alumnos.includes(uid) && c.estado !== 'cancelada' && Date.parse(c.fin) > Date.now() - 3 * 3_600_000);
export const resenasDe = (uid: string) => (datos.resenasClase as ResenaClase[]).filter((r) => r.profesor === uid).sort((a, b) => b.created_at.localeCompare(a.created_at));
const clubDe = (id: string) => (datos.clubes as Club[]).find((c) => c.id === id) ?? null;

/** Reservar una clase: se paga (con saldo o en la app) y la cancha queda pagada para la clase */
export async function reservarClase(cid: string, uid = yo(), metodo: 'saldo' | 'app' = 'saldo'): Promise<string | null> {
  const c = (await db.social_clases.get(cid)) as Clase | undefined;
  if (!c) return 'Esa clase ya no está';
  const v = puedoReservar(c, uid);
  if (!v.ok) return v.motivo ?? 'No se puede reservar';
  if (metodo === 'saldo') {
    const err = await debitar(uid, c.precio, `Clase con ${nombreDe(c.profesor)} · ${cuando(c.inicio)}`, cid, c.club_id);
    if (err) return err;
  }
  const alumnos = [...c.alumnos, uid];
  await db.social_clases.put({ ...c, alumnos, estado: alumnos.length >= c.cupos ? 'llena' : 'abierta', updated_at: ahora() });
  if (c.franja_id) {
    const f = (await db.social_franjas.get(c.franja_id)) as Franja | undefined;
    if (f) await db.social_franjas.put({ ...f, estado: 'pagada', cliente: `Clase · ${nombreDe(c.profesor)}`, origen: 'app', nota: `Alumnos: ${alumnos.map(corto).join(', ')}`, updated_at: ahora() });
  }
  await registrarPago('clase', cid, c.precio, metodo, nombreDe(uid), c.club_id);
  await registrar('clase', '🎓', `${nombreDe(uid)} reservó clase con ${nombreDe(c.profesor)} · ${cuando(c.inicio)} · ${pesos(c.precio)}${metodo === 'saldo' ? ' con saldo' : ' en la app'}`, c.club_id);
  return null;
}
/** Cancelar mi reserva: se devuelve el saldo */
export async function cancelarReservaClase(cid: string, uid = yo()) {
  const c = (await db.social_clases.get(cid)) as Clase | undefined;
  if (!c || !c.alumnos.includes(uid)) return;
  const alumnos = c.alumnos.filter((u) => u !== uid);
  await db.social_clases.put({ ...c, alumnos, estado: 'abierta', updated_at: ahora() });
  await reembolsar(uid, c.precio, `Devolución · clase con ${nombreDe(c.profesor)}`, cid, c.club_id);
  if (c.franja_id && !alumnos.length) {
    const f = (await db.social_franjas.get(c.franja_id)) as Franja | undefined;
    if (f) await db.social_franjas.put({ ...f, estado: 'apartada', cliente: `Clase · ${nombreDe(c.profesor)}`, nota: 'Clase disponible', updated_at: ahora() });
  }
  await registrar('clase', '↩️', `${nombreDe(uid)} canceló su clase con ${nombreDe(c.profesor)} · ${cuando(c.inicio)}`, c.club_id);
}

/** El profesor publica un horario en una cancha libre del club (queda apartada para la clase) */
export async function publicarClase(o: { franja_id: string; tipo: Clase['tipo']; cupos: number; precio: number; nota?: string | null }, uid = yo()): Promise<string | null> {
  const f = (await db.social_franjas.get(o.franja_id)) as Franja | undefined;
  if (!f || f.estado !== 'libre') return 'Esa cancha ya no está libre';
  const ca = await db.social_canchas.get(f.cancha_id);
  if (!ca) return 'Esa cancha ya no está';
  await db.social_franjas.put({ ...f, estado: 'apartada', cliente: `Clase · ${nombreDe(uid)}`, origen: 'app', nota: 'Clase disponible', updated_at: ahora() });
  const id = crypto.randomUUID();
  await db.social_clases.put({ id, profesor: uid, club_id: ca.club_id, franja_id: f.id, inicio: f.inicio, fin: f.fin, tipo: o.tipo, cupos: o.tipo === 'individual' ? 1 : Math.max(2, o.cupos), precio: o.precio, alumnos: [], estado: 'abierta', nota: o.nota ?? null, created_at: ahora(), updated_at: ahora(), deleted_at: null });
  await registrar('clase', '🎓', `${nombreDe(uid)} abrió clase ${o.tipo} · ${ca.nombre} · ${cuando(f.inicio)}`, ca.club_id);
  return null;
}
/** El profesor quita un horario: a los alumnos se les devuelve y la cancha se libera */
export async function cancelarClase(cid: string) {
  const c = (await db.social_clases.get(cid)) as Clase | undefined;
  if (!c) return;
  for (const u of c.alumnos) await reembolsar(u, c.precio, `Devolución · clase cancelada por ${nombreDe(c.profesor)}`, cid, c.club_id);
  await db.social_clases.put({ ...c, estado: 'cancelada', updated_at: ahora() });
  if (c.franja_id) {
    const f = (await db.social_franjas.get(c.franja_id)) as Franja | undefined;
    if (f) await db.social_franjas.put({ ...f, estado: 'libre', cliente: null, origen: null, nota: null, partido_id: null, updated_at: ahora() });
  }
  await registrar('clase', '✖️', `${nombreDe(c.profesor)} canceló su clase de ${cuando(c.inicio)}${c.alumnos.length ? ` (se devolvió el saldo a ${c.alumnos.length})` : ''}`, c.club_id);
}
/** Hacerme profesor (o actualizar mi perfil de profesor) */
export async function guardarProfesor(p: Omit<Profesor, 'user_id' | 'estrellas' | 'resenas'>, uid = yo()) {
  const antes = profesor(uid);
  await db.social_profesores.put({ estrellas: 0, resenas: 0, ...antes, ...p, user_id: uid, updated_at: ahora(), deleted_at: null });
}
/** Reseña del alumno al profesor */
export async function resenarProfesor(prof: string, estrellas: number, texto: string | null, uid = yo()) {
  await db.social_resenas_clase.put({ id: crypto.randomUUID(), profesor: prof, alumno: uid, estrellas, texto, created_at: ahora(), updated_at: ahora(), deleted_at: null });
  const p = profesor(prof);
  if (p) await db.social_profesores.put({ ...p, ...promedioEstrellas(p.estrellas, p.resenas, [estrellas]), updated_at: ahora() });
}
export const clubDeClase = (c: Clase) => clubDe(c.club_id);

/** Clases que ya pasaron y en las que estuve (para dejar reseña) */
export const clasesTomadasCon = (prof: string, uid = yo()) => clases().filter((c) => c.profesor === prof && c.alumnos.includes(uid) && (c.estado === 'dada' || Date.parse(c.fin) < Date.now()));
export const yaResene = (prof: string, uid = yo()) => resenasDe(prof).some((r) => r.alumno === uid);
/** La próxima clase con cupo de un profesor */
export const proximaDe = (uid: string) => disponiblesDe(uid)[0] ?? null;
/** Ciudades donde da clase un profesor (por sus clubes) */
export const ciudadesDe = (p: Profesor) => [...new Set(p.clubes.map((id) => clubDe(id)?.ciudad).filter((x): x is string => !!x))];
export const nombresClubes = (p: Profesor) => p.clubes.map((id) => clubDe(id)?.nombre).filter((x): x is string => !!x);
/** Lo que gana el profesor en un rango (precio × alumnos de sus clases) */
export const ingresosDe = (uid: string, desde: number, hasta: number) =>
  clases().filter((c) => c.profesor === uid && c.estado !== 'cancelada' && Date.parse(c.inicio) >= desde && Date.parse(c.inicio) < hasta).reduce((s, c) => s + c.precio * c.alumnos.length, 0);
