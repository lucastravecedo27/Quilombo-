// Acciones del club (demo): lo que hacen el administrador, el mesero y el jugador sobre la agenda, el bar y los pagos.
// Escriben en la base local; con la demo en vivo (hub.ts) el cambio llega a los demás equipos al instante.
import { db } from '$lib/data/db';
import { datos } from '$lib/data/datos.svelte';
import type { Cancha, Club, Franja, Inscripcion, Partido, Torneo } from '$lib/social/domain/jugar';
import { cuando, horaColombia, pesos } from '$lib/social/domain/jugar';
import { completa, saldoDe, type Division, type MetodoRecarga, type Movimiento, type Parte } from '../domain/billetera';
import { CLUB_DEMO, codigoNuevo, consumoCuenta, leerCodigoCuenta, tarjetaDerivada, resumenItems, totalItems, type Actividad, type Cuenta, type EstadoPedido, type ItemPedido, type MetodoPago, type Pago, type Pedido, type Producto, type Staff } from '../domain/club';

const ahora = () => new Date().toISOString();
const marca = () => { const t = ahora(); return { created_at: t, updated_at: t, deleted_at: null }; };
const nombreDe = (uid: string | null | undefined) => (uid ? (datos.perfiles.find((p) => p.user_id === uid)?.nombre as string | undefined) ?? 'Jugador' : 'Jugador');

// ───────── Lecturas ─────────
export const elClub = (id = CLUB_DEMO) => (datos.clubes as Club[]).find((c) => c.id === id) ?? null;
export const canchasDe = (id = CLUB_DEMO) => (datos.canchas as Cancha[]).filter((c) => c.club_id === id).sort((a, b) => a.nombre.localeCompare(b.nombre));
export function franjasDe(id = CLUB_DEMO): Franja[] {
  const ids = new Set(canchasDe(id).map((c) => c.id));
  return (datos.franjas as Franja[]).filter((f) => ids.has(f.cancha_id));
}
export const productos = (id = CLUB_DEMO) => (datos.productos as Producto[]).filter((p) => p.club_id === id).sort((a, b) => a.orden - b.orden);
export const pedidos = (id = CLUB_DEMO) => (datos.pedidos as Pedido[]).filter((p) => p.club_id === id);
export const pagos = (id = CLUB_DEMO) => (datos.pagos as Pago[]).filter((p) => p.club_id === id);
export const staff = (id = CLUB_DEMO) => (datos.staff as Staff[]).filter((s) => s.club_id === id);
export const actividad = (id = CLUB_DEMO) => (datos.actividad as Actividad[]).filter((a) => a.club_id === id);
export const torneosDe = (id = CLUB_DEMO) => (datos.torneos as Torneo[]).filter((t) => t.club_id === id).sort((a, b) => a.inicio.localeCompare(b.inicio));
export const inscripcionesDe = (tid: string) => (datos.inscripciones as Inscripcion[]).filter((i) => i.torneo_id === tid && i.estado !== 'cancelada');
export const partidoDe = (f: Franja | null | undefined) => (f?.partido_id ? (datos.partidos as Partido[]).find((p) => p.id === f.partido_id) ?? null : null);
export const canchaDe = (id: string | null | undefined) => (id ? (datos.canchas as Cancha[]).find((c) => c.id === id) ?? null : null);
/** A nombre de quién está una franja: el cliente que anotó el club o quien armó el partido en la app */
export function titularDe(f: Franja): string {
  if (f.cliente) return f.cliente;
  const p = partidoDe(f);
  return p ? nombreDe(p.creador) : '—';
}
/** Los jugadores de una franja reservada por la app (los que confirmaron) */
export function jugadoresDe(f: Franja): string[] {
  const p = partidoDe(f);
  if (!p) return [];
  const si = (datos.respuestas as { partido_id: string; user_id: string; respuesta: string }[]).filter((r) => r.partido_id === p.id && r.respuesta === 'voy').map((r) => r.user_id);
  return [...new Set([p.creador, ...si])].map(nombreDe);
}

export async function registrar(tipo: Actividad['tipo'], icono: string, texto: string, club = CLUB_DEMO) {
  await db.club_actividad.put({ ...marca(), id: crypto.randomUUID(), club_id: club, tipo, icono, texto });
}
async function cobrar(concepto: Pago['concepto'], ref: string | null, monto: number, metodo: MetodoPago, quien: string, club = CLUB_DEMO) {
  await db.club_pagos.put({ ...marca(), id: crypto.randomUUID(), club_id: club, concepto, ref, monto, metodo, quien });
}
const clubDeFranja = (f: Franja) => canchaDe(f.cancha_id)?.club_id ?? CLUB_DEMO;
const etiquetaFranja = (f: Franja) => `${canchaDe(f.cancha_id)?.nombre ?? 'Cancha'} · ${cuando(f.inicio)}`;

