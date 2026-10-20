<script lang="ts">
  // Chat uno a uno con alguien de tu gente. En tiempo real, con stickers rápidos, fotos y notas de voz,
  // cobros (la cancha dividida) como tarjetas dentro de la conversación y "son 30 mil" → botón para cobrar.
  import { Page, Navbar, f7 } from 'framework7-svelte';
  import { onMount, tick } from 'svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { sincronizar } from '$lib/data/sync';
  import { ui } from '$lib/app/ui.svelte';
  import { toque, reducirMovimiento } from '$lib/ui/tema.svelte';
  import FilaCobro from '../ui/cobros/FilaCobro.svelte';
  import { menuContenido } from '../ui/moderar';
  import Gestos from '../ui/Gestos.svelte';
  import BurbujaFoto from '../ui/chat/BurbujaFoto.svelte';
  import BurbujaVoz from '../ui/chat/BurbujaVoz.svelte';
  import { oculto, pedirTerminos } from '../app/social';
  import { borrarMensaje, cobros, cobrosAbiertos, enviarMensaje, escucharChat, marcarPresencia, marcarVisto, mensajesDe, nombreDe, perfilDe, vinculos, yo, type Sala } from '../app/vinculos';
  import { subirAdjunto, formatoVoz, duracionTexto } from '../app/chatAdjuntos';
  import { etiquetaPara, otroDe } from '../domain/vinculos';
  import { lineaJugador } from '../domain/padel';
  import { pesos } from '../domain/jugar';

  /** "son 30 mil", "$45.000", "40k" → pesos (o null) */
  function montoEnTexto(t: string): number | null {
    const m = t.toLowerCase().match(/\$?\s?(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(mil|k|lucas|barras)?\b/);
    if (!m) return null;
    const n = Number(m[1].replace(/[.,]/g, '')) * (m[2] ? 1000 : 1);
    return n >= 1000 && n <= 50_000_000 ? n : null;
  }

  let { id }: { tipo?: string; id: string } = $props();
  const tipo = 'r';
  let texto = $state('');
  let lista = $state<HTMLElement | undefined>();
  let campo = $state<HTMLInputElement | undefined>();
  let enfocado = $state(false);
  /** Mensajes que salieron de aquí y aún no confirma el servidor (se ven al instante) */
  type AdjPendiente = { tipo: 'foto' | 'voz'; local: string; blob: Blob; duracion?: number };
  let pendientes = $state<{ tmp: string; texto: string; en: string; error: boolean; id?: string; adj?: AdjPendiente }[]>([]);
  /** Quién está escribiendo ahora (se borra solo a los 3,5 s) */
  let escribe = $state<string | null>(null);
  let tEscribe: ReturnType<typeof setTimeout> | null = null;
  let canal: ReturnType<typeof escucharChat> | null = null;
  const STICKERS = ['¿Jugamos hoy? 🎾', '¡Qué bandeja!', 'Revancha 😤', 'Ya te pago', 'Jajaja', 'Paila'];
  const esSticker = (t: string) => STICKERS.includes(t.trim());

  const rel = $derived(vinculos().find((v) => v.id === id && v.estado === 'activa') ?? null);
  const otro = $derived(rel ? otroDe(rel, yo()) : null);
  /** Lo que esta persona me debe (para el atajo "Cobrar $X") */
  const meDebe = $derived(otro ? cobrosAbiertos().filter((c) => c.acreedor === yo() && c.deudor === otro).reduce((a, c) => a + c.monto, 0) : 0);
  const titulo = $derived(otro ? nombreDe(otro) : 'Chat');
  const sub = $derived(rel ? [etiquetaPara(rel, yo()), lineaJugador(perfilDe(otro ?? ''))].filter(Boolean).join(' · ') : '');
  const color = $derived(otro ? perfilDe(otro)?.color ?? 'var(--q-fiesta-lila)' : 'var(--q-fiesta-cielo)');
  const autor = (uid: string) => nombreDe(uid);

  /** Mensajes + cobros entre los dos, en orden */
  const linea = $derived.by(() => {
    const ms = mensajesDe(sala()).map((m) => ({ k: 'm' as const, en: m.created_at, m }));
    const cs = otro ? cobros().filter((c) => (c.acreedor === otro && c.deudor === yo()) || (c.deudor === otro && c.acreedor === yo())).map((c) => ({ k: 'c' as const, en: c.created_at, c })) : [];
    // La burbuja temporal se va solo cuando la definitiva ya está en la lista (sin parpadeo ni duplicados)
    const ya = new Set(ms.map((x) => x.m.id));
    const mios = ms.filter((x) => x.m.autor === yo());
    const confirmada = (p: (typeof pendientes)[number]) =>
      p.id ? ya.has(p.id) : !p.error && mios.some((x) => x.m.texto === p.texto && x.m.created_at >= new Date(Date.parse(p.en) - 5000).toISOString());
    const ps = pendientes.filter((p) => !confirmada(p)).map((p) => ({ k: 'p' as const, en: p.en, p }));
    return [...ms, ...cs, ...ps].sort((a, b) => a.en.localeCompare(b.en));
  });
  const monto = $derived(montoEnTexto(texto));
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

  function sala(): Sala { return { relacion: id }; }

  // Teclado del iPhone en la PWA: la barra de escribir sube con él (en la app nativa la vista ya se encoge)
  let teclado = $state(0);
  // Alto real de la barra de escribir (cambia con el teclado, los stickers y la grabación): el último mensaje queda
  // justo encima de ella, sin hueco ni tapado
  let barraEscribir = $state<HTMLDivElement | undefined>();
  let altoEscribir = $state(120);
  $effect(() => {
    const el = barraEscribir;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { altoEscribir = Math.ceil(el.getBoundingClientRect().height); });
    ro.observe(el);
    return () => ro.disconnect();
  });
  /** Baja hasta el último mensaje (el final de la lista, contando el espacio de la barra) */
  function alFinal(suave = false) {
    const pagina = lista?.closest('.page-content') as HTMLElement | null;
    if (pagina) pagina.scrollTo({ top: pagina.scrollHeight, behavior: suave ? 'smooth' : 'auto' });
  }
  function medirTeclado() {
    const vv = window.visualViewport;
    teclado = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
  }

  onMount(() => {
    // Una sincronización al entrar (cobros y perfiles); los mensajes llegan por tiempo real
    void sincronizar().catch(() => undefined);
    // el chat ocupa la parte de abajo: la barra de pestañas se esconde mientras está abierto
    canal = escucharChat(sala(), (uid) => {
      escribe = uid;
      if (tEscribe) clearTimeout(tEscribe);
      tEscribe = setTimeout(() => (escribe = null), 3500);
    });
    window.visualViewport?.addEventListener('resize', medirTeclado);
    window.visualViewport?.addEventListener('scroll', medirTeclado);
    marcarVisto(id);
    // Mientras miras este chat no te llegan notificaciones de él
    const dejarPresencia = marcarPresencia(id);
    return () => {
      dejarPresencia();
      canal?.parar(); marcarVisto(id);
      window.visualViewport?.removeEventListener('resize', medirTeclado);
      window.visualViewport?.removeEventListener('scroll', medirTeclado);
    };
  });

  // Bajar al final: siempre con mensajes míos; con los ajenos solo si ya estaba abajo (no interrumpe si estás leyendo arriba)
  let primeraVez = true;
  let cuantos = 0;
  $effect(() => {
    const n = linea.length;
    const ultimo = linea[n - 1];
    const mio = ultimo && ((ultimo.k === 'm' && ultimo.m.autor === yo()) || ultimo.k === 'p');
    void tick().then(() => {
      const pagina = lista?.closest('.page-content');
      const cerca = !pagina || pagina.scrollHeight - pagina.scrollTop - pagina.clientHeight < 220;
      if (primeraVez || mio || cerca) alFinal(!primeraVez && !reducirMovimiento());
      if (n > cuantos && !primeraVez && ultimo?.k === 'm' && ultimo.m.autor !== yo()) { toque(4); marcarVisto(id); }
      primeraVez = false; cuantos = n;
    });
  });
  // Cuando la persona escribe, se le cuenta a la otra (con freno)
  $effect(() => { if (texto.trim()) canal?.escribiendo(); });
  // Al subir o bajar el teclado, que el último mensaje siga a la vista
  $effect(() => { void teclado; void altoEscribir; void tick().then(() => alFinal()); });

  async function enviar(t = texto, reintento?: string) {
    const limpio = t.trim();
    if (!limpio) return;
    if (!(await pedirTerminos())) return;
    toque(8);
    // Lo escrito: se limpia y el teclado sigue abierto. Un sticker o un atajo no abre el teclado (se pueden mandar seguidos)
    if (t === texto) { texto = ''; campo?.focus(); }
    const tmp = reintento ?? 'tmp-' + Math.random().toString(36).slice(2);
    if (reintento) pendientes = pendientes.map((p) => (p.tmp === tmp ? { ...p, error: false } : p));
    else pendientes = [...pendientes, { tmp, texto: limpio, en: new Date().toISOString(), error: false }];
    const { id: real, error: err } = await enviarMensaje(sala(), limpio);
    if (err) {
      pendientes = pendientes.map((p) => (p.tmp === tmp ? { ...p, error: true } : p));
      if (!navigator.onLine) ui.avisar({ titulo: 'Sin conexión', sub: 'Toca el mensaje para reintentar', icono: 'alerta' });
      else ui.avisar({ titulo: 'No se envió', sub: err, icono: 'alerta' });
      return;
    }
    pendientes = pendientes.map((p) => (p.tmp === tmp ? { ...p, id: real } : p));
    // Limpieza: las ya confirmadas que la lista ya muestra
    setTimeout(() => { const ya = new Set(mensajesDe(sala()).map((m) => m.id)); pendientes = pendientes.filter((p) => !p.id || !ya.has(p.id)); }, 1500);
  }
  // ── Fotos y notas de voz: se ven al instante (copia local) mientras suben
  async function enviarAdjunto(blob: Blob, clase: 'foto' | 'voz', duracion?: number, reintento?: string) {
    if (!(await pedirTerminos())) return;
    toque(8);
    const texto = clase === 'foto' ? '📷 Foto' : `🎙️ Nota de voz (${duracionTexto(duracion ?? 0)})`;
    const tmp = reintento ?? 'tmp-' + Math.random().toString(36).slice(2);
    if (reintento) pendientes = pendientes.map((p) => (p.tmp === tmp ? { ...p, error: false } : p));
    else pendientes = [...pendientes, { tmp, texto, en: new Date().toISOString(), error: false, adj: { tipo: clase, local: URL.createObjectURL(blob), blob, duracion } }];
    const fallo = (sub: string) => { pendientes = pendientes.map((p) => (p.tmp === tmp ? { ...p, error: true } : p)); ui.avisar({ titulo: 'No se envió', sub, icono: 'alerta' }); };
    const sub = await subirAdjunto(sala(), blob, clase);
    if (sub.error || !sub.path) { fallo(sub.error ?? 'Intenta de nuevo'); return; }
    const { id: real, error: err } = await enviarMensaje(sala(), texto, { tipo: clase, path: sub.path, duracion });
    if (err) { fallo(err); return; }
    pendientes = pendientes.map((p) => (p.tmp === tmp ? { ...p, id: real } : p));
    setTimeout(() => { const ya = new Set(mensajesDe(sala()).map((m) => m.id)); pendientes = pendientes.filter((p) => !p.id || !ya.has(p.id)); }, 1500);
  }
  let archivoFoto = $state<HTMLInputElement | undefined>();
  function fotoElegida(e: Event) {
    const i = e.currentTarget as HTMLInputElement;
    const f = i.files?.[0];
    i.value = '';
    if (f) void enviarAdjunto(f, 'foto');
  }

  // Grabar: tocar el micrófono empieza; "Enviar" la manda, "Cancelar" la bota. Máximo 5 minutos.
  let grabando = $state<{ desde: number; rec: MediaRecorder; stream: MediaStream; trozos: Blob[] } | null>(null);
  let segundos = $state(0);
  let reloj: ReturnType<typeof setInterval> | null = null;
  async function grabar() {
    const formato = formatoVoz();
    if (formato === undefined || !navigator.mediaDevices?.getUserMedia) { ui.avisar({ titulo: 'Este iPhone no deja grabar aquí', sub: 'Actualiza iOS o usa la app de Quilombo', icono: 'alerta' }); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { ui.avisar({ titulo: 'Sin permiso para el micrófono', sub: 'Actívalo en Configuración → Quilombo (o Safari) → Micrófono', icono: 'alerta' }); return; }
    const rec = formato ? new MediaRecorder(stream, { mimeType: formato }) : new MediaRecorder(stream);
    const g = { desde: Date.now(), rec, stream, trozos: [] as Blob[] };
    rec.ondataavailable = (ev) => { if (ev.data.size) g.trozos.push(ev.data); };
    // Sin trocitos (timeslice): en algunos iOS el mp4 armado por partes no se puede reproducir
    rec.start();
    grabando = g; segundos = 0;
    toque(12);
    reloj = setInterval(() => { segundos = Math.floor((Date.now() - g.desde) / 1000); if (segundos >= 300) void terminarGrabacion(true); }, 250);
  }
  async function terminarGrabacion(enviarla: boolean) {
    const g = grabando;
    if (!g) return;
    if (reloj) clearInterval(reloj);
    grabando = null;
    const dur = (Date.now() - g.desde) / 1000;
    await new Promise<void>((ok) => { g.rec.onstop = () => ok(); try { g.rec.stop(); } catch { ok(); } });
    g.stream.getTracks().forEach((t) => t.stop());
    if (!enviarla) { toque(4); return; }
    if (dur < 0.8 || !g.trozos.length) { ui.avisar({ titulo: 'Muy cortita', sub: 'Mantén la grabación al menos un segundo', icono: 'info' }, 3); return; }
    void enviarAdjunto(new Blob(g.trozos, { type: g.rec.mimeType || 'audio/mp4' }), 'voz', Math.round(dur));
  }
  $effect(() => () => { if (grabando) void terminarGrabacion(false); });

  function opcionesPendiente(p: { tmp: string; texto: string; error: boolean; adj?: AdjPendiente }) {
    if (!p.error) return;
    f7.actions.create({ buttons: [[
      { text: 'Reintentar', onClick: () => void (p.adj ? enviarAdjunto(p.adj.blob, p.adj.tipo, p.adj.duracion, p.tmp) : enviar(p.texto, p.tmp)) },
      { text: 'Descartar', color: 'red', onClick: () => (pendientes = pendientes.filter((x) => x.tmp !== p.tmp)) }
    ], [{ text: 'Cancelar' }]] }).open();
  }
  function opciones(mid: string) {
    f7.actions.create({ buttons: [[{ text: 'Borrar mensaje', color: 'red', onClick: () => void borrarMensaje(mid) }], [{ text: 'Cancelar' }]] }).open();
  }
  // Mensajes ajenos: tocar → reportar o bloquear
  let ocultos = $state<string[]>([]);
  function ajeno(mid: string, autor: string) {
    menuContenido('mensaje', mid, autor, nombreDe(autor).split(' ')[0], () => (ocultos = [...ocultos, mid]));
  }
</script>

{#snippet derecha()}
  <button class="historia" aria-label="Perfil de {titulo}" onclick={() => { toque(); ui.navegar(`/persona/${otro}/`); }}><Icon name="persona" size={21} stroke={2} /></button>
{/snippet}

<Page name="chat" class="pa-chat" noSwipeback={false}>
  <Navbar backLink="Atrás" title={titulo} subtitle={sub} right={otro ? derecha : undefined} />

  <div class="conv">
    {#if !rel}
      <p class="aviso">Esta conversación ya no está disponible.</p>
    {:else if !linea.length}
      <div class="primero q-entra">
        <span class="p-ic" style="background:{color}"><Icon name="sms" size={28} stroke={2} /></span>
        <b>Empieza la conversación</b>
        <span>Escribe algo, manda un sticker o invítalo a jugar. Si mencionas plata ("son 30 mil"), te ofrezco cobrarlo.</span>
      </div>
    {/if}
    {#each linea as it (it.k === 'm' ? it.m.id : it.k === 'c' ? it.c.id : it.p.tmp)}
      {#if it.k === 'p'}
        <div class="fila mia">
          {#if it.p.adj}
            <div class="adj pendiente" class:fallo={it.p.error}>
              {#if it.p.adj.tipo === 'foto'}<BurbujaFoto path="" local={it.p.adj.local} mia />{:else}<BurbujaVoz path="" local={it.p.adj.local} duracion={it.p.adj.duracion} mia />{/if}
            </div>
            <button class="estado-adj" class:fallo={it.p.error} onclick={() => opcionesPendiente(it.p)}>{it.p.error ? '⚠︎ No se envió · toca para reintentar' : 'Enviando…'}</button>
          {:else}
          <button class="burbuja mia pendiente" class:fallo={it.p.error} class:sticker={esSticker(it.p.texto)} onclick={() => opcionesPendiente(it.p)} aria-label={it.p.error ? 'No se envió; toca para reintentar' : 'Enviando'}>
            {it.p.texto}<small>{it.p.error ? '⚠︎ No se envió · toca' : 'Enviando…'}</small>
          </button>
          {/if}
        </div>
      {:else if it.k === 'c'}
        <div class="tarjeta-cobro"><FilaCobro c={it.c} compacto /></div>
      {:else if it.m.deleted_at}
        <div class="burbuja borrado" class:mia={it.m.autor === yo()}>Mensaje eliminado</div>
      {:else if ocultos.includes(it.m.id) || oculto('mensaje', it.m.id)}
        <div class="burbuja borrado">Mensaje reportado</div>
      {:else}
        {@const mia = it.m.autor === yo()}
        <div class="fila" class:mia>
          {#if it.m.adjunto && (it.m.tipo === 'foto' || it.m.tipo === 'voz')}
            <div class="adj">
              {#if it.m.tipo === 'foto'}<BurbujaFoto path={it.m.adjunto} {mia} nota={it.m.texto.replace(/^📷 Foto\s*·?\s*/, '')} />
              {:else}<BurbujaVoz path={it.m.adjunto} duracion={it.m.duracion ?? 0} {mia} />{/if}
            </div>
            <button class="hora-adj" onclick={() => (mia ? opciones(it.m.id) : ajeno(it.m.id, it.m.autor))} aria-label={mia ? 'Opciones de tu mensaje' : 'Reportar mensaje'}>{hora(it.m.created_at)} · ⋯</button>
          {:else}
          <button class="burbuja" class:mia class:sticker={esSticker(it.m.texto)} onclick={() => (mia ? opciones(it.m.id) : ajeno(it.m.id, it.m.autor))} aria-label={mia ? 'Tu mensaje; toca para opciones' : 'Mensaje; toca para reportar'}>
            {it.m.texto}<small>{hora(it.m.created_at)}</small>
          </button>
          {/if}
        </div>
      {/if}
    {/each}
    {#if escribe}
      <div class="fila"><span class="escribiendo" aria-live="polite">{autor(escribe).split(' ')[0]} está escribiendo<i></i><i></i><i></i></span></div>
    {/if}
    <div bind:this={lista} class="fin"></div>
    <div aria-hidden="true" style:height="{Math.max(0, teclado + altoEscribir - 14)}px"></div>
  </div>

  {#if rel}
    <div class="escribir" bind:this={barraEscribir} class:compacta={enfocado} style:bottom="{teclado}px">
      {#if monto && otro}
        <button class="sugerir" onclick={() => { toque(); ui.cobrar = { para: [otro], monto, concepto: texto.trim().slice(0, 80) }; }}>
          <Icon name="dividir" size={16} stroke={2.2} /> Cobrarle {pesos(monto)} a {titulo.split(' ')[0]}
        </button>
      {/if}
      {#if !enfocado}
        <Gestos relacion={rel.id} nombre={titulo.split(' ')[0]} compacto />
        <div class="stickers">
          <button class="del-mes" onclick={() => { toque(); if (otro) ui.invitar = { con: [otro] }; }}>🎾 Invitar a jugar</button>
          {#if meDebe > 0 && otro}<button class="accion" onclick={() => { toque(); enviar(`Oye, me debes ${pesos(meDebe)} de la cancha 🙏`); }}><Icon name="dividir" size={14} stroke={2.4} /> Cobrar {pesos(meDebe)}</button>{/if}
          <button class="accion" onclick={() => { toque(); ui.cobrar = { para: otro ? [otro] : [] }; }}><Icon name="dividir" size={14} stroke={2.2} /> Dividir la cancha</button>
          {#each STICKERS as st}<button onclick={() => enviar(st)}>{st}</button>{/each}
        </div>
      {/if}
      {#if grabando}
        <div class="grabando" role="status" aria-live="polite">
          <button class="cancelar" onclick={() => terminarGrabacion(false)}>Cancelar</button>
          <span class="rec"><i></i>{duracionTexto(segundos)}</span>
          <button class="mandar" aria-label="Enviar nota de voz" onclick={() => terminarGrabacion(true)}><Icon name="subir" size={20} stroke={2.6} /></button>
        </div>
      {:else}
      <form class="barra" onsubmit={(e) => { e.preventDefault(); void enviar(); }}>
        <button type="button" class="adjuntar" aria-label="Mandar una foto" onclick={() => { toque(6); archivoFoto?.click(); }}><Icon name="camara" size={21} stroke={2} /></button>
        <input bind:this={archivoFoto} type="file" accept="image/*" hidden onchange={fotoElegida} />
        <input bind:this={campo} placeholder="Escribe un mensaje" maxlength="500" bind:value={texto} aria-label="Mensaje" enterkeyhint="send" autocomplete="off"
          onkeydown={(e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); void enviar(); } }}
          onfocus={() => (enfocado = true)} onblur={() => setTimeout(() => (enfocado = document.activeElement === campo), 120)} />
        <!-- Enviar sin quitar el foco (el teclado no se cierra). Con el dedo se envía en touchend y se cancela el click;
             frenar el pointerdown táctil hacía que en el iPhone el toque no enviara nada. Con mouse basta frenar el mousedown. -->
        {#if texto.trim()}
          <button class="mandar" aria-label="Enviar"
            onmousedown={(e) => e.preventDefault()}
            ontouchend={(e) => { if (!texto.trim()) return; e.preventDefault(); void enviar(); }}><Icon name="subir" size={20} stroke={2.6} /></button>
        {:else}
          <button type="button" class="mandar mic" aria-label="Grabar nota de voz" onclick={grabar}><Icon name="mic" size={21} stroke={2.1} /></button>
        {/if}
      </form>
      {/if}
    </div>
  {/if}
</Page>

<style>
  /* El espacio de abajo lo da el separador que mide la barra de escribir (sin hueco fijo) */
  :global(.page.pa-chat .page-content) { font-family: var(--q-font-fiesta); padding-bottom: 0 !important; }
  .historia { width: 40px; height: 40px; border: 0; background: none; color: var(--q-link); display: flex; align-items: center; justify-content: center; }
  .conv { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; }
  .aviso { text-align: center; color: var(--q-tx2); padding: 30px 16px; }
  .primero { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 24px; text-align: center; }
  .p-ic { width: 64px; height: 64px; border-radius: 14px; color: var(--q-fiesta-tinta); display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
  .primero b { font-size: 18px; font-weight: 900; }
  .primero span { font-size: 14px; color: var(--q-tx2); line-height: 1.4; }
  .fila { display: flex; flex-direction: column; align-items: flex-start; }
  .fila.mia { align-items: flex-end; }
  .burbuja { max-width: 78%; padding: 9px 13px 7px; border: 0; border-radius: 14px; background: var(--q-sub); color: var(--q-tx); font-family: inherit; font-size: 15.5px; line-height: 1.35; text-align: left; white-space: pre-wrap; word-break: break-word; display: flex; flex-direction: column; gap: 2px; }
  .burbuja.mia { border-radius: 14px; background: var(--q-acc); color: var(--q-acctx); }
  .burbuja small { align-self: flex-end; font-size: 10.5px; opacity: 0.6; }
  .burbuja.sticker { font-size: 22px; font-weight: 900; background: var(--q-acc); color: var(--q-acctx); border-radius: 10px; }
  .burbuja.borrado { align-self: flex-start; font-style: italic; opacity: 0.55; font-size: 13.5px; }
  .burbuja.borrado.mia { align-self: flex-end; }
  .tarjeta-cobro { align-self: stretch; margin: 6px 4px; padding: 6px 12px; border-radius: 14px; background: var(--q-card); border: 1.5px dashed color-mix(in srgb, var(--q-fiesta-lila) 70%, transparent); }
  .fin { height: 1px; }
  .adj { max-width: 82%; }
  .adj.pendiente { opacity: 0.7; }
  .adj.pendiente.fallo { opacity: 1; filter: saturate(0.4); }
  .hora-adj, .estado-adj { border: 0; background: none; padding: 4px 6px; min-height: 28px; font-family: inherit; font-size: 11px; font-weight: 700; color: var(--q-tx3); }
  .estado-adj.fallo { color: var(--q-alr); font-weight: 900; }
  .adjuntar { width: 44px; height: 44px; border-radius: 22px; border: 0; padding: 0; background: var(--q-sub); color: var(--q-tx); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .mandar.mic { background: var(--q-sub); color: var(--q-tx); }
  .grabando { display: flex; align-items: center; gap: 10px; height: 44px; }
  .grabando .cancelar { height: 44px; padding: 0 14px; border-radius: 14px; border: 0; background: var(--q-sub); color: var(--q-tx); font-family: var(--q-font-fiesta); font-size: 15px; font-weight: 800; }
  .rec { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--q-font-fiesta); font-size: 18px; font-weight: 900; font-variant-numeric: tabular-nums; }
  .rec i { width: 12px; height: 12px; border-radius: 6px; background: #ff3b30; animation: q-titilar 1s ease-in-out infinite; }
  /* Sólida (sin desenfoque): el blur encima de una lista que se desplaza cuesta cuadros en el iPhone */
  .escribir { position: fixed; left: 0; right: 0; bottom: 0; z-index: 600; padding: 8px 12px calc(10px + env(safe-area-inset-bottom)); background: var(--q-hoja, var(--q-elev)); border-top: 0.5px solid var(--q-glassline); contain: layout style; display: flex; flex-direction: column; gap: 8px; }
  .sugerir { align-self: flex-start; height: 34px; padding: 0 14px; border-radius: 10px; border: 0; background: var(--q-fiesta-lila); color: var(--q-fiesta-tinta); font-family: var(--q-font-fiesta); font-size: 13.5px; font-weight: 900; display: flex; align-items: center; gap: 6px; }
  .stickers { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .stickers::-webkit-scrollbar { display: none; }
  /* Se desvanece al final: se nota que sigue (antes parecía cortada) */
  .stickers { -webkit-mask-image: linear-gradient(90deg, #000 88%, transparent); mask-image: linear-gradient(90deg, #000 88%, transparent); padding-right: 24px; }
  .stickers .del-mes { background: var(--q-acc); color: var(--q-acctx); font-weight: 900; }
  .stickers .accion { display: flex; align-items: center; gap: 5px; border: 1px solid var(--q-borde, var(--q-line)); background: transparent; }
  .stickers button { flex-shrink: 0; height: 32px; padding: 0 12px; border-radius: 10px; border: 0; background: var(--q-sub); color: var(--q-tx); font-family: var(--q-font-fiesta); font-size: 13px; font-weight: 800; }
  .barra { display: flex; gap: 8px; align-items: center; }
  .barra input { flex: 1; min-width: 0; height: 44px; padding: 0 16px; border-radius: 14px; border: 0.5px solid var(--q-line); background: var(--q-card); color: var(--q-tx); font-family: var(--q-font-fiesta); font-size: 16px; outline: none; }
  .mandar { width: 44px; height: 44px; border-radius: 22px; border: 0; background: var(--q-acc); color: var(--q-acctx); display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; }
  .mandar:disabled { opacity: 0.4; }
  .escribir { transition: bottom 0.12s ease-out; }
  .escribir.compacta { gap: 6px; }
  .burbuja.pendiente { opacity: 0.65; }
  .burbuja.pendiente.fallo { opacity: 1; background: color-mix(in srgb, var(--q-alr) 22%, var(--q-sub)); color: var(--q-tx); }
  .escribiendo { display: inline-flex; align-items: center; gap: 3px; padding: 8px 13px; border-radius: 10px 10px 10px 6px; background: var(--q-sub); color: var(--q-tx2); font-size: 13px; font-weight: 700; }
  .escribiendo i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: q-salto 1s infinite ease-in-out; }
  .escribiendo i:nth-of-type(2) { animation-delay: 0.15s; }
  .escribiendo i:nth-of-type(3) { animation-delay: 0.3s; }
  @keyframes q-salto { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-3px); opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .escribiendo i { animation: none; } }
</style>
