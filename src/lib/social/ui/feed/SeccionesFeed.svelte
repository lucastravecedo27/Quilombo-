<script lang="ts">
  // Las tres partes del feed: 📸 Fotos · 🎾 Partidos · 💬 Actividad. Partidos muestra cuántos hay abiertos.
  import { SECCIONES_FEED, type Seccion } from '../../app/feed';
  import { toque } from '$lib/ui/tema.svelte';

  let { valor = $bindable<Seccion>('fotos'), partidosAbiertos = 0 }: { valor?: Seccion; partidosAbiertos?: number } = $props();
</script>

<div class="secciones" role="tablist" aria-label="Qué ver en tu red">
  {#each SECCIONES_FEED as s (s.id)}
    <button role="tab" aria-selected={valor === s.id} class:on={valor === s.id} onclick={() => { if (valor !== s.id) { toque(4); valor = s.id; } }}>
      {s.nombre}{#if s.id === 'partidos' && partidosAbiertos}<em>{partidosAbiertos}</em>{/if}
    </button>
  {/each}
</div>

<style>
  .secciones { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin: 12px 16px 12px; padding: 4px; border-radius: 14px; background: var(--q-sub); font-family: var(--q-font); }
  button { position: relative; height: 38px; min-width: 0; padding: 0 2px; border: 0; border-radius: 10px; background: none; color: var(--q-tx); font: inherit; font-size: 14px; font-weight: 900; letter-spacing: -0.01em; white-space: nowrap; transition: background var(--q-dur-fast), color var(--q-dur-fast); }
  button.on { background: var(--q-card); color: var(--q-tx); box-shadow: 0 1px 4px rgba(14, 27, 51, 0.12); }
  em { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; margin-left: 4px; padding: 0 4px; border-radius: 9px; background: var(--q-acc); color: var(--q-acctx); font-style: normal; font-size: 11px; vertical-align: 1px; }
</style>
