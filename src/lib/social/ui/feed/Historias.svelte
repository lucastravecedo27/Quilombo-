<script lang="ts">
  import { colorMarca } from '$lib/ui/avatares';
  // Visor de historias (pantalla completa, como Instagram): fotos y resultados de las últimas 24 h y gestos.
  // Avanza solo (~5 s), toque a la derecha/izquierda, mantener = pausa, deslizar hacia abajo = cerrar.
  // Al terminar una persona sigue con la siguiente que tenga algo nuevo.
  import { onMount, untrack } from 'svelte';
  import FotoSocial from '../FotoSocial.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { REACCIONES_HISTORIA, reducirMovimiento, toque } from '$lib/ui/tema.svelte';
  import { registrarAtras } from '$lib/app/atras';
  import { marcarVista, primeroSinVer, type PersonaHistoria } from '../../app/historias';
  import { hace, ini, primerNombre } from '../../app/rituales';
  import { enviarMensaje, nombreDe } from '../../app/vinculos';
  import { emojiGesto, gano, GESTOS, textoMarcador } from '../../domain/social';

  let { personas, inicio = 0, alCerrar }: { personas: PersonaHistoria[]; inicio?: number; alCerrar: () => void } = $props();

  const DURACION = 5000;
  // La persona tocada y, después, las que tienen algo nuevo
  const cola = $derived([personas[inicio], ...personas.slice(inicio + 1).filter((p) => p.nuevo && p.items.length)].filter(Boolean));
  let p = $state(0);
  // Empieza donde la persona se quedó (el primer ítem sin ver)
  let i = $state(untrack(() => (personas[inicio] ? primeroSinVer(personas[inicio]) : 0)));
  let progreso = $state(0);
  let pausado = $state(false);
  let arrastre = $state(0);
  const persona = $derived(cola[p]);
  const item = $derived(persona?.items[i]);

  function alCuerpo(nodo: HTMLElement) {
    document.body.appendChild(nodo);
    return { destroy: () => nodo.remove() };
  }
  function cerrar() { toque(4); alCerrar(); }
  function irA(np: number, ni: number) {
    if (np >= cola.length) { alCerrar(); return; }
    if (np < 0) { np = 0; ni = 0; }
    p = np; i = ni; progreso = 0;
  }
  function siguiente() {
    if (!persona) return;
    if (i < persona.items.length - 1) irA(p, i + 1);
    else if (p + 1 < cola.length) irA(p + 1, primeroSinVer(cola[p + 1]));
    else alCerrar();
  }
  function anterior() {
    if (i > 0) irA(p, i - 1);
    else if (p > 0) irA(p - 1, cola[p - 1].items.length - 1);
    else progreso = 0;
  }
  // Lo que se ve queda marcado como visto
  $effect(() => { if (item) marcarVista(item.id); });

  onMount(() => {
    let antes = performance.now();
    let cuadro = 0;
    const paso = (t: number) => {
      const dt = t - antes; antes = t;
      if (!pausado && document.visibilityState === 'visible') {
        progreso += dt / DURACION;
        if (progreso >= 1) siguiente();
      }
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    // Escape y el botón atrás las cierran (gestor global); flechas para moverse
    const tecla = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') siguiente(); else if (e.key === 'ArrowLeft') anterior(); };
    window.addEventListener('keydown', tecla);
    const liberar = registrarAtras(cerrar);
    return () => { cancelAnimationFrame(cuadro); window.removeEventListener('keydown', tecla); liberar(); };
  });

  // Toque, mantener y deslizar
  let x0 = 0, y0 = 0, t0 = 0, mantener: ReturnType<typeof setTimeout> | null = null, sostuvo = false, activo = false;
  function abajo(e: PointerEvent) {
    activo = true; x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); sostuvo = false;
    mantener = setTimeout(() => { sostuvo = true; pausado = true; }, 220);
  }
  function mueve(e: PointerEvent) {
    if (!activo) return;
    const dy = e.clientY - y0;
    if (dy > 8) { if (mantener) clearTimeout(mantener); pausado = true; arrastre = dy; }
  }
  function arriba(e: PointerEvent) {
    if (!activo) return;
    activo = false;
    if (mantener) clearTimeout(mantener);
    if (arrastre > 90) { arrastre = 0; cerrar(); return; }
    const fueArrastre = arrastre > 8;
    arrastre = 0;
    pausado = false;
    if (sostuvo || fueArrastre || Date.now() - t0 > 600) return;
    const ancho = (e.currentTarget as HTMLElement).clientWidth;
    toque(4);
    if (e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left < ancho / 3) anterior(); else siguiente();
  }

  /** El texto del gesto contado para mí ("Caro te mandó un abrazo", no "…a Demo") */
  function textoGesto(ev: { actor: string; gesto?: string | null; texto: string }): string {
    const quien = primerNombre(nombreDe(ev.actor));
    const g = GESTOS.find((x) => x.id === ev.gesto);
    return g ? `${quien} te mandó: ${g.nombre}` : ev.texto;
  }
  function verPublicacion(id: string) { toque(); alCerrar(); ui.navegar(`/publicacion/${id}/`); }
  /** Reacción rápida: le llega a su chat, como respuesta a la historia */
  async function reaccionar(r: string) {
    const rel = persona?.relacion, nombre = persona?.nombre ?? '';
    if (!rel) return;
    toque(10);
    const { error } = await enviarMensaje({ relacion: rel }, `${r} (respondí a tu historia)`);
    ui.avisar(error ? { titulo: 'No se envió', sub: error, icono: 'alerta' } : { titulo: `Enviado a ${primerNombre(nombre)} en el chat`, icono: 'check' }, 3);
  }
  // Se toma la relación ANTES de cerrar: al cerrar, la lista de historias se reordena (esta ya quedó vista) y
  // `persona` pasaría a ser otra (abría el chat de otra persona)
  function responder() { const rel = persona?.relacion; if (!rel) return; toque(); alCerrar(); ui.navegar(`/chat/r/${rel}/`); }
  const colorGesto = (g: string | null | undefined) => GESTOS.find((x) => x.id === g)?.color ?? '#FFD8A8';