// ───────── Agenda (administrador) ─────────
/** Reserva hecha en el club (por teléfono o en recepción) */
export async function reservarEnClub(fid: string, cliente: string, telefono: string | null, pagada: MetodoPago | null) {
  const f = (await db.social_franjas.get(fid)) as Franja | undefined;
  if (!f || f.estado !== 'libre') return 'Esa franja ya no está libre';
  await db.social_franjas.put({ ...f, updated_at: ahora(), estado: pagada ? 'pagada' : 'apartada', cliente, telefono, origen: 'club', partido_id: null, apartada_hasta: null });
  if (pagada) await cobrar('cancha', fid, f.precio, pagada, cliente, clubDeFranja(f));
  await registrar('reserva', '📞', `${cliente} reservó ${etiquetaFranja(f)}${pagada ? ` · pagó ${pesos(f.precio)}` : ''}`, clubDeFranja(f));
  return null;
}
/** Cobrar en el club una franja apartada */
export async function cobrarFranja(fid: string, metodo: MetodoPago) {
  const f = (await db.social_franjas.get(fid)) as Franja | undefined;
  if (!f || f.estado !== 'apartada') return 'Esa franja no está pendiente de pago';
  await db.social_franjas.put({ ...f, updated_at: ahora(), estado: 'pagada' });
  const p = partidoDe(f);
  if (p) await db.social_partidos.put({ ...(await db.social_partidos.get(p.id))!, updated_at: ahora(), estado: 'confirmado' });
  await cobrar('cancha', fid, f.precio, metodo, titularDe(f), clubDeFranja(f));
  await registrar('pago', '💵', `${titularDe(f)} pagó ${etiquetaFranja(f)} · ${pesos(f.precio)}`, clubDeFranja(f));
  return null;
}
/** Llegaron a la cancha (check-in en recepción) */
export async function marcarLlegada(fid: string) {
  const f = (await db.social_franjas.get(fid)) as Franja | undefined;
  if (!f) return;
  await db.social_franjas.put({ ...f, updated_at: ahora(), llegaron: f.llegaron ? null : ahora() });
  if (!f.llegaron) await registrar('llegada', '✅', `Llegaron a ${etiquetaFranja(f)} (${titularDe(f)})`, clubDeFranja(f));
}
/** Liberar una reserva (cancelada) o desbloquear */
export async function liberarFranja(fid: string) {
  const f = (await db.social_franjas.get(fid)) as Franja | undefined;
  if (!f) return;
  const antes = f.estado === 'bloqueada' ? null : titularDe(f);
  await db.social_franjas.put({ ...f, updated_at: ahora(), estado: 'libre', cliente: null, telefono: null, origen: null, partido_id: null, apartada_hasta: null, llegaron: null, nota: null });
  if (f.partido_id) {
    const p = await db.social_partidos.get(f.partido_id);
    if (p) await db.social_partidos.put({ ...p, updated_at: ahora(), franja_id: null, estado: 'abierto' });
  }
  if (antes) await registrar('cancelacion', '↩️', `Se liberó ${etiquetaFranja(f)} (era de ${antes})`, clubDeFranja(f));
}
export async function bloquearFranja(fid: string, nota: string) {
  const f = (await db.social_franjas.get(fid)) as Franja | undefined;
  if (!f || f.estado !== 'libre') return 'Solo se bloquean franjas libres';
  await db.social_franjas.put({ ...f, updated_at: ahora(), estado: 'bloqueada', nota: nota || 'Bloqueada' });
  return null;
}
export async function cambiarPrecio(fid: string, precio: number) {
  const f = await db.social_franjas.get(fid);
  if (f) await db.social_franjas.put({ ...f, updated_at: ahora(), precio });
}

