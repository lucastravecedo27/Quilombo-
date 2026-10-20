// La red social en la app: gestos, publicaciones (fotos y resultados), comentarios, fotos privadas,
// reportar/bloquear y las condiciones de uso. Todo va por funciones del servidor; las fotos van al bucket "social".
import { supabase } from '$lib/data/supabase';
import { datos } from '$lib/data/datos.svelte';
import { db } from '$lib/data/db';
import { sincronizar } from '$lib/data/sync';
import { E2E } from '$lib/app/sesion.svelte';
import { comprimir, conTiempo } from '../data/fotos';
import { GESTOS, type Gesto, type Marcador, type Publicacion } from '../domain/social';
import { avisar, motivo, nombreDe, yo } from './vinculos';

const marca = () => { const t = new Date().toISOString(); return { created_at: t, updated_at: t, deleted_at: null }; };
const refrescar = () => sincronizar().catch(() => undefined);
const contactos = () => (datos.vinculos as { user_a: string; user_b: string; estado: string }[]).filter((v) => v.estado === 'activa').map((v) => (v.user_a === yo() ? v.user_b : v.user_a));

// ───────── Gestos ─────────
export async function saludar(relacionId: string, gesto: Gesto): Promise<string | null> {
  if (E2E) {
    const v = datos.vinculos.find((x) => x.id === relacionId);
    if (!v) return 'Solo con tu gente conectada';
    const otro = v.user_a === yo() ? v.user_b : v.user_a;
    const g = GESTOS.find((x) => x.id === gesto)!;
    await db.social_eventos.put({ ...marca(), id: crypto.randomUUID(), actor: yo(), participantes: [yo(), otro], tipo: 'saludo', gesto, ref: relacionId, texto: `${nombreDe(yo())} le mandó ${g.emoji} ${g.nombre} a ${nombreDe(otro)}` });
    return null;
  }
  const { data, error } = await supabase.rpc('social_saludar', { p_relacion: relacionId, p_gesto: gesto });
  if (error) return motivo(error);
  avisar('saludo', String(data));
  await refrescar();
  return null;
}

// ───────── Publicaciones (fotos, resultados de partidos y torneos) ─────────
export const publicaciones = () => datos.publicaciones as Publicacion[];
export const publicacion = (id: string) => publicaciones().find((p) => p.id === id) ?? null;
export const comentariosDe = (pid: string) =>
  (datos.comentarios as { id: string; publicacion_id: string; autor: string; texto: string; created_at: string }[]).filter((c) => c.publicacion_id === pid).sort((a, b) => a.created_at.localeCompare(b.created_at));
/** El evento del feed que acompaña a una publicación (las reacciones van sobre él) */
export const eventoDe = (pid: string) => (datos.eventos as { id: string; ref: string | null; tipo: string }[]).find((e) => e.ref === pid && (e.tipo === 'foto' || e.tipo === 'resultado_partido' || e.tipo === 'torneo')) ?? null;

export interface NuevaPublicacion { tipo: 'foto' | 'resultado_partido'; texto?: string; fotos: Blob[]; marcador?: Marcador | null; con: string[]; club?: string | null; ciudad?: string | null }
const LENTO = 'El servidor no respondió. Revisa tu conexión e inténtalo de nuevo.';

