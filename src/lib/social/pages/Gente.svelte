<script lang="ts">
  // Tu gente: mapa con líneas directas desde ti hacia cada jugador (color por relación: pareja de juego, amigo, rival),
  // filtros y ficha con acciones (gestos, perfil, chat, invitar a jugar, dividir la cancha).
  import { Page, Navbar, Sheet, f7 } from 'framework7-svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque, reducirMovimiento } from '$lib/ui/tema.svelte';
  import { menuPersona } from '../ui/moderar';
  import Gestos from '../ui/Gestos.svelte';
  import { ini } from '../app/rituales';
  import { editarRelacion, nombreDe, perfilDe, responder, terminar, vinculos, yo } from '../app/vinculos';
  import { activas, enviadas, etiquetaPara, GRUPOS, grupoDe, otroDe, recibidas, tipo, TIPOS, type Grupo, type Vinculo } from '../domain/vinculos';
  import { lineaJugador } from '../domain/padel';

  let filtro = $state<Grupo | 'todos'>('todos');
  let sel = $state<Vinculo | null>(null);
  let ancho = $state(358);
  const alto = 460;

  const todas = $derived(vinculos());
  const conectados = $derived(activas(todas));
  const porConfirmar = $derived(recibidas(todas, yo()));
  const esperando = $derived(enviadas(todas, yo()));
  const enMapa = $derived([...conectados, ...esperando]);
  // Las parejas de juego van más cerca de ti; los rivales en el anillo del medio; los amigos afuera
  const RADIO: Record<Grupo, number> = { pareja_juego: 0.55, rival: 0.8, amigo: 1 };

  /** Reparte a la gente de cada grupo en su anillo, con un desfase por grupo para que no se encimen */
  const puntos = $derived.by(() => {
    const cx = ancho / 2, cy = alto / 2, rx = ancho / 2 - 34, ry = alto / 2 - 44;
    const grupos = new Map<Grupo, Vinculo[]>();
    for (const v of enMapa) grupos.set(grupoDe(v), [...(grupos.get(grupoDe(v)) ?? []), v]);
    const DESFASE: Record<Grupo, number> = { pareja_juego: -90, rival: 30, amigo: -60 };
    const out: { v: Vinculo; x: number; y: number; t: number; color: string; on: boolean; pendiente: boolean }[] = [];
    for (const [g, vs] of grupos) {
      vs.forEach((v, i) => {
        const paso = vs.length > 1 ? 360 / vs.length : 0;
        const a = ((DESFASE[g] + i * paso) * Math.PI) / 180;
        out.push({ v, x: cx + rx * RADIO[g] * Math.cos(a), y: cy + ry * RADIO[g] * Math.sin(a), t: g === 'pareja_juego' ? 58 : 48, color: tipo(v.tipo).color, on: filtro === 'todos' || filtro === g, pendiente: v.estado === 'pendiente' });
      });
    }
    return out;
  });
  const linea = (p: { x: number; y: number }) => {
    const dx = p.x - ancho / 2, dy = p.y - alto / 2;
    return { largo: Math.sqrt(dx * dx + dy * dy), ang: (Math.atan2(dy, dx) * 180) / Math.PI };
  };

  async function contestar(v: Vinculo, aceptar: boolean) {
    toque(14);
    const err = await responder(v.id, aceptar);
    ui.avisar(err ? { titulo: 'No se pudo', sub: err, icono: 'alerta' } : aceptar ? { titulo: '¡Conectados!', sub: `${nombreDe(v.user_a)} ya está en tu gente`, icono: 'personas' } : { titulo: 'Solicitud rechazada' });
  }
  function cambiarTipo(v: Vinculo) {
    f7.actions.create({ buttons: [[{ text: `¿Qué es ${nombreDe(otroDe(v, yo())).split(' ')[0]} para ti?`, label: true },
      ...TIPOS.map((t) => ({ text: t.nombre, bold: t.id === v.tipo, onClick: async () => {
        const err = await editarRelacion(v.id, t.id, null);
        if (err) ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta' }); else { sel = null; ui.avisar({ titulo: 'Relación actualizada', icono: 'check' }); }
      } }))], [{ text: 'Cancelar' }]] }).open();
  }
  function quitar(v: Vinculo) {
    const n = nombreDe(otroDe(v, yo())).split(' ')[0];
    f7.dialog.confirm(`Dejan de verse en Quilombo. Los cobros que ya existen se conservan.`, `¿Terminar la relación con ${n}?`, async () => {
      const err = await terminar(v.id);
      sel = null;
      ui.avisar(err ? { titulo: 'No se pudo', sub: err, icono: 'alerta' } : { titulo: 'Relación terminada' });
    });
  }

  // Framework7 pisa `opened` por dentro; con una expresión (!!x) la hoja no volvía a abrir tras cerrarla con atrás,
  // Escape o deslizando. Un booleano propio sí se vuelve a leer.
  let abierta = $state(false);
  $effect.pre(() => { abierta = !!sel; });
