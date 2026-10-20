// Relaciones entre jugadores: tipos, cómo se ve cada relación desde cada lado y grupos del mapa de "Tu gente".
// El tipo lo dice quien propone: "user_b es mi <tipo>". Los tres tipos son simétricos (rival ↔ rival).

export type TipoVinculo = 'amigo' | 'pareja_juego' | 'rival';
/** En el mapa cada tipo es su propio grupo */
export type Grupo = TipoVinculo;

export interface DefTipo {
  id: TipoVinculo;
  nombre: string; // cómo llamo a la otra persona
  inverso: string; // cómo me llama ella
  icono: string;
  color: string;
  desbloquea: string[];
  privacidad: string;
}

export const TIPOS: DefTipo[] = [
  { id: 'amigo', nombre: 'Amigo(a)', inverso: 'Amigo(a)', icono: 'personas', color: 'var(--q-fiesta-lima)', desbloquea: ['Chat, fotos y notas de voz', 'Sus fotos y resultados en tu feed', 'Dividir la cancha'], privacidad: 'Ven tu perfil de jugador y lo que publicas.' },
  { id: 'pareja_juego', nombre: 'Pareja de juego', inverso: 'Pareja de juego', icono: 'corazon', color: 'var(--q-fiesta-cielo)', desbloquea: ['Su historial juntos', 'Dividir la cancha 50/50', 'Avisos de torneos'], privacidad: 'Ven tu perfil de jugador y lo que publicas.' },
  { id: 'rival', nombre: 'Rival', inverso: 'Rival', icono: 'estrella', color: 'var(--q-fiesta-naranja)', desbloquea: ['El pique: sus resultados y su ranking', 'Retos por chat', 'Chicanear con respeto 😅'], privacidad: 'Ven tu perfil de jugador y lo que publicas.' }
];
export const tipo = (id: string): DefTipo => TIPOS.find((t) => t.id === id) ?? TIPOS[0];

export const GRUPOS: { id: Grupo; nombre: string; color: string }[] = [
  { id: 'pareja_juego', nombre: 'Parejas', color: 'var(--q-fiesta-cielo)' },
  { id: 'amigo', nombre: 'Amigos', color: 'var(--q-fiesta-lima)' },
  { id: 'rival', nombre: 'Rivales', color: 'var(--q-fiesta-naranja)' }
];

export interface Vinculo { id: string; user_a: string; user_b: string; tipo: string; etiqueta: string | null; estado: string; verificada: boolean; created_at?: string }

/** La otra persona de la relación, vista desde mí */
export const otroDe = (v: Vinculo, yo: string) => (v.user_a === yo ? v.user_b : v.user_a);

/** Cómo llamo a la otra persona en esta relación (o la etiqueta propia, p. ej. "Mi drive") */
export function etiquetaPara(v: Vinculo, yo: string): string {
  const t = tipo(v.tipo);
  if (v.user_a === yo) return v.etiqueta?.trim() || t.nombre;
  return t.inverso;
}

export const grupoDe = (v: Vinculo): Grupo => tipo(v.tipo).id;

/** Solicitudes que me llegaron (me toca responder) y las que envié */
export const recibidas = (vs: Vinculo[], yo: string) => vs.filter((v) => v.estado === 'pendiente' && v.user_b === yo);
export const enviadas = (vs: Vinculo[], yo: string) => vs.filter((v) => v.estado === 'pendiente' && v.user_a === yo);
export const activas = (vs: Vinculo[]) => vs.filter((v) => v.estado === 'activa');

/** Código de 10 caracteres que viene en un QR o link (?amigo=código) */
export function codigoAmigo(texto: string): string | null {
  const t = texto.trim();
  try {
    const u = new URL(t);
    const c = u.searchParams.get('amigo');
    return c && /^[a-z0-9]{10}$/.test(c.toLowerCase()) ? c.toLowerCase() : null;
  } catch {
    return /^[a-z0-9]{10}$/i.test(t) ? t.toLowerCase() : null;
  }
}

/** Reparte un total en pesos entre n personas, redondeado a cientos; lo que sobra va a los primeros */
export function repartirIgual(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n / 100) * 100;
  let resto = total - base * n;
  return Array.from({ length: n }, (_, i) => {
    const extra = i === n - 1 ? resto : Math.min(resto, 100);
    resto -= extra;
    return base + extra;
  });
}
