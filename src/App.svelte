<script lang="ts">
  import { App, Views, View, f7ready, f7 } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { escucharSala } from '$lib/app/sala';
  import { irEnJugador } from '$lib/app/salaJugador';
  import { vigilarAlumnos } from '$lib/social/app/avisosProfe.svelte';
  import { routes } from './routes';
  import { sesion } from '$lib/app/sesion.svelte';
  import { PESTANAS, ui } from '$lib/app/ui.svelte';
  import { apariencia } from '$lib/ui/tema.svelte';
  import TabBar from '$lib/ui/TabBar.svelte';
  import TarjetaOverlay from '$lib/social/ui/cuenta/TarjetaOverlay.svelte';
  import Aviso from '$lib/ui/Aviso.svelte';
  import HojaAgregar from '$lib/social/ui/perfil/HojaAgregar.svelte';
  import HojaCobrar from '$lib/social/ui/cobros/HojaCobrar.svelte';
  import HojaPublicar from '$lib/social/ui/feed/HojaPublicar.svelte';
  import HojaInvitar from '$lib/social/ui/jugar/HojaInvitar.svelte';
  import HojaReservar from '$lib/social/ui/jugar/HojaReservar.svelte';
  import HojaPedir from '$lib/social/ui/jugar/HojaPedir.svelte';
  import HojaPago from '$lib/social/ui/pagos/HojaPago.svelte';
  import HojaRecargar from '$lib/social/ui/saldo/HojaRecargar.svelte';
  import HojaDividir from '$lib/social/ui/saldo/HojaDividir.svelte';
  import HojaInscripcion from '$lib/social/ui/torneos/HojaInscripcion.svelte';
  import HojaClase from '$lib/social/ui/clases/HojaClase.svelte';
  import HojaAbrirHorario from '$lib/social/ui/clases/HojaAbrirHorario.svelte';
  import HojaPerfilProfe from '$lib/social/ui/clases/HojaPerfilProfe.svelte';
  import HojaResena from '$lib/social/ui/clases/HojaResena.svelte';
  import { codigoAmigo } from '$lib/social/domain/vinculos';
  import Acceso from './pages/Acceso.svelte';

  const f7params = {
    name: 'Quilombo',
    theme: 'ios',
    darkMode: false,
    routes,
    iosTranslucentBars: true,
    touch: { tapHold: true, tapHoldDelay: 450, iosTouchRipple: false },
    view: { iosSwipeBack: true, browserHistory: false, animate: true },
    // Hojas: se cierran deslizando solo desde la barrita/cabecera de arriba (o con la X)
    sheet: { backdrop: true, swipeHandler: '.q-agarre, .q-hoja-cab' },
    dialog: { buttonOk: 'Aceptar', buttonCancel: 'Cancelar' }
  };

  // Link de otra persona (?amigo=código): se abre "Agregar a tu gente" al entrar
  let entradaAtendida = false;
  $effect(() => {
    if (sesion.fase !== 'app' || entradaAtendida) return;
    entradaAtendida = true;
    const c = codigoAmigo(location.href);
    if (c) { ui.agregar = { codigo: c, qr: false }; history.replaceState(null, '', '/'); }
  });

  onMount(() => {
    apariencia.iniciar();
    // Qué pantalla se ve (para esconder la barra de pestañas en el chat)
    f7ready(() => {
      const app = f7 as unknown as { on: (e: string, fn: (p: { name?: string; view?: { el?: HTMLElement } }) => void) => void };
      const leer = () => { ui.paginaActual = document.querySelector('.view.tab-active .page-current')?.getAttribute('data-name') ?? ''; };
      const entra = (p: { name?: string; view?: { el?: HTMLElement } }) => { if (p?.view?.el?.classList.contains('tab-active')) ui.paginaActual = p.name ?? ''; };
      app.on('pageBeforeIn', entra);
      app.on('pageAfterIn', entra);
      app.on('swipebackAfterReset', leer);
      app.on('tabShow', () => requestAnimationFrame(leer));
      leer();
    });
    void sesion.iniciar();
    // Al profe le avisa cuando un alumno le reserva
    vigilarAlumnos();
    // Desde la sala de demo: saltar a cualquier pantalla
    return escucharSala((d) => { if (sesion.fase === 'app') irEnJugador(d); });
  });
</script>

<App {...f7params}>
  {#if sesion.fase === 'app'}
    <Views tabs class="safe-areas">
      {#each PESTANAS as t (t.id)}
        <View id={`view-${t.id}`} tab tabActive={t.id === ui.tab} url={t.url} />
      {/each}
    </Views>
    <TarjetaOverlay />
    <TabBar />
    <HojaAgregar />
    <HojaCobrar />
    <HojaPublicar />
    <HojaInvitar />
    <HojaReservar />
    <HojaPedir />
    <HojaInscripcion />
    <HojaPago />
    <HojaRecargar />
    <HojaDividir />
    <HojaClase />
    <HojaAbrirHorario />
    <HojaPerfilProfe />
    <HojaResena />
  {:else if sesion.fase === 'login'}
    <Acceso />
  {/if}
  <Aviso />
</App>
