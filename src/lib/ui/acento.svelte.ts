// Color de acento: una sola variable (--q-acc y sus variantes) con 4 opciones. El cliente aún no decide si se queda
// el naranja, así que en la demo se puede cambiar en vivo: se guarda en demo_prefs y la central lo reparte a todos
// los equipos (jugador, mesero, club y la sala).
import { liveQuery } from 'dexie';
import { db } from '$lib/data/db';

export type Acento = 'azul' | 'naranja' | 'verde' | 'noche';
export const ACENTOS: { id: Acento; nombre: string; color: string }[] = [
  { id: 'naranja', nombre: 'Naranja', color: '#ff5b1f' },
  { id: 'azul', nombre: 'Azul cancha', color: '#1e7fd0' },
  { id: 'verde', nombre: 'Verde cancha', color: '#18895b' },
  { id: 'noche', nombre: 'Azul noche', color: '#0e1b33' }
];
const CLAVE = 'q-acento';
const valido = (a: unknown): a is Acento => ACENTOS.some((x) => x.id === a);

export const acento = $state({ actual: 'azul' as Acento });

export function aplicarAcento(a: Acento) {
  acento.actual = a;
  if (typeof document !== 'undefined') document.documentElement.dataset.acento = a;
  try { localStorage.setItem(CLAVE, a); } catch { /* sin almacenamiento */ }
}
/** Al arrancar cada app: el último acento usado y, después, el que diga la demo compartida */
export function iniciarAcento() {
  let guardado: string | null = null;
  try { guardado = localStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }
  aplicarAcento(valido(guardado) ? guardado : 'azul');
  liveQuery(() => db.demo_prefs.get('acento')).subscribe({ next: (f) => { if (valido(f?.valor)) aplicarAcento(f.valor); }, error: () => undefined });
}
/** Cambiar el acento (en todos los equipos de la demo) */
export async function cambiarAcento(a: Acento) {
  aplicarAcento(a);
  await db.demo_prefs.put({ id: 'acento', valor: a, updated_at: new Date().toISOString(), deleted_at: null });
}
