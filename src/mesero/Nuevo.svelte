<script lang="ts">
  // Nuevo pedido: dónde (Cancha 1–4, Barra, Terraza), a nombre de quién (si es una cancha en juego, ya viene el
  // titular), la carta por categoría con − / +, una nota y "Enviar pedido" fijo abajo. Con la tarjeta Quilombo de un
  // jugador escaneada, el pedido se paga de una con su saldo; si no le alcanza, se avisa y se cobra de otra forma.
  // ➗ divide el pedido entre varias tarjetas en el acto.
  import { canchasDe, cargarACuenta, crearPedido, franjasDe, productos, saldoCuenta, saldoQuilombo, titularDe } from '$lib/club/app/club';
  import { datos } from '$lib/data/datos.svelte';
  import { db } from '$lib/data/db';
  import { CATEGORIAS_PRODUCTO, enJuego, totalItems, unidades, type CategoriaProducto, type Cuenta, type ItemPedido, type Pedido } from '$lib/club/domain/club';
  import { pesos } from '$lib/social/domain/jugar';
  import { tick } from 'svelte';
  import { m } from './estado.svelte';
  import HojaDividir from './HojaDividir.svelte';
  import HojaCobrar from './HojaCobrar.svelte';

  let { onEnviado }: { onEnviado: () => void } = $props();

  const canchas = $derived(canchasDe());
  const lugares = $derived([...canchas.map((c) => c.nombre), 'Barra', 'Terraza']);
  let ubicacion = $state(m.ubicacion ?? '');
  let cliente = $state('');
  let nota = $state('');
  let cat = $state<CategoriaProducto>('bebidas');
  let cant = $state<Record<string, number>>({});
  let enviando = $state(false);
  /** Saldo insuficiente al cobrar con la tarjeta: lo que tenía */
  let sinSaldo = $state<number | null>(null);
  let dividiendo = $state(false);
  let cobrando = $state<Pedido | null>(null);

  const cuenta = $derived(m.cuenta ? (datos.cuentas as Cuenta[]).find((c) => c.id === m.cuenta && c.estado === 'abierta') ?? null : null);
  const saldo = $derived(cuenta?.user_id ? saldoQuilombo(cuenta.user_id) : null);
  // A nombre del dueño de la tarjeta
  $effect.pre(() => { if (cuenta) cliente = cuenta.nombre; });

  const canchaElegida = $derived(canchas.find((c) => c.nombre === ubicacion) ?? null);
  const franja = $derived(canchaElegida ? enJuego(franjasDe(), canchaElegida.id, m.ahora) : null);
  function elegirLugar(u: string) {
    ubicacion = u;
    const c = canchas.find((x) => x.nombre === u);
    const f = c ? enJuego(franjasDe(), c.id, Date.now()) : null;
    if (!cuenta) cliente = f ? titularDe(f) : '';
  }
  // Si llegó desde Canchas, ya viene con el titular
  $effect.pre(() => { if (m.ubicacion && !cliente) elegirLugar(m.ubicacion); });

  const carta = $derived(productos().filter((p) => p.activo));
  const visibles = $derived(carta.filter((p) => p.categoria === cat));
  const items = $derived<ItemPedido[]>(carta.filter((p) => (cant[p.id] ?? 0) > 0).map((p) => ({ producto_id: p.id, nombre: p.nombre, emoji: p.emoji, precio: p.precio, cantidad: cant[p.id] })));
  const total = $derived(totalItems(items));
  const n = $derived(unidades(items));
  const porCat = (c: CategoriaProducto) => carta.filter((p) => p.categoria === c).reduce((s, p) => s + (cant[p.id] ?? 0), 0);
  const cambiar = (id: string, d: number) => { cant = { ...cant, [id]: Math.max(0, (cant[id] ?? 0) + d) }; };
  const listo = $derived(!!ubicacion && n > 0 && !enviando);

  const base = () => ({ origen: 'mesero' as const, mesero: m.yo, items, ubicacion, cancha_id: canchaElegida?.id ?? null, franja_id: franja?.id ?? null, nota: nota.trim() || null });
  const nuevoSuelto = (aNombreDe?: string) => crearPedido({ ...base(), cliente: aNombreDe || (cuenta?.nombre ?? cliente.trim()) || ubicacion });
  function limpiar() {
    cant = {}; nota = ''; m.ubicacion = null; m.cuenta = null; sinSaldo = null;
    onEnviado();
  }
  async function enviar() {
    if (!listo) return;
    enviando = true;
    sinSaldo = null;
    if (cuenta) {
      const antes = saldo ?? 0;
      const cobrado = total;
      const r = await cargarACuenta(cuenta.id, base());
      enviando = false;
      if (r.error) {
        if (/saldo insuficiente/i.test(r.error) && cuenta.user_id) {
          sinSaldo = saldoQuilombo(cuenta.user_id);
          await tick();
          document.querySelector('.sinsaldo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        m.avisar(r.error, true);
        return;
      }
      m.avisar(cuenta.user_id ? `Pagado con saldo ✓ · le quedan ${pesos(antes - cobrado)}` : `Cargado a ${cuenta.codigo} · ${pesos(cobrado)}`);
      limpiar();
      return;
    }
    const r = await nuevoSuelto();
    enviando = false;
    if (r.error) { m.avisar(r.error, true); return; }
    m.avisar(`Pedido enviado · ${ubicacion} · ${pesos(total)}`);
    limpiar();
  }
  /** Sin saldo: se crea el pedido normal y se cobra en efectivo, datáfono o Nequi */
  async function cobrarAparte() {
    enviando = true;
    const r = await nuevoSuelto();
    enviando = false;
    if (r.error || !r.id) { m.avisar(r.error ?? 'No se pudo', true); return; }
    cobrando = ((await db.club_pedidos.get(r.id)) as Pedido | undefined) ?? null;
  }
</script>

<div class="nuevo">
  <h2 class="m-titulo">Nuevo pedido</h2>

  {#if cuenta}
    <div class="tarjeta">
      <span class="aro" aria-hidden="true"></span>
      <span class="txt"><small>🛳️ Tarjeta {cuenta.codigo}</small><b>{cuenta.nombre}</b><small>{saldo !== null ? `Saldo ${pesos(saldo)} · hoy lleva ${pesos(saldoCuenta(cuenta.id))}` : `Lleva ${pesos(saldoCuenta(cuenta.id))}`}</small></span>
      <button onclick={() => { m.cuenta = null; cliente = ''; sinSaldo = null; }} aria-label="Quitar la tarjeta">✕</button>
    </div>
    {#if sinSaldo !== null}
      <div class="sinsaldo" role="alert">
        <b>Saldo insuficiente · que recargue</b>
        <span>Tiene {pesos(sinSaldo)} y el pedido es de {pesos(total)}. También puede pagar de otra forma:</span>
        <div class="alt">
          <button onclick={() => { sinSaldo = null; dividiendo = true; }}>➗ Dividir</button>
          <button onclick={cobrarAparte} disabled={enviando}>💵 Otro método</button>
        </div>
      </div>
    {/if}
  {:else}
    <button class="acuenta" onclick={() => (m.escaneando = true)}>🛳️ Cobrar con la tarjeta de un jugador · <b>Escanear</b></button>
  {/if}

  <div class="m-over lbl">¿Dónde?</div>
  <div class="lugares" role="radiogroup" aria-label="Ubicación">
    {#each lugares as u (u)}
      <button role="radio" aria-checked={ubicacion === u} class="m-titulo" class:on={ubicacion === u} onclick={() => elegirLugar(u)}>{u}</button>
    {/each}
  </div>

  <div class="m-over lbl">A nombre de</div>
  <input class="campo" bind:value={cliente} placeholder="Ej. Mateo, mesa de la esquina" autocomplete="off" readonly={!!cuenta} aria-label="A nombre de" />
  {#if franja && !cuenta}<p class="pista">En juego en {ubicacion}: {titularDe(franja)}</p>{/if}

  <div class="m-seg cats" role="tablist" aria-label="Categorías">
    {#each CATEGORIAS_PRODUCTO as c (c.id)}
      <button role="tab" aria-selected={cat === c.id} class:on={cat === c.id} onclick={() => (cat = c.id)}>
        {c.nombre.split(' ')[0]}{#if porCat(c.id)}<i class="cnt">{porCat(c.id)}</i>{/if}
      </button>
    {/each}
  </div>
  <div class="carta">
    {#each visibles as p (p.id)}
      {@const k = cant[p.id] ?? 0}
      <div class="prod" class:con={k > 0}>
        <span class="emo" aria-hidden="true">{p.emoji}</span>
        <span class="nom"><b>{p.nombre}</b><small>{pesos(p.precio)}</small></span>
        <span class="paso">
          <button class="menos" aria-label="Quitar {p.nombre}" style="opacity:{k ? 1 : 0.35}" disabled={!k} onclick={() => cambiar(p.id, -1)}>−</button>
          <b class="m-num" aria-live="polite">{k}</b>
          <button class="mas" aria-label="Agregar {p.nombre}" onclick={() => cambiar(p.id, 1)}>+</button>
        </span>
      </div>
    {/each}
  </div>
  <textarea class="campo nota" bind:value={nota} rows="2" maxlength="80" placeholder="Nota: sin hielo, bien fría…" aria-label="Nota"></textarea>
</div>

<div class="pie">
  {#if !cuenta}<button class="dividir" disabled={!listo} onclick={() => (dividiendo = true)} aria-label="Dividir entre tarjetas Quilombo">➗</button>{/if}
  <button class="m-btn enviar" disabled={!listo} onclick={enviar}>
    {enviando ? 'Enviando…' : !ubicacion ? 'Elige dónde' : cuenta ? (cuenta.user_id ? `Cobrar ${pesos(total)} con saldo` : `Cargar a ${cuenta.codigo} · ${pesos(total)}`) : `Enviar pedido · ${pesos(total)}`}
  </button>
</div>

{#if dividiendo}
  <HojaDividir {total} crear={nuevoSuelto} sub="{ubicacion} · {pesos(total)}" onCerrar={() => (dividiendo = false)} onListo={() => { dividiendo = false; limpiar(); }} />
{/if}
<HojaCobrar pedido={cobrando} onCerrar={() => { const habia = !!cobrando; cobrando = null; if (habia) limpiar(); }} />

<style>
  .nuevo { padding: 16px 16px 8px; }
  h2 { margin: 0 4px 12px; font-size: 30px; }
  .lbl { margin: 16px 4px 8px; }
  .acuenta { display: block; width: 100%; min-height: 50px; border: 1.5px dashed var(--q-borde); border-radius: 14px; background: none; font-size: 15px; font-weight: 700; color: var(--q-tx); }
  .acuenta b { color: var(--q-acct); }
  .tarjeta { position: relative; display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 18px; background: #0e1b33; color: #fff; overflow: hidden; }
  .tarjeta .aro { position: absolute; right: -40px; top: -40px; width: 110px; height: 110px; border-radius: 50%; border: 16px solid var(--q-accd); }
  .tarjeta .txt { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .tarjeta b { font-size: 19px; }
  .tarjeta small { font-size: 13px; opacity: 0.8; font-weight: 600; }
  .tarjeta button { position: relative; width: 40px; height: 40px; border: 0; border-radius: 20px; background: rgba(255, 255, 255, 0.14); color: #fff; font-size: 15px; font-weight: 800; }
  .sinsaldo { margin-top: 10px; padding: 12px 14px; border-radius: 12px; background: #ffe9b8; color: #7a4e00; display: flex; flex-direction: column; gap: 8px; }
  .sinsaldo b { font-size: 15px; }
  .sinsaldo span { font-size: 13.5px; }
  .alt { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .alt button { height: 44px; border: 0; border-radius: 10px; background: #0e1b33; color: #fff; font-size: 14px; font-weight: 900; }
  .lugares { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .lugares button { height: 54px; border: 2px solid var(--q-line); border-radius: 12px; background: var(--q-card); color: var(--q-tx); font-size: 21px; }
  .lugares button.on { border-color: var(--q-acc); background: var(--q-acc); color: var(--q-acctx); }
  .campo { width: 100%; height: 52px; padding: 0 16px; border: 0; border-radius: 12px; background: var(--q-sub); color: var(--q-tx); font-size: 17px; outline: none; }
  .campo:focus { box-shadow: 0 0 0 2px var(--q-acc); }
  .campo.nota { height: auto; margin-top: 12px; padding: 12px 16px; font-size: 16px; resize: none; }
  .pista { margin: 6px 4px 0; font-size: 14px; color: var(--q-ok); font-weight: 700; }
  .cats { margin: 16px 0 8px; }
  .cnt { margin-left: 6px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; background: var(--q-acc); color: var(--q-acctx); font-style: normal; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
  .carta { border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .prod { display: flex; align-items: center; gap: 12px; padding: 10px 12px; }
  .prod + .prod { border-top: 1px solid var(--q-line); }
  .prod.con { background: var(--q-accs); }
  .emo { width: 46px; height: 46px; flex: none; border-radius: 12px; background: var(--q-sub); font-size: 24px; display: flex; align-items: center; justify-content: center; }
  .nom { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .nom b { font-size: 16.5px; }
  .nom small { font-size: 13.5px; color: var(--q-tx2); font-weight: 600; }
  .paso { display: flex; align-items: center; gap: 6px; }
  .paso button { width: 44px; height: 44px; border: 0; border-radius: 22px; font-size: 22px; font-weight: 900; line-height: 1; }
  .paso .menos { background: var(--q-sub); color: var(--q-tx); }
  .paso .mas { background: var(--q-acc); color: var(--q-acctx); }
  .paso b { width: 24px; text-align: center; font-size: 24px; }
  .pie { position: fixed; z-index: 22; left: 0; right: 0; bottom: calc(62px + env(safe-area-inset-bottom, 0px)); display: flex; gap: 8px; padding: 10px 16px; background: var(--q-bg); border-top: 1px solid var(--q-line); }
  .enviar { flex: 1; height: 58px; }
  .dividir { width: 58px; height: 58px; flex: none; border: 1.5px solid var(--q-borde); border-radius: 14px; background: var(--q-card); font-size: 22px; }
  .dividir:disabled { opacity: 0.4; }
  :global(html.dark) .tarjeta { background: #0a1226; border: 1px solid var(--q-borde); }
</style>
