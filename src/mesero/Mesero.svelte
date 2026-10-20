<script lang="ts">
  // App del mesero: "¿Quién eres?" → Pedidos (en vivo) · Canchas (lo que se juega ahora) · Tarjetas (escanear la
  // tarjeta Quilombo de un jugador y cobrar con su saldo) · Nuevo (tomar un pedido).
  // Cuando llega un pedido nuevo (de la app del jugador o de otro mesero) suena, vibra y baja un aviso de arriba.
  import { onMount } from 'svelte';
  import { escucharSala } from '$lib/app/sala';
  import { arrancarDemo } from '$lib/app/hub';
  import { db } from '$lib/data/db';
  import { datos } from '$lib/data/datos.svelte';
  import { canchaDe, cuentasAbiertas, elClub, franjasDe, pedidos, staff, titularDe } from '$lib/club/app/club';
  import { diaColombia, horaColombia, type Franja } from '$lib/social/domain/jugar';
  import type { Pedido } from '$lib/club/domain/club';
  import { m, colorMesero, desbloquearSonido, timbre, type Pestana } from './estado.svelte';
  import Pedidos from './Pedidos.svelte';
  import Canchas from './Canchas.svelte';
  import Nuevo from './Nuevo.svelte';
  import Cuentas from './Cuentas.svelte';
  import Escaner from './Escaner.svelte';
  import HojaCuenta from './HojaCuenta.svelte';

  let listo = $state(false);
  let vistos: Set<string> | null = null;
  let entrante = $state<{ p: Pedido; id: number } | null>(null);
  /** Franjas de hoy que ya estaban reservadas (o vistas reservadas): las demás que se reserven son "nuevas" */
  let reservadas: Set<string> | null = null;
  let reserva = $state<{ f: Franja; id: number } | null>(null);
  const tomada = (f: Franja) => f.estado === 'apartada' || f.estado === 'pagada';

  onMount(() => {
    void (async () => {
      await arrancarDemo();
      // Lo que ya existía al abrir no cuenta como nuevo
      vistos = new Set(((await db.club_pedidos.toArray()) as Pedido[]).map((p) => p.id));
      reservadas = new Set(((await db.social_franjas.toArray()) as Franja[]).filter(tomada).map((f) => f.id));
      listo = true;
    })();
    const reloj = setInterval(() => (m.ahora = Date.now()), 20_000);
    // Desde la sala de demo: saltar a una pantalla (si nadie eligió quién es, entra Camilo)
    const dejar = escucharSala((d) => {
      if (d === 'quien') { m.elegir(null); return; }
      if (!m.yo) m.elegir('Camilo');
      m.escaneando = false;
      m.verCuenta = null;
      if (d === 'escanear') { m.tab = 'cuentas'; m.escaneando = true; return; }
      if (d === 'pedidos' || d === 'canchas' || d === 'cuentas' || d === 'nuevo') m.tab = d;
    });
    return () => { clearInterval(reloj); dejar(); };
  });

  // Pedidos que llegan en vivo
  $effect(() => {
    const ps = pedidos();
    if (!vistos) return;
    for (const p of ps) {
      if (vistos.has(p.id)) continue;
      vistos.add(p.id);
      if (p.estado !== 'nuevo' || (p.origen === 'mesero' && p.mesero === m.yo)) continue;
      const id = Date.now();
      entrante = { p, id };
      timbre();
      setTimeout(() => { if (entrante?.id === id) entrante = null; }, 5500);
    }
  });

  // Reservas que entran en vivo para hoy en el club (desde la app del jugador o la recepción)
  $effect(() => {
    const fs = franjasDe();
    if (!reservadas) return;
    const hoy = diaColombia(new Date().toISOString());
    for (const f of fs) {
      if (!tomada(f)) { reservadas.delete(f.id); continue; }
      if (reservadas.has(f.id)) continue;
      reservadas.add(f.id);
      if (diaColombia(f.inicio) !== hoy || Date.parse(f.fin) < Date.now()) continue;
      m.reservasNuevas = { ...m.reservasNuevas, [f.id]: Date.now() };
      const id = Date.now();
      reserva = { f, id };
      timbre();
      setTimeout(() => { if (reserva?.id === id) reserva = null; }, 5500);
    }
  });

  const meseros = $derived(staff().filter((s) => s.rol === 'mesero'));
  const club = $derived(elClub());
  const nuevos = $derived(pedidos().filter((p) => p.estado === 'nuevo').length);
  const nCuentas = $derived(cuentasAbiertas().length);
  const TABS: { id: Pestana; nombre: string; d: string }[] = [
    { id: 'pedidos', nombre: 'Pedidos', d: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
    { id: 'canchas', nombre: 'Canchas', d: 'M5.5 3h13A1.5 1.5 0 0 1 20 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3zM4 12h16M12 3v18' },
    { id: 'cuentas', nombre: 'Tarjetas', d: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2M20 14v6h-6v-2' },
    { id: 'nuevo', nombre: 'Nuevo', d: 'M12 5v14M5 12h14' }
  ];
  const ir = (t: Pestana) => { if (t === 'nuevo' && m.tab !== 'nuevo') m.ubicacion = null; if (t !== 'nuevo') m.cuenta = null; m.tab = t; scrollTo(0, 0); };
</script>

<svelte:window onpointerdown={desbloquearSonido} />

{#if !listo || !datos.listo}
  <div class="cargando"><span class="m-titulo">Quilombo</span><small>Conectando con el club…</small></div>
{:else if !m.yo}
  <main class="quien">
    <span class="aro" aria-hidden="true"></span>
    <small class="club">{club?.nombre ?? 'Tu club'}</small>
    <h1 class="m-titulo">¿Quién eres?</h1>
    <p class="sub">Elige tu nombre para tomar pedidos</p>
    <div class="lista">
      {#each meseros as s, i (s.id)}
        <button class="mesero" onclick={() => m.elegir(s.nombre)}>
          <span class="ini m-titulo" style="background:{colorMesero(s.nombre, i)}">{s.nombre.charAt(0)}</span>
          <span class="nom">{s.nombre}</span>
          <span class="rol">Mesero</span>
        </button>
      {/each}
    </div>
    <span class="turno">Turno de hoy · {club?.nombre ?? ''}</span>
  </main>
{:else}
  <header class="barra">
    <span class="marca">
      <b class="m-titulo">Quilombo</b>
      <small>{club?.nombre ?? ''} · Bar</small>
    </span>
    <button class="qr" onclick={() => (m.escaneando = true)} aria-label="Escanear tarjeta Quilombo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M8 12h8" /></svg>
      QR
    </button>
    <button class="yo" onclick={() => m.elegir(null)} aria-label="Cambiar de mesero ({m.yo})">
      <span class="ini" style="background:{colorMesero(m.yo, meseros.findIndex((s) => s.nombre === m.yo))}">{m.yo.charAt(0)}</span>{m.yo}
    </button>
  </header>

  <main class="contenido" class:con-pie={m.tab === 'nuevo'}>
    {#if m.tab === 'pedidos'}<Pedidos />
    {:else if m.tab === 'cuentas'}<Cuentas />
    {:else if m.tab === 'canchas'}<Canchas onPedir={(u) => { m.ubicacion = u; m.tab = 'nuevo'; scrollTo(0, 0); }} />
    {:else}<Nuevo onEnviado={() => ir('pedidos')} />{/if}
  </main>

  <nav class="tabs" aria-label="Secciones">
    {#each TABS as t (t.id)}
      <button class:activo={m.tab === t.id} aria-current={m.tab === t.id ? 'page' : undefined} onclick={() => ir(t.id)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={t.d} /></svg>
        {t.nombre}
        {#if t.id === 'pedidos' && nuevos}<i class="globo">{nuevos}</i>{/if}
        {#if t.id === 'cuentas' && nCuentas}<i class="globo gris">{nCuentas}</i>{/if}
      </button>
    {/each}
  </nav>

  {#if entrante}
    <button class="banner" onclick={() => { entrante = null; ir('pedidos'); }}>
      <span class="campana" aria-hidden="true">🛎️</span>
      <span class="txt">
        <b class="m-titulo">¡Pedido nuevo! {entrante.p.ubicacion}</b>
        <small>#{entrante.p.numero} · {entrante.p.cliente}{entrante.p.origen === 'app' ? ' · 📱 desde la app' : entrante.p.cuenta_id ? ' · 🛳️ tarjeta' : ''}</small>
      </span>
    </button>
  {/if}

  {#if reserva}
    <button class="banner azul" class:abajo={!!entrante} onclick={() => { const cid = reserva?.f.cancha_id; reserva = null; ir('canchas'); requestAnimationFrame(() => document.getElementById(`cancha-${cid}`)?.scrollIntoView({ behavior: 'smooth' })); }}>
      <span class="campana" aria-hidden="true">📅</span>
      <span class="txt">
        <b class="m-titulo">Nueva reserva · {canchaDe(reserva.f.cancha_id)?.nombre}</b>
        <small>{horaColombia(reserva.f.inicio)} · {titularDe(reserva.f)}{reserva.f.origen === 'app' ? ' · 📱 app' : ''} · {reserva.f.estado === 'pagada' ? 'Pagada ✓' : 'Falta pago'}</small>
      </span>
    </button>
  {/if}
{/if}

{#if m.escaneando}<Escaner />{/if}
<HojaCuenta />

{#if m.aviso}{#key m.aviso.id}<div class="toast" class:error={m.aviso.error} role="status">{m.aviso.texto}</div>{/key}{/if}

<style>
  .cargando { min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: var(--q-bg); color: var(--q-tx); }
  .cargando span { font-size: 44px; color: var(--q-acct); }
  .cargando small { font-size: 15px; color: var(--q-tx2); }

  /* ¿Quién eres? */
  .quien { position: relative; min-height: 100dvh; overflow: hidden; display: flex; flex-direction: column; padding: calc(env(safe-area-inset-top, 0px) + 50px) 22px calc(env(safe-area-inset-bottom, 0px) + 28px); background: var(--q-bg); color: var(--q-tx); }
  .aro { position: absolute; right: -90px; top: -70px; width: 260px; height: 260px; border-radius: 50%; border: 32px solid var(--q-acc); opacity: 0.9; }
  .club { position: relative; font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--q-acct); }
  .quien h1 { position: relative; margin: 10px 0 6px; font-size: 62px; line-height: 0.9; }
  .sub { position: relative; margin: 0 0 28px; font-size: 17px; opacity: 0.75; }
  .lista { display: flex; flex-direction: column; gap: 12px; }
  .mesero { display: flex; align-items: center; gap: 14px; min-height: 80px; padding: 12px 16px; border: 1px solid var(--q-line); border-radius: 14px; background: var(--q-card); text-align: left; }
  .mesero:active { border-color: var(--q-acc); }
  .mesero .ini { width: 52px; height: 52px; flex: none; border-radius: 12px; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; }
  .mesero .nom { flex: 1; font-size: 23px; font-weight: 800; }
  .mesero .rol { font-size: 13px; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
  .turno { margin-top: auto; padding-top: 24px; font-size: 13px; color: var(--q-tx2); text-align: center; }

  /* Encabezado */
  .barra { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 10px; padding: calc(env(safe-area-inset-top, 0px) + 12px) 14px 12px 18px; background: var(--q-card); color: var(--q-tx); border-bottom: 1px solid var(--q-line); }
  .marca { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .marca b { font-size: 28px; line-height: 1; letter-spacing: 0.04em; color: var(--q-acct); }
  .marca small { font-size: 13px; font-weight: 600; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qr { display: flex; align-items: center; gap: 6px; height: 46px; padding: 0 14px; border: 0; border-radius: 12px; background: var(--q-acc); color: var(--q-acctx); font-weight: 900; font-size: 16px; }
  .yo { display: flex; align-items: center; gap: 8px; height: 46px; padding: 0 12px 0 6px; border: 1px solid var(--q-borde); border-radius: 12px; background: none; font-weight: 800; font-size: 15px; }
  .yo .ini { width: 34px; height: 34px; border-radius: 9px; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; }

  .contenido { padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
  .contenido.con-pie { padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px)); }

  /* Barra inferior */
  .tabs { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: flex; padding-bottom: env(safe-area-inset-bottom, 0px); background: var(--q-card); border-top: 1px solid var(--q-line); }
  .tabs button { position: relative; flex: 1; height: 62px; border: 0; background: transparent; color: var(--q-tx2); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-family: var(--q-font-titulo); font-weight: 700; font-size: 14.5px; text-transform: uppercase; letter-spacing: 0.06em; }
  .tabs button.activo { color: var(--q-acct); background: var(--q-accs); }
  .globo { position: absolute; top: 6px; left: calc(50% + 8px); min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--q-acc); color: var(--q-acctx); font-family: var(--q-font); font-style: normal; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .globo.gris { background: var(--q-tx3); color: #fff; }

  /* Avisos que bajan */
  .banner { position: fixed; z-index: 70; left: 10px; right: 10px; top: calc(env(safe-area-inset-top, 0px) + 8px); display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 0; border-radius: 16px; background: var(--q-acc); color: var(--q-acctx); text-align: left; box-shadow: 0 14px 34px rgba(14, 27, 51, 0.4); animation: baja 0.35s var(--q-spring) both; }
  .banner.azul { background: #1e7fd0; color: #fff; }
  .banner.abajo { top: calc(env(safe-area-inset-top, 0px) + 100px); }
  .campana { font-size: 32px; animation: sacude 0.6s ease-in-out 3; }
  .banner .txt { display: flex; flex-direction: column; min-width: 0; }
  .banner b { font-size: 28px; line-height: 1; }
  .banner small { font-size: 14.5px; font-weight: 600; opacity: 0.95; }
  @keyframes baja { from { transform: translateY(-130%); } to { transform: none; } }
  @keyframes sacude { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-18deg); } 75% { transform: rotate(18deg); } }

  .toast { position: fixed; z-index: 80; left: 16px; right: 16px; bottom: calc(78px + env(safe-area-inset-bottom, 0px)); padding: 14px 16px; border-radius: 12px; background: #18895b; color: #fff; font-weight: 800; font-size: 16px; text-align: center; box-shadow: 0 8px 24px rgba(14, 27, 51, 0.3); animation: m-sube 0.3s both; }
  .toast.error { background: var(--q-alr); }
  /* Con una hoja abierta, el aviso sale arriba para no taparla */
  :global(body:has(.m-hoja)) .toast { top: calc(env(safe-area-inset-top, 0px) + 10px); bottom: auto; }
  @media (prefers-reduced-motion: reduce) { .banner, .campana, .toast { animation: none; } }
</style>
