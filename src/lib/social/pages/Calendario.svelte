<script lang="ts">
  // Mi calendario: el mes con mis partidos/reservas (naranja), mis torneos (dorado), mis clases (morado) y los torneos que los clubes
  // ofrecen para mí —mi ciudad y mi categoría— (azul). Tocar un día muestra lo de ese día; "Torneos para ti" lleva al
  // "Yo voy" (inscripción con tarjeta o comprobante, que le llega al club organizador).
  import { Page } from 'framework7-svelte';
  import Cabecera from '../ui/ranking/Cabecera.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { club, franjaCompleta, misInscripciones, partidos, torneos } from '../app/jugar';
  import { miPerfil } from '../app/perfil.svelte';
  import { yo } from '../app/vinculos';
  import { diaColombia, horaColombia, pesos, type Inscripcion, type Torneo } from '../domain/jugar';
  import EstadoInscripcion from '../ui/torneos/EstadoInscripcion.svelte';
  import { clasesDe, clubDeClase, misClases } from '../app/clases';
  import { nombreDe } from '../app/vinculos';
  import type { Clase } from '../domain/clases';

  const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const hoy = diaColombia(new Date().toISOString());
  let mes = $state(hoy.slice(0, 7)); // "2026-10"
  let dia = $state(hoy);

  /** Los días (YYYY-MM-DD) que ocupa un evento, de inicio a fin */
  function diasEntre(a: string, b: string) {
    const out: string[] = [];
    let d = Date.parse(diaColombia(a) + 'T12:00:00Z');
    const fin = Date.parse(diaColombia(b) + 'T12:00:00Z');
    for (let i = 0; d <= fin && i < 31; i++, d += 86_400_000) out.push(new Date(d).toISOString().slice(0, 10));
    return out;
  }

  const misPartidos = $derived(partidos().filter((p) => p.estado !== 'cancelado' && (p.creador === yo() || p.invitados.includes(yo()))));
  const misTorneos = $derived(misInscripciones().map((i) => ({ i, t: torneos().find((t) => t.id === i.torneo_id) })).filter((x): x is { i: Inscripcion; t: Torneo } => !!x.t));
  const yoCategoria = $derived(miPerfil().categoria ?? null);
  const yoCiudad = $derived(miPerfil().ciudad ?? null);
  /** Torneos con inscripciones abiertas en mi ciudad y para mi categoría, a los que aún no voy */
  const paraMi = $derived(torneos().filter((t) => t.estado === 'inscripciones' && Date.parse(t.cierre) > Date.now() && !misTorneos.some((m) => m.t.id === t.id)
    && (!yoCiudad || t.ciudad === yoCiudad) && (!yoCategoria || !t.categorias.length || t.categorias.includes(yoCategoria))));

  // Mis clases (como alumno) y, si soy profe, los horarios que doy
  const clasesMias = $derived<{ c: Clase; doy: boolean }[]>([...misClases().map((c) => ({ c, doy: false })), ...clasesDe(yo()).map((c) => ({ c, doy: true }))]);

  type Marca = 'partido' | 'torneo' | 'oferta' | 'clase';
  const marcas = $derived.by(() => {
    const m = new Map<string, Set<Marca>>();
    const poner = (d: string, k: Marca) => { if (!m.has(d)) m.set(d, new Set()); m.get(d)!.add(k); };
    for (const p of misPartidos) poner(diaColombia(p.cuando), 'partido');
    for (const { t } of misTorneos) for (const d of diasEntre(t.inicio, t.fin)) poner(d, 'torneo');
    for (const t of paraMi) for (const d of diasEntre(t.inicio, t.fin)) poner(d, 'oferta');
    for (const { c } of clasesMias) poner(diaColombia(c.inicio), 'clase');
    return m;
  });

  const celdas = $derived.by(() => {
    const [y, mm] = mes.split('-').map(Number);
    const vacias = (new Date(Date.UTC(y, mm - 1, 1)).getUTCDay() + 6) % 7; // lunes primero
    const n = new Date(Date.UTC(y, mm, 0)).getUTCDate();
    return [...Array(vacias).fill(null), ...Array.from({ length: n }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)] as (string | null)[];
  });
  const nombreMes = $derived(new Date(mes + '-15T12:00:00Z').toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }));
  function mover(d: number) {
    toque(4);
    const [y, mm] = mes.split('-').map(Number);
    mes = new Date(Date.UTC(y, mm - 1 + d, 1)).toISOString().slice(0, 7);
  }
  let x0 = 0;
  const empieza = (e: TouchEvent) => (x0 = e.touches[0].clientX);
  const termina = (e: TouchEvent) => { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 60) mover(dx < 0 ? 1 : -1); };

  // Lo del día elegido
  const delDia = $derived({
    partidos: misPartidos.filter((p) => diaColombia(p.cuando) === dia),
    torneos: misTorneos.filter(({ t }) => diasEntre(t.inicio, t.fin).includes(dia)),
    ofertas: paraMi.filter((t) => diasEntre(t.inicio, t.fin).includes(dia)),
    clases: clasesMias.filter(({ c }) => diaColombia(c.inicio) === dia)
  });
  const vacio = $derived(!delDia.partidos.length && !delDia.torneos.length && !delDia.ofertas.length && !delDia.clases.length);
  const tituloDia = $derived(new Date(dia + 'T12:00:00Z').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }));
  const mesCorto = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { month: 'short', timeZone: 'America/Bogota' }).replace(/\./g, '').toUpperCase();
  const diaNum = (iso: string) => Number(diaColombia(iso).slice(8));
  /** Cuántos planes tengo en el mes que se ve */
  const planesMes = $derived([...marcas].filter(([d, m]) => d.startsWith(mes) && (m.has('partido') || m.has('torneo') || m.has('clase'))).length);
