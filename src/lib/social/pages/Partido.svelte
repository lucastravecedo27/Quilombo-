<script lang="ts">
  // Tu partido (el tiquete): banda de estado (⏳ APARTADA con el reloj para pagar, o ✓ PAGADA), el código de reserva,
  // los datos (club, dirección, fecha, hora, cancha, precio), quiénes van; la cancha (pagar completa o dividir:
  // cada uno su parte con su saldo); el bar del club (pedir a la cancha) y el resultado (vale cuando los 4 confirman).
  import { Page, f7 } from 'framework7-svelte';
  import { datos } from '$lib/data/datos.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Cabecera from '$lib/ui/Cabecera.svelte';
  import FotoPerfil from '../ui/perfil/FotoPerfil.svelte';
  import FilaCobro from '../ui/cobros/FilaCobro.svelte';
  import EstadoDivision from '../ui/saldo/EstadoDivision.svelte';
  import HojaResultado from '../ui/ranking/HojaResultado.svelte';
  import FilaResultado from '../ui/ranking/FilaResultado.svelte';
  import { resultadoDePartido } from '../app/resultados';
  import { apartar, buscarFranjas, canchas, cancelarPartido, clubes, codigoReserva, franjaCompleta, franjas, miRespuesta, pagarCancha, partido, responderPartido, respuestas } from '../app/jugar';
  import { cobrarPedido, divisionDe, productos } from '$lib/club/app/club';
  import { resumenItems, type Pedido } from '$lib/club/domain/club';
  import { primerNombre } from '../app/rituales';
  import { cobros, nombreDe, perfilDe, yo } from '../app/vinculos';
  import { confirmados, cuando, diaColombia, disponibles, faltan, horaColombia, pesos, type Respuesta } from '../domain/jugar';
  import { mmss, reloj } from '../ui/jugar/reloj.svelte';

  let { id }: { id: string } = $props();
  const p = $derived(partido(id));
  const f = $derived(franjaCompleta(p?.franja_id));
  const van = $derived(p ? confirmados(p, respuestas()) : []);
  const quedan = $derived(p ? faltan(p, respuestas()) : 0);
  const mia = $derived(miRespuesta(id));
  const soyCreador = $derived(p?.creador === yo());
  const gente = $derived(p ? [p.creador, ...p.invitados] : []);
  const estadoDe = (u: string) => (u === p?.creador ? 'voy' : respuestas().find((r) => r.partido_id === id && r.user_id === u)?.respuesta ?? null);
  // Los 4 lugares: primero los que van, luego los invitados que no han dicho que no, y los cupos libres
  const lugares = $derived.by(() => {
    if (!p) return [] as { u: string | null; e: string | null }[];
    const n = Math.max(4, p.cupos);
    const resto = gente.filter((u) => !van.includes(u) && estadoDe(u) !== 'no');
    const l: { u: string | null; e: string | null }[] = [...van, ...resto].slice(0, n).map((u) => ({ u, e: estadoDe(u) }));
    while (l.length < n) l.push({ u: null, e: null });
    return l;
  });
  const libres = $derived(p && !f ? (void datos.franjas.length, disponibles(franjas(), canchas(), clubes(), p.ciudad, diaColombia(p.cuando))) : []);
  const cobrosDe = $derived(cobros().filter((c) => c.partido_id === id && (c.acreedor === yo() || c.deudor === yo())));
  let ocupado = $state(false);

  // Trae las canchas libres de ese día y la franja del partido (jugar_disponibles incluye las de mis partidos)
  $effect(() => { if (p) void buscarFranjas(p.ciudad, diaColombia(p.cuando)); });

  async function responder(r: Respuesta) {
    toque(r === 'voy' ? 14 : 6);
    const err = await responderPartido(id, r);
    if (err) ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta' });
  }
  async function elegir(fid: string) {
    if (ocupado) return;
    ocupado = true; toque(10);
    const err = await apartar(fid, id);
    ocupado = false;
    ui.avisar(err ? { titulo: 'No se pudo apartar', sub: err, icono: 'alerta' } : { titulo: '¡Cancha apartada!', sub: 'Págala antes del plazo para no perderla', icono: 'check' });
  }
  /** Pagar entre varios: por defecto entre los que van */
  function dividir() {
    if (!f) return;
    toque();
    ui.dividir = { tipo: 'cancha', ref: f.id, total: f.precio, concepto: `Cancha · ${f.club.nombre} · ${f.cancha.nombre}`, club: f.club.id, gente: van };
  }
  const division = $derived(f ? divisionDe(f.id) : null);
  function pagar() {
    if (!f) return;
    toque();
    ui.pagar = {
      concepto: `${f.club.nombre} · ${f.cancha.nombre}`, detalle: `Reserva de cancha · ${cuando(f.inicio)}`, monto: f.precio, listo: '¡Reserva confirmada! Nos vemos en la cancha 🎾',
      accion: async (m) => {
        const r = await pagarCancha(id, m);
        if (r.url) { location.href = r.url; return null; }
        return r.error ?? null;
      }
    };
  }
  // Lo que pedí del bar a esta cancha
  const misPedidos = $derived(f ? (datos.pedidos as Pedido[]).filter((x) => x.franja_id === f.id && x.user_id === yo() && x.estado !== 'cancelado') : []);
  const hayCarta = $derived(f ? productos(f.club.id).some((x) => x.activo) : false);
  const ESTADO_PEDIDO: Record<string, string> = { nuevo: 'Recibido', preparando: 'Preparando', entregado: 'Entregado · por pagar', pagado: 'Pagado ✓' };
  const estadoPedido = (x: Pedido) => (x.pagado_en && x.estado !== 'pagado' ? `${ESTADO_PEDIDO[x.estado].replace(' · por pagar', '')} · pagado ✓` : ESTADO_PEDIDO[x.estado] ?? x.estado);
  const pagadoPedido = (x: Pedido) => x.estado === 'pagado' || !!x.pagado_en;
  function pagarPedido(x: Pedido) {
    toque();
    ui.pagar = { concepto: `Pedido #${x.numero} · ${x.ubicacion}`, detalle: resumenItems(x.items), monto: x.total, listo: '¡Pedido pagado! Salud 🍻', accion: (m) => cobrarPedido(x.id, m) };
  }
  function dividirPedido(x: Pedido) {
    toque();
    ui.dividir = { tipo: 'pedido', ref: x.id, total: x.total, concepto: `Pedido #${x.numero} · ${x.ubicacion}`, club: x.club_id, gente: van };
  }
  const fechaCorta = (iso: string) => {
    const t = new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace(/\./g, '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  function cancelar() {
    f7.dialog.confirm('Se le avisa a los invitados y la cancha queda libre.', 'Cancelar el partido', async () => {
      const err = await cancelarPartido(id);
      ui.avisar(err ? { titulo: 'No se pudo', sub: err, icono: 'alerta' } : { titulo: 'Partido cancelado' });
    });
  }
  // El resultado (vale cuando los 4 lo confirman)
  const res = $derived(resultadoDePartido(id));
  let hojaResultado = $state(false);
  const BADGE: Record<string, string> = { voy: '✓', quizas: '❔', no: '✖' };
</script>

<Page name="partido" class="pa-partido" noNavbar>
  <Cabecera titulo="Tu partido" />
  {#if !p}
    <p class="q-vacio">Este partido ya no está disponible.</p>
  {:else}
    {#if f}
      {@const pagada = f.estado === 'pagada'}
      {@const cancelado = p.estado === 'cancelado'}
      <section class="ticket" class:cancelado aria-label="Tu reserva">
        <div class="banda" class:pagada class:cancelado>
          <span class="b-tx">
            <b>{cancelado ? 'Cancelado' : pagada ? '✓ Pagada' : '⏳ Apartada'}</b>
            <small>{cancelado ? 'La cancha quedó libre' : pagada ? 'Reserva confirmada' : f.apartada_hasta ? `Tienes hasta las ${horaColombia(f.apartada_hasta)}` : 'Falta pagar la cancha'}</small>
          </span>
          {#if !pagada && !cancelado && f.apartada_hasta}<b class="reloj" aria-label="Quedan {mmss(f.apartada_hasta, reloj.ahora)} para pagar">{mmss(f.apartada_hasta, reloj.ahora)}</b>{/if}
        </div>
        <div class="codigo">
          <small>Código de reserva</small>
          <b>{codigoReserva(f.id)}</b>
        </div>
        <dl>
          <div><dt>Club</dt><dd>{f.club.nombre}</dd></div>
          <div><dt>Dirección</dt><dd>{f.club.direccion ?? f.club.zona ?? f.club.ciudad}</dd></div>
          <div><dt>Fecha</dt><dd>{fechaCorta(f.inicio)}</dd></div>
          <div><dt>Hora</dt><dd>{horaColombia(f.inicio)} – {horaColombia(f.fin)}</dd></div>
          <div><dt>Cancha</dt><dd>{f.cancha.nombre} · {f.cancha.techada ? 'techada' : 'al aire'}</dd></div>
          <div><dt>Precio</dt><dd>{pesos(f.precio)}</dd></div>
        </dl>
        <div class="corte" aria-hidden="true"><i></i><i></i></div>
        <div class="van">
          <span class="van-cab"><small>Quiénes van</small><small class="cuantos">{van.length === 1 ? 'Solo tú por ahora' : `${van.length} van`}{quedan ? ` · faltan ${quedan}` : ' · ¡completos!'}</small></span>
          <div class="caras">
            {#each lugares as l, k (l.u ?? `libre-${k}`)}
              <span class="lugar">
                {#if l.u}
                  <span class="cara" class:duda={l.e !== 'voy'}><FotoPerfil perfil={perfilDe(l.u) ?? { nombre: nombreDe(l.u), color: '#1e7fd0' }} size={46} /><i>{BADGE[l.e ?? 'quizas']}</i></span>
                  <small>{l.u === yo() ? 'Tú' : primerNombre(nombreDe(l.u))}</small>
                {:else}
                  <span class="cara hueco">+</span><small class="libre">Libre</small>
                {/if}
              </span>
            {/each}
          </div>
        </div>
        {#if p.nota}<p class="nota-p">“{p.nota}”</p>{/if}
      </section>
    {:else}
      <section class="cab-sin" class:cancelado={p.estado === 'cancelado'}>
        <span class="cuando">📅 {cuando(p.cuando)}</span>
        <h1>Partido en {p.ciudad}</h1>
        <small>{p.estado === 'cancelado' ? 'Cancelado' : 'Aún sin cancha'}</small>
        {#if p.nota}<p class="nota-p">“{p.nota}”</p>{/if}
      </section>
    {/if}

    {#if !soyCreador && p.estado !== 'cancelado'}
      <div class="resp" role="group" aria-label="Tu respuesta">
        <button class:on={mia === 'voy'} onclick={() => responder('voy')}>🎾 Voy</button>
        <button class:on={mia === 'quizas'} onclick={() => responder('quizas')}>Quizás</button>
        <button class:on={mia === 'no'} onclick={() => responder('no')}>No puedo</button>
      </div>
    {/if}

    {#if p.estado !== 'cancelado'}
      {#if !f}
        <h2 class="q-h2">Apartar cancha · {p.ciudad}</h2>
        {#if libres.length}
          <div class="franjas">
            {#each libres as x (x.id)}
              <button disabled={ocupado} onclick={() => elegir(x.id)} aria-label="Apartar {horaColombia(x.inicio)} en {x.club.nombre}">
                <b>{horaColombia(x.inicio)}</b><span>{x.club.nombre}</span><small>{x.cancha.nombre} · {pesos(x.precio)}</small>
              </button>
            {/each}
          </div>
        {:else}
          <p class="nota">No hay canchas libres ese día en {p.ciudad}.</p>
        {/if}
      {:else}
        <h2 class="q-h2">La cancha</h2>
        <div class="cancha">
          <div class="total"><span>Total cancha</span><b>{pesos(f.precio)}</b></div>
          {#if division}
            <EstadoDivision d={division} />
          {:else if f.estado === 'pagada'}
            <p class="pagada">✓ Cancha pagada · nos vemos en la cancha</p>
          {:else}
            <div class="botones">
              <button class="pagar" aria-label="Pagar la cancha · {pesos(f.precio)}" disabled={ocupado} onclick={pagar}>Pagar</button>
              <button class="dividir" aria-label="Pagar entre varios (mitad y mitad)" disabled={ocupado} onclick={dividir}>✂️ Dividir</button>
            </div>
          {/if}
        </div>
        {#if hayCarta}
          <h2 class="q-h2">Bar del club</h2>
          <button class="pedir" onclick={() => { toque(); ui.pedir = { partido: id }; }}>
            <span class="p-ico" aria-hidden="true">🍹</span>
            <span class="p-tx"><b>Pedir a la cancha</b><small>Te lo llevan a la {f.cancha.nombre} mientras juegas</small></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>
          </button>
          <button class="a-cuenta" onclick={() => { toque(); ui.tarjeta = true; }}>🛳️ ¿Mejor con tu tarjeta? El mesero la escanea y se paga con tu saldo · <b>Tu tarjeta</b></button>
          {#if misPedidos.length}
            <div class="pedidos" aria-label="Tus pedidos">
              {#each misPedidos as x (x.id)}
                {@const dv = divisionDe(x.id)}
                <div class="pedido">
                  <span class="p-cab"><b>Pedido #{x.numero}</b><span class="p-estado {pagadoPedido(x) ? 'pagado' : x.estado}">{estadoPedido(x)}</span></span>
                  <small>{resumenItems(x.items)}</small>
                  {#if dv}
                    <EstadoDivision d={dv} />
                  {:else}
                    <span class="p-pie"><b>{pesos(x.total)}</b>{#if !pagadoPedido(x)}<span class="p-bts"><button class="q-btn chico suave" onclick={() => dividirPedido(x)}>✂️ Dividir</button><button class="q-btn chico" onclick={() => pagarPedido(x)}>Pagar</button></span>{/if}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
        {#if cobrosDe.length}
          <div class="q-lista cobros">{#each cobrosDe as c (c.id)}<div class="q-fila"><FilaCobro {c} /></div>{/each}</div>
        {/if}
      {/if}

      {#if res || van.length >= 2}
        <h2 class="q-h2">Resultado</h2>
        {#if res}
          <div class="q-lista res"><FilaResultado r={res} uid={yo()} /></div>
        {:else}
          <div class="res-vacio">
            <button class="registrar" onclick={() => { toque(); hojaResultado = true; }}>🎾 Registrar resultado</button>
            <small>Cuenta para el ranking cuando los 4 lo confirmen.</small>
          </div>
        {/if}
      {/if}
      {#if soyCreador}<button class="cancelar" onclick={cancelar}>Cancelar el partido</button>{/if}
    {/if}
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

{#if p}<HojaResultado bind:abierto={hojaResultado} partido={id} club={f?.club.id ?? p.club_id} gente={[...new Set([...van, ...gente])]} />{/if}

<style>
  :global(.page.pa-partido .page-content) { font-family: var(--q-font); }
  /* El tiquete */
  .ticket { position: relative; margin: 0 16px; border-radius: 20px; background: var(--q-card); border: 1px solid var(--q-line); box-shadow: 0 12px 30px rgba(14, 27, 51, 0.08); }
  .ticket.cancelado { opacity: 0.7; }
  .banda { padding: 14px 18px; border-radius: 20px 20px 0 0; background: var(--q-acc); color: var(--q-acctx); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .banda.pagada { background: var(--q-ok); color: #fff; }
  .banda.cancelado { background: var(--q-tx3); color: #fff; }
  .b-tx { display: flex; flex-direction: column; }
  .b-tx b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; line-height: 1; text-transform: uppercase; }
  .b-tx small { font-size: 13px; font-weight: 700; opacity: 0.9; }
  .reloj { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 40px; line-height: 1; font-variant-numeric: tabular-nums; }
  .codigo { padding: 16px 18px 6px; display: flex; flex-direction: column; gap: 2px; }
  .codigo small, dt, .van-cab small:first-child { font-size: 11.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--q-tx2); text-transform: uppercase; }
  .codigo b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 54px; line-height: 0.95; letter-spacing: 0.12em; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 12px; margin: 0; padding: 10px 18px 18px; }
  dl div { min-width: 0; display: flex; flex-direction: column; }
  dt { letter-spacing: 0.08em; }
  dd { margin: 0; font-size: 15.5px; font-weight: 800; }
  .corte { position: relative; height: 0; border-top: 2px dashed var(--q-line); margin: 0 14px; }
  .corte i { position: absolute; top: -13px; width: 24px; height: 24px; border-radius: 12px; background: var(--q-bg); }
  .corte i:first-child { left: -27px; box-shadow: inset -1px 0 0 var(--q-line); }
  .corte i:last-child { right: -27px; box-shadow: inset 1px 0 0 var(--q-line); }
  .van { padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 10px; }
  .van-cab { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .van-cab .cuantos { font-size: 12.5px; font-weight: 800; color: var(--q-tx2); }
  .caras { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .lugar { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
  .lugar small { font-size: 12px; font-weight: 800; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lugar small.libre { color: var(--q-tx3); }
  .cara { position: relative; display: inline-flex; }
  .cara.duda { opacity: 0.55; }
  .cara i { position: absolute; right: -3px; bottom: -3px; width: 20px; height: 20px; border-radius: 10px; background: var(--q-card); font-style: normal; font-size: 11px; font-weight: 900; color: var(--q-ok); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 1px var(--q-line); }
  .hueco { width: 46px; height: 46px; border-radius: 23px; border: 1.5px dashed var(--q-borde); color: var(--q-tx3); font-size: 20px; font-weight: 800; align-items: center; justify-content: center; box-sizing: border-box; }
  .nota-p { margin: 0; padding: 0 18px 16px; font-size: 14px; font-weight: 700; color: var(--q-tx2); }
  .cab-sin { margin: 0 16px; padding: 18px; border-radius: 18px; background: #0e1b33; color: #fff; display: flex; flex-direction: column; gap: 4px; }
  .cab-sin.cancelado { opacity: 0.6; }
  .cuando { font-size: 14px; font-weight: 900; opacity: 0.8; }
  .cab-sin h1 { margin: 0; font-size: 30px; font-weight: 900; line-height: 1; }
  .cab-sin small { font-size: 14px; font-weight: 700; opacity: 0.85; }
  .cab-sin .nota-p { padding: 6px 0 0; color: #fff; }
  .resp { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 16px 0; }
  .resp button { height: 46px; border: 0; border-radius: 12px; background: var(--q-sub); color: var(--q-tx); font-size: 15px; font-weight: 900; }
  .resp button.on { background: var(--q-acc); color: var(--q-acctx); }
  .nota { margin: 0 20px; font-size: 14px; color: var(--q-tx2); }
  .franjas { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px 4px; scrollbar-width: none; }
  .franjas button { flex-shrink: 0; width: 150px; border: 1px solid var(--q-line); border-radius: 14px; padding: 12px; background: var(--q-card); color: var(--q-tx); text-align: left; display: flex; flex-direction: column; gap: 2px; }
  .franjas b { font-family: var(--q-font-titulo); font-style: italic; font-size: 24px; font-weight: 900; }
  .franjas span { font-size: 13.5px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .franjas small { font-size: 12px; color: var(--q-tx2); }
  /* La cancha */
  .cancha { margin: 0 16px; padding: 14px; border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); display: flex; flex-direction: column; gap: 12px; }
  .total { display: flex; justify-content: space-between; align-items: baseline; }
  .total span { font-size: 15px; font-weight: 700; }
  .total b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 30px; }
  .pagada { margin: 0; font-weight: 800; color: var(--q-ok); }
  .botones { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .botones button { height: 48px; border: 0; border-radius: 12px; font-size: 16px; font-weight: 900; }
  .botones .pagar { background: var(--q-acc); color: var(--q-acctx); }
  .botones .dividir { background: var(--q-sub); color: var(--q-tx); }
  .botones button:disabled { opacity: 0.5; }
  /* Bar */
  .pedir { display: flex; align-items: center; gap: 12px; width: calc(100% - 32px); margin: 0 16px; padding: 14px; border: 0; border-radius: 16px; background: #0e1b33; color: #fff; text-align: left; }
  :global(html.dark) .pedir { box-shadow: inset 0 0 0 1px rgba(220, 230, 255, 0.14); }
  .p-ico { width: 44px; height: 44px; flex: none; border-radius: 12px; background: var(--q-accd); font-size: 22px; display: flex; align-items: center; justify-content: center; }
  .p-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .p-tx b { font-size: 16px; }
  .p-tx small { font-size: 13px; opacity: 0.75; }
  .a-cuenta { display: block; margin: 8px 20px 0; border: 0; background: none; padding: 0; text-align: left; font-size: 13px; color: var(--q-tx2); }
  .a-cuenta b { color: var(--q-link); }
  .pedidos { display: flex; flex-direction: column; gap: 8px; margin: 10px 16px 0; }
  .pedido { padding: 12px 14px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); display: flex; flex-direction: column; gap: 4px; }
  .p-cab, .p-pie { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .p-cab b { font-size: 15px; }
  .pedido small { font-size: 13px; color: var(--q-tx2); }
  .p-pie b { font-size: 15px; }
  .p-estado { padding: 3px 9px; border-radius: 8px; font-size: 12.5px; font-weight: 800; color: var(--q-acctx); background: var(--q-acc); }
  .p-estado.preparando { background: var(--q-dorado); color: #fff; }
  .p-estado.entregado { background: #0e1b33; color: #fff; }
  .p-estado.pagado { background: var(--q-ok); color: #fff; }
  .p-bts { display: flex; gap: 6px; }
  .cobros { margin-top: 10px; }
  /* Resultado */
  .res-vacio { margin: 0 16px; display: flex; flex-direction: column; gap: 6px; }
  .registrar { height: 50px; border: 1.5px dashed var(--q-borde); border-radius: 14px; background: none; color: var(--q-tx); font-size: 15px; font-weight: 900; }
  .res-vacio small { font-size: 13px; color: var(--q-tx2); text-align: center; }
  .cancelar { display: block; margin: 22px auto 0; border: 0; background: none; color: var(--q-alr); font-weight: 800; font-size: 15px; }
</style>
