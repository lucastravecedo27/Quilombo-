// Estado de la pantalla del panel: sección, franja abierta, avisos en vivo y lo que acaba de llegar (para resaltarlo)
import { diaColombia, cuando, horaColombia, pesos } from '$lib/social/domain/jugar';
import type { Franja } from '$lib/social/domain/jugar';
import type { CategoriaProducto, Cuenta, Pago, Pedido } from '$lib/club/domain/club';
import type { Inscripcion, Torneo } from '$lib/social/domain/jugar';
import type { Resultado } from '$lib/social/domain/ranking';
import type { Clase } from '$lib/social/domain/clases';
import { canchaDe, titularDe } from '$lib/club/app/club';

export type Seccion = 'hoy' | 'agenda' | 'bar' | 'cuentas' | 'clases' | 'carta' | 'torneos' | 'ranking' | 'caja';
export interface Toast { id: number; tipo: 'reserva' | 'pago' | 'pedido' | 'torneo' | 'cuenta' | 'resultado' | 'clase'; titulo: string; sub: string; app: boolean; franja?: string; torneo?: string; destino: Seccion }

class Panel {
  seccion = $state<Seccion>('hoy');
  /** Franja abierta en el cajón lateral */
  abierta = $state<string | null>(null);
  dia = $state(diaColombia(new Date().toISOString()));
  ahora = $state(Date.now());
  toasts = $state<Toast[]>([]);
  /** Franjas que acaban de cambiar (se resaltan unos segundos en la agenda) */
  destellos = $state<string[]>([]);
  /** Reservas que llegaron con el panel abierto, la más nueva primero */
  nuevas = $state<{ franja: string; en: number }[]>([]);
  /** Torneo abierto en la sección Torneos (lo usan los avisos de inscripción) */
  torneo = $state<string | null>(null);
  /** Inscripciones que llegaron con el panel abierto (se resaltan) */
  inscNuevas = $state<string[]>([]);
  /** Ids de actividad que ya estaban al abrir (las nuevas entran animadas); null mientras carga */
  vistas = $state.raw<Set<string> | null>(null);
  /** Modal de producto: crear (sin id, con categoría sugerida) o editar (con id) */
  producto = $state<{ id?: string; categoria?: CategoriaProducto } | null>(null);
  /** Modal "Cobrar con tarjeta Quilombo" (caja del Mac) */
  cobroTarjeta = $state(false);
  #n = 0;

  avisar(t: Omit<Toast, 'id'>) {
    const id = ++this.#n;
    this.toasts = [{ ...t, id }, ...this.toasts].slice(0, 4);
    setTimeout(() => this.quitar(id), 6500);
  }
  quitar(id: number) { this.toasts = this.toasts.filter((t) => t.id !== id); }
  destellar(fid: string) {
    this.destellos = [...this.destellos.filter((x) => x !== fid), fid];
    setTimeout(() => (this.destellos = this.destellos.filter((x) => x !== fid)), 8000);
  }
  /** Abre la agenda en el día de esa franja con su cajón */
  verFranja(f: Franja) {
    this.dia = diaColombia(f.inicio);
    this.seccion = 'agenda';
    this.abierta = f.id;
  }
}
export const panel = new Panel();

// ───────── Lo que llega en vivo: comparar con lo que había ─────────
let franjasAntes: Map<string, string> | null = null;
let pagosAntes: Set<string> | null = null;
let pedidosAntes: Set<string> | null = null;
/** Al abrir llegan los datos por partes: lo de los primeros segundos se toma como "lo que ya había" */
let calmaHasta = Date.now() + 3000;
export const empezarObservar = () => { calmaHasta = Date.now() + 2500; };
const callado = () => Date.now() < calmaHasta;

const etiqueta = (f: Franja) => `${canchaDe(f.cancha_id)?.nombre ?? 'Cancha'} · ${cuando(f.inicio)}`;