</script>

{#if persona && item}
  <div class="hist" use:alCuerpo role="dialog" aria-modal="true" aria-label="Historias de {persona.nombre}"
    style:transform={arrastre ? `translateY(${arrastre}px) scale(${1 - Math.min(arrastre, 300) / 2000})` : undefined}
    style:opacity={arrastre ? 1 - Math.min(arrastre, 300) / 600 : undefined} class:suave={!arrastre && !reducirMovimiento()}>
    <div class="barras" aria-hidden="true">
      {#each persona.items as it, k (it.id)}
        <i><b style:transform="scaleX({k < i ? 1 : k === i ? Math.min(1, progreso) : 0})"></b></i>
      {/each}
    </div>
    <header>
      <span class="av" style="background:{colorMarca(persona.color)}">{ini(persona.nombre)}</span>
      <span class="quien"><b>{primerNombre(persona.nombre)}</b><small>{hace(item.en)}{pausado ? ' · En pausa' : ''}</small></span>
      <button class="cerrar" aria-label="Cerrar historias" onclick={cerrar}><Icon name="cerrar" size={18} stroke={2.6} /></button>
    </header>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="zona" onpointerdown={abajo} onpointermove={mueve} onpointerup={arriba} onpointercancel={() => { activo = false; arrastre = 0; pausado = false; }} oncontextmenu={(e) => e.preventDefault()}>
      {#key item.id}
        {#if item.tipo === 'foto'}
          <div class="lamina foto"><FotoSocial path={item.path} alt="Foto de {persona.nombre}" color="#d7c6f7" inmediata /></div>
          {#if item.pub.texto}<div class="sobre"><b class="lugar">{item.pub.texto}</b></div>{/if}
        {:else if item.tipo === 'resultado'}
          {@const g = gano(item.pub.marcador)}
          <div class="lamina tarjeta" style="--c:{g === false ? 'var(--q-fiesta-cielo)' : 'var(--q-fiesta-lima)'}">
            <span class="grande salta">{g === true ? '🏆' : '🎾'}</span>
            <b>{textoMarcador(item.pub.marcador)}</b>
            {#if item.pub.texto}<p>{item.pub.texto}</p>{/if}
          </div>
        {:else}
          <div class="lamina tarjeta" style="--c:{colorGesto(item.evento.gesto)}">
            <span class="grande salta">{emojiGesto(item.evento.gesto)}</span>
            <b>{textoGesto(item.evento)}</b>
            <p>Devuélvele el gesto 👇</p>
          </div>
        {/if}
      {/key}
    </div>

    <footer>
      {#if item.tipo === 'foto' || item.tipo === 'resultado'}
        <button class="accion" onclick={() => verPublicacion(item.pub.id)}><Icon name="camara" size={17} /> Ver la publicación</button>
      {/if}
      {#if persona.relacion}
        <div class="reacciones" role="group" aria-label="Reaccionar">
          {#each REACCIONES_HISTORIA as r (r)}
            <button onclick={() => reaccionar(r)}>{r}</button>
          {/each}
        </div>
        <button class="accion responder" onclick={responder}><Icon name="sms" size={17} /> Responder a {primerNombre(persona.nombre)}</button>
      {/if}
    </footer>
  </div>
{/if}

<style>
  .hist { position: fixed; inset: 0; z-index: 13000; background: #05070b; color: #fff; display: flex; flex-direction: column; font-family: var(--q-font-fiesta); touch-action: none; -webkit-user-select: none; user-select: none; }
  .hist.suave { transition: transform 0.22s ease-out, opacity 0.22s ease-out; }
  .barras { position: absolute; z-index: 3; top: calc(env(safe-area-inset-top, 0px) + 8px); left: 10px; right: 10px; display: flex; gap: 4px; }
  .barras i { flex: 1; height: 3px; border-radius: 2px; background: rgba(255, 255, 255, 0.32); overflow: hidden; }
  .barras b { display: block; height: 100%; background: #fff; transform-origin: left center; }
  header { position: absolute; z-index: 3; top: calc(env(safe-area-inset-top, 0px) + 18px); left: 12px; right: 8px; display: flex; align-items: center; gap: 10px; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45); }
  .av { width: 36px; height: 36px; border-radius: 18px; color: var(--q-fiesta-tinta); font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; text-shadow: none; box-shadow: 0 0 0 2px #fff; }
  .quien { flex: 1; display: flex; flex-direction: column; line-height: 1.15; }
  .quien b { font-size: 15px; font-weight: 900; }
  .quien small { font-size: 12px; opacity: 0.8; font-weight: 600; }
  .cerrar { width: 40px; height: 40px; border: 0; border-radius: 20px; background: rgba(255, 255, 255, 0.14); color: #fff; display: flex; align-items: center; justify-content: center; }
  .zona { position: relative; flex: 1; overflow: hidden; border-radius: 0 0 14px 14px; }
  .lamina { position: absolute; inset: 0; animation: entra 0.28s ease-out; }
  .zona::before { content: ''; position: absolute; z-index: 1; left: 0; right: 0; top: 0; height: 130px; background: linear-gradient(180deg, rgba(0, 0, 0, 0.42), transparent); pointer-events: none; }
  @keyframes entra { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: none; } }
  .foto::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, transparent 22%, transparent 62%, rgba(0, 0, 0, 0.62) 100%); pointer-events: none; }
  .sobre { position: absolute; z-index: 2; left: 16px; right: 16px; bottom: 18px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5); pointer-events: none; }
  .lugar { font-size: 24px; font-weight: 900; letter-spacing: -0.02em; }
  .tarjeta { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 32px; text-align: center; color: var(--q-fiesta-tinta);
    background: radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--c) 55%, #fff), var(--c) 55%, color-mix(in srgb, var(--c) 70%, #000)); }
  .tarjeta .grande { font-size: 96px; line-height: 1; }
  .tarjeta .salta { animation: entra 0.28s ease-out, salto 1.6s 0.3s ease-in-out infinite; }
  @keyframes salto { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-10px) rotate(4deg); } }
  .tarjeta b { font-size: 26px; font-weight: 900; line-height: 1.15; max-width: 320px; }
  .tarjeta p { margin: 0; font-size: 16px; font-weight: 700; opacity: 0.8; max-width: 300px; }
  footer { flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px calc(env(safe-area-inset-bottom, 0px) + 14px); }
  .reacciones { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .reacciones button { height: 44px; border: 0; border-radius: 14px; background: var(--q-acc); color: var(--q-acctx); font-family: inherit; font-size: 14px; font-weight: 900; transform: rotate(-2deg); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 8px; }
  .reacciones button:active { transform: scale(0.94); }
  .accion { height: 46px; border: 0; border-radius: 14px; background: rgba(255, 255, 255, 0.14); color: #fff; font-family: inherit; font-size: 15px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .accion.responder { background: none; border: 1.5px solid rgba(255, 255, 255, 0.45); }
  @media (prefers-reduced-motion: reduce) { .lamina, .tarjeta .salta { animation: none; } }
</style>
