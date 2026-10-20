<script lang="ts">
  // La Tarjeta Quilombo a pantalla completa, encima de cualquier pestaña (botón Q del centro de la barra).
  // La barra de pestañas sigue visible; tocar una pestaña o volver la cierra.
  import { ui } from '$lib/app/ui.svelte';
  import { registrarAtras } from '$lib/app/atras';
  import Cabecera from '$lib/ui/Cabecera.svelte';
  import TarjetaQuilombo from './TarjetaQuilombo.svelte';

  $effect(() => {
    if (!ui.tarjeta) return;
    return registrarAtras(() => (ui.tarjeta = false));
  });
</script>

{#if ui.tarjeta}
  <div class="ov" role="dialog" aria-modal="false" aria-label="Tu tarjeta Quilombo">
    <Cabecera titulo="Tu tarjeta" oscuro alVolver={() => (ui.tarjeta = false)} />
    <TarjetaQuilombo irASaldo={() => { ui.tarjeta = false; ui.irA('jugar', '/saldo/'); }} />
    <div class="q-espacio-tabbar"></div>
  </div>
{/if}

<style>
  .ov { position: fixed; inset: 0; z-index: 5400; /* sobre las pestañas (5000), debajo de la barra (5500) */ overflow-y: auto; scrollbar-width: none; background: #0a1226; color: #fff; font-family: var(--q-font); animation: q-ov 0.35s var(--q-ease) both; overscroll-behavior: contain; }
  .ov::-webkit-scrollbar { display: none; }
</style>