</script>

<Page name="calendario" class="pa-calendario" noNavbar>
  <Cabecera titulo="Mi calendario" />

  <section class="mes" role="group" aria-label="Mes" ontouchstart={empieza} ontouchend={termina}>
    <header>
      <b class="nombre-mes">{nombreMes}</b>
      <span class="der">
        <small>{planesMes} plan{planesMes === 1 ? '' : 'es'}</small>
        <button class="flecha" aria-label="Mes anterior" onclick={() => mover(-1)}>‹</button>
        <button class="flecha" aria-label="Mes siguiente" onclick={() => mover(1)}>›</button>
      </span>
    </header>
    <div class="dsems" aria-hidden="true">{#each DIAS as d, i (i)}<span>{d}</span>{/each}</div>
    <div class="grilla" role="grid" aria-label="Días de {nombreMes}">
      {#each celdas as c, i (c ?? 'v' + i)}
        {#if c}
          {@const m = marcas.get(c)}
          <button role="gridcell" class="dia" class:hoy={c === hoy} class:on={c === dia} class:pasado={c < hoy} class:oferta={m?.has('oferta')} aria-selected={c === dia}
            aria-label="{c}{m?.has('partido') ? ', partido' : ''}{m?.has('torneo') ? ', mi torneo' : ''}{m?.has('oferta') ? ', torneo disponible' : ''}{m?.has('clase') ? ', clase' : ''}"
            onclick={() => { toque(4); dia = c; }}>
            <b>{Number(c.slice(8))}</b>
            <span class="puntos">
              {#if m?.has('partido')}<i class="partido"></i>{/if}
              {#if m?.has('torneo')}<i class="torneo"></i>{/if}
              {#if m?.has('clase')}<i class="clase"></i>{/if}
            </span>
          </button>
        {:else}<span></span>{/if}
      {/each}
    </div>
    <div class="leyenda">
      <span><i class="partido"></i>Mis partidos</span><span><i class="torneo"></i>Mis torneos</span><span><i class="clase"></i>Clases</span><span><i class="caja"></i>Torneos que te sirven</span>
    </div>
  </section>

  <h2>{tituloDia.charAt(0).toUpperCase() + tituloDia.slice(1)}</h2>
  {#if vacio}
    <div class="libre">Día libre. ¿Armamos partido? 🎾</div>
  {:else}
    <div class="lista">
      {#each delDia.partidos as p (p.id)}
        {@const f = franjaCompleta(p.franja_id)}
        <button class="item partido" onclick={() => { toque(); ui.navegar(`/partido/${p.id}/`); }}>
          <span class="e">🎾</span>
          <span class="txt"><b>{horaColombia(p.cuando)} · {f ? `${f.club.nombre}` : 'Partido'}</b><small>{f ? `${f.cancha.nombre} · ${f.estado === 'pagada' ? '✓ Cancha pagada' : '⏳ Apartada · falta pagar'}` : 'Sin cancha aún'}{p.nota ? ` · ${p.nota}` : ''}</small></span>
        </button>
      {/each}
      {#each delDia.clases as { c, doy } (c.id)}
        <button class="item clase" onclick={() => { toque(); ui.navegar(`/profesor/${c.profesor}/`); }}>
          <span class="e">🎓</span>
          <span class="txt"><b>{horaColombia(c.inicio)} · {doy ? `Das clase ${c.tipo}` : `Clase con ${nombreDe(c.profesor).split(' ')[0]}`}</b><small>{clubDeClase(c)?.nombre ?? 'Club'} · {doy ? `${c.alumnos.length}/${c.cupos} alumnos` : c.tipo === 'individual' ? 'individual' : 'grupal'}</small></span>
        </button>
      {/each}
      {#each delDia.torneos as { i, t } (i.id)}
        <button class="item torneo" onclick={() => { toque(); ui.navegar(`/torneo/${t.id}/`); }}>
          <span class="e">🏆</span>
          <span class="txt"><b>{t.nombre}</b><small>{club(t.club_id)?.nombre ?? t.ciudad} · {i.categoria}ª</small><EstadoInscripcion inscripcion={i} torneo={t} compacto /></span>
        </button>
      {/each}
      {#each delDia.ofertas as t (t.id)}
        <button class="item oferta" onclick={() => { toque(); ui.navegar(`/torneo/${t.id}/`); }}>
          <span class="e">📣</span>
          <span class="txt"><b>{t.nombre}</b><small>Organiza {club(t.club_id)?.nombre ?? t.ciudad} · {t.precio ? pesos(t.precio) : 'gratis'}</small></span>
        </button>
      {/each}
    </div>
  {/if}

  <h2>Torneos para ti</h2>
  <p class="nota sub">En {yoCiudad ?? 'tu ciudad'}{yoCategoria ? ` y para ${yoCategoria}ª` : ''}. Los organizan los clubes.</p>
  {#if paraMi.length}
    <div class="ofertas">
      {#each paraMi as t (t.id)}
        <div class="oferta-card">
          <span class="fecha"><small>{mesCorto(t.inicio)}</small><b>{diaNum(t.inicio)}</b></span>
          <button class="o-cuerpo" onclick={() => { toque(); ui.navegar(`/torneo/${t.id}/`); }}>
            <b>{t.nombre}</b>
            <small>{club(t.club_id)?.nombre ?? t.ciudad}</small>
            <small>{t.precio ? pesos(t.precio) : 'Gratis'} · {Math.max(0, t.cupos - t.inscritos)} cupos · {t.categorias.map((c) => c + 'ª').join(', ')}</small>
          </button>
          <button class="yo-voy" onclick={() => { toque(); ui.inscribir = { torneo: t.id }; }}>Yo voy</button>
        </div>
      {/each}
    </div>
  {:else}
    <p class="nota">No hay torneos abiertos para ti por ahora. Te avisamos cuando un club arme uno.</p>
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-calendario .page-content) { font-family: var(--q-font); padding-top: 0 !important; }
  .mes { margin: 0 16px; padding: 14px 12px 12px; border-radius: 18px; background: var(--q-card); border: 1px solid var(--q-line); }
  .mes header { display: flex; justify-content: space-between; align-items: center; padding: 0 6px 10px; }
  .nombre-mes { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 28px; line-height: 1; text-transform: uppercase; }
  .der { display: flex; align-items: center; gap: 6px; }
  .der small { font-size: 12.5px; font-weight: 800; color: var(--q-tx2); margin-right: 4px; }
  .flecha { width: 30px; height: 30px; border: 0; border-radius: 15px; background: var(--q-sub); color: var(--q-tx); font-size: 18px; font-weight: 900; padding: 0; line-height: 1; }
  .dsems { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; text-align: center; font-size: 11.5px; font-weight: 800; color: var(--q-tx3); padding-bottom: 4px; }
  .grilla { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
  .dia { height: 46px; border: 0; border-radius: 10px; background: none; color: var(--q-tx); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 0; font-family: inherit; }
  .dia b { font-size: 14.5px; font-weight: 600; }
  .dia.pasado b { color: var(--q-tx3); }
  .dia.hoy { box-shadow: inset 0 0 0 1.5px var(--q-tx); }
  .dia.hoy b { font-weight: 900; }
  .dia.oferta { box-shadow: inset 0 0 0 1.5px #1e7fd0; }
  .dia.on { background: var(--q-noche); color: #fff; box-shadow: none; }
  .dia.on b { color: #fff; font-weight: 900; }
  :global(html.dark) .dia.on { background: var(--q-tx); color: var(--q-bg); }
  :global(html.dark) .dia.on b { color: var(--q-bg); }
  .puntos { display: flex; gap: 3px; height: 6px; }
  i { display: inline-block; width: 6px; height: 6px; border-radius: 3px; }
  i.partido { background: var(--q-acc); }
  i.torneo { background: var(--q-dorado); }
  i.clase { background: var(--q-lila); }
  :global(html.dark) i.clase { background: #8a9bff; }
  .dia.on i.partido { background: var(--q-accd); }
  .leyenda { display: flex; flex-wrap: wrap; gap: 12px; padding: 12px 6px 0; font-size: 12px; font-weight: 700; color: var(--q-tx2); }
  .leyenda span { display: flex; align-items: center; gap: 5px; }
  .leyenda i { width: 8px; height: 8px; border-radius: 4px; }
  .leyenda i.caja { width: 10px; height: 10px; border-radius: 3px; border: 1.5px solid #1e7fd0; box-sizing: border-box; }
  h2 { margin: 22px 20px 10px; font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 22px; font-weight: 800; }
  .nota { margin: 0 20px; font-size: 14px; color: var(--q-tx2); }
  .nota.sub { margin-top: -6px; margin-bottom: 10px; font-size: 13px; }
  .libre { margin: 0 16px; padding: 18px; border-radius: 12px; border: 1.5px dashed var(--q-borde); text-align: center; font-size: 14.5px; color: var(--q-tx2); }
  .lista { display: flex; flex-direction: column; gap: 8px; margin: 0 16px; }
  .item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 1px solid var(--q-line); border-left: 4px solid; border-radius: 12px; background: var(--q-card); color: var(--q-tx); text-align: left; font-family: inherit; }
  .item.partido { border-left-color: var(--q-acc); }
  .item.torneo { border-left-color: var(--q-dorado); }
  .item.oferta { border-left-color: #1e7fd0; }
  .item.clase { border-left-color: var(--q-lila); }
  .e { font-size: 22px; }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .txt b { font-size: 15px; font-weight: 800; }
  .txt small { font-size: 12.5px; color: var(--q-tx2); }
  .ofertas { display: flex; flex-direction: column; gap: 8px; margin: 0 16px; }
  .oferta-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1.5px solid #1e7fd0; border-radius: 14px; background: var(--q-card); }
  .fecha { width: 44px; flex: none; display: flex; flex-direction: column; align-items: center; }
  .fecha small { font-size: 11px; font-weight: 800; color: var(--q-tx2); }
  .fecha b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 28px; line-height: 1; }
  .o-cuerpo { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 0; border: 0; background: none; color: var(--q-tx); text-align: left; font-family: inherit; }
  .o-cuerpo b { font-size: 15px; font-weight: 800; }
  .o-cuerpo small { font-size: 12.5px; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .yo-voy { flex: none; height: 36px; padding: 0 13px; border: 0; border-radius: 10px; background: var(--q-acc); color: var(--q-acctx); font-family: inherit; font-size: 13.5px; font-weight: 900; }
</style>
