// La red social de Quilombo: gestos, reacciones, tipos de evento del feed y "nuestra historia" con un jugador.
// Funciones puras (sin red ni base local): las usan las pantallas y las pruebas.

// ───────── Gestos (un toque a alguien de tu gente) ─────────
export type Gesto = 'jugamos' | 'nivel' | 'fuerza' | 'gracias' | 'crack' | 'pola';
export const GESTOS: { id: Gesto; emoji: string; nombre: string; color: string }[] = [
  { id: 'jugamos', emoji: '🎾', nombre: '¿Jugamos?', color: '#ff5b1f' },
  { id: 'nivel', emoji: '🔥', nombre: 'Qué nivel', color: '#c2410c' },
  { id: 'fuerza', emoji: '💪', nombre: 'Fuerza', color: '#1e7fd0' },
  { id: 'gracias', emoji: '🙏', nombre: 'Gracias', color: '#3346a8' },
  { id: 'crack', emoji: '🏆', nombre: '¡Crack!', color: '#b98500' },
  { id: 'pola', emoji: '🍻', nombre: 'Una pola', color: '#18895b' }
];
export const emojiGesto = (g: string | null | undefined) => GESTOS.find((x) => x.id === g)?.emoji ?? '💛';

// ───────── Reacciones (las 7 que acepta el servidor) ─────────
export const REACCIONES: { id: string; emoji: string; nombre: string }[] = [
  { id: 'amor', emoji: '❤️', nombre: 'Amor' },
  { id: 'fuego', emoji: '🔥', nombre: 'Qué nivel' },
  { id: 'crack', emoji: '🏆', nombre: '¡Crack!' },
  { id: 'bandeja', emoji: '🎾', nombre: 'Bandeja' },
  { id: 'jaja', emoji: '😂', nombre: 'Jajaja' },
  { id: 'aplauso', emoji: '👏', nombre: 'Aplausos' },
  { id: 'paila', emoji: '😬', nombre: 'Paila' }
];

// ───────── Eventos del feed ─────────
/** Lo que pasa en la red. Los cuatro de pádel son los que alimentan el feed; los otros vienen del chat y los cobros. */
export type TipoEvento = 'foto' | 'resultado_partido' | 'subio_ranking' | 'torneo' | 'partido' | 'relacion' | 'saludo' | 'cobro' | 'pago';
export const ESTILO_EVENTO: Record<TipoEvento, { emoji: string; color: string; nombre: string }> = {
  foto: { emoji: '📸', color: 'var(--q-fiesta-rosa)', nombre: 'Foto' },
  resultado_partido: { emoji: '🎾', color: 'var(--q-fiesta-lima)', nombre: 'Resultado' },
  subio_ranking: { emoji: '📈', color: 'var(--q-fiesta-amarillo)', nombre: 'Ranking' },
  torneo: { emoji: '🏆', color: 'var(--q-fiesta-naranja)', nombre: 'Torneo' },
  partido: { emoji: '📅', color: 'var(--q-fiesta-cielo)', nombre: 'Partido' },
  relacion: { emoji: '🤝', color: 'var(--q-fiesta-cielo)', nombre: 'Conexión' },
  saludo: { emoji: '💛', color: 'var(--q-fiesta-rosa)', nombre: 'Gesto' },
  cobro: { emoji: '➗', color: 'var(--q-fiesta-naranja)', nombre: 'Cancha dividida' },
  pago: { emoji: '💸', color: 'var(--q-fiesta-lima)', nombre: 'Pago' }
};
export const estiloEvento = (tipo: string, gesto?: string | null) =>
  tipo === 'saludo' ? { ...ESTILO_EVENTO.saludo, emoji: emojiGesto(gesto) } : ESTILO_EVENTO[tipo as TipoEvento] ?? { emoji: '💬', color: 'var(--q-sub)', nombre: 'Actividad' };
/** Los eventos que van en la parte "Partidos" del feed */
export const DE_PADEL = new Set<string>(['resultado_partido', 'subio_ranking', 'torneo', 'partido']);

export interface EventoMuro { id: string; actor: string; participantes: string[]; tipo: string; texto: string; ref: string | null; gesto?: string | null; created_at: string }