// ───────── Pedidos del bar (mesero y jugador) ─────────
async function siguienteNumero(club: string) {
  const ps = (await db.club_pedidos.toArray()) as Pedido[];
  return ps.filter((p) => p.club_id === club).reduce((m, p) => Math.max(m, p.numero), 100) + 1;
}
export interface NuevoPedido { cuenta_id?: string | null; items: ItemPedido[]; cliente: string; ubicacion: string; cancha_id?: string | null; franja_id?: string | null; nota?: string | null; origen: 'app' | 'mesero'; user_id?: string | null; mesero?: string | null; club?: string }
export async function crearPedido(n: NuevoPedido): Promise<{ id?: string; error?: string }> {
  const items = n.items.filter((i) => i.cantidad > 0);
  if (!items.length) return { error: 'Agrega al menos un producto' };
  const club = n.club ?? CLUB_DEMO;
  const id = crypto.randomUUID();
  const fila: Pedido = {
    id, club_id: club, numero: await siguienteNumero(club), origen: n.origen, user_id: n.user_id ?? null, cliente: n.cliente, cancha_id: n.cancha_id ?? null,
    franja_id: n.franja_id ?? null, ubicacion: n.ubicacion, items, total: totalItems(items), nota: n.nota ?? null, cuenta_id: n.cuenta_id ?? null, estado: 'nuevo', mesero: n.mesero ?? null,
    metodo: null, created_at: ahora(), updated_at: ahora(), entregado_en: null, pagado_en: null
  };
  await db.club_pedidos.put({ ...fila, deleted_at: null });
  await registrar('pedido', n.cuenta_id ? '🛳️' : n.origen === 'app' ? '📱' : '🧾', `Pedido #${fila.numero} · ${n.ubicacion}: ${resumenItems(items)} (${pesos(fila.total)})${n.cuenta_id ? ' · tarjeta Quilombo' : ''}`, club);
  return { id };
}
export async function moverPedido(id: string, estado: EstadoPedido, mesero?: string | null) {
  const p = (await db.club_pedidos.get(id)) as Pedido | undefined;
  if (!p) return;
  // Si ya estaba pagado (con saldo), al entregarlo queda cerrado
  const final = estado === 'entregado' && p.pagado_en ? 'pagado' : estado;
  await db.club_pedidos.put({ ...p, estado: final, updated_at: ahora(), mesero: mesero ?? p.mesero, entregado_en: estado === 'entregado' ? ahora() : p.entregado_en });
  if (estado === 'entregado') await registrar('entrega', '🛎️', `${mesero ?? p.mesero ?? 'El mesero'} entregó el pedido #${p.numero} en ${p.ubicacion}`, p.club_id);
}
export async function cobrarPedido(id: string, metodo: MetodoPago, mesero?: string | null) {
  const p = (await db.club_pedidos.get(id)) as Pedido | undefined;
  if (!p || p.estado === 'pagado' || p.estado === 'cancelado' || p.pagado_en) return 'Ese pedido ya está pagado';
  if (metodo === 'saldo') {
    const err = await debitar(p.user_id, p.total, `Pedido #${p.numero} · ${elClub(p.club_id)?.nombre ?? 'Club'}`, id, p.club_id);
    if (err) return err;
  }
  await db.club_pedidos.put({ ...p, estado: 'pagado', metodo, updated_at: ahora(), pagado_en: ahora(), mesero: mesero ?? p.mesero, entregado_en: p.entregado_en ?? ahora() });
  await cobrar('bar', id, p.total, metodo, p.cliente, p.club_id);
  await registrar('pago', metodo === 'app' || metodo === 'saldo' ? '📱' : '💵', `${p.cliente} pagó el pedido #${p.numero} · ${pesos(p.total)} (${metodo === 'app' ? 'en la app' : metodo === 'saldo' ? 'con saldo Quilombo' : metodo})`, p.club_id);
  return null;
}
export async function cancelarPedido(id: string) {
  const p = await db.club_pedidos.get(id);
  if (p) await db.club_pedidos.put({ ...p, estado: 'cancelado', updated_at: ahora() });
}

