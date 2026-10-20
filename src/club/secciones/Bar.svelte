<script lang="ts">
  // Bar y pedidos: tablero en columnas (nuevos → preparando → entregados por cobrar → pagados hoy).
  // Los pedidos de la app llevan 📱; el mesero los mueve desde el celular y aquí se ve al instante.
  import { cancelarPedido, cobrarPedido, cuentas, moverPedido, pedidos } from '$lib/club/app/club';
  import { ESTADOS_PEDIDO, METODOS, hace, siguiente, type EstadoPedido, type MetodoPago, type Pedido } from '$lib/club/domain/club';
  import { diaColombia, pesos } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';

  const hoy = $derived(diaColombia(new Date(panel.ahora).toISOString()));
  const todos = $derived(pedidos());
  const COLUMNAS: { id: EstadoPedido; titulo: string; color: string }[] = [
    { id: 'nuevo', titulo: 'Nuevos', color: 'var(--q-acc)' },
    { id: 'preparando', titulo: 'Preparando', color: 'var(--c-oro)' },
    { id: 'entregado', titulo: 'Entregados', color: 'var(--c-verde)' },
    { id: 'pagado', titulo: 'Pagados', color: '#5b6478' }
  ];
  const de = (e: EstadoPedido) =>
    todos.filter((p) => p.estado === e && (e !== 'pagado' || diaColombia(p.pagado_en ?? p.created_at) === hoy))
      .sort((a, b) => (e === 'pagado' ? (b.pagado_en ?? '').localeCompare(a.pagado_en ?? '') : a.created_at.localeCompare(b.created_at)));
  const vendidoHoy = $derived(de('pagado').reduce((s, p) => s + p.total, 0));
  const porCobrar = $derived(todos.filter((p) => (p.estado === 'entregado' || p.estado === 'preparando' || p.estado === 'nuevo') && !p.pagado_en).reduce((s, p) => s + p.total, 0));

  let cobrando = $state<string | null>(null);
  let cancelando = $state<string | null>(null);
  const BOTON: Partial<Record<EstadoPedido, string>> = { nuevo: 'Tomar →', preparando: 'Entregado →' };
  const recien = (p: Pedido) => panel.ahora - Date.parse(p.created_at) < 90_000;
  const mover = (p: Pedido) => { const s = siguiente(p.estado); if (s && s !== 'pagado') void moverPedido(p.id, s); };
  const cobrar = async (p: Pedido, m: MetodoPago) => { await cobrarPedido(p.id, m); cobrando = null; };
  /** Código de la cuenta (modo crucero) a la que va cargado un pedido */
  const codigoCuenta = (p: Pedido) => (p.cuenta_id ? cuentas().find((c) => c.id === p.cuenta_id)?.codigo ?? '' : '');
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">Pedidos de la app y de los meseros</span>
    <h1 class="c-titulo c-h1">Bar y pedidos</h1>
  </div>
  <div class="resumen">
    <span><small class="c-mini">Vendido hoy</small><b class="c-num">{pesos(vendidoHoy).replace('$ ', '$')}</b></span>
    <span><small class="c-mini">Por cobrar</small><b class="c-num acc">{pesos(porCobrar).replace('$ ', '$')}</b></span>
    <button class="c-btn sec" onclick={() => (panel.producto = {})}>＋ Nuevo producto</button>
  </div>
</header>

