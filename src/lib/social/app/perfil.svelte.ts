// Tu perfil de jugador (lo que ve tu gente): foto o avatar dibujado, nombre, color y, de pádel, categoría,
// club base y ciudad. Los puntos de ranking los pone el servidor (no se editan a mano).
// Cada cambio se ve al instante (fila local de social_perfiles) y se guarda en el servidor; en la demo queda local.
import { supabase } from '$lib/data/supabase';
import { datos } from '$lib/data/datos.svelte';
import { db } from '$lib/data/db';
import { E2E, sesion } from '$lib/app/sesion.svelte';
import { esCategoria } from '../domain/padel';
import { motivo, yo, type PerfilJugador } from './vinculos';

export type PerfilVisible = PerfilJugador;

/** Fotos elegidas en la demo de pruebas (no hay servidor): path → URL local */
export const fotosLocales = new Map<string, string>();

/** Mi perfil: el del servidor si ya llegó; si no, uno con la parte del correo antes de la @ */
export function miPerfil(): PerfilVisible {
  const p = datos.perfiles.find((x) => x.user_id === yo()) as PerfilVisible | undefined;
  if (p) return p;
  return { user_id: yo(), nombre: sesion.usuario?.email?.split('@')[0] || 'Tú', color: '#b69cff' };
}

/** Refleja el cambio en la fila local (los perfiles solo se traen del servidor: así no hay que esperar) */
async function local(cambios: Partial<PerfilVisible>) {
  const actual = (await db.social_perfiles.get(yo())) ?? { ...miPerfil(), codigo: 'local' };
  await db.social_perfiles.put({ ...actual, ...cambios, user_id: yo() });
}

async function imagen(avatar: string | null, foto: string | null): Promise<string | null> {
  if (!E2E) {
    const { error } = await supabase.rpc('social_imagen', { p_avatar: avatar, p_foto: foto });
    if (error) return motivo(error);
  }
  await local({ avatar, foto });
  return null;
}
export const elegirAvatar = (id: string) => imagen(id, null);
export const quitarImagen = () => imagen(null, null);

/** Recorta al centro en cuadrado de 512 px y la deja en JPEG liviano */
async function cuadrada(archivo: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const lado = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  c.getContext('2d')!.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo leer la foto'))), 'image/jpeg', 0.82));
}

export async function subirFoto(archivo: File): Promise<string | null> {
  let blob: Blob;
  try { blob = await cuadrada(archivo); } catch { return 'No se pudo leer esa foto. Prueba con otra.'; }
  const path = `${yo()}/perfil/${Date.now()}.jpg`;
  if (E2E) {
    fotosLocales.set(path, URL.createObjectURL(blob));
    return imagen(null, path);
  }
  const { error } = await supabase.storage.from('social').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) return navigator.onLine ? 'No se pudo subir la foto. Intenta de nuevo.' : 'Necesitas conexión para subir la foto.';
  const anterior = miPerfil().foto;
  const err = await imagen(null, path);
  if (!err && anterior && anterior !== path) void supabase.storage.from('social').remove([anterior]);
  return err;
}

export async function cambiarNombre(nombre: string): Promise<string | null> {
  const n = nombre.trim().slice(0, 40);
  if (!n) return 'Escribe tu nombre';
  if (!E2E) {
    const { error } = await supabase.rpc('social_yo', { p_nombre: n, p_color: null });
    if (error) return motivo(error);
  }
  await local({ nombre: n });
  return null;
}

export async function cambiarColor(color: string): Promise<string | null> {
  if (!E2E) {
    const { error } = await supabase.rpc('social_yo', { p_nombre: null, p_color: color });
    if (error) return motivo(error);
  }
  await local({ color });
  return null;
}

/** Categoría (1ª–6ª), club base y ciudad. null = quitarlo. */
export async function guardarPadel(c: { categoria: number | null; club_base: string | null; ciudad: string | null }): Promise<string | null> {
  if (c.categoria !== null && !esCategoria(c.categoria)) return 'La categoría va de 1ª a 6ª';
  const club = c.club_base?.trim().slice(0, 60) || null;
  const ciudad = c.ciudad?.trim().slice(0, 40) || null;
  if (!E2E) {
    const { error } = await supabase.rpc('social_padel', { p_categoria: c.categoria, p_club: club, p_ciudad: ciudad });
    if (error) return motivo(error);
  }
  await local({ categoria: c.categoria, club_base: club, ciudad });
  return null;
}