// ───────── Pagos del jugador desde la app ─────────
/** El jugador paga su cancha en la app: queda pagada y le llega al club */
export async function pagarFranjaEnApp(fid: string, quien: string, metodo: 'app' | 'saldo' = 'app', uid: string | null = null): Promise<string | null> {
  const f = (await db.social_franjas.get(fid)) as Franja | undefined;
  if (!f) return 'Esa cancha ya no está';
  if (metodo === 'saldo') {
    const err = await debitar(uid, f.precio, `Cancha · ${etiquetaFranja(f)}`, fid, clubDeFranja(f));
    if (err) return err;
  }
  await db.social_franjas.put({ ...f, updated_at: ahora(), estado: 'pagada', origen: f.origen ?? 'app', cliente: f.cliente ?? null });
  await cobrar('cancha', fid, f.precio, metodo, quien, clubDeFranja(f));
  await registrar('pago', '📱', `${quien} pagó ${etiquetaFranja(f)} ${metodo === 'saldo' ? 'con saldo Quilombo' : 'en la app'} · ${pesos(f.precio)}`, clubDeFranja(f));
  return null;
}
/** Avisar al club que un partido de la app apartó una franja */
export async function avisarReservaApp(f: Franja, quien: string) {
  await registrar('reserva', '📱', `${quien} apartó ${etiquetaFranja(f)} desde la app`, clubDeFranja(f));
}
export async function avisarInscripcion(t: Torneo, quien: string, categoria: number) {
  if (t.club_id) await registrar('torneo', '🏆', `${quien} se inscribió en ${t.nombre} (${categoria}ª)${t.precio ? ` · ${pesos(t.precio)}` : ''}`, t.club_id);
}
export async function pagarTorneoEnApp(i: Inscripcion, t: Torneo, quien: string, metodo: 'app' | 'saldo' = 'app'): Promise<string | null> {
  if (metodo === 'saldo') {
    const err = await debitar(i.user_id, t.precio, `Inscripción · ${t.nombre}`, i.id, t.club_id);
    if (err) return err;
  }
  await db.social_inscripciones.put({ ...(await db.social_inscripciones.get(i.id))!, updated_at: ahora(), estado: 'inscrito' });
  if (t.club_id) {
    await cobrar('torneo', i.id, t.precio, metodo, quien, t.club_id);
    await registrar('pago', '🏆', `${quien} pagó la inscripción a ${t.nombre} · ${pesos(t.precio)}${metodo === 'saldo' ? ' (saldo Quilombo)' : ''}`, t.club_id);
  }
  return null;
}

// ───────── Carta ─────────
export async function guardarProducto(p: Partial<Producto> & { nombre: string; precio: number; categoria: Producto['categoria'] }) {
  const antes = p.id ? await db.club_productos.get(p.id) : null;
  const orden = antes?.orden ?? productos().length + 1;
  await db.club_productos.put({ ...(antes ?? marca()), emoji: '🍽️', activo: true, club_id: CLUB_DEMO, ...p, id: p.id ?? crypto.randomUUID(), orden, updated_at: ahora() });
}
export async function alternarProducto(id: string) {
  const p = await db.club_productos.get(id);
  if (p) await db.club_productos.put({ ...p, activo: !p.activo, updated_at: ahora() });
}

// ───────── Torneos del club ─────────
export async function crearTorneo(t: { nombre: string; inicio: string; fin: string; categorias: number[]; cupos: number; precio: number; cierre: string }) {
  const c = elClub();
  const id = crypto.randomUUID();
  await db.social_torneos.put({ ...marca(), id, ciudad: c?.ciudad ?? 'Medellín', club_id: CLUB_DEMO, inscritos: 0, estado: 'inscripciones', ...t });
  await registrar('torneo', '🏆', `Se abrieron inscripciones: ${t.nombre}`);
  return id;
}
export async function cerrarInscripciones(tid: string) {
  const t = await db.social_torneos.get(tid);
  if (t) await db.social_torneos.put({ ...t, updated_at: ahora(), estado: t.estado === 'inscripciones' ? 'en_juego' : 'inscripciones' });
}

export const hora = horaColombia;

// ───────── Modo crucero: cuentas abiertas ─────────
export const cuentas = (id = CLUB_DEMO) => (datos.cuentas as Cuenta[]).filter((c) => c.club_id === id);
export const cuentasAbiertas = (id = CLUB_DEMO) => cuentas(id).filter((c) => c.estado === 'abierta');
export const cuentaPorCodigo = (codigo: string, id = CLUB_DEMO) => cuentasAbiertas(id).find((c) => c.codigo === codigo.toUpperCase()) ?? null;
export const miCuenta = (uid: string, id = CLUB_DEMO) => cuentasAbiertas(id).find((c) => c.user_id === uid) ?? null;
export const pedidosDeCuenta = (cid: string) => (datos.pedidos as Pedido[]).filter((p) => p.cuenta_id === cid && p.estado !== 'cancelado');
export const saldoCuenta = (cid: string) => consumoCuenta(datos.pedidos as Pedido[], cid);
/** El jugador abre su cuenta en el club (si ya tiene una abierta, es esa) */
export async function abrirCuenta(uid: string | null, nombre: string, tope: number | null = null, club = CLUB_DEMO): Promise<Cuenta> {
  const ya = uid ? ((await db.club_cuentas.toArray()) as Cuenta[]).find((c) => c.club_id === club && c.user_id === uid && c.estado === 'abierta') : null;
  if (ya) return ya;
  const codigos = ((await db.club_cuentas.toArray()) as Cuenta[]).filter((c) => c.estado === 'abierta').map((c) => c.codigo);
  const c: Cuenta = { id: crypto.randomUUID(), club_id: club, user_id: uid, nombre, codigo: uid ? tarjetaDe(uid) : codigoNuevo(codigos), estado: 'abierta', tope, metodo: null, created_at: ahora(), cerrada_en: null };
  await db.club_cuentas.put({ ...c, updated_at: ahora(), deleted_at: null });
  await registrar('pedido', '🛳️', `${nombre} abrió cuenta con su tarjeta Quilombo · ${c.codigo}`, club);
  return c;
}
/** Cargar un pedido a la cuenta (lo hace el mesero tras escanear el QR, o el jugador desde la app) */
/**
 * Cargar un pedido a la tarjeta de un jugador: se paga de una con su saldo Quilombo. Si no le alcanza, no se carga
 * (que recargue). Las cuentas de clientes sin usuario (las abre el club) siguen siendo "se paga al cerrar".
 */
