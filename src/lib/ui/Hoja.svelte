<script lang="ts">
  // Hoja inferior estándar (sale al frente con resorte): agarre, título, cuerpo con scroll y pie fijo opcional.
  import type { Snippet } from 'svelte';
  import { Sheet } from 'framework7-svelte';
  import Icon from '$lib/ui/Icon.svelte';

  let { abierto = $bindable(false), titulo, sub = '', children, pie, alCerrar }:
    { abierto?: boolean; titulo: string; sub?: string; children: Snippet; pie?: Snippet; alCerrar?: () => void } = $props();
  // El contenido se monta al abrir y se desmonta al terminar de cerrar (el formulario arranca limpio cada vez)
  let montado = $state(false);
  $effect(() => { if (abierto) montado = true; });
</script>

<Sheet class="q-hoja-auto" opened={abierto} onSheetClosed={() => { abierto = false; montado = false; alCerrar?.(); }} swipeToClose backdrop style="height:auto">
  <div class="q-agarre"></div>
  <div class="q-hoja-cab">
    <div class="tit">
      <h2>{titulo}</h2>
      {#if sub}<span>{sub}</span>{/if}
    </div>
    <button class="q-cerrar" aria-label="Cerrar" onclick={() => (abierto = false)}><Icon name="cerrar" size={15} stroke={2.6} /></button>
  </div>
  <div class="cuerpo">
    {#if montado}{@render children()}{/if}
  </div>
  {#if pie && montado}<div class="pie">{@render pie()}</div>{/if}
</Sheet>

<style>
  .q-cerrar { width: 32px; flex-shrink: 0; }
  .tit { min-width: 0; display: flex; flex-direction: column; }
  .tit span { font-size: 13px; color: var(--q-tx2); margin-top: 1px; }
  .cuerpo { max-height: calc(86vh - 150px); overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 8px 18px 6px; overscroll-behavior: contain; }
  .pie { padding: 10px 18px calc(env(safe-area-inset-bottom, 0px) + 14px); }
  :global(.q-hoja-auto) { max-height: 92vh; }
</style>
