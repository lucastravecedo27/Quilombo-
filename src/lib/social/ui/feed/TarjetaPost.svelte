<script lang="ts">
  // Una publicación, estilo Instagram: carrete de fotos o el marcador de un partido, reacciones (doble toque = ❤️),
  // texto, comentarios y menú (borrar la mía; reportar o bloquear la ajena). Reemplaza a TarjetaSalida de Selffin.
  import { f7 } from 'framework7-svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque, reducirMovimiento } from '$lib/ui/tema.svelte';
  import FotoSocial from '../FotoSocial.svelte';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { menuContenido } from '../moderar';
  import { borrarComentario, borrarPublicacion, comentar, comentariosDe, eventoDe, oculto, pedirTerminos } from '../../app/social';
  import { hace, primerNombre } from '../../app/rituales';
  import { nombreDe, perfilDe, reaccionar, yo } from '../../app/vinculos';
  import { datos } from '$lib/data/datos.svelte';
  import { gano, REACCIONES, textoMarcador, type Publicacion } from '../../domain/social';
  import { lineaJugador } from '../../domain/padel';

  let { pub, completo = false }: { pub: Publicacion; completo?: boolean } = $props();

  const p = $derived(pub);
  const esMia = $derived(p.autor === yo());
  const autor = $derived(perfilDe(p.autor));
  const evento = $derived(eventoDe(p.id));
  const reacciones = $derived((datos.reacciones as { evento_id: string; user_id: string; reaccion: string }[]).filter((r) => evento && r.evento_id === evento.id));
  const mia = $derived(reacciones.find((r) => r.user_id === yo())?.reaccion ?? null);
  const comentarios = $derived(comentariosDe(p.id));
  const visibles = $derived(completo ? comentarios : comentarios.slice(-2));
  const fotos = $derived(p.fotos ?? []);
  const resultado = $derived(gano(p.marcador));
  const con = $derived((p.con ?? []).map((u) => (u === yo() ? 'ti' : primerNombre(nombreDe(u)))));

  let indice = $state(0);
  let carrete: HTMLDivElement | undefined = $state();
  let corazon = $state(0);
  let ultimoToque = 0;
  let texto = $state('');
  let enviando = $state(false);
  let reportados = $state<string[]>([]);
  let ocultaPorMi = $state(false);

  function alDesplazar() { if (carrete) indice = Math.round(carrete.scrollLeft / Math.max(1, carrete.clientWidth)); }
  function irA(i: number) { carrete?.scrollTo({ left: i * carrete.clientWidth, behavior: reducirMovimiento() ? 'auto' : 'smooth' }); }
  async function reaccion(r: string) {
    if (!evento) { ui.avisar({ titulo: 'Aún sincronizando', sub: 'Intenta en un momento', icono: 'info' }); return; }
    toque(r === 'amor' ? 12 : 8);
    const err = await reaccionar(evento.id, mia === r ? null : r);
    if (err) ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta' });
  }
  /** Doble toque sobre la foto = ❤️ */
  function tocarFoto() {
    const ahora = Date.now();
    if (ahora - ultimoToque < 320) { corazon++; if (mia !== 'amor') void reaccion('amor'); }
    ultimoToque = ahora;
  }
  async function enviarComentario() {
    const t = texto.trim();
    if (!t || enviando || !(await pedirTerminos())) return;
    enviando = true;
    const err = await comentar(p.id, t);
    enviando = false;
    if (err) { ui.avisar({ titulo: 'No se pudo comentar', sub: err, icono: 'alerta' }); return; }
    texto = '';
    toque(8);
  }
  function menu() {
    toque();
    if (esMia) {
      f7.actions.create({ buttons: [[{ text: 'Borrar publicación', color: 'red', onClick: () => f7.dialog.confirm('Se borra para toda tu gente, con sus comentarios.', 'Borrar publicación', async () => {
        const err = await borrarPublicacion(p);
        ui.avisar(err ? { titulo: 'No se pudo', sub: err, icono: 'alerta' } : { titulo: 'Publicación borrada', icono: 'check' });
      }) }], [{ text: 'Cancelar' }]] }).open();
    } else menuContenido('publicacion', p.id, p.autor, primerNombre(nombreDe(p.autor)), () => (ocultaPorMi = true));
  }
  function opcionesComentario(c: { id: string; autor: string }) {
    if (c.autor !== yo()) { menuContenido('comentario', c.id, c.autor, primerNombre(nombreDe(c.autor)), () => (reportados = [...reportados, c.id])); return; }
    f7.dialog.confirm('¿Borrar este comentario?', 'Comentario', async () => {
      const err = await borrarComentario(c.id);
      if (err) ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta' });
    });
  }
  const verPerfil = () => { toque(); ui.navegar(esMia ? '/perfil/' : `/persona/${p.autor}/`); };
  const abrir = () => { if (!completo) { toque(); ui.navegar(`/publicacion/${p.id}/`); } };
