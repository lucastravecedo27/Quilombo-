<script lang="ts">
  // Hoy, "en vivo": las cuatro canchas dibujadas como se ven desde arriba (quién juega, cuánto le queda al turno, si
  // llegaron y su cuenta del bar), los números del día con marcador animado, los ingresos por hora y las reservas nuevas.
  import { canchasDe, cuentasAbiertas, franjasDe, hora, jugadoresDe, pagos, pedidos, titularDe } from '$lib/club/app/club';
  import { caja, enJuego, ocupacion, proxima } from '$lib/club/domain/club';
  import { cuando, diaColombia, pesos } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';
  import Contador from '../ui/Contador.svelte';

  const hoy = $derived(diaColombia(new Date(panel.ahora).toISOString()));
  const c = $derived(caja(pagos(), hoy));
  const todas = $derived(franjasDe());
  const deHoy = $derived(todas.filter((f) => diaColombia(f.inicio) === hoy));
  const occ = $derived(ocupacion(deHoy));
  const reservasHoy = $derived(deHoy.filter((f) => f.estado === 'apartada' || f.estado === 'pagada'));
  const porApp = $derived(reservasHoy.filter((f) => f.origen === 'app').length);
  const abiertos = $derived(pedidos().filter((p) => p.estado === 'nuevo' || p.estado === 'preparando' || p.estado === 'entregado'));
  const sinCuenta = $derived(abiertos.filter((p) => !p.pagado_en));
  const porCobrar = $derived(sinCuenta.reduce((s, p) => s + p.total, 0));
  const conSaldo = $derived(pagos().filter((p) => p.metodo === 'saldo' && diaColombia(p.created_at) === hoy));
  const totalSaldo = $derived(conSaldo.reduce((s, p) => s + p.monto, 0));
  const tarjetasHoy = $derived(cuentasAbiertas().length);
  const canchas = $derived(canchasDe());

  // Reservas nuevas: primero las que llegaron con el panel abierto, luego las próximas hechas en la app (las clases
  // van en su sección)
  const recientes = $derived.by(() => {
    const vivas = panel.nuevas.map((n) => todas.find((f) => f.id === n.franja)).filter((f) => f && f.estado !== 'libre');
    const ids = new Set(vivas.map((f) => f!.id));
    const app = todas
      .filter((f) => f.origen === 'app' && !f.cliente?.startsWith('Clase ·') && (f.estado === 'apartada' || f.estado === 'pagada') && Date.parse(f.fin) > panel.ahora && !ids.has(f.id))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    return [...vivas, ...app].slice(0, 5) as typeof todas;
  });
  const esNueva = (id: string) => panel.nuevas.some((n) => n.franja === id);
  const fecha = $derived(new Date(panel.ahora).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).replace(',', ''));
  const reloj = $derived(hora(new Date(panel.ahora).toISOString()));

  // Ingresos por hora (Colombia), apilados por concepto
  const HORAS = Array.from({ length: 17 }, (_, k) => k + 6);
  const horaCol = (iso: string) => new Date(Date.parse(iso) - 5 * 3_600_000).getUTCHours();
  const porHora = $derived.by(() => {
    const delDia = pagos().filter((p) => diaColombia(p.created_at) === hoy);
    return HORAS.map((h) => {
      const en = delDia.filter((p) => horaCol(p.created_at) === h);
      const s = (k: string) => en.filter((p) => p.concepto === k).reduce((a, p) => a + p.monto, 0);
      return { h, cancha: s('cancha'), bar: s('bar'), torneo: s('torneo'), clase: s('clase') };
    });
  });
  const maxHora = $derived(Math.max(1, ...porHora.map((x) => x.cancha + x.bar + x.torneo + x.clase)));
  const horaAhora = $derived(horaCol(new Date(panel.ahora).toISOString()));
  const etiquetaHora = (h: number) => (h === 12 ? '12m' : h > 12 ? `${h - 12}p` : `${h}a`);

  /** Qué tanto va del turno (0 a 1) */
  const avance = (f: { inicio: string; fin: string }) => Math.min(1, Math.max(0, (panel.ahora - Date.parse(f.inicio)) / (Date.parse(f.fin) - Date.parse(f.inicio))));
  const quedan = (f: { fin: string }) => Math.max(0, Math.round((Date.parse(f.fin) - panel.ahora) / 60_000));
  const pct = (v: number) => `${Math.max(0, Math.min(100, v * 100))}%`;
  const esClase = (f: { cliente?: string | null } | null) => !!f?.cliente?.startsWith('Clase ·');
  const MEZCLA = $derived([
    { t: 'Canchas', v: c.cancha, col: 'var(--q-acc)' },
    { t: 'Bar', v: c.bar, col: 'var(--c-verde)' },
    { t: 'Torneos', v: c.torneo, col: 'var(--c-oro)' },
    { t: 'Clases', v: c.clase, col: 'var(--c-clase)' }
  ]);
  const KEYS = ['cancha', 'bar', 'torneo', 'clase'] as const;
  const COL: Record<(typeof KEYS)[number], string> = { cancha: 'var(--q-acc)', bar: 'var(--c-verde)', torneo: 'var(--c-oro)', clase: 'var(--c-clase)' };
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">{fecha} · {reloj}</span>
    <h1 class="c-titulo c-h1">Así va el club hoy</h1>
  </div>
  <span class="c-chip-vivo"><i></i>En vivo</span>
