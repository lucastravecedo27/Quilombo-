<script lang="ts">
  // Pedir a la cancha: la carta del club del partido (bebidas, comida, tienda), cantidades y nota. El pedido le
  // llega al mesero y al panel del club al instante; aquí se ve cómo va y se paga en la app.
  // En modo tarjeta (crucero) se elige dónde llevarlo y el pedido se paga de una con mi saldo Quilombo (queda en lo
  // consumido hoy en ese club). Si no alcanza, se recarga. También se puede pagar entre varios (cada uno su parte).
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { franjaCompleta, partido } from '../../app/jugar';
  import { nombreDe, yo } from '../../app/vinculos';
  import { pesos } from '../../domain/jugar';
  import { abrirCuenta, canchasDe, cargarACuenta, crearPedido, elClub, productos, saldoQuilombo } from '$lib/club/app/club';
  import { CATEGORIAS_PRODUCTO, totalItems, unidades, type CategoriaProducto, type ItemPedido } from '$lib/club/domain/club';

  let abierto = $state(false);
  let pid = $state<string | null>(null);
  /** Club de mi tarjeta (modo crucero) */
  let tclub = $state<string | null>(null);
  let ubicacion = $state('Barra');
  let cat = $state<CategoriaProducto>('bebidas');
  let cant = $state<Record<string, number>>({});
  let nota = $state('');
  let enviando = $state(false);
  let error = $state('');
  /** Pagar entre varios (en vez de todo con mi saldo) */
  let entreVarios = $state(false);

  $effect(() => {
    const r = ui.pedir;
    if (!r) return;
    pid = 'partido' in r ? r.partido : null; tclub = 'tarjeta' in r ? r.tarjeta : null;
    cant = {}; nota = ''; error = ''; cat = 'bebidas'; ubicacion = 'Barra'; entreVarios = 'tarjeta' in r && !!r.dividir; abierto = true;
  });
  const f = $derived(franjaCompleta(pid ? partido(pid)?.franja_id : null));
  const clubId = $derived(tclub ?? f?.club.id ?? null);
  const lugares = $derived(tclub ? [...canchasDe(tclub).map((c) => ({ nombre: c.nombre, cancha: c.id as string | null })), { nombre: 'Barra', cancha: null }, { nombre: 'Terraza', cancha: null }] : []);
  const carta = $derived(clubId ? productos(clubId).filter((p) => p.activo) : []);
  const items = $derived<ItemPedido[]>(carta.filter((p) => cant[p.id]).map((p) => ({ producto_id: p.id, nombre: p.nombre, emoji: p.emoji, precio: p.precio, cantidad: cant[p.id] })));
  const total = $derived(totalItems(items));
  const n = $derived(unidades(items));
  const mover = (id: string, d: number) => { toque(4); cant = { ...cant, [id]: Math.max(0, (cant[id] ?? 0) + d) }; };

  async function pedir() {
    if (tclub) return pedirACuenta();
    if (!f || !n || enviando) return;
    enviando = true; error = '';
    const r = await crearPedido({ origen: 'app', user_id: yo(), cliente: nombreDe(yo()), ubicacion: f.cancha.nombre, cancha_id: f.cancha.id, franja_id: f.id, club: f.club.id, items: $state.snapshot(items), nota: nota.trim() || null });
    enviando = false;
    if (r.error) { error = r.error; return; }
    toque(18);
    abierto = false;
    ui.avisar({ titulo: '¡Pedido enviado! 🍹', sub: `El mesero lo lleva a la ${f.cancha.nombre}`, icono: 'check' });
  }
  async function pedirACuenta() {
    if (!tclub || !n || enviando) return;
    enviando = true; error = '';
    const l = lugares.find((x) => x.nombre === ubicacion);
    // La cuenta se abre sola con el primer pedido (si ya hay una abierta, es esa)
    const c = await abrirCuenta(yo(), nombreDe(yo()), null, tclub);
    const lugar = ubicacion.startsWith('Cancha') ? ubicacion : ubicacion.toLowerCase();
    if (entreVarios) {
      // El pedido sale ya; cada uno paga su parte con su saldo
      const r = await crearPedido({ origen: 'app', user_id: yo(), cliente: nombreDe(yo()), ubicacion, cancha_id: l?.cancha ?? null, club: tclub, cuenta_id: c.id, items: $state.snapshot(items), nota: nota.trim() || null });
      enviando = false;
      if (r.error || !r.id) { error = r.error ?? 'No se pudo'; return; }
      const pid = r.id, club = tclub, monto = total;
      abierto = false;
      setTimeout(() => (ui.dividir = { tipo: 'pedido', ref: pid, total: monto, concepto: `Pedido en ${elClub(club)?.nombre ?? 'el club'}`, club, gente: [] }), 400);
      return;
    }
    const r = await cargarACuenta(c.id, { origen: 'app', user_id: yo(), ubicacion, cancha_id: l?.cancha ?? null, items: $state.snapshot(items), nota: nota.trim() || null });
    enviando = false;
    if (r.error) { error = r.error; return; }
    toque(18);
    abierto = false;
    ui.avisar({ titulo: 'Pagado con tu saldo 🛳️', sub: `${pesos(total)} · te lo llevan a la ${lugar} · te quedan ${pesos(saldoQuilombo(yo()))}`, icono: 'check' });
  }
