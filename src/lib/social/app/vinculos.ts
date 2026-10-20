// Red social interactiva: llamadas al servidor (perfil, relaciones, cobros, reacciones, chat) y datos derivados.
import { supabase } from '$lib/data/supabase';
import { origen } from '$lib/app/plataforma';
import { db } from '$lib/data/db';
import { sincronizar } from '$lib/data/sync';
import { datos } from '$lib/data/datos.svelte';
import { E2E, sesion } from '$lib/app/sesion.svelte';
import { otroDe, type TipoVinculo, type Vinculo } from '../domain/vinculos';
import { leidos } from './leidos.svelte';

export const yo = () => sesion.usuario?.id ?? '';
const sinRed = () => (navigator.onLine ? 'No se pudo completar. Intenta de nuevo.' : 'Necesitas conexión para esto.');
/** Mensaje legible de un error del servidor (los 22023/42501 traen el motivo en español) */
export const motivo = (e: { message?: string; code?: string } | null) => (e?.code === '22023' || e?.code === '42501') && e.message && e.message !== 'no autorizado' ? e.message : sinRed();
const marca = () => { const t = new Date().toISOString(); return { created_at: t, updated_at: t, deleted_at: null }; };

/** Avisa por push a la otra persona (función social-aviso). Si falla no pasa nada: igual lo ve al abrir la app. */
export type TipoAviso = 'solicitud' | 'aceptada' | 'cobro' | 'pague' | 'recibido' | 'recordar' | 'mensaje' | 'saludo' | 'reporte' | 'partido' | 'publicacion';
export function avisar(tipo: TipoAviso, id: string) {
  if (E2E) return;
  void supabase.functions.invoke('social-aviso', { body: { tipo, id } }).catch(() => undefined);
}

// ───────── Perfil y código ─────────
/** Mi código para el QR / link de amigo (crea mi perfil la primera vez) */
export async function miCodigo(): Promise<{ codigo?: string; error?: string }> {
  if (E2E) return { codigo: 'demo23tuqr' };
  const { data, error } = await supabase.rpc('social_yo', { p_nombre: null, p_color: null });
  if (error || !data) return { error: motivo(error) };
  return { codigo: String(data) };
}
export const linkAmigo = (codigo: string) => `${origen()}/?amigo=${codigo}`;

export async function verJugador(codigo: string): Promise<{ nombre: string; color: string; soyYo: boolean; yaRelacion: string | null } | { error: string }> {
  if (E2E) return { nombre: 'Jugador demo', color: '#b69cff', soyYo: false, yaRelacion: null };
  const { data, error } = await supabase.rpc('social_ver', { p_codigo: codigo });
  if (error) return { error: motivo(error) };
  const f = (data as { nombre: string; color: string; soy_yo: boolean; ya_relacion: string | null }[] | null)?.[0];
  if (!f) return { error: 'Ese código no existe.' };
  return { nombre: f.nombre, color: f.color, soyYo: f.soy_yo, yaRelacion: f.ya_relacion };
}

// ───────── Relaciones ─────────
export async function proponer(codigo: string, tipo: TipoVinculo, etiqueta: string | null, qr: boolean): Promise<string | null> {
  if (E2E) return null;
  const { data, error } = await supabase.rpc('relacion_proponer', { p_codigo: codigo, p_tipo: tipo, p_etiqueta: etiqueta, p_qr: qr });
  if (error) return motivo(error);
  await sincronizar().catch(() => undefined);
  const r = await db.social_relaciones.get(String(data));
  avisar(r?.estado === 'activa' ? 'aceptada' : 'solicitud', String(data));
  return null;
}
export async function responder(id: string, aceptar: boolean): Promise<string | null> {
  if (E2E) {
    const r = await db.social_relaciones.get(id);
    if (r) await db.social_relaciones.put({ ...r, estado: aceptar ? 'activa' : 'rechazada', updated_at: new Date().toISOString() });
    return null;
  }
  const { error } = await supabase.rpc('relacion_responder', { p_id: id, p_aceptar: aceptar });
  if (error) return motivo(error);
  if (aceptar) avisar('aceptada', id);
  await sincronizar().catch(() => undefined);
  return null;
}
export async function terminar(id: string): Promise<string | null> {
  if (E2E) { const r = await db.social_relaciones.get(id); if (r) await db.social_relaciones.put({ ...r, estado: 'terminada' }); return null; }
  const { error } = await supabase.rpc('relacion_terminar', { p_id: id });
  if (error) return motivo(error);
  await sincronizar().catch(() => undefined);
  return null;
}
export async function editarRelacion(id: string, tipo: TipoVinculo, etiqueta: string | null): Promise<string | null> {
  if (E2E) { const r = await db.social_relaciones.get(id); if (r) await db.social_relaciones.put({ ...r, tipo, etiqueta }); return null; }
  const { error } = await supabase.rpc('relacion_editar', { p_id: id, p_tipo: tipo, p_etiqueta: etiqueta });
  if (error) return motivo(error);
  await sincronizar().catch(() => undefined);
  return null;
}

