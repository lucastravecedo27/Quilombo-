<script lang="ts">
  // /cuenta/: la Tarjeta Quilombo como pantalla (desde Jugar o el perfil). Es la misma tarjeta del botón Q.
  import { Page } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import Cabecera from '$lib/ui/Cabecera.svelte';
  import TarjetaQuilombo from '../ui/cuenta/TarjetaQuilombo.svelte';
</script>

<Page name="cuenta" class="pa-cuenta" noNavbar>
  <Cabecera titulo="Tu tarjeta" oscuro />
  <TarjetaQuilombo irASaldo={() => ui.navegar('/saldo/')} />
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-cuenta), :global(.page.pa-cuenta .page-content) { background: #0a1226; color: #fff; font-family: var(--q-font); }
</style>
