// Sincronización de solo bajada: trae lo que cambió en el servidor desde el último cursor (updated_at) de cada tabla.
// En Selffin también empujaba una cola local; en el módulo social todo se escribe por funciones del servidor.
import { db } from './db';
import { supabase } from './supabase';
import { CLAVE, TABLAS, TRAER_COMPLETAS, type Tabla } from './esquema';

let temporizador: ReturnType<typeof setTimeout> | null = null;
export function sincronizarPronto(ms = 400) {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => void sincronizar(), ms);
}

let enCurso: Promise<void> | null = null;
let ultimo = 0;
export function sincronizar(): Promise<void> {
  if (import.meta.env.VITE_E2E === '1') return Promise.resolve();
  if (!enCurso) enCurso = ejecutar().finally(() => (enCurso = null));
  return enCurso;
}

async function ejecutar() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  for (const tabla of TABLAS) await traerTabla(tabla);
  ultimo = Date.now();
}

async function traerTabla(tabla: Tabla) {
  const k = 'cursor:' + tabla;
  const cursor = TRAER_COMPLETAS.has(tabla) ? '1970-01-01T00:00:00Z' : ((await db.meta.get(k))?.v as string | undefined) ?? '1970-01-01T00:00:00Z';
  // margen de 5 s para no perder transacciones que confirmaron tarde
  const desde = new Date(new Date(cursor).getTime() - 5000).toISOString();
  let max = cursor;
  const t = (db as any)[tabla];
  for (let pagina = 0; ; pagina++) {
    const { data, error } = await supabase.from(tabla).select('*').gt('updated_at', desde).order('updated_at').range(pagina * 1000, pagina * 1000 + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    if (!data?.length) break;
    await t.bulkPut(data);
    max = data[data.length - 1].updated_at;
    if (data.length < 1000) break;
  }
  // Perfiles: los que ya no puedo ver (relación terminada) salen de este dispositivo
  if (TRAER_COMPLETAS.has(tabla)) {
    const { data } = await supabase.from(tabla).select(CLAVE[tabla] ?? 'id');
    if (data) {
      const vivos = new Set((data as unknown as Record<string, string>[]).map((f) => f[CLAVE[tabla] ?? 'id']));
      const fuera = (await t.toCollection().primaryKeys()).filter((x: string) => !vivos.has(x));
      if (fuera.length) await t.bulkDelete(fuera);
    }
  }
  await db.meta.put({ k, v: max });
}

/** Al volver la conexión o la app al frente, sincroniza */
export function iniciarSincronizacionAutomatica() {
  if (typeof window === 'undefined' || import.meta.env.VITE_E2E === '1') return;
  window.addEventListener('online', () => sincronizarPronto(100));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && Date.now() - ultimo > 20_000 && sincronizarPronto(100));
  setInterval(() => sincronizarPronto(0), 60_000);
  sincronizarPronto(0);
}
