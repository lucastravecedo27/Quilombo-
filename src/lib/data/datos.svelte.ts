// Estado reactivo global del módulo social: refleja IndexedDB en vivo (liveQuery).
import { liveQuery } from 'dexie';
import { db } from './db';

const vivos = (arr: any[]): any[] => arr.filter((x) => !x.deleted_at);

class Datos {
  listo = $state(false);
  perfiles = $state<any[]>([]);
  vinculos = $state<any[]>([]); // relaciones entre jugadores
  eventos = $state<any[]>([]); // el muro / actividad
  reacciones = $state<any[]>([]);
  mensajes = $state<any[]>([]);
  publicaciones = $state<any[]>([]);
  comentarios = $state<any[]>([]);
  bloqueos = $state<any[]>([]);
  cobros = $state<any[]>([]);
  clubes = $state<any[]>([]);
  canchas = $state<any[]>([]);
  franjas = $state<any[]>([]);
  partidos = $state<any[]>([]);
  respuestas = $state<any[]>([]);
  torneos = $state<any[]>([]);
  inscripciones = $state<any[]>([]);
  productos = $state<any[]>([]);
  pedidos = $state<any[]>([]);
  pagos = $state<any[]>([]);
  staff = $state<any[]>([]);
  actividad = $state<any[]>([]);
  resultados = $state<any[]>([]);
  cuentas = $state<any[]>([]);
  billetera = $state<any[]>([]);
  divisiones = $state<any[]>([]);
  profesores = $state<any[]>([]);
  clases = $state<any[]>([]);
  resenasClase = $state<any[]>([]);

  #subs: { unsubscribe(): void }[] = [];

  iniciar() {
    if (this.#subs.length) return;
    const enlazar = <T>(consulta: () => Promise<T>, asignar: (v: T) => void) =>
      this.#subs.push(liveQuery(consulta).subscribe({ next: asignar, error: (e) => console.error('[datos]', e) }));
    enlazar(() => db.social_perfiles.toArray(), (v) => (this.perfiles = vivos(v)));
    enlazar(() => db.social_relaciones.toArray(), (v) => (this.vinculos = vivos(v)));
    enlazar(() => db.social_eventos.orderBy('created_at').reverse().toArray(), (v) => (this.eventos = vivos(v)));
    enlazar(() => db.social_reacciones.toArray(), (v) => (this.reacciones = vivos(v)));
    // Los mensajes borrados se quedan: se ven como "Mensaje eliminado"
    enlazar(() => db.social_mensajes.orderBy('created_at').toArray(), (v) => (this.mensajes = v));
    enlazar(() => db.social_publicaciones.orderBy('created_at').reverse().toArray(), (v) => (this.publicaciones = vivos(v)));
    enlazar(() => db.social_comentarios.toArray(), (v) => (this.comentarios = vivos(v)));
    enlazar(() => db.social_bloqueos.toArray(), (v) => (this.bloqueos = vivos(v)));
    enlazar(() => db.social_cobros.toArray(), (v) => (this.cobros = vivos(v)));
    enlazar(() => db.social_clubes.toArray(), (v) => (this.clubes = vivos(v)));
    enlazar(() => db.social_canchas.toArray(), (v) => (this.canchas = vivos(v)));
    enlazar(() => db.social_franjas.orderBy('inicio').toArray(), (v) => (this.franjas = vivos(v)));
    enlazar(() => db.social_partidos.orderBy('cuando').toArray(), (v) => (this.partidos = vivos(v)));
    enlazar(() => db.social_partido_respuestas.toArray(), (v) => (this.respuestas = vivos(v)));
    enlazar(() => db.social_torneos.orderBy('inicio').toArray(), (v) => (this.torneos = vivos(v)));
    enlazar(() => db.social_inscripciones.toArray(), (v) => (this.inscripciones = vivos(v)));
    enlazar(() => db.club_productos.toArray(), (v) => (this.productos = vivos(v)));
    enlazar(() => db.club_pedidos.orderBy('created_at').reverse().toArray(), (v) => (this.pedidos = vivos(v)));
    enlazar(() => db.club_pagos.orderBy('created_at').reverse().toArray(), (v) => (this.pagos = vivos(v)));
    enlazar(() => db.club_staff.toArray(), (v) => (this.staff = vivos(v)));
    enlazar(() => db.club_actividad.orderBy('created_at').reverse().toArray(), (v) => (this.actividad = vivos(v)));
    enlazar(() => db.social_resultados.orderBy('created_at').reverse().toArray(), (v) => (this.resultados = vivos(v)));
    enlazar(() => db.club_cuentas.toArray(), (v) => (this.cuentas = vivos(v)));
    enlazar(() => db.social_billetera.orderBy('created_at').reverse().toArray(), (v) => (this.billetera = vivos(v)));
    enlazar(() => db.club_divisiones.orderBy('created_at').reverse().toArray(), (v) => (this.divisiones = vivos(v)));
    enlazar(() => db.social_profesores.toArray(), (v) => (this.profesores = vivos(v)));
    enlazar(() => db.social_clases.orderBy('inicio').toArray(), (v) => (this.clases = vivos(v)));
    enlazar(() => db.social_resenas_clase.toArray(), (v) => (this.resenasClase = vivos(v)));
    this.listo = true;
  }
}

export const datos = new Datos();
