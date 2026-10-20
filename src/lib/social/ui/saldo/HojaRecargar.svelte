<script lang="ts">
  // Recargar saldo Quilombo desde cualquier parte (Jugar, tu tarjeta, tu perfil, la billetera)
  import { untrack } from 'svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { saldoQuilombo } from '$lib/club/app/club';
  import { METODOS_RECARGA, type MetodoRecarga } from '$lib/club/domain/billetera';
  import { yo } from '../../app/vinculos';
  import { pesos } from '../../domain/jugar';
  import FormRecarga from './FormRecarga.svelte';

  let abierto = $state(false);
  let sugerido = $state(0);
  let listo = $state<{ monto: number; metodo: MetodoRecarga } | null>(null);
  let k = $state(0);
  $effect(() => {
    const r = ui.recargar;
    if (!r) return;
    untrack(() => { sugerido = r.sugerido ?? 0; listo = null; k++; abierto = true; });
  });
</script>

<Hoja bind:abierto titulo={listo ? 'Saldo recargado' : 'Recargar saldo'} sub={listo ? '' : `Tienes ${pesos(saldoQuilombo(yo()))} · paga cancha, bar y torneos`} alCerrar={() => (ui.recargar = null)}>
  {#if listo}
    <div class="ok q-pop" role="status">
      <span class="chulo">✓</span>
      <b>+ {pesos(listo.monto)}</b>
      <span>Ahora tienes <strong>{pesos(saldoQuilombo(yo()))}</strong> de saldo Quilombo</span>
      <small>{METODOS_RECARGA[listo.metodo]} · aprobado</small>
    </div>
  {:else}
    {#key k}<FormRecarga {sugerido} onlisto={(monto, metodo) => (listo = { monto, metodo })} />{/key}
  {/if}
  {#snippet pie()}
    {#if listo}<button class="q-btn bloque" onclick={() => (abierto = false)}>Listo</button>{/if}
  {/snippet}
</Hoja>

<style>
  .ok { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 0 8px; text-align: center; }
  .chulo { width: 72px; height: 72px; border-radius: 50%; background: var(--q-ok); color: #fff; font-size: 40px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
  .ok b { font-family: var(--q-font-titulo); font-style: italic; font-size: 38px; font-weight: 900; color: var(--q-ok); }
  .ok span { font-size: 15px; }
  .ok small { font-size: 13px; color: var(--q-tx2); }
</style>
