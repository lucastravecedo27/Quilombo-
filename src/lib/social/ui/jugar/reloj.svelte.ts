// Un reloj compartido (cada segundo) para las cuentas regresivas de las reservas apartadas ("86:57 para pagar").
import { diaColombia } from '../../domain/jugar';

class Reloj {
  ahora = $state(Date.now());
  #t: ReturnType<typeof setInterval> | null = null;
  constructor() {
    if (typeof window !== 'undefined') this.#t = setInterval(() => (this.ahora = Date.now()), 1000);
  }
}
export const reloj = new Reloj();

/** "86:57": minutos y segundos que faltan (0:00 si ya pasó) */
export function mmss(hasta: string | null | undefined, ahora = reloj.ahora): string {
  if (!hasta) return '';
  const s = Math.max(0, Math.floor((Date.parse(hasta) - ahora) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
/** "Hoy", "Mañana" o "Sáb 17" (hora de Colombia) */
export function diaCorto(iso: string, ahora = Date.now()): string {
  const d = diaColombia(iso);
  if (d === diaColombia(new Date(ahora).toISOString())) return 'Hoy';
  if (d === diaColombia(new Date(ahora + 86_400_000).toISOString())) return 'Mañana';
  const t = new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', timeZone: 'America/Bogota' }).replace(/[.,]/g, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
/** "7:30" y "p. m." por separado (hora de Colombia) */
export function partirHora(iso: string): { hora: string; ampm: string } {
  const t = new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).replace(/\s+/g, ' ');
  const m = /^(\d{1,2}:\d{2})\s*(.*)$/.exec(t);
  return m ? { hora: m[1], ampm: m[2] } : { hora: t, ampm: '' };
}
