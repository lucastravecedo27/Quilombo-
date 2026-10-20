// Buscador de jugadores (como Instagram): por @usuario o nombre, sugerencias y mi @usuario.
// El servidor solo devuelve nombre, @usuario, color, lo de pádel (categoría, ciudad) y el código para agregar.
import { supabase } from '$lib/data/supabase';
import { datos } from '$lib/data/datos.svelte';
import { db } from '$lib/data/db';
import { sincronizar } from '$lib/data/sync';
import { E2E } from '$lib/app/sesion.svelte';
import { clave } from '../domain/social';
import { motivo, yo } from './vinculos';

export interface Encontrado { codigo: string; nombre: string; usuario: string | null; color: string; categoria?: number | null; ciudad?: string | null; estado?: 'pendiente' | 'activa' | null; en_comun: number }

/** Formato de @usuario válido (igual que el servidor) */
export const usuarioValido = (u: string) => /^[a-z0-9._]{3,20}$/.test(u) && !/^\.|\.$|\.\./.test(u);
/** Propuesta a partir del nombre: "Lucas Travecedo" → "lucas.travecedo" */
export const sugerirUsuario = (nombre: string) => clave(nombre).replace(/\s+/g, '.').replace(/[^a-z0-9._]/g, '').slice(0, 20) || 'jugador';

// Demo (sin servidor): jugadores ficticios para probar la pantalla
const DEMO: Encontrado[] = [
  { codigo: 'demo0valen', nombre: 'Valentina Ríos', usuario: 'valen.rios', color: '#F7B8D0', categoria: 4, ciudad: 'Medellín', estado: null, en_comun: 3 },
  { codigo: 'demo0santi', nombre: 'Santiago Mejía', usuario: 'santi.mejia', color: '#B8DBFF', categoria: 3, ciudad: 'Bogotá', estado: null, en_comun: 2 },
  { codigo: 'demo0manu0', nombre: 'Manuela Gómez', usuario: 'manugomez', color: '#C4F246', categoria: 5, ciudad: 'Cali', estado: null, en_comun: 1 },
  { codigo: 'demo0pipe0', nombre: 'Felipe Rojas', usuario: 'pipe_rojas', color: '#FFD8A8', categoria: 4, ciudad: 'Bogotá', estado: 'pendiente', en_comun: 0 }
];

export async function buscarPersonas(q: string): Promise<{ lista: Encontrado[]; error?: string }> {
  const t = q.trim().replace(/^@/, '');
  if (t.length < 2) return { lista: [] };
  if (E2E) {
    const k = clave(t);
    return { lista: DEMO.filter((p) => (p.usuario ?? '').startsWith(t.toLowerCase()) || clave(p.nombre).includes(k)) };
  }
  const { data, error } = await supabase.rpc('social_buscar', { p_q: t });
  if (error) return { lista: [], error: motivo(error) };
  return { lista: (data ?? []) as Encontrado[] };
}
export async function sugerencias(): Promise<Encontrado[]> {
  if (E2E) return DEMO.filter((p) => !p.estado);
  const { data } = await supabase.rpc('social_sugerencias');
  return (data ?? []) as Encontrado[];
}

export const miUsuario = () => (datos.perfiles.find((p) => p.user_id === yo()) as { usuario?: string | null; buscable?: boolean } | undefined);
export async function guardarUsuario(u: string): Promise<string | null> {
  const limpio = u.trim().replace(/^@/, '').toLowerCase();
  if (!usuarioValido(limpio)) return 'Usa de 3 a 20 letras, números, punto o guion bajo (sin tildes ni espacios)';
  if (E2E) { const p = await db.social_perfiles.get(yo()); if (p) await db.social_perfiles.put({ ...p, usuario: limpio }); return null; }
  const { error } = await supabase.rpc('social_usuario', { p_usuario: limpio });
  if (error) return motivo(error);
  await sincronizar().catch(() => undefined);
  return null;
}
export async function guardarBuscable(si: boolean): Promise<string | null> {
  if (E2E) { const p = await db.social_perfiles.get(yo()); if (p) await db.social_perfiles.put({ ...p, buscable: si }); return null; }
  const { error } = await supabase.rpc('social_buscable', { p_buscable: si });
  if (error) return motivo(error);
  await sincronizar().catch(() => undefined);
  return null;
}
