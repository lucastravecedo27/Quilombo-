// Datos de demo para la build de pruebas (VITE_E2E=1): una red con gente, publicaciones, chat, canchas y torneos.
// Todo queda en IndexedDB; las acciones de la app (en modo demo) escriben directo en la base local.
import { db } from '$lib/data/db';
import { DEMO_UID as U } from './sesion.svelte';
import { CLUB_DEMO, tarjetaDerivada } from '$lib/club/domain/club';

const P = {
  juan: '00000000-0000-4000-b000-000000000001',
  caro: '00000000-0000-4000-b000-000000000002',
  andres: '00000000-0000-4000-b000-000000000003',
  vale: '00000000-0000-4000-b000-000000000004',
  pipe: '00000000-0000-4000-b000-000000000005',
  santi: '00000000-0000-4000-b000-000000000006'
};
const REL = { juan: '00000000-0000-4000-c000-000000000001', caro: '00000000-0000-4000-c000-000000000002', andres: '00000000-0000-4000-c000-000000000003', vale: '00000000-0000-4000-c000-000000000004', pipe: '00000000-0000-4000-c000-000000000005', santi: '00000000-0000-4000-c000-000000000006' };
let n = 0;
const id = (p: string) => `00000000-0000-4000-d${p.padStart(3, '0').slice(0, 3)}-${String(++n).padStart(12, '0')}`;
/** Hace `min` minutos */
const ts = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const meta = { updated_at: ts(0), deleted_at: null };
const diaCol = (iso: string) => new Date(Date.parse(iso) - 5 * 3_600_000).toISOString().slice(0, 10);

