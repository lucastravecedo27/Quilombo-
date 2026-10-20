<script lang="ts">
  // Jugar: tu saldo, invitar y recargar; accesos (calendario, tu tarjeta, clases); tus reservas como tiquetes
  // (APARTADA con la cuenta regresiva o PAGADA con su código); las invitaciones; las canchas libres por ciudad y
  // día; y los torneos cerca ("Yo voy").
  import { Page } from 'framework7-svelte';
  import { datos } from '$lib/data/datos.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import TarjetaPartido from '../ui/feed/TarjetaPartido.svelte';
  import { buscarFranjas, canchas, ciudades, clubes, codigoReserva, franjaCompleta, franjas, miInscripcion, misPartidos, misReservas, torneos } from '../app/jugar';
  import { yo } from '../app/vinculos';
  import { resumenItems, type Pedido } from '$lib/club/domain/club';
  import { saldoQuilombo } from '$lib/club/app/club';
  import AvisoPartes from '../ui/saldo/AvisoPartes.svelte';
  import MisClases from '../ui/clases/MisClases.svelte';
  import { miPerfil } from '../app/perfil.svelte';
  import { diaColombia, disponibles, horaColombia, pesos } from '../domain/jugar';
  import { diaCorto, mmss, partirHora, reloj } from '../ui/jugar/reloj.svelte';

  const hoy = diaColombia(new Date().toISOString());
  const dias = Array.from({ length: 7 }, (_, i) => diaColombia(new Date(Date.now() + i * 86_400_000).toISOString()));
  const fechaDe = (d: string) => new Date(d + 'T12:00:00-05:00');
  const arriba = (d: string, i: number) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañ' : fechaDe(d).toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'America/Bogota' }).replace('.', ''));
  const nombreDia = (d: string, i: number) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fechaDe(d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', timeZone: 'America/Bogota' }));

  let elegida = $state<string | null>(null);
  let dia = $state(hoy);
  // La ciudad del perfil (o la primera con clubes) mientras la persona no elija otra
  const ciudad = $derived(elegida ?? miPerfil().ciudad ?? ciudades()[0] ?? 'Bogotá');
  $effect(() => { if (ciudad && dia) void buscarFranjas(ciudad, dia); });

  const reservas = $derived(misReservas().map((p) => ({ p, f: franjaCompleta(p.franja_id) })).filter((x) => x.f).sort((a, b) => a.f!.inicio.localeCompare(b.f!.inicio)));
  const invitaciones = $derived(misPartidos().filter((p) => !reservas.some((r) => r.p.id === p.id)));
  // Mi pedido del bar que sigue abierto (el más reciente)
  const pedido = $derived((datos.pedidos as Pedido[]).find((x) => x.user_id === yo() && x.estado !== 'pagado' && x.estado !== 'cancelado') ?? null);
  const partidoDelPedido = $derived(pedido ? reservas.find((r) => r.f?.id === pedido.franja_id)?.p.id ?? null : null);
  const ESTADO_PEDIDO: Record<string, string> = { nuevo: 'Recibido', preparando: 'Preparando', entregado: 'Entregado' };
  const libres = $derived((void datos.franjas.length, disponibles(franjas(), canchas(), clubes(), ciudad, dia)));
  const abiertos = $derived(torneos().filter((t) => t.estado === 'inscripciones'));
  const saldo = $derived(saldoQuilombo(yo()));
  const COLORES = ['#c2410c', '#3346a8', '#18895b'];
  const ciudadesUI = $derived([...new Set([...ciudades(), ciudad])].filter(Boolean));
</script>

<Page name="jugar" class="pa-jugar" noNavbar>
  <header class="cab">
    <h1>Jugar</h1>
    <button class="saldo-chip" onclick={() => { toque(); ui.navegar('/saldo/'); }} aria-label="Tu saldo Quilombo: {pesos(saldo)}">
      <span class="q" aria-hidden="true">Q</span><span class="s-txt"><small>Saldo</small><b>{pesos(saldo)}</b></span>
    </button>
  </header>
  <div class="bts">
    <button class="primario" onclick={() => { toque(); ui.invitar = {}; }}>📅 Invitar a jugar</button>
    <button class="suave" aria-label="Recargar saldo" onclick={() => { toque(); ui.recargar = {}; }}>＋ Recargar</button>
  </div>
  <div class="atajos">
    <button class="atajo" aria-label="Mi calendario" onclick={() => { toque(); ui.navegar('/calendario/'); }}><span aria-hidden="true">🗓️</span><b>Mi calendario</b></button>
    <button class="atajo noche" aria-label="Tu tarjeta" onclick={() => { toque(); ui.navegar('/cuenta/'); }}><span aria-hidden="true">🛳️</span><b>Tu tarjeta</b></button>
    <button class="atajo clases-cta" aria-label="Clases con profe" onclick={() => { toque(); ui.navegar('/clases/'); }}><span aria-hidden="true">🎓</span><b>Clases con profe</b></button>
  </div>

  {#if pedido}
    <button class="pedido-vivo" onclick={() => { toque(); if (partidoDelPedido) ui.navegar(`/partido/${partidoDelPedido}/`); else ui.tarjeta = true; }}>
      <span class="pv-emoji" aria-hidden="true">🍹</span>
      <span class="pv-txt"><b>Pedido #{pedido.numero} · {ESTADO_PEDIDO[pedido.estado]}{pedido.pagado_en ? ' · pagado ✓' : ''}</b><small>{resumenItems(pedido.items)} · {pedido.ubicacion}</small></span>
    </button>
  {/if}

  <div class="partes"><AvisoPartes /></div>

  <h2 class="q-h2">Tus reservas</h2>
  {#if reservas.length}
    <div class="reservas">
      {#each reservas as { p, f } (p.id)}
        {@const h = partirHora(f!.inicio)}
        {@const pagada = f!.estado === 'pagada'}
        <button class="reserva" class:pagada onclick={() => { toque(); ui.navegar(`/partido/${p.id}/`); }}>
          <span class="talon"><small>{diaCorto(f!.inicio)}</small><b>{h.hora}</b><small>{h.ampm}</small></span>
          <span class="r-tx">
            <span class="r-cab"><b>{f!.club.nombre}</b><em>{pagada ? '✓ Pagada' : '⏳ Apartada'}</em></span>
            <small>{f!.cancha.nombre} · {pesos(f!.precio)}</small>
            <small class="nota">{pagada ? `Código ${codigoReserva(f!.id)}` : f!.apartada_hasta ? `Paga antes de las ${horaColombia(f!.apartada_hasta)} · quedan ${mmss(f!.apartada_hasta, reloj.ahora)}` : 'Falta pagar'}</small>
          </span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="nota-vacia">No tienes canchas reservadas. Elige una libre aquí abajo 👇</p>
  {/if}

  <MisClases titulo="Tus clases" />

  {#if invitaciones.length}
    <h2 class="q-h2">Te invitaron</h2>
    <div class="lista">{#each invitaciones as p (p.id)}<TarjetaPartido partido={p} />{/each}</div>
  {/if}

  <div class="sec"><h2>Canchas libres</h2><small>{libres.length} turnos</small></div>
  <div class="fila-chips" role="tablist" aria-label="Ciudad">
    {#each ciudadesUI as c (c)}
      <button role="tab" class="ciudad" aria-selected={ciudad === c} class:on={ciudad === c} onclick={() => { toque(4); elegida = c; }}>📍 {c}</button>
    {/each}
  </div>
  <div class="fila-chips dias" role="tablist" aria-label="Día">
    {#each dias as d, i (d)}
      <button role="tab" class="dia" aria-label={nombreDia(d, i)} aria-selected={dia === d} class:on={dia === d} onclick={() => { toque(4); dia = d; }}><small>{arriba(d, i)}</small><b>{fechaDe(d).getUTCDate()}</b></button>
    {/each}
  </div>
  {#if libres.length}
    <div class="franjas">
      {#each libres as f (f.id)}
        {@const h = partirHora(f.inicio)}
        <button class="franja" onclick={() => { toque(); ui.reservar = { franja: f.id }; }} aria-label="{horaColombia(f.inicio)} en {f.club.nombre}, {f.cancha.nombre}, {pesos(f.precio)}. Reservar">
          <span class="f-hora"><b>{h.hora}</b><small>{h.ampm}</small></span>
          <span class="club">{f.club.nombre}</span>
          <small>{f.cancha.nombre} · {f.cancha.techada ? 'techada' : 'al aire'}</small>
          <span class="f-pie"><b>{pesos(f.precio)}</b><em>Reservar</em></span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="nota-vacia">No hay canchas libres en {ciudad} ese día. Prueba otro día u otra ciudad.</p>
  {/if}

  <h2 class="q-h2">Torneos cerca</h2>
  {#if abiertos.length}
    <div class="torneos">
      {#each abiertos as t, k (t.id)}
        {@const ins = miInscripcion(t.id)}
        {@const color = COLORES[k % COLORES.length]}
        <div class="torneo" role="button" tabindex="0" style="--c:{color}" onclick={() => { toque(); ui.navegar(`/torneo/${t.id}/`); }} onkeydown={(e) => { if (e.key === 'Enter') ui.navegar(`/torneo/${t.id}/`); }}>
          <span class="t-tx">
            <b>🏆 {t.nombre}</b>
            <small>{t.ciudad} · {new Date(t.inicio).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace(/\./g, '')} · {t.categorias.map((c) => c + 'ª').join(', ')}</small>
            <small>{t.cupos - t.inscritos} cupos · {t.precio ? pesos(t.precio) + ' por pareja' : 'Gratis'}</small>
          </span>
          <button class="yo-voy" onclick={(e) => { e.stopPropagation(); toque(); if (ins) ui.navegar(`/torneo/${t.id}/`); else ui.inscribir = { torneo: t.id }; }}>{ins?.estado === 'inscrito' ? '✓ Inscrito' : ins?.estado === 'comprobante' ? '⏳ Revisión' : ins ? 'Ver' : 'Yo voy'}</button>
        </div>
      {/each}
    </div>
  {:else}
    <p class="nota-vacia">No hay torneos con inscripciones abiertas por ahora.</p>
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-jugar .page-content) { font-family: var(--q-font); }
  .cab { display: flex; align-items: flex-end; justify-content: space-between; padding: calc(env(safe-area-inset-top, 0px) + 6px) 16px 4px 20px; }
  h1 { margin: 0; font-size: 50px; font-weight: 900; line-height: 0.9; }
  .saldo-chip { display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border: 0; border-radius: 12px; background: #0e1b33; color: #fff; }
  :global(html.dark) .saldo-chip { box-shadow: inset 0 0 0 1px rgba(220, 230, 255, 0.14); }
  .saldo-chip .q { width: 30px; height: 30px; border-radius: 8px; background: var(--q-accd); color: var(--q-acctx); font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 18px; display: flex; align-items: center; justify-content: center; }
  :global(html[data-acento='noche']) .saldo-chip .q { color: #0e1b33; }
  .s-txt { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.05; }
  .s-txt small { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; }
  .s-txt b { font-size: 16px; font-weight: 800; }
  .bts { display: flex; gap: 8px; padding: 12px 16px 0 20px; }
  .bts button { flex: none; white-space: nowrap; height: 40px; padding: 0 16px; border: 0; border-radius: 10px; font-size: 14px; font-weight: 900; }
  .primario { background: var(--q-acc); color: var(--q-acctx); }
  .suave { background: var(--q-sub); color: var(--q-tx); }
  .atajos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 14px 16px 0; }
  .atajo { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px; border: 1px solid var(--q-line); border-radius: 14px; background: var(--q-card); color: var(--q-tx); text-align: left; }
  .atajo span { font-size: 22px; }
  .atajo b { font-size: 14px; line-height: 1.15; }
  .atajo.noche { background: #0e1b33; border-color: #0e1b33; color: #fff; }
  :global(html.dark) .atajo.noche { border-color: rgba(220, 230, 255, 0.14); }
  .pedido-vivo { display: flex; align-items: center; gap: 12px; width: calc(100% - 32px); margin: 12px 16px 0; padding: 12px; border: 0; border-radius: 14px; background: #0e1b33; color: #fff; text-align: left; }
  .pv-emoji { width: 40px; height: 40px; border-radius: 10px; background: var(--q-accd); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
  .pv-txt { min-width: 0; display: flex; flex-direction: column; }
  .pv-txt b { font-size: 15px; }
  .pv-txt small { font-size: 12.5px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .partes { margin-top: 12px; }
  .partes:empty { display: none; }

  /* Tus reservas: tiquete con talón de 84 px (azul noche si está apartada, verde si está pagada) */
  .reservas { display: flex; flex-direction: column; gap: 8px; margin: 0 16px; }
  .reserva { position: relative; display: flex; align-items: stretch; padding: 0; border: 1px solid var(--q-line); border-radius: 14px; background: var(--q-card); color: var(--q-tx); text-align: left; overflow: hidden; }
  .talon { width: 84px; flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0e1b33; color: #fff; border-right: 1.5px dashed rgba(255, 255, 255, 0.35); padding: 10px 0; }
  :global(html.dark) .talon { background: #1b2847; }
  .pagada .talon, :global(html.dark) .pagada .talon { background: #18895b; }
  .talon small { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.85; }
  .talon b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 28px; line-height: 1; }
  .r-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; }
  .r-cab { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .r-cab b { font-size: 15.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .r-cab em { flex: none; font-style: normal; font-size: 11.5px; font-weight: 900; padding: 3px 8px; border-radius: 8px; background: var(--q-acc); color: var(--q-acctx); text-transform: uppercase; }
  .pagada .r-cab em { background: var(--q-ok); color: #fff; }
  .r-tx small { font-size: 13px; color: var(--q-tx2); }
  .r-tx .nota { font-size: 12.5px; font-weight: 800; color: var(--q-acct); font-variant-numeric: tabular-nums; }
  .pagada .r-tx .nota { color: var(--q-ok); }
  .nota-vacia { margin: 0 20px; font-size: 14px; color: var(--q-tx2); line-height: 1.4; }
  .lista { display: flex; flex-direction: column; gap: 8px; margin: 0 16px; }

  /* Canchas libres */
  .sec { display: flex; align-items: baseline; justify-content: space-between; margin: 24px 20px 10px; }
  .sec h2 { margin: 0; font-size: 22px; font-weight: 800; }
  .sec small { font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .fila-chips { display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 8px; scrollbar-width: none; }
  .fila-chips::-webkit-scrollbar { display: none; }
  .fila-chips.dias { padding-bottom: 10px; }
  .ciudad { flex: none; height: 36px; padding: 0 14px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-size: 14px; font-weight: 900; }
  .ciudad.on { background: var(--q-acc); color: var(--q-acctx); }
  .dia { flex: none; min-width: 58px; height: 56px; padding: 0 10px; border: 1px solid var(--q-line); border-radius: 12px; background: var(--q-card); color: var(--q-tx); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; }
  .dia small { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8; }
  .dia b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 22px; line-height: 1; }
  .dia.on { background: #0e1b33; border-color: #0e1b33; color: #fff; }
  :global(html.dark) .dia.on { background: var(--q-acc); border-color: var(--q-acc); }
  .franjas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0 16px; }
  .franja { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 12px; border: 1px solid var(--q-line); border-radius: 14px; background: var(--q-card); color: var(--q-tx); text-align: left; min-width: 0; }
  .f-hora { display: flex; align-items: baseline; gap: 4px; }
  .f-hora b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 30px; line-height: 1; }
  .f-hora small { font-size: 12px; font-weight: 800; color: var(--q-tx2); }
  .franja .club { font-size: 14px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .franja > small { font-size: 12px; color: var(--q-tx2); }
  .f-pie { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 8px; }
  .f-pie b { font-size: 13.5px; }
  .f-pie em { font-style: normal; font-size: 12.5px; font-weight: 900; padding: 4px 10px; border-radius: 10px; background: var(--q-acc); color: var(--q-acctx); }

  /* Torneos cerca: tarjetas sólidas de color con "Yo voy" blanco */
  .torneos { display: flex; flex-direction: column; gap: 8px; margin: 0 16px; }
  .torneo { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 14px; background: var(--c); color: #fff; cursor: pointer; }
  .t-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .t-tx b { font-size: 16.5px; font-weight: 900; }
  .t-tx small { font-size: 13px; font-weight: 700; opacity: 0.9; }
  .yo-voy { flex: none; height: 38px; padding: 0 14px; border: 0; border-radius: 10px; background: #fff; color: var(--c); font-size: 14px; font-weight: 900; }
</style>