export async function cargarACuenta(cid: string, n: Omit<NuevoPedido, 'cliente' | 'club'> & { cliente?: string }): Promise<{ id?: string; error?: string; saldo?: number }> {
  const c = (await db.club_cuentas.get(cid)) as Cuenta | undefined;
  if (!c || c.estado !== 'abierta') return { error: 'Esa cuenta ya está cerrada' };
  const total = totalItems(n.items.filter((i) => i.cantidad > 0));
  if (c.tope && consumoCuenta(datos.pedidos as Pedido[], cid) + total > c.tope) return { error: `Pasa el tope que se puso (${pesos(c.tope)})` };
  if (c.user_id) {
    const saldo = saldoDe((await db.social_billetera.toArray()) as Movimiento[], c.user_id);
    if (saldo < total) return { error: `Saldo insuficiente: tiene ${pesos(saldo)} y el pedido es de ${pesos(total)}. Que recargue en la app.` };
  }
  const r = await crearPedido({ ...n, cliente: n.cliente ?? c.nombre, user_id: n.user_id ?? c.user_id, club: c.club_id, cuenta_id: cid });
  if (r.error || !r.id || !c.user_id) return r;
  const err = await debitar(c.user_id, total, `Pedido · ${elClub(c.club_id)?.nombre ?? 'Club'}`, r.id, c.club_id);
  if (err) { await cancelarPedido(r.id); return { error: err }; }
  const p = await db.club_pedidos.get(r.id);
  if (p) await db.club_pedidos.put({ ...p, metodo: 'saldo', pagado_en: ahora(), updated_at: ahora() });
  await cobrar('bar', r.id, total, 'saldo', c.nombre, c.club_id);
  return { id: r.id, saldo: saldoQuilombo(c.user_id) - total };
}
export async function pagarCuenta(cid: string, metodo: MetodoPago, mesero?: string | null): Promise<string | null> {
  const c = (await db.club_cuentas.get(cid)) as Cuenta | undefined;
  if (!c || c.estado !== 'abierta') return 'Esa cuenta ya está cerrada';
  const ps = ((await db.club_pedidos.toArray()) as Pedido[]).filter((p) => p.cuenta_id === cid && p.estado !== 'cancelado' && !p.pagado_en && p.estado !== 'pagado');
  const total = ps.reduce((s, p) => s + p.total, 0);
  if (metodo === 'saldo' && total) {
    const err = await debitar(c.user_id, total, `Cuenta ${c.codigo} · ${elClub(c.club_id)?.nombre ?? 'Club'}`, cid, c.club_id);
    if (err) return err;
  }
  for (const p of ps) await db.club_pedidos.put({ ...p, estado: 'pagado', metodo, pagado_en: ahora(), updated_at: ahora(), entregado_en: p.entregado_en ?? ahora(), mesero: mesero ?? p.mesero });
  await db.club_cuentas.put({ ...c, estado: 'pagada', metodo, cerrada_en: ahora(), updated_at: ahora() });
  if (total) await cobrar('bar', cid, total, metodo, c.nombre, c.club_id);
  await registrar('pago', metodo === 'app' || metodo === 'saldo' ? '📱' : '💵', `${c.nombre} pagó su cuenta ${c.codigo} · ${ps.length} pedido${ps.length === 1 ? '' : 's'} · ${pesos(total)}${metodo === 'app' ? ' (en la app)' : metodo === 'saldo' ? ' (saldo Quilombo)' : ''}`, c.club_id);
  return null;
}

