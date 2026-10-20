// Saldo Quilombo y pagos entre varios, del lado del jugador: lo que me toca pagar, y en la demo los "bots" (los demás
// jugadores son de mentira) que pagan su parte solos a los pocos segundos.
import { E2E } from '$lib/app/sesion.svelte';
import { datos } from '$lib/data/datos.svelte';
import { pagarMiParte, rechazarParte } from '$lib/club/app/club';
import type { Division } from '$lib/club/domain/billetera';
import { nombreDe, yo } from './vinculos';

export const misDivisiones = () => (datos.divisiones as Division[]).filter((d) => d.creador === yo() || d.partes.some((p) => p.user_id === yo()));
/** Las partes que me piden y aún no pago */
export const meTocaPagar = () => (datos.divisiones as Division[]).filter((d) => d.estado === 'abierta' && d.creador !== yo() && d.partes.some((p) => p.user_id === yo() && p.estado === 'pendiente'));
export const miParte = (d: Division) => d.partes.find((p) => p.user_id === yo()) ?? null;

/**
 * Demo: los demás (que no tienen un celular en la reunión) pagan su parte solos, uno por uno cada 3–5 s.
 * Si a alguno no le alcanza el saldo, dice que no puede.
 */
export function bots(did: string, uids: string[], alPagar?: (uid: string, ok: boolean) => void) {
  if (!E2E) return;
  let t = 0;
  for (const u of uids) {
    t += 3000 + Math.random() * 2000;
    setTimeout(async () => {
      const d = (datos.divisiones as Division[]).find((x) => x.id === did);
      if (!d || d.estado !== 'abierta' || d.partes.find((p) => p.user_id === u)?.estado !== 'pendiente') return;
      const err = await pagarMiParte(did, u);
      if (err) await rechazarParte(did, u);
      alPagar?.(u, !err);
    }, t);
  }
}
export const primero = (uid: string) => nombreDe(uid).split(' ')[0];
