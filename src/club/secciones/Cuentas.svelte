<script lang="ts">
  // Tarjetas Quilombo: cada jugador tiene su tarjeta (un QR fijo) y paga con su saldo. Aquí se ve la actividad de hoy:
  // quién mostró su tarjeta, lo que consumió (pagado con saldo al instante), cuántos pedidos, y los pagos entre varios
  // (mitad y mitad) con el estado de cada parte. No hay crédito: si no le alcanza el saldo, recarga en la app.
  import { cuentas, divisiones, pagos, pedidosDeCuenta, porPagarCuenta, pagarCuenta, saldoQuilombo } from '$lib/club/app/club';
  import { CLUB_DEMO, ESTADOS_PEDIDO, METODOS, hace, type MetodoPago } from '$lib/club/domain/club';
  import { pagado } from '$lib/club/domain/billetera';
  import { datos } from '$lib/data/datos.svelte';
  import { diaColombia, horaColombia, pesos } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';
  import Contador from '../ui/Contador.svelte';

  const hoy = $derived(diaColombia(new Date(panel.ahora).toISOString()));
  const nombreDe = (u: string) => (datos.perfiles.find((p) => p.user_id === u)?.nombre as string | undefined) ?? 'Jugador';
  const consumo = (cid: string) => pedidosDeCuenta(cid).reduce((s, p) => s + p.total, 0);
  // Las tarjetas que se usaron hoy (o que siguen en el club), la de más consumo primero
  const deHoy = $derived(
    cuentas()
      .filter((c) => c.estado === 'abierta' || diaColombia(c.created_at) === hoy || pedidosDeCuenta(c.id).some((p) => diaColombia(p.created_at) === hoy))
      .sort((a, b) => consumo(b.id) - consumo(a.id))
  );
  const conSaldoHoy = $derived(pagos().filter((p) => p.metodo === 'saldo' && diaColombia(p.created_at) === hoy));
  const totalSaldo = $derived(conSaldoHoy.reduce((s, p) => s + p.monto, 0));
  const divs = $derived(divisiones().filter((d) => d.club_id === CLUB_DEMO && diaColombia(d.created_at) === hoy));
  let elegida = $state<string | null>(null);
  const c = $derived(deHoy.find((x) => x.id === elegida) ?? deHoy[0] ?? null);
  const ps = $derived(c ? pedidosDeCuenta(c.id).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)) : []);
  // Solo las cuentas de clientes sin tarjeta (las abre el club) quedan por pagar
  let cobrando = $state(false);
  async function cobrarSinTarjeta(m: MetodoPago) {
    if (!c) return;
    await pagarCuenta(c.id, m);
    cobrando = false;
  }
  const ESTADO_PARTE = { pagada: { t: 'Pagó ✓', k: 'ok' }, pendiente: { t: 'Pendiente', k: 'wrn' }, rechazada: { t: 'No pagó', k: 'mal' } } as const;
  const COLORES = ['#3346a8', '#e8475b', '#b98500', '#1e7fd0', '#18895b', '#c2410c'];
  const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const ultimo = (cid: string) => { const p = pedidosDeCuenta(cid).slice().sort((a, b) => b.created_at.localeCompare(a.created_at))[0]; return p ? `${p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')} · ${hace(p.created_at, panel.ahora)}` : 'Sin pedidos'; };
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">Modo crucero · se paga con saldo</span>
    <h1 class="c-titulo c-h1">Tarjetas Quilombo</h1>
  </div>
  <button class="c-btn grande" onclick={() => (panel.cobroTarjeta = true)}>🛳️ Cobrar con tarjeta en caja</button>
</header>

<div class="kpis">
  <article class="kpi"><small class="c-mini">Tarjetas usadas hoy</small><b class="c-num"><Contador valor={deHoy.length} /></b></article>
  <article class="kpi"><small class="c-mini">Consumo con saldo</small><b class="c-num"><Contador valor={totalSaldo} formato={(n) => pesos(n).replace('$ ', '$')} /></b></article>
  <article class="kpi"><small class="c-mini">Pagos entre varios</small><b class="c-num"><Contador valor={divs.length} /></b></article>
</div>

