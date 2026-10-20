// Historias (la fila de círculos arriba del feed): lo nuevo de cada persona en las últimas 24 h — sus fotos,
// sus resultados y los gestos que te mandó. Lo visto se recuerda en este dispositivo (aro de color = algo nuevo).
import { datos } from '$lib/data/datos.svelte';
import { type EventoMuro, type Publicacion } from '../domain/social';
import { perfilesGente, relacionCon } from './rituales';
import { publicaciones } from './social';
import { nombreDe, yo } from './vinculos';

export type ItemHistoria =
  | { id: string; tipo: 'foto'; path: string; pub: Publicacion; en: string }
  | { id: string; tipo: 'resultado'; pub: Publicacion; en: string }
  | { id: string; tipo: 'gesto'; evento: EventoMuro; en: string };

export interface PersonaHistoria { uid: string; nombre: string; color: string; relacion: string | null; items: ItemHistoria[]; nuevo: boolean }

const DIA = 86_400_000;
const CLAVE = 'q-historias-vistas:';
function leer(): string[] { try { return JSON.parse(localStorage.getItem(CLAVE + yo()) ?? '[]'); } catch { return []; } }
export function marcarVista(itemId: string) {
  const v = leer();
  if (v.includes(itemId)) return;
  try { localStorage.setItem(CLAVE + yo(), JSON.stringify([...v, itemId].slice(-800))); } catch { /* sin almacenamiento */ }
}

function itemsDe(ps: Publicacion[]): ItemHistoria[] {
  const items: ItemHistoria[] = [];
  for (const p of ps.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (p.fotos?.length) p.fotos.slice(0, 6).forEach((f, i) => items.push({ id: `${p.id}:${i}`, tipo: 'foto', path: f.path, pub: p, en: p.created_at }));
    else items.push({ id: p.id, tipo: 'resultado', pub: p, en: p.created_at });
  }
  return items;
}

/** Personas conectadas con sus historias; primero las que tienen algo nuevo, luego las vistas, al final las vacías */
export function historias(ahora = Date.now()): PersonaHistoria[] {
  const vistas = new Set(leer());
  const recientes = publicaciones().filter((p) => !p.deleted_at && ahora - new Date(p.created_at).getTime() < DIA);
  const gestos = (datos.eventos as EventoMuro[]).filter((e) => e.tipo === 'saludo' && e.participantes.includes(yo()) && ahora - new Date(e.created_at).getTime() < DIA);
  const lista = perfilesGente().map((p) => {
    const items = itemsDe(recientes.filter((x) => x.autor === p.user_id));
    for (const e of gestos.filter((x) => x.actor === p.user_id)) items.push({ id: 'ev:' + e.id, tipo: 'gesto', evento: e, en: e.created_at });
    items.sort((a, b) => a.en.localeCompare(b.en));
    return { uid: p.user_id, nombre: p.nombre, color: p.color, relacion: relacionCon(p.user_id)?.id ?? null, items, nuevo: items.some((i) => !vistas.has(i.id)) };
  });
  const peso = (h: PersonaHistoria) => (h.nuevo ? 0 : h.items.length ? 1 : 2);
  const ultimo = (h: PersonaHistoria) => h.items[h.items.length - 1]?.en ?? '';
  return lista.sort((a, b) => peso(a) - peso(b) || ultimo(b).localeCompare(ultimo(a)));
}
/** Lo que yo subí en las últimas 24 h ("Tu historia") */
export function miHistoria(ahora = Date.now()): PersonaHistoria {
  const items = itemsDe(publicaciones().filter((x) => !x.deleted_at && x.autor === yo() && ahora - new Date(x.created_at).getTime() < DIA));
  const p = datos.perfiles.find((x) => x.user_id === yo());
  return { uid: yo(), nombre: p?.nombre ?? nombreDe(yo()), color: p?.color ?? '#B8DBFF', relacion: null, items, nuevo: false };
}
/** Primer ítem sin ver (para empezar donde se quedó) */
export function primeroSinVer(h: PersonaHistoria): number {
  const vistas = new Set(leer());
  const i = h.items.findIndex((x) => !vistas.has(x.id));
  return i < 0 ? 0 : i;
}
