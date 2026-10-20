<script lang="ts">
  // Pestaña Tarjetas: escanear la tarjeta Quilombo de un jugador (o digitar su código de 6), las tarjetas de hoy con
  // lo que llevan y su saldo, y dividir una cuenta entre varias tarjetas.
  import { cuentas, saldoCuenta, saldoQuilombo } from '$lib/club/app/club';
  import { datos } from '$lib/data/datos.svelte';
  import { diaColombia, pesos } from '$lib/social/domain/jugar';
  import { iniciales, m } from './estado.svelte';
  import { abrirTarjeta } from './tarjetas';
  import Visor from './Visor.svelte';
  import CodigoTarjeta from './CodigoTarjeta.svelte';
  import HojaDividir from './HojaDividir.svelte';

  const hoy = $derived(diaColombia(new Date(m.ahora).toISOString()));
  const deHoy = $derived(cuentas().filter((c) => c.estado === 'abierta' || diaColombia(c.cerrada_en ?? c.created_at) === hoy).sort((a, b) => (a.estado === b.estado ? b.created_at.localeCompare(a.created_at) : a.estado === 'abierta' ? -1 : 1)));
  const color = (uid: string | null) => ((uid ? datos.perfiles.find((p) => p.user_id === uid)?.color : null) as string | null) || '#1e7fd0';
  let dividir = $state(false);
  let codigoEl = $state<HTMLElement | null>(null);
</script>

<section class="tarjetas">
  <h2 class="m-titulo">Escanear tarjeta</h2>
  <Visor onleer={(t) => void abrirTarjeta(t)} onSinCamara={() => codigoEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />

  <div class="m-over sep" bind:this={codigoEl}>O digita el código de 6</div>
  <CodigoTarjeta onCodigo={(c) => void abrirTarjeta(c)} />

  <h3 class="m-titulo">Tarjetas de hoy</h3>
  {#if deHoy.length}
    <div class="lista">
      {#each deHoy as c (c.id)}
        {@const saldo = c.user_id ? saldoQuilombo(c.user_id) : null}
        <button class="fila" class:cerrada={c.estado !== 'abierta'} onclick={() => (m.verCuenta = c.id)}>
          <span class="ini" style="background:{color(c.user_id)}">{iniciales(c.nombre)}</span>
          <span class="nom"><b>{c.nombre}</b><small>{c.codigo} · hoy {pesos(saldoCuenta(c.id))}{c.estado !== 'abierta' ? ' · visita cerrada' : ''}</small></span>
          {#if saldo !== null}<span class="saldo"><small>SALDO</small><b class:bajo={saldo < 30_000}>{pesos(saldo)}</b></span>{/if}
        </button>
      {/each}
    </div>
  {:else}
    <div class="vacio">Nadie ha pagado con tarjeta hoy. El jugador muestra su tarjeta Quilombo (QR) y se le cobra con su saldo.</div>
  {/if}
  <button class="dividir" onclick={() => (dividir = true)}>✂️ Dividir entre tarjetas</button>
</section>

{#if dividir}
  <HojaDividir total={0} libre titulo="Dividir entre tarjetas" onCerrar={() => (dividir = false)} onListo={() => (dividir = false)} />
{/if}

<style>
  .tarjetas { padding: 16px; }
  h2 { margin: 0 4px 12px; font-size: 30px; }
  .sep { margin: 16px 4px 8px; }
  h3 { margin: 22px 4px 10px; font-weight: 800; font-size: 22px; }
  .lista { border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .fila { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 0; background: none; text-align: left; }
  .fila + .fila { border-top: 1px solid var(--q-line); }
  .fila:active { background: var(--q-accs); }
  .fila.cerrada { opacity: 0.6; }
  .ini { width: 44px; height: 44px; flex: none; border-radius: 22px; color: #fff; font-weight: 900; font-size: 15px; display: flex; align-items: center; justify-content: center; }
  .nom { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .nom b { font-size: 16px; }
  .nom small { font-size: 13px; color: var(--q-tx2); font-weight: 600; }
  .saldo { display: flex; flex-direction: column; align-items: flex-end; }
  .saldo small { font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--q-tx2); }
  .saldo b { font-size: 16px; font-variant-numeric: tabular-nums; }
  .saldo b.bajo { color: #d42a3a; }
  .vacio { padding: 16px; border-radius: 14px; border: 1.5px dashed var(--q-borde); text-align: center; font-size: 14.5px; color: var(--q-tx2); }
  .dividir { display: block; width: 100%; margin-top: 12px; height: 54px; border: 1.5px dashed var(--q-borde); border-radius: 14px; background: none; font-size: 16px; font-weight: 900; }
</style>
