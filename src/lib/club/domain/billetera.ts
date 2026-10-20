// Saldo Quilombo: la persona recarga (PSE, tarjeta o Nequi) y con ese saldo paga todo: la cancha, lo que pide en el
// bar con su tarjeta (QR) y los torneos. No hay crédito: si no le alcanza, recarga.

export type MetodoRecarga = 'pse' | 'tarjeta' | 'nequi';
export interface Movimiento {
  id: string; user_id: string;
  tipo: 'recarga' | 'pago' | 'reembolso';
  /** + entra (recarga, reembolso) / − sale (pago) */
  monto: number;
  concepto: string; ref: string | null; club_id: string | null; metodo: MetodoRecarga | null;
  created_at: string;
}
export const saldoDe = (movs: Pick<Movimiento, 'user_id' | 'monto'>[], uid: string) => movs.filter((m) => m.user_id === uid).reduce((s, m) => s + m.monto, 0);
export const RECARGAS_RAPIDAS = [50_000, 100_000, 200_000, 500_000];
export const METODOS_RECARGA: Record<MetodoRecarga, string> = { pse: 'PSE', tarjeta: 'Tarjeta', nequi: 'Nequi' };

/**
 * Pago entre varios (mitad y mitad, o entre todos): la cancha, un pedido o lo consumido se reparte entre jugadores y
 * cada uno paga SU parte con su saldo. Quien lo arma paga la suya al crearlo; a los demás les llega para aceptar.
 * Cuando todas las partes están pagadas, al club le entra el total. En la barra, si todos muestran su tarjeta al
 * mesero, se descuenta a todos en el acto.
 */
export interface Parte { user_id: string; monto: number; estado: 'pendiente' | 'pagada' | 'rechazada'; pagado_en: string | null }
export interface Division {
  id: string; club_id: string | null; tipo: 'cancha' | 'pedido' | 'cuenta'; ref: string; concepto: string;
  total: number; partes: Parte[]; creador: string; estado: 'abierta' | 'completa' | 'cancelada'; created_at: string;
}
export const pagado = (d: Pick<Division, 'partes'>) => d.partes.filter((p) => p.estado === 'pagada').reduce((s, p) => s + p.monto, 0);
export const falta = (d: Pick<Division, 'partes' | 'total'>) => d.total - pagado(d);
export const completa = (d: Pick<Division, 'partes' | 'total'>) => d.partes.length > 0 && d.partes.every((p) => p.estado === 'pagada') && pagado(d) === d.total;
/** Repartir en partes iguales (en cientos; el último absorbe el redondeo) */
export function partesIguales(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n / 100) * 100;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - base * (n - 1) : base));
}
