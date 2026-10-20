<script lang="ts">
  // Detalle de un turno (cajón lateral): quién lo tiene, si ya pagó, los jugadores y lo que han pedido al bar;
  // y lo que puede hacer recepción: reservar para un cliente, cobrar, marcar llegada, bloquear, liberar o cambiar el precio.
  import { bloquearFranja, canchaDe, cambiarPrecio, cobrarFranja, franjasDe, hora, jugadoresDe, liberarFranja, marcarLlegada, partidoDe, pedidos, reservarEnClub, titularDe } from '$lib/club/app/club';
  import { ESTADOS_PEDIDO, METODOS, resumenItems, type MetodoPago } from '$lib/club/domain/club';
  import { cuando, pesos } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';

  const f = $derived(panel.abierta ? franjasDe().find((x) => x.id === panel.abierta) ?? null : null);
  const cancha = $derived(canchaDe(f?.cancha_id));
  const partido = $derived(partidoDe(f));
  const jugadores = $derived(f ? jugadoresDe(f) : []);
  const pasada = $derived(f ? Date.parse(f.fin) <= panel.ahora : false);
  const delTurno = $derived(f ? pedidos().filter((p) => p.franja_id === f.id || (p.cancha_id === f.cancha_id && p.created_at >= f.inicio && p.created_at < f.fin)) : []);

  let cliente = $state('');
  let telefono = $state('');
  let pago = $state<MetodoPago | 'apartar'>('apartar');
  let nota = $state('');
  let precio = $state('');
  let liberar = $state(false);
  let error = $state('');
  let ocupado = $state(false);

  // Al cambiar de turno se limpia el formulario
  let ultima = '';
  $effect(() => {
    if (!f || f.id === ultima) return;
    ultima = f.id;
    cliente = ''; telefono = ''; pago = 'apartar'; nota = ''; precio = String(f.precio); liberar = false; error = '';
  });

  async function hacer(fn: () => Promise<string | null | void>) {
    if (ocupado) return;
    ocupado = true; error = '';
    const e = await fn();
    ocupado = false;
    if (e) error = e;
  }
  const reservar = () => hacer(() => reservarEnClub(f!.id, cliente.trim(), telefono.trim() || null, pago === 'apartar' ? null : pago));
  const cobrar = (m: MetodoPago) => hacer(() => cobrarFranja(f!.id, m));
  const cerrar = () => (panel.abierta = null);
  const teclas = (e: KeyboardEvent) => { if (e.key === 'Escape' && panel.abierta) cerrar(); };
  const ESTADO = { libre: 'Libre', apartada: '⏳ Apartada · falta pago', pagada: '✓ Pagada', bloqueada: 'Bloqueada' } as const;
  const esClase = $derived(!!f?.cliente?.startsWith('Clase ·'));
  const dia = $derived(f ? new Date(f.inicio).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).replace(',', '') : '');
  const tipo = $derived(cancha ? (cancha.tipo === 'panoramica' ? 'Panorámica' : cancha.techada ? 'Techada' : cancha.tipo === 'muro' ? 'Muro' : 'Cristal') : '');
  const nuevoPrecio = $derived(Number(precio) || 0);
  const mover = (d: number) => (precio = String(Math.max(0, nuevoPrecio + d)));
</script>

