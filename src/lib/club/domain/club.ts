// El lado del club que contrata Quilombo: su agenda de canchas, la carta del bar, los pedidos que toman los meseros
// (o que piden los jugadores desde la app), los pagos que recibe y su equipo. Funciones puras.
import { diaColombia, type Cancha, type Franja } from '$lib/social/domain/jugar';

/** El club de la demo (Pádel Club La 70, Medellín): el que administra el panel y donde trabajan los meseros */
export const CLUB_DEMO = '00000000-0000-4000-e000-000000000070';

export type CategoriaProducto = 'bebidas' | 'comida' | 'tienda';
export const CATEGORIAS_PRODUCTO: { id: CategoriaProducto; nombre: string; emoji: string }[] = [
  { id: 'bebidas', nombre: 'Bebidas', emoji: '🥤' },
  { id: 'comida', nombre: 'Comida', emoji: '🍽️' },
  { id: 'tienda', nombre: 'Tienda y alquiler', emoji: '🎾' }
];
export interface Producto { id: string; club_id: string; nombre: string; categoria: CategoriaProducto; precio: number; emoji: string; activo: boolean; orden: number }

export interface ItemPedido { producto_id: string; nombre: string; emoji: string; precio: number; cantidad: number }
/** nuevo → preparando → entregado → pagado (o cancelado) */
export type EstadoPedido = 'nuevo' | 'preparando' | 'entregado' | 'pagado' | 'cancelado';
/** app = tarjeta/PSE en la app; saldo = saldo Quilombo */
export type MetodoPago = 'app' | 'saldo' | 'efectivo' | 'datafono' | 'nequi';
export interface Pedido {
  id: string; club_id: string; numero: number;
  origen: 'app' | 'mesero';
  /** El jugador que pidió desde la app (si fue así) */
  user_id: string | null;
  /** A nombre de quién (el jugador o lo que diga el mesero) */
  cliente: string;
  cancha_id: string | null; franja_id: string | null;
  /** "Cancha 2", "Barra", "Terraza" */
  ubicacion: string;
  items: ItemPedido[]; total: number; nota: string | null;
  /** Cargado a una cuenta abierta (modo crucero): se paga al cerrar la cuenta */
  cuenta_id?: string | null;
  estado: EstadoPedido; mesero: string | null; metodo: MetodoPago | null;
  created_at: string; updated_at: string; entregado_en: string | null; pagado_en: string | null;
}
/**
 * "Modo crucero": el jugador le muestra su tarjeta Quilombo (su QR único) al mesero; todo lo que
 * pide se va cargando a esa cuenta y la paga una sola vez al final (en la app o en la caja).
 */
export interface Cuenta {
  id: string; club_id: string; user_id: string | null; nombre: string;
  /** El código de la tarjeta del jugador (o uno propio si es un cliente sin usuario): "Q7K2MX" */
  codigo: string;
  estado: 'abierta' | 'pagada';
  /** Tope de consumo (opcional) */
  tope: number | null;
  metodo: MetodoPago | null;
  created_at: string; cerrada_en: string | null;
}
/**
 * La tarjeta Quilombo: cada jugador tiene UN código (y su QR) único y para siempre; es su "tarjeta del crucero".
 * El mesero la escanea y todo se carga a la cuenta de ese jugador en el club (la cuenta se abre sola con el primer
 * pedido y se cierra al pagar). El código es de 6 caracteres sin 0/O/1/I, para poder dictarlo o digitarlo.
 */
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LARGO_TARJETA = 6;
/** El código de la tarjeta sale del id del jugador (siempre el mismo para la misma persona) */
export function tarjetaDerivada(uid: string): string {
  // FNV-1a + mezcla final de murmur3: 30 bits bien repartidos → 6 letras de 5 bits
  let h = 2166136261;
  for (const ch of uid) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  h >>>= 0;
  let out = '';
  for (let k = 0; k < LARGO_TARJETA; k++) out += LETRAS[(h >>> (k * 5)) & 31];
  return out;
}
/** Lo que va en el QR de la tarjeta */
export const qrTarjeta = (codigo: string) => `quilombo:tarjeta:${codigo}`;
/** Compatibilidad: el QR de una cuenta lleva el código de la tarjeta del dueño */
export const qrCuenta = (c: Pick<Cuenta, 'id' | 'codigo'>) => qrTarjeta(c.codigo);
/** Lee un QR (o un código digitado) y devuelve el código de tarjeta en mayúsculas */
export function leerCodigoCuenta(texto: string): string | null {
  const t = texto.trim();
  const m = /^quilombo:(?:tarjeta|cuenta):([A-Z0-9]{4,6})\b/i.exec(t);
  if (m) return m[1].toUpperCase();
  const c = t.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return c.length === LARGO_TARJETA && [...c].every((x) => LETRAS.includes(x)) ? c : null;
}
/** Un código nuevo que no esté en uso (para cuentas de clientes sin usuario) */
export function codigoNuevo(existentes: string[], azar = Math.random): string {
  for (;;) {
    const c = Array.from({ length: LARGO_TARJETA }, () => LETRAS[Math.floor(azar() * LETRAS.length)]).join('');
    if (!existentes.includes(c)) return c;
  }
}
/** Lo consumido en una cuenta (pedidos no cancelados) */
export const consumoCuenta = (pedidos: Pick<Pedido, 'cuenta_id' | 'estado' | 'total'>[], cuentaId: string) =>
  pedidos.filter((p) => p.cuenta_id === cuentaId && p.estado !== 'cancelado').reduce((s, p) => s + p.total, 0);