// ───────── Inscripciones a torneos: comprobante o tarjeta ─────────
/** El club aprueba el comprobante de pago de una inscripción */
export async function aprobarInscripcion(iid: string) {
  const i = (await db.social_inscripciones.get(iid)) as Inscripcion | undefined;
  if (!i) return;
  await db.social_inscripciones.put({ ...i, estado: 'inscrito', nota_club: null, updated_at: ahora() } as Inscripcion & { updated_at: string });
  const t = (await db.social_torneos.get(i.torneo_id)) as Torneo | undefined;
  if (t?.club_id) {
    await cobrar('torneo', iid, t.precio, 'nequi', nombreDe(i.user_id), t.club_id);
    await registrar('torneo', '✅', `Comprobante aprobado: ${nombreDe(i.user_id)}${i.pareja ? ` y ${nombreDe(i.pareja)}` : ''} quedaron inscritos en ${t.nombre}`, t.club_id);
  }
}
export async function rechazarInscripcion(iid: string, nota: string) {
  const i = await db.social_inscripciones.get(iid);
  if (i) await db.social_inscripciones.put({ ...i, estado: 'rechazada', nota_club: nota || 'El comprobante no es válido', updated_at: ahora() });
}

// ───────── Panel del club: detalles del torneo (descripción, formato, premios, cuenta para el comprobante) ─────────
export async function detallesTorneo(tid: string, d: { descripcion?: string | null; formato?: string | null; premios?: string | null; cuenta_pago?: string | null }) {
  const t = await db.social_torneos.get(tid);
  if (t) await db.social_torneos.put({ ...t, ...d, updated_at: ahora() });
}

// ───────── Tarjeta Quilombo (QR único de cada jugador) ─────────
/** El código de la tarjeta de un jugador: único y para siempre */
export const tarjetaDe = (uid: string) => ((datos.perfiles.find((p) => p.user_id === uid)?.tarjeta as string | undefined) ?? tarjetaDerivada(uid));
export const perfilDeTarjeta = (codigo: string) => datos.perfiles.find((p) => tarjetaDe(p.user_id as string) === codigo) ?? null;
/**
 * Lo que pasa al escanear una tarjeta (o digitar su código): la cuenta abierta de ese jugador en el club; si aún no
 * tiene, se abre en ese momento. null si el código no es de nadie.
 */
export async function cuentaParaTarjeta(texto: string, club = CLUB_DEMO): Promise<Cuenta | null> {
  const codigo = leerCodigoCuenta(texto);
  if (!codigo) return null;
  const abierta = cuentaPorCodigo(codigo, club);
  if (abierta) return abierta;
  const p = perfilDeTarjeta(codigo);
  return p ? abrirCuenta(p.user_id as string, p.nombre as string, null, club) : null;
}
/** Poner (o quitar) el tope de consumo de una cuenta abierta */
export async function ponerTope(cid: string, tope: number | null) {
  const c = await db.club_cuentas.get(cid);
  if (c && c.estado === 'abierta') await db.club_cuentas.put({ ...c, tope, updated_at: ahora() });
}

/** Lo que falta por pagar en una cuenta (lo cargado a crédito; lo pagado con saldo no cuenta) */
export const porPagarCuenta = (cid: string) => (datos.pedidos as Pedido[]).filter((p) => p.cuenta_id === cid && p.estado !== 'cancelado' && p.estado !== 'pagado' && !p.pagado_en).reduce((s, p) => s + p.total, 0);

// ───────── Saldo Quilombo ─────────
export const movimientos = (uid: string) => (datos.billetera as Movimiento[]).filter((m) => m.user_id === uid);
export const saldoQuilombo = (uid: string) => saldoDe(datos.billetera as Movimiento[], uid);
/** Recargar saldo (en la demo el pago con PSE/tarjeta/Nequi es simulado) */
export async function recargar(uid: string, monto: number, metodo: MetodoRecarga) {
  if (monto < 10_000) return 'La recarga mínima es $ 10.000';
  await db.social_billetera.put({ ...marca(), id: crypto.randomUUID(), user_id: uid, tipo: 'recarga', monto, concepto: `Recarga con ${metodo === 'pse' ? 'PSE' : metodo === 'tarjeta' ? 'tarjeta' : 'Nequi'}`, ref: null, club_id: null, metodo });
  return null;
}
/** Descontar del saldo (si alcanza) */
export async function debitar(uid: string | null | undefined, monto: number, concepto: string, ref: string | null, club: string | null) {
  if (!uid) return 'Ese pago necesita un jugador con tarjeta Quilombo';
  const movs = (await db.social_billetera.toArray()) as Movimiento[];
  const saldo = saldoDe(movs, uid);
  if (saldo < monto) return `Saldo insuficiente: tiene ${pesos(saldo)} y son ${pesos(monto)}. Que recargue.`;
  await db.social_billetera.put({ ...marca(), id: crypto.randomUUID(), user_id: uid, tipo: 'pago', monto: -monto, concepto, ref, club_id: club, metodo: null });
  return null;
}

