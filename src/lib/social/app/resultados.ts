// Resultados de partidos (demo): alguien de los cuatro propone el marcador; los demás confirman o no están de acuerdo.
// Solo cuando los cuatro confirman cuenta como victoria/derrota y mueve el ranking. Si alguno no está de acuerdo queda
// en disputa y lo resuelve el club donde se jugó. En torneos el club digita el resultado y es oficial.
import { db } from '$lib/data/db';
import { datos } from '$lib/data/datos.svelte';
import { estadoSegun, ganadorDeSets, participantes, promedio, puntosElo, textoRacha, type Resultado } from '../domain/ranking';
import { textoPuntos } from '../domain/padel';
import { nombreDe, yo } from './vinculos';

const ahora = () => new Date().toISOString();

export const resultados = () => datos.resultados as Resultado[];
export const resultado = (id: string) => resultados().find((r) => r.id === id) ?? null;
/** Los míos (en los que juego), del más nuevo al más viejo */
export const misResultados = (uid = yo()) => resultados().filter((r) => participantes(r).includes(uid));
/** Los que esperan MI confirmación */
export const porConfirmar = (uid = yo()) => misResultados(uid).filter((r) => r.estado === 'pendiente' && r.confirmaciones[uid] !== 'si' && r.confirmaciones[uid] !== 'no');
export const resultadoDePartido = (pid: string) => resultados().find((r) => r.partido_id === pid && r.estado !== 'anulado') ?? null;
const perfil = (u: string) => datos.perfiles.find((p) => p.user_id === u);
const puntosDe = (u: string) => (perfil(u)?.puntos_ranking as number | undefined) ?? 1000;

export interface NuevoResultado { partido_id?: string | null; torneo_id?: string | null; club_id?: string | null; equipo_a: string[]; equipo_b: string[]; sets: [number, number][] }
/** Proponer el marcador: quien lo propone ya queda de acuerdo */
export async function proponerResultado(n: NuevoResultado, quien = yo()): Promise<{ id?: string; error?: string }> {
  const ganador = ganadorDeSets(n.sets);
  if (!ganador) return { error: 'El marcador no tiene ganador' };
  const todos = [...n.equipo_a, ...n.equipo_b];
  if (new Set(todos).size !== todos.length || n.equipo_a.length < 1 || n.equipo_b.length < 1) return { error: 'Revisa las parejas' };
  if (!todos.includes(quien)) return { error: 'Solo los que jugaron pueden poner el resultado' };
  const id = crypto.randomUUID();
  const r: Resultado = {
    id, partido_id: n.partido_id ?? null, torneo_id: n.torneo_id ?? null, club_id: n.club_id ?? null, equipo_a: n.equipo_a, equipo_b: n.equipo_b,
    sets: n.sets, ganador, propuesto_por: quien, confirmaciones: { [quien]: 'si' }, estado: 'pendiente', oficial: false, puntos: null, motivo: null,
    created_at: ahora(), resuelto_en: null
  };
  await db.social_resultados.put({ ...r, updated_at: ahora(), deleted_at: null });
  return { id };
}

/** Confirmar (sí) o no estar de acuerdo (no) con un resultado */
export async function confirmarResultado(id: string, voto: 'si' | 'no', motivo: string | null = null, quien = yo()): Promise<string | null> {
  const r = (await db.social_resultados.get(id)) as Resultado | undefined;
  if (!r || r.estado !== 'pendiente') return 'Ese resultado ya se cerró';
  if (!participantes(r).includes(quien)) return 'No jugaste ese partido';
  const confirmaciones = { ...r.confirmaciones, [quien]: voto };
  const estado = estadoSegun({ ...r, confirmaciones });
  const nuevo: Resultado = { ...r, confirmaciones, estado, motivo: voto === 'no' ? motivo ?? 'No está de acuerdo' : r.motivo };
  if (estado === 'valido') await aplicar(nuevo, false);
  else await db.social_resultados.put({ ...nuevo, updated_at: ahora() });
  return null;
}

/**
 * Deja el resultado válido: suma victoria/derrota, ajusta la racha y mueve los puntos (Elo por pareja; en torneos
 * pesa más). Lo publica en el muro de los que jugaron.
 */
