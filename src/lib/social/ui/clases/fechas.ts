// Fechas cortas para las listas por día (hora de Colombia): "Hoy · lunes 12 oct", "Mañana · …", "Miércoles 14 oct".
import { horaColombia } from '../../domain/jugar';

const hoyCol = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
const masDias = (dia: string, n: number) => new Date(Date.parse(dia + 'T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);

export function nombreDia(dia: string): string {
  const largo = new Date(dia + 'T12:00:00-05:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace(/[.,]/g, '');
  if (dia === hoyCol()) return `Hoy · ${largo}`;
  if (dia === masDias(hoyCol(), 1)) return `Mañana · ${largo}`;
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}
/** "7:30 a. m." → ["7:30", "a. m."] */
export function partirHora(iso: string): [string, string] {
  const h = horaColombia(iso);
  const m = /^(\S+)\s(.*)$/.exec(h);
  return m ? [m[1], m[2]] : [h, ''];
}