export interface Pago { id: string; club_id: string; concepto: 'cancha' | 'bar' | 'torneo' | 'clase'; ref: string | null; monto: number; metodo: MetodoPago; quien: string; created_at: string }
export interface Staff { id: string; club_id: string; nombre: string; rol: 'admin' | 'mesero'; color: string }
export interface Actividad { id: string; club_id: string; tipo: 'reserva' | 'pago' | 'pedido' | 'entrega' | 'torneo' | 'llegada' | 'cancelacion' | 'clase'; icono: string; texto: string; created_at: string }

export const ESTADOS_PEDIDO: Record<EstadoPedido, { nombre: string; color: string }> = {
  nuevo: { nombre: 'Nuevo', color: 'var(--q-naranja)' },
  preparando: { nombre: 'Preparando', color: 'var(--q-fiesta-amarillo)' },
  entregado: { nombre: 'Entregado · por cobrar', color: 'var(--q-azul)' },
  pagado: { nombre: 'Pagado', color: 'var(--q-verde)' },
  cancelado: { nombre: 'Cancelado', color: 'var(--q-tx3)' }
};
export const METODOS: Record<MetodoPago, string> = { app: 'Quilombo', saldo: 'Saldo Quilombo', efectivo: 'Efectivo', datafono: 'Datáfono', nequi: 'Nequi' };
/** El siguiente paso de un pedido (null si ya terminó) */
export const siguiente = (e: EstadoPedido): EstadoPedido | null => ({ nuevo: 'preparando', preparando: 'entregado', entregado: 'pagado' } as Record<string, EstadoPedido>)[e] ?? null;

export const totalItems = (items: ItemPedido[]) => items.reduce((s, i) => s + i.precio * i.cantidad, 0);
export const unidades = (items: ItemPedido[]) => items.reduce((s, i) => s + i.cantidad, 0);
export const resumenItems = (items: ItemPedido[]) => items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ');

/** Las franjas de un club en un día (Colombia), agrupadas por hora de inicio, en orden */
export function agenda(franjas: Franja[], canchas: Cancha[], dia: string) {
  const ids = new Set(canchas.map((c) => c.id));
  const delDia = franjas.filter((f) => ids.has(f.cancha_id) && diaColombia(f.inicio) === dia);
  const horas = [...new Set(delDia.map((f) => f.inicio))].sort();
  return horas.map((inicio) => ({ inicio, porCancha: new Map(delDia.filter((f) => f.inicio === inicio).map((f) => [f.cancha_id, f])) }));
}
/** Qué tan llena está la agenda: franjas reservadas (apartadas o pagadas) sobre las que se pueden vender */
export function ocupacion(franjas: Franja[]) {
  const vendibles = franjas.filter((f) => f.estado !== 'bloqueada');
  const ocupadas = vendibles.filter((f) => f.estado === 'apartada' || f.estado === 'pagada');
  return { ocupadas: ocupadas.length, total: vendibles.length, pct: vendibles.length ? Math.round((ocupadas.length / vendibles.length) * 100) : 0 };
}
/** La franja que se está jugando ahora en esa cancha (si hay) */
export const enJuego = (franjas: Franja[], canchaId: string, ahora = Date.now()) =>
  franjas.find((f) => f.cancha_id === canchaId && (f.estado === 'pagada' || f.estado === 'apartada') && Date.parse(f.inicio) <= ahora && Date.parse(f.fin) > ahora) ?? null;
/** La siguiente reservada en esa cancha */
export const proxima = (franjas: Franja[], canchaId: string, ahora = Date.now()) =>
  franjas.filter((f) => f.cancha_id === canchaId && (f.estado === 'pagada' || f.estado === 'apartada') && Date.parse(f.inicio) > ahora).sort((a, b) => a.inicio.localeCompare(b.inicio))[0] ?? null;

/** Lo que entró en un día (Colombia), por concepto */
export function caja(pagos: Pago[], dia: string) {
  const hoy = pagos.filter((p) => diaColombia(p.created_at) === dia);
  const suma = (c: Pago['concepto']) => hoy.filter((p) => p.concepto === c).reduce((s, p) => s + p.monto, 0);
  return { cancha: suma('cancha'), bar: suma('bar'), torneo: suma('torneo'), clase: suma('clase'), total: hoy.reduce((s, p) => s + p.monto, 0), n: hoy.length };
}

/** "hace 3 min" */
export function hace(iso: string, ahora = Date.now()) {
  const m = Math.max(0, Math.round((ahora - Date.parse(iso)) / 60_000));
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}
