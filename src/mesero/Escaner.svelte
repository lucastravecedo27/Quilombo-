<script lang="ts">
  // Escanear la tarjeta Quilombo de un jugador desde cualquier pestaña (botón QR del encabezado): la cámara o el
  // código de 6, o una tarjeta de hoy. Abre su hoja para cobrarle con su saldo.
  import { cuentasAbiertas, saldoQuilombo } from '$lib/club/app/club';
  import { pesos } from '$lib/social/domain/jugar';
  import { m } from './estado.svelte';
  import { abrirTarjeta } from './tarjetas';
  import Visor from './Visor.svelte';
  import CodigoTarjeta from './CodigoTarjeta.svelte';

  const abiertas = $derived(cuentasAbiertas());
  const cerrar = () => (m.escaneando = false);
</script>

<div class="m-fondo" role="presentation" onclick={cerrar}></div>
<div class="m-hoja" role="dialog" aria-modal="true" aria-label="Escanear tarjeta">
  <div class="m-agarre"></div>
  <div class="m-hoja-cab">
    <span><b class="m-titulo">Escanear tarjeta</b><small>Lo que pida se paga con su saldo Quilombo</small></span>
    <button class="m-x" onclick={cerrar} aria-label="Cerrar">✕</button>
  </div>
  <div class="cuerpo">
    <Visor alto={240} onleer={(t) => void abrirTarjeta(t)} />
    <div class="m-over">O digita el código de 6</div>
    <CodigoTarjeta onCodigo={(c) => void abrirTarjeta(c)} />
    {#if abiertas.length}
      <div class="m-over">Tarjetas de hoy</div>
      <div class="lista">
        {#each abiertas as c (c.id)}
          <button onclick={() => { m.escaneando = false; m.verCuenta = c.id; }}>
            <b class="cod m-num">{c.codigo}</b><span class="nom">{c.nombre}</span><span class="saldo">{c.user_id ? pesos(saldoQuilombo(c.user_id)) : ''}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .cuerpo { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
  .cuerpo .m-over { margin: 6px 4px 0; }
  .lista { border-radius: 14px; border: 1px solid var(--q-line); overflow: hidden; }
  .lista button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; padding: 8px 14px; border: 0; background: none; text-align: left; }
  .lista button + button { border-top: 1px solid var(--q-line); }
  .cod { font-size: 22px; color: var(--q-acct); letter-spacing: 0.06em; }
  .nom { flex: 1; font-weight: 800; font-size: 16px; }
  .saldo { font-weight: 800; color: var(--q-tx2); font-variant-numeric: tabular-nums; }
</style>
