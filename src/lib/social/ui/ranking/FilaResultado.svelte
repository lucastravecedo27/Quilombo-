<script lang="ts">
  // Un resultado en una línea: G/P (o · si aún no vale), contra quiénes, el marcador y, si ya vale, los puntos.
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { nombreDe, yo as miUid } from '../../app/vinculos';
  import { ganoUid, type Resultado } from '../../domain/ranking';

  /** compacta: dentro del récord (sin márgenes laterales, con línea arriba) */
  let { r, uid, compacta = false }: { r: Resultado; uid: string; compacta?: boolean } = $props();
  const corto = (u: string) => (u === miUid() ? 'Tú' : nombreDe(u).split(' ')[0]);
  const mio = $derived(r.equipo_a.includes(uid) ? 'a' : 'b');
  const ellos = $derived(mio === 'a' ? r.equipo_b : r.equipo_a);
  const marcador = $derived(r.sets.map(([a, b]) => (mio === 'a' ? `${a}-${b}` : `${b}-${a}`)).join(' '));
  const gane = $derived(ganoUid(r, uid));
  const pts = $derived(r.puntos?.[uid] ?? null);
  const ESTADO: Record<string, string> = { pendiente: 'Falta confirmar', disputado: 'En disputa', anulado: 'Anulado' };
</script>

<button class="fila-res" class:compacta onclick={() => { toque(); ui.navegar(`/resultado/${r.id}/`); }}>
  <b class="gp" class:g={r.estado === 'valido' && gane} class:p={r.estado === 'valido' && !gane}>{r.estado === 'valido' ? (gane ? 'G' : 'P') : '⏳'}</b>
  <span class="vs">vs {ellos.map(corto).join(' · ')}{#if r.estado !== 'valido'}<small class="espera">{ESTADO[r.estado]}</small>{:else if pts !== null}<small class:neg={pts < 0}>{pts > 0 ? '+' : ''}{pts} pts{r.oficial ? ' · oficial' : ''}</small>{/if}</span>
  <span class="sets">{marcador}</span>
</button>

<style>
  .fila-res { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; border: 0; background: var(--q-card); color: var(--q-tx); text-align: left; font-family: var(--q-font); }
  .fila-res.compacta { padding: 8px 0; border-top: 1px solid var(--q-line); background: none; }
  .gp { width: 26px; height: 26px; flex: none; border-radius: 7px; background: var(--q-sub); color: var(--q-tx2); font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
  .gp.g { background: var(--q-ok); color: #fff; }
  .gp.p { background: var(--q-rojo); color: #fff; }
  .vs { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; }
  .vs small { font-size: 12px; font-weight: 800; color: var(--q-ok); }
  .vs small.neg { color: var(--q-rojo); }
  .vs small.espera { color: var(--q-wrn); }
  .sets { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 19px; white-space: nowrap; }
</style>
