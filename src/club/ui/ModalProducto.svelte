<script lang="ts">
  // Crear o editar un producto de la carta. Al guardar aparece al instante en el celular de los meseros y en la app
  // de los jugadores (la carta se sincroniza en vivo).
  import { untrack } from 'svelte';
  import { guardarProducto, productos } from '$lib/club/app/club';
  import { CATEGORIAS_PRODUCTO, type CategoriaProducto, type Producto } from '$lib/club/domain/club';
  import { pesos } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';

  const EMOJIS: Record<CategoriaProducto, string[]> = {
    bebidas: ['💧', '⚡', '🍺', '🍹', '🥥', '☕', '🧃', '🥤', '🍷', '🥂', '🧉', '🍋'],
    comida: ['🥟', '🫓', '🥪', '🍖', '🍔', '🌭', '🍕', '🍟', '🥗', '🍫', '🍦', '🌮'],
    tienda: ['🎾', '🏓', '🩹', '🧺', '🧢', '👕', '🧦', '🎒', '🕶️', '🧴']
  };
  const TODOS = [...new Set(Object.values(EMOJIS).flat())];

  const original = $derived(panel.producto?.id ? productos().find((p) => p.id === panel.producto!.id) ?? null : null);
  let nombre = $state('');
  let categoria = $state<CategoriaProducto>('bebidas');
  let precio = $state('');
  let emoji = $state('');
  let activo = $state(true);
  let descripcion = $state('');
  let guardando = $state(false);

  // Llena el formulario una vez al abrir (no se pisa si cambian los datos mientras se edita)
  $effect(() => {
    const o = panel.producto;
    if (!o) return;
    untrack(() => {
      const p = original as (Producto & { descripcion?: string | null }) | null;
      nombre = p?.nombre ?? '';
      categoria = p?.categoria ?? o.categoria ?? 'bebidas';
      precio = p ? String(p.precio) : '';
      emoji = p?.emoji ?? '';
      activo = p?.activo ?? true;
      descripcion = p?.descripcion ?? '';
    });
  });

  const precioN = $derived(Math.round(Number(precio.replace(/\D/g, '')) || 0));
  const valido = $derived(nombre.trim().length > 1 && precioN >= 500);
  const sugeridos = $derived([...EMOJIS[categoria], ...TODOS.filter((e) => !EMOJIS[categoria].includes(e))]);

  const cerrar = () => (panel.producto = null);
  async function guardar() {
    if (!valido || guardando) return;
    guardando = true;
    const datos = { ...(original ?? {}), categoria, nombre: nombre.trim(), precio: precioN, emoji: emoji || EMOJIS[categoria][0], activo, descripcion: descripcion.trim() || null };
    await guardarProducto(datos as Partial<Producto> & { nombre: string; precio: number; categoria: CategoriaProducto });
    guardando = false;
    panel.avisar({
      tipo: 'pedido',
      titulo: original ? `Producto actualizado · ${datos.emoji} ${datos.nombre}` : `Producto nuevo en la carta · ${datos.emoji} ${datos.nombre}`,
      sub: `${pesos(precioN)} · ya lo ven meseros y jugadores`,
      app: false,
      destino: 'carta'
    });
    cerrar();
  }
  const teclas = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
</script>

