<script lang="ts">
  // Un torneo que organiza un club: portada a todo lo ancho del color del torneo (con el aro), el estado de mi
  // inscripción en vivo, 3 cifras (cupos, precio, cierre), dónde/formato/premios y la descripción. "Yo voy" abre la
  // inscripción (categoría, pareja y pago con tarjeta o comprobante) y le llega al club organizador.
  import { Page } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Cabecera from '../ui/ranking/Cabecera.svelte';
  import { club, miInscripcion, torneo } from '../app/jugar';
  import { miPerfil } from '../app/perfil.svelte';
  import { pesos, puedeInscribirse } from '../domain/jugar';
  import EstadoInscripcion from '../ui/torneos/EstadoInscripcion.svelte';
  import { colorTorneo } from '../ui/torneos/comprobante';

  let { id }: { id: string } = $props();
  const t = $derived(torneo(id));
  const sede = $derived(club(t?.club_id));
  const mia = $derived(miInscripcion(id));
  const puede = $derived(t ? puedeInscribirse(t, miPerfil().categoria, !!mia) : { ok: false });
  const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace(/\./g, '');
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
  const quedan = $derived(t ? Math.max(0, t.cupos - t.inscritos) : 0);
  const corta = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace(/\./g, '');
  const mayus = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const fechas = $derived(t ? mayus(fecha(t.fin) !== fecha(t.inicio) ? `${fecha(t.inicio)} – ${fecha(t.fin)}` : `${fecha(t.inicio)} · ${hora(t.inicio)}`) : '');
  const filas = $derived(t ? [
    { e: '📍', l: 'Dónde', v: `${sede?.nombre ?? t.ciudad}${sede?.direccion ? ` · ${sede.direccion}` : ''}, ${t.ciudad}` },
    { e: '🎾', l: 'Categorías', v: t.categorias.map((c) => c + 'ª').join(' · ') || 'Todas' },
    ...(t.formato ? [{ e: '🧩', l: 'Formato', v: t.formato }] : []),
    ...(t.premios ? [{ e: '🏆', l: 'Premios', v: t.premios }] : [])
  ] : []);
</script>

<Page name="torneo" class="pa-torneo" noNavbar>
  {#if !t}
    <Cabecera titulo="Torneo" />
    <p class="q-vacio">Este torneo ya no está disponible.</p>
  {:else}
    <section class="portada" style="--c:{colorTorneo(t.id)}">
      <span class="aro" aria-hidden="true"></span>
      <Cabecera sobreColor>
        {#snippet extra()}<small class="over">Torneo · {sede?.nombre ?? t.ciudad}</small>{/snippet}
      </Cabecera>
      <h1>{t.nombre}</h1>
      <span class="fechas">{fechas}</span>
    </section>

    {#if mia}<div class="estado"><EstadoInscripcion inscripcion={mia} torneo={t} /></div>{/if}

    <div class="cifras">
      <div><small>Parejas</small><b>{t.inscritos}/{t.cupos}</b></div>
      <div><small>Precio</small><b>{t.precio ? pesos(t.precio) : 'Gratis'}</b></div>
      <div><small>Cierra</small><b>{corta(t.cierre)}</b></div>
    </div>
    <div class="filas">
      {#each filas as f (f.l)}<div class="fila"><span class="e">{f.e}</span><span class="fv"><small>{f.l}</small><b>{f.v}</b></span></div>{/each}
    </div>
    {#if t.descripcion}<p class="desc">{t.descripcion}</p>{/if}
    <p class="cupos">{quedan ? `Quedan ${quedan} cupos` : 'Sin cupos'} · {t.inscritos} de {t.cupos} parejas inscritas</p>

    {#if !mia}
      {#if !puede.ok}
        <p class="no">{puede.motivo}</p>
      {:else}
        <button class="yo-voy" onclick={() => { toque(); ui.inscribir = { torneo: id }; }}>Yo voy · {t.precio ? `${pesos(t.precio)} por pareja` : 'gratis'}</button>
        <p class="ayuda">Paga con saldo o tarjeta, o sube el comprobante de tu transferencia. Tu inscripción le llega a {sede?.nombre ?? 'el club'} al instante.</p>
      {/if}
    {/if}
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-torneo .page-content) { font-family: var(--q-font); padding-top: 0 !important; }
  .portada { position: relative; padding: 0 0 22px; background: var(--c); color: #fff; overflow: hidden; }
  .aro { position: absolute; right: -60px; top: calc(env(safe-area-inset-top, 0px) + 10px); width: 220px; height: 220px; border-radius: 50%; border: 26px solid rgba(255, 255, 255, 0.14); box-sizing: border-box; }
  .over { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  h1 { position: relative; margin: 0 20px; font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 46px; font-weight: 900; line-height: 0.92; }
  .fechas { position: relative; display: block; margin: 8px 20px 0; font-size: 14.5px; font-weight: 700; opacity: 0.9; }
  .estado { margin: 14px 16px 0; }
  .cifras { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 14px 16px 0; }
  .cifras div { padding: 12px 10px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .cifras small { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--q-tx2); }
  .cifras b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 24px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .filas { margin: 12px 16px 0; border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .fila { display: flex; gap: 12px; padding: 12px 14px; }
  .fila + .fila { border-top: 1px solid var(--q-line); }
  .e { font-size: 20px; }
  .fv { display: flex; flex-direction: column; min-width: 0; }
  .fv small { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--q-tx2); }
  .fv b { font-size: 15px; line-height: 1.35; }
  .desc { margin: 14px 20px 0; font-size: 15px; line-height: 1.45; text-wrap: pretty; }
  .cupos { margin: 10px 20px 0; font-size: 13px; font-weight: 700; color: var(--q-tx2); }
  .yo-voy { display: block; width: calc(100% - 32px); margin: 18px 16px 0; height: 54px; border: 0; border-radius: 12px; background: var(--q-acc); color: var(--q-acctx); font-family: inherit; font-size: 17px; font-weight: 900; }
  .ayuda { font-size: 13px; color: var(--q-tx2); text-align: center; margin: 8px 24px 0; line-height: 1.4; }
  .no { font-size: 16px; font-weight: 800; color: var(--q-tx2); margin: 16px 20px 0; }
</style>
