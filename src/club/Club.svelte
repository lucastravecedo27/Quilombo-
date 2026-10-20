<script lang="ts">
  // Panel del club: barra lateral (secciones + modo demo), la sección elegida y la columna "En vivo" con lo que va pasando
  import { onMount } from 'svelte';
  import { escucharSala } from '$lib/app/sala';
  import { arrancarDemo, hub } from '$lib/app/hub';
  import { datos } from '$lib/data/datos.svelte';
  import { actividad, cuentasAbiertas, elClub, franjasDe, pagos, pedidos, torneosDe } from '$lib/club/app/club';
  import { CLUB_DEMO, hace } from '$lib/club/domain/club';
  import { diaColombia, type Inscripcion } from '$lib/social/domain/jugar';
  import type { Resultado } from '$lib/social/domain/ranking';
  import { panel, empezarObservar, observarClases, observarCuentas, observarFranjas, observarInscripciones, observarPagos, observarPedidos, observarResultados, type Seccion } from './estado.svelte';
  import Hoy from './secciones/Hoy.svelte';
  import Agenda from './secciones/Agenda.svelte';
  import Bar from './secciones/Bar.svelte';
  import Cuentas from './secciones/Cuentas.svelte';
  import Carta from './secciones/Carta.svelte';
  import Torneos from './secciones/Torneos.svelte';
  import Ranking from './secciones/Ranking.svelte';
  import Clases from './secciones/Clases.svelte';
  import type { Clase } from '$lib/social/domain/clases';
  import Caja from './secciones/Caja.svelte';
  import Cajon from './ui/Cajon.svelte';
  import Avisos from './ui/Avisos.svelte';
  import ModalDemo from './ui/ModalDemo.svelte';
  import ModalProducto from './ui/ModalProducto.svelte';
  import ModalCobroTarjeta from './ui/ModalCobroTarjeta.svelte';
  import { ACENTOS, acento, cambiarAcento } from '$lib/ui/acento.svelte';

  let arrancado = $state(false);
  let conectado = $state(false);
  let demo = $state(false);

  const listo = $derived(arrancado && datos.franjas.length > 0 && datos.pagos.length > 0 && datos.pedidos.length > 0 && datos.actividad.length > 0);
  const club = $derived(elClub());
  const abiertos = $derived(pedidos().filter((p) => p.estado === 'nuevo' || p.estado === 'preparando' || p.estado === 'entregado').length);
  const nuevosBar = $derived(pedidos().filter((p) => p.estado === 'nuevo').length);
  const nCuentas = $derived(cuentasAbiertas().length);
  const misTorneos = $derived(torneosDe());
  const porRevisar = $derived((datos.inscripciones as Inscripcion[]).filter((i) => i.estado === 'comprobante' && misTorneos.some((t) => t.id === i.torneo_id)).length);
  const disputas = $derived((datos.resultados as Resultado[]).filter((r) => r.club_id === CLUB_DEMO && r.estado === 'disputado').length);
  const feed = $derived(actividad().slice(0, 40));
  const clasesClub = $derived((datos.clases as Clase[]).filter((c) => c.club_id === CLUB_DEMO));
  const clasesHoy = $derived(clasesClub.filter((c) => c.estado !== 'cancelada' && diaColombia(c.inicio) === diaColombia(new Date(panel.ahora).toISOString())).length);

  const SECCIONES: { id: Seccion; nombre: string; icono: string }[] = [
    { id: 'hoy', nombre: 'En vivo hoy', icono: '◉' },
    { id: 'agenda', nombre: 'Agenda', icono: '▦' },
    { id: 'bar', nombre: 'Bar y pedidos', icono: '🍹' },
    { id: 'cuentas', nombre: 'Tarjetas Quilombo', icono: '🛳️' },
    { id: 'clases', nombre: 'Clases con profe', icono: '🎓' },
    { id: 'torneos', nombre: 'Torneos', icono: '🏆' },
    { id: 'ranking', nombre: 'Ranking', icono: '📈' },
    { id: 'carta', nombre: 'Carta', icono: '☰' },
    { id: 'caja', nombre: 'Caja', icono: '$' }
  ];
  const globo = (id: Seccion): { n: number; fuerte: boolean } | null => {
    if (id === 'bar') return nuevosBar ? { n: nuevosBar, fuerte: true } : abiertos ? { n: abiertos, fuerte: false } : null;
    if (id === 'cuentas') return nCuentas ? { n: nCuentas, fuerte: false } : null;
    if (id === 'torneos') return porRevisar ? { n: porRevisar, fuerte: true } : null;
    if (id === 'ranking') return disputas ? { n: disputas, fuerte: true } : null;
    if (id === 'clases') return clasesHoy ? { n: clasesHoy, fuerte: false } : null;
    return null;
  };

  // Lo que llega en vivo: avisos y resaltados
  let observando = false;
  $effect(() => {
    if (!listo) return;
    const fs = franjasDe();
    const ps = pagos();
    const pe = pedidos();
    const ins = datos.inscripciones as Inscripcion[];
    const cs = cuentasAbiertas();
    const rs = (datos.resultados as Resultado[]).filter((r) => r.club_id === CLUB_DEMO);
    const perfiles = datos.perfiles as { user_id: string; nombre: string }[];
    if (!observando) {
      observando = true;
      empezarObservar();
      panel.vistas = new Set(actividad().map((a) => a.id));
    }
    observarFranjas(fs);
    observarPagos(ps, fs);
    observarPedidos(pe);
    observarInscripciones(ins, misTorneos, perfiles);
    observarCuentas(cs);
    observarResultados(rs, perfiles);
    observarClases(clasesClub, perfiles);
  });

  onMount(() => {
    const reloj = setInterval(() => (panel.ahora = Date.now()), 15_000);
    void arrancarDemo().then((c) => { conectado = c || hub.conectado; arrancado = true; });
    // Desde la sala de demo: saltar a una sección
    const SECCIONES = ['hoy', 'agenda', 'bar', 'cuentas', 'clases', 'carta', 'torneos', 'ranking', 'caja'];
    const dejar = escucharSala((d) => { if (SECCIONES.includes(d)) panel.seccion = d as typeof panel.seccion; });
    return () => { clearInterval(reloj); dejar(); };
  });