export async function aplicar(r: Resultado, oficial: boolean) {
  const ganaA = r.ganador === 'a';
  const d = puntosElo(promedio(r.equipo_a, puntosDe), promedio(r.equipo_b, puntosDe), ganaA, r.torneo_id ? 48 : 32);
  const puntos: Record<string, number> = {};
  for (const u of r.equipo_a) puntos[u] = d.a;
  for (const u of r.equipo_b) puntos[u] = d.b;
  for (const u of participantes(r)) {
    const p = await db.social_perfiles.get(u);
    if (!p) continue;
    const gano = (ganaA ? r.equipo_a : r.equipo_b).includes(u);
    const racha = (p.racha as number | undefined) ?? 0;
    await db.social_perfiles.put({
      ...p, updated_at: ahora(),
      puntos_ranking: Math.max(100, ((p.puntos_ranking as number | undefined) ?? 1000) + puntos[u]),
      victorias: ((p.victorias as number | undefined) ?? 0) + (gano ? 1 : 0),
      derrotas: ((p.derrotas as number | undefined) ?? 0) + (gano ? 0 : 1),
      racha: gano ? Math.max(0, racha) + 1 : Math.min(0, racha) - 1
    });
  }
  await db.social_resultados.put({ ...r, estado: 'valido', oficial, puntos, resuelto_en: ahora(), updated_at: ahora() });
  const nombres = (us: string[]) => us.map((u) => nombreDe(u).split(' ')[0]).join(' y ');
  const g = ganaA ? r.equipo_a : r.equipo_b, p = ganaA ? r.equipo_b : r.equipo_a;
  const marcador = r.sets.map(([a, b]) => (ganaA ? `${a}-${b}` : `${b}-${a}`)).join(' ');
  await db.social_eventos.put({
    id: crypto.randomUUID(), created_at: ahora(), updated_at: ahora(), deleted_at: null, actor: g[0], participantes: participantes(r), tipo: 'resultado_partido', ref: r.id, gesto: null,
    texto: `${nombres(g)} le ganaron a ${nombres(p)} ${marcador}${oficial ? ' (oficial)' : ' ✓ confirmado por los 4'} · +${ganaA ? d.a : d.b} pts`
  });
  // Rachas largas también salen en el muro
  for (const u of g) {
    const rr = ((await db.social_perfiles.get(u))?.racha as number | undefined) ?? 0;
    if (rr >= 3) await db.social_eventos.put({ id: crypto.randomUUID(), created_at: ahora(), updated_at: ahora(), deleted_at: null, actor: u, participantes: participantes(r), tipo: 'subio_ranking', ref: r.id, gesto: null, texto: `${nombreDe(u).split(' ')[0]} va ${textoRacha(rr)} · ${textoPuntos(puntosDe(u))}` });
  }
}

/** El club resuelve una disputa (elige quién ganó, con su marcador) o la anula */
export async function resolverDisputa(id: string, decision: { ganador: 'a' | 'b'; sets: [number, number][] } | 'anular') {
  const r = (await db.social_resultados.get(id)) as Resultado | undefined;
  if (!r || (r.estado !== 'disputado' && r.estado !== 'pendiente')) return 'Ese resultado ya se cerró';
  if (decision === 'anular') { await db.social_resultados.put({ ...r, estado: 'anulado', resuelto_en: ahora(), updated_at: ahora() }); return null; }
  await aplicar({ ...r, ganador: decision.ganador, sets: decision.sets }, true);
  return null;
}
/** Resultado de torneo digitado por el club organizador: oficial de una vez */
export async function registrarOficial(n: NuevoResultado & { torneo_id: string; club_id: string }) {
  const ganador = ganadorDeSets(n.sets);
  if (!ganador) return 'El marcador no tiene ganador';
  const r: Resultado = {
    id: crypto.randomUUID(), partido_id: null, torneo_id: n.torneo_id, club_id: n.club_id, equipo_a: n.equipo_a, equipo_b: n.equipo_b, sets: n.sets, ganador,
    propuesto_por: null, confirmaciones: {}, estado: 'valido', oficial: true, puntos: null, motivo: null, created_at: ahora(), resuelto_en: ahora()
  };
  await aplicar(r, true);
  return null;
}
