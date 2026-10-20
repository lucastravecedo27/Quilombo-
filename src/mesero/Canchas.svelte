<script lang="ts">
  // Así van las canchas: por cada una, el número en un cuadro de color (acento si está ocupada, rojo si le quedan
  // menos de 5 min, lila si es clase, gris si está libre), quién juega, el horario, cuánto le queda, si llegaron, la
  // cuenta del bar y la próxima reserva con su estado. Lo que se reserva en vivo se resalta.
  import { canchasDe, franjasDe, jugadoresDe, marcarLlegada, pedidos, titularDe } from '$lib/club/app/club';
  import { enJuego, proxima } from '$lib/club/domain/club';
  import { datos } from '$lib/data/datos.svelte';
  import { horaColombia, pesos, type Franja } from '$lib/social/domain/jugar';
  import { m } from './estado.svelte';

  let { onPedir }: { onPedir: (ubicacion: string) => void } = $props();

  const canchas = $derived(canchasDe());
  const franjas = $derived(franjasDe());
  const abiertos = $derived(pedidos().filter((p) => p.estado !== 'cancelado' && !p.pagado_en && p.estado !== 'pagado'));
  const minutos = (iso: string) => Math.max(0, Math.round((Date.parse(iso) - m.ahora) / 60_000));
  const esNueva = (f: Franja | null) => !!f && !!m.reservasNuevas[f.id] && m.ahora - m.reservasNuevas[f.id] < 10 * 60_000;
  const hora = (iso: string) => horaColombia(iso).replace(/\s?[ap]\.\s?m\./, '');
  const queda = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}` : `${min} min`);
  /** La clase que se da en una franja (si es de un profe) */
  const claseDe = (f: Franja) => (datos.clases as { franja_id: string | null; tipo: string; cupos: number; alumnos: string[] }[]).find((c) => c.franja_id === f.id) ?? null;
  const esClase = (f: Franja) => !!claseDe(f) || /^clase/i.test(f.cliente ?? '');
  const reloj = $derived(horaColombia(new Date(m.ahora).toISOString()));

  function vista(cid: string) {
    const ahora = enJuego(franjas, cid, m.ahora);
    const sig = proxima(franjas, cid, m.ahora);
    const bar = abiertos.filter((p) => p.cancha_id === cid).reduce((s, p) => s + p.total, 0);
    if (!ahora) {
      return { ahora, sig, bar, libre: true, clase: false, urg: false, nueva: esNueva(sig), quien: 'Libre ahora', sub: sig ? `Libre hasta las ${horaColombia(sig.inicio)}` : 'Libre el resto del día', min: 0, avance: 0 };
    }
    const min = minutos(ahora.fin);
    const total = (Date.parse(ahora.fin) - Date.parse(ahora.inicio)) / 60_000;
    const cl = claseDe(ahora);
    const jug = jugadoresDe(ahora);
    const clase = esClase(ahora);
    const quien = clase ? `🎓 ${titularDe(ahora)}` : jug.length > 1 ? `${titularDe(ahora)} + ${jug.length - 1}` : titularDe(ahora);
    const sub = `${hora(ahora.inicio)} – ${horaColombia(ahora.fin)}${cl ? ` · ${cl.tipo} ${cl.alumnos.length}/${cl.cupos}` : ahora.llegaron ? ` · llegaron ${horaColombia(ahora.llegaron)}` : ''}`;
    return { ahora, sig, bar, libre: false, clase, urg: min < 5, nueva: esNueva(ahora), quien, sub, min, avance: Math.min(100, Math.max(0, Math.round((1 - min / total) * 100))) };
  }
</script>

<div class="cab">
  <h2 class="m-titulo">Así van las canchas</h2>
  <small>{reloj}</small>
</div>

<div class="lista">
  {#each canchas as c (c.id)}
    {@const v = vista(c.id)}
    <article id="cancha-{c.id}" class="cancha" class:nueva={v.nueva || esNueva(v.sig)}>
      <div class="fila">
        <span class="num" class:libre={v.libre} class:clase={v.clase} class:urg={v.urg && !v.clase}>
          <small>CANCHA</small><b class="m-num">{c.nombre.replace(/\D+/g, '') || c.nombre}</b>
        </span>
        <span class="quien"><b>{v.quien}</b><small>{v.sub}</small></span>
        {#if !v.libre}
          <span class="queda" class:urg={v.urg}><b class="m-num">{queda(v.min)}</b><small>QUEDAN</small></span>
        {/if}
      </div>
      {#if !v.libre}
        <div class="barra"><i style="width:{v.avance}%" class:libre={v.libre} class:clase={v.clase} class:urg={v.urg && !v.clase}></i></div>
      {/if}
      <div class="chips">
        {#if v.ahora}
          <button class="chip" class:ok={!!v.ahora.llegaron} onclick={() => v.ahora && marcarLlegada(v.ahora.id)}>{v.ahora.llegaron ? '✓ Llegaron' : '⏳ No han llegado'}</button>
          {#if v.ahora.estado === 'apartada'}<span class="chip acc">⏳ Falta pago</span>{/if}
          {#if v.nueva}<span class="chip acc">📅 Nueva reserva</span>{/if}
        {:else}
          <span class="chip">Libre</span>
        {/if}
        {#if v.bar}<span class="chip">🍹 Bar {pesos(v.bar)}</span>{/if}
      </div>
      <div class="pie">
        <span class="prox">
          {#if v.sig}
            <small>Próxima · {horaColombia(v.sig.inicio)}{#if esNueva(v.sig)} · <em>nueva</em>{/if}</small>
            <b>{titularDe(v.sig)}{v.sig.origen === 'app' ? ' · 📱' : ''}</b>
            <small class="estado" class:ok={v.sig.estado === 'pagada'} class:falta={v.sig.estado === 'apartada'}>{v.sig.estado === 'pagada' ? '✓ Pagada' : '⏳ Apartada · falta pago'}</small>
          {:else}
            <small>Próxima</small>
            <b>Sin más reservas hoy</b>
            <small class="estado">Se puede reservar</small>
          {/if}
        </span>
        <button class="pedir" onclick={() => onPedir(c.nombre)}>＋ Pedido</button>
      </div>
    </article>
  {/each}
</div>

<style>
  .cab { display: flex; justify-content: space-between; align-items: baseline; padding: 16px 20px 12px; }
  .cab h2 { margin: 0; font-size: 30px; }
  .cab small { font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .lista { display: flex; flex-direction: column; gap: 12px; padding: 0 16px; }
  .cancha { scroll-margin-top: 90px; border-radius: 18px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .cancha.nueva { border: 2px solid var(--q-acc); animation: m-sube 0.4s both; }
  .fila { display: flex; align-items: center; gap: 12px; padding: 14px 14px 10px; }
  .num { width: 58px; height: 58px; flex: none; border-radius: 14px; background: var(--q-acc); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .num small { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; opacity: 0.8; }
  .num b { font-size: 32px; line-height: 0.9; }
  .num.libre { background: #9aa1b0; }
  .num.clase { background: #3346a8; }
  .num.urg { background: #e8475b; }
  .quien { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .quien b { font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quien small { font-size: 13.5px; color: var(--q-tx2); font-weight: 600; }
  .queda { display: flex; flex-direction: column; align-items: flex-end; }
  .queda b { font-size: 30px; }
  .queda.urg b { color: #e8475b; }
  .queda small { font-size: 11.5px; font-weight: 800; color: var(--q-tx2); }
  .barra { margin: 0 14px; height: 8px; border-radius: 4px; background: var(--q-sub); overflow: hidden; }
  .barra i { display: block; height: 100%; border-radius: 4px; background: var(--q-acc); transition: width 0.4s; }
  .barra i.clase { background: #3346a8; }
  .barra i.urg { background: #e8475b; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px 0; }
  .chip { padding: 5px 9px; border: 0; border-radius: 9px; background: var(--q-sub); color: var(--q-tx2); font-size: 13px; font-weight: 800; white-space: nowrap; }
  .chip.ok { background: rgba(24, 137, 91, 0.14); color: var(--q-ok); }
  .chip.acc { background: var(--q-accs); color: var(--q-acct); }
  button.chip { min-height: 30px; }
  .pie { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px 12px 14px; border-top: 1px dashed var(--q-line); }
  .prox { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .prox small { font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--q-tx2); text-transform: uppercase; }
  .prox em { font-style: normal; color: var(--q-acct); }
  .prox b { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .prox .estado { font-size: 12.5px; letter-spacing: 0; text-transform: none; }
  .prox .estado.ok { color: var(--q-ok); }
  .prox .estado.falta { color: var(--q-acct); }
  .pedir { flex: none; height: 48px; padding: 0 14px; border: 0; border-radius: 12px; background: var(--q-sub); font-size: 15px; font-weight: 900; }
  .pedir:active { background: var(--q-accs); }
  @media (prefers-reduced-motion: reduce) { .cancha.nueva { animation: none; } }
</style>
