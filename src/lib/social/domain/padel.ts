// El jugador de pádel en su perfil: categoría (1ª a 6ª, como en los torneos de Colombia), puntos de ranking,
// club base y ciudad. Funciones puras: las usan las pantallas y las pruebas.

export type Categoria = 1 | 2 | 3 | 4 | 5 | 6;
export const CATEGORIAS: { id: Categoria; nombre: string; nivel: string }[] = [
  { id: 1, nombre: '1ª', nivel: 'Élite' },
  { id: 2, nombre: '2ª', nivel: 'Avanzado alto' },
  { id: 3, nombre: '3ª', nivel: 'Avanzado' },
  { id: 4, nombre: '4ª', nivel: 'Intermedio' },
  { id: 5, nombre: '5ª', nivel: 'Intermedio bajo' },
  { id: 6, nombre: '6ª', nivel: 'Iniciación' }
];
export const esCategoria = (n: unknown): n is Categoria => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 6;
/** "4ª categoría" o null si no la ha puesto */
export const textoCategoria = (n: number | null | undefined) => (esCategoria(n) ? `${CATEGORIAS[n - 1].nombre} categoría` : null);

/** Ciudades con más pádel en Colombia (sugerencias; se puede escribir cualquier otra) */
export const CIUDADES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Cúcuta'];

/** "1.250 pts" */
export const textoPuntos = (p: number | null | undefined) => (p == null ? null : `${p.toLocaleString('es-CO')} pts`);

export interface PerfilPadel { categoria?: number | null; puntos_ranking?: number | null; club_base?: string | null; ciudad?: string | null }
/** Línea corta para debajo del nombre: "4ª · Club La Raqueta · Medellín" */
export function lineaJugador(p: PerfilPadel | undefined): string {
  if (!p) return '';
  return [esCategoria(p.categoria) ? CATEGORIAS[p.categoria - 1].nombre : null, p.club_base?.trim() || null, p.ciudad?.trim() || null].filter(Boolean).join(' · ');
}
