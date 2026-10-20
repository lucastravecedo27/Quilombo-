<script lang="ts">
  // La red: TU RED con la cinta EN VIVO de lo que pasa, las historias de tu gente, tu próximo partido (héroe con la
  // cuenta regresiva para pagar), lo que está por resolver (un resultado por confirmar, alguien que te pide tu parte,
  // solicitudes), tu puesto en el ranking nacional y el feed en tres partes: 📸 Fotos · 🎾 Partidos · 💬 Actividad.
  import { Page } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { datos } from '$lib/data/datos.svelte';
  import { sincronizar } from '$lib/data/sync';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Feed from '../ui/feed/Feed.svelte';
  import SeccionesFeed from '../ui/feed/SeccionesFeed.svelte';
  import FotoPerfil from '../ui/perfil/FotoPerfil.svelte';
  import { armarFeed, type Seccion } from '../app/feed';
  import { historias, miHistoria, type PersonaHistoria } from '../app/historias';
  import { miPerfil } from '../app/perfil.svelte';
  import { conversaciones, nombreDe, perfilDe, responder, sinLeer, vinculos, yo } from '../app/vinculos';
  import { etiquetaPara, recibidas } from '../domain/vinculos';
  import { misResultados, porConfirmar } from '../app/resultados';
  import { ganoUid } from '../domain/ranking';
  import { franjaCompleta, misPartidos, misReservas, respuestas, torneos } from '../app/jugar';
  import { confirmados } from '../domain/jugar';
  import { meTocaPagar } from '../app/saldo';
  import AvisoPartes from '../ui/saldo/AvisoPartes.svelte';
  import { posicionDe } from '../ui/ranking/ranking';
  import { diaCorto, mmss, partirHora, reloj } from '../ui/jugar/reloj.svelte';

  onMount(() => { void sincronizar().catch(() => undefined); });
  const ir = (ruta: string) => () => { toque(); ui.navegar(ruta); };

  // Al volver a esta pantalla se recalcula lo que depende de lo visto (chats e historias)
  let vuelta = $state(0);
  const sinLeerN = $derived((void vuelta, conversaciones().filter((c) => sinLeer(c.id, c.ultimo)).length));

  // ── Cinta EN VIVO: lo último de tu red y los torneos con cupo
  const ticker = $derived.by(() => {
    const ev = (datos.eventos as { texto?: string | null }[]).map((e) => e.texto).filter((t): t is string => !!t).slice(0, 6);
    const tor = torneos().filter((t) => t.estado === 'inscripciones' && t.cupos > t.inscritos).slice(0, 2).map((t) => `${t.nombre}: quedan ${t.cupos - t.inscritos} cupos`);
    const l = [...ev.slice(0, 3), ...tor, ...ev.slice(3)];
    return l.length ? l : ['Bienvenido a Quilombo 🎾'];
  });

  // ── Historias
  const hist = $derived((void vuelta, void datos.eventos.length, void datos.publicaciones.length, historias()));
  let verHist = $state<number | null>(null);
  const mia = $derived((void vuelta, void datos.publicaciones.length, miHistoria()));
  let verMia = $state(false);
  function abrirHistoria(h: PersonaHistoria, k: number) {
    toque(6);
    if (!h.items.length) { ui.navegar(`/persona/${h.uid}/`); return; }
    verHist = k;
  }

  // ── Tu próximo partido: la reserva que viene (o, si no hay, el partido con cancha al que me invitaron)
  const proximo = $derived.by(() => {
    const con = (ps: ReturnType<typeof misPartidos>) => ps.map((p) => ({ p, f: franjaCompleta(p.franja_id) })).filter((x) => x.f && x.p.estado !== 'cancelado' && Date.parse(x.f.fin) > Date.now()).sort((a, b) => a.f!.inicio.localeCompare(b.f!.inicio));
    return con(misReservas())[0] ?? con(misPartidos())[0] ?? null;
  });
  const caras = $derived(proximo ? confirmados(proximo.p, respuestas()).slice(0, 4) : []);

  // ── Por resolver
  const solicitudes = $derived(recibidas(vinculos(), yo()));
  async function aceptar(id: string, si: boolean) {
    toque(14);
    const err = await responder(id, si);
    ui.avisar(err ? { titulo: 'No se pudo', sub: err, icono: 'alerta' } : si ? { titulo: '¡Conectados!', icono: 'personas' } : { titulo: 'Solicitud rechazada' });
  }
  const pendientes = $derived(porConfirmar());
  const nAvisos = $derived(pendientes.length + meTocaPagar().length + solicitudes.length);

  // ── Ranking: mi puesto y los últimos 6 resultados (G en el acento, P en gris)
  const pos = $derived(posicionDe(yo()));
  const forma = $derived.by(() => {
    const v = misResultados().filter((r) => r.estado === 'valido').slice(0, 6).reverse().map((r) => ganoUid(r, yo()));
    const base = v.length >= 6 ? v : [...Array.from({ length: 6 - v.length }, (_, i) => i % 3 !== 1), ...v];
    return base.map((g, i) => ({ g, h: g ? 30 + i * 3 : 14 }));
  });

  // ── Feed
  let seccion = $state<Seccion>('fotos');
  const posts = $derived(armarFeed(seccion));
  const partidosAbiertos = $derived(armarFeed('partidos').filter((p) => p.k === 'partido').length);
