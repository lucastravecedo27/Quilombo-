<script lang="ts">
  // Foto del chat: polaroid inclinada; tocarla la abre en grande (tocar de nuevo o la X la cierra).
  import { onMount } from 'svelte';
  import { urlAdjunto } from '../../app/chatAdjuntos';
  import Icon from '$lib/ui/Icon.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { registrarAtras } from '$lib/app/atras';
  let { path, local = null, mia = false, nota = '' }: { path: string; local?: string | null; mia?: boolean; nota?: string } = $props();
  let url = $state<string | null>(null);
  let grande = $state(false);
  let lista = $state(false);
  onMount(() => { if (local) url = local; else void urlAdjunto(path).then((u) => (url = u)); });
  // Atrás / Escape cierra solo la foto (no se sale del chat)
  $effect(() => { if (!grande) return; const liberar = registrarAtras(() => (grande = false)); return liberar; });
  /** El visor va directo en <body>: dentro de la polaroid (inclinada) "fijo" no sería toda la pantalla */
  function aBody(nodo: HTMLElement) {
    document.body.appendChild(nodo);
    return { destroy: () => nodo.remove() };
  }
</script>

<button class="polaroid" class:mia onclick={(e) => { e.stopPropagation(); if (url) { toque(4); grande = true; } }} aria-label="Ver la foto en grande">
  <span class="img">{#if url}<img src={url} alt="Foto del chat" class:lista onload={() => (lista = true)} draggable="false" />{/if}</span>
  {#if nota}<span class="pie">{nota}</span>{/if}
</button>
{#if grande && url}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="visor" use:aBody onclick={() => (grande = false)} role="dialog" aria-modal="true" aria-label="Foto" tabindex="-1">
    <img src={url} alt="Foto del chat en grande" />
    <button class="x" aria-label="Cerrar" onclick={() => (grande = false)}><Icon name="cerrar" size={18} stroke={2.6} /></button>
  </div>
{/if}

<style>
  .polaroid { display: flex; flex-direction: column; width: 200px; padding: 8px 8px 0; border: 0; border-radius: 5px; background: #f6efe2; color: #1a1033; transform: rotate(2deg); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); text-align: left; }
  .polaroid.mia { transform: rotate(-2deg); }
  .polaroid:active { transform: scale(0.97); }
  .img { display: block; width: 184px; height: 184px; border-radius: 2px; overflow: hidden; background: #ddd; }
  .img img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.25s; }
  .img img.lista { opacity: 1; }
  .pie { padding: 8px 2px 10px; font-size: 13px; font-weight: 800; line-height: 1.3; word-break: break-word; }
  .polaroid:not(:has(.pie)) { padding-bottom: 22px; }
  .visor { position: fixed; inset: 0; z-index: 14000; background: rgba(0, 0, 0, 0.92); display: flex; align-items: center; justify-content: center; animation: q-entra-v 0.2s ease-out; }
  .visor img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .x { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); right: 14px; width: 42px; height: 42px; border-radius: 21px; border: 0; background: rgba(255, 255, 255, 0.18); color: #fff; display: flex; align-items: center; justify-content: center; }
  @keyframes q-entra-v { from { opacity: 0; } to { opacity: 1; } }
</style>
