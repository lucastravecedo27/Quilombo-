// Profesores y clases: cada profesor tiene su perfil (bio, especialidad, niveles que enseña, precios, clubes donde da
// clase) y publica horarios. Los jugadores eligen el profesor que quieran y reservan una clase: se paga con saldo
// Quilombo y la cancha queda reservada en el club a nombre de la clase.

export interface Profesor {
  user_id: string;
  bio: string;
  especialidad: string;
  /** Categorías que enseña (1ª–6ª, o "iniciación" = 7) */
  niveles: number[];
  precio_individual: number;
  precio_grupal: number;
  clubes: string[];
  anos: number;
  certificaciones: string[];
  idiomas: string[];
  estrellas: number;
  resenas: number;
  /** Ficha de entrenador (opcional): frase, golpes que domina (0–100), cómo es una clase, logros y trayectoria */
  frase?: string;
  golpes?: { nombre: string; nivel: number }[];
  metodo?: string[];
  logros?: string[];
  alumnos_total?: number;
  clases_total?: number;
}

export type TipoClase = 'individual' | 'grupal';
/** Un horario que el profesor ofrece: libre → reservada (individual, o grupal con cupos) */
export interface Clase {
  id: string; profesor: string; club_id: string; franja_id: string | null;
  inicio: string; fin: string; tipo: TipoClase; cupos: number;
  precio: number; alumnos: string[]; estado: 'abierta' | 'llena' | 'cancelada' | 'dada';
  nota: string | null; created_at: string;
}
export interface ResenaClase { id: string; profesor: string; alumno: string; estrellas: number; texto: string | null; created_at: string }

export const NIVEL_INICIACION = 7;
export const textoNivel = (n: number) => (n === NIVEL_INICIACION ? 'Iniciación' : `${n}ª`);
export const textoNiveles = (ns: number[]) => [...ns].sort((a, b) => b - a).map(textoNivel).join(' · ');
export const quedan = (c: Pick<Clase, 'cupos' | 'alumnos'>) => Math.max(0, c.cupos - c.alumnos.length);
/** ¿Puedo reservar esta clase? */
export function puedoReservar(c: Clase, uid: string, ahora = Date.now()): { ok: boolean; motivo?: string } {
  if (c.profesor === uid) return { ok: false, motivo: 'Es tu clase' };
  if (c.alumnos.includes(uid)) return { ok: false, motivo: 'Ya la reservaste' };
  if (c.estado !== 'abierta' || quedan(c) === 0) return { ok: false, motivo: 'Sin cupos' };
  if (Date.parse(c.inicio) < ahora) return { ok: false, motivo: 'Ya pasó' };
  return { ok: true };
}
/** El precio por alumno de una clase grupal se reparte; la individual es completa */
export const precioPorAlumno = (c: Pick<Clase, 'tipo' | 'precio'>) => c.precio;
/** Promedio de estrellas con las reseñas nuevas */
export function promedioEstrellas(base: number, n: number, nuevas: number[]): { estrellas: number; resenas: number } {
  const total = base * n + nuevas.reduce((s, x) => s + x, 0);
  const m = n + nuevas.length;
  return { estrellas: m ? Math.round((total / m) * 10) / 10 : 0, resenas: m };
}