// ───────── Cobros (dividir la cancha) ─────────
/** Cobrarle a mi gente: montos en pesos, uno por deudor. `partido` liga el cobro a la cancha de ese partido. */
export async function cobrar(deudores: string[], montos: number[], concepto: string, partido: string | null = null): Promise<string | null> {
  if (E2E) {
    const g = crypto.randomUUID();
    await db.social_cobros.bulkPut(deudores.map((deudor, i) => ({ ...marca(), id: crypto.randomUUID(), acreedor: yo(), deudor, monto: montos[i], concepto, estado: 'pendiente', grupo: g, partido_id: partido, pagado_en: null })));
    return null;
  }
  const { data, error } = await supabase.rpc('cobro_crear', { p_deudores: deudores, p_montos: montos, p_concepto: concepto, p_partido: partido });
  if (error) return motivo(error);
  avisar('cobro', String(data));
  await sincronizar().catch(() => undefined);
  return null;
}
export async function accionCobro(id: string, accion: 'pague' | 'no_es_mio' | 'recibido' | 'cancelar'): Promise<string | null> {
  if (E2E) {
    const c = await db.social_cobros.get(id);
    if (!c) return 'Ese cobro ya no existe';
    const t = new Date().toISOString();
    const estado = accion === 'recibido' ? 'pagado' : accion === 'pague' ? 'avisado' : accion === 'cancelar' ? 'cancelado' : 'rechazado';
    await db.social_cobros.put({ ...c, estado, pagado_en: accion === 'recibido' ? t : c.pagado_en, updated_at: t });
    return null;
  }
  const { error } = await supabase.rpc('cobro_accion', { p_id: id, p_accion: accion });
  if (error) return motivo(error);
  if (accion === 'pague' || accion === 'recibido') avisar(accion, id);
  await sincronizar().catch(() => undefined);
  return null;
}
export const recordarCobro = (id: string) => avisar('recordar', id);

// ───────── Reacciones ─────────
export async function reaccionar(evento: string, reaccion: string | null): Promise<string | null> {
  if (E2E) {
    const r = (await db.social_reacciones.where('evento_id').equals(evento).toArray()).find((x) => x.user_id === yo());
    const t = new Date().toISOString();
    await db.social_reacciones.put({ created_at: t, ...(r ?? {}), id: r?.id ?? crypto.randomUUID(), evento_id: evento, user_id: yo(), reaccion: reaccion ?? r?.reaccion ?? 'crack', updated_at: t, deleted_at: reaccion ? null : t });
    return null;
  }
  const { error } = await supabase.rpc('social_reaccionar', { p_evento: evento, p_reaccion: reaccion });
  if (error) return motivo(error);
  await sincronizar().catch(() => undefined);
  return null;
}

