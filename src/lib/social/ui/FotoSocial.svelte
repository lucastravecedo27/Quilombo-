<script lang="ts">
  // Foto privada de la red (bucket "social"): pide la URL firmada solo cuando la foto está por verse (carga perezosa) y se desvanece al llegar.
  import { onMount } from 'svelte';
  import { urlFotoSocial } from '../app/social';
  let { path, alt = '', color = 'var(--q-sub)', ajuste = 'cover', inmediata = false }: { path: string; alt?: string; color?: string; ajuste?: 'cover' | 'contain'; inmediata?: boolean } = $props();
  let caja: HTMLDivElement | undefined = $state();
  let url = $state<string | null>(null);
  let lista = $state(false);
  let pedida = '';

  async function cargar() {
    if (pedida === path) return;
    pedida = path;
    url = await urlFotoSocial(path);
  }
  onMount(() => {
    if (inmediata || typeof IntersectionObserver === 'undefined') { void cargar(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { void cargar(); io.disconnect(); } }, { rootMargin: '300px' });
    if (caja) io.observe(caja);
    return () => io.disconnect();
  });
  // Si cambia el path (otra foto en la misma caja), se vuelve a pedir
  $effect(() => { if (path !== pedida && pedida) { lista = false; void cargar(); } });
</script>

<div class="foto" bind:this={caja} style="--c:{color}">
  {#if url}<img src={url} {alt} class:lista class:contener={ajuste === 'contain'} draggable="false" onload={() => (lista = true)} />{/if}
</div>

<style>
  .foto { position: relative; width: 100%; height: 100%; overflow: hidden; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 70%, #fff), var(--c)); }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 320ms ease; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  img.contener { object-fit: contain; background: #000; }
  img.lista { opacity: 1; }
</style>