/** Sube las fotos (comprimidas) y publica para tu gente. alProgreso(0..1) para la barra de subida. */
export async function publicar(n: NuevaPublicacion, alProgreso?: (p: number) => void): Promise<{ id?: string; error?: string }> {
  const id = crypto.randomUUID();
  if (E2E) {
    const audiencia = contactos();
    const demo = ['demo/cancha.svg', 'demo/raquetas.svg', 'demo/podio.svg'];
    const tipoEv = n.tipo;
    await db.social_publicaciones.put({ ...marca(), id, autor: yo(), tipo: n.tipo, texto: n.texto ?? null, fotos: n.fotos.map((_, i) => ({ path: demo[i % demo.length] })), marcador: n.marcador ?? null, con: n.con, audiencia, club: n.club ?? null, ciudad: n.ciudad ?? null });
    await db.social_eventos.put({ ...marca(), id: crypto.randomUUID(), actor: yo(), participantes: [...audiencia, yo()], tipo: tipoEv, ref: id, texto: n.tipo === 'foto' ? `${nombreDe(yo())} subió una foto` : `${nombreDe(yo())} publicó un resultado` });
    return { id };
  }
  if (!navigator.onLine) return { error: 'Necesitas conexión para publicar.' };
  const subidas: { path: string }[] = [];
  try {
    for (const [i, f] of n.fotos.entries()) {
      const blob = await conTiempo(comprimir(f), 30_000, 'No se pudo preparar la foto. Prueba con otra.');
      const path = `${yo()}/${id}/${i + 1}.jpg`;
      const { error } = await conTiempo(supabase.storage.from('social').upload(path, blob, { contentType: 'image/jpeg', upsert: false }), 60_000, 'La subida está muy lenta. Revisa tu conexión.');
      if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
      subidas.push({ path });
      alProgreso?.((i + 1) / (n.fotos.length + 1));
    }
  } catch (e) {
    if (subidas.length) void supabase.storage.from('social').remove(subidas.map((s) => s.path)).catch(() => undefined);
    return { error: e instanceof Error && e.message ? e.message : 'No se pudieron subir las fotos.' };
  }
  const { error } = await conTiempo(supabase.rpc('publicacion_crear', {
    p_id: id, p_tipo: n.tipo, p_texto: n.texto ?? null, p_fotos: subidas, p_marcador: n.marcador ?? null, p_con: n.con, p_club: n.club ?? null, p_ciudad: n.ciudad ?? null
  }), 30_000, LENTO).catch((e: Error) => ({ error: { message: e.message, code: 'lento' } }));
  if (error) {
    void supabase.storage.from('social').remove(subidas.map((s) => s.path)).catch(() => undefined);
    return { error: error.code === 'lento' ? LENTO : motivo(error) };
  }
  alProgreso?.(1);
  avisar('publicacion', id);
  await Promise.race([refrescar(), new Promise((r) => setTimeout(r, 5000))]);
  return { id };
}
export async function borrarPublicacion(p: Publicacion): Promise<string | null> {
  if (E2E) { await db.social_publicaciones.update(p.id, { deleted_at: new Date().toISOString() }); return null; }
  const { error } = await supabase.rpc('publicacion_borrar', { p_id: p.id });
  if (error) return motivo(error);
  await supabase.storage.from('social').remove((p.fotos ?? []).map((f) => f.path)).catch(() => undefined);
  await refrescar();
  return null;
}
export async function comentar(pid: string, texto: string): Promise<string | null> {
  if (E2E) { await db.social_comentarios.put({ ...marca(), id: crypto.randomUUID(), publicacion_id: pid, autor: yo(), texto }); return null; }
  const { error } = await supabase.rpc('publicacion_comentar', { p_publicacion: pid, p_texto: texto });
  if (error) return motivo(error);
  await refrescar();
  return null;
}
export async function borrarComentario(id: string): Promise<string | null> {
  if (E2E) { await db.social_comentarios.update(id, { deleted_at: new Date().toISOString() }); return null; }
  const { error } = await supabase.rpc('publicacion_borrar_comentario', { p_id: id });
  if (error) return motivo(error);
  await refrescar();
  return null;
}

// ───────── Fotos privadas ─────────
const cacheUrls = new Map<string, { url: string; vence: number }>();
/** URL firmada (1 hora) de una foto del bucket "social"; se recuerda para no pedirla en cada render */
export async function urlFotoSocial(path: string): Promise<string | null> {
  // Demo (sin servidor): las fotos de ejemplo viven en public/demo-social/
  if (path.startsWith('demo/')) return '/demo-social/' + path.slice(5);
  const c = cacheUrls.get(path);
  if (c && c.vence > Date.now()) return c.url;
  const { data } = await supabase.storage.from('social').createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cacheUrls.set(path, { url: data.signedUrl, vence: Date.now() + 50 * 60_000 });
  return data.signedUrl;
}

