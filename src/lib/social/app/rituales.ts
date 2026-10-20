// Ayudas de pantalla: relación con alguien, gente conectada, iniciales y "hace 5 min".
import { datos } from '$lib/data/datos.svelte';
import { activas, otroDe, type Vinculo } from '../domain/vinculos';
import { cobrosAbiertos, vinculos, yo, type PerfilJugador } from './vinculos';

/** Relación activa con esa persona (o null) */
export const relacionCon = (uid: string): Vinculo | null => activas(vinculos()).find((v) => otroDe(v, yo()) === uid) ?? null;
/** Relación (activa o pendiente) con esa persona */
export const cualquierRelacionCon = (uid: string): Vinculo | null => vinculos().find((v) => otroDe(v, yo()) === uid && (v.estado === 'activa' || v.estado === 'pendiente')) ?? null;
/** Gente conectada (uids) */
export const genteActiva = () => activas(vinculos()).map((v) => otroDe(v, yo()));
/** ¿Queda algo abierto entre los dos? */
export const hayAbiertoCon = (uid: string) => cobrosAbiertos().some((c) => c.acreedor === uid || c.deudor === uid);

export const ini = (n: string) => n.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase() ?? '').join('') || '?';
export const primerNombre = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/** "hace 5 min", "hace 3 h" o la fecha corta */
export function hace(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? 'ahora' : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.round(min / 60)} h` : new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/** Perfiles de la gente conectada */
export const perfilesGente = () => {
  const ids = new Set(genteActiva());
  return (datos.perfiles as PerfilJugador[]).filter((p) => ids.has(p.user_id));
};
