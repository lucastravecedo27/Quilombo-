<script lang="ts">
  // Saldo Quilombo: lo disponible, recargar (50, 100, 200 o 500 mil por PSE, tarjeta o Nequi) y los movimientos
  // (recargas en verde, pagos en tinta). Con el saldo se paga la cancha, el bar con la tarjeta, torneos y clases.
  import { Page } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Cabecera from '$lib/ui/Cabecera.svelte';
  import { movimientos, saldoQuilombo } from '$lib/club/app/club';
  import { RECARGAS_RAPIDAS } from '$lib/club/domain/billetera';
  import { yo } from '../app/vinculos';
  import { meTocaPagar } from '../app/saldo';
  import AvisoPartes from '../ui/saldo/AvisoPartes.svelte';
  import { pesos } from '../domain/jugar';

  const saldo = $derived(saldoQuilombo(yo()));
  const movs = $derived(movimientos(yo()).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)));
  const fecha = (iso: string) => new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
  const icono = (concepto: string, monto: number) => (monto > 0 ? (/recarga/i.test(concepto) ? '💳' : '↩️') : /cancha/i.test(concepto) ? '🎾' : /inscrip/i.test(concepto) ? '🏆' : /clase/i.test(concepto) ? '🎓' : /parte/i.test(concepto) ? '✂️' : '🍹');
  let monto = $state(200_000);
  const mil = (n: number) => `${n / 1000} mil`;
</script>

<Page name="saldo" class="pa-saldo" noNavbar>
  <Cabecera titulo="Saldo Quilombo" />

  <section class="disp">
    <small>DISPONIBLE</small>
    <b aria-live="polite">{pesos(saldo)}</b>
    <span>Paga cancha, bar, torneos y clases.</span>
  </section>

  {#if meTocaPagar().length}<h2 class="q-h2">Te piden</h2><AvisoPartes />{/if}

  <h2 class="q-h2">Recargar</h2>
  <div class="montos" role="radiogroup" aria-label="Cuánto recargar">
    {#each RECARGAS_RAPIDAS as m (m)}
      <button role="radio" aria-checked={monto === m} class:on={monto === m} onclick={() => { toque(4); monto = m; }}>{mil(m)}</button>
    {/each}
  </div>
  <button class="recargar" onclick={() => { toque(); ui.recargar = { sugerido: monto }; }}>Recargar {pesos(monto)}</button>

  <h2 class="q-h2">Movimientos</h2>
  {#if movs.length}
    <div class="lista">
      {#each movs as m (m.id)}
        <div class="mov">
          <span class="ico" aria-hidden="true">{icono(m.concepto, m.monto)}</span>
          <span class="tx"><b>{m.concepto}</b><small>{fecha(m.created_at)}</small></span>
          <b class="v" class:mas={m.monto > 0}>{m.monto > 0 ? '+' : '−'} {pesos(Math.abs(m.monto))}</b>
        </div>
      {/each}
    </div>
  {:else}
    <p class="q-vacio"><b>Aún sin movimientos</b>Recarga y paga todo desde la app.</p>
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-saldo .page-content) { font-family: var(--q-font); }
  .disp { margin: 0 20px; display: flex; flex-direction: column; gap: 2px; }
  .disp small { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; color: var(--q-tx2); }
  .disp b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 72px; line-height: 0.95; }
  .disp span { font-size: 14px; color: var(--q-tx2); }
  .montos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0 16px; }
  .montos button { height: 52px; border: 1.5px solid var(--q-line); border-radius: 12px; background: var(--q-card); color: var(--q-tx); font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 22px; }
  .montos button.on { border-color: var(--q-acc); background: var(--q-accs); color: var(--q-acct); }
  .recargar { display: block; width: calc(100% - 32px); margin: 10px 16px 0; height: 52px; border: 0; border-radius: 12px; background: var(--q-acc); color: var(--q-acctx); font-size: 16.5px; font-weight: 900; }
  .lista { margin: 0 16px; border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .mov { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
  .mov + .mov { border-top: 1px solid var(--q-line); }
  .ico { width: 38px; height: 38px; flex: none; border-radius: 10px; background: var(--q-sub); font-size: 18px; display: flex; align-items: center; justify-content: center; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .tx b { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tx small { font-size: 12.5px; color: var(--q-tx2); }
  .v { font-size: 15px; white-space: nowrap; }
  .v.mas { color: var(--q-ok); }
</style>
