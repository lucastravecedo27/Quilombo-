<script lang="ts">
  // La tarjeta Quilombo de un jugador (al escanearla): quién es y su saldo grande; 6 productos rápidos para cargar y
  // "Cobrar $T con saldo" → Cobrando… → PAGADO ✓. Si no le alcanza: que recargue, o se cobra de otra forma.
  // Abajo, lo que lleva hoy y cerrar la visita. Las cuentas de clientes sin usuario (las abre el club) se cobran al
  // cerrarlas.
  import { canchasDe, cargarACuenta, cobrarPedido, crearPedido, franjasDe, jugadoresDe, pagarCuenta, pedidosDeCuenta, porPagarCuenta, productos, saldoCuenta, saldoQuilombo, titularDe } from '$lib/club/app/club';
  import { enJuego, hace, resumenItems, totalItems, type Cuenta, type ItemPedido, type MetodoPago } from '$lib/club/domain/club';
  import { datos } from '$lib/data/datos.svelte';
  import { pesos } from '$lib/social/domain/jugar';
  import { iniciales, m } from './estado.svelte';

  const cuenta = $derived((datos.cuentas as Cuenta[]).find((c) => c.id === m.verCuenta) ?? null);
  const ps = $derived(cuenta ? pedidosDeCuenta(cuenta.id).sort((a, b) => b.created_at.localeCompare(a.created_at)) : []);
  const lleva = $derived(cuenta ? saldoCuenta(cuenta.id) : 0);
  const porPagar = $derived(cuenta ? porPagarCuenta(cuenta.id) : 0);
  const saldo = $derived(cuenta?.user_id ? saldoQuilombo(cuenta.user_id) : null);
  const perfil = $derived(cuenta?.user_id ? datos.perfiles.find((p) => p.user_id === cuenta.user_id) ?? null : null);

  // Los 6 productos rápidos: los de siempre si están en la carta; si no, los primeros
  const PREFERIDOS = ['Cerveza Club Colombia', 'Michelada', 'Agua', 'Empanadas ×3', 'Picada para 4', 'Tubo de pelotas'];
  const carta = $derived(productos().filter((p) => p.activo));
  const rapidos = $derived([...PREFERIDOS.map((n) => carta.find((p) => p.nombre === n)).filter((p) => !!p), ...carta].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i).slice(0, 6));
  let cargo = $state<Record<string, number>>({});
  const items = $derived<ItemPedido[]>(carta.filter((p) => (cargo[p.id] ?? 0) > 0).map((p) => ({ producto_id: p.id, nombre: p.nombre, emoji: p.emoji, precio: p.precio, cantidad: cargo[p.id] })));
  const total = $derived(totalItems(items));
  const falta = $derived(saldo !== null && total > saldo ? total - saldo : 0);

  // A dónde se lo llevan: la cancha donde está jugando (si está en una), o la barra
  const canchas = $derived(canchasDe());
  const lugares = $derived([...canchas.map((c) => c.nombre), 'Barra', 'Terraza']);
  function dondeJuega(): string {
    if (!cuenta) return 'Barra';
    const nombre = cuenta.nombre;
    for (const c of canchas) {
      const f = enJuego(franjasDe(), c.id, Date.now());
      if (f && (titularDe(f) === nombre || jugadoresDe(f).includes(nombre))) return c.nombre;
    }
    return 'Barra';
  }
  let lugar = $state('Barra');
  let etapa = $state<'cargar' | 'cobrando' | 'listo'>('cargar');
  let cobrado = $state<{ total: number; texto: string }>({ total: 0, texto: '' });
  let ocupado = $state(false);
  let metodos = $state(false);
  let abierta = '';
  // Al abrir otra tarjeta: limpiar
  $effect.pre(() => {
    const id = m.verCuenta ?? '';
    if (id === abierta) return;
    abierta = id;
    cargo = {}; etapa = 'cargar'; metodos = false;
    lugar = dondeJuega();
  });

  const cerrar = () => { m.verCuenta = null; };
  const mas = (id: string) => { cargo = { ...cargo, [id]: (cargo[id] ?? 0) + 1 }; navigator.vibrate?.(10); };
  const base = () => {
    const c = canchas.find((x) => x.nombre === lugar);
    const f = c ? enJuego(franjasDe(), c.id, Date.now()) : null;
    return { origen: 'mesero' as const, mesero: m.yo, items, ubicacion: lugar, cancha_id: c?.id ?? null, franja_id: f?.id ?? null, nota: null };
  };

  async function cobrarSaldo() {
    if (!cuenta || !items.length || falta || ocupado) return;
    ocupado = true;
    etapa = 'cobrando';
    const t = total;
    const antes = saldo ?? 0;
    const [r] = await Promise.all([cargarACuenta(cuenta.id, base()), new Promise((ok) => setTimeout(ok, 900))]);
    ocupado = false;
    if (r.error) { etapa = 'cargar'; m.avisar(r.error, true); return; }
    cobrado = { total: t, texto: `le quedan ${pesos(Math.max(0, antes - t))}` };
    etapa = 'listo';
  }
  /** Sin saldo: el pedido normal, cobrado en efectivo, datáfono o Nequi */
  async function cobrarAparte(metodo: MetodoPago) {
    if (!cuenta || !items.length || ocupado) return;
    ocupado = true;
    etapa = 'cobrando';
    const t = total;
    const r = await crearPedido({ ...base(), cliente: cuenta.nombre });
    const err = r.error ?? (r.id ? await cobrarPedido(r.id, metodo, m.yo) : 'No se pudo');
    ocupado = false;
    if (err) { etapa = 'cargar'; m.avisar(err, true); return; }
    cobrado = { total: t, texto: metodo === 'efectivo' ? 'en efectivo' : metodo === 'datafono' ? 'con datáfono' : 'por Nequi' };
    etapa = 'listo';
  }
  /** Cuenta del club sin usuario: cargar con la carta completa en Nuevo */
  function cartaCompleta() {
    if (!cuenta) return;
    m.cuenta = cuenta.id;
    m.ubicacion = lugar;
    m.tab = 'nuevo';
    cerrar();
    scrollTo(0, 0);
  }
  async function cerrarVisita(metodo: MetodoPago = 'saldo') {
    if (!cuenta || ocupado) return;
    ocupado = true;
    const { codigo, nombre } = cuenta;
    const debia = porPagar;
    const err = await pagarCuenta(cuenta.id, metodo, m.yo);
    ocupado = false;
    if (m.cuenta === cuenta.id) m.cuenta = null;
    m.avisar(err ?? (debia ? `Cuenta ${codigo} cerrada · ${pesos(debia)} ✓` : `Visita de ${nombre.split(' ')[0]} cerrada ✓`), !!err);
    cerrar();
  }
