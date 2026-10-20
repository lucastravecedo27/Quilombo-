// Pantallas del jugador a las que la sala de demo puede saltar (Sala.svelte → postMessage → aquí).
import { f7 } from 'framework7-svelte';
import { datos } from '$lib/data/datos.svelte';
import { ui, PESTANAS, type TabId } from './ui.svelte';
import { misPartidos, misReservas, torneos } from '$lib/social/app/jugar';
import { misResultados, porConfirmar } from '$lib/social/app/resultados';
import { conversaciones, yo } from '$lib/social/app/vinculos';
import { CLUB_DEMO } from '$lib/club/domain/club';

const DIEGO = '00000000-0000-4000-b300-000000000001';
const JUAN = '00000000-0000-4000-b000-000000000001';

/** Deja la pestaña en su pantalla de inicio (sin hojas ni la tarjeta encima) */
function limpiar(tab: TabId) {
  ui.tarjeta = false;
  try { f7.sheet.close(); } catch { /* sin hojas */ }
  const url = PESTANAS.find((p) => p.id === tab)!.url;
  const v = f7.views.get('#view-' + tab);
  if (v && v.router.history.length > 1) v.router.navigate(url, { reloadAll: true, animate: false });
  ui.tab = tab;
  f7.tab.show('#view-' + tab);
}
function abrir(tab: TabId, ruta?: string | null) {
  limpiar(tab);
  if (ruta) setTimeout(() => f7.views.get('#view-' + tab)?.router.navigate(ruta), 60);
}

export function irEnJugador(destino: string) {
  switch (destino) {
    case 'social': case 'jugar': case 'chat': case 'perfil': return abrir(destino);
    case 'tarjeta': limpiar(ui.tab); ui.tarjeta = true; return;
    case 'saldo': return abrir('jugar', '/saldo/');
    case 'clases': return abrir('jugar', '/clases/');
    case 'profesor': return abrir('jugar', `/profesor/${DIEGO}/`);
    // Modo profesor (el marco del profe): su perfil con la agenda, abrir un horario y cómo lo ven los alumnos
    case 'abrir-horario': abrir('perfil'); setTimeout(() => (ui.abrirHorario = {}), 150); return;
    case 'perfil-publico': return abrir('perfil', `/profesor/${yo()}/`);
    case 'calendario': return abrir('perfil', '/calendario/');
    case 'ranking': return abrir('social', '/ranking/');
    case 'gente': return abrir('social', '/gente/');
    case 'buscar': return abrir('social', '/buscar/');
    case 'amigo': return abrir('social', `/persona/${JUAN}/`);
    case 'resultado': {
      const r = porConfirmar()[0] ?? misResultados()[0];
      return abrir('social', r ? `/resultado/${r.id}/` : '/ranking/');
    }
    case 'partido': {
      const p = misReservas()[0] ?? misPartidos()[0];
      return abrir('jugar', p ? `/partido/${p.id}/` : null);
    }
    case 'torneo': {
      const t = torneos().find((x) => x.club_id === CLUB_DEMO) ?? torneos()[0];
      return abrir('jugar', t ? `/torneo/${t.id}/` : null);
    }
    case 'conversacion': {
      const c = conversaciones()[0];
      return abrir('chat', c ? `/chat/r/${c.id}/` : null);
    }
    case 'reservar': {
      abrir('jugar');
      const ids = new Set((datos.canchas as { id: string; club_id: string }[]).filter((c) => c.club_id === CLUB_DEMO).map((c) => c.id));
      const f = (datos.franjas as { id: string; cancha_id: string; estado: string; inicio: string }[]).find((x) => ids.has(x.cancha_id) && x.estado === 'libre' && Date.parse(x.inicio) > Date.now());
      if (f) setTimeout(() => (ui.reservar = { franja: f.id }), 120);
      return;
    }
  }
}
