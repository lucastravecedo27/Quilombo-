<script lang="ts">
  // Barra de pestañas anclada abajo: Social · Jugar · [Q] · Chat · Perfil. La Q del centro (azul noche, levantada)
  // abre la Tarjeta Quilombo desde cualquier pestaña. La activa va en el acento con una rayita arriba; Chat muestra
  // cuántas conversaciones están sin leer.
  import Icon from './Icon.svelte';
  import { PESTANAS, ui } from '$lib/app/ui.svelte';
  import { toque } from './tema.svelte';
  import { conversaciones, sinLeer } from '$lib/social/app/vinculos';

  const sinLeerN = $derived(conversaciones().filter((c) => sinLeer(c.id, c.ultimo)).length);
  const izq = PESTANAS.slice(0, 2);
  const der = PESTANAS.slice(2);
</script>

{#snippet pestana(p: (typeof PESTANAS)[number])}
  <button class:activo={ui.tab === p.id && !ui.tarjeta} aria-current={ui.tab === p.id && !ui.tarjeta ? 'page' : undefined} onclick={() => { toque(4); ui.tarjeta = false; ui.irA(p.id); }}>
    <Icon name={p.icono} size={22} stroke={2} />
    {p.label}
    {#if p.id === 'chat' && sinLeerN}<span class="globo">{sinLeerN}</span>{/if}
  </button>
{/snippet}

<div class="q-tabbar" class:oculta={ui.sinBarra && !ui.tarjeta}>
  <nav aria-label="Secciones">
    {#each izq as p (p.id)}{@render pestana(p)}{/each}
    <div class="q-centro">
      <button class="q-boton" class:abierta={ui.tarjeta} aria-label="Tu tarjeta Quilombo" aria-pressed={ui.tarjeta} onclick={() => { toque(10); ui.tarjeta = !ui.tarjeta; }}>
        <span class="aro" aria-hidden="true"></span><b>Q</b>
      </button>
    </div>
    {#each der as p (p.id)}{@render pestana(p)}{/each}
  </nav>
</div>
