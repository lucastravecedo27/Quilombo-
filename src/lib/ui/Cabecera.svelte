<script lang="ts">
  // Cabecera de las pantallas secundarias: botón circular de volver (40 px) y título de 26 px. Sobre fondo oscuro
  // (la Tarjeta) el botón va translúcido.
  import Icon from './Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from './tema.svelte';

  let { titulo, oscuro = false, alVolver }: { titulo: string; oscuro?: boolean; alVolver?: () => void } = $props();
</script>

<div class="cab" class:oscuro>
  <button class="q-volver" aria-label="Volver" onclick={() => { toque(4); (alVolver ?? (() => ui.volver()))(); }}><Icon name="atras" size={20} stroke={2.2} /></button>
  <b class="tit">{titulo}</b>
</div>

<style>
  .cab { display: flex; align-items: center; gap: 12px; padding: calc(env(safe-area-inset-top, 0px) + 10px) 16px 14px; }
  .tit { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; text-transform: uppercase; line-height: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .oscuro { color: #fff; }
  .oscuro .q-volver { background: rgba(255, 255, 255, 0.1); color: #fff; }
</style>
