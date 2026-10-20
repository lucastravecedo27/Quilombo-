// Demo en vivo entre equipos: si la app se sirve desde `npm run demo` (el Mac), se conecta a la central (vite/demoHub.ts).
// Lo que cada equipo guarda se manda a la central y llega a los demás al instante. Sin central (build de pruebas,
// o abierta sin servidor) la demo funciona sola en ese equipo, como antes.
import { db, espejo } from '$lib/data/db';
import { datos } from '$lib/data/datos.svelte';

type Fila = Record<string, unknown>;
interface Estado { semilla: string; vacio: boolean; tablas: Record<string, [string, Fila][]> }

/** Identifica a este equipo ante la central (para no recibir el eco de lo propio) */
const CLIENTE = Math.random().toString(36).slice(2) + Date.now().toString(36);
const cab = { 'Content-Type': 'application/json', 'x-hub-cliente': CLIENTE };

export const hub = { conectado: false };

let cola: Promise<unknown> = Promise.resolve();
function enviar(tabla: string, filas: [string, Fila][]) {
  // En orden: un cambio no adelanta al anterior
  const cuerpo = JSON.stringify({ tabla, filas });
  cola = cola.then(() => fetch('/__hub/poner', { method: 'POST', headers: cab, body: cuerpo })).catch(() => undefined);
}

const tablaDe = (nombre: string) => db.tables.find((t) => t.name === nombre);
async function aplicar(tabla: string, filas: [string, Fila][]) {
  const t = tablaDe(tabla);
  if (!t || !filas.length) return;
  const valores = filas.map(([, f]) => f);
  for (const v of valores) espejo.remotas.add(v);
  await t.bulkPut(valores);
}
async function vaciar() {
  await Promise.all(db.tables.map((t) => t.clear()));
}

async function leerEstado(): Promise<Estado | null> {
  try {
    const r = await fetch('/__hub/estado', { headers: cab });
    if (!r.ok || !r.headers.get('content-type')?.includes('json')) return null;
    return (await r.json()) as Estado;
  } catch {
    return null;
  }
}

/**
 * Arranca la demo: con central, este equipo queda con el estado compartido (si es el primero, siembra los datos de
 * demo y los sube); sin central, siembra local si hace falta. Devuelve si quedó conectado.
 */
export async function arrancarDemo(): Promise<boolean> {
  const { sembrarDemo } = await import('./demo');
  const e = await leerEstado();
  if (!e) {
    await sembrarDemo();
    datos.iniciar();
    return false;
  }
  hub.conectado = true;
  espejo.enviar = enviar;
  const mia = (await db.meta.get('hub-semilla'))?.v;
  if (e.vacio) {
    const r = await fetch('/__hub/reclamar', { method: 'POST', headers: cab }).then((x) => x.json() as Promise<{ sembrar: boolean }>);
    await vaciar();
    if (r.sembrar) await sembrarDemo();
  } else {
    if (mia !== e.semilla) await vaciar();
    for (const [tabla, filas] of Object.entries(e.tablas)) await aplicar(tabla, filas);
  }
  // meta no se manda a la central
  await db.meta.put({ k: 'hub-semilla', v: e.semilla });
  escuchar();
  datos.iniciar();
  return true;
}

function escuchar() {
  const fuente = new EventSource(`/__hub/eventos?cliente=${CLIENTE}`);
  fuente.onmessage = (m) => {
    const msg = JSON.parse(m.data) as { tipo: 'filas'; tabla: string; filas: [string, Fila][] } | { tipo: 'reinicio' };
    if (msg.tipo === 'reinicio') { location.reload(); return; }
    void aplicar(msg.tabla, msg.filas);
  };
  // Al conectar y al volver (el celular se bloqueó, se cayó el wifi): ponerse al día con todo
  fuente.onopen = async () => {
    const e = await leerEstado();
    if (!e) return;
    if (e.semilla !== (await db.meta.get('hub-semilla'))?.v) { location.reload(); return; }
    for (const [tabla, filas] of Object.entries(e.tablas)) await aplicar(tabla, filas);
  };
}

/** Borra la demo en todos los equipos y vuelve a empezar con los datos de ejemplo */
export async function reiniciarDemo() {
  if (hub.conectado) await fetch('/__hub/reiniciar', { method: 'POST', headers: cab });
  else { await vaciar(); location.reload(); }
}