</script>

<Page name="parche-gente" class="pa-gente">
  <Navbar title="Tu gente" backLink="Atrás">
    {#snippet right()}<button class="nav-btn" aria-label="Buscar jugadores" onclick={() => ui.navegar('/buscar/')}><Icon name="buscar" size={21} /></button>{/snippet}
  </Navbar>

  {#if porConfirmar.length}
    <div class="solicitudes">
      {#each porConfirmar as v (v.id)}
        <div class="sol q-entra">
          <span class="av" style="background:{perfilDe(v.user_a)?.color ?? 'var(--q-fiesta-cielo)'}">{ini(nombreDe(v.user_a))}</span>
          <span class="t"><b>{nombreDe(v.user_a).split(' ')[0]}</b> dice que eres su <b>{etiquetaPara(v, v.user_a).toLowerCase()}</b></span>
          <button class="si" onclick={() => contestar(v, true)}>¡Sí!</button>
          <button class="no" aria-label="Rechazar" onclick={() => contestar(v, false)}><Icon name="cerrar" size={13} stroke={2.8} /></button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="filtros">
    <button class="f" class:on={filtro === 'todos'} style="--c:var(--q-tx)" onclick={() => (filtro = 'todos')}>Todos {conectados.length}</button>
    {#each GRUPOS as g (g.id)}
      {@const n = conectados.filter((v) => grupoDe(v) === g.id).length}
      {#if n}<button class="f" class:on={filtro === g.id} style="--c:{g.color}" onclick={() => { toque(); filtro = g.id; }}>{g.nombre} {n}</button>{/if}
    {/each}
  </div>

  <div class="mapa" bind:clientWidth={ancho} style="height:{alto}px">
    <svg class="estrellas" viewBox="0 0 358 420" preserveAspectRatio="none" aria-hidden="true">
      <circle cx="30" cy="30" r="1.6" fill="#fff" opacity="0.5" /><circle cx="320" cy="50" r="1.2" fill="#fff" opacity="0.4" /><circle cx="340" cy="390" r="1.8" fill="#fff" opacity="0.35" /><circle cx="16" cy="370" r="1.2" fill="#fff" opacity="0.4" /><circle cx="250" cy="18" r="1" fill="#fff" opacity="0.5" />
    </svg>
    {#each puntos as p (p.v.id)}
      {@const l = linea(p)}
      <span class="linea" class:sel={sel?.id === p.v.id} style="left:{ancho / 2}px; top:{alto / 2}px; width:{l.largo}px; transform:rotate({l.ang}deg); --c:{p.color}; opacity:{p.on ? (p.pendiente ? 0.35 : 0.8) : 0.08}"></span>
    {/each}
    <div class="yo">TÚ</div>
    {#each puntos as p, k (p.v.id)}
      {@const otro = otroDe(p.v, yo())}
      <button class="persona" class:sel={sel?.id === p.v.id} aria-label="{nombreDe(otro)}, {etiquetaPara(p.v, yo())}"
        style="left:{p.x - p.t / 2}px; top:{p.y - p.t / 2}px; width:{p.t}px; height:{p.t}px; background:{p.color}; opacity:{p.on ? (p.pendiente ? 0.5 : 1) : 0.15}; --g:{k % 2 ? 5 : -5}deg; transition-duration:{reducirMovimiento() ? 0 : 240}ms"
        onclick={() => { toque(); sel = p.v; }}>
        {ini(nombreDe(otro))}
      </button>
      <span class="etq" style="left:{p.x}px; top:{p.y + p.t / 2 + 3}px; background:{p.color}; opacity:{p.on ? 1 : 0.12}">{p.pendiente ? 'Esperando' : etiquetaPara(p.v, yo())}</span>
    {/each}
    {#if !enMapa.length}
      <div class="vacio"><b>Aquí va tu gente</b><span>Busca a tus compañeros de cancha por su @usuario.</span><button onclick={() => ui.navegar('/buscar/')}>Buscar jugadores</button></div>
    {/if}
  </div>
  <div class="q-espacio-tabbar"></div>
</Page>

<Sheet class="hoja-persona" opened={abierta} onSheetClosed={() => (sel = null)} swipeToClose backdrop push style="height:auto">
  {#if sel}
    {@const otro = otroDe(sel, yo())}
    {@const t = tipo(sel.tipo)}
    <div class="ficha" style="background:{t.color}">
      <div class="q-agarre" style="background:rgba(26,16,51,0.3)"></div>
      <div class="f-cab">
        <span class="f-av">{ini(nombreDe(otro))}</span>
        <span class="f-t"><b>{nombreDe(otro)}</b><span class="f-pill">{etiquetaPara(sel, yo())}{sel.estado === 'pendiente' ? ' · esperando que confirme' : ''}</span>{#if lineaJugador(perfilDe(otro))}<small class="f-jug">{lineaJugador(perfilDe(otro))}</small>{/if}</span>
      </div>
      {#if sel.estado === 'activa'}
        <div class="f-gestos"><Gestos relacion={sel.id} nombre={nombreDe(otro).split(' ')[0]} compacto titulo="Mándale algo:" /></div>
      {/if}
      <div class="f-acc">
        <button onclick={() => { const o = otro; sel = null; ui.navegar(`/persona/${o}/`); }}><Icon name="persona" size={20} stroke={2} />Perfil</button>
        {#if sel.estado === 'activa'}
          <button onclick={() => { const id = sel!.id; sel = null; ui.navegar(`/chat/r/${id}/`); }}><Icon name="sms" size={20} stroke={2} />Chat</button>
          <button onclick={() => { const o = otro; sel = null; ui.invitar = { con: [o] }; }}><Icon name="estrella" size={20} stroke={2} />Jugar</button>
          <button onclick={() => { const o = otro; sel = null; ui.cobrar = { para: [o] }; }}><Icon name="dividir" size={20} stroke={2} />Cobrar</button>
        {/if}
        {#if sel.user_a === yo()}<button onclick={() => sel && cambiarTipo(sel)}><Icon name="editar" size={20} stroke={2} />Cambiar</button>{/if}
        <button onclick={() => sel && quitar(sel)}><Icon name="salir" size={20} stroke={2} />Terminar</button>
        <button onclick={() => { const o = otro; const n = nombreDe(o); sel = null; menuPersona(o, n); }}><Icon name="alerta" size={20} stroke={2} />Reportar</button>
      </div>
      <div class="pie"></div>
    </div>
  {/if}
</Sheet>

<style>
  :global(.page.pa-gente .page-content) { font-family: var(--q-font-fiesta); }
  .nav-btn { width: 40px; height: 40px; border: 0; background: none; color: var(--q-link); display: flex; align-items: center; justify-content: center; }
  .solicitudes { display: flex; flex-direction: column; gap: 8px; padding: 6px 16px 10px; }
  .sol { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: var(--q-fiesta-lila); color: var(--q-fiesta-tinta); }
  .sol .t { flex: 1; font-size: 14px; line-height: 1.3; font-weight: 600; }
  .si { height: 38px; padding: 0 14px; border-radius: 10px; border: 0; background: var(--q-fiesta-tinta); color: var(--q-fiesta-lima); font-family: inherit; font-size: 14px; font-weight: 900; }
  .no { width: 34px; height: 34px; border-radius: 17px; border: 0; background: rgba(255, 255, 255, 0.2); color: inherit; display: flex; align-items: center; justify-content: center; padding: 0; }
  .av { width: 40px; height: 40px; border-radius: 20px; color: var(--q-fiesta-tinta); font-weight: 900; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .filtros { display: flex; gap: 6px; flex-wrap: wrap; padding: 4px 16px 12px; }
  .f { height: 34px; padding: 0 13px; border-radius: 10px; border: 0; background: var(--q-sub); color: var(--c); font-family: inherit; font-size: 13.5px; font-weight: 900; }
  .f.on { background: var(--c); color: var(--q-fiesta-tinta); }
  :global(html:not(.dark)) .f:not(.on) { color: var(--q-tx); }
  .mapa { position: relative; margin: 0 16px; border-radius: 16px; background: #121829; overflow: hidden; }
  .estrellas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .linea { position: absolute; height: 2.5px; border-radius: 2px; transform-origin: 0 50%; background: repeating-linear-gradient(90deg, var(--c) 0 3px, transparent 3px 10px); transition: opacity 240ms; }
  .linea.sel { height: 4px; margin-top: -1px; background: var(--c); opacity: 1 !important; }
  .yo { position: absolute; left: 50%; top: 50%; width: 76px; height: 76px; margin: -38px 0 0 -38px; border-radius: 38px; background: #f2f4f8; color: #0b0f1a; font-size: 22px; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 8px rgba(242, 244, 248, 0.08), 0 0 0 16px rgba(242, 244, 248, 0.04); }
  .persona { position: absolute; border: 0; padding: 0; border-radius: 50%; color: var(--q-fiesta-tinta); font-family: inherit; font-size: 15px; font-weight: 900; display: flex; align-items: center; justify-content: center; transform: rotate(var(--g)); box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35); transition-property: transform, opacity, box-shadow; }
  .persona.sel { transform: rotate(var(--g)) scale(1.18); box-shadow: 0 0 0 4px #121829, 0 0 0 7px #f2f4f8; }
  .etq { position: absolute; transform: translateX(-50%); height: 18px; padding: 0 7px; border-radius: 9px; color: var(--q-fiesta-tinta); font-size: 10.5px; font-weight: 900; line-height: 18px; white-space: nowrap; pointer-events: none; transition: opacity 240ms; }
  .vacio { position: absolute; left: 24px; right: 24px; bottom: 26px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; color: #f2f4f8; }
  .vacio b { font-size: 17px; font-weight: 900; }
  .vacio span { font-size: 13.5px; color: #8f97aa; }
  .vacio button { margin-top: 8px; height: 40px; padding: 0 18px; border-radius: 14px; border: 0; background: var(--q-fiesta-lima); color: var(--q-fiesta-tinta); font-family: inherit; font-size: 14px; font-weight: 900; }
  .ficha { color: var(--q-fiesta-tinta); padding: 0 16px; border-radius: 14px 14px 0 0; font-family: var(--q-font-fiesta); }
  .f-cab { display: flex; align-items: center; gap: 12px; padding: 10px 0 14px; }
  .f-av { width: 58px; height: 58px; border-radius: 29px; background: var(--q-noche); color: #fff; font-size: 19px; font-weight: 900; display: flex; align-items: center; justify-content: center; transform: rotate(-5deg); flex-shrink: 0; }
  .f-t { display: flex; flex-direction: column; gap: 4px; }
  .f-t b { font-size: 21px; font-weight: 900; }
  .f-jug { font-size: 13px; font-weight: 800; opacity: 0.75; }
  .f-pill { align-self: flex-start; padding: 3px 10px; border-radius: 12px; background: rgba(255, 255, 255, 0.2); font-size: 12.5px; font-weight: 900; }
  .f-acc { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 8px; }
  .f-acc button { height: 66px; border: 0; border-radius: 10px; background: rgba(255, 255, 255, 0.2); color: inherit; font-family: inherit; font-size: 12.5px; font-weight: 900; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
  .f-gestos { margin: 0 0 12px; }
  .pie { height: calc(18px + env(safe-area-inset-bottom)); }
</style>