</script>

<Page name="social" class="pa-social" noNavbar onPageBeforeIn={() => vuelta++}>
  <header class="cab">
    <div class="titulos"><span class="marca">QUILOMBO</span><h1>Tu red</h1></div>
    <div class="cab-bts">
      <button class="circ" aria-label="Buscar jugadores" onclick={ir('/buscar/')}><Icon name="buscar" size={21} stroke={2} /></button>
      <button class="circ" aria-label="Chats{sinLeerN ? `, ${sinLeerN} sin leer` : ''}" onclick={() => { toque(); ui.irA('chat'); }}>
        <Icon name="chat" size={21} stroke={2} />{#if sinLeerN}<i>{sinLeerN}</i>{/if}
      </button>
    </div>
  </header>

  <div class="vivo" aria-label="En vivo">
    <span class="vivo-et"><i></i>EN VIVO</span>
    <div class="vivo-cinta"><div class="vivo-mov">
      {#each [...ticker, ...ticker] as t, k (k)}<span><b>●</b>{t}</span>{/each}
    </div></div>
  </div>

  <nav class="historias" aria-label="Historias de tu gente">
    {#if mia.items.length}
      <button class="hist" onclick={() => { toque(6); verMia = true; }} aria-label="Ver tu historia">
        <span class="aro nuevo"><span class="hueco"><FotoPerfil perfil={miPerfil()} size={54} /></span></span>
        <small>Tu historia</small>
      </button>
    {:else}
      <button class="hist" onclick={() => { toque(); ui.publicar = { tipo: 'foto' }; }} aria-label="Subir una foto">
        <span class="aro sin"><FotoPerfil perfil={miPerfil()} size={56} /><i class="mas-badge">+</i></span>
        <small>Comparte</small>
      </button>
    {/if}
    {#each hist as h, k (h.uid)}
      <button class="hist" onclick={() => abrirHistoria(h, k)} aria-label="{h.nombre}{h.nuevo ? ', tiene algo nuevo' : ''}" data-nuevo={h.nuevo}>
        <span class="aro" class:nuevo={h.nuevo} class:visto={!h.nuevo && h.items.length > 0} class:sin={!h.items.length}>
          <span class="hueco"><FotoPerfil perfil={perfilDe(h.uid) ?? { nombre: h.nombre, color: h.color }} size={54} /></span>
        </span>
        <small>{h.nombre.split(' ')[0]}</small>
      </button>
    {/each}
  </nav>

  {#if proximo}
    {@const f = proximo.f!}
    {@const h = partirHora(f.inicio)}
    <button class="heroe" onclick={ir(`/partido/${proximo.p.id}/`)} aria-label="Tu próximo partido: {diaCorto(f.inicio)} {h.hora} {h.ampm} en {f.club.nombre}">
      <span class="h-aro" aria-hidden="true"></span>
      <span class="h-arriba">
        <small>Tu próximo partido</small>
        <b>{diaCorto(f.inicio)}</b>
        <b>{h.hora} {h.ampm}</b>
        <span class="h-donde">{f.club.nombre} · {f.cancha.nombre}{f.cancha.tipo ? ` · ${f.cancha.tipo === 'panoramica' ? 'panorámica' : f.cancha.tipo}` : ''}</span>
      </span>
      <span class="h-abajo">
        <span class="h-caras">{#each caras as u (u)}<span class="h-cara"><FotoPerfil perfil={perfilDe(u) ?? { nombre: nombreDe(u), color: '#1e7fd0' }} size={32} /></span>{/each}</span>
        {#if f.estado === 'pagada'}
          <span class="h-chip pagada">✓ PAGADA</span>
        {:else}
          <span class="h-chip">⏳ {mmss(f.apartada_hasta, reloj.ahora) || 'Falta pagar'}{f.apartada_hasta ? ' para pagar' : ''}</span>
        {/if}
      </span>
    </button>
  {:else}
    <button class="heroe vacio" onclick={() => { toque(); ui.irA('jugar'); }}>
      <span class="h-aro" aria-hidden="true"></span>
      <span class="h-arriba">
        <small>Tu próximo partido</small>
        <b>¿Jugamos?</b>
        <span class="h-donde">Reserva una cancha libre en tu ciudad →</span>
      </span>
    </button>
  {/if}

  {#if nAvisos}
    <div class="sec"><h2>Por resolver</h2><span>{nAvisos}</span></div>
    <div class="avisos">
      {#each pendientes as r (r.id)}
        <button class="confirmar" onclick={ir(`/resultado/${r.id}/`)}>
          <span class="ico" aria-hidden="true">🏆</span>
          <span class="t"><b>{r.propuesto_por ? nombreDe(r.propuesto_por).split(' ')[0] : 'Alguien'} propuso un resultado</b><small>{r.sets.map(([a, b]) => `${a}-${b}`).join(' ')} · confírmalo para que cuente</small></span>
          <span class="ir">Ver ›</span>
        </button>
      {/each}
      <AvisoPartes />
      {#each solicitudes as v (v.id)}
        <div class="sol">
          <span class="sol-cara"><FotoPerfil perfil={perfilDe(v.user_a) ?? { nombre: nombreDe(v.user_a), color: '#18895b' }} size={40} /></span>
          <span class="t"><b>{nombreDe(v.user_a).split(' ')[0]}</b> te agregó como <b>{etiquetaPara(v, v.user_a).toLowerCase()}</b></span>
          <button class="si" onclick={() => aceptar(v.id, true)}>¡Sí!</button>
          <button class="no" aria-label="Rechazar" onclick={() => aceptar(v.id, false)}><Icon name="cerrar" size={13} stroke={2.8} /></button>
        </div>
      {/each}
    </div>
  {/if}

  <button class="ranking" onclick={ir('/ranking/')} aria-label="Ranking nacional{pos ? `, vas de ${pos.pos}` : ''}">
    <span class="r-izq">
      <small>Ranking nacional</small>
      <b>{pos ? `Vas #${pos.pos}` : 'Mira quién manda'}</b>
      <span>{pos ? `${pos.puntos.toLocaleString('es-CO')} pts · ${pos.victorias}–${pos.derrotas}${pos.racha > 0 ? ` · racha 🔥${pos.racha}` : ''}` : 'Suma con partidos confirmados'}</span>
    </span>
    <span class="r-der" aria-hidden="true">
      <span class="barras">{#each forma as f, i (i)}<i class:g={f.g} style="height:{f.h}px"></i>{/each}</span>
      <small>Últimos 6</small>
    </span>
  </button>

  <div class="rapidos" role="toolbar" aria-label="Publicar">
    <button onclick={() => { toque(); ui.publicar = { tipo: 'foto' }; }}>📸 Foto</button>
    <button onclick={() => { toque(); ui.publicar = { tipo: 'resultado_partido' }; }}>🎾 Resultado</button>
    <button onclick={ir('/gente/')}>👥 Gente</button>
  </div>

  <SeccionesFeed bind:valor={seccion} {partidosAbiertos} />
  {#key seccion}
    <Feed {posts}>
      {#snippet vacio()}
        <div class="q-vacio">
          {#if seccion === 'fotos'}<b>Aún no hay fotos</b>Sube la primera de tu partido 📸
          {:else if seccion === 'partidos'}<b>Nada por jugar</b>Invita a tu gente y aparten cancha 🎾
          {:else}<b>Sin actividad</b>Agrega a tu gente para ver lo que pasa en la cancha.{/if}
        </div>
      {/snippet}
    </Feed>
  {/key}
  <div class="q-espacio-tabbar"></div>
</Page>

{#if verMia}
  {#await import('../ui/feed/Historias.svelte') then H}<H.default personas={[mia]} inicio={0} alCerrar={() => { verMia = false; vuelta++; }} />{/await}
{/if}
{#if verHist !== null}
  {#await import('../ui/feed/Historias.svelte') then H}<H.default personas={hist} inicio={verHist} alCerrar={() => { verHist = null; vuelta++; }} />{/await}
{/if}

<style>
  :global(.page.pa-social .page-content) { font-family: var(--q-font); }
  .cab { display: flex; align-items: flex-end; justify-content: space-between; padding: calc(env(safe-area-inset-top, 0px) + 6px) 18px 12px 20px; }
  .titulos { display: flex; flex-direction: column; }
  .marca { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 15px; letter-spacing: 0.14em; color: var(--q-acct); }
  h1 { margin: 0; font-size: 50px; font-weight: 900; line-height: 0.9; }
  .cab-bts { display: flex; gap: 8px; }
  .circ { position: relative; width: 44px; height: 44px; border: 0; border-radius: 22px; background: var(--q-sub); color: var(--q-tx); display: flex; align-items: center; justify-content: center; padding: 0; }
  .circ i { position: absolute; top: -2px; right: -2px; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; background: var(--q-rojo); color: #fff; font-style: normal; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; }

  /* Cinta EN VIVO */
  .vivo { display: flex; align-items: center; height: 34px; background: #0e1b33; color: #fff; overflow: hidden; }
  .vivo-et { flex: none; position: relative; z-index: 1; height: 100%; display: flex; align-items: center; gap: 6px; padding: 0 12px 0 18px; background: var(--q-rojo); font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 15px; letter-spacing: 0.06em; }
  .vivo-et i { width: 7px; height: 7px; border-radius: 4px; background: #fff; animation: q-pulso 1.2s infinite; }
  .vivo-cinta { flex: 1; overflow: hidden; white-space: nowrap; }
  .vivo-mov { display: inline-flex; gap: 28px; padding-left: 16px; animation: q-tick 34s linear infinite; font-size: 13.5px; font-weight: 700; }
  .vivo-mov span { display: inline-flex; gap: 8px; align-items: center; }
  .vivo-mov b { color: var(--q-accd); }

  /* Historias: aro cónico (acento → azul → rojo → dorado), gris cuando ya se vio */
  .historias { display: flex; gap: 12px; overflow-x: auto; padding: 14px 16px 4px; scrollbar-width: none; }
  .historias::-webkit-scrollbar { display: none; }
  .hist { flex: none; width: 68px; display: flex; flex-direction: column; align-items: center; gap: 5px; border: 0; background: none; padding: 0; color: var(--q-tx); }
  .hist small { font-size: 12px; font-weight: 800; max-width: 68px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .aro { position: relative; width: 64px; height: 64px; border-radius: 32px; display: flex; align-items: center; justify-content: center; }
  .aro.nuevo { background: conic-gradient(var(--q-acc), #1e7fd0, #e8475b, #b98500, var(--q-acc)); }
  .aro.visto { background: var(--q-tx3); }
  .aro.sin { box-shadow: inset 0 0 0 1.5px var(--q-borde); }
  .hueco { width: 59px; height: 59px; border-radius: 30px; background: var(--q-bg); display: flex; align-items: center; justify-content: center; }
  .mas-badge { position: absolute; right: 0; bottom: 0; width: 22px; height: 22px; border-radius: 11px; background: var(--q-acc); color: var(--q-acctx); font-style: normal; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px var(--q-bg); }

  /* Héroe: tu próximo partido */
  .heroe { position: relative; display: block; width: calc(100% - 32px); margin: 12px 16px 0; padding: 0; border: 0; border-radius: 18px; background: #0e1b33; color: #fff; text-align: left; overflow: hidden; }
  :global(html.dark) .heroe { box-shadow: inset 0 0 0 1px rgba(220, 230, 255, 0.12); }
  .h-aro { position: absolute; right: -50px; top: -46px; width: 170px; height: 170px; border-radius: 50%; border: 22px solid var(--q-accd); opacity: 0.95; box-sizing: border-box; }
  .h-arriba { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 16px 18px 14px; }
  .h-arriba small { font-size: 11.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.7; }
  .h-arriba b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 54px; line-height: 0.88; text-transform: uppercase; }
  .h-arriba b:first-of-type { margin-top: 6px; }
  .h-donde { font-size: 14px; font-weight: 700; opacity: 0.85; margin-top: 6px; }
  .h-abajo { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 18px 14px; border-top: 1.5px dashed rgba(255, 255, 255, 0.2); }
  .h-caras { display: flex; }
  .h-cara { display: inline-flex; margin-right: -8px; border-radius: 50%; box-shadow: 0 0 0 2.5px #0e1b33; }
  .h-chip { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.14); font-size: 13px; font-weight: 900; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .h-chip.pagada { background: #18895b; }
  .heroe.vacio b { font-size: 46px; }

  /* Por resolver */
  .sec { display: flex; align-items: baseline; justify-content: space-between; margin: 24px 20px 10px; }
  .sec h2 { margin: 0; font-size: 22px; font-weight: 800; }
  .sec span { font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .avisos { display: flex; flex-direction: column; gap: 8px; padding: 0 16px; }
  .confirmar { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 0; border-radius: 14px; background: #b98500; color: #fff; text-align: left; animation: q-ov 0.4s both; }
  .confirmar .ico { font-size: 26px; }
  .t { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .confirmar b { font-size: 15px; }
  .confirmar small { font-size: 13px; opacity: 0.92; }
  .confirmar .ir { font-size: 14px; font-weight: 900; }
  .sol { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: #3346a8; color: #fff; animation: q-ov 0.5s both; }
  .sol .t { display: block; font-size: 14px; line-height: 1.3; font-weight: 600; }
  .sol-cara { display: inline-flex; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3); flex: none; }
  .si { height: 38px; padding: 0 14px; border-radius: 10px; border: 0; background: #fff; color: #3346a8; font-size: 14px; font-weight: 900; }
  .no { width: 34px; height: 34px; border-radius: 17px; border: 0; background: rgba(255, 255, 255, 0.2); color: #fff; display: flex; align-items: center; justify-content: center; padding: 0; flex: none; }

  /* Ranking */
  .ranking { position: relative; display: flex; align-items: center; justify-content: space-between; width: calc(100% - 32px); margin: 16px 16px 0; padding: 16px 18px; border: 1px solid var(--q-line); border-radius: 16px; background: var(--q-card); color: var(--q-tx); text-align: left; overflow: hidden; }
  .r-izq { display: flex; flex-direction: column; gap: 2px; }
  .r-izq small { font-size: 11.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--q-acct); }
  .r-izq b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 40px; line-height: 0.95; text-transform: uppercase; }
  .r-izq span { font-size: 13.5px; color: var(--q-tx2); font-weight: 600; }
  .r-der { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .barras { display: flex; align-items: flex-end; gap: 4px; height: 46px; }
  .barras i { width: 9px; border-radius: 3px; background: var(--q-sub); }
  .barras i.g { background: var(--q-acc); }
  .r-der small { font-size: 11.5px; font-weight: 800; color: var(--q-tx2); }

  .rapidos { display: flex; gap: 6px; margin: 22px 16px 0; }
  .rapidos button { flex: 1; height: 36px; border: 1px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); font-size: 13.5px; font-weight: 800; white-space: nowrap; }
</style>