</script>

{#if ocultaPorMi || oculto('publicacion', p.id)}
  <p class="reportada">Publicación reportada</p>
{:else}
<article class="tarjeta-post">
  <header>
    <button class="av" aria-label="Ver el perfil de {esMia ? 'ti' : nombreDe(p.autor)}" onclick={verPerfil}><FotoPerfil perfil={autor ?? { nombre: nombreDe(p.autor), color: '#3346a8' }} size={36} /></button>
    <span class="quien">
      <b><span class="nombre" role="link" tabindex="0" onclick={verPerfil} onkeydown={(e) => e.key === 'Enter' && verPerfil()}>{esMia ? 'Tú' : nombreDe(p.autor)}{#if autor?.usuario}<span class="usu"> @{autor.usuario}</span>{/if}</span>{#if con.length} <span class="con">con {con.join(', ')}</span>{/if}</b>
      <small>{[lineaJugador(autor), p.club, hace(p.created_at)].filter(Boolean).join(' · ')}</small>
    </span>
    <button class="mas" aria-label="Opciones de la publicación" onclick={menu}><Icon name="puntos" size={20} /></button>
  </header>

  {#if fotos.length}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="carrete" bind:this={carrete} onscroll={alDesplazar} onclick={tocarFoto}>
      {#each fotos as f, i (f.path)}
        <figure><FotoSocial path={f.path} alt="Foto {i + 1} de {nombreDe(p.autor)}" inmediata={i < 2} /></figure>
      {/each}
      {#key corazon}{#if corazon}<span class="corazon" aria-hidden="true">❤️</span>{/if}{/key}
    </div>
    {#if fotos.length > 1}
      <div class="puntos" role="tablist" aria-label="Fotos">
        {#each fotos as f, i (f.path)}<button role="tab" aria-selected={i === indice} aria-label="Foto {i + 1}" class:on={i === indice} onclick={() => irA(i)}></button>{/each}
      </div>
    {/if}
  {/if}

  {#if p.tipo === 'resultado_partido' && p.marcador}
    {@const m = p.marcador}
    {@const nosotros = [p.autor, ...(m.companero ? [m.companero] : [])]}
    {@const filas = [
      { pareja: nosotros.map((u) => (u === yo() ? 'Tú' : primerNombre(nombreDe(u)))).join(' y '), sets: m.sets.map(([a, b]) => ({ v: a, gano: a > b })), gana: resultado === true },
      { pareja: (m.rivales ?? []).map((u) => (u === yo() ? 'Tú' : primerNombre(nombreDe(u)))).join(' y ') || 'Rivales', sets: m.sets.map(([a, b]) => ({ v: b, gano: b > a })), gana: resultado === false }
    ]}
    <button class="marcador" onclick={abrir} aria-label="Marcador {textoMarcador(m)}">
      <span class="m-cab"><span>{p.club ?? 'Partido'}</span><span class="fin">{resultado === true ? '🏆 Final' : 'Final'}</span></span>
      {#each filas as f (f.pareja)}
        <span class="m-fila" class:gana={f.gana}>
          <span class="m-par">{f.pareja}</span>
          {#each f.sets as x, i (i)}<b class:perdido={!x.gano}>{x.v}</b>{/each}
        </span>
      {/each}
      <span class="sr">{textoMarcador(m)}</span>
    </button>
  {/if}

  <div class="acciones">
    {#each REACCIONES.slice(0, 4) as r (r.id)}
      {@const n = reacciones.filter((x) => x.reaccion === r.id).length}
      <button class="rx" class:mia={mia === r.id} aria-label="{r.nombre}{n ? ` (${n})` : ''}" onclick={() => reaccion(r.id)}>{r.emoji}{#if n}<em>{n}</em>{/if}</button>
    {/each}
    <button class="rx com" aria-label="Comentar" onclick={abrir}><Icon name="sms" size={18} />{#if comentarios.length}<em>{comentarios.length}</em>{/if}</button>
  </div>

  {#if p.texto}<p class="texto"><b>{esMia ? 'Tú' : primerNombre(nombreDe(p.autor))}</b> {p.texto}</p>{/if}

  {#if !completo && comentarios.length > 2}
    <button class="ver" onclick={abrir}>Ver los {comentarios.length} comentarios</button>
  {/if}
  {#each visibles as c (c.id)}
    {#if reportados.includes(c.id) || oculto('comentario', c.id)}<p class="com"><small>Comentario reportado</small></p>{:else}
      <button class="com" onclick={() => opcionesComentario(c)}><b>{c.autor === yo() ? 'Tú' : primerNombre(nombreDe(c.autor))}</b> {c.texto}</button>
    {/if}
  {/each}
  <form class="comentar" onsubmit={(e) => { e.preventDefault(); void enviarComentario(); }}>
    <input placeholder="Agrega un comentario…" maxlength="300" bind:value={texto} enterkeyhint="send" aria-label="Comentario" />
    {#if texto.trim()}<button disabled={enviando}>Publicar</button>{/if}
  </form>
</article>
{/if}

<style>
  .tarjeta-post { font-family: var(--q-font); padding-bottom: 8px; }
  header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; }
  .av { border: 0; padding: 0; background: none; border-radius: 50%; }
  .quien { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .quien b { font-size: 15px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nombre { cursor: pointer; }
  .usu, .con { font-weight: 600; color: var(--q-tx2); }
  .quien small { font-size: 12.5px; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mas { width: 36px; height: 36px; border: 0; background: none; color: var(--q-tx2); display: flex; align-items: center; justify-content: center; }
  .carrete { position: relative; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; aspect-ratio: 4 / 3; background: var(--q-sub); }
  .carrete::-webkit-scrollbar { display: none; }
  figure { flex: 0 0 100%; margin: 0; scroll-snap-align: start; position: relative; }
  .corazon { position: absolute; left: 50%; top: 50%; font-size: 90px; transform: translate(-50%, -50%); animation: late 0.8s ease-out forwards; pointer-events: none; }
  @keyframes late { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); } 30% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); } }
  .puntos { display: flex; justify-content: center; gap: 5px; padding: 8px 0 0; }
  .puntos button { width: 6px; height: 6px; padding: 0; border: 0; border-radius: 3px; background: var(--q-tx3); }
  .puntos button.on { background: var(--q-link); width: 14px; }
  /* Marcador estilo TV: el set ganado al 100 %, el perdido al 45 % */
  .marcador { display: block; width: calc(100% - 28px); margin: 0 14px; padding: 0; border: 0; border-radius: 12px; background: #0e1b33; color: #fff; overflow: hidden; text-align: left; }
  :global(html.dark) .marcador { box-shadow: inset 0 0 0 1px rgba(220, 230, 255, 0.12); }
  .m-cab { display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255, 255, 255, 0.06); font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  .m-cab .fin { color: var(--q-accd); }
  .m-fila { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
  .m-par { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gana .m-par { font-weight: 900; }
  .m-fila b { width: 22px; text-align: center; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; line-height: 1; }
  .m-fila b.perdido { opacity: 0.45; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .acciones { display: flex; gap: 6px; padding: 8px 10px 2px; }
  .rx { height: 34px; min-width: 40px; padding: 0 11px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; }
  .rx.mia { background: var(--q-accs); box-shadow: inset 0 0 0 1.5px var(--q-acc); }
  .rx em { font-style: normal; font-size: 12.5px; font-weight: 900; }
  .rx.com { margin-left: auto; }
  .texto { margin: 8px 14px 2px; font-size: 15px; line-height: 1.4; text-wrap: pretty; }
  .ver { border: 0; background: none; padding: 2px 14px; color: var(--q-tx2); font-size: 13.5px; }
  .com { display: block; border: 0; background: none; padding: 2px 14px; text-align: left; font-size: 14px; color: var(--q-tx); margin: 0; }
  .com small { color: var(--q-tx3); }
  .comentar { display: flex; gap: 8px; align-items: center; padding: 6px 14px 4px; }
  .comentar input { flex: 1; min-width: 0; border: 0; background: none; color: var(--q-tx); font: inherit; font-size: 14px; outline: none; padding: 6px 0; }
  .comentar button { border: 0; background: none; color: var(--q-link); font-weight: 900; font-size: 14px; }
  .reportada { margin: 12px 16px; color: var(--q-tx3); font-size: 13.5px; }
</style>