<svelte:window onkeydown={teclas} />
{#if f}
  <div class="fondo" role="presentation" onclick={cerrar}></div>
  <aside class="cajon" aria-label="Detalle del turno">
    <header class="cab">
      <div>
        <span class="c-sobre">{dia}</span>
        <h2 class="c-titulo">{cancha?.nombre} · {hora(f.inicio)}</h2>
      </div>
      <button class="x" aria-label="Cerrar" onclick={cerrar}>×</button>
    </header>
    <div class="chips">
      <span class="estado {esClase ? 'clase' : f.estado}">{esClase ? '🎓 Clase con profe' : ESTADO[f.estado]}</span>
      {#if f.origen === 'app'}<span class="c-insignia app">📱 Reservada en Quilombo</span>{:else if f.origen === 'club'}<span class="c-insignia club">📞 Reservada en el club</span>{/if}
    </div>

    <dl class="datos">
      <div><dt>A nombre de</dt><dd>{f.estado === 'libre' ? '—' : f.estado === 'bloqueada' ? (f.nota ?? 'Bloqueada') : titularDe(f)}</dd></div>
      <div><dt>Origen</dt><dd>{f.origen === 'app' ? '📱 Quilombo' : f.origen === 'club' ? '📞 Club' : '—'}</dd></div>
      {#if f.telefono}<div><dt>Teléfono</dt><dd>{f.telefono}</dd></div>{/if}
      <div><dt>Cancha</dt><dd>{cancha?.nombre} · {tipo}</dd></div>
      <div><dt>Duración</dt><dd>90 min · hasta {hora(f.fin)}</dd></div>
      {#if f.estado === 'apartada' && f.apartada_hasta}<div><dt>Vence</dt><dd class="acc">{hora(f.apartada_hasta)} si no pagan</dd></div>{/if}
      {#if f.llegaron}<div><dt>Llegaron</dt><dd class="ok">✓ {hora(f.llegaron)}</dd></div>{/if}
      {#if partido?.nota}<div><dt>Nota</dt><dd>“{partido.nota}”</dd></div>{/if}
    </dl>

    <div class="precio">
      <span>Precio</span>
      {#if f.estado === 'libre' && !pasada}
        <button class="mm" aria-label="Bajar precio" onclick={() => mover(-10_000)}>−</button>
        <b class="c-num">{pesos(nuevoPrecio).replace('$ ', '$')}</b>
        <button class="mm" aria-label="Subir precio" onclick={() => mover(10_000)}>+</button>
      {:else}
        <b class="c-num">{pesos(f.precio).replace('$ ', '$')}</b>
      {/if}
    </div>
    {#if f.estado === 'libre' && !pasada && nuevoPrecio !== f.precio}
      <button class="c-btn suave bloque" onclick={() => hacer(() => cambiarPrecio(f!.id, Math.round(nuevoPrecio)))}>Guardar precio {pesos(nuevoPrecio)}</button>
    {/if}

    <div class="cuerpo">
      {#if (f.estado === 'apartada' || f.estado === 'pagada') && jugadores.length}
        <section>
          <h3>Jugadores ({jugadores.length}/4)</h3>
          <ul class="jug">
            {#each jugadores as j (j)}<li><span class="av">{j.charAt(0)}</span>{j}</li>{/each}
            {#each Array(Math.max(0, 4 - jugadores.length)) as _, k (k)}<li class="falta"><span class="av">?</span>Cupo libre</li>{/each}
          </ul>
        </section>
      {/if}
      {#if f.estado === 'libre' && !pasada}
        <section>
          <h3>Reservar para un cliente</h3>
          <label class="c-campo">Nombre<input class="c-input" bind:value={cliente} placeholder="Quién reserva" /></label>
          <label class="c-campo">Teléfono<input class="c-input" bind:value={telefono} placeholder="300 123 4567" inputmode="tel" /></label>
          <label class="c-campo">Pago
            <select class="c-input" bind:value={pago}>
              <option value="apartar">Apartar · paga al llegar</option>
              <option value="efectivo">Pagó en efectivo</option>
              <option value="datafono">Pagó con datáfono</option>
              <option value="nequi">Pagó por Nequi</option>
            </select>
          </label>
          <label class="c-campo">Motivo si la bloqueas<input class="c-input" bind:value={nota} placeholder="Clase, mantenimiento…" /></label>
        </section>
      {:else if f.estado === 'libre'}
        <p class="c-vacio">Este turno ya pasó.</p>
      {/if}
      {#if delTurno.length}
        <section>
          <h3>Pedidos al bar en este turno</h3>
          <ul class="pedidos">
            {#each delTurno as p (p.id)}
              <li>
                <span class="c-insignia" style="background:{ESTADOS_PEDIDO[p.estado].color};color:#fff">{ESTADOS_PEDIDO[p.estado].nombre}</span>
                <span class="res">#{p.numero} · {resumenItems(p.items)}</span>
                <b>{pesos(p.total)}</b>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
      {#if error}<p class="error">{error}</p>{/if}
    </div>

    <footer class="acciones">
      {#if f.estado === 'libre' && !pasada}
        <button class="c-btn grande bloque" disabled={!cliente.trim() || ocupado} onclick={reservar}>Reservar para un cliente</button>
        <button class="c-btn suave grande bloque" disabled={ocupado} onclick={() => hacer(() => bloquearFranja(f!.id, nota.trim()))}>Bloquear</button>
      {:else if f.estado === 'apartada'}
        <span class="c-mini">Cobrar en recepción</span>
        <div class="metodos">
          {#each ['efectivo', 'datafono', 'nequi'] as const as m (m)}
            <button class="c-btn verde" disabled={ocupado} onclick={() => cobrar(m)}>{METODOS[m]}</button>
          {/each}
        </div>
      {/if}
      {#if f.estado === 'apartada' || f.estado === 'pagada'}
        <button class="c-btn {f.llegaron ? 'suave' : ''} grande bloque" onclick={() => hacer(() => marcarLlegada(f!.id))}>{f.llegaron ? '↺ Deshacer llegada' : '👋 Llegaron'}</button>
        {#if liberar}
          <div class="confirma">
            <span>¿Cancelar la reserva y dejar el turno libre?</span>
            <button class="c-btn sec chico" onclick={() => (liberar = false)}>No</button>
            <button class="c-btn chico rojo" onclick={() => hacer(() => liberarFranja(f!.id))}>Sí, liberar</button>
          </div>
        {:else}
          <button class="c-btn peligro bloque" onclick={() => (liberar = true)}>Liberar turno</button>
        {/if}
      {:else if f.estado === 'bloqueada'}
        <button class="c-btn grande bloque" onclick={() => hacer(() => liberarFranja(f!.id))}>Desbloquear</button>
      {/if}
    </footer>
  </aside>
{/if}

<style>
  .fondo { position: fixed; inset: 0; background: rgba(3, 6, 15, 0.55); z-index: 40; animation: c-fade 0.25s both; }
  .cajon { position: fixed; z-index: 41; top: 0; right: 0; bottom: 0; width: 400px; max-width: 100vw; padding: 26px 24px; background: #fff; border-left: 1px solid rgba(14, 27, 51, 0.12); display: flex; flex-direction: column; gap: 16px; overflow-y: auto; animation: cajon 0.3s cubic-bezier(0.32, 0.72, 0, 1) both; }
  @keyframes cajon { from { transform: translateX(100%); } to { transform: none; } }
  .cab { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .cab div { display: flex; flex-direction: column; gap: 4px; }
  h2 { font-size: 34px; line-height: 0.95; }
  .x { width: 36px; height: 36px; flex: none; border-radius: 50%; border: 0; background: var(--q-sub); font-size: 20px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: -4px; }
  .estado { display: inline-flex; align-items: center; height: 30px; padding: 0 12px; border-radius: 8px; font-size: 13.5px; font-weight: 800; }
  .estado.libre { border: 1.5px dashed rgba(14, 27, 51, 0.3); }
  .estado.apartada { background: var(--q-accs); border: 2px solid var(--q-acc); }
  .estado.pagada { background: var(--c-pagada); color: #fff; }
  .estado.clase { background: var(--c-clase-g); color: #fff; }
  .estado.bloqueada { background: repeating-linear-gradient(135deg, rgba(14, 27, 51, 0.08) 0 6px, rgba(14, 27, 51, 0.02) 6px 12px); }
  .datos { margin: 0; border: var(--c-borde); border-radius: 14px; overflow: hidden; }
  .datos div { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; font-size: 14px; }
  .datos div + div { border-top: var(--c-borde); }
  dt { font-weight: 700; color: var(--q-tx2); font-size: 13px; }
  dd { margin: 0; font-weight: 800; text-align: right; }
  dd.acc { color: var(--q-acct); }
  dd.ok { color: var(--c-verde); }
  .precio { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: var(--c-borde); border-radius: 14px; }
  .precio span { flex: 1; font-weight: 700; color: var(--q-tx2); font-size: 13px; }
  .precio b { font-size: 26px; }
  .mm { width: 32px; height: 32px; border-radius: 50%; border: 0; background: var(--q-sub); font-weight: 900; font-size: 16px; }
  .cuerpo { flex: 1; display: flex; flex-direction: column; gap: 14px; }
  section { display: flex; flex-direction: column; gap: 10px; }
  h3 { margin: 0; font-size: 11.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--q-tx2); }
  .jug { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .jug li { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700; padding: 6px 8px; border-radius: 10px; background: var(--q-bg); }
  .jug li.falta { color: var(--q-tx3); background: none; border: 1.5px dashed rgba(14, 27, 51, 0.2); }
  .av { width: 26px; height: 26px; border-radius: 50%; background: var(--q-acc); color: var(--q-acctx); font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .falta .av { background: var(--q-sub); color: var(--q-tx3); }
  .pedidos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .pedidos li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .res { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .acciones { display: flex; flex-direction: column; gap: 8px; }
  .grande { height: 48px; font-size: 15px; }
  .metodos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .confirma { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; padding: 8px 10px; border-radius: 10px; background: rgba(232, 71, 91, 0.1); }
  .confirma span { flex: 1; }
  .rojo { background: var(--c-error); color: #fff; }
  .error { color: var(--c-error); font-weight: 700; font-size: 13.5px; margin: 0; }
</style>