// ───────── Pagar entre varios (mitad y mitad) ─────────
export const divisiones = () => datos.divisiones as Division[];
export const divisionDe = (ref: string) => divisiones().find((d) => d.ref === ref && d.estado !== 'cancelada') ?? null;
/** Las partes que me tocan y aún no pago */
export const partesPendientes = (uid: string) => divisiones().filter((d) => d.estado === 'abierta' && d.partes.some((p) => p.user_id === uid && p.estado === 'pendiente'));
/**
 * Armar un pago entre varios. Quien lo arma paga su parte de una (con saldo); a los demás les queda pendiente.
 * tipo 'cancha' (ref = franja), 'pedido' (ref = pedido) o 'cuenta' (ref = cuenta: lo consumido).
 */
export async function dividirPago(o: { tipo: Division['tipo']; ref: string; total: number; concepto: string; partes: { user_id: string; monto: number }[]; creador: string; club: string | null }): Promise<{ id?: string; error?: string }> {
  if (o.partes.reduce((s, p) => s + p.monto, 0) !== o.total) return { error: 'Las partes no suman el total' };
  if (o.partes.length < 2) return { error: 'Elige al menos a otra persona' };
  if (divisionDe(o.ref)) return { error: 'Eso ya se está pagando entre varios' };
  const id = crypto.randomUUID();
  const d: Division = { id, club_id: o.club, tipo: o.tipo, ref: o.ref, concepto: o.concepto, total: o.total, creador: o.creador, estado: 'abierta', created_at: ahora(), partes: o.partes.map((p) => ({ ...p, estado: 'pendiente', pagado_en: null })) };
  await db.club_divisiones.put({ ...d, updated_at: ahora(), deleted_at: null });
  const mia = o.partes.find((p) => p.user_id === o.creador);
  if (mia) {
    const err = await pagarMiParte(id, o.creador);
    if (err) { await db.club_divisiones.put({ ...d, estado: 'cancelada', updated_at: ahora(), deleted_at: null }); return { error: err }; }
  }
  if (o.club) await registrar('pago', '➗', `${nombreDe(o.creador)} dividió ${o.concepto} entre ${o.partes.length} (${o.partes.map((p) => nombreDe(p.user_id).split(' ')[0]).join(', ')})`, o.club);
  return { id };
}
/** Pagar mi parte con mi saldo; si con esa quedan todas pagadas, se le paga al club */
export async function pagarMiParte(did: string, uid: string): Promise<string | null> {
  const d = (await db.club_divisiones.get(did)) as Division | undefined;
  if (!d || d.estado !== 'abierta') return 'Ese pago ya se cerró';
  const k = d.partes.findIndex((p) => p.user_id === uid && p.estado !== 'pagada');
  if (k < 0) return 'Ya pagaste tu parte';
  const err = await debitar(uid, d.partes[k].monto, `Tu parte · ${d.concepto}`, did, d.club_id);
  if (err) return err;
  const partes: Parte[] = d.partes.map((p, i) => (i === k ? { ...p, estado: 'pagada', pagado_en: ahora() } : p));
  const lista = completa({ partes, total: d.total });
  await db.club_divisiones.put({ ...d, partes, estado: lista ? 'completa' : 'abierta', updated_at: ahora() });
  if (lista) await liquidar({ ...d, partes });
  return null;
}
/** No pagar mi parte: la tiene que cubrir quien armó el pago (o alguien más) */
export async function rechazarParte(did: string, uid: string) {
  const d = (await db.club_divisiones.get(did)) as Division | undefined;
  if (!d || d.estado !== 'abierta') return;
  await db.club_divisiones.put({ ...d, partes: d.partes.map((p) => (p.user_id === uid && p.estado === 'pendiente' ? { ...p, estado: 'rechazada' } : p)), updated_at: ahora() });
}
/** Cubrir la parte de otro (la que rechazó o no ha pagado) con mi saldo */
export async function cubrirParte(did: string, deQuien: string, uid: string): Promise<string | null> {
  const d = (await db.club_divisiones.get(did)) as Division | undefined;
  if (!d || d.estado !== 'abierta') return 'Ese pago ya se cerró';
  const p = d.partes.find((x) => x.user_id === deQuien && x.estado !== 'pagada');
  if (!p) return 'Esa parte ya está pagada';
  const err = await debitar(uid, p.monto, `Parte de ${nombreDe(deQuien).split(' ')[0]} · ${d.concepto}`, did, d.club_id);
  if (err) return err;
  const partes: Parte[] = d.partes.map((x) => (x === p ? { ...x, estado: 'pagada', pagado_en: ahora() } : x));
  const lista = completa({ partes, total: d.total });
  await db.club_divisiones.put({ ...d, partes, estado: lista ? 'completa' : 'abierta', updated_at: ahora() });
  if (lista) await liquidar({ ...d, partes });
  return null;
}
/**
 * En la barra: todos muestran su tarjeta y se descuenta a cada uno en el acto (sin esperar aceptación).
 * Si a alguno no le alcanza, no se cobra a nadie.
 */
