// Central de la demo en vivo: el Mac (servidor de desarrollo) guarda una copia de todas las filas y la reparte a los
// equipos conectados (jugador, mesero y club). Cada app escribe en su IndexedDB y manda el cambio aquí; los demás lo
// reciben al instante por Server-Sent Events. Solo existe en `vite` (dev), nunca en la build ni en las pruebas.
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';

type Fila = Record<string, unknown>;
interface Cambio { tabla: string; filas: [string, Fila][] }

export function demoHub(): Plugin {
  let tablas = new Map<string, Map<string, Fila>>();
  let semilla = crypto.randomUUID();
  let sembrador: string | null = null;
  const clientes = new Map<ServerResponse, string>();

  const emitir = (msg: unknown, salvo?: string) => {
    const linea = `data: ${JSON.stringify(msg)}\n\n`;
    for (const [res, id] of clientes) if (id !== salvo) res.write(linea);
  };
  const leer = (req: IncomingMessage) => new Promise<string>((ok, mal) => {
    let s = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => (s += c));
    req.on('end', () => ok(s));
    req.on('error', mal);
  });
  const json = (res: ServerResponse, v: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(v)); };
  const estado = () => ({ semilla, vacio: tablas.size === 0, tablas: Object.fromEntries([...tablas].map(([t, m]) => [t, [...m]])) });

  return {
    name: 'q-demo-hub',
    configureServer(server) {
      setInterval(() => { for (const res of clientes.keys()) res.write(': latido\n\n'); }, 15_000).unref();
      server.middlewares.use(async (req, res, next) => {
        const ruta = (req.url ?? '').split('?')[0];
        // Direcciones cortas de cada app
        const alias: Record<string, string> = { '/club': '/club.html', '/mesero': '/mesero.html', '/demo': '/demo.html' };
        if (alias[ruta.replace(/\/$/, '')]) { req.url = alias[ruta.replace(/\/$/, '')] + (req.url!.includes('?') ? req.url!.slice(req.url!.indexOf('?')) : ''); return next(); }
        if (!ruta.startsWith('/__hub/')) return next();
        const cliente = String(req.headers['x-hub-cliente'] ?? '');
        try {
          if (ruta === '/__hub/estado') return json(res, estado());
          if (ruta === '/__hub/red') {
            // Direcciones de este Mac en la red local (para abrir las apps en los celulares con un QR)
            const dir = server.httpServer?.address();
            const puerto = dir && typeof dir === 'object' ? dir.port : server.config.server.port ?? 5173;
            const urls = Object.values(networkInterfaces()).flat()
              .filter((i) => i && i.family === 'IPv4' && !i.internal)
              .map((i) => `${server.config.server.https ? 'https' : 'http'}://${i!.address}:${puerto}`);
            return json(res, { urls });
          }
          if (ruta === '/__hub/eventos') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
            res.write(': hola\n\n');
            const id = new URL(req.url!, 'http://x').searchParams.get('cliente') ?? '';
            clientes.set(res, id);
            req.on('close', () => clientes.delete(res));
            return;
          }
          if (ruta === '/__hub/reclamar' && req.method === 'POST') {
            // El primero que llega con la central vacía siembra los datos de demo
            const ok = tablas.size === 0 && (sembrador === null || sembrador === cliente);
            if (ok) sembrador = cliente;
            return json(res, { sembrar: ok, semilla });
          }
          if (ruta === '/__hub/poner' && req.method === 'POST') {
            const c = JSON.parse(await leer(req)) as Cambio;
            const t = tablas.get(c.tabla) ?? new Map<string, Fila>();
            for (const [k, f] of c.filas) t.set(k, f);
            tablas.set(c.tabla, t);
            emitir({ tipo: 'filas', ...c }, cliente);
            return json(res, { ok: true });
          }
          if (ruta === '/__hub/reiniciar' && req.method === 'POST') {
            tablas = new Map();
            semilla = crypto.randomUUID();
            sembrador = null;
            emitir({ tipo: 'reinicio', semilla });
            return json(res, { ok: true, semilla });
          }
          res.statusCode = 404;
          res.end();
        } catch (e) {
          res.statusCode = 400;
          json(res, { error: String(e) });
        }
      });
    }
  };
}
