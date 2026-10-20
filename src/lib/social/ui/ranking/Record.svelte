<script lang="ts">
  // El récord de un jugador: victorias–derrotas y % (con la barra verde/roja) y sus últimos resultados (los que ya
  // valen y los que esperan confirmación). Las cifras grandes (puntos, puesto, racha) van en la tarjeta del jugador.
  import FilaResultado from './FilaResultado.svelte';
  import { misResultados } from '../../app/resultados';
  import type { PerfilRanking } from '../../domain/ranking';

  let { perfil, max = 4 }: { perfil: PerfilRanking | null | undefined; max?: number } = $props();
  const uid = $derived(perfil?.user_id ?? '');
  const v = $derived(perfil?.victorias ?? 0);
  const d = $derived(perfil?.derrotas ?? 0);
  const pct = $derived(v + d ? Math.round((v / (v + d)) * 100) : 0);
  const ultimos = $derived(uid ? misResultados(uid).filter((r) => r.estado !== 'anulado').slice(0, max) : []);
</script>

<div class="record">
  <div class="cab"><b>Récord</b><small>{v}–{d} · {pct}%</small></div>
  <div class="barra" aria-label="{pct}% de victorias"><i style="width:{pct}%"></i></div>
  {#if ultimos.length}
    <div class="ultimos">{#each ultimos as r (r.id)}<FilaResultado {r} {uid} compacta />{/each}</div>
  {/if}
</div>

<style>
  .record { margin: 12px 16px 0; padding: 14px 16px; border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); color: var(--q-tx); display: flex; flex-direction: column; gap: 10px; font-family: var(--q-font); }
  .cab { display: flex; justify-content: space-between; align-items: baseline; }
  .cab b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 800; font-size: 20px; text-transform: uppercase; }
  .cab small { font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .barra { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: var(--q-rojo); }
  .barra i { background: var(--q-ok); }
  .ultimos { display: flex; flex-direction: column; }
</style>