export async function sembrarDemo() {
  if ((await db.social_perfiles.count()) > 0) return;
  n = 0;
  await db.social_perfiles.bulkPut([
    { ...meta, user_id: U, nombre: 'Demo Jugador', color: '#c4f246', codigo: 'demo23tuqr', usuario: 'demo', buscable: true, categoria: 4, puntos_ranking: 1250, club_base: 'Pádel Club La 70', ciudad: 'Medellín', avatar: null, foto: null },
    { ...meta, user_id: P.juan, nombre: 'Juan Pérez', color: '#7fd3ff', codigo: 'demo0juan0', usuario: 'juanpe', categoria: 4, puntos_ranking: 1410, club_base: 'Pádel Club La 70', ciudad: 'Medellín', avatar: 'perro', foto: null },
    { ...meta, user_id: P.caro, nombre: 'Caro López', color: '#ff8fb1', codigo: 'demo0caro0', usuario: 'caro.lopez', categoria: 5, puntos_ranking: 860, club_base: 'Envigado Pádel', ciudad: 'Medellín', avatar: 'gato', foto: null },
    { ...meta, user_id: P.andres, nombre: 'Andrés Gómez', color: '#ffb35c', codigo: 'demo0andre', usuario: 'andresg', categoria: 4, puntos_ranking: 1380, club_base: 'Bogotá Pádel Usaquén', ciudad: 'Bogotá', avatar: null, foto: null },
    { ...meta, user_id: P.vale, nombre: 'Vale Ríos', color: '#b69cff', codigo: 'demo0vale0', usuario: 'valen.rios', categoria: 3, puntos_ranking: 1820, club_base: 'Cali Pádel Club', ciudad: 'Cali', avatar: null, foto: null },
    { ...meta, user_id: P.pipe, nombre: 'Felipe Rojas', color: '#ffe08a', codigo: 'demo0pipe0', usuario: 'pipe_rojas', categoria: 5, ciudad: 'Bogotá' },
    { ...meta, user_id: P.santi, nombre: 'Santiago Mejía', color: '#a8e6c1', codigo: 'demo0santi', usuario: 'santi.mejia', categoria: 3, ciudad: 'Medellín' }
  ]);
  await db.social_relaciones.bulkPut([
    { ...meta, id: REL.juan, user_a: U, user_b: P.juan, tipo: 'pareja_juego', etiqueta: null, estado: 'activa', verificada: true, created_at: ts(430 * 1440) },
    { ...meta, id: REL.caro, user_a: P.caro, user_b: U, tipo: 'amigo', etiqueta: null, estado: 'activa', verificada: false, created_at: ts(200 * 1440) },
    { ...meta, id: REL.andres, user_a: U, user_b: P.andres, tipo: 'rival', etiqueta: null, estado: 'activa', verificada: false, created_at: ts(90 * 1440) },
    { ...meta, id: REL.vale, user_a: U, user_b: P.vale, tipo: 'amigo', etiqueta: null, estado: 'activa', verificada: false, created_at: ts(30 * 1440) },
    { ...meta, id: REL.pipe, user_a: U, user_b: P.pipe, tipo: 'amigo', etiqueta: null, estado: 'pendiente', verificada: false, created_at: ts(600) },
    { ...meta, id: REL.santi, user_a: P.santi, user_b: U, tipo: 'rival', etiqueta: null, estado: 'pendiente', verificada: false, created_at: ts(90) }
  ]);
  await db.social_mensajes.bulkPut([
    { ...meta, id: id('m'), relacion_id: REL.juan, autor: P.juan, texto: '¿Jugamos el jueves en la 70?', tipo: 'texto', adjunto: null, duracion: null, created_at: ts(170) },
    { ...meta, id: id('m'), relacion_id: REL.juan, autor: U, texto: 'De una, yo aparto la cancha', tipo: 'texto', adjunto: null, duracion: null, created_at: ts(165) },
    { ...meta, id: id('m'), relacion_id: REL.juan, autor: P.juan, texto: '¡Qué bandeja!', tipo: 'texto', adjunto: null, duracion: null, created_at: ts(160) },
    { ...meta, id: id('m'), relacion_id: REL.caro, autor: P.caro, texto: 'Mañana clase a las 7 😴', tipo: 'texto', adjunto: null, duracion: null, created_at: ts(300) }
  ]);

  // ── Publicaciones: fotos recientes (historias) y resultados
  const pub = { juan1: id('p'), juan2: id('p'), caro1: id('p'), mia: id('p'), resAndres: id('p'), resMio: id('p') };
  const amigos = [U, P.juan, P.caro, P.andres, P.vale];
  const aud = (autor: string) => amigos.filter((x) => x !== autor);
  await db.social_publicaciones.bulkPut([
    { ...meta, id: pub.juan1, autor: P.juan, tipo: 'foto', texto: 'Domingo de pádel en la 70 🎾', fotos: [{ path: 'demo/cancha.svg' }, { path: 'demo/raquetas.svg' }], marcador: null, con: [U], audiencia: aud(P.juan), club: 'Pádel Club La 70', ciudad: 'Medellín', created_at: ts(120) },
    { ...meta, id: pub.caro1, autor: P.caro, tipo: 'foto', texto: 'Primera clase con el profe 💪', fotos: [{ path: 'demo/raquetas.svg' }], marcador: null, con: [], audiencia: aud(P.caro), club: 'Envigado Pádel', ciudad: 'Medellín', created_at: ts(240) },
    { ...meta, id: pub.mia, autor: U, tipo: 'foto', texto: 'Listos para el torneo', fotos: [{ path: 'demo/podio.svg' }], marcador: null, con: [P.juan], audiencia: aud(U), club: 'Pádel Club La 70', ciudad: 'Medellín', created_at: ts(3 * 1440) },
    { ...meta, id: pub.juan2, autor: P.juan, tipo: 'foto', texto: 'Atardecer en la cancha', fotos: [{ path: 'demo/cancha.svg' }], marcador: null, con: [], audiencia: aud(P.juan), club: null, ciudad: 'Medellín', created_at: ts(5 * 1440) },
    { ...meta, id: pub.resAndres, autor: P.andres, tipo: 'resultado_partido', texto: 'Revancha pendiente 😤', fotos: [], marcador: { sets: [[6, 3], [4, 6], [7, 5]], companero: null, rivales: [U, P.juan] }, con: [U, P.juan], audiencia: aud(P.andres), club: 'Bogotá Pádel Usaquén', ciudad: 'Bogotá', created_at: ts(2 * 1440) },
    { ...meta, id: pub.resMio, autor: U, tipo: 'resultado_partido', texto: null, fotos: [], marcador: { sets: [[6, 4], [6, 2]], companero: P.juan, rivales: [P.andres] }, con: [P.juan, P.andres], audiencia: aud(U), club: 'Pádel Club La 70', ciudad: 'Medellín', created_at: ts(6 * 1440) }
  ]);
  const ev = (o: Record<string, unknown>) => ({ ...meta, id: id('e'), gesto: null, ...o });
  const evJuanFoto = id('e');
  await db.social_eventos.bulkPut([
    // Los que acompañan a las publicaciones (las reacciones van sobre ellos)
    { ...meta, id: evJuanFoto, actor: P.juan, participantes: amigos, tipo: 'foto', texto: 'Juan subió una foto', ref: pub.juan1, gesto: null, created_at: ts(120) },
    ev({ actor: P.caro, participantes: amigos, tipo: 'foto', texto: 'Caro subió una foto', ref: pub.caro1, created_at: ts(240) }),
    ev({ actor: U, participantes: amigos, tipo: 'foto', texto: 'Demo subió una foto', ref: pub.mia, created_at: ts(3 * 1440) }),
    ev({ actor: P.juan, participantes: amigos, tipo: 'foto', texto: 'Juan subió una foto', ref: pub.juan2, created_at: ts(5 * 1440) }),
    ev({ actor: P.andres, participantes: amigos, tipo: 'resultado_partido', texto: 'Andrés publicó un resultado', ref: pub.resAndres, created_at: ts(2 * 1440) }),
    ev({ actor: U, participantes: amigos, tipo: 'resultado_partido', texto: 'Demo publicó un resultado', ref: pub.resMio, created_at: ts(6 * 1440) }),
    // De pádel (sección Partidos)
    ev({ actor: P.vale, participantes: amigos, tipo: 'subio_ranking', texto: 'Vale subió a 1.820 pts en el ranking 📈', ref: null, created_at: ts(400) }),
    ev({ actor: P.juan, participantes: [U, P.juan], tipo: 'torneo', texto: 'Juan y Demo se inscribieron en el Open Medellín (4ª)', ref: null, created_at: ts(1440 + 60) }),
    // Actividad (más de 8, para probar "Ver más")
    ev({ actor: P.caro, participantes: [U, P.caro], tipo: 'saludo', gesto: 'jugamos', texto: 'Caro le mandó 🎾 ¿Jugamos? a Demo', ref: REL.caro, created_at: ts(30) }),
    ev({ actor: U, participantes: [U, P.vale], tipo: 'relacion', texto: 'Vale y Demo ya están conectados', ref: REL.vale, created_at: ts(30 * 1440) }),
    ev({ actor: U, participantes: [U, P.juan], tipo: 'cobro', texto: 'Demo dividió "Cancha La 70"', ref: null, created_at: ts(1440 * 2) }),
    ev({ actor: U, participantes: [U, P.juan], tipo: 'pago', texto: 'Juan le pagó a Demo lo de "Cancha La 70"', ref: null, created_at: ts(1440 * 2 - 30) }),
    ev({ actor: P.andres, participantes: [U, P.andres], tipo: 'saludo', gesto: 'nivel', texto: 'Andrés le mandó 🔥 Qué nivel a Demo', ref: REL.andres, created_at: ts(1440 * 4) }),
    ev({ actor: U, participantes: [U, P.andres], tipo: 'relacion', texto: 'Andrés y Demo ya están conectados', ref: REL.andres, created_at: ts(90 * 1440) }),
    ev({ actor: P.vale, participantes: [U, P.vale], tipo: 'saludo', gesto: 'crack', texto: 'Vale le mandó 🏆 ¡Crack! a Demo', ref: REL.vale, created_at: ts(1440 * 8) }),
    ev({ actor: U, participantes: [U, P.caro], tipo: 'saludo', gesto: 'pola', texto: 'Demo le mandó 🍻 Una pola a Caro', ref: REL.caro, created_at: ts(1440 * 9) }),
    ev({ actor: U, participantes: [U, P.caro], tipo: 'relacion', texto: 'Caro y Demo ya están conectados', ref: REL.caro, created_at: ts(200 * 1440) }),
    ev({ actor: U, participantes: [U, P.juan], tipo: 'relacion', texto: 'Juan y Demo ya están conectados', ref: REL.juan, created_at: ts(430 * 1440) })
  ]);
  await db.social_reacciones.bulkPut([
    { ...meta, id: id('r'), evento_id: evJuanFoto, user_id: P.caro, reaccion: 'fuego', created_at: ts(100) },
    { ...meta, id: id('r'), evento_id: evJuanFoto, user_id: P.vale, reaccion: 'amor', created_at: ts(90) }
  ]);
  await db.social_comentarios.bulkPut([
    { ...meta, id: id('c'), publicacion_id: pub.juan1, autor: P.caro, texto: '¡Esa cancha está una chimba!', created_at: ts(110) },
    { ...meta, id: id('c'), publicacion_id: pub.resAndres, autor: P.juan, texto: 'El jueves es la revancha', created_at: ts(2 * 1440 - 10) }
  ]);
  await db.social_cobros.bulkPut([
    { ...meta, id: id('k'), acreedor: U, deudor: P.juan, monto: 35_000, concepto: 'Cancha La 70 · jueves', estado: 'pendiente', grupo: null, partido_id: null, pagado_en: null, created_at: ts(150) }
  ]);

  // ── Jugar: clubes (La 70 es el club que contrató Quilombo: panel y meseros), canchas y la agenda de la semana
  const CLUBES = [
    { id: CLUB_DEMO, nombre: 'Pádel Club La 70', ciudad: 'Medellín', zona: 'Laureles', direccion: 'Cra. 70 #44-20' },
    { id: id('l'), nombre: 'Envigado Pádel', ciudad: 'Medellín', zona: 'Envigado', direccion: null },
    { id: id('l'), nombre: 'Bogotá Pádel Usaquén', ciudad: 'Bogotá', zona: 'Usaquén', direccion: null },
    { id: id('l'), nombre: 'Cancha 93', ciudad: 'Bogotá', zona: 'Chicó', direccion: null },
    { id: id('l'), nombre: 'Cali Pádel Club', ciudad: 'Cali', zona: 'Ciudad Jardín', direccion: null }
  ];
  await db.social_clubes.bulkPut(CLUBES.map((c) => ({ ...meta, lat: null, lng: null, ...c })));
  const CANCHAS = CLUBES.flatMap((c, i) => (i === 0 ? [1, 2, 3, 4] : [1, 2]).map((k) => ({ ...meta, id: id('h'), club_id: c.id, nombre: `Cancha ${k}`, techada: k <= 2, tipo: k === 4 ? 'panoramica' : i % 2 ? 'muro' : 'cristal' })));
  await db.social_canchas.bulkPut(CANCHAS);
  const CLIENTES = ['Mateo Restrepo', 'Sara Uribe', 'Tomás Arango', 'Mariana Vélez', 'Nicolás Ochoa', 'Laura Gil', 'Esteban Cano', 'Isabela Mora', 'Club de empresas Sura', 'Escuela de menores'];
  const hoyCol = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
  const ahoraMs = Date.now();
  // Turnos de 90 min de 6:00 a. m. a 10:30 p. m.
  const TURNOS = [360, 450, 540, 630, 720, 810, 900, 990, 1080, 1170, 1260];
  const franjas: Record<string, unknown>[] = [];
  for (let d = 0; d < 7; d++) {
    const dia = new Date(Date.parse(hoyCol + 'T00:00:00Z') + d * 86_400_000).toISOString().slice(0, 10);
    for (const [i, ca] of CANCHAS.entries()) {
      for (const [k, min] of TURNOS.entries()) {
        const inicio = new Date(Date.parse(`${dia}T00:00:00-05:00`) + min * 60_000).toISOString();
        const fin = new Date(Date.parse(inicio) + 90 * 60_000).toISOString();
        const pico = min >= 990;
        // Algunas ya están reservadas por otros (más en la noche, y la de ahora en La 70 casi llena)
        const enCurso = Date.parse(inicio) <= ahoraMs + 90 * 60_000 && Date.parse(fin) > ahoraMs;
        const ahoraEnLa70 = ca.club_id === CLUB_DEMO && d === 0 && enCurso;
        const ocupada = ahoraEnLa70 ? ca.nombre !== 'Cancha 1' : (d * 7 + i * 5 + k * 3) % (pico ? 3 : 5) === 0;
        const pasada = Date.parse(fin) < ahoraMs;
        const cliente = ocupada ? CLIENTES[(d + i + k) % CLIENTES.length] : null;
        franjas.push({
          ...meta, id: id('f'), cancha_id: ca.id, inicio, fin, precio: pico ? 160_000 : 120_000, estado: ocupada ? 'pagada' : 'libre', partido_id: null, apartada_hasta: null,
          cliente, telefono: ocupada ? `300 ${String(1000000 + ((d * 97 + i * 31 + k * 7) % 8999999)).slice(0, 3)} ${String(1000 + k * 13 + i).slice(0, 4)}` : null,
          origen: ocupada ? ((d + k) % 2 && !/^(Escuela|Club)/.test(cliente!) ? 'app' : 'club') : null, llegaron: ocupada && (pasada || enCurso) && d === 0 ? ts(20) : null, nota: null
        });
      }
    }
  }
  // Mantenimiento: la cancha 4 de La 70 bloqueada mañana temprano
  const manana = new Date(Date.parse(hoyCol + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10);
  for (const f of franjas) if (f.cancha_id === CANCHAS[3].id && (f.inicio as string) < new Date(`${manana}T09:00:00-05:00`).toISOString() && diaCol(f.inicio as string) === manana) Object.assign(f, { estado: 'bloqueada', cliente: null, origen: null, nota: 'Mantenimiento del vidrio' });
  // El partido del jueves (en dos días) que armó Juan, con cancha apartada en la 70
  const partidoJuan = id('j');
  const fJuan = franjas.find((f) => f.cancha_id === CANCHAS[0].id && f.estado === 'libre' && Date.parse(f.inicio as string) > Date.now() + 36 * 3_600_000 && (f.precio as number) === 160_000)!;
  Object.assign(fJuan, { estado: 'apartada', partido_id: partidoJuan, apartada_hasta: ts(-120), origen: 'app' });
  await db.social_franjas.bulkPut(franjas);
  await db.social_partidos.bulkPut([
    { ...meta, id: partidoJuan, creador: P.juan, cuando: fJuan.inicio, ciudad: 'Medellín', club_id: CLUB_DEMO, franja_id: fJuan.id, invitados: [U, P.caro, P.andres], cupos: 4, nota: 'Revancha con Andrés', estado: 'abierto', created_at: ts(200) }
  ]);
  await db.social_partido_respuestas.bulkPut([
    { ...meta, id: id('q'), partido_id: partidoJuan, user_id: P.caro, respuesta: 'voy', created_at: ts(150) }
  ]);

  // ── El club: equipo, carta, lo que ya pasó hoy (pagos, pedidos) y la actividad
  await db.club_staff.bulkPut([
    { ...meta, id: id('s'), club_id: CLUB_DEMO, nombre: 'Laura Gómez', rol: 'admin', color: '#ff5b1f' },
    { ...meta, id: id('s'), club_id: CLUB_DEMO, nombre: 'Camilo', rol: 'mesero', color: '#1e7fd0' },
    { ...meta, id: id('s'), club_id: CLUB_DEMO, nombre: 'Daniela', rol: 'mesero', color: '#18895b' }
  ]);
  const CARTA: [string, string, string, number][] = [
    ['bebidas', '💧', 'Agua', 4_000], ['bebidas', '⚡', 'Gatorade', 7_000], ['bebidas', '🍺', 'Cerveza Club Colombia', 9_000], ['bebidas', '🍹', 'Michelada', 12_000],
    ['bebidas', '🥥', 'Limonada de coco', 10_000], ['bebidas', '☕', 'Café', 4_500],
    ['comida', '🥟', 'Empanadas ×3', 9_000], ['comida', '🫓', 'Arepa con queso', 7_000], ['comida', '🥪', 'Sándwich de pollo', 18_000], ['comida', '🍖', 'Picada para 4', 48_000],
    ['tienda', '🎾', 'Tubo de pelotas', 32_000], ['tienda', '🏓', 'Alquiler de pala', 15_000], ['tienda', '🩹', 'Overgrip', 8_000], ['tienda', '🧺', 'Toalla', 12_000]
  ];
  const prods = CARTA.map(([categoria, emoji, nombre, precio], k) => ({ ...meta, id: id('o'), club_id: CLUB_DEMO, categoria, emoji, nombre, precio, activo: true, orden: k + 1 }));
  await db.club_productos.bulkPut(prods);
  const item = (k: number, cantidad: number) => ({ producto_id: prods[k].id, nombre: prods[k].nombre, emoji: prods[k].emoji, precio: prods[k].precio, cantidad });
  const ped = (o: Record<string, unknown>): Record<string, any> => {
    const items = o.items as { precio: number; cantidad: number }[];
    return { ...meta, id: id('i'), club_id: CLUB_DEMO, origen: 'mesero', user_id: null, franja_id: null, nota: null, metodo: null, entregado_en: null, pagado_en: null, total: items.reduce((s, x) => s + x.precio * x.cantidad, 0), ...o };
  };
  const pedidosSeed = [
    ped({ numero: 101, cliente: 'Mateo Restrepo', ubicacion: 'Cancha 2', cancha_id: CANCHAS[1].id, items: [item(2, 4), item(6, 2)], estado: 'pagado', mesero: 'Camilo', metodo: 'datafono', created_at: ts(150), entregado_en: ts(140), pagado_en: ts(95) }),
    ped({ numero: 102, cliente: 'Sara Uribe', ubicacion: 'Barra', cancha_id: null, items: [item(4, 2), item(7, 1)], estado: 'pagado', mesero: 'Daniela', metodo: 'nequi', created_at: ts(80), entregado_en: ts(74), pagado_en: ts(70) }),
    ped({ numero: 103, cliente: 'Tomás Arango', ubicacion: 'Cancha 3', cancha_id: CANCHAS[2].id, items: [item(1, 4), item(0, 2)], estado: 'entregado', mesero: 'Camilo', created_at: ts(25), entregado_en: ts(18) }),
    ped({ numero: 104, cliente: 'Mariana Vélez', ubicacion: 'Cancha 4', cancha_id: CANCHAS[3].id, items: [item(9, 1), item(3, 4)], estado: 'preparando', mesero: 'Daniela', created_at: ts(6) })
  ];
  await db.club_pedidos.bulkPut(pedidosSeed);
  const hoyPagadas = franjas.filter((f) => f.estado === 'pagada' && diaCol(f.inicio as string) === hoyCol && (CANCHAS.slice(0, 4).some((c) => c.id === f.cancha_id)));
  await db.club_pagos.bulkPut([
    ...hoyPagadas.map((f, k) => ({ ...meta, id: id('g'), club_id: CLUB_DEMO, concepto: 'cancha', ref: f.id, monto: f.precio, metodo: f.origen === 'app' ? 'app' : (['datafono', 'efectivo', 'nequi'] as const)[k % 3], quien: f.cliente, created_at: ts(400 - k * 20) })),
    ...pedidosSeed.filter((p) => p.estado === 'pagado').map((p) => ({ ...meta, id: id('g'), club_id: CLUB_DEMO, concepto: 'bar', ref: p.id, monto: p.total, metodo: p.metodo, quien: p.cliente, created_at: p.pagado_en }))
  ]);
  const act = (min: number, tipo: string, icono: string, texto: string) => ({ ...meta, id: id('a'), club_id: CLUB_DEMO, tipo, icono, texto, created_at: ts(min) });
  await db.club_actividad.bulkPut([
    act(200, 'reserva', '📱', 'Juan Pérez apartó Cancha 1 desde la app para el partido del jueves'),
    act(150, 'pedido', '🧾', 'Pedido #101 · Cancha 2: 4× Cerveza Club Colombia, 2× Empanadas ×3'),
    act(95, 'pago', '💵', 'Mateo Restrepo pagó el pedido #101 (datáfono)'),
    act(80, 'pedido', '🧾', 'Pedido #102 · Barra: 2× Limonada de coco, 1× Arepa con queso'),
    act(25, 'pedido', '🧾', 'Pedido #103 · Cancha 3: 4× Gatorade, 2× Agua'),
    act(20, 'llegada', '✅', 'Llegaron a la cancha 2 y 3 del turno actual'),
    act(6, 'pedido', '🧾', 'Pedido #104 · Cancha 4: 1× Picada para 4, 4× Michelada')
  ]);
  const dias = (k: number) => new Date(Date.now() + k * 86_400_000).toISOString();
  // Jugadores del club que no son de tu gente (inscritos al Open)
  const otros = CLIENTES.slice(0, 8).map((nombre, k) => ({ ...meta, user_id: `00000000-0000-4000-b100-${String(k + 1).padStart(12, '0')}`, nombre, color: '#1e7fd0', codigo: `demo1otro${k}`, usuario: null, buscable: false, categoria: 4 + (k % 2), puntos_ranking: 900 + k * 70, club_base: 'Pádel Club La 70', ciudad: 'Medellín' }));
  await db.social_perfiles.bulkPut(otros);
  const open = id('t');
  const parejas = [[0, 1], [2, 3], [4, 5], [6, 7]].map(([a, b], k) => ({ ...meta, id: id('n'), torneo_id: open, user_id: otros[a].user_id, pareja: otros[b].user_id, categoria: k % 2 ? 5 : 4, estado: k === 3 ? 'pendiente_pago' : 'inscrito', created_at: ts(3000 - k * 400) }));
  await db.social_inscripciones.bulkPut(parejas);
  await db.social_torneos.bulkPut([
    { ...meta, id: open, nombre: 'Open Medellín', ciudad: 'Medellín', club_id: CLUBES[0].id, inicio: dias(12), fin: dias(14), categorias: [4, 5], cupos: 32, inscritos: parejas.length, precio: 180_000, estado: 'inscripciones', cierre: dias(9), created_at: ts(5000) },
    { ...meta, id: id('t'), nombre: 'Copa Bogotá de Pádel', ciudad: 'Bogotá', club_id: CLUBES[2].id, inicio: dias(20), fin: dias(22), categorias: [2, 3, 4], cupos: 48, inscritos: 30, precio: 220_000, estado: 'inscripciones', cierre: dias(16), created_at: ts(4000) },
    { ...meta, id: id('t'), nombre: 'Torneo relámpago Cali', ciudad: 'Cali', club_id: CLUBES[4].id, inicio: dias(5), fin: dias(5), categorias: [5, 6], cupos: 16, inscritos: 9, precio: 0, estado: 'inscripciones', cierre: dias(3), created_at: ts(3000) }
  ]);

  // ── Torneos que organiza La 70 (salen en el calendario de cada jugador) y otros de Medellín
  const dia = (k: number, h: number) => new Date(Date.parse(new Date(Date.now() - 5 * 3_600_000 + k * 86_400_000).toISOString().slice(0, 10) + 'T00:00:00-05:00') + h * 3_600_000).toISOString();
  const americano = id('t'), liga = id('t');
  await db.social_torneos.bulkPut([
    { ...meta, id: americano, nombre: 'Americano nocturno La 70', ciudad: 'Medellín', club_id: CLUB_DEMO, inicio: dia(3, 19), fin: dia(3, 23), categorias: [3, 4, 5], cupos: 16, inscritos: 2, precio: 60_000, estado: 'inscripciones', cierre: dia(2, 20), created_at: ts(2000), formato: 'Americano · parejas rotativas', premios: 'Pala Bullpadel para el campeón + picada', descripcion: 'Noche de pádel con música, rotación de parejas y premiación.', cuenta_pago: 'Nequi 300 555 7070 · Pádel Club La 70' },
    { ...meta, id: liga, nombre: 'Liga La 70 · 4ª categoría', ciudad: 'Medellín', club_id: CLUB_DEMO, inicio: dia(8, 8), fin: dia(9, 18), categorias: [4], cupos: 24, inscritos: 2, precio: 120_000, estado: 'inscripciones', cierre: dia(6, 23), created_at: ts(1800), formato: 'Grupos + eliminación directa', premios: '$ 1.500.000 en premios', descripcion: 'Liga interna de nivel 4ª: cuenta doble para el ranking.', cuenta_pago: 'Bancolombia ahorros 123-456789-00 · NIT 901.234.567' },
    { ...meta, id: id('t'), nombre: 'Mixto Envigado', ciudad: 'Medellín', club_id: CLUBES[1].id, inicio: dia(17, 8), fin: dia(17, 18), categorias: [4, 5, 6], cupos: 20, inscritos: 6, precio: 90_000, estado: 'inscripciones', cierre: dia(15, 20), created_at: ts(1500), formato: 'Mixto', premios: null, descripcion: null, cuenta_pago: 'Nequi 311 222 3344' }
  ]);
  // Inscripciones con comprobante que el club tiene que revisar
  const comprobante = (monto: number, nombre: string) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="560" viewBox="0 0 360 560"><rect width="360" height="560" fill="#fff"/><rect width="360" height="110" fill="#5b1fa8"/><text x="24" y="62" font-family="Helvetica" font-weight="700" font-size="34" fill="#fff">Nequi</text><text x="24" y="92" font-family="Helvetica" font-size="15" fill="#e9d8ff">Comprobante de envío</text><text x="24" y="170" font-family="Helvetica" font-size="15" fill="#666">Para</text><text x="24" y="196" font-family="Helvetica" font-weight="700" font-size="20" fill="#111">Pádel Club La 70</text><text x="24" y="250" font-family="Helvetica" font-size="15" fill="#666">De</text><text x="24" y="276" font-family="Helvetica" font-weight="700" font-size="20" fill="#111">${nombre}</text><text x="24" y="330" font-family="Helvetica" font-size="15" fill="#666">Valor</text><text x="24" y="368" font-family="Helvetica" font-weight="700" font-size="38" fill="#111">$ ${monto.toLocaleString('es-CO')}</text><text x="24" y="430" font-family="Helvetica" font-size="15" fill="#666">Referencia M${String(monto).slice(0, 4)}8821</text><text x="24" y="456" font-family="Helvetica" font-size="15" fill="#666">${new Date().toLocaleDateString('es-CO')}</text><circle cx="300" cy="500" r="30" fill="#18a058"/><path d="M286 500l10 10 20-20" stroke="#fff" stroke-width="6" fill="none"/></svg>`);
  await db.social_inscripciones.bulkPut([
    { ...meta, id: id('n'), torneo_id: americano, user_id: otros[2].user_id, pareja: otros[5].user_id, categoria: 4, estado: 'comprobante', metodo: 'comprobante', comprobante: comprobante(60_000, otros[2].nombre), nota_club: null, created_at: ts(45) },
    { ...meta, id: id('n'), torneo_id: americano, user_id: P.caro, pareja: P.santi, categoria: 5, estado: 'inscrito', metodo: 'tarjeta', comprobante: null, nota_club: null, created_at: ts(300) },
    { ...meta, id: id('n'), torneo_id: liga, user_id: otros[0].user_id, pareja: otros[6].user_id, categoria: 4, estado: 'comprobante', metodo: 'comprobante', comprobante: comprobante(120_000, otros[0].nombre), nota_club: null, created_at: ts(15) },
    { ...meta, id: id('n'), torneo_id: liga, user_id: otros[1].user_id, pareja: otros[3].user_id, categoria: 4, estado: 'inscrito', metodo: 'tarjeta', comprobante: null, nota_club: null, created_at: ts(900) }
  ]);

  // ── Ranking nacional: jugadores de todo el país con su récord
  const NACIONAL: [string, string, number, number, number, number, string][] = [
    ['Alejandro Galán Ruiz', 'Bogotá', 1, 2480, 61, 9, 'Cancha 93'], ['Daniela Restrepo', 'Medellín', 1, 2395, 55, 11, 'Envigado Pádel'], ['Sebastián Torres', 'Cali', 1, 2350, 58, 14, 'Cali Pádel Club'],
    ['Juliana Correa', 'Bogotá', 2, 2210, 47, 15, 'Bogotá Pádel Usaquén'], ['Camilo Ospina', 'Barranquilla', 2, 2150, 44, 16, 'Barranquilla Pádel'], ['Valeria Henao', 'Medellín', 2, 2090, 40, 17, 'Pádel Club La 70'],
    ['Felipe Arango', 'Pereira', 2, 2040, 39, 19, 'Pereira Pádel'], ['Andrea Sanabria', 'Bogotá', 3, 1960, 36, 18, 'Cancha 93'], ['Ricardo Jaramillo', 'Medellín', 3, 1905, 35, 20, 'Pádel Club La 70'],
    ['Manuela Cárdenas', 'Cartagena', 3, 1870, 31, 18, 'Cartagena Pádel'], ['Jorge Iván Patiño', 'Cali', 3, 1790, 30, 21, 'Cali Pádel Club'], ['Natalia Quintero', 'Bucaramanga', 3, 1745, 28, 22, 'Bucaramanga Pádel'],
    ['Simón Echeverri', 'Medellín', 4, 1690, 27, 21, 'Envigado Pádel'], ['Paula Montoya', 'Bogotá', 4, 1610, 25, 22, 'Bogotá Pádel Usaquén'], ['David Londoño', 'Medellín', 4, 1560, 22, 20, 'Pádel Club La 70'],
    ['Carolina Duque', 'Manizales', 4, 1480, 21, 23, 'Manizales Pádel'], ['Andrés Felipe Ruiz', 'Barranquilla', 5, 1290, 18, 22, 'Barranquilla Pádel'], ['Luisa Fernanda Gil', 'Cali', 5, 1150, 15, 21, 'Cali Pádel Club'],
    ['Martín Vélez', 'Medellín', 5, 1080, 14, 20, 'Pádel Club La 70'], ['Sofía Rendón', 'Bogotá', 6, 760, 8, 14, 'Cancha 93']
  ];
  await db.social_perfiles.bulkPut(NACIONAL.map(([nombre, ciudad, categoria, puntos_ranking, victorias, derrotas, club_base], k) => ({
    ...meta, user_id: `00000000-0000-4000-b200-${String(k + 1).padStart(12, '0')}`, nombre, color: ['#ff5b1f', '#1e7fd0', '#18895b', '#3346a8', '#e8475b'][k % 5], codigo: `demo2nac${k}`, usuario: nombre.toLowerCase().split(' ')[0] + k, buscable: true,
    categoria, puntos_ranking, victorias, derrotas, racha: [3, -1, 2, 5, -2, 1, 0, 4][k % 8], club_base, ciudad, avatar: null, foto: null
  })));
  // Récords de tu gente y de los del club
  const record: Record<string, [number, number, number]> = { [U]: [18, 11, 2], [P.juan]: [24, 12, 3], [P.caro]: [9, 10, -1], [P.andres]: [21, 13, -2], [P.vale]: [33, 9, 4], [P.pipe]: [6, 9, 0], [P.santi]: [26, 14, 1] };
  for (const [u, [v, d, r]] of Object.entries(record)) {
    const p = await db.social_perfiles.get(u);
    if (p) await db.social_perfiles.put({ ...p, victorias: v, derrotas: d, racha: r, puntos_ranking: p.puntos_ranking ?? 1000 + v * 15 });
  }
  for (const [k, o] of otros.entries()) await db.social_perfiles.put({ ...o, victorias: 8 + k * 2, derrotas: 6 + k, racha: k % 3 - 1 });

  // ── Resultados: uno que espera TU confirmación, uno en disputa (lo resuelve el club) y los ya válidos
  const res = (o: Record<string, unknown>) => ({ ...meta, id: id('r'), partido_id: null, torneo_id: null, club_id: CLUB_DEMO, oficial: false, puntos: null, motivo: null, resuelto_en: null, ...o });
  await db.social_resultados.bulkPut([
    res({ equipo_a: [P.andres, P.caro], equipo_b: [U, P.juan], sets: [[6, 4], [3, 6], [7, 6]], ganador: 'a', propuesto_por: P.andres, confirmaciones: { [P.andres]: 'si', [P.caro]: 'si', [P.juan]: 'si' }, estado: 'pendiente', created_at: ts(90) }),
    res({ equipo_a: [otros[0].user_id, otros[1].user_id], equipo_b: [otros[2].user_id, otros[3].user_id], sets: [[6, 3], [6, 4]], ganador: 'a', propuesto_por: otros[0].user_id, confirmaciones: { [otros[0].user_id]: 'si', [otros[1].user_id]: 'si', [otros[2].user_id]: 'no', [otros[3].user_id]: 'si' }, estado: 'disputado', motivo: 'El segundo set fue 6-4 para nosotros', created_at: ts(240) }),
    res({ equipo_a: [U, P.juan], equipo_b: [P.andres, P.vale], sets: [[6, 4], [6, 2]], ganador: 'a', propuesto_por: U, confirmaciones: { [U]: 'si', [P.juan]: 'si', [P.andres]: 'si', [P.vale]: 'si' }, estado: 'valido', puntos: { [U]: 19, [P.juan]: 19, [P.andres]: -19, [P.vale]: -19 }, resuelto_en: ts(6 * 1440), created_at: ts(6 * 1440 + 60) }),
    res({ equipo_a: [P.vale, P.caro], equipo_b: [U, P.juan], sets: [[6, 7], [6, 3], [6, 4]], ganador: 'a', propuesto_por: P.vale, confirmaciones: { [U]: 'si', [P.juan]: 'si', [P.vale]: 'si', [P.caro]: 'si' }, estado: 'valido', puntos: { [U]: -14, [P.juan]: -14, [P.vale]: 14, [P.caro]: 14 }, resuelto_en: ts(10 * 1440), created_at: ts(10 * 1440 + 60) })
  ]);

  // ── Modo crucero: dos cuentas abiertas en La 70 con pedidos cargados
  const cuentaMateo = id('u'), cuentaSara = id('u');
  await db.club_cuentas.bulkPut([
    { ...meta, id: cuentaMateo, club_id: CLUB_DEMO, user_id: otros[0].user_id, nombre: otros[0].nombre, codigo: tarjetaDerivada(otros[0].user_id), estado: 'abierta', tope: null, metodo: null, created_at: ts(160), cerrada_en: null },
    { ...meta, id: cuentaSara, club_id: CLUB_DEMO, user_id: otros[1].user_id, nombre: otros[1].nombre, codigo: tarjetaDerivada(otros[1].user_id), estado: 'abierta', tope: null, metodo: null, created_at: ts(100), cerrada_en: null }
  ]);
  await db.club_pedidos.bulkPut([
    ped({ numero: 98, cliente: otros[0].nombre, ubicacion: 'Cancha 2', cancha_id: CANCHAS[1].id, items: [item(1, 2)], estado: 'pagado', metodo: 'saldo', pagado_en: ts(155), mesero: 'Camilo', cuenta_id: cuentaMateo, created_at: ts(155), entregado_en: ts(150) }),
    ped({ numero: 99, cliente: otros[0].nombre, ubicacion: 'Terraza', cancha_id: null, items: [item(2, 3), item(6, 1)], estado: 'pagado', metodo: 'saldo', pagado_en: ts(60), mesero: 'Daniela', cuenta_id: cuentaMateo, created_at: ts(60), entregado_en: ts(52) }),
    ped({ numero: 100, cliente: otros[1].nombre, ubicacion: 'Barra', cancha_id: null, items: [item(4, 2)], estado: 'pagado', metodo: 'saldo', pagado_en: ts(95), mesero: 'Camilo', cuenta_id: cuentaSara, created_at: ts(95), entregado_en: ts(90) })
  ]);

  // ── Saldo Quilombo: recargas y lo que ya se pagó con saldo
  const mov = (user_id: string, monto: number, concepto: string, min: number, metodo: string | null = null) => ({ ...meta, id: id('w'), user_id, tipo: monto > 0 ? 'recarga' : 'pago', monto, concepto, ref: null, club_id: monto > 0 ? null : CLUB_DEMO, metodo, created_at: ts(min) });
  await db.social_billetera.bulkPut([
    mov(U, 200_000, 'Recarga con PSE', 3 * 1440, 'pse'),
    mov(U, -40_000, 'Cancha · Pádel Club La 70', 2 * 1440),
    mov(U, -18_000, 'Pedido · Pádel Club La 70', 2 * 1440 - 90),
    mov(P.juan, 150_000, 'Recarga con tarjeta', 5 * 1440, 'tarjeta'),
    mov(P.caro, 100_000, 'Recarga con Nequi', 4 * 1440, 'nequi'),
    mov(P.andres, 80_000, 'Recarga con PSE', 6 * 1440, 'pse'),
    mov(P.vale, 300_000, 'Recarga con tarjeta', 2 * 1440, 'tarjeta'),
    mov(otros[0].user_id, 100_000, 'Recarga con Nequi', 200, 'nequi'),
    mov(otros[0].user_id, -14_000, 'Pedido · Pádel Club La 70', 155),
    mov(otros[0].user_id, -36_000, 'Pedido · Pádel Club La 70', 60),
    mov(otros[1].user_id, 50_000, 'Recarga con PSE', 120, 'pse'),
    mov(otros[1].user_id, -20_000, 'Pedido · Pádel Club La 70', 95)
  ]);
  // Al club le entró lo que se pagó con saldo
  await db.club_pagos.bulkPut([[otros[0], 14_000, 155], [otros[0], 36_000, 60], [otros[1], 20_000, 95]].map(([o, monto, min]) => ({ ...meta, id: id('g'), club_id: CLUB_DEMO, concepto: 'bar', ref: null, monto, metodo: 'saldo', quien: (o as { nombre: string }).nombre, created_at: ts(min as number) })));

  // ── Profesores: su perfil y horarios de clase en La 70 y Envigado (la cancha queda apartada para la clase)
  const PROFES = [
    { nombre: 'Diego Salazar', usuario: 'profediego', categoria: 2, ciudad: 'Medellín', club_base: 'Pádel Club La 70', p: { bio: 'Ex jugador de la selección Antioquia. Clases para que le pierdas el miedo a la pared y mejores la bandeja.', especialidad: 'Técnica y bandeja', niveles: [7, 6, 5, 4], precio_individual: 120_000, precio_grupal: 50_000, clubes: [CLUB_DEMO], anos: 9, certificaciones: ['Instructor FEP nivel 2'], idiomas: ['Español'], estrellas: 4.9, resenas: 87, frase: 'La bandeja no se fuerza: se acompaña.', golpes: [{ nombre: 'Bandeja', nivel: 95 }, { nombre: 'Salida de pared', nivel: 92 }, { nombre: 'Volea', nivel: 84 }, { nombre: 'Globo', nivel: 78 }], metodo: ['Calentamiento y diagnóstico de tu juego', 'Técnica: un golpe a fondo, con canasta', 'Situaciones de partido en la red', 'Video corto y tarea para la semana'], logros: ['Selección Antioquia 2015–2019', 'Subcampeón Nacional de Clubes 2018'], alumnos_total: 340, clases_total: 1280 } },
    { nombre: 'Mónica Arias', usuario: 'monipadel', categoria: 1, ciudad: 'Medellín', club_base: 'Envigado Pádel', p: { bio: 'Campeona nacional 2024. Táctica de partido, posicionamiento y juego en red para 3ª y 4ª.', especialidad: 'Táctica y competencia', niveles: [4, 3, 2], precio_individual: 160_000, precio_grupal: 65_000, clubes: [CLUBES[1].id, CLUB_DEMO], anos: 12, certificaciones: ['Entrenadora Nacional', 'PTR Padel'], idiomas: ['Español', 'Inglés'], estrellas: 5, resenas: 54, frase: 'Los partidos se ganan con la cabeza.', golpes: [{ nombre: 'Táctica', nivel: 98 }, { nombre: 'Juego en red', nivel: 94 }, { nombre: 'Víbora', nivel: 90 }, { nombre: 'Remate', nivel: 85 }], metodo: ['Análisis de tu último partido', 'Patrones tácticos por zonas', 'Puntos jugados con consigna', 'Plan para tu próximo torneo'], logros: ['Campeona Nacional 2024', 'Top 3 ranking FCP femenino'], alumnos_total: 180, clases_total: 860 } },
    { nombre: 'Carla Benítez', usuario: 'carlab', categoria: 1, ciudad: 'Medellín', club_base: 'Pádel Club La 70', p: { bio: 'Argentina, 6 años en el circuito profesional. Clínicas grupales intensas y preparación física en cancha.', especialidad: 'Clínicas y físico', niveles: [5, 4, 3], precio_individual: 180_000, precio_grupal: 70_000, clubes: [CLUB_DEMO], anos: 15, certificaciones: ['Entrenadora APA'], idiomas: ['Español', 'Portugués'], estrellas: 4.8, resenas: 112, frase: 'Intensidad, pies y cabeza fría.', golpes: [{ nombre: 'Físico', nivel: 96 }, { nombre: 'Desplazamiento', nivel: 93 }, { nombre: 'Por 3', nivel: 88 }, { nombre: 'Remate', nivel: 86 }], metodo: ['Activación y pies', 'Bloques de golpes a ritmo alto', 'Juego dirigido 2 contra 2', 'Estiramiento y feedback'], logros: ['6 años en circuito APT', 'Campeona Argentina de menores'], alumnos_total: 520, clases_total: 2100 } },
    { nombre: 'Juanes Ortiz', usuario: 'juanesprofe', categoria: 2, ciudad: 'Bogotá', club_base: 'Cancha 93', p: { bio: 'Clases para empezar desde cero: agarre, golpes básicos y reglas. Paciencia infinita.', especialidad: 'Iniciación', niveles: [7, 6], precio_individual: 100_000, precio_grupal: 40_000, clubes: [CLUBES[3].id], anos: 5, certificaciones: ['Instructor FEP nivel 1'], idiomas: ['Español'], estrellas: 4.7, resenas: 39, frase: 'Nadie nace sabiendo: arrancamos juntos.', golpes: [{ nombre: 'Agarre y básicos', nivel: 95 }, { nombre: 'Derecha y revés', nivel: 85 }, { nombre: 'Reglas y saque', nivel: 90 }, { nombre: 'Pared', nivel: 70 }], metodo: ['Agarre y posición', 'Golpes básicos con canasta', 'Peloteo y primeras paredes', 'Mini partido con reglas'], logros: ['+150 jugadores que arrancaron de cero'], alumnos_total: 210, clases_total: 640 } }
  ];
  const profeIds = PROFES.map((_, k) => `00000000-0000-4000-b300-${String(k + 1).padStart(12, '0')}`);
  await db.social_perfiles.bulkPut(PROFES.map((x, k) => ({ ...meta, user_id: profeIds[k], nombre: x.nombre, color: '#3346a8', codigo: `demo3prof${k}`, usuario: x.usuario, buscable: true, categoria: x.categoria, puntos_ranking: 0, club_base: x.club_base, ciudad: x.ciudad, avatar: null, foto: null, profesor: true })));
  await db.social_profesores.bulkPut(PROFES.map((x, k) => ({ ...meta, user_id: profeIds[k], ...x.p })));
  // Horarios: en las canchas libres de los próximos días, en la mañana y al final de la tarde
  const libresDe = (club: string) => franjas.filter((f) => f.estado === 'libre' && CANCHAS.some((c) => c.id === f.cancha_id && c.club_id === club) && Date.parse(f.inicio as string) > Date.now() + 3 * 3_600_000);
  const tomadas = new Set<unknown>();
  const clasesSeed: Record<string, unknown>[] = [];
  const abrir = (profe: number, club: string, horaMin: number, tipo: 'individual' | 'grupal', alumnos: string[] = [], cuantas = 4) => {
    const precio = tipo === 'individual' ? PROFES[profe].p.precio_individual : PROFES[profe].p.precio_grupal;
    const opciones = libresDe(club).filter((f) => !tomadas.has(f.id) && new Date(Date.parse(f.inicio as string) - 5 * 3_600_000).getUTCHours() * 60 + new Date(Date.parse(f.inicio as string) - 5 * 3_600_000).getUTCMinutes() === horaMin);
    for (const f of opciones.filter((_, k) => k % 2 === 0).slice(0, cuantas)) {
      tomadas.add(f.id);
      const cupos = tipo === 'individual' ? 1 : 4;
      Object.assign(f, { estado: alumnos.length >= cupos ? 'pagada' : 'apartada', cliente: `Clase · ${PROFES[profe].nombre}`, origen: 'app', nota: alumnos.length ? `Alumnos: ${alumnos.length}` : 'Clase disponible' });
      clasesSeed.push({ ...meta, id: id('x'), profesor: profeIds[profe], club_id: club, franja_id: f.id, inicio: f.inicio, fin: f.fin, tipo, cupos, precio, alumnos, estado: alumnos.length >= cupos ? 'llena' : 'abierta', nota: tipo === 'grupal' ? 'Traer pala; pelotas las pongo yo' : null, created_at: ts(3000) });
      alumnos = [];
    }
  };
  abrir(0, CLUB_DEMO, 450, 'individual');
  abrir(0, CLUB_DEMO, 990, 'grupal', [otros[4].user_id, otros[5].user_id]);
  abrir(1, CLUBES[1].id, 540, 'individual');
  abrir(1, CLUB_DEMO, 1170, 'grupal', [P.caro]);
  abrir(2, CLUB_DEMO, 630, 'grupal', [otros[6].user_id, otros[7].user_id, otros[2].user_id]);
  abrir(2, CLUB_DEMO, 360, 'individual');
  abrir(3, CLUBES[3].id, 1080, 'grupal');
  await db.social_franjas.bulkPut(franjas.filter((f) => tomadas.has(f.id)));
  await db.social_clases.bulkPut(clasesSeed);
  const opinan = [[0, P.juan, 5, 'Me arregló la bandeja en dos clases. Crack.'], [0, otros[3].user_id, 5, 'Paciente y muy claro.'], [1, P.vale, 5, 'Te cambia la forma de leer el partido.'], [2, P.caro, 4, 'Exigente, sales muerto pero vale la pena 💪'], [3, P.andres, 5, 'Ideal si estás empezando.']] as const;
  await db.social_resenas_clase.bulkPut(opinan.map(([k, alumno, estrellas, texto], j) => ({ ...meta, id: id('y'), profesor: profeIds[k], alumno, estrellas, texto, created_at: ts(1440 * (j + 2)) })));
}
