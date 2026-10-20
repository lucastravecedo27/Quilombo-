// Feed de la red (como Instagram): fotos, resultados, torneos, ranking, partidos abiertos y la actividad de tu gente,
// del más nuevo al más viejo. Va en tres partes para que nada se pierda: 📸 Fotos · 🎾 Partidos · 💬 Actividad.
import { datos } from '$lib/data/datos.svelte';
import { DE_PADEL, type EventoMuro, type Publicacion } from '../domain/social';
import type { Partido } from '../domain/jugar';
import { publicaciones } from './social';

export type Post =
  | { k: 'publicacion'; id: string; en: string; p: Publicacion }
  | { k: 'partido'; id: string; en: string; partido: Partido }
  | { k: 'momento'; id: string; en: string; ev: EventoMuro };

export type Seccion = 'fotos' | 'partidos' | 'actividad';
export const SECCIONES_FEED: { id: Seccion; nombre: string }[] = [
  { id: 'fotos', nombre: '📸 Fotos' }, { id: 'partidos', nombre: '🎾 Partidos' }, { id: 'actividad', nombre: '💬 Actividad' }
];

/** seccion: solo esa parte del feed (sin ella, todo junto). En Partidos van primero los que vienen, por fecha. */
export function armarFeed(seccion: Seccion | null = null, ahora = Date.now()): Post[] {
  const ps = publicaciones().filter((p) => !p.deleted_at);
  const vistas = new Set(ps.map((p) => p.id));
  const abiertos = (datos.partidos as Partido[]).filter((p) => p.estado === 'abierto' && new Date(p.cuando).getTime() > ahora);
  const partidosVistos = new Set(abiertos.map((p) => p.id));
  // Un evento que acompaña a una publicación o a un partido que ya sale como tarjeta no se repite
  const evs = (datos.eventos as EventoMuro[]).filter((e) => !(e.ref && (vistas.has(e.ref) || (e.tipo === 'partido' && partidosVistos.has(e.ref)))));
  const pubs: Post[] = ps.map((p) => ({ k: 'publicacion', id: 'p' + p.id, en: p.created_at, p }));
  const parts: Post[] = abiertos.map((partido) => ({ k: 'partido', id: 'j' + partido.id, en: partido.created_at, partido }));
  const moms: Post[] = evs.map((ev) => ({ k: 'momento', id: 'e' + ev.id, en: ev.created_at, ev }));
  const orden = (a: Post, b: Post) => b.en.localeCompare(a.en);
  if (seccion === 'fotos') return pubs.filter((x) => x.k === 'publicacion' && x.p.tipo === 'foto').sort(orden);
  if (seccion === 'partidos') {
    const proximos = [...parts].sort((a, b) => (a.k === 'partido' && b.k === 'partido' ? a.partido.cuando.localeCompare(b.partido.cuando) : 0));
    const resto = [...pubs.filter((x) => x.k === 'publicacion' && x.p.tipo !== 'foto'), ...moms.filter((x) => x.k === 'momento' && DE_PADEL.has(x.ev.tipo))].sort(orden);
    return [...proximos, ...resto];
  }
  if (seccion === 'actividad') return moms.filter((x) => x.k === 'momento' && !DE_PADEL.has(x.ev.tipo)).sort(orden);
  return [...pubs, ...parts, ...moms].sort(orden);
}