</script>

<div class="marco">
  <aside class="lado">
    <i class="raya" aria-hidden="true"></i>
    <div class="marca">
      <span class="logo c-titulo">Quilombo<em>Club</em></span>
      <b class="nombre-club">{club?.nombre ?? 'Pádel Club La 70'}</b>
      <small class="zona">{club ? `${club.zona} · ${club.ciudad}` : 'Laureles · Medellín'}</small>
    </div>
    <nav aria-label="Secciones del panel">
      {#each SECCIONES as s (s.id)}
        {@const g = globo(s.id)}
        <button class:on={panel.seccion === s.id} aria-current={panel.seccion === s.id ? 'page' : undefined} onclick={() => { panel.seccion = s.id; panel.abierta = null; }}>
          <span class="ico" aria-hidden="true">{s.icono}</span><span class="nom">{s.nombre}</span>
          {#if g}<span class="globo" class:suave={!g.fuerte}>{g.n}</span>{/if}
        </button>
      {/each}
    </nav>
    <div class="rapidas">
      <button class="c-btn bloque" onclick={() => (panel.cobroTarjeta = true)}>🛳️ Cobrar con tarjeta</button>
      <button class="c-btn sec bloque" onclick={() => (panel.producto = {})}>＋ Nuevo producto</button>
    </div>
    <div class="pie">
      <div class="acentos" role="radiogroup" aria-label="Color de acento">
        {#each ACENTOS as a (a.id)}
          <button role="radio" aria-checked={acento.actual === a.id} aria-label={a.nombre} title={a.nombre} class:on={acento.actual === a.id} style="--c:{a.id === 'noche' ? '#c9d4ee' : a.color}" onclick={() => void cambiarAcento(a.id)}></button>
        {/each}
      </div>
      <div class="admin"><span class="av">LG</span><span><b>Laura Gómez</b><small>Administradora</small></span></div>
      <div class="modo">
        <small class="c-mini">Modo demo</small>
        <span class="estado-hub" class:ok={conectado}><i></i>{conectado ? 'En vivo con los celulares' : 'Solo este equipo'}</span>
        <button class="demo" onclick={() => (demo = true)}>Abrir en celulares</button>
      </div>
    </div>
  </aside>

  <main class="centro">
    {#if !listo}
      <div class="cargando"><span class="c-titulo">Cargando el club…</span></div>
    {:else if panel.seccion === 'hoy'}<Hoy />
    {:else if panel.seccion === 'agenda'}<Agenda />
    {:else if panel.seccion === 'bar'}<Bar />
    {:else if panel.seccion === 'cuentas'}<Cuentas />
    {:else if panel.seccion === 'carta'}<Carta />
    {:else if panel.seccion === 'torneos'}<Torneos />
    {:else if panel.seccion === 'ranking'}<Ranking />
    {:else if panel.seccion === 'clases'}<Clases />
    {:else}<Caja />
    {/if}
  </main>

  <aside class="vivo" aria-label="En vivo">
    <header><span class="c-vivo titulo-vivo"><i></i>En vivo</span><small>{feed.length} movimientos</small></header>
    <ol>
      {#each feed as a (a.id)}
        <li class:nueva={!!panel.vistas && !panel.vistas.has(a.id)} class="t-{a.tipo}">
          <span class="ic" aria-hidden="true">{a.icono}</span>
          <span class="tx">{a.texto}<small>{hace(a.created_at, panel.ahora)}</small></span>
        </li>
      {:else}
        <li class="c-vacio">Aquí aparece lo que pasa en el club.</li>
      {/each}
    </ol>
  </aside>
</div>

{#if listo}<Cajon /><ModalProducto /><ModalCobroTarjeta />{/if}
<Avisos />
{#if demo}<ModalDemo cerrar={() => (demo = false)} />{/if}

<style>
  .marco { display: grid; grid-template-columns: 240px minmax(0, 1fr) 300px; height: 100vh; background: var(--q-bg); }
  .lado { position: relative; display: flex; flex-direction: column; padding: 24px 14px 16px; background: #fff; border-right: var(--c-borde); overflow-y: auto; scrollbar-width: none; }
  .raya { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--q-acc); }
  .marca { display: flex; flex-direction: column; gap: 2px; padding: 0 8px 18px; margin-bottom: 12px; border-bottom: var(--c-borde); }
  .logo { font-size: 32px; line-height: 1; letter-spacing: 0.02em; }
  .logo em { color: var(--q-acct); margin-left: 5px; }
  .nombre-club { margin-top: 12px; font-size: 15px; }
  .zona { font-size: 12.5px; color: var(--q-tx2); }
  nav { display: flex; flex-direction: column; gap: 3px; }
  nav button { display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 12px; border: 0; border-radius: 10px; background: none; color: var(--q-tx); font-size: 14.5px; font-weight: 700; text-align: left; transition: background 0.15s; }
  nav button:hover { background: rgba(14, 27, 51, 0.04); }
  nav button.on { background: var(--q-accs); box-shadow: inset 3px 0 0 var(--q-acc); }
  .ico { width: 20px; text-align: center; font-size: 14px; }
  .nom { flex: 1; }
  .globo { min-width: 22px; height: 20px; padding: 0 6px; border-radius: 10px; background: var(--q-acc); color: var(--q-acctx); font-size: 11.5px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px var(--q-accs); }
  .globo.suave { background: var(--q-sub); color: var(--q-tx); box-shadow: none; }
  .rapidas { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; padding-top: 14px; border-top: var(--c-borde); }
  .pie { margin-top: auto; display: flex; flex-direction: column; gap: 12px; padding-top: 16px; }
  .acentos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
  .acentos button { height: 26px; border: 1px solid rgba(14, 27, 51, 0.1); border-radius: 8px; background: var(--c); padding: 0; }
  .acentos button.on { border: 2px solid var(--q-noche); }
  .admin { display: flex; align-items: center; gap: 10px; padding: 0 4px; }
  .admin .av { width: 36px; height: 36px; border-radius: 50%; background: var(--q-acc); color: var(--q-acctx); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; }
  .admin span:last-child { display: flex; flex-direction: column; font-size: 13.5px; }
  .admin small { color: var(--q-tx2); font-size: 12px; }
  .modo { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: var(--q-bg); border: var(--c-borde); }
  .estado-hub { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--q-tx2); }
  .estado-hub i { width: 8px; height: 8px; border-radius: 50%; background: #9aa1b0; }
  .estado-hub.ok i { background: #3ccf8e; box-shadow: 0 0 0 3px rgba(60, 207, 142, 0.2); }
  .demo { height: 36px; border: 0; border-radius: 9px; background: var(--q-sub); font-size: 13px; font-weight: 800; }

  .centro { overflow-y: auto; scrollbar-width: none; padding: 26px 30px 40px; background: radial-gradient(1200px 500px at 30% -10%, var(--q-accs), transparent 60%); }
  .cargando { height: 60vh; display: flex; align-items: center; justify-content: center; color: var(--q-tx3); font-size: 26px; }

  .vivo { display: flex; flex-direction: column; min-height: 0; background: #fff; border-left: var(--c-borde); }
  .vivo header { display: flex; align-items: center; justify-content: space-between; padding: 24px 20px 12px; }
  .titulo-vivo { font-size: 22px; letter-spacing: 0.04em; }
  .vivo header small { font-size: 11.5px; color: var(--q-tx3); }
  .vivo ol { list-style: none; margin: 0; padding: 0 12px 20px; overflow-y: auto; scrollbar-width: none; }
  .vivo li { display: flex; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 13.5px; line-height: 1.35; border-left: 3px solid var(--q-tx3); }
  .vivo li + li { margin-top: 6px; }
  .vivo li.t-reserva { border-left-color: var(--q-acc); }
  .vivo li.t-pago { border-left-color: var(--c-verde); }
  .vivo li.t-pedido, .vivo li.t-entrega { border-left-color: #2f8fe0; }
  .vivo li.t-torneo { border-left-color: var(--c-oro); }
  .vivo li.t-clase { border-left-color: var(--c-clase); }
  .vivo li.t-cancelacion { border-left-color: var(--c-error); }
  .vivo li.nueva { animation: c-entra 0.4s var(--q-ease) both, c-resalta 4s ease-out; }
  .ic { width: 22px; flex-shrink: 0; text-align: center; }
  .tx { display: flex; flex-direction: column; gap: 3px; color: var(--q-tx); }
  .tx small { color: var(--q-tx3); font-size: 12px; }

  @media (max-width: 1180px) { .marco { grid-template-columns: 210px minmax(0, 1fr) 250px; } }
</style>
