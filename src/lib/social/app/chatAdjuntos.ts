// Fotos y notas de voz del chat. Los archivos van al bucket privado "chat" en <yo>/r-<relación>/<archivo>
// (supabase/migrations/*_social_chat.sql): solo los de esa conversación pueden verlos. Las URL firmadas duran
// 1 h y se reusan; lo recién enviado se ve desde la copia local.
import { supabase } from '$lib/data/supabase';
import { E2E } from '$lib/app/sesion.svelte';
import { comprimir } from '../data/fotos';
import { yo, type Sala } from './vinculos';

export const salaClave = (sala: Sala) => 'r-' + sala.relacion;

/** Copias locales (lo que acabo de mandar se ve al instante, sin esperar la descarga) */
const locales = new Map<string, string>();
const firmadas = new Map<string, { url: string; vence: number }>();

const extDe = (tipo: string) => (tipo.includes('mp4') || tipo.includes('m4a') || tipo.includes('aac') ? 'm4a' : tipo.includes('webm') ? 'webm' : tipo.includes('ogg') ? 'ogg' : tipo.includes('mpeg') ? 'mp3' : tipo.includes('wav') ? 'wav' : 'bin');

/** Sube una foto (comprimida a < 500 KB) o un audio y devuelve su ruta en el bucket */
export async function subirAdjunto(sala: Sala, archivo: Blob, clase: 'foto' | 'voz'): Promise<{ path?: string; error?: string }> {
  let blob = archivo;
  if (clase === 'foto') {
    try { blob = await comprimir(archivo); } catch { return { error: 'No se pudo preparar la foto' }; }
  }
  const tipo = clase === 'foto' ? 'image/jpeg' : (archivo.type || 'audio/mp4').split(';')[0];
  const path = `${yo()}/${salaClave(sala)}/${crypto.randomUUID()}.${clase === 'foto' ? 'jpg' : extDe(tipo)}`;
  locales.set(path, URL.createObjectURL(blob));
  if (E2E) return { path }; // demo de pruebas: queda solo en este dispositivo
  if (!navigator.onLine) return { error: 'Sin conexión: la foto y el audio necesitan internet' };
  const { error } = await supabase.storage.from('chat').upload(path, blob, { contentType: tipo, upsert: false });
  if (error) { locales.delete(path); return { error: 'No se pudo subir. Intenta de nuevo.' }; }
  return { path };
}

/** URL para ver/escuchar un adjunto (local si lo acabo de mandar; si no, firmada por 1 h) */
export async function urlAdjunto(path: string): Promise<string | null> {
  const l = locales.get(path);
  if (l) return l;
  const c = firmadas.get(path);
  if (c && c.vence > Date.now()) return c.url;
  if (E2E) return null;
  const { data } = await supabase.storage.from('chat').createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  firmadas.set(path, { url: data.signedUrl, vence: Date.now() + 50 * 60_000 });
  return data.signedUrl;
}

/** Formato de audio que este navegador sabe grabar (el iPhone graba en mp4/aac) */
export function formatoVoz(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const t of ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return '';
}

export const duracionTexto = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s % 60))).padStart(2, '0')}`;