// ───────── Red social segura: reportar, bloquear y ocultar para mí ─────────
export type MotivoReporte = 'ofensivo' | 'acoso' | 'spam' | 'privado' | 'otro';
export const MOTIVOS_REPORTE: { id: MotivoReporte; nombre: string }[] = [
  { id: 'ofensivo', nombre: 'Es ofensivo o inapropiado' },
  { id: 'acoso', nombre: 'Es acoso o una amenaza' },
  { id: 'spam', nombre: 'Es spam o un engaño' },
  { id: 'privado', nombre: 'Expone datos privados' },
  { id: 'otro', nombre: 'Otra razón' }
];
const CLAVE_OCULTOS = 'q-social-ocultos:';
function ocultosLeer(): string[] { try { return JSON.parse(localStorage.getItem(CLAVE_OCULTOS + yo()) ?? '[]'); } catch { return []; } }
/** Lo que reporté deja de verse en este dispositivo de inmediato (mientras el equipo lo revisa) */
export const oculto = (tipo: string, ref: string) => ocultosLeer().includes(`${tipo}:${ref}`);
export async function reportar(tipo: 'publicacion' | 'comentario' | 'mensaje' | 'persona', ref: string, motivoReporte: MotivoReporte, detalle?: string): Promise<string | null> {
  if (!E2E) {
    const { data, error } = await supabase.rpc('social_reportar', { p_tipo: tipo, p_ref: ref, p_motivo: motivoReporte, p_detalle: detalle ?? null });
    if (error) return motivo(error);
    avisar('reporte', String(data));
  }
  try { localStorage.setItem(CLAVE_OCULTOS + yo(), JSON.stringify([...ocultosLeer(), `${tipo}:${ref}`].slice(-500))); } catch { /* sin almacenamiento */ }
  return null;
}
export const bloqueados = () => (datos.bloqueos as { bloqueado: string }[]).map((b) => b.bloqueado);
export async function bloquear(uid: string): Promise<string | null> {
  if (E2E) {
    await db.social_bloqueos.put({ ...marca(), id: crypto.randomUUID(), user_id: yo(), bloqueado: uid });
    for (const r of await db.social_relaciones.toArray()) if ([r.user_a, r.user_b].includes(uid)) await db.social_relaciones.put({ ...r, estado: 'terminada' });
    return null;
  }
  const { error } = await supabase.rpc('social_bloquear', { p_otro: uid });
  if (error) return motivo(error);
  await refrescar();
  return null;
}
export async function desbloquear(uid: string): Promise<string | null> {
  const { error } = await supabase.rpc('social_desbloquear', { p_otro: uid });
  if (error) return motivo(error);
  await refrescar();
  return null;
}

// ───────── Condiciones de uso (se aceptan una vez antes de publicar, comentar o escribir) ─────────
const CLAVE_TERMINOS = 'q-terminos:';
export const terminosAceptados = () => { try { return !!localStorage.getItem(CLAVE_TERMINOS + yo()); } catch { return false; } };
/** Si aún no las aceptó, muestra el resumen y guarda la aceptación (aquí y en el servidor). true = puede seguir. */
export async function pedirTerminos(): Promise<boolean> {
  if (terminosAceptados() || E2E) return true;
  const { f7 } = await import('framework7-svelte');
  const ok = await new Promise<boolean>((resolver) => {
    f7.dialog.create({
      title: 'Antes de publicar',
      text: 'En Quilombo hay cero tolerancia con el contenido ofensivo, el acoso y los datos privados de otras personas. Puedes reportar y bloquear a cualquiera; revisamos los reportes en menos de 24 horas.',
      buttons: [{ text: 'Cancelar', onClick: () => resolver(false) }, { text: 'Acepto', strong: true, onClick: () => resolver(true) }]
    }).open();
  });
  if (ok) {
    try { localStorage.setItem(CLAVE_TERMINOS + yo(), new Date().toISOString()); } catch { /* sin almacenamiento */ }
    void supabase.rpc('social_aceptar_terminos').then(undefined, () => undefined);
  }
  return ok;
}