</script>

{#if m.verCuenta}
  <div class="m-fondo" role="presentation" onclick={cerrar}></div>
  <div class="m-hoja" role="dialog" aria-modal="true" aria-label="Tarjeta {cuenta?.codigo ?? ''}">
    <div class="m-agarre"></div>
    <button class="m-x x" onclick={cerrar} aria-label="Cerrar">✕</button>
    {#if !cuenta}
      <p class="vacio">Esa tarjeta ya no está.</p>
    {:else}
      <div class="cuerpo">
        <div class="cabeza">
          <span class="aro" aria-hidden="true"></span>
          <span class="ini" style="background:{(perfil?.color as string) || '#1e7fd0'}">{iniciales(cuenta.nombre)}</span>
          <span class="nom"><b>{cuenta.nombre}</b><small>🛳️ Tarjeta {cuenta.codigo}{cuenta.estado === 'pagada' ? ' · visita cerrada' : ''}</small></span>
          {#if saldo !== null}
            <span class="saldo"><small>SALDO</small><b class="m-num">{pesos(saldo)}</b></span>
          {/if}
        </div>

        {#if cuenta.estado === 'abierta'}
          {#if etapa === 'cargar'}
            {#if saldo !== null}
              <div class="rapidos">
                {#each rapidos as p (p.id)}
                  {@const q = cargo[p.id] ?? 0}
                  <button class:on={q > 0} onclick={() => mas(p.id)} aria-label="Agregar {p.nombre}">
                    <span class="emo">{p.emoji}</span><b>{p.nombre}</b><small>{pesos(p.precio)}</small>
                    {#if q}<i class="q">{q}</i>{/if}
                  </button>
                {/each}
              </div>
              <div class="donde">
                <span class="m-over">Se lo llevas a</span>
                <div class="chips">
                  {#each lugares as u (u)}<button class:on={lugar === u} onclick={() => (lugar = u)}>{u}</button>{/each}
                </div>
              </div>
              {#if items.length}<button class="limpiar" onclick={() => (cargo = {})}>Quitar todo · {resumenItems(items)}</button>{/if}
              {#if falta}
                <div class="falta" role="alert">
                  <b>Saldo insuficiente · que recargue</b>
                  <span>Le faltan {pesos(falta)}. También puede pagar de otra forma:</span>
                  <div class="metodos">
                    <button onclick={() => cobrarAparte('efectivo')}>Efectivo</button>
                    <button onclick={() => cobrarAparte('datafono')}>Datáfono</button>
                    <button onclick={() => cobrarAparte('nequi')}>Nequi</button>
                  </div>
                </div>
              {/if}
              <button class="m-btn" disabled={!items.length || !!falta || ocupado} onclick={cobrarSaldo}>Cobrar {pesos(total)} con saldo</button>
              <button class="link" onclick={cartaCompleta}>Otro producto · carta completa ›</button>
            {:else}
              <button class="m-btn" onclick={cartaCompleta}>＋ Cargar pedido</button>
            {/if}
          {:else if etapa === 'cobrando'}
            <div class="cobrando"><i class="spin"></i><b>Cobrando…</b></div>
          {:else}
            <div class="pagado">
              <span class="check"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
              <b class="m-titulo">Pagado ✓</b>
              <span>{pesos(cobrado.total)} · {cobrado.texto}</span>
              <small>Se lo llevas a la {lugar}</small>
            </div>
            <button class="m-btn noche" onclick={cerrar}>Listo</button>
            <button class="link" onclick={() => { cargo = {}; etapa = 'cargar'; }}>Cobrarle otra cosa ›</button>
          {/if}
        {/if}

        {#if etapa !== 'cobrando'}
          <div class="hoy">
            <div class="hoy-cab"><span class="m-over">Hoy lleva</span><b class="m-num">{pesos(lleva)}</b></div>
            {#if ps.length}
              {#each ps as p (p.id)}
                <div class="ped">
                  <span><b>#{p.numero} · {p.ubicacion}</b><small>{resumenItems(p.items)} · {hace(p.created_at, m.ahora)}</small></span>
                  <span class="der"><b>{pesos(p.total)}</b><small class:ok={!!p.pagado_en || p.estado === 'pagado'}>{p.pagado_en || p.estado === 'pagado' ? (p.metodo === 'saldo' ? 'Pagado con saldo ✓' : 'Pagado ✓') : 'Por cobrar'}{p.estado === 'entregado' || p.estado === 'pagado' ? ' · entregado' : ''}</small></span>
                </div>
              {/each}
            {:else}
              <p class="nada">Aún no ha pedido nada hoy.</p>
            {/if}
          </div>
          {#if cuenta.estado === 'abierta'}
            {#if porPagar}
              {#if metodos}
                <div class="metodos grande">
                  <button disabled={ocupado} onclick={() => cerrarVisita('efectivo')}>💵 Efectivo</button>
                  <button disabled={ocupado} onclick={() => cerrarVisita('datafono')}>💳 Datáfono</button>
                  <button disabled={ocupado} onclick={() => cerrarVisita('nequi')}>📲 Nequi</button>
                </div>
              {:else}
                <button class="sec" onclick={() => (metodos = true)}>Cobrar lo pendiente · {pesos(porPagar)}</button>
              {/if}
            {:else}
              <button class="sec" disabled={ocupado} onclick={() => cerrarVisita()}>Cerrar visita</button>
            {/if}
          {/if}
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .cuerpo { display: flex; flex-direction: column; gap: 12px; margin-top: 30px; }
  .vacio { color: var(--q-tx2); text-align: center; margin: 24px 0; }
  .cabeza { position: relative; display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 18px; background: #0e1b33; color: #fff; overflow: hidden; }
  .aro { position: absolute; right: -40px; top: -40px; width: 130px; height: 130px; border-radius: 50%; border: 18px solid var(--q-accd); }
  .ini { position: relative; width: 60px; height: 60px; flex: none; border-radius: 30px; color: #fff; font-weight: 900; font-size: 20px; display: flex; align-items: center; justify-content: center; }
  .nom { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .nom b { font-size: 19px; line-height: 1.15; }
  .nom small { font-size: 13px; opacity: 0.75; font-weight: 600; }
  .saldo { position: relative; display: flex; flex-direction: column; align-items: flex-end; }
  .saldo small { font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; opacity: 0.7; }
  .saldo b { font-size: 32px; }
  .x { position: absolute; top: 8px; right: 14px; width: 36px; height: 36px; font-size: 14px; }

  .rapidos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .rapidos button { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border: 2px solid var(--q-line); border-radius: 14px; background: var(--q-card); }
  .rapidos button.on { border-color: var(--q-acc); background: var(--q-accs); }
  .rapidos .emo { font-size: 26px; }
  .rapidos b { font-size: 13.5px; line-height: 1.1; text-align: center; }
  .rapidos small { font-size: 12px; color: var(--q-tx2); font-weight: 700; }
  .rapidos .q { position: absolute; top: -8px; right: -6px; min-width: 26px; height: 26px; border-radius: 13px; background: var(--q-acc); color: var(--q-acctx); font-style: normal; font-weight: 900; font-size: 14px; display: flex; align-items: center; justify-content: center; animation: m-pop 0.3s both; }
  .donde { display: flex; flex-direction: column; gap: 6px; }
  .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chips button { flex: none; height: 40px; padding: 0 12px; border: 2px solid var(--q-line); border-radius: 10px; background: var(--q-card); font-weight: 800; font-size: 14px; }
  .chips button.on { border-color: var(--q-acc); background: var(--q-acc); color: var(--q-acctx); }
  .limpiar { align-self: flex-start; border: 0; background: none; padding: 0; color: var(--q-tx2); font-size: 13.5px; font-weight: 700; text-decoration: underline; }
  .falta { padding: 12px 14px; border-radius: 12px; background: #ffe9b8; color: #7a4e00; display: flex; flex-direction: column; gap: 8px; }
  .falta b { font-size: 15px; }
  .falta span { font-size: 13.5px; }
  .metodos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .metodos button { height: 40px; border: 0; border-radius: 10px; background: #0e1b33; color: #fff; font-size: 13.5px; font-weight: 900; }
  .metodos.grande button { height: 56px; font-size: 15px; }
  .link { align-self: center; border: 0; background: none; padding: 4px; color: var(--q-acct); font-weight: 800; font-size: 15px; }

  .cobrando { height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
  .spin { width: 52px; height: 52px; border-radius: 50%; border: 5px solid var(--q-sub); border-top-color: var(--q-acc); animation: m-gira 0.8s linear infinite; }
  .cobrando b { font-size: 17px; }
  .pagado { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 0 4px; text-align: center; }
  .check { width: 84px; height: 84px; border-radius: 42px; background: #18895b; color: #fff; display: flex; align-items: center; justify-content: center; animation: m-pop 0.5s var(--q-spring) both; }
  .pagado b { margin-top: 8px; font-size: 40px; line-height: 1; }
  .pagado span { font-size: 17px; font-weight: 700; }
  .pagado small { font-size: 13.5px; color: var(--q-tx2); }

  .hoy { border-radius: 16px; border: 1px solid var(--q-line); overflow: hidden; }
  .hoy-cab { display: flex; align-items: baseline; justify-content: space-between; padding: 10px 14px; background: var(--q-sub); }
  .hoy-cab b { font-size: 22px; }
  .ped { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid var(--q-line); }
  .ped > span:first-child { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .ped b { font-size: 14.5px; }
  .ped small { font-size: 12.5px; color: var(--q-tx2); font-weight: 600; }
  .der { display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
  .der small { font-weight: 800; color: #d42a3a; }
  .der small.ok { color: var(--q-ok); }
  .nada { margin: 0; padding: 12px 14px; color: var(--q-tx2); font-size: 14px; }
  .sec { height: 52px; border: 1.5px solid var(--q-borde); border-radius: 14px; background: none; font-size: 16px; font-weight: 900; color: var(--q-tx); }
  .sec:disabled { opacity: 0.4; }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
  :global(html.dark) .cabeza { background: #0a1226; border: 1px solid var(--q-borde); }
</style>
