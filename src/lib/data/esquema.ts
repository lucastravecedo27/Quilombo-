// Tablas del módulo social que se traen del servidor a la base local (supabase/migrations/*_social_*.sql).
// Todo cambia por funciones del servidor (las dos personas ven lo mismo): el cliente solo trae, nunca empuja filas.
export const TABLAS = [
  'social_perfiles', 'social_relaciones', 'social_eventos', 'social_reacciones', 'social_mensajes',
  'social_publicaciones', 'social_comentarios', 'social_bloqueos', 'social_cobros',
  // Jugar: clubes y canchas (catálogo), partidos (citas), torneos e inscripciones. Las franjas se piden por ciudad y día.
  'social_clubes', 'social_canchas', 'social_partidos', 'social_partido_respuestas', 'social_torneos', 'social_inscripciones'
] as const;
export type Tabla = (typeof TABLAS)[number];

/** Clave primaria (los perfiles usan user_id) */
export const CLAVE: Partial<Record<Tabla, string>> = { social_perfiles: 'user_id' };

/**
 * Tablas que se traen completas en cada sincronización (pocas filas): lo que puedo ver de ellas cambia sin que la fila
 * cambie. Ej.: el perfil de alguien con quien me acabo de conectar no tiene un updated_at nuevo.
 */
export const TRAER_COMPLETAS = new Set<Tabla>(['social_perfiles']);
