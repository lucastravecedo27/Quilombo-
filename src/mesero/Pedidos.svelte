<script lang="ts">
  // Pedidos de hoy en vivo: 3 contadores arriba y los grupos Nuevos → Preparando → Entregados. Lo pagado con saldo
  // (tarjeta Quilombo) se cierra solo al entregarlo; lo entregado sin pagar se cobra. Abajo, los cerrados.
  import { pedidos, moverPedido } from '$lib/club/app/club';
  import { diaColombia } from '$lib/social/domain/jugar';
  import type { Pedido } from '$lib/club/domain/club';
  import { m } from './estado.svelte';
  import TarjetaPedido from './TarjetaPedido.svelte';
  import HojaCobrar from './HojaCobrar.svelte';

  const hoy = $derived(diaColombia(new Date(m.ahora).toISOString()));
  const deHoy = $derived(pedidos().filter((p) => diaColombia(p.created_at) === hoy));
  const porHora = (a: Pedido, b: Pedido) => a.created_at.localeCompare(b.created_at);
  const nuevos = $derived(deHoy.filter((p) => p.estado === 'nuevo').sort(porHora));
  const preparando = $derived(deHoy.filter((p) => p.estado === 'preparando').sort(porHora));
  const entregados = $derived(deHoy.filter((p) => p.estado === 'entregado').sort(porHora));
  const porCobrar = $derived(entregados.filter((p) => !p.pagado_en && !p.cuenta_id).length);
  const cerrados = $derived(deHoy.filter((p) => p.estado === 'pagado' || p.estado === 'cancelado').sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
  let verCerrados = $state(false);
  let cobrando = $state<Pedido | null>(null);

  async function tomar(p: Pedido) { await moverPedido(p.id, 'preparando', m.yo); m.avisar(`Tomaste el #${p.numero} · ${p.ubicacion}`); }
  async function entregar(p: Pedido) { await moverPedido(p.id, 'entregado', m.yo); m.avisar(`Entregado en ${p.ubicacion} ✓`); }
  /** Lo que se hace con un entregado: cobrarlo, o ir a la cuenta del club si es de una cuenta sin usuario */
  function siguiente(p: Pedido) {
    if (p.cuenta_id && !p.pagado_en) m.verCuenta = p.cuenta_id;
    else cobrando = p;
  }

  const GRUPOS = $derived([
    { id: 'nuevo', titulo: 'Nuevos', color: 'var(--q-acc)', vacio: 'Nada nuevo por ahora. Te avisamos cuando llegue uno.', lista: nuevos, late: nuevos.length > 0 },
    { id: 'preparando', titulo: 'Preparando', color: '#b98500', vacio: 'Nada en preparación', lista: preparando, late: false },
    { id: 'entregado', titulo: 'Entregados', color: 'var(--q-ok)', vacio: 'Sin entregas por cobrar', lista: entregados, late: false }
  ]);
</script>

<div class="contadores">
  <div class="c nuevo"><b class="m-num">{nuevos.length}</b><small>Nuevos</small></div>
  <div class="c noche"><b class="m-num">{preparando.length}</b><small>Preparando</small></div>
  <div class="c blanco"><b class="m-num">{porCobrar}</b><small>Por cobrar</small></div>
</div>

{#each GRUPOS as g (g.id)}
  <div class="grupo-cab">
    <i style="background:{g.color}" class:late={g.late}></i>
    <h2 class="m-titulo">{g.titulo}</h2>
    <small>{g.lista.length}</small>
  </div>
  <div class="lista">
    {#each g.lista as p (p.id)}
      {#if g.id === 'nuevo'}
        <TarjetaPedido {p} accion="Tomar pedido" tono="acc" onAccion={() => tomar(p)} />
      {:else if g.id === 'preparando'}
        <TarjetaPedido {p} accion="Entregado" tono="noche" onAccion={() => entregar(p)} />
      {:else if p.cuenta_id && !p.pagado_en}
        <TarjetaPedido {p} accion="Ver la cuenta" tono="noche" onAccion={() => siguiente(p)} />
      {:else}
        <TarjetaPedido {p} accion="Cobrar" tono="rojo" onAccion={() => siguiente(p)} />
      {/if}
    {:else}
      <div class="vacio">{g.vacio}</div>
    {/each}
  </div>
{/each}

{#if cerrados.length}
  <button class="plegar" aria-expanded={verCerrados} onclick={() => (verCerrados = !verCerrados)}>
    <span class="m-titulo">Cerrados hoy · {cerrados.length}</span><span aria-hidden="true">{verCerrados ? '▲' : '▼'}</span>
  </button>
  {#if verCerrados}
    <div class="lista">{#each cerrados as p (p.id)}<TarjetaPedido {p} />{/each}</div>
  {/if}
{/if}

<HojaCobrar pedido={cobrando} onCerrar={() => (cobrando = null)} />

<style>
  .contadores { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 14px 16px 4px; }
  .c { padding: 10px 12px; border-radius: 14px; display: flex; flex-direction: column; }
  .c b { font-size: 36px; }
  .c small { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
  .c.nuevo { background: var(--q-acc); color: var(--q-acctx); }
  .c.noche { background: var(--q-noche); color: #fff; }
  .c.blanco { background: var(--q-card); color: var(--q-tx); border: 1px solid var(--q-line); }
  :global(html.dark) .c.noche { background: var(--q-sub); }

  .grupo-cab { display: flex; align-items: center; gap: 8px; margin: 20px 20px 10px; }
  .grupo-cab i { width: 10px; height: 10px; border-radius: 5px; }
  .grupo-cab i.late { animation: m-late 1.2s ease-in-out infinite; }
  .grupo-cab h2 { margin: 0; font-weight: 800; font-size: 24px; }
  .grupo-cab small { font-size: 14px; font-weight: 800; color: var(--q-tx2); }
  .lista { display: flex; flex-direction: column; gap: 10px; margin: 0 16px; }
  .vacio { padding: 16px; border-radius: 14px; border: 1.5px dashed var(--q-borde); text-align: center; font-size: 14.5px; color: var(--q-tx2); }
  .plegar { display: flex; align-items: center; justify-content: space-between; width: calc(100% - 32px); min-height: 48px; margin: 22px 16px 8px; padding: 0 4px; border: 0; background: none; color: var(--q-tx2); font-size: 22px; }
  @media (prefers-reduced-motion: reduce) { .grupo-cab i.late { animation: none; } }
</style>
