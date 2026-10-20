<script lang="ts">
  // Un pedido: dónde (grande), número · cliente · hace cuánto, de dónde vino (📱 App / 🛳️ Tarjeta / 🧾 Mesero), qué
  // lleva, el total, si ya está pagado y el botón del siguiente paso.
  import { pesos } from '$lib/social/domain/jugar';
  import { METODOS, hace, type Pedido } from '$lib/club/domain/club';
  import { datos } from '$lib/data/datos.svelte';
  import { m } from './estado.svelte';

  let { p, accion, tono = 'acc', onAccion }: { p: Pedido; accion?: string; tono?: 'acc' | 'noche' | 'rojo' | 'ok'; onAccion?: () => void } = $props();
  const cerrado = $derived(p.estado === 'pagado' || p.estado === 'cancelado');
  const pagado = $derived(p.estado === 'pagado' || !!p.pagado_en);
  const cuenta = $derived(p.cuenta_id ? (datos.cuentas as { id: string; codigo: string; user_id: string | null }[]).find((c) => c.id === p.cuenta_id) ?? null : null);
  const origen = $derived(p.origen === 'app' ? { t: '📱 App', k: 'app' } : cuenta?.user_id || p.metodo === 'saldo' ? { t: '🛳️ Tarjeta', k: 'tarjeta' } : { t: '🧾 Mesero', k: 'mesero' });
  const pago = $derived(
    p.estado === 'cancelado' ? 'Cancelado'
    : pagado ? (p.metodo === 'saldo' ? 'Pagado con saldo ✓' : p.metodo === 'app' ? 'Pagado en la app ✓' : `Pagado ✓ · ${METODOS[p.metodo ?? 'efectivo']}`)
    : cuenta ? `En la cuenta ${cuenta.codigo}` : 'Por cobrar'
  );
</script>

<article class="pedido" class:nuevo={p.estado === 'nuevo'} class:cerrado>
  <div class="cab">
    <span class="donde">
      <b class="m-titulo">{p.ubicacion}</b>
      <small>#{p.numero} · {p.cliente} · {hace(p.created_at, m.ahora)}</small>
    </span>
    {#if cuenta}
      <button class="origen {origen.k}" onclick={() => (m.verCuenta = cuenta.id)} aria-label="Ver la tarjeta {cuenta.codigo}">{origen.t}</button>
    {:else}
      <span class="origen {origen.k}">{origen.t}</span>
    {/if}
  </div>
  <div class="items">
    {#each p.items as i (i.producto_id)}
      <div><span class="emo" aria-hidden="true">{i.emoji}</span><b class="m-num">{i.cantidad}×</b><span class="n">{i.nombre}</span></div>
    {/each}
    {#if p.nota}<p class="nota">“{p.nota}”</p>{/if}
  </div>
  <div class="pie">
    <span class="total"><b class="m-num">{pesos(p.total)}</b><small class:ok={pagado} class:rojo={!pagado && !cuenta && !cerrado}>{pago}</small></span>
    {#if accion && onAccion}
      <button class="accion {tono}" onclick={onAccion}>{accion}</button>
    {:else if p.mesero && cerrado}
      <span class="quien">{p.mesero}</span>
    {/if}
  </div>
</article>

<style>
  .pedido { border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; animation: m-sube 0.4s both; }
  .pedido.nuevo { border: 2px solid var(--q-acc); }
  .pedido.cerrado { opacity: 0.7; animation: none; }
  .cab { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px 14px 10px; }
  .donde { display: flex; flex-direction: column; min-width: 0; }
  .donde b { font-size: 40px; line-height: 0.9; }
  .donde small { margin-top: 4px; font-size: 14px; font-weight: 700; color: var(--q-tx2); }
  .origen { flex: none; padding: 5px 9px; border: 0; border-radius: 9px; font-size: 12.5px; font-weight: 900; white-space: nowrap; }
  .origen.app { background: rgba(30, 127, 208, 0.14); color: #1a6fb8; }
  .origen.tarjeta { background: var(--q-noche); color: #fff; }
  .origen.mesero { background: var(--q-sub); color: var(--q-tx2); }
  :global(html.dark) .origen.app { color: #6fb6f0; }
  :global(html.dark) .origen.tarjeta { background: #1b2847; }
  .items { display: flex; flex-direction: column; gap: 4px; padding: 0 14px 12px; }
  .items div { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; }
  .emo { width: 28px; font-size: 22px; text-align: center; }
  .items b { width: 30px; font-size: 24px; }
  .items .n { flex: 1; min-width: 0; }
  .nota { margin: 6px 0 0; padding: 8px 10px; border-radius: 10px; background: var(--q-wrnbg); color: var(--q-tx); font-size: 15px; font-weight: 600; }
  .pie { display: flex; align-items: center; gap: 10px; padding: 10px 12px 12px 14px; border-top: 1px dashed var(--q-line); }
  .total { flex: 1; display: flex; flex-direction: column; }
  .total b { font-size: 28px; }
  .total small { font-size: 12.5px; font-weight: 800; color: var(--q-tx2); }
  .total small.ok { color: var(--q-ok); }
  .total small.rojo { color: #d42a3a; }
  .accion { height: 54px; padding: 0 20px; border: 0; border-radius: 12px; color: #fff; font-size: 17px; font-weight: 900; }
  .accion.acc { background: var(--q-acc); color: var(--q-acctx); }
  .accion.noche { background: var(--q-noche); }
  .accion.rojo { background: #e8475b; }
  .accion.ok { background: var(--q-ok); }
  :global(html.dark) .accion.noche { background: #1b2847; }
  .accion:active { transform: scale(0.97); }
  .quien { font-size: 14px; font-weight: 700; color: var(--q-tx2); }
  @media (prefers-reduced-motion: reduce) { .pedido { animation: none; } }
</style>