export function observarFranjas(fs: Franja[]) {
  if (!franjasAntes) { franjasAntes = new Map(fs.map((f) => [f.id, f.estado])); return; }
  for (const f of fs) {
    const antes = franjasAntes.get(f.id);
    if (antes === f.estado) continue;
    franjasAntes.set(f.id, f.estado);
    if (antes === undefined || callado()) continue;
    const app = f.origen === 'app';
    // Las de clases las avisa observarClases (con el profe y el alumno)
    if (f.cliente?.startsWith('Clase ·')) { panel.destellar(f.id); continue; }
    if (antes === 'libre' && (f.estado === 'apartada' || f.estado === 'pagada')) {
      panel.nuevas = [{ franja: f.id, en: Date.now() }, ...panel.nuevas.filter((x) => x.franja !== f.id)];
      panel.destellar(f.id);
      panel.avisar({ tipo: 'reserva', titulo: 'Nueva reserva', sub: `${etiqueta(f)} · ${titularDe(f)}`, app, franja: f.id, destino: 'agenda' });
    } else if (antes === 'apartada' && f.estado === 'pagada') {
      panel.destellar(f.id);
    } else if (f.estado === 'libre' && (antes === 'apartada' || antes === 'pagada')) {
      panel.destellar(f.id);
    }
  }
}
export function observarPagos(ps: Pago[], franjas: Franja[]) {
  if (!pagosAntes) { pagosAntes = new Set(ps.map((p) => p.id)); return; }
  for (const p of ps) {
    if (pagosAntes.has(p.id)) continue;
    pagosAntes.add(p.id);
    if (callado()) continue;
    const f = p.concepto === 'cancha' ? franjas.find((x) => x.id === p.ref) : undefined;
    const que = f ? etiqueta(f) : p.concepto === 'bar' ? 'Bar' : p.concepto === 'clase' ? 'Clase' : 'Inscripción a torneo';
    panel.avisar({ tipo: 'pago', titulo: `Pago recibido · ${pesos(p.monto)}`, sub: `${que} · ${p.quien}`, app: p.metodo === 'app' || p.metodo === 'saldo', franja: f?.id, destino: f ? 'agenda' : p.concepto === 'bar' ? 'bar' : p.concepto === 'clase' ? 'clases' : 'caja' });
  }
}
export function observarPedidos(ps: Pedido[]) {
  if (!pedidosAntes) { pedidosAntes = new Set(ps.map((p) => p.id)); return; }
  for (const p of ps) {
    if (pedidosAntes.has(p.id)) continue;
    pedidosAntes.add(p.id);
    if (callado()) continue;
    panel.avisar({ tipo: 'pedido', titulo: `Pedido #${p.numero} · ${p.ubicacion}`, sub: `${p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')} · ${pesos(p.total)}`, app: p.origen === 'app', destino: 'bar' });
  }
}

let inscAntes: Map<string, string> | null = null;
let cuentasAntes: Set<string> | null = null;
let resAntes: Map<string, string> | null = null;
const nombreDe = (perfiles: { user_id: string; nombre: string }[], u: string | null) => (u ? perfiles.find((p) => p.user_id === u)?.nombre ?? 'Jugador' : '');

