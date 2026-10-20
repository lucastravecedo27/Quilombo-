<script lang="ts">
  // Agenda: turnos de 90 min (filas) × canchas (columnas) para un día. Los estados se distinguen de un vistazo:
  // libre (en blanco), apartada · falta pago (borde naranja + cuándo vence), pagada (sólida), bloqueada (rayada) y
  // clase con profe (morada: el profe abrió el horario; se llena con los alumnos que reservan).
  // Lo que llega en vivo se resalta; un clic abre el detalle con las acciones.
  import { canchasDe, franjasDe, hora, jugadoresDe, titularDe } from '$lib/club/app/club';
  import { agenda, ocupacion } from '$lib/club/domain/club';
  import { diaColombia, pesos, type Franja } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';
  import { datos } from '$lib/data/datos.svelte';
  import type { Clase } from '$lib/social/domain/clases';

  const hoy = $derived(diaColombia(new Date(panel.ahora).toISOString()));
  const dias = $derived(Array.from({ length: 7 }, (_, k) => diaColombia(new Date(Date.parse(hoy + 'T12:00:00-05:00') + k * 86_400_000).toISOString())));
  const canchas = $derived(canchasDe());
  const todas = $derived(franjasDe());
  const filas = $derived(agenda(todas, canchas, panel.dia));
  const delDia = $derived(todas.filter((f) => diaColombia(f.inicio) === panel.dia));
  const occ = $derived(ocupacion(delDia));
  const porPagar = $derived(delDia.filter((f) => f.estado === 'apartada'));
  const vendido = $derived(delDia.filter((f) => f.estado === 'pagada').reduce((s, f) => s + f.precio, 0));

  const nombreDia = (d: string, k: number) => {
    if (k === 0) return 'HOY';
    return new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'America/Bogota' }).replace('.', '').toUpperCase();
  };
  const numDia = (d: string) => Number(d.slice(8, 10));
  const ahoraEn = (f: { inicio: string }) => Date.parse(f.inicio) <= panel.ahora && Date.parse(f.inicio) + 90 * 60_000 > panel.ahora;
  const pasada = (f: Franja) => Date.parse(f.fin) <= panel.ahora;
  const tituloDia = $derived(new Date(panel.dia + 'T12:00:00-05:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }));
  const esClase = (f: Franja) => !!f.cliente?.startsWith('Clase ·');
  const claseDe = (f: Franja) => (datos.clases as Clase[]).find((c) => c.franja_id === f.id && c.estado !== 'cancelada') ?? null;
  /** "6:00" y "a. m." por separado */
  const partesHora = (iso: string) => { const h = hora(iso).replace(/\s+/g, ' '); const m = /^(.*?)\s*([ap]\.?\s?m\.?)$/i.exec(h); return m ? [m[1], m[2].toLowerCase().replace(/^([ap])\.?\s?m\.?$/, '$1. m.')] : [h, '']; };
  const tipoCancha = (t: string, techada: boolean) => (t === 'panoramica' ? 'Panorámica' : techada ? 'Techada' : t === 'muro' ? 'Muro' : 'Cristal');
  const origen = (f: Franja) => (f.origen === 'app' ? '📱 ' : f.origen === 'club' ? '📞 ' : '');
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">Turnos de 90 min · {canchas.length} canchas</span>
    <h1 class="c-titulo c-h1">Agenda</h1>
  </div>
  <div class="dias" role="tablist" aria-label="Día">
    {#each dias as d, k (d)}
      <button role="tab" aria-selected={panel.dia === d} class:on={panel.dia === d} onclick={() => (panel.dia = d)}>
        <small>{nombreDia(d, k)}</small><b>{numDia(d)}</b>
      </button>
    {/each}
  </div>
</header>

<div class="sub-cab">
  <ul class="leyenda" aria-label="Convenciones">
    <li><i class="m libre"></i>Libre</li>
    <li><i class="m apartada"></i>Apartada · falta pago</li>
    <li><i class="m pagada"></i>Pagada</li>
    <li><i class="m clase"></i>Clase con profe</li>
    <li><i class="m bloqueada"></i>Bloqueada</li>
    <li>📱 Quilombo · 📞 Club</li>
  </ul>
  <span class="resumen"><b class="dia">{tituloDia.charAt(0).toUpperCase() + tituloDia.slice(1).replace(",", "")}</b> · {occ.pct}% ocupación · {occ.ocupadas}/{occ.total} turnos{#if porPagar.length} · <b>{porPagar.length} falta pago</b>{/if} · {pesos(vendido).replace('$ ', '$')} pagado</span>
</div>

<div class="grilla" style="--n:{canchas.length}">
  <span></span>
  {#each canchas as c (c.id)}
    <div class="col-cab"><b>{c.nombre}</b><small>{tipoCancha(c.tipo, c.techada)}</small></div>
  {/each}
  {#each filas as fila (fila.inicio)}
    {@const ph = partesHora(fila.inicio)}
    <div class="hora" class:ahora={ahoraEn(fila)}><b>{ph[0]}</b><small>{ahoraEn(fila) ? 'ahora' : ph[1]}</small></div>
    {#each canchas as c (c.id)}
      {@const f = fila.porCancha.get(c.id)}
      {#if f}
        {@const cl = esClase(f)}
        <button
          class="celda {f.estado}"
          class:clase={cl}
          class:pasada={pasada(f)}
          class:destello={panel.destellos.includes(f.id)}
          class:abierta={panel.abierta === f.id}
          aria-label="{c.nombre} {hora(f.inicio)}: {f.estado}"
          onclick={() => (panel.abierta = f.id)}
        >
          {#if f.estado === 'libre'}
            <b>Libre</b><small>{pesos(f.precio).replace('$ ', '$')}</small>
          {:else if f.estado === 'bloqueada'}
            <b>Bloqueada</b><small>{f.nota ?? 'Mantenimiento'}</small>
          {:else if cl}
            {@const k = claseDe(f)}
            <b>🎓 {titularDe(f)}</b><small>{k ? (k.alumnos.length ? `${k.alumnos.length}/${k.cupos} alumno${k.alumnos.length === 1 ? '' : 's'} · pagada` : 'Clase · cancha apartada') : 'Clase · cancha apartada'}</small>
          {:else if f.estado === 'apartada'}
            <b>{origen(f)}{titularDe(f)}</b><small>Falta pago{f.apartada_hasta ? ` · vence ${hora(f.apartada_hasta).replace(/\s*[ap]\.?\s?m\.?/i, '')}` : ''}</small>
          {:else}
            <b>{origen(f)}{titularDe(f)}</b><small>{f.llegaron ? '✓ Llegaron' : 'Pagada'}{f.partido_id ? ` · ${jugadoresDe(f).length}/4` : ''} · {pesos(f.precio).replace('$ ', '$')}</small>
          {/if}
        </button>
      {:else}
        <span></span>
      {/if}
    {/each}
  {/each}
</div>

<style>
  .dias { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--q-sub); }
  .dias button { min-width: 60px; height: 44px; border: 0; border-radius: 9px; background: none; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .dias small { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; opacity: 0.75; }
  .dias b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 19px; line-height: 1; }
  .dias button.on { background: var(--q-acc); color: var(--q-acctx); }

  .sub-cab { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
  .leyenda { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 14px; font-size: 12.5px; color: var(--q-tx2); }
  .leyenda li { display: flex; align-items: center; gap: 6px; }
  .m { width: 16px; height: 12px; border-radius: 3px; display: inline-block; }
  .resumen { font-size: 12.5px; color: var(--q-tx2); }
  .resumen b { color: var(--q-acct); }
  .resumen b.dia { color: var(--q-tx); }

  .grilla { display: grid; grid-template-columns: 76px repeat(var(--n), minmax(0, 1fr)); gap: 6px; }
  .col-cab { padding: 8px 10px; border-radius: 10px; background: var(--q-sub); display: flex; flex-direction: column; }
  .col-cab b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 20px; line-height: 1; text-transform: uppercase; }
  .col-cab small { font-size: 11.5px; color: var(--q-tx2); }
  .hora { display: flex; flex-direction: column; justify-content: center; padding-right: 4px; text-align: right; }
  .hora b { font-size: 14px; }
  .hora small { font-size: 11px; color: var(--q-tx2); }
  .hora.ahora b, .hora.ahora small { color: var(--c-error); font-weight: 800; }

  .celda { position: relative; height: 56px; padding: 6px 10px; border-radius: 10px; border: 0; text-align: left; display: flex; flex-direction: column; justify-content: center; gap: 1px; overflow: hidden; transition: transform 0.12s; }
  .celda:hover { transform: translateY(-1px); }
  .celda b { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .celda small { font-size: 11.5px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .m.libre, .celda.libre { background: transparent; border: 1.5px dashed rgba(14, 27, 51, 0.3); color: var(--q-tx2); }
  .celda.libre:hover { background: var(--q-accs); border-color: var(--q-acc); color: var(--q-acct); }
  .m.apartada, .celda.apartada { background: var(--q-accs); border: 2px solid var(--q-acc); color: var(--q-tx); }
  .m.pagada, .celda.pagada { background: var(--c-pagada); color: #fff; }
  .m.clase, .celda.clase { background: var(--c-clase-g); color: #fff; border: 0; }
  .celda.clase.apartada { opacity: 0.85; }
  .m.bloqueada, .celda.bloqueada { background: repeating-linear-gradient(135deg, rgba(14, 27, 51, 0.08) 0 6px, rgba(14, 27, 51, 0.02) 6px 12px); color: var(--q-tx2); }
  .celda.pasada { opacity: 0.45; }
  .celda.abierta { outline: 3px solid var(--q-noche); outline-offset: 1px; }
  .celda.destello { animation: c-brilla 1.4s ease-in-out 3; z-index: 1; }
</style>
