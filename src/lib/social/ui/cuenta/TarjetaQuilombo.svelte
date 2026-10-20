<script lang="ts">
  // La Tarjeta Quilombo (pieza estrella): tarjeta de socio azul noche con el aro del acento y un brillo que la cruza,
  // el QR único y para siempre (quilombo:tarjeta:CÓDIGO), el código de 6, quién soy y mi saldo. Debajo: pedir, poner
  // tope, dividir y lo consumido hoy (todo pagado con saldo). La usan el botón Q (encima de todo) y /cuenta/.
  import QRCode from 'qrcode';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { abrirCuenta, elClub, miCuenta, pedidosDeCuenta, ponerTope, saldoCuenta, saldoQuilombo, tarjetaDe } from '$lib/club/app/club';
  import { CLUB_DEMO, qrTarjeta, resumenItems, type Pedido } from '$lib/club/domain/club';
  import { miPerfil } from '../../app/perfil.svelte';
  import { nombreDe, yo } from '../../app/vinculos';
  import { textoCategoria } from '../../domain/padel';
  import { pesos } from '../../domain/jugar';

  /** Al abrir otra pantalla desde la tarjeta (saldo), quien la muestra decide cómo (cerrar el overlay, navegar…) */
  let { irASaldo }: { irASaldo: () => void } = $props();

  const sede = $derived(elClub(CLUB_DEMO));
  const yoP = $derived(miPerfil());
  const codigo = $derived(tarjetaDe(yo()));
  const saldo = $derived(saldoQuilombo(yo()));
  const cuenta = $derived(miCuenta(yo()));
  const pedidos = $derived(cuenta ? pedidosDeCuenta(cuenta.id).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)) : []);
  const consumo = $derived(cuenta ? saldoCuenta(cuenta.id) : 0);
  const pctTope = $derived(cuenta?.tope ? Math.min(100, Math.round((consumo / cuenta.tope) * 100)) : 0);
  const club = $derived(yoP.club_base ? yoP.club_base.replace(/^Pádel Club /, '') : '');

  let qr = $state('');
  $effect(() => {
    const c = codigo;
    void QRCode.toDataURL(qrTarjeta(c), { margin: 0, width: 528, errorCorrectionLevel: 'M', color: { dark: '#0e1b33', light: '#ffffff' } }).then((u) => (qr = u));
  });

  const TOPES = [null, 100_000, 200_000, 300_000];
  let verTopes = $state(false);
  async function tope(t: number | null) {
    toque(4);
    const c = cuenta ?? (await abrirCuenta(yo(), nombreDe(yo()), null, CLUB_DEMO));
    await ponerTope(c.id, t);
    verTopes = false;
  }
  const ENTREGA: Record<string, string> = { nuevo: 'Recibido', preparando: 'Preparando', entregado: 'Entregado', pagado: 'Entregado', cancelado: 'Cancelado' };
  const pagado = (p: Pedido) => !!p.pagado_en || p.estado === 'pagado';
</script>