/** Inscripciones a los torneos del club: nuevas (con tarjeta o comprobante) y comprobantes que llegan */
export function observarInscripciones(is: Inscripcion[], torneos: Torneo[], perfiles: { user_id: string; nombre: string }[]) {
  const mios = new Map(torneos.map((t) => [t.id, t]));
  const propias = is.filter((i) => mios.has(i.torneo_id));
  if (!inscAntes) { inscAntes = new Map(propias.map((i) => [i.id, i.estado])); return; }
  for (const i of propias) {
    const antes = inscAntes.get(i.id);
    if (antes === i.estado) continue;
    inscAntes.set(i.id, i.estado);
    if (callado()) continue;
    const t = mios.get(i.torneo_id)!;
    const quien = `${nombreDe(perfiles, i.user_id)}${i.pareja ? ` y ${nombreDe(perfiles, i.pareja)}` : ''}`;
    if (antes === undefined || (antes !== 'comprobante' && i.estado === 'comprobante')) {
      panel.inscNuevas = [i.id, ...panel.inscNuevas.filter((x) => x !== i.id)];
      const sub = i.estado === 'comprobante' ? 'Subió comprobante · revísalo' : i.estado === 'inscrito' ? (i.metodo === 'tarjeta' ? 'Pagó con tarjeta ✓' : 'Inscrito ✓') : 'Falta pago';
      panel.avisar({ tipo: 'torneo', titulo: `Nueva inscripción · ${t.nombre}`, sub: `${quien} · ${i.categoria}ª · ${sub}`, app: true, torneo: t.id, destino: 'torneos' });
    }
  }
}
/** Cuentas abiertas (modo crucero) que se abren con el panel abierto */
export function observarCuentas(cs: Cuenta[]) {
  if (!cuentasAntes) { cuentasAntes = new Set(cs.map((c) => c.id)); return; }
  for (const c of cs) {
    if (cuentasAntes.has(c.id)) continue;
    cuentasAntes.add(c.id);
    if (callado()) continue;
    panel.avisar({ tipo: 'cuenta', titulo: `Tarjeta escaneada · ${c.codigo}`, sub: `${c.nombre} · paga con su saldo Quilombo`, app: !!c.user_id, destino: 'cuentas' });
  }
}
/** Resultados jugados en el club que entran en disputa (el club los resuelve) */
export function observarResultados(rs: Resultado[], perfiles: { user_id: string; nombre: string }[]) {
  if (!resAntes) { resAntes = new Map(rs.map((r) => [r.id, r.estado])); return; }
  for (const r of rs) {
    const antes = resAntes.get(r.id);
    if (antes === r.estado) continue;
    resAntes.set(r.id, r.estado);
    if (callado() || r.estado !== 'disputado') continue;
    const no = Object.entries(r.confirmaciones).find(([, v]) => v === 'no')?.[0] ?? null;
    panel.avisar({ tipo: 'resultado', titulo: 'Resultado en disputa', sub: `${nombreDe(perfiles, no)} no está de acuerdo · resuélvelo`, app: true, destino: 'ranking' });
  }
}

let clasesAntes: Map<string, string[]> | null = null;
/** Clases del club: un profe abre un horario o un alumno reserva */
export function observarClases(cs: Clase[], perfiles: { user_id: string; nombre: string }[]) {
  if (!clasesAntes) { clasesAntes = new Map(cs.map((c) => [c.id, c.alumnos])); return; }
  for (const c of cs) {
    const antes = clasesAntes.get(c.id);
    clasesAntes.set(c.id, c.alumnos);
    if (callado()) continue;
    const profe = nombreDe(perfiles, c.profesor);
    const lugar = `${horaColombia(c.inicio)} · ${cuando(c.inicio).split(' · ')[0]}`;
    if (!antes) {
      if (c.estado !== 'cancelada') panel.avisar({ tipo: 'clase', titulo: 'Nuevo horario de clase', sub: `${profe} · ${lugar} · ${c.tipo}`, app: true, franja: c.franja_id ?? undefined, destino: 'clases' });
      continue;
    }
    const nuevos = c.alumnos.filter((a) => !antes.includes(a));
    if (nuevos.length) {
      if (c.franja_id) panel.destellar(c.franja_id);
      panel.avisar({ tipo: 'clase', titulo: `Clase reservada · ${profe}`, sub: `${nuevos.map((a) => nombreDe(perfiles, a)).join(', ')} · ${lugar} · ${pesos(c.precio)}`, app: true, franja: c.franja_id ?? undefined, destino: 'clases' });
    }
  }
}