</script>

<Hoja bind:abierto titulo={tclub ? 'Pedir con mi tarjeta' : 'Pedir a la cancha'} sub={tclub ? `${elClub(tclub)?.nombre ?? 'Club'} · se paga con tu saldo (${pesos(saldoQuilombo(yo()))})` : f ? `${f.club.nombre} · te lo llevan a la ${f.cancha.nombre}` : ''} alCerrar={() => (ui.pedir = null)}>
  {#if tclub}
    <p class="lbl">¿Dónde te lo llevan?</p>
    <div class="cats lugares" role="radiogroup" aria-label="Dónde te lo llevan">
      {#each lugares as l (l.nombre)}
        <button role="radio" aria-checked={ubicacion === l.nombre} class:on={ubicacion === l.nombre} onclick={() => { toque(4); ubicacion = l.nombre; }}>{l.nombre}</button>
      {/each}
    </div>
  {/if}
  {#if !carta.length}
    <p class="nota">Este club todavía no tiene carta en Quilombo.</p>
  {:else}
    <div class="cats" role="tablist" aria-label="Categoría">
      {#each CATEGORIAS_PRODUCTO as c (c.id)}
        <button role="tab" aria-selected={cat === c.id} class:on={cat === c.id} onclick={() => { toque(4); cat = c.id; }}>{c.emoji} {c.nombre}</button>
      {/each}
    </div>
    <div class="carta">
      {#each carta.filter((p) => p.categoria === cat) as p (p.id)}
        <div class="prod" class:con={cant[p.id]}>
          <span class="emoji" aria-hidden="true">{p.emoji}</span>
          <span class="txt"><b>{p.nombre}</b><small>{pesos(p.precio)}</small></span>
          <span class="paso">
            <button aria-label="Quitar {p.nombre}" disabled={!cant[p.id]} onclick={() => mover(p.id, -1)}>−</button>
            <output aria-label="Cantidad de {p.nombre}">{cant[p.id] ?? 0}</output>
            <button class="mas" aria-label="Agregar {p.nombre}" onclick={() => mover(p.id, 1)}>+</button>
          </span>
        </div>
      {/each}
    </div>
    <input class="q-input nota-in" maxlength="80" placeholder="Nota: bien fría, sin hielo…" bind:value={nota} aria-label="Nota del pedido" />
    {#if tclub}
      <label class="varios"><input type="checkbox" bind:checked={entreVarios} /> ➗ Pagar entre varios (cada uno su parte con su saldo)</label>
    {/if}
    {#if error}
      <p class="err">{error}{#if error.includes('Saldo')} <button class="recargar" onclick={() => (ui.recargar = { sugerido: Math.max(0, total - saldoQuilombo(yo())) })}>Recargar</button>{/if}</p>
    {/if}
  {/if}
  {#snippet pie()}
    <button class="q-btn bloque" disabled={!n || enviando} onclick={pedir}>{n ? `${tclub ? (entreVarios ? 'Pedir y dividir' : 'Pagar con saldo') : 'Pedir'} ${n} · ${pesos(total)}` : 'Elige lo que quieres'}</button>
  {/snippet}
</Hoja>

<style>
  .cats { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-bottom: 10px; }
  .cats button { flex-shrink: 0; height: 36px; padding: 0 13px; border: 1.5px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); font-weight: 900; font-size: 14px; }
  .cats button.on { border-color: #0e1b33; background: #0e1b33; color: #fff; }
  :global(html.dark) .cats button.on { border-color: var(--q-acc); background: var(--q-acc); }
  .carta { display: flex; flex-direction: column; border-radius: 16px; border: 1px solid var(--q-line); overflow: hidden; }
  .prod { display: flex; align-items: center; gap: 12px; padding: 10px 12px; }
  .prod + .prod { border-top: 1px solid var(--q-line); }
  .emoji { width: 40px; height: 40px; border-radius: 10px; background: var(--q-sub); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .txt b { font-size: 15px; }
  .txt small { font-size: 13px; color: var(--q-tx2); }
  .paso { display: flex; align-items: center; gap: 6px; }
  .paso button { width: 34px; height: 34px; border-radius: 17px; border: 0; background: var(--q-sub); color: var(--q-tx); font-size: 18px; font-weight: 900; padding: 0; display: flex; align-items: center; justify-content: center; }
  .paso button:disabled { opacity: 0.35; }
  .paso .mas { background: var(--q-acc); color: var(--q-acctx); }
  .paso output { width: 20px; text-align: center; font-weight: 800; font-size: 16px; }
  .nota-in { margin-top: 12px; }
  .lbl { margin: 2px 0 8px; font-size: 11.5px; font-weight: 800; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.1em; }
  .lugares { margin-bottom: 14px; }
  .nota { font-size: 14px; color: var(--q-tx2); }
  .err { color: var(--q-alr); font-size: 13.5px; }
  .recargar { border: 0; background: none; padding: 0; color: var(--q-link); font-weight: 800; text-decoration: underline; }
  .varios { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 14px; font-weight: 700; }
</style>