<div class="tablero">
  {#each COLUMNAS as col (col.id)}
    {@const lista = de(col.id)}
    <section class="col" style="--c:{col.color}">
      <header><i></i><h2>{col.titulo}</h2><small>{lista.length}</small></header>
      {#each lista as p (p.id)}
        <article class="pedido" class:nuevo={p.estado === 'nuevo'} class:brilla={recien(p)}>
          <div class="fila"><b class="donde">{p.ubicacion}</b><small>#{p.numero}</small></div>
          <span class="cliente">{p.cliente} · {p.cuenta_id ? `🛳️ Tarjeta ${codigoCuenta(p)}` : p.origen === 'app' ? '📱 App' : `🧾 ${p.mesero ?? 'Mesero'}`}</span>
          <span class="items">{p.items.map((i) => `${i.cantidad}× ${i.emoji} ${i.nombre}`).join(' · ')}</span>
          {#if p.nota}<span class="nota">“{p.nota}”</span>{/if}
          {#if cobrando === p.id}
            <div class="metodos">
              {#each ['efectivo', 'datafono', 'nequi'] as const as m (m)}<button class="c-btn verde chico" onclick={() => cobrar(p, m)}>{METODOS[m]}</button>{/each}
              <button class="c-btn suave chico" aria-label="Cerrar" onclick={() => (cobrando = null)}>×</button>
            </div>
          {:else if cancelando === p.id}
            <div class="metodos">
              <span class="preg">¿Cancelar el pedido?</span>
              <button class="c-btn suave chico" onclick={() => (cancelando = null)}>No</button>
              <button class="c-btn peligro chico" onclick={() => { void cancelarPedido(p.id); cancelando = null; }}>Sí</button>
            </div>
          {:else}
            <div class="pie">
              <b class="total">{pesos(p.total).replace('$ ', '$')}</b>
              {#if p.estado === 'pagado'}
                <small class="ok">✓ {p.metodo === 'saldo' ? 'Saldo' : p.metodo ? METODOS[p.metodo] : 'Pagado'}</small>
              {:else if BOTON[p.estado]}
                <button class="mover" onclick={() => mover(p)}>{BOTON[p.estado]}</button>
              {:else if p.pagado_en}
                <small class="ok">✓ Pagado con saldo</small>
              {:else}
                <button class="mover" onclick={() => (cobrando = p.id)}>Pagado →</button>
              {/if}
              {#if p.estado !== 'pagado'}<button class="x" aria-label="Cancelar pedido" onclick={() => (cancelando = p.id)}>×</button>{/if}
            </div>
            {#if p.estado !== 'pagado' && p.pagado_en}<small class="ok chico">✓ Ya pagado con saldo</small>{/if}
          {/if}
        </article>
      {:else}
        <p class="c-vacio">Nada por aquí</p>
      {/each}
    </section>
  {/each}
</div>

<style>
  .resumen { display: flex; align-items: flex-end; gap: 18px; }
  .resumen span { display: flex; flex-direction: column; gap: 4px; }
  .resumen b { font-size: 30px; }
  .resumen b.acc { color: var(--q-acct); }
  .tablero { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; align-items: start; }
  .col { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 16px; background: #fff; border: 1px solid rgba(14, 27, 51, 0.08); min-height: 560px; }
  .col > header { display: flex; align-items: center; gap: 8px; padding: 4px 4px 6px; }
  .col > header i { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 10px var(--c); }
  h2 { margin: 0; font-family: var(--q-font-titulo); font-style: italic; font-weight: 800; font-size: 20px; text-transform: uppercase; }
  .col > header small { margin-left: auto; font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .pedido { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: #fff; border: 1px solid rgba(14, 27, 51, 0.08); animation: c-sube 0.3s both; }
  .pedido.nuevo { border: 1.5px solid var(--q-acc); }
  .pedido.brilla { animation: c-brilla 1.4s ease-in-out 3; }
  .fila { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
  .donde { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 24px; line-height: 1; text-transform: uppercase; }
  .fila small { font-size: 12px; font-weight: 700; color: var(--q-tx2); }
  .cliente { font-size: 12.5px; color: var(--q-tx2); }
  .items { font-size: 13.5px; line-height: 1.35; }
  .nota { font-size: 12.5px; color: var(--q-tx2); font-style: italic; }
  .pie { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
  .total { flex: 1; font-size: 15px; font-weight: 900; }
  .mover { height: 32px; padding: 0 12px; white-space: nowrap; border: 0; border-radius: 8px; background: var(--q-sub); font-size: 12.5px; font-weight: 900; }
  .mover:hover { background: var(--q-accs); color: var(--q-acct); }
  .x { width: 28px; height: 32px; border: 0; border-radius: 8px; background: none; color: var(--q-tx3); font-size: 16px; }
  .ok { font-size: 12.5px; font-weight: 800; color: var(--c-verde); }
  .ok.chico { font-size: 11.5px; }
  .metodos { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
  .preg { font-size: 12.5px; font-weight: 700; flex: 1; }
</style>
