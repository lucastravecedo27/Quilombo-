<script lang="ts">
  // La bolita de una persona: su foto si tiene, si no su avatar dibujado, si no sus iniciales sobre su color.
  import { urlFotoSocial } from '../../app/social';
  import { fotosLocales, type PerfilVisible } from '../../app/perfil.svelte';
  import { avatarDe, colorMarca } from '$lib/ui/avatares';

  let { perfil, size = 40, borde = false }: { perfil: Pick<PerfilVisible, 'nombre' | 'color'> & Partial<Pick<PerfilVisible, 'avatar' | 'foto'>>; size?: number; borde?: boolean } = $props();

  const ini = $derived(perfil.nombre.trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase() ?? '').join('') || '?');
  const dibujo = $derived(avatarDe(perfil.avatar));
  let url = $state<string | null>(null);
  let fallo = $state(false);
  $effect(() => {
    const f = perfil.foto;
    url = null;
    fallo = false;
    if (!f) return;
    const local = fotosLocales.get(f);
    if (local) { url = local; return; }
    let vivo = true;
    void urlFotoSocial(f).then((u) => { if (vivo) url = u; });
    return () => { vivo = false; };
  });
</script>

<span class="foto-perfil" class:borde style="--t:{size}px; background:{colorMarca(dibujo && !url ? dibujo.fondo : perfil.color)}" role="img" aria-label={perfil.nombre}>
  {#if url && !fallo}
    <img src={url} alt="" onerror={() => (fallo = true)} />
  {:else if dibujo}
    <svg viewBox="0 0 100 100" aria-hidden="true">{@html dibujo.svg}</svg>
  {:else}
    <b>{ini}</b>
  {/if}
</span>

<style>
  .foto-perfil { position: relative; width: var(--t); height: var(--t); border-radius: 50%; overflow: hidden; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--q-fiesta-tinta); }
  .foto-perfil.borde { box-shadow: 0 0 0 calc(var(--t) * 0.05) var(--q-bg); }
  img, svg { width: 100%; height: 100%; display: block; object-fit: cover; }
  b { font-family: var(--q-font-fiesta); font-weight: 900; font-size: calc(var(--t) * 0.36); letter-spacing: -0.02em; }
</style>
