<script lang="ts">
  // Cabecera de las pantallas secundarias (diseño nuevo): botón circular de volver + título condensado de 26 px.
  // Sobre portadas de color (torneo) va en blanco con el botón translúcido.
  import type { Snippet } from 'svelte';
  import { f7 } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';

  let { titulo = '', sobreColor = false, extra }: { titulo?: string; sobreColor?: boolean; extra?: Snippet } = $props();
  function volver() {
    toque(4);
    f7.views.get('#view-' + ui.tab)?.router.back();
  }
</script>

<div class="cabecera" class:sobre-color={sobreColor}>
  <button class="volver" aria-label="Volver" onclick={volver}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>
  </button>
  {#if titulo}<h1 class="tit">{titulo}</h1>{/if}
  {#if extra}{@render extra()}{/if}
</div>

<style>
  .cabecera { position: relative; display: flex; align-items: center; gap: 12px; padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px; }
  .volver { width: 40px; height: 40px; flex: none; border: 0; border-radius: 20px; background: var(--q-sub); color: var(--q-tx); display: flex; align-items: center; justify-content: center; padding: 0; }
  .volver:active { transform: scale(0.94); }
  .tit { margin: 0; min-width: 0; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; line-height: 1; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sobre-color { color: #fff; }
  .sobre-color .volver { background: rgba(255, 255, 255, 0.18); color: #fff; }
</style>