export async function dividirEnElActo(o: { tipo: Division['tipo']; ref: string; total: number; concepto: string; partes: { user_id: string; monto: number }[]; club: string; mesero?: string | null }): Promise<string | null> {
  if (o.partes.reduce((s, p) => s + p.monto, 0) !== o.total) return 'Las partes no suman el total';
  const movs = (await db.social_billetera.toArray()) as Movimiento[];
  for (const p of o.partes) {
    const s = saldoDe(movs, p.user_id);
    if (s < p.monto) return `A ${nombreDe(p.user_id).split(' ')[0]} no le alcanza el saldo (${pesos(s)} de ${pesos(p.monto)})`;
  }
  for (const p of o.partes) await debitar(p.user_id, p.monto, `Tu parte · ${o.concepto}`, o.ref, o.club);
  const d: Division = { id: crypto.randomUUID(), club_id: o.club, tipo: o.tipo, ref: o.ref, concepto: o.concepto, total: o.total, creador: o.partes[0].user_id, estado: 'completa', created_at: ahora(), partes: o.partes.map((p) => ({ ...p, estado: 'pagada', pagado_en: ahora() })) };
  await db.club_divisiones.put({ ...d, updated_at: ahora(), deleted_at: null });
  await liquidar(d, o.mesero);
  await registrar('pago', '➗', `${o.concepto} pagado entre ${o.partes.length} con saldo (${o.partes.map((p) => `${nombreDe(p.user_id).split(' ')[0]} ${pesos(p.monto)}`).join(' · ')})`, o.club);
  return null;
}
/** Todas las partes pagadas: el club recibe el total (con saldo) y lo pagado queda pagado */
async function liquidar(d: Division, mesero?: string | null) {
  const quien = d.partes.map((p) => nombreDe(p.user_id).split(' ')[0]).join(' y ');
  if (d.tipo === 'cancha') {
    const f = (await db.social_franjas.get(d.ref)) as Franja | undefined;
    if (!f) return;
    await db.social_franjas.put({ ...f, updated_at: ahora(), estado: 'pagada', origen: f.origen ?? 'app' });
    if (f.partido_id) { const p = await db.social_partidos.get(f.partido_id); if (p) await db.social_partidos.put({ ...p, estado: 'confirmado', updated_at: ahora() }); }
    await cobrar('cancha', f.id, d.total, 'saldo', quien, clubDeFranja(f));
    await registrar('pago', '➗', `${etiquetaFranja(f)} pagada entre ${d.partes.length} con saldo · ${pesos(d.total)}`, clubDeFranja(f));
  } else if (d.tipo === 'pedido') {
    const p = (await db.club_pedidos.get(d.ref)) as Pedido | undefined;
    if (!p) return;
    await db.club_pedidos.put({ ...p, metodo: 'saldo', pagado_en: ahora(), estado: p.estado === 'entregado' ? 'pagado' : p.estado, mesero: mesero ?? p.mesero, updated_at: ahora() });
    await cobrar('bar', p.id, d.total, 'saldo', quien, p.club_id);
  } else {
    // Lo consumido en una cuenta: lo que estaba por pagar queda pagado
    const ps = ((await db.club_pedidos.toArray()) as Pedido[]).filter((p) => p.cuenta_id === d.ref && p.estado !== 'cancelado' && !p.pagado_en && p.estado !== 'pagado');
    for (const p of ps) await db.club_pedidos.put({ ...p, metodo: 'saldo', pagado_en: ahora(), estado: p.estado === 'entregado' ? 'pagado' : p.estado, updated_at: ahora() });
    if (d.club_id) await cobrar('bar', d.ref, d.total, 'saldo', quien, d.club_id);
  }
}

/** Para otros módulos (clases): registrar un pago recibido por el club y devolver saldo */
export const registrarPago = cobrar;
export async function reembolsar(uid: string, monto: number, concepto: string, ref: string | null, club: string | null) {
  await db.social_billetera.put({ ...marca(), id: crypto.randomUUID(), user_id: uid, tipo: 'reembolso', monto, concepto, ref, club_id: club, metodo: null });
}
