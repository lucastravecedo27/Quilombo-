<script lang="ts">
  // Cobrar con la tarjeta Quilombo en la caja del Mac: se lee el QR del jugador con la cámara del computador (o se
  // digita su código de 6), se ve su saldo y se le cobra lo que lleva (productos de la carta o un monto libre).
  // Con "Dividir entre tarjetas" se leen varias tarjetas y se descuenta a cada uno su parte en el acto.
  import LectorQR from '$lib/ui/LectorQR.svelte';
  import { cancelarPedido, crearPedido, cargarACuenta, cuentaParaTarjeta, dividirEnElActo, moverPedido, perfilDeTarjeta, productos, saldoQuilombo, tarjetaDe } from '$lib/club/app/club';
  import { CATEGORIAS_PRODUCTO, CLUB_DEMO, LARGO_TARJETA, leerCodigoCuenta, totalItems, type CategoriaProducto, type ItemPedido } from '$lib/club/domain/club';
  import { partesIguales } from '$lib/club/domain/billetera';
  import { pesos } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';

  const VALIDAS = /[^ABCDEFGHJKLMNPQRSTUVWXYZ2-9]/g;
  interface Jugador { uid: string; nombre: string; codigo: string }

  let jugadores = $state<Jugador[]>([]);
  let leyendo = $state(true);
  let codigo = $state('');
  let error = $state('');
  let cats = $state<CategoriaProducto>('bebidas');
  let cant = $state<Record<string, number>>({});
  let libre = $state('');
  let conceptoLibre = $state('');
  let cobrando = $state(false);
  let hecho = $state<{ titulo: string; sub: string } | null>(null);
  let partes = $state<Record<string, string>>({});
  let manual = $state(false);

  const carta = $derived(productos().filter((p) => p.activo));
  const items = $derived.by<ItemPedido[]>(() => {
    const xs: ItemPedido[] = carta.filter((p) => (cant[p.id] ?? 0) > 0).map((p) => ({ producto_id: p.id, nombre: p.nombre, emoji: p.emoji, precio: p.precio, cantidad: cant[p.id] }));
    const m = Math.round(Number(libre.replace(/\D/g, '')) || 0);
    if (m > 0) xs.push({ producto_id: 'libre', nombre: conceptoLibre.trim() || 'Consumo en caja', emoji: '💵', precio: m, cantidad: 1 });
    return xs;
  });
  const total = $derived(totalItems(items));
  const dividir = $derived(jugadores.length > 1);
  const iguales = $derived(partesIguales(total, jugadores.length));
  const montos = $derived(jugadores.map((j, k) => (manual ? Math.round(Number((partes[j.uid] ?? '').replace(/\D/g, '')) || 0) : iguales[k] ?? 0)));
  const sumaPartes = $derived(montos.reduce((s, x) => s + x, 0));
  const listo = $derived(jugadores.length > 0 && total > 0 && (!dividir || sumaPartes === total) && !cobrando);

  const cerrar = () => { panel.cobroTarjeta = false; };
  function reiniciar() {
    jugadores = []; leyendo = true; codigo = ''; error = ''; cant = {}; libre = ''; conceptoLibre = ''; partes = {}; manual = false; hecho = null;
  }

  function identificar(texto: string) {
    const c = leerCodigoCuenta(texto);
    if (!c) { error = 'Ese QR no es una tarjeta Quilombo'; return; }
    const p = perfilDeTarjeta(c);
    if (!p) { error = `Ninguna tarjeta Quilombo tiene el código ${c}`; return; }
    const uid = p.user_id as string;
    if (jugadores.some((j) => j.uid === uid)) { error = `${p.nombre} ya está en el cobro`; return; }
    error = '';
    jugadores = [...jugadores, { uid, nombre: p.nombre as string, codigo: tarjetaDe(uid) }];
    codigo = '';
    leyendo = false;
  }
  function escribir(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const v = el.value.toUpperCase().replace(VALIDAS, '').slice(0, LARGO_TARJETA);
    codigo = v; el.value = v; error = '';
    if (v.length === LARGO_TARJETA) identificar(v);
  }
  const quitar = (uid: string) => { jugadores = jugadores.filter((j) => j.uid !== uid); if (!jugadores.length) leyendo = true; };
  const sumar = (id: string, d: number) => { cant = { ...cant, [id]: Math.max(0, (cant[id] ?? 0) + d) }; };

  async function cobrar() {
    if (!listo) return;
    cobrando = true; error = '';
    const resumen = items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ');
    if (!dividir) {
      const j = jugadores[0];
      const cuenta = await cuentaParaTarjeta(j.codigo);
      if (!cuenta) { error = 'No se pudo abrir la cuenta de esa tarjeta'; cobrando = false; return; }
      const r = await cargarACuenta(cuenta.id, { items, ubicacion: 'Caja', origen: 'mesero', mesero: 'Caja · Laura', cancha_id: null, nota: null });
      cobrando = false;
      if (r.error || !r.id) { error = r.error ?? 'No se pudo cobrar'; return; }
      await moverPedido(r.id, 'entregado', 'Caja · Laura');
      hecho = { titulo: `Cobrado ${pesos(total)} con saldo`, sub: `${j.nombre} · ${resumen} · le quedan ${pesos(saldoQuilombo(j.uid))}` };
    } else {
      const nombres = jugadores.map((j) => j.nombre.split(' ')[0]).join(' y ');
      const ped = await crearPedido({ items, cliente: nombres, ubicacion: 'Caja', origen: 'mesero', mesero: 'Caja · Laura', club: CLUB_DEMO });
      if (ped.error || !ped.id) { error = ped.error ?? 'No se pudo cobrar'; cobrando = false; return; }
      const err = await dividirEnElActo({ tipo: 'pedido', ref: ped.id, total, concepto: `Caja · ${resumen}`, partes: jugadores.map((j, k) => ({ user_id: j.uid, monto: montos[k] })), club: CLUB_DEMO, mesero: 'Caja · Laura' });
      cobrando = false;
      if (err) { await cancelarPedido(ped.id); error = err; return; }
      await moverPedido(ped.id, 'entregado', 'Caja · Laura');
      hecho = { titulo: `Cobrado ${pesos(total)} entre ${jugadores.length}`, sub: jugadores.map((j, k) => `${j.nombre.split(' ')[0]} ${pesos(montos[k])}`).join(' · ') };
    }
  }
  const teclas = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
