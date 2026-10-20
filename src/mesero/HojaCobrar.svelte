<script lang="ts">
  // Cobrar un pedido: el total grande y cómo pagó — efectivo, datáfono, Nequi o con tarjetas Quilombo (saldo de uno,
  // mitad y mitad o entre varios).
  import { cobrarPedido } from '$lib/club/app/club';
  import { pesos } from '$lib/social/domain/jugar';
  import type { MetodoPago, Pedido } from '$lib/club/domain/club';
  import { m } from './estado.svelte';
  import HojaDividir from './HojaDividir.svelte';

  let { pedido, onCerrar }: { pedido: Pedido | null; onCerrar: () => void } = $props();
  let ocupado = $state(false);
  let conTarjetas = $state(false);
  const METODOS: { id: MetodoPago; nombre: string; emoji: string }[] = [
    { id: 'efectivo', nombre: 'Efectivo', emoji: '💵' },
    { id: 'datafono', nombre: 'Datáfono', emoji: '💳' },
    { id: 'nequi', nombre: 'Nequi', emoji: '📲' }
  ];
  async function cobrar(metodo: MetodoPago) {
    if (!pedido || ocupado) return;
    ocupado = true;
    const n = pedido.numero;
    const err = await cobrarPedido(pedido.id, metodo, m.yo);
    ocupado = false;
    m.avisar(err ?? `#${n} cobrado ✓`, !!err);
    onCerrar();
  }
</script>

{#if pedido}
  <div class="m-fondo" role="presentation" onclick={onCerrar}></div>
  <div class="m-hoja" role="dialog" aria-modal="true" aria-label="Cobrar pedido #{pedido.numero}">
    <div class="m-agarre"></div>
    <div class="m-hoja-cab">
      <span><b class="m-titulo">Cobrar pedido #{pedido.numero}</b><small>{pedido.ubicacion} · {pedido.cliente}</small></span>
      <button class="m-x" onclick={onCerrar} aria-label="Cerrar">✕</button>
    </div>
    <b class="total m-num">{pesos(pedido.total)}</b>
    <div class="metodos">
      {#each METODOS as x (x.id)}
        <button disabled={ocupado} onclick={() => cobrar(x.id)}><span aria-hidden="true">{x.emoji}</span>{x.nombre}</button>
      {/each}
      <button class="tarjeta" disabled={ocupado} onclick={() => (conTarjetas = true)}><span aria-hidden="true">🛳️</span>Tarjeta Quilombo</button>
    </div>
  </div>
  {#if conTarjetas}
    <HojaDividir total={pedido.total} ref={pedido.id} titulo="Cobrar con tarjetas" sub="Pedido #{pedido.numero} · {pedido.ubicacion}" onCerrar={() => (conTarjetas = false)} onListo={() => { conTarjetas = false; onCerrar(); }} />
  {/if}
{/if}

<style>
  .total { display: block; margin: 14px 0 12px; font-size: 60px; }
  .metodos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .metodos button { height: 72px; border: 0; border-radius: 14px; background: var(--q-sub); color: var(--q-tx); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 15px; font-weight: 900; }
  .metodos button span { font-size: 24px; }
  .metodos button.tarjeta { background: var(--q-noche); color: #fff; }
  .metodos button:active:not(:disabled) { transform: scale(0.97); }
  .metodos button:disabled { opacity: 0.5; }
</style>
