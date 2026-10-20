<script lang="ts">
  // Una publicación completa: con todos sus comentarios y lo que pasó en ella.
  import { Page, Navbar } from 'framework7-svelte';
  import TarjetaPost from '../ui/feed/TarjetaPost.svelte';
  import { publicacion } from '../app/social';
  import { nombreDe, yo } from '../app/vinculos';
  import { primerNombre } from '../app/rituales';

  let { id }: { id: string } = $props();
  const p = $derived(publicacion(id));
</script>

<Page name="publicacion">
  <Navbar backLink="Atrás" title={p ? (p.autor === yo() ? 'Tu publicación' : `De ${primerNombre(nombreDe(p.autor))}`) : 'Publicación'} />
  {#if p}
    <TarjetaPost pub={p} completo />
  {:else}
    <p class="q-vacio">Esta publicación ya no está disponible.</p>
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>