</script>

<svelte:window onkeydown={teclas} />
{#if panel.cobroTarjeta}
  <div class="c-modal-fondo" role="presentation" onclick={cerrar}></div>
  <div class="c-modal modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cobro">
    <header>
      <div>
        <span class="c-sobre">Caja · Saldo Quilombo</span>
        <h2 id="titulo-cobro" class="c-titulo">Cobrar con tarjeta Quilombo</h2>
      </div>
      <button class="x" aria-label="Cerrar" onclick={cerrar}>×</button>
    </header>

    {#if hecho}
      <div class="hecho">
        <span class="check">✓</span>
        <b class="c-titulo">{hecho.titulo}</b>
        <p>{hecho.sub}</p>
        <div class="fila"><button class="c-btn sec" onclick={cerrar}>Listo</button><button class="c-btn" onclick={reiniciar}>Cobrar otra tarjeta</button></div>
      </div>
    {:else}
      <div class="dos">
        <section class="lado-izq">
          {#if leyendo}
            <LectorQR frontal onleer={identificar} />
            <p class="ayuda">Que el jugador muestre su tarjeta (el QR en su app) a la cámara del computador.</p>
            <label class="codigo">
              <span>o digita el código de la tarjeta</span>
              <input value={codigo} oninput={escribir} maxlength={LARGO_TARJETA} autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Q7K2MX" aria-label="Código de la tarjeta (6 caracteres)" />
            </label>
            {#if jugadores.length}<button class="c-btn sec bloque" onclick={() => (leyendo = false)}>Volver al cobro</button>{/if}
          {/if}

          {#if jugadores.length}
            <div class="quienes" class:oculto={leyendo}>
              {#each jugadores as j, k (j.uid)}
                {@const saldo = saldoQuilombo(j.uid)}
                {@const debe = dividir ? montos[k] : total}
                <article class="tarjeta-q" class:corto={saldo < debe}>
                  <div class="t-cab"><span class="logo c-titulo">Quilombo</span><span class="cod">{j.codigo}</span></div>
                  <b class="nom">{j.nombre}</b>
                  <div class="saldo"><span>Saldo</span><b class="c-num">{pesos(saldo)}</b></div>
                  {#if dividir}
                    <label class="parte">Su parte
                      {#if manual}<input class="c-input" inputmode="numeric" value={partes[j.uid] ?? String(montos[k])} oninput={(e) => (partes = { ...partes, [j.uid]: (e.currentTarget as HTMLInputElement).value })} aria-label="Parte de {j.nombre}" />
                      {:else}<b>{pesos(montos[k])}</b>{/if}
                    </label>
                  {/if}
                  {#if saldo < debe && debe > 0}<small class="falta">No le alcanza: le faltan {pesos(debe - saldo)}. Que recargue en la app.</small>{/if}
                  <button class="quitar" aria-label="Quitar a {j.nombre}" onclick={() => quitar(j.uid)}>×</button>
                </article>
              {/each}
              {#if !leyendo}
                <button class="c-btn sec bloque" onclick={() => { leyendo = true; error = ''; if (!manual) partes = {}; }}>➗ Dividir entre tarjetas · leer otra</button>
                {#if dividir}
                  <div class="modo-div">
                    <button class="c-chip" class:on={!manual} onclick={() => (manual = false)}>Partes iguales</button>
                    <button class="c-chip" class:on={manual} onclick={() => { manual = true; partes = Object.fromEntries(jugadores.map((j, k) => [j.uid, String(iguales[k] ?? 0)])); }}>Cada uno un monto</button>
                  </div>
                  {#if manual && sumaPartes !== total}<small class="falta">Las partes suman {pesos(sumaPartes)} y el total es {pesos(total)}.</small>{/if}
                {/if}
              {/if}
            </div>
          {/if}
        </section>

        <section class="lado-der" class:apagado={!jugadores.length}>
          <div class="c-chips">
            {#each CATEGORIAS_PRODUCTO as c (c.id)}<button class="c-chip" class:on={cats === c.id} onclick={() => (cats = c.id)}>{c.emoji} {c.nombre}</button>{/each}
          </div>
          <div class="grilla">
            {#each carta.filter((p) => p.categoria === cats) as p (p.id)}
              {@const n = cant[p.id] ?? 0}
              <div class="prod" class:on={n > 0}>
                <button class="toca" onclick={() => sumar(p.id, 1)} aria-label="Agregar {p.nombre}"><span class="em">{p.emoji}</span><span class="pn">{p.nombre}</span><span class="pp">{pesos(p.precio)}</span></button>
                {#if n}<div class="paso"><button onclick={() => sumar(p.id, -1)} aria-label="Quitar uno">−</button><b>{n}</b><button onclick={() => sumar(p.id, 1)} aria-label="Agregar uno">+</button></div>{/if}
              </div>
            {/each}
          </div>
          <div class="libre">
            <label class="c-campo">Monto libre<input class="c-input" inputmode="numeric" bind:value={libre} placeholder="0" aria-label="Monto libre" /></label>
            <label class="c-campo">Concepto<input class="c-input" bind:value={conceptoLibre} placeholder="Consumo en caja" /></label>
          </div>
        </section>
      </div>

      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <footer>
        <div class="tot"><span class="c-sobre">Total</span><b class="c-num">{pesos(total)}</b></div>
        <button class="c-btn sec" onclick={cerrar}>Cancelar</button>
        <button class="c-btn verde grande" disabled={!listo} onclick={cobrar}>
          {cobrando ? 'Cobrando…' : dividir ? `Cobrar ${pesos(total)} entre ${jugadores.length}` : `Cobrar ${pesos(total)} con saldo`}
        </button>
      </footer>
    {/if}
  </div>
{/if}

<style>
  .modal { width: 1040px; }
  header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
  h2 { font-size: 32px; margin-top: 2px; }
  .x { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--q-borde); background: var(--q-sub); font-size: 20px; }
  .dos { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 20px; }
  .lado-izq { display: flex; flex-direction: column; gap: 10px; }
  .ayuda { margin: 0; font-size: 13px; color: var(--q-tx2); text-align: center; }
  .codigo { display: flex; flex-direction: column; gap: 6px; }
  .codigo span { font-size: 12px; font-weight: 700; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.06em; }
  .codigo input { height: 60px; border: 2px solid var(--q-borde); border-radius: 12px; background: #fff; color: var(--q-tx); text-align: center; font-family: var(--q-font-titulo); font-weight: 900; font-style: italic; font-size: 34px; letter-spacing: 0.25em; text-transform: uppercase; outline: none; }
  .codigo input:focus { border-color: var(--q-acc); }
  .quienes { display: flex; flex-direction: column; gap: 10px; }
  .quienes.oculto { display: none; }
  .tarjeta-q { position: relative; padding: 14px 16px; border-radius: 14px; color: #fff; background: #0e1b33; border: 1px solid rgba(220, 230, 255, 0.16); box-shadow: 0 18px 40px -12px rgba(14, 27, 51, 0.45); display: flex; flex-direction: column; gap: 4px; }
  .tarjeta-q.corto { border-color: var(--q-alr); box-shadow: 0 12px 40px -12px rgba(255, 92, 106, 0.6); }
  .t-cab { display: flex; justify-content: space-between; align-items: center; }
  .logo { color: var(--q-accd); font-size: 18px; }
  .cod { font-family: var(--q-font-titulo); font-weight: 800; font-style: italic; letter-spacing: 0.12em; color: rgba(255, 255, 255, 0.85); }
  .nom { font-size: 18px; }
  .saldo { display: flex; justify-content: space-between; align-items: baseline; }
  .saldo span { font-size: 12px; color: rgba(255, 255, 255, 0.65); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
  .saldo b { font-size: 26px; color: #3ccf8e; }
  .parte { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 13px; color: rgba(255, 255, 255, 0.7); font-weight: 700; }
  .parte input { width: 130px; text-align: right; }
  .parte b { color: #fff; font-size: 16px; }
  .falta { color: #ff9aa6; font-size: 12.5px; font-weight: 600; }
  .quitar { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 6px; border: 0; background: rgba(255, 255, 255, 0.12); color: #fff; font-size: 15px; padding: 0; opacity: 0; }
  .tarjeta-q:hover .quitar { opacity: 1; }
  .modo-div { display: flex; gap: 6px; }
  .lado-der { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .lado-der.apagado { opacity: 0.45; pointer-events: none; }
  .grilla { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; max-height: 340px; overflow-y: auto; }
  .prod { position: relative; border-radius: 12px; border: 1px solid var(--q-line); background: #fff; overflow: hidden; }
  .prod.on { border-color: var(--q-acc); background: color-mix(in srgb, var(--q-acc) 14%, transparent); }
  .toca { width: 100%; border: 0; background: none; padding: 12px 10px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
  .em { font-size: 28px; }
  .pn { font-size: 13px; font-weight: 700; line-height: 1.2; min-height: 2.4em; }
  .pp { font-size: 12.5px; color: var(--q-tx2); }
  .paso { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--q-line); }
  .paso button { width: 40px; height: 32px; border: 0; background: none; font-size: 18px; font-weight: 800; color: var(--q-acc); }
  .paso b { font-size: 15px; }
  .libre { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 10px; }
  .error { margin: 12px 0 0; padding: 10px 14px; border-radius: 10px; background: rgba(232, 71, 91, 0.1); color: var(--c-error); font-weight: 700; }
  footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--q-line); }
  .tot { margin-right: auto; display: flex; flex-direction: column; }
  .tot b { font-size: 34px; line-height: 1; }
  .grande { height: 48px; padding: 0 22px; font-size: 16px; }
  .hecho { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 30px 20px 10px; text-align: center; }
  .check { width: 72px; height: 72px; border-radius: 50%; background: var(--c-verde); color: #fff; font-size: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 8px rgba(60, 207, 142, 0.18); animation: pop 0.5s var(--q-spring) both; }
  @keyframes pop { 0% { transform: scale(0.6); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }
  .hecho b { font-size: 30px; }
  .hecho p { margin: 0; color: var(--q-tx2); }
  .fila { display: flex; gap: 8px; margin-top: 10px; }
</style>
