<script lang="ts">
  // Carta del bar: lo que ven los meseros y los jugadores en la app. La oficina crea productos nuevos, los edita,
  // duplica o archiva, y apaga lo que se acabó. Todo cambia al instante en los celulares.
  import { alternarProducto, guardarProducto, pedidos, productos } from '$lib/club/app/club';
  import { CATEGORIAS_PRODUCTO, type CategoriaProducto, type Producto } from '$lib/club/domain/club';
  import { pesos } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';

  const lista = $derived(productos());
  // Cuántos se han vendido (unidades en pedidos no cancelados)
  const vendidos = $derived.by(() => {
    const m = new Map<string, number>();
    for (const p of pedidos()) if (p.estado !== 'cancelado') for (const i of p.items) m.set(i.producto_id, (m.get(i.producto_id) ?? 0) + i.cantidad);
    return m;
  });
  const disponibles = $derived(lista.filter((p) => p.activo).length);

  let archivando = $state<string | null>(null);
  type ConExtra = Partial<Producto> & { nombre: string; precio: number; categoria: CategoriaProducto };
  async function duplicar(p: Producto) {
    const { id: _id, orden: _o, ...resto } = p;
    await guardarProducto({ ...resto, nombre: `${p.nombre} (copia)` } as ConExtra);
  }
  async function archivar(p: Producto) {
    await guardarProducto({ ...p, deleted_at: new Date().toISOString() } as ConExtra);
    archivando = null;
  }
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">Lo que ven el mesero y la app · {lista.length} productos · {disponibles} disponibles</span>
    <h1 class="c-titulo c-h1">Carta</h1>
  </div>
  <button class="c-btn grande" onclick={() => (panel.producto = {})}>＋ Nuevo producto</button>
</header>

{#each CATEGORIAS_PRODUCTO as cat (cat.id)}
  {@const items = lista.filter((p) => p.categoria === cat.id)}
  <section class="cat">
    <header><h2 class="c-sec">{cat.nombre}</h2><button class="agregar" onclick={() => (panel.producto = { categoria: cat.id })}>＋ Agregar a {cat.nombre.toLowerCase()}</button></header>
    <div class="grilla">
      {#each items as p (p.id)}
        <article class="prod" class:apagado={!p.activo}>
          <button class="cuerpo" title="Editar {p.nombre}" onclick={() => (panel.producto = { id: p.id })}>
            <span class="em">{p.emoji}</span>
            <span class="tx"><b>{p.nombre}</b><small>{pesos(p.precio).replace('$ ', '$')}{vendidos.get(p.id) ? ` · ${vendidos.get(p.id)} vendidos` : ''}</small></span>
          </button>
          <button class="c-switch" class:on={p.activo} role="switch" aria-checked={p.activo} aria-label="{p.nombre} disponible" onclick={() => alternarProducto(p.id)}></button>
          {#if archivando === p.id}
            <div class="confirma">
              <span>¿Quitar de la carta?</span>
              <button class="c-btn chico rojo" onclick={() => archivar(p)}>Sí</button>
              <button class="c-btn suave chico" onclick={() => (archivando = null)}>No</button>
            </div>
          {:else}
            <div class="mas">
              <button title="Duplicar" aria-label="Duplicar {p.nombre}" onclick={() => duplicar(p)}>⧉</button>
              <button title="Archivar" aria-label="Archivar {p.nombre}" onclick={() => (archivando = p.id)}>🗑</button>
            </div>
          {/if}
        </article>
      {:else}
        <p class="c-vacio">Nada en esta categoría todavía.</p>
      {/each}
    </div>
  </section>
{/each}

<style>
  .grande { height: 46px; font-size: 15px; }
  .cat { margin-bottom: 18px; }
  .cat > header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
  .agregar { border: 0; background: none; color: var(--q-acct); font-weight: 800; font-size: 13px; }
  .grilla { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .prod { position: relative; display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 16px; background: #fff; border: var(--c-borde); }
  .prod.apagado { opacity: 0.5; background: rgba(255, 255, 255, 0.6); }
  .cuerpo { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; border: 0; background: none; padding: 0; text-align: left; }
  .em { width: 46px; height: 46px; flex: none; border-radius: 12px; background: var(--q-sub); display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .tx { min-width: 0; display: flex; flex-direction: column; }
  .tx b { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tx small { font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .mas { position: absolute; right: 8px; top: -12px; display: none; gap: 4px; }
  .prod:hover .mas { display: flex; }
  .mas button { width: 28px; height: 28px; border-radius: 8px; border: var(--c-borde); background: #fff; font-size: 13px; box-shadow: 0 4px 10px rgba(14, 27, 51, 0.12); }
  .confirma { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 16px; background: rgba(255, 255, 255, 0.96); font-size: 13px; font-weight: 800; }
  .rojo { background: var(--c-error); color: #fff; }
</style>
