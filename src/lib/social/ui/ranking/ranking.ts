// Lecturas del ranking nacional y los bots de la demo (los demás jugadores son de mentira: confirman solos).
import { datos } from '$lib/data/datos.svelte';
import { E2E } from '$lib/app/sesion.svelte';
import { tablaRanking, faltanPorConfirmar, type PerfilRanking, type Resultado } from '../../domain/ranking';
import { confirmarResultado } from '../../app/resultados';
import { yo } from '../../app/vinculos';

export const perfilesRanking = () => datos.perfiles as PerfilRanking[];
/** Mi puesto en el ranking nacional (o en el filtro dado) */
export function posicionDe(uid: string, f: { categoria?: number | null; ciudad?: string | null } = {}) {
  return tablaRanking(perfilesRanking(), f).find((x) => x.perfil.user_id === uid) ?? null;
}

/**
 * Demo: después de proponer, cada uno de los otros jugadores confirma solo (uno cada 3–5 s), para ver el resultado
 * pasar a válido. Si se apaga, la confirmación la hace otro iPhone usando la demo como esa persona.
 */
export function botsConfirman(id: string, r: Pick<Resultado, 'equipo_a' | 'equipo_b'>) {
  if (!E2E) return;
  const otros = [...r.equipo_a, ...r.equipo_b].filter((u) => u !== yo());
  otros.forEach((u, k) => {
    setTimeout(() => {
      const actual = (datos.resultados as Resultado[]).find((x) => x.id === id);
      if (actual && actual.estado === 'pendiente' && faltanPorConfirmar(actual).includes(u)) void confirmarResultado(id, 'si', null, u);
    }, 3000 + k * 1600 + Math.round(Math.random() * 600));
  });
}
