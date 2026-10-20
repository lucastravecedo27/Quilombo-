<script lang="ts">
  // Caja: los pagos de un día (canchas, bar y torneos) con su método, y los totales por método para cuadrar al cierre.
  import { pagos } from '$lib/club/app/club';
  import { METODOS, caja, type MetodoPago, type Pago } from '$lib/club/domain/club';
  import { diaColombia, horaColombia, pesos } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';

  const hoy = $derived(diaColombia(new Date(panel.ahora).toISOString()));
  let dia = $state('');
  const elegido = $derived(dia || hoy);
  const delDia = $derived(pagos().filter((p) => diaColombia(p.created_at) === elegido));
  const c = $derived(caja(pagos(), elegido));
  const porMetodo = $derived((Object.keys(METODOS) as MetodoPago[]).map((m) => ({ m, total: delDia.filter((p) => p.metodo === m).reduce((s, p) => s + p.monto, 0), n: delDia.filter((p) => p.metodo === m).length })));
  const CONCEPTO: Record<Pago['concepto'], string> = { cancha: '🎾 Cancha', bar: '🍹 Bar', torneo: '🏆 Torneo', clase: '🎓 Clase' };
  const ORDEN: MetodoPago[] = ['saldo', 'app', 'efectivo', 'datafono', 'nequi'];
  const COLOR_M: Record<MetodoPago, string> = { saldo: 'var(--q-acc)', app: '#1e7fd0', efectivo: 'var(--c-verde)', datafono: 'var(--c-oro)', nequi: 'var(--c-clase)' };
  const NOMBRE_M = (m: MetodoPago) => (m === 'app' ? 'Tarjeta / PSE' : METODOS[m]);
  const metodos = $derived(ORDEN.map((m) => porMetodo.find((x) => x.m === m)!).filter(Boolean));
  const maxM = $derived(Math.max(1, ...metodos.map((x) => x.total)));
  const conceptos = $derived([
    { t: 'Canchas', v: c.cancha, col: 'var(--q-acc)' },
    { t: 'Bar', v: c.bar, col: 'var(--c-verde)' },
    { t: 'Torneos', v: c.torneo, col: 'var(--c-oro)' },
    { t: 'Clases', v: c.clase, col: 'var(--c-clase)' }
  ]);
  const maxC = $derived(Math.max(1, ...conceptos.map((x) => x.v)));
  const DETALLE: Record<Pago['concepto'], string> = { cancha: 'Cancha', bar: 'Bar', torneo: 'Torneo', clase: 'Clase' };
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">{elegido === hoy ? 'Pagos de hoy' : 'Pagos del día'} · {c.n} pagos</span>
    <h1 class="c-titulo c-h1">Caja · {pesos(c.total).replace('$ ', '$')}</h1>
  </div>
  <div class="der-cab">
    <label class="c-campo">Día<input class="c-input" type="date" max={hoy} value={elegido} onchange={(e) => (dia = (e.currentTarget as HTMLInputElement).value)} /></label>
    <button class="c-btn grande" onclick={() => (panel.cobroTarjeta = true)}>🛳️ Cobrar con tarjeta</button>
  </div>
</header>

<div class="dos">
  <section class="c-tarjeta barras">
    <h2 class="c-sec">Por método</h2>
    {#each metodos as x (x.m)}
      <div class="fila"><span>{NOMBRE_M(x.m)}</span><b>{pesos(x.total).replace('$ ', '$')}</b></div>
      <span class="c-barra"><i style="width:{(x.total / maxM) * 100}%;background:{COLOR_M[x.m]}"></i></span>
    {/each}
  </section>
  <section class="c-tarjeta barras">
    <h2 class="c-sec">Por concepto</h2>
    {#each conceptos as x (x.t)}
      <div class="fila"><span>{x.t}</span><b>{pesos(x.v).replace('$ ', '$')}</b></div>
      <span class="c-barra"><i style="width:{(x.v / maxC) * 100}%;background:{x.col}"></i></span>
    {/each}
  </section>
</div>

<section class="c-tarjeta tabla">
  {#each delDia as p (p.id)}
    <div class="pago">
      <small class="h">{horaColombia(p.created_at).replace(/\s*[ap]\.?\s?m\.?/i, '')}</small>
      <b class="q">{p.quien}</b>
      <span class="que">{DETALLE[p.concepto]}</span>
      <span class="met" class:saldo={p.metodo === 'saldo'}>{p.metodo === 'saldo' ? 'Saldo Quilombo' : p.metodo === 'app' ? 'App' : METODOS[p.metodo]}</span>
      <b class="v">{pesos(p.monto).replace('$ ', '$')}</b>
    </div>
  {:else}
    <p class="c-vacio">No hubo pagos este día.</p>
  {/each}
</section>

<style>
  .der-cab { display: flex; align-items: flex-end; gap: 12px; }
  .grande { height: 44px; font-size: 14px; }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .barras { padding: 18px; display: flex; flex-direction: column; gap: 6px; }
  .barras .c-sec { margin-bottom: 8px; }
  .fila { display: flex; justify-content: space-between; font-size: 14px; margin-top: 6px; }
  .fila span { font-weight: 800; }
  .tabla { overflow: hidden; }
  .pago { display: grid; grid-template-columns: 80px 1.4fr 1.6fr 1.2fr 100px; gap: 10px; align-items: center; padding: 11px 16px; font-size: 14px; }
  .pago + .pago { border-top: 1px solid rgba(14, 27, 51, 0.08); }
  .h { font-size: 12.5px; color: var(--q-tx2); }
  .que { font-size: 13px; color: var(--q-tx2); }
  .met { font-size: 13px; font-weight: 800; }
  .met.saldo { color: var(--q-acct); }
  .v { text-align: right; }
</style>
