<script lang="ts">
  // Lista del feed (como Instagram): posts a lo ancho con separadores finos, scroll infinito (8 en 8) y "Ver más" de respaldo.
  import type { Snippet } from 'svelte';
  import type { Post } from '../../app/feed';
  import { toque } from '$lib/ui/tema.svelte';
  import Muro from './Muro.svelte';
  import TarjetaPost from './TarjetaPost.svelte';
  import TarjetaPartido from './TarjetaPartido.svelte';

  let { posts, vacio }: { posts: Post[]; vacio?: Snippet } = $props();

  const PASO = 8;
  let cuantos = $state(PASO);
  const visibles = $derived(posts.slice(0, cuantos));
  const hayMas = $derived(posts.length > cuantos);
  function masPosts() { if (hayMas) cuantos += PASO; }
  /** Al acercarse al final del feed carga 8 más (scroll infinito) */
  function alFinal(nodo: HTMLElement) {
    if (typeof IntersectionObserver === 'undefined') return;
    const raiz = nodo.closest('.page-content') as HTMLElement | null;
    // Solo cuando la persona baja (cambiar de sección no carga más por sí solo) o si el feed no llena la pantalla
    let cerca = false;
    let movido = false;
    const corto = () => !!raiz && raiz.clientHeight > 0 && raiz.scrollHeight <= raiz.clientHeight + 600;
    const intentar = () => { if (cerca && (movido || corto())) masPosts(); };
    const alMover = () => { movido = true; intentar(); };
    raiz?.addEventListener('scroll', alMover, { passive: true });
    const io = new IntersectionObserver((es) => { cerca = es.some((e) => e.isIntersecting); intentar(); }, { root: raiz, rootMargin: '600px 0px' });
    io.observe(nodo);
    return { destroy: () => { io.disconnect(); raiz?.removeEventListener('scroll', alMover); } };
  }
</script>

<div class="feed">
  {#each visibles as post (post.id)}
    <div class="post" data-tipo={post.k}>
      {#if post.k === 'publicacion'}
        <TarjetaPost pub={post.p} />
      {:else if post.k === 'partido'}
        <TarjetaPartido partido={post.partido} />
      {:else}
        <div class="momento"><Muro eventos={[post.ev]} /></div>
      {/if}
    </div>
  {:else}
    {@render vacio?.()}
  {/each}
  {#if hayMas}
    <div class="sentinela" use:alFinal></div>
    <button class="ver-mas" onclick={() => { toque(); masPosts(); }}>Ver más</button>
  {:else if posts.length > PASO}
    <p class="fin">Estás al día con tu gente ✨</p>
  {/if}
</div>

<style>
  .feed { display: flex; flex-direction: column; gap: 12px; padding: 0 16px; }
  .post { border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .post[data-tipo='partido'], .post[data-tipo='momento'] { background: none; border: 0; border-radius: 0; overflow: visible; }
  .momento { padding: 0; }
  .sentinela { height: 1px; }
  .ver-mas { align-self: center; margin: 4px 0; height: 40px; padding: 0 22px; border-radius: 10px; border: 0; background: var(--q-sub); color: var(--q-tx); font-family: var(--q-font); font-size: 14px; font-weight: 900; }
  .fin { text-align: center; margin: 18px 0 4px; color: var(--q-tx3); font-size: 13.5px; font-weight: 700; }
</style>
