import Dexie, { type Table } from 'dexie';

export interface Meta { k: string; v: unknown }
type Fila = Record<string, any>;

/** Lo que conecta la base con la central de la demo: a dónde mandar lo guardado y qué filas llegaron de afuera */
export const espejo = { enviar: null as null | ((tabla: string, filas: [string, Fila][]) => void), remotas: new WeakSet<object>() };

/** Copia local (IndexedDB) de lo que el usuario puede ver del módulo social */
export class BaseLocal extends Dexie {
  meta!: Table<Meta, string>;
  social_perfiles!: Table<Fila, string>;
  social_relaciones!: Table<Fila, string>;
  social_eventos!: Table<Fila, string>;
  social_reacciones!: Table<Fila, string>;
  social_mensajes!: Table<Fila, string>;
  social_publicaciones!: Table<Fila, string>;
  social_comentarios!: Table<Fila, string>;
  social_bloqueos!: Table<Fila, string>;
  social_cobros!: Table<Fila, string>;
  social_clubes!: Table<Fila, string>;
  social_canchas!: Table<Fila, string>;
  social_franjas!: Table<Fila, string>;
  social_partidos!: Table<Fila, string>;
  social_partido_respuestas!: Table<Fila, string>;
  social_torneos!: Table<Fila, string>;
  social_inscripciones!: Table<Fila, string>;
  club_productos!: Table<Fila, string>;
  club_pedidos!: Table<Fila, string>;
  club_pagos!: Table<Fila, string>;
  club_staff!: Table<Fila, string>;
  club_actividad!: Table<Fila, string>;
  social_resultados!: Table<Fila, string>;
  club_cuentas!: Table<Fila, string>;
  social_billetera!: Table<Fila, string>;
  club_divisiones!: Table<Fila, string>;
  social_profesores!: Table<Fila, string>;
  social_clases!: Table<Fila, string>;
  social_resenas_clase!: Table<Fila, string>;
  demo_prefs!: Table<Fila, string>;

  constructor(nombre = 'quilombo') {
    super(nombre);
    this.version(1).stores({
      meta: 'k',
      social_perfiles: 'user_id',
      social_relaciones: 'id',
      social_eventos: 'id, created_at',
      social_reacciones: 'id, evento_id',
      social_mensajes: 'id, relacion_id, created_at',
      social_publicaciones: 'id, created_at',
      social_comentarios: 'id, publicacion_id',
      social_bloqueos: 'id',
      social_cobros: 'id, grupo',
      social_clubes: 'id, ciudad',
      social_canchas: 'id, club_id',
      social_franjas: 'id, cancha_id, inicio',
      social_partidos: 'id, cuando',
      social_partido_respuestas: 'id, partido_id',
      social_torneos: 'id, inicio',
      social_inscripciones: 'id, torneo_id'
    });
    // El lado del club (demo): carta, pedidos del bar, pagos recibidos, equipo y lo que va pasando
    this.version(2).stores({
      club_productos: 'id, club_id',
      club_pedidos: 'id, club_id, created_at',
      club_pagos: 'id, club_id, created_at',
      club_staff: 'id, club_id',
      club_actividad: 'id, club_id, created_at'
    });
    // Resultados confirmados por todos (ranking) y cuentas abiertas del bar ("modo crucero")
    this.version(3).stores({
      social_resultados: 'id, created_at',
      club_cuentas: 'id, club_id, codigo'
    });
    // Saldo Quilombo: recargas y pagos
    this.version(4).stores({ social_billetera: 'id, user_id, created_at' });
    // Pagos entre varios (mitad y mitad): cada uno paga su parte con saldo
    this.version(5).stores({ club_divisiones: 'id, ref, created_at' });
    // Profesores, sus horarios de clase y las reseñas de sus alumnos
    this.version(6).stores({ social_profesores: 'user_id', social_clases: 'id, profesor, inicio', social_resenas_clase: 'id, profesor' });
    // Preferencias de la demo que comparten todos los equipos (p. ej. el color de acento)
    this.version(7).stores({ demo_prefs: 'id' });
    // Espejo de la demo en vivo: todo lo que se guarda se avisa a la central (ver $lib/app/hub.ts)
    this.use({
      stack: 'dbcore',
      name: 'espejo',
      create: (abajo) => ({
        ...abajo,
        table: (nombre) => {
          const t = abajo.table(nombre);
          const clave = t.schema.primaryKey.keyPath as string;
          return {
            ...t,
            mutate: (req) => t.mutate(req).then((r) => {
              if (espejo.enviar && nombre !== 'meta' && (req.type === 'put' || req.type === 'add')) {
                const filas = req.values.filter((v) => !espejo.remotas.has(v));
                if (filas.length) espejo.enviar(nombre, filas.map((f) => [String(f[clave]), f]));
              }
              return r;
            })
          };
        }
      })
    });
  }
}

/** Cada app tiene su propia base (el jugador, el club y el mesero pueden estar abiertos a la vez en el mismo equipo) */
const app = typeof location === 'undefined' ? '' : /\/(club|mesero)(\.html)?\/?$/.exec(location.pathname)?.[1];
/** En la sala de demo puede haber dos jugadores a la vez (?como=<uid>, p. ej. el profe): cada uno con su base */
const como = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('como');
export const db = new BaseLocal(app ? `quilombo-${app}` : como ? `quilombo-como-${como.replace(/[^a-z0-9]/gi, '')}` : 'quilombo');

/** Solo en la build de pruebas: acceso a la base local para simular cambios */
if (import.meta.env.VITE_E2E === '1' && typeof window !== 'undefined') (window as unknown as { __qDb: BaseLocal }).__qDb = db;