<svelte:window onkeydown={teclas} />
{#if panel.producto}
  <div class="c-modal-fondo" role="presentation" onclick={cerrar}></div>
  <div class="c-modal modal" role="dialog" aria-modal="true" aria-labelledby="titulo-producto">
    <header>
      <div>
        <span class="c-sobre">Carta del bar</span>
        <h2 id="titulo-producto" class="c-titulo">{original ? 'Editar producto' : 'Nuevo producto'}</h2>
      </div>
      <button class="x" aria-label="Cerrar" onclick={cerrar}>×</button>
    </header>

    <div class="cuerpo">
      <div class="form">
        <label class="c-campo">Nombre<input class="c-input" bind:value={nombre} placeholder="Ej: Jugo de mango" maxlength="40" aria-label="Nombre del producto" /></label>
        <div class="c-campo">
          Categoría
          <div class="c-chips">
            {#each CATEGORIAS_PRODUCTO as c (c.id)}
              <button type="button" class="c-chip" class:on={categoria === c.id} aria-pressed={categoria === c.id} onclick={() => (categoria = c.id)}>{c.emoji} {c.nombre}</button>
            {/each}
          </div>
        </div>
        <label class="c-campo">Precio<input class="c-input precio" inputmode="numeric" bind:value={precio} placeholder="8000" aria-label="Precio en pesos" /></label>
        <div class="c-campo">
          Ícono
          <div class="emojis" role="radiogroup" aria-label="Ícono">
            {#each sugeridos as e (e)}
              <button type="button" role="radio" aria-checked={emoji === e} class:on={emoji === e} onclick={() => (emoji = e)}>{e}</button>
            {/each}
          </div>
        </div>
        <label class="c-campo">Descripción (opcional)<input class="c-input" bind:value={descripcion} placeholder="Ej: natural, sin azúcar" maxlength="80" /></label>
        <label class="disp">
          <button type="button" class="interruptor" class:on={activo} role="switch" aria-checked={activo} aria-label="Disponible" onclick={() => (activo = !activo)}><i></i></button>
          {activo ? 'Disponible para pedir' : 'Agotado (no se puede pedir)'}
        </label>
      </div>

      <div class="vista">
        <span class="c-sobre">Así se ve en la app</span>
        <div class="tarjeta-app">
          <span class="em">{emoji || EMOJIS[categoria][0]}</span>
          <span class="tx"><b>{nombre.trim() || 'Nombre del producto'}</b>{#if descripcion.trim()}<small>{descripcion.trim()}</small>{/if}<em>{precioN ? pesos(precioN) : '$ —'}</em></span>
          <span class="mas" aria-hidden="true">＋</span>
        </div>
        <p class="nota">Aparece al instante en el celular de los meseros y en "Pedir a la cancha" de los jugadores.</p>
      </div>
    </div>

    <footer>
      <button class="c-btn sec" onclick={cerrar}>Cancelar</button>
      <button class="c-btn" disabled={!valido || guardando} onclick={guardar}>{original ? 'Guardar cambios' : '＋ Agregar a la carta'}</button>
    </footer>
  </div>
{/if}

<style>
  .modal { width: 760px; }
  header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
  h2 { font-size: 32px; margin-top: 2px; }
  .x { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--q-borde); background: var(--q-sub); font-size: 20px; }
  .cuerpo { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 22px; }
  .form { display: flex; flex-direction: column; gap: 14px; }
  .precio { width: 180px; font-size: 18px; font-weight: 700; }
  .emojis { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
  .emojis button { height: 38px; border-radius: 8px; border: 1px solid var(--q-line); background: #fff; font-size: 20px; padding: 0; }
  .emojis button:hover { border-color: var(--q-borde); }
  .emojis button.on { border-color: var(--q-acc); background: var(--q-accs); box-shadow: 0 0 0 2px var(--q-accs); }
  .disp { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: var(--q-tx2); }
  .interruptor { width: 38px; height: 22px; border-radius: 11px; border: 0; background: var(--q-sub); position: relative; transition: background 0.15s; flex-shrink: 0; }
  .interruptor i { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); transition: transform 0.15s; }
  .interruptor.on { background: var(--c-verde); }
  .interruptor.on i { transform: translateX(16px); }
  .vista { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 14px; background: var(--q-bg); border: 1px solid var(--q-line); align-self: start; }
  .tarjeta-app { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: #fff; color: #0e1b33; border: 1px solid var(--q-line); }
  .tarjeta-app .em { font-size: 30px; }
  .tarjeta-app .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .tarjeta-app b { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tarjeta-app small { font-size: 12px; color: #5b6478; }
  .tarjeta-app em { font-style: normal; font-weight: 800; font-size: 14px; color: var(--q-acct); }
  .mas { width: 32px; height: 32px; border-radius: 8px; background: var(--q-acc); color: var(--q-acctx); display: flex; align-items: center; justify-content: center; font-weight: 800; }
  .nota { margin: 0; font-size: 12.5px; color: var(--q-tx2); line-height: 1.4; }
  footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