<section class="tarjeta" aria-label="Tu tarjeta Quilombo">
  <span class="aro" aria-hidden="true"></span>
  <span class="aro2" aria-hidden="true"></span>
  <span class="brillo" aria-hidden="true"></span>
  <header><b class="marca">QUILOMBO</b><small>TARJETA DE SOCIO</small></header>
  <div class="qr"><div class="blanco">{#if qr}<img src={qr} alt="QR de tu tarjeta {codigo}" />{:else}<span class="vacio"></span>{/if}</div></div>
  <b class="codigo" aria-label="Código {codigo.split('').join(' ')}">{codigo}</b>
  <footer>
    <span class="quien"><b>{yoP.nombre}</b><small>{textoCategoria(yoP.categoria) || 'Jugador'}{yoP.ciudad ? ` · ${yoP.ciudad}` : ''}{club ? ` · ${club}` : ''}</small></span>
    <button class="saldo-t" onclick={() => { toque(); irASaldo(); }} aria-label="Saldo {pesos(saldo)}"><small>SALDO</small><b>{pesos(saldo)}</b></button>
  </footer>
</section>
<p class="ayuda">Muéstrale tu tarjeta al mesero: lo que pidas se descuenta de tu saldo.</p>

<div class="acciones">
  <button class="pedir" aria-label="Pedir desde aquí" onclick={() => { toque(); ui.pedir = { tarjeta: CLUB_DEMO }; }}><span aria-hidden="true">🍹</span>Pedir</button>
  <button aria-label={cuenta?.tope ? 'Cambiar tope de hoy' : 'Ponerle un tope a hoy'} aria-expanded={verTopes} onclick={() => { toque(4); verTopes = !verTopes; }}><span aria-hidden="true">🛑</span>{cuenta?.tope ? `Tope ${Math.round(cuenta.tope / 1000)} mil` : 'Poner tope'}</button>
  <button aria-label="Dividir entre varios" onclick={() => { toque(); ui.pedir = { tarjeta: CLUB_DEMO, dividir: true }; }}><span aria-hidden="true">✂️</span>Dividir</button>
</div>
{#if verTopes}
  <div class="topes" role="radiogroup" aria-label="Tope de consumo de hoy">
    {#each TOPES as t (t ?? 0)}<button role="radio" aria-checked={(cuenta?.tope ?? null) === t} class:on={(cuenta?.tope ?? null) === t} onclick={() => tope(t)}>{t ? pesos(t) : 'Sin tope'}</button>{/each}
  </div>
{/if}

{#if cuenta && pedidos.length}
  <div class="hoy">
    <span class="q-over">Hoy en {sede?.nombre ?? 'el club'}</span>
    <span class="hoy-fila"><b class="consumo">{pesos(consumo)}</b><small>{pedidos.length} pedido{pedidos.length === 1 ? '' : 's'}</small></span>
    {#if cuenta.tope}
      <div class="tope-barra" role="meter" aria-valuenow={consumo} aria-valuemin={0} aria-valuemax={cuenta.tope} aria-label="Consumo frente al tope"><i class:alto={pctTope >= 80} style="width:{pctTope}%"></i></div>
      <small class="tope-txt">Tope {pesos(cuenta.tope)} · quedan {pesos(Math.max(0, cuenta.tope - consumo))}</small>
    {/if}
  </div>
  <h2 class="q-h2">Consumos de hoy</h2>
  <div class="lista">
    {#each pedidos as p (p.id)}
      <div class="pedido">
        <span class="em" aria-hidden="true">{p.items[0]?.emoji ?? '🍹'}</span>
        <span class="tx"><b>{resumenItems(p.items)}</b><small>#{p.numero} · {p.ubicacion} · {pagado(p) ? 'Pagado con saldo ✓' : 'Por pagar'} · {ENTREGA[p.estado]}</small></span>
        <b class="total">{pesos(p.total)}</b>
      </div>
    {/each}
  </div>
{:else}
  <h2 class="q-h2">Consumos de hoy</h2>
  <div class="sin">
    <b>Sin consumos hoy</b>
    <span>Muéstrale tu tarjeta al mesero para pedir, o pide tú desde aquí. Se paga con tu saldo al momento.</span>
    {#if cuenta?.tope}<small class="tope-txt">Tope {pesos(cuenta.tope)} · quedan {pesos(Math.max(0, cuenta.tope - consumo))}</small>{/if}
  </div>
{/if}

<style>
  .tarjeta { position: relative; margin: 0 20px; padding: 20px 20px 18px; border-radius: 22px; background: #0e1b33; color: #fff; border: 1px solid rgba(220, 230, 255, 0.16); box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45); overflow: hidden; }
  .aro { position: absolute; right: -70px; top: -70px; width: 220px; height: 220px; border-radius: 50%; border: 26px solid var(--q-accd); box-sizing: border-box; }
  .aro2 { position: absolute; left: -60px; bottom: -110px; width: 220px; height: 220px; border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, 0.1); }
  .brillo { position: absolute; top: -40%; left: 0; width: 60px; height: 180%; background: rgba(255, 255, 255, 0.07); animation: q-brillo 5s ease-in-out infinite; pointer-events: none; }
  header { position: relative; display: flex; flex-direction: column; }
  .marca { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; letter-spacing: 0.08em; line-height: 1; }
  header small { font-size: 11px; font-weight: 800; letter-spacing: 0.18em; opacity: 0.65; }
  .qr { position: relative; display: flex; justify-content: center; margin: 22px 0 14px; }
  .blanco { padding: 12px; border-radius: 16px; background: #fff; }
  .blanco img, .vacio { display: block; width: 176px; height: 176px; image-rendering: pixelated; }
  .vacio { background: #e9e6de; }
  .codigo { position: relative; display: block; text-align: center; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 34px; letter-spacing: 0.32em; padding-left: 0.32em; line-height: 1.1; }
  footer { position: relative; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.12); }
  .quien { display: flex; flex-direction: column; min-width: 0; }
  .quien b { font-size: 16px; font-weight: 800; }
  .quien small { font-size: 12.5px; opacity: 0.7; font-weight: 600; }
  .saldo-t { display: flex; flex-direction: column; align-items: flex-end; border: 0; background: none; color: #fff; padding: 0; }
  .saldo-t small { font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; opacity: 0.65; }
  .saldo-t b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 30px; line-height: 1; }
  .ayuda { margin: 16px 28px 0; text-align: center; font-size: 14.5px; line-height: 1.4; color: #c9d1e3; text-wrap: pretty; }
  .acciones { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 18px 16px 0; }
  .acciones button { height: 64px; border: 0; border-radius: 14px; background: #1b2847; color: #fff; font-size: 14px; font-weight: 900; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
  .acciones button span { font-size: 20px; }
  .acciones .pedir { background: var(--q-accd); color: var(--q-acctx); }
  :global(html[data-acento='noche']) .acciones .pedir { color: #0e1b33; }
  .topes { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 10px 16px 0; }
  .topes button { height: 36px; padding: 0 12px; border: 0; border-radius: 10px; background: #1b2847; color: #fff; font-weight: 800; font-size: 13.5px; }
  .topes button.on { background: var(--q-accd); color: var(--q-acctx); }
  .hoy { margin: 18px 16px 0; padding: 14px; border-radius: 16px; background: #111c36; display: flex; flex-direction: column; gap: 4px; }
  .hoy .q-over { color: #93a0bc; }
  .hoy-fila { display: flex; align-items: baseline; justify-content: space-between; }
  .consumo { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 34px; line-height: 1; }
  .hoy-fila small { font-size: 13px; color: #93a0bc; font-weight: 700; }
  .tope-barra { height: 6px; border-radius: 3px; background: #1b2847; overflow: hidden; margin-top: 6px; }
  .tope-barra i { display: block; height: 100%; background: var(--q-ok); }
  .tope-barra i.alto { background: var(--q-rojo); }
  .tope-txt { font-size: 12.5px; color: #93a0bc; font-weight: 700; }
  .q-h2 { color: #fff; }
  .lista { margin: 0 16px; border-radius: 16px; background: #111c36; overflow: hidden; }
  .pedido { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
  .pedido + .pedido { border-top: 1px solid rgba(220, 230, 255, 0.09); }
  .em { width: 40px; height: 40px; flex: none; border-radius: 10px; background: #1b2847; font-size: 20px; display: flex; align-items: center; justify-content: center; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .tx b { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tx small { font-size: 12.5px; color: #93a0bc; }
  .total { font-size: 15px; white-space: nowrap; }
  .sin { margin: 0 16px; padding: 16px; border-radius: 16px; background: #111c36; display: flex; flex-direction: column; gap: 6px; text-align: center; }
  .sin b { font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 22px; font-weight: 800; }
  .sin span { font-size: 14px; color: #93a0bc; line-height: 1.4; }
</style>
