<script lang="ts">
  // Nota de voz: ▶︎ / ❚❚, barra de avance (se puede tocar para saltar) y el tiempo. Solo suena una a la vez.
  // En el iPhone el sonido solo arranca si play() ocurre dentro del mismo toque: por eso el <audio> existe desde el
  // principio y su enlace se pide apenas la burbuja se acerca a la pantalla (no al tocar, que ya sería tarde).
  import { onMount } from 'svelte';
  import { urlAdjunto, duracionTexto } from '../../app/chatAdjuntos';
  import Icon from '$lib/ui/Icon.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  let { path, local = null, duracion = 0, mia = false }: { path: string; local?: string | null; duracion?: number; mia?: boolean } = $props();
  let caja = $state<HTMLDivElement | undefined>();
  let audio = $state<HTMLAudioElement | undefined>();
  let url = $state<string | null>(null);
  let sonando = $state(false);
  let actual = $state(0);
  let medido = $state(0);
  let error = $state(false);
  let esperando = false;
  const total = $derived(medido || duracion || 0);

  async function cargar() {
    if (url || esperando) return;
    if (local) { url = local; return; }
    esperando = true;
    url = await urlAdjunto(path);
    esperando = false;
    if (!url) error = true;
  }
  onMount(() => {
    if (local || typeof IntersectionObserver === 'undefined') { void cargar(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { void cargar(); io.disconnect(); } }, { rootMargin: '400px' });
    if (caja) io.observe(caja);
    return () => io.disconnect();
  });

  function alternar(e: MouseEvent) {
    e.stopPropagation();
    toque(4);
    if (!audio) return;
    if (!url) { void cargar().then(() => audio?.play().catch(() => undefined)); return; }
    if (sonando) { audio.pause(); return; }
    // Solo una nota a la vez
    document.querySelectorAll<HTMLAudioElement>('audio.q-voz').forEach((a) => { if (a !== audio) a.pause(); });
    error = false;
    // play() en el mismo toque (sin esperas antes): así lo permite el iPhone
    audio.play().catch(() => { error = true; });
  }
  function saltar(e: MouseEvent) {
    e.stopPropagation();
    if (!audio || !total) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total;
  }
</script>

<div class="voz" class:mia bind:this={caja}>
  <button class="play" aria-label={sonando ? 'Pausar nota de voz' : 'Escuchar nota de voz'} onclick={alternar}>
    {#if sonando}<span class="pausa"><i></i><i></i></span>{:else}<Icon name="play" size={18} />{/if}
  </button>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <span class="barra" onclick={saltar}><i style="width:{total ? (actual / total) * 100 : 0}%"></i></span>
  <small>{error ? 'Toca otra vez' : duracionTexto(sonando || actual ? actual : total)}</small>
  <audio bind:this={audio} class="q-voz" src={url ?? undefined} preload="auto" playsinline
    onplay={() => (sonando = true)} onpause={() => (sonando = false)} onended={() => { sonando = false; actual = 0; }}
    onerror={() => { if (url) error = true; }}
    ontimeupdate={() => (actual = audio?.currentTime ?? 0)} onloadedmetadata={() => { if (audio && isFinite(audio.duration) && audio.duration > 0) medido = audio.duration; }}></audio>
</div>

<style>
  .voz { display: flex; align-items: center; gap: 10px; width: 230px; max-width: 78vw; padding: 8px 12px 8px 8px; border-radius: 14px; background: var(--q-sub); color: var(--q-tx); box-sizing: border-box; }
  .voz.mia { background: var(--q-acc); color: var(--q-acctx); }
  .play { flex-shrink: 0; width: 38px; height: 38px; border-radius: 19px; border: 0; padding: 0; background: currentColor; display: flex; align-items: center; justify-content: center; }
  .play :global(svg) { color: var(--q-bg); margin-left: 2px; }
  .voz.mia .play :global(svg) { color: var(--q-acc); }
  .pausa { display: flex; gap: 4px; }
  .pausa i { width: 4px; height: 14px; border-radius: 2px; background: var(--q-bg); }
  .voz.mia .pausa i { background: var(--q-acc); }
  .barra { flex: 1; height: 6px; border-radius: 3px; background: color-mix(in srgb, currentColor 25%, transparent); overflow: hidden; padding: 8px 0; background-clip: content-box; }
  .barra i { display: block; height: 6px; border-radius: 3px; background: currentColor; }
  small { flex-shrink: 0; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; min-width: 32px; text-align: right; }
</style>