<section class="c-tarjeta tabla">
  <table class="c-tabla">
    <thead><tr><th>Jugador</th><th>Código</th><th>Consumo hoy</th><th>Saldo</th><th>Último</th></tr></thead>
    <tbody>
      {#each deHoy as x, k (x.id)}
        {@const saldo = x.user_id ? saldoQuilombo(x.user_id) : null}
        <tr class:on={elegida === x.id} onclick={() => { elegida = elegida === x.id ? null : x.id; cobrando = false; }}>
          <td><span class="jug"><span class="av" style="background:{COLORES[k % COLORES.length]}">{iniciales(x.nombre)}</span><b>{x.nombre}</b></span></td>
          <td><b class="cod c-num">{x.codigo}</b></td>
          <td><b>{pesos(consumo(x.id)).replace('$ ', '$')}</b></td>
          <td>{#if saldo !== null}<b class:bajo={saldo < 30_000}>{pesos(saldo).replace('$ ', '$')}</b>{:else}<small>Sin tarjeta</small>{/if}</td>
          <td><small class="ult">{ultimo(x.id)}</small></td>
        </tr>
        {#if elegida === x.id}
          <tr class="det"><td colspan="5">
            <ul class="peds">
              {#each ps as p (p.id)}
                <li><b>#{p.numero}</b><span>{p.ubicacion}</span><span class="qq">{p.items.map((i) => `${i.cantidad}× ${i.emoji} ${i.nombre}`).join(' · ')}</span><span class="c-insignia" style="background:color-mix(in srgb, {ESTADOS_PEDIDO[p.estado].color} 16%, transparent);color:{ESTADOS_PEDIDO[p.estado].color}">{p.estado === 'pagado' ? 'Entregado' : ESTADOS_PEDIDO[p.estado].nombre.replace(' · por cobrar', '')}</span>{#if p.pagado_en || p.estado === 'pagado'}<span class="c-insignia ok">{p.metodo === 'saldo' ? '🛳️ Saldo ✓' : `${p.metodo ? METODOS[p.metodo] : ''} ✓`}</span>{:else}<span class="c-insignia wrn">Por pagar</span>{/if}<b class="v">{pesos(p.total).replace('$ ', '$')}</b></li>
              {:else}
                <li class="c-vacio">Aún no ha pedido nada.</li>
              {/each}
            </ul>
            {#if !x.user_id && x.estado === 'abierta' && porPagarCuenta(x.id) > 0}
              <div class="cobro">
                {#if cobrando}
                  <span>¿Cómo paga {pesos(porPagarCuenta(x.id))}?</span>
                  {#each ['efectivo', 'datafono', 'nequi'] as const as m (m)}<button class="c-btn verde chico" onclick={() => cobrarSinTarjeta(m)}>{METODOS[m]}</button>{/each}
                  <button class="c-btn suave chico" onclick={() => (cobrando = false)}>Cancelar</button>
                {:else}
                  <button class="c-btn verde chico" onclick={() => (cobrando = true)}>Cobrar {pesos(porPagarCuenta(x.id))}</button>
                {/if}
              </div>
            {/if}
          </td></tr>
        {/if}
      {:else}
        <tr><td colspan="5" class="c-vacio">Hoy nadie ha usado su tarjeta todavía. Cuando el mesero (o la caja) escanee una, aparece aquí.</td></tr>
      {/each}
    </tbody>
  </table>
</section>

<section class="divs">
  <h2 class="c-sec">Pagos entre varios hoy</h2>
  {#if divs.length}
    <div class="grilla-d">
      {#each divs as d (d.id)}
        <article class="c-tarjeta div" class:completa={d.estado === 'completa'}>
          <header>
            <span class="c-insignia {d.tipo === 'cancha' ? 'app' : 'azul'}">{d.tipo === 'cancha' ? '🎾 Cancha' : d.tipo === 'pedido' ? '🍹 Pedido' : '🛳️ Consumo'}</span>
            <span class="c-insignia {d.estado === 'completa' ? 'ok' : d.estado === 'abierta' ? 'wrn' : 'mal'}">{d.estado === 'completa' ? 'Pagado completo ✓' : d.estado === 'abierta' ? `Faltan ${pesos(d.total - pagado(d))}` : 'Cancelado'}</span>
          </header>
          <b class="concepto">{d.concepto}</b>
          <span class="total-d c-num">{pesos(d.total).replace('$ ', '$')}</span>
          <ul>
            {#each d.partes as p (p.user_id)}
              <li><span>{nombreDe(p.user_id)}</span><b>{pesos(p.monto)}</b><span class="c-insignia {ESTADO_PARTE[p.estado].k}">{ESTADO_PARTE[p.estado].t}</span></li>
            {/each}
          </ul>
          <small>{hace(d.created_at, panel.ahora)}</small>
        </article>
      {/each}
    </div>
  {:else}
    <p class="c-vacio">Cuando dos o más jugadores pagan una cancha o un pedido a medias con su saldo, aparece aquí con la parte de cada uno.</p>
  {/if}
</section>

<style>
  .grande { height: 46px; padding: 0 20px; font-size: 15px; }
  .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 16px; background: #fff; border: var(--c-borde); }
  .kpi b { font-size: 44px; }
  .tabla { overflow: hidden; margin-bottom: 18px; }
  tbody tr:not(.det) { cursor: pointer; }
  tr.on td { background: var(--q-accs) !important; }
  .jug { display: flex; align-items: center; gap: 10px; }
  .av { width: 34px; height: 34px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex: none; }
  .cod { font-size: 22px; letter-spacing: 0.06em; }
  .bajo { color: var(--c-error); }
  .ult { color: var(--q-tx2); font-size: 12.5px; }
  .det td { background: var(--q-bg); padding: 10px 16px 14px; }
  .peds { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .peds li { display: flex; align-items: center; gap: 10px; font-size: 13px; }
  .qq { flex: 1; min-width: 0; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .v { min-width: 70px; text-align: right; }
  .cobro { display: flex; gap: 6px; align-items: center; margin-top: 10px; font-size: 13px; font-weight: 700; }
  .divs { display: flex; flex-direction: column; gap: 12px; }
  .grilla-d { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .div { padding: 14px; display: flex; flex-direction: column; gap: 6px; }
  .div.completa { border-color: rgba(24, 137, 91, 0.4); }
  .div header { display: flex; gap: 6px; flex-wrap: wrap; }
  .concepto { font-size: 14px; }
  .total-d { font-size: 30px; }
  .div ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .div li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .div li span:first-child { flex: 1; }
  .div small { color: var(--q-tx3); font-size: 12px; }
</style>