// ───────── Publicaciones ─────────
/** Marcador de un partido: sets como [6,4] desde el lado de quien publica */
export interface Marcador { sets: [number, number][]; companero?: string | null; rivales?: string[]; club?: string | null }
export interface Publicacion {
  id: string; autor: string; tipo: 'foto' | 'resultado_partido' | 'torneo'; texto: string | null;
  fotos: { path: string }[]; marcador?: Marcador | null; con: string[]; audiencia: string[];
  ciudad?: string | null; club?: string | null; created_at: string; deleted_at?: string | null;
}
/** "6-4 · 3-6 · 7-5" */
export const textoMarcador = (m: Marcador | null | undefined) => (m?.sets?.length ? m.sets.map(([a, b]) => `${a}-${b}`).join(' · ') : '');
/** ¿Ganó quien publica? (más sets ganados) */
export function gano(m: Marcador | null | undefined): boolean | null {
  if (!m?.sets?.length) return null;
  const mios = m.sets.filter(([a, b]) => a > b).length;
  const suyos = m.sets.filter(([a, b]) => b > a).length;
  return mios === suyos ? null : mios > suyos;
}
/** Valida un set de pádel: a 6 con diferencia de 2, 7-5 o 7-6 (tie-break) */
export function setValido([a, b]: [number, number]): boolean {
  const [g, p] = a >= b ? [a, b] : [b, a];
  return Number.isInteger(a) && Number.isInteger(b) && p >= 0 && ((g === 6 && p <= 4) || (g === 7 && (p === 5 || p === 6)));
}

// ───────── Nuestra historia (con una persona) ─────────
export function historia(yo: string, otro: string, o: {
  desde: string | null; eventos: EventoMuro[]; cobros: { acreedor: string; deudor: string; estado: string }[];
  publicaciones: Pick<Publicacion, 'autor' | 'con' | 'tipo' | 'marcador'>[];
}) {
  const ambos = (p: string[]) => p.includes(yo) && p.includes(otro);
  const momentos = o.eventos.filter((e) => ambos(e.participantes)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const entre = o.cobros.filter((c) => (c.acreedor === yo && c.deudor === otro) || (c.acreedor === otro && c.deudor === yo));
  const gestos = momentos.filter((e) => e.tipo === 'saludo' && e.participantes.length === 2);
  const conteo = new Map<string, number>();
  for (const g of gestos) if (g.gesto) conteo.set(g.gesto, (conteo.get(g.gesto) ?? 0) + 1);
  const favorito = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const juntos = o.publicaciones.filter((p) => p.tipo === 'resultado_partido' && [p.autor, ...(p.con ?? [])].includes(yo) && [p.autor, ...(p.con ?? [])].includes(otro));
  const dias = o.desde ? Math.max(0, Math.floor((Date.now() - new Date(o.desde).getTime()) / 86_400_000)) : null;
  return {
    momentos,
    dias,
    partidos: juntos.length,
    canchas: entre.length,
    saldadas: entre.filter((c) => c.estado === 'pagado').length,
    abiertas: entre.filter((c) => c.estado === 'pendiente' || c.estado === 'avisado').length,
    gestosEnviados: gestos.filter((g) => g.actor === yo).length,
    gestosRecibidos: gestos.filter((g) => g.actor === otro).length,
    gestoFavorito: favorito
  };
}
/** "Juegan juntos desde hace 2 años y 3 meses" */
export function textoAntiguedad(dias: number | null): string {
  if (dias === null) return '';
  if (dias < 1) return 'Conectados desde hoy';
  if (dias < 31) return `Conectados hace ${dias} día${dias === 1 ? '' : 's'}`;
  const meses = Math.floor(dias / 30.44);
  if (meses < 12) return `Conectados hace ${meses} mes${meses === 1 ? '' : 'es'}`;
  const anios = Math.floor(meses / 12), resto = meses % 12;
  return `Conectados hace ${anios} año${anios === 1 ? '' : 's'}${resto ? ` y ${resto} mes${resto === 1 ? '' : 'es'}` : ''}`;
}

/** Minúsculas, sin tildes ni signos, espacios simples (búsquedas) */
export function clave(t: string): string {
  return t.toLowerCase().replace(/[áéíóúüñ]/g, (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' })[c]!)
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
