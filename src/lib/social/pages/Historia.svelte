<script lang="ts">
  // El perfil de un jugador de tu gente: su foto, nombre, @usuario y lo de pádel (categoría, ranking, club, ciudad);
  // sus publicaciones en cuadrícula, y "Tú y él/ella": partidos juntos, canchas divididas, gestos y la línea de tiempo.
  import { Page } from 'framework7-svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { datos } from '$lib/data/datos.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Gestos from '../ui/Gestos.svelte';
  import Muro from '../ui/feed/Muro.svelte';
  import FotoPerfil from '../ui/perfil/FotoPerfil.svelte';
  import FotoSocial from '../ui/FotoSocial.svelte';
  import { cualquierRelacionCon, primerNombre } from '../app/rituales';
  import { cobros, nombreDe, perfilDe, yo } from '../app/vinculos';
  import { publicaciones } from '../app/social';
  import { emojiGesto, GESTOS, historia, textoAntiguedad, textoMarcador, type EventoMuro } from '../domain/social';
  import { etiquetaPara, tipo } from '../domain/vinculos';
  import { textoCategoria, textoPuntos } from '../domain/padel';
  import Record from '../ui/ranking/Record.svelte';
  import Cabecera from '../ui/ranking/Cabecera.svelte';
  import TarjetaJugador from '../ui/ranking/TarjetaJugador.svelte';
  import type { PerfilRanking } from '../domain/ranking';
  import { esProfesor } from '../app/clases';

  let { uid }: { uid: string } = $props();
  const rel = $derived(cualquierRelacionCon(uid));
  const perfil = $derived(perfilDe(uid));
  const suyas = $derived(publicaciones().filter((x) => x.autor === uid && !x.deleted_at).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  let pestana = $state<'fotos' | 'juntos'>('fotos');
  const nombre = $derived(nombreDe(uid));
  const corto = $derived(primerNombre(nombre));
  const t = $derived(rel ? tipo(rel.tipo) : null);
  const h = $derived(historia(yo(), uid, { desde: rel?.created_at ?? null, eventos: datos.eventos as EventoMuro[], cobros: cobros(), publicaciones: suyas.concat(publicaciones().filter((x) => x.autor === yo())) }));
  const activa = $derived(rel?.estado === 'activa');
  const nombreGesto = (g: string | null) => GESTOS.find((x) => x.id === g)?.nombre ?? '';
</script>

<Page name="persona" class="pa-historia" noNavbar>
  <Cabecera titulo={corto} />

  {#if !rel}
    {#if perfil}
      <TarjetaJugador perfil={perfil as unknown as PerfilRanking} />
      <div class="chips">
        {#if textoCategoria(perfil.categoria)}<span class="chip">🎾 {textoCategoria(perfil.categoria)}</span>{/if}
        {#if textoPuntos(perfil.puntos_ranking)}<span class="chip">📈 {textoPuntos(perfil.puntos_ranking)}</span>{/if}
      </div>
      <Record perfil={perfil as unknown as PerfilRanking} />
      {#if esProfesor(uid)}<button class="reservar-clase" onclick={() => { toque(); ui.navegar(`/profesor/${uid}/`); }}>🎓 Reservar clase con {corto}</button>{/if}
      {#if perfil.codigo}<div class="agregar"><button class="b-acc" onclick={() => { toque(); ui.agregar = { codigo: perfil.codigo as string, qr: false }; }}>Agregar a tu gente</button></div>{/if}
    {:else}
      <p class="aviso">Ya no están conectados en Quilombo.</p>
    {/if}
  {:else}
    <TarjetaJugador perfil={(perfil ?? { user_id: uid, nombre, color: '#1e7fd0' }) as unknown as PerfilRanking} />
    <div class="chips">
      <span class="chip rel" style="--c:{t?.color ?? 'var(--q-lila)'}">{etiquetaPara(rel, yo())}</span>
      {#if textoCategoria(perfil?.categoria)}<span class="chip">🎾 {textoCategoria(perfil?.categoria)}</span>{/if}
      {#if textoPuntos(perfil?.puntos_ranking)}<span class="chip">📈 {textoPuntos(perfil?.puntos_ranking)}</span>{/if}
      {#if h.dias !== null && activa}<span class="chip">{textoAntiguedad(h.dias)}</span>{/if}
    </div>
    {#if rel.estado === 'pendiente'}<p class="pend">Esperando que {rel.user_a === yo() ? corto : 'tú'} {rel.user_a === yo() ? 'confirme' : 'confirmes'} la conexión.</p>{/if}

    {#if esProfesor(uid)}<button class="reservar-clase" onclick={() => { toque(); ui.navegar(`/profesor/${uid}/`); }}>🎓 Reservar clase con {corto}</button>{/if}
    {#if activa}
      <div class="acciones">
        <button onclick={() => { toque(); ui.navegar(`/chat/r/${rel.id}/`); }}><Icon name="sms" size={20} stroke={2} />Chat</button>
        <button onclick={() => { toque(); ui.invitar = { con: [uid] }; }}><Icon name="estrella" size={20} stroke={2} />Jugar</button>
        <button onclick={() => { toque(); ui.cobrar = { para: [uid] }; }}><Icon name="dividir" size={20} stroke={2} />Cobrar</button>
      </div>
    {/if}

    <Record perfil={perfil as unknown as PerfilRanking} max={3} />

    <div class="pestanas" role="tablist" aria-label="Perfil de {corto}">
      <button role="tab" aria-selected={pestana === 'fotos'} class:on={pestana === 'fotos'} onclick={() => { toque(4); pestana = 'fotos'; }}>📸 Sus fotos{suyas.length ? ` · ${suyas.length}` : ''}</button>
      <button role="tab" aria-selected={pestana === 'juntos'} class:on={pestana === 'juntos'} onclick={() => { toque(4); pestana = 'juntos'; }}>💛 Tú y {corto}</button>
    </div>

    {#if pestana === 'fotos'}
      {#if suyas.length}
        <div class="grilla">
          {#each suyas as x (x.id)}
            <button class="celda" aria-label="Publicación de {corto}" onclick={() => { toque(); ui.navegar(`/publicacion/${x.id}/`); }}>
              {#if x.fotos?.length}
                <FotoSocial path={x.fotos[0].path} alt="Foto de {corto}" />
                {#if x.fotos.length > 1}<span class="varias" aria-hidden="true">▣</span>{/if}
              {:else}
                <span class="sin"><i>🎾</i>{textoMarcador(x.marcador)}</span>
              {/if}
            </button>
          {/each}
        </div>
      {:else}
        <p class="vacio">{corto} aún no ha publicado nada.</p>
      {/if}
    {/if}

    {#if pestana === 'juntos'}
      {#if activa}
        <section class="tarjeta"><Gestos relacion={rel.id} nombre={corto} titulo="¿Qué le mandas hoy a {corto}?" /></section>
        <div class="numeros">
          <div class="n lima"><b>{h.partidos}</b><small>partido{h.partidos === 1 ? '' : 's'} juntos</small></div>
          <div class="n cielo"><b>{h.canchas}</b><small>cancha{h.canchas === 1 ? '' : 's'} dividida{h.canchas === 1 ? '' : 's'}{h.abiertas ? ` · ${h.abiertas} por pagar` : ''}</small></div>
          <div class="n amarillo"><b>{h.gestosEnviados + h.gestosRecibidos}</b><small>{h.gestosEnviados} enviados · {h.gestosRecibidos} recibidos</small></div>
        </div>
        {#if h.gestoFavorito}<p class="favorito">Su gesto de cajón: <b>{emojiGesto(h.gestoFavorito)} {nombreGesto(h.gestoFavorito)}</b></p>{/if}
      {/if}
      <h2 class="sec">Lo que han vivido</h2>
      {#if h.momentos.length}
        <div class="linea"><Muro eventos={h.momentos} /></div>
      {:else}
        <p class="vacio">Aún no hay momentos entre los dos. Invítalo a jugar 🎾 y arranca la historia.</p>
      {/if}
    {/if}
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-historia .page-content) { font-family: var(--q-font); padding-top: 0 !important; }
  .aviso { text-align: center; color: var(--q-tx2); padding: 120px 24px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 16px 0; }
  .chip { padding: 5px 10px; border-radius: 8px; background: var(--q-sub); color: var(--q-tx); font-size: 12.5px; font-weight: 800; }
  .chip.rel { background: var(--c); color: #fff; }
  .pend { margin: 8px 20px 0; font-size: 13.5px; font-weight: 800; color: var(--q-tx2); }
  .b-acc { width: 100%; height: 52px; border: 0; border-radius: 12px; background: var(--q-acc); color: var(--q-acctx); font-family: inherit; font-size: 16px; font-weight: 900; }
  .reservar-clase { display: flex; align-items: center; justify-content: center; width: calc(100% - 32px); height: 52px; margin: 12px 16px 0; border: 0; border-radius: 14px; background: var(--q-lila); color: #fff; font-family: inherit; font-size: 16px; font-weight: 800; }
  .acciones { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 16px 0; }
  .acciones button { height: 52px; border: 1px solid var(--q-line); border-radius: 14px; background: var(--q-card); color: var(--q-tx); font-family: inherit; font-size: 15px; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .pestanas { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 4px; margin: 16px 16px 12px; padding: 4px; border-radius: 12px; background: var(--q-sub); }
  .pestanas button { height: 38px; min-width: 0; border: 0; border-radius: 10px; background: none; color: var(--q-tx2); font-family: inherit; font-size: 14px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pestanas button.on { background: var(--q-card); color: var(--q-tx); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); }
  .grilla { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; margin: 0 4px; }
  .celda { position: relative; aspect-ratio: 4 / 5; padding: 0; border: 0; overflow: hidden; background: var(--q-sub); color: var(--q-tx); font-family: inherit; }
  .celda :global(.foto) { position: absolute; inset: 0; }
  .varias { position: absolute; top: 6px; right: 7px; color: #fff; font-size: 14px; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6); }
  .sin { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 6px; font-size: 13px; font-weight: 900; text-align: center; }
  .sin i { font-style: normal; font-size: 26px; }
  .tarjeta { margin: 0 16px 12px; padding: 14px; border-radius: 14px; background: var(--q-card); border: 0.5px solid var(--q-line); color: var(--q-tx); }
  .numeros { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 16px 10px; }
  .n { padding: 12px; border-radius: 14px; color: var(--q-fiesta-tinta); display: flex; flex-direction: column; gap: 2px; }
  .n b { font-size: 28px; font-weight: 900; line-height: 1; }
  .n small { font-size: 12px; font-weight: 800; opacity: 0.8; }
  .lima { background: var(--q-fiesta-lima); } .cielo { background: var(--q-fiesta-cielo); } .amarillo { background: var(--q-fiesta-amarillo); }
  .favorito { margin: 4px 20px 12px; font-size: 14px; color: var(--q-tx2); text-align: center; }
  .favorito b { color: var(--q-tx); }
  .sec { margin: 22px 20px 10px; font-family: var(--q-font-titulo); font-style: italic; font-size: 22px; font-weight: 800; text-transform: uppercase; }
  .linea { margin: 0 16px; }
  .agregar { margin: 16px 16px 0; }
  .vacio { margin: 0 20px; font-size: 14px; color: var(--q-tx2); line-height: 1.45; }
</style>
