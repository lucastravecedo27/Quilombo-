<script lang="ts">
  // Aviso arriba (debajo de la isla): fondo azul noche, círculo verde con ✓ (o rojo si es un problema), título y
  // detalle; una acción opcional a la derecha.
  import Icon from './Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
</script>

{#if ui.aviso}
  {@const a = ui.aviso}
  {@const malo = a.icono === 'alerta'}
  <div class="aviso q-aviso" role="status" aria-live="polite">
    <span class="ic" class:malo><Icon name={malo ? 'alerta' : a.icono === 'info' ? 'info' : 'check'} size={16} stroke={3} /></span>
    <span class="tx"><b>{a.titulo}</b>{#if a.sub}<small>{a.sub}</small>{/if}</span>
    {#if a.accion}<button onclick={() => { a.accion?.hacer(); ui.cerrarAviso(); }}>{a.accion.texto}</button>{/if}
  </div>
{/if}

<style>
  .aviso { position: fixed; z-index: 14500; left: 16px; right: 16px; top: calc(env(safe-area-inset-top, 0px) + 8px); display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; background: #0e1b33; color: #fff; box-shadow: 0 14px 34px rgba(14, 27, 51, 0.35); font-family: var(--q-font); animation: q-ov 0.3s var(--q-ease) both; }
  :global(html.dark) .aviso { box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(220, 230, 255, 0.12); }
  .ic { width: 30px; height: 30px; border-radius: 15px; background: var(--q-ok); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ic.malo { background: var(--q-rojo); }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  b { font-size: 15px; font-weight: 800; }
  small { font-size: 13px; opacity: 0.8; }
  button { border: 0; background: rgba(255, 255, 255, 0.14); color: #fff; height: 34px; padding: 0 12px; border-radius: 9px; font-weight: 900; font-size: 13.5px; }
</style>