</header>

<!-- Las cuatro canchas, vistas desde arriba -->
<section class="pistas" aria-label="Canchas ahora">
  {#each canchas as ca, k (ca.id)}
    {@const f = enJuego(todas, ca.id, panel.ahora)}
    {@const sig = proxima(todas, ca.id, panel.ahora)}
    {@const cuenta = abiertos.filter((p) => p.cancha_id === ca.id && !p.pagado_en).reduce((s, p) => s + p.total, 0)}
    {@const jug = f ? jugadoresDe(f) : []}
    {@const clase = esClase(f)}
    {@const urge = !!f && quedan(f) < 5}
    <button class="pista" class:ocupada={!!f} class:clase class:urge class:brilla={!!f && panel.destellos.includes(f.id)} onclick={() => (f ? panel.verFranja(f) : sig ? panel.verFranja(sig) : (panel.seccion = 'agenda'))}>
      <span class="piso">
        <i class="l marco"></i><i class="l red"></i><i class="l s1"></i><i class="l s2"></i><i class="l centro"></i>
        <b class="n">{k + 1}</b>
        {#if f}<span class="queda">{quedan(f)} MIN</span>{/if}
      </span>
      <span class="quien">
        {#if f}
          <b>{clase ? '🎓 ' : ''}{titularDe(f)}{jug.length > 1 ? ` + ${jug.length - 1}` : ''}</b>
          <small>{hora(f.inicio)} – {hora(f.fin)} · {urge ? 'terminando' : `quedan ${quedan(f)} min`}{f.estado === 'apartada' ? ' · falta pago' : f.llegaron ? ' · ✓ llegaron' : ''}{cuenta ? ` · 🍹 ${pesos(cuenta)}` : ''}</small>
        {:else}
          <b>{sig ? `Libre hasta las ${hora(sig.inicio)}` : 'Libre el resto del día'}</b>
          <small>{sig ? `Próxima: ${titularDe(sig)} · ${sig.estado === 'pagada' ? 'pagada' : 'falta pago'}` : 'Nada más reservado hoy'}</small>
        {/if}
      </span>
      <span class="avance"><i style="width:{f ? pct(avance(f)) : '0%'}"></i></span>
    </button>
  {/each}
</section>

<div class="kpis">
  <article class="kpi">
    <small class="c-mini">Ingresos hoy</small>
    <b class="c-num grande brillo"><Contador valor={c.total} formato={(n) => pesos(n).replace('$ ', '$')} /></b>
    <div class="mezcla">{#each MEZCLA as m (m.t)}<i style="flex:{Math.max(m.v, 0.0001)};background:{m.col}"></i>{/each}</div>
    <ul class="leyenda2">{#each MEZCLA as m (m.t)}<li><i style="background:{m.col}"></i>{m.t}<b>{pesos(m.v).replace('$ ', '$')}</b></li>{/each}</ul>
  </article>
  <article class="kpi anillo">
    <span class="aro" style="--g:{occ.pct * 3.6}deg"><span class="c-num"><Contador valor={occ.pct} formato={(n) => `${Math.round(n)}%`} /></span></span>
    <span class="txt"><small class="c-mini">Ocupación</small><b>{occ.ocupadas} de {occ.total}</b><small>turnos de hoy</small></span>
  </article>
  <button class="kpi" onclick={() => (panel.seccion = 'bar')}>
    <small class="c-mini">Pedidos abiertos</small>
    <b class="c-num grande"><Contador valor={abiertos.length} /></b>
    <small class="sub acc">{abiertos.filter((p) => p.estado === 'nuevo').length} nuevos ahora</small>
  </button>
  <button class="kpi" onclick={() => (panel.seccion = 'cuentas')}>
    <small class="c-mini">Tarjetas activas</small>
    <b class="c-num grande"><Contador valor={tarjetasHoy} /></b>
    <small class="sub">{pesos(totalSaldo).replace('$ ', '$')} con saldo hoy</small>
  </button>
</div>

<div class="dos">
  <section class="c-tarjeta bloque">
    <header>
      <h2 class="c-sec">Ingresos por hora</h2>
      <ul class="leyenda">{#each MEZCLA as m (m.t)}<li><i style="background:{m.col}"></i>{m.t}</li>{/each}</ul>
    </header>
    <div class="barras" role="img" aria-label="Ingresos por hora de hoy">
      {#each porHora as x (x.h)}
        <div class="col" class:futura={x.h > horaAhora} class:ahora={x.h === horaAhora}>
          {#each KEYS as k (k)}{#if x[k]}<i style="height:{(x[k] / maxHora) * 100}%;background:{COL[k]}"></i>{/if}{/each}
          <small>{x.h % 1 === 0 && (x.h - 6) % 1 === 0 ? etiquetaHora(x.h) : ''}</small>
        </div>
      {/each}
    </div>
  </section>

  <section class="c-tarjeta bloque">
    <header><h2 class="c-sec">Reservas nuevas</h2><button class="c-btn sec chico" onclick={() => (panel.seccion = 'agenda')}>Ver agenda</button></header>
    {#if recientes.length}
      <ul class="reservas">
        {#each recientes as f (f.id)}
          <li>
            <button class:nueva={esNueva(f.id)} onclick={() => panel.verFranja(f)}>
              <span class="ori" aria-hidden="true">{f.origen === 'app' ? '📱' : '📞'}</span>
              <span class="quien-r"><b>{titularDe(f)} · {canchas.find((x) => x.id === f.cancha_id)?.nombre}</b><small>{cuando(f.inicio).split(' · ')[0]} · {hora(f.inicio)}</small></span>
              {#if f.estado === 'apartada'}<span class="chip falta">FALTA PAGO</span>{:else}<span class="chip pagada">PAGADA</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="c-vacio">Cuando alguien reserve desde la app aparece aquí.</p>
    {/if}
  </section>
</div>

<style>
  .pistas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .pista { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 0; border-radius: 16px; background: #fff; text-align: left; box-shadow: 0 0 0 1px rgba(14, 27, 51, 0.08); }
  .pista.ocupada { box-shadow: 0 0 0 1px var(--q-acc), 0 0 28px -6px var(--c-accg); }
  .pista.clase { box-shadow: 0 0 0 1px rgba(160, 148, 255, 0.6), 0 0 28px -6px rgba(124, 108, 255, 0.45); }
  .pista.urge { animation: urge 1.2s ease-in-out infinite; }
  .pista.brilla { animation: c-brilla 1.4s ease-in-out 3; }
  @keyframes urge { 0%, 100% { box-shadow: 0 0 0 1px var(--c-error), 0 0 22px -6px rgba(212, 42, 58, 0.5); } 50% { box-shadow: 0 0 0 2px var(--c-error), 0 0 34px 0 rgba(212, 42, 58, 0.45); } }
  .piso { position: relative; display: block; height: 150px; border-radius: 10px; overflow: hidden; background: linear-gradient(160deg, #dcd8cc, #cfcabc); }
  .ocupada .piso { background: linear-gradient(160deg, #1e7fd0, #13508a); }
  .clase .piso { background: linear-gradient(160deg, #5b4fd0, #2c2a8a); }
  .l { position: absolute; display: block; background: rgba(255, 255, 255, 0.45); }
  .l.marco { inset: 10px; border: 2px solid rgba(255, 255, 255, 0.55); border-radius: 2px; background: none; }
  .l.red { left: 10px; right: 10px; top: 50%; height: 3px; margin-top: -1.5px; background: rgba(255, 255, 255, 0.85); }
  .l.s1 { left: 10px; right: 10px; top: 28%; height: 2px; }
  .l.s2 { left: 10px; right: 10px; top: 72%; height: 2px; }
  .l.centro { left: 50%; top: 28%; bottom: 28%; width: 2px; margin-left: -1px; }
  .n { position: absolute; left: 10px; top: 8px; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 40px; line-height: 1; color: rgba(255, 255, 255, 0.9); text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4); }
  .queda { position: absolute; right: 8px; top: 10px; padding: 3px 8px; border-radius: 7px; background: rgba(10, 18, 38, 0.75); color: #fff; font-size: 12px; font-weight: 900; }
  .quien { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .quien b { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quien small { font-size: 12.5px; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .avance { height: 6px; border-radius: 3px; background: rgba(14, 27, 51, 0.08); overflow: hidden; }
  .avance i { display: block; height: 100%; border-radius: 3px; background: var(--q-acc); }
  .clase .avance i { background: var(--c-clase); }
  .urge .avance i { background: var(--c-error); }

  .kpis { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .kpi { display: flex; flex-direction: column; justify-content: space-between; gap: 8px; padding: 16px 18px; border-radius: 16px; background: #fff; border: var(--c-borde); text-align: left; }
  button.kpi:hover { border-color: var(--q-borde); }
  .grande { font-size: 48px; }
  .kpi:first-child .grande { font-size: 50px; }
  .brillo { text-shadow: 0 0 28px var(--c-accg); }
  .mezcla { display: flex; height: 8px; gap: 2px; border-radius: 4px; overflow: hidden; }
  .leyenda2 { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
  .leyenda2 li { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--q-tx2); }
  .leyenda2 i { width: 8px; height: 8px; border-radius: 2px; }
  .leyenda2 b { margin-left: auto; color: var(--q-tx); }
  .kpi.anillo { flex-direction: row; align-items: center; justify-content: flex-start; gap: 14px; }
  .aro { width: 96px; height: 96px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: conic-gradient(var(--q-acc) 0 var(--g), rgba(14, 27, 51, 0.08) var(--g) 360deg); filter: drop-shadow(0 0 12px var(--c-accg)); }
  .aro .c-num { width: 74px; height: 74px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; }
  .txt { display: flex; flex-direction: column; }
  .txt b { font-size: 15px; margin-top: 4px; }
  .txt small:last-child { font-size: 12.5px; color: var(--q-tx2); }
  .sub { font-size: 12.5px; font-weight: 700; color: var(--q-tx2); }
  .sub.acc { color: var(--q-acct); }

  .dos { display: grid; grid-template-columns: 1.6fr 1fr; gap: 12px; }
  .bloque { padding: 16px 18px; }
  .bloque header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .leyenda { list-style: none; display: flex; gap: 12px; margin: 0; padding: 0; font-size: 12px; color: var(--q-tx2); }
  .leyenda li { display: flex; align-items: center; gap: 5px; }
  .leyenda i { width: 8px; height: 8px; border-radius: 2px; }
  .barras { display: flex; align-items: flex-end; gap: 6px; height: 190px; padding-bottom: 20px; }
  .col { position: relative; flex: 1; height: 100%; display: flex; flex-direction: column-reverse; justify-content: flex-start; gap: 2px; }
  .col i { display: block; border-radius: 2px; min-height: 2px; }
  .col.futura i { opacity: 0.25; }
  .col small { position: absolute; bottom: -20px; left: -4px; right: -4px; text-align: center; font-size: 11px; font-weight: 700; color: var(--q-tx2); }
  .col.ahora small { color: var(--c-error); }
  .reservas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .reservas button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 0; border-radius: 10px; background: none; text-align: left; }
  .reservas button:hover { background: rgba(14, 27, 51, 0.03); }
  .reservas button.nueva { background: rgba(14, 27, 51, 0.06); animation: c-sube 0.4s both; }
  .ori { font-size: 16px; }
  .quien-r { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .quien-r b { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quien-r small { font-size: 12px; color: var(--q-tx2); }
  .chip { padding: 3px 8px; border-radius: 7px; font-size: 11.5px; font-weight: 900; white-space: nowrap; }
  .chip.pagada { background: var(--c-verde); color: #fff; }
  .chip.falta { background: var(--q-accs); color: var(--q-acct); }
</style>