// ───────── Derivados para las pantallas ─────────
export interface PerfilJugador {
  user_id: string; nombre: string; color: string; avatar?: string | null; foto?: string | null; usuario?: string | null; buscable?: boolean;
  categoria?: number | null; puntos_ranking?: number | null; club_base?: string | null; ciudad?: string | null; codigo?: string;
}
export const perfilDe = (uid: string) => datos.perfiles.find((p) => p.user_id === uid) as PerfilJugador | undefined;
export const nombreDe = (uid: string) => perfilDe(uid)?.nombre ?? 'Alguien';
/** Mis relaciones (en la demo la base tiene las de todos: al usarla como otra persona solo cuentan las suyas) */
export const vinculos = () => (datos.vinculos as Vinculo[]).filter((v) => v.user_a === yo() || v.user_b === yo());
export interface Cobro { id: string; acreedor: string; deudor: string; monto: number; concepto: string; estado: string; grupo: string | null; partido_id?: string | null; created_at: string; pagado_en: string | null }
export const cobros = () => datos.cobros as Cobro[];
/** Cobros abiertos donde estoy (me deben o debo) */
export const cobrosAbiertos = () => cobros().filter((c) => (c.estado === 'pendiente' || c.estado === 'avisado') && (c.acreedor === yo() || c.deudor === yo()));

// ───────── Chat (uno a uno, por relación) ─────────
export interface Mensaje { id: string; relacion_id: string; autor: string; texto: string; created_at: string; deleted_at: string | null; tipo?: 'texto' | 'foto' | 'voz'; adjunto?: string | null; duracion?: number | null }
/** Foto o nota de voz que acompaña al mensaje (el archivo ya subido con subirAdjunto) */
export interface Adjunto { tipo: 'foto' | 'voz'; path: string; duracion?: number }
/** Sala de chat: por ahora solo con una persona (relación). Los chats de grupo de juego quedan pendientes. */
export type Sala = { relacion: string };
export const mensajesDe = (sala: Sala) => (datos.mensajes as Mensaje[]).filter((m) => m.relacion_id === sala.relacion);

/**
 * "Estoy mirando este chat": mientras está abierto y visible se renueva cada 30 s (vale 60 s en el servidor) y al
 * salir se borra. Así social-aviso no le manda notificación de un mensaje a quien ya lo está viendo.
 */
export function marcarPresencia(id: string): () => void {
  if (E2E) return () => {};
  const sala = `r/${id}`;
  const marcar = (aqui: boolean) => void supabase.rpc('chat_estoy', { p_sala: sala, p_aqui: aqui }).then(undefined, () => undefined);
  const visible = () => document.visibilityState === 'visible';
  if (visible()) marcar(true);
  const t = setInterval(() => { if (visible()) marcar(true); }, 30_000);
  const cambio = () => marcar(visible());
  document.addEventListener('visibilitychange', cambio);
  return () => { clearInterval(t); document.removeEventListener('visibilitychange', cambio); marcar(false); };
}

/** Envía y deja el mensaje en la base local con lo que respondió el servidor (sin sincronizar todo: el chat fluye) */
export async function enviarMensaje(sala: Sala, texto: string, adj?: Adjunto): Promise<{ id?: string; error?: string }> {
  const extra = adj ? { tipo: adj.tipo, adjunto: adj.path, duracion: adj.duracion ?? null } : { tipo: 'texto' as const, adjunto: null, duracion: null };
  if (E2E) {
    const id = crypto.randomUUID();
    await db.social_mensajes.put({ id, relacion_id: sala.relacion, autor: yo(), texto, created_at: new Date().toISOString(), deleted_at: null, ...extra });
    return { id };
  }
  const { data, error } = await supabase.rpc('chat_enviar', {
    p_relacion: sala.relacion, p_texto: texto,
    ...(adj ? { p_tipo: adj.tipo, p_adjunto: adj.path, p_duracion: adj.duracion != null ? Math.round(adj.duracion) : null } : {})
  });
  if (error) return { error: motivo(error) };
  const ahora = new Date().toISOString();
  // Si el tiempo real ya lo trajo, no se pisa
  if (!(await db.social_mensajes.get(String(data)))) {
    await db.social_mensajes.put({ id: String(data), relacion_id: sala.relacion, autor: yo(), texto, created_at: ahora, updated_at: ahora, deleted_at: null, ...extra });
  }
  avisar('mensaje', String(data));
  return { id: String(data) };
}
export async function borrarMensaje(id: string): Promise<string | null> {
  const antes = await db.social_mensajes.get(id);
  if (antes) await db.social_mensajes.put({ ...antes, deleted_at: new Date().toISOString() });
  if (E2E) return null;
  const { error } = await supabase.rpc('chat_borrar', { p_id: id });
  if (error) { if (antes) await db.social_mensajes.put(antes); return motivo(error); }
  return null;
}

/**
 * Tiempo real de UNA conversación: los mensajes nuevos se guardan directo en la base local y "está escribiendo…"
 * viaja por un canal efímero. Si el tiempo real no conecta, cada 5 s se traen solo los mensajes nuevos.
 */
export function escucharChat(sala: Sala, alEscribir: (uid: string) => void): { parar: () => void; escribiendo: () => void } {
  if (E2E) return { parar: () => undefined, escribiendo: () => undefined };
  const id = sala.relacion;
  const guardar = async (fila: Record<string, any>) => { if (fila?.id) await db.social_mensajes.put(fila); };
  let conectado = false;
  const canal = supabase
    .channel('chat:' + id, { config: { broadcast: { self: false } } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'social_mensajes', filter: `relacion_id=eq.${id}` }, (p) => void guardar(p.new as Record<string, any>))
    .on('broadcast', { event: 'escribiendo' }, (p) => { const uid = (p.payload as { uid?: string })?.uid; if (uid && uid !== yo()) alEscribir(uid); })
    .subscribe((estado) => { conectado = estado === 'SUBSCRIBED'; });
  let ultimo = new Date(Date.now() - 60_000).toISOString();
  const t = setInterval(async () => {
    if (conectado || document.visibilityState !== 'visible' || !navigator.onLine) return;
    const { data } = await supabase.from('social_mensajes').select('*').eq('relacion_id', id).gt('updated_at', ultimo).order('updated_at').limit(100);
    for (const f of data ?? []) { await guardar(f); if (f.updated_at > ultimo) ultimo = f.updated_at; }
  }, 5000);
  let enviadoEn = 0;
  return {
    parar: () => { clearInterval(t); void supabase.removeChannel(canal); },
    // Máximo un aviso cada 2,5 s mientras se teclea
    escribiendo: () => {
      if (!conectado || Date.now() - enviadoEn < 2500) return;
      enviadoEn = Date.now();
      void canal.send({ type: 'broadcast', event: 'escribiendo', payload: { uid: yo() } });
    }
  };
}

// ───────── Leídos (en este dispositivo) ─────────
const CLAVE_VISTO = 'q-chat-visto:';
export function marcarVisto(id: string) {
  try { localStorage.setItem(CLAVE_VISTO + id, new Date().toISOString()); } catch { /* sin almacenamiento */ }
  leidos.v++;
}
/** ¿Hay mensajes de otras personas después de la última vez que abrí esta conversación? */
export function sinLeer(id: string, ultimo: Mensaje | null): boolean {
  void leidos.v;
  if (!ultimo || ultimo.autor === yo() || ultimo.deleted_at) return false;
  try { return ultimo.created_at > (localStorage.getItem(CLAVE_VISTO + id) ?? ''); } catch { return false; }
}

/** Lo último de cada conversación, para la lista de chats */
export function conversaciones(): { id: string; uid: string; titulo: string; color: string; ultimo: Mensaje | null }[] {
  const ms = datos.mensajes as Mensaje[];
  const ultimoDe = (rel: string) => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i].relacion_id === rel) return ms[i]; return null; };
  return vinculos().filter((x) => x.estado === 'activa').map((v) => {
    const otro = otroDe(v, yo());
    return { id: v.id, uid: otro, titulo: nombreDe(otro), color: perfilDe(otro)?.color ?? '#b69cff', ultimo: ultimoDe(v.id) };
  }).sort((a, b) => (b.ultimo?.created_at ?? '').localeCompare(a.ultimo?.created_at ?? ''));
}
