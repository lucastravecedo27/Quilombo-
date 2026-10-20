<script lang="ts">
  // Dividir entre tarjetas Quilombo en el acto: los que están en la mesa muestran su QR (o dicen su código) y el
  // total se descuenta de su saldo — mitad y mitad, iguales o por montos (con una sola tarjeta, todo a esa persona).
  // Si a alguno no le alcanza no se le cobra a nadie. Sirve para un pedido que ya existe (ref), para uno nuevo
  // (crear() lo crea justo antes de cobrar) o, desde la pestaña Tarjetas (libre), eligiendo el pedido sin pagar.
  import { db } from '$lib/data/db';
  import { cancelarPedido, dividirEnElActo, pedidos, perfilDeTarjeta, saldoQuilombo, tarjetaDe } from '$lib/club/app/club';
  import { CLUB_DEMO, leerCodigoCuenta, type Pedido } from '$lib/club/domain/club';
  import { partesIguales } from '$lib/club/domain/billetera';
  import { diaColombia, pesos } from '$lib/social/domain/jugar';
  import { iniciales, m } from './estado.svelte';
  import Visor from './Visor.svelte';
  import CodigoTarjeta from './CodigoTarjeta.svelte';

  let { total = 0, ref = null, crear = null, libre = false, titulo = 'Dividir entre tarjetas', sub = '', onCerrar, onListo }: {
    total?: number;
    /** Pedido que ya existe */
    ref?: string | null;
    /** Crea el pedido nuevo (a nombre de los que pagan) y devuelve su id (o un error) */
    crear?: ((aNombreDe: string) => Promise<{ id?: string; error?: string }>) | null;
    /** Desde la pestaña Tarjetas: se elige el pedido sin pagar a dividir */
    libre?: boolean;
    titulo?: string;
    sub?: string;
    onCerrar: () => void;
    onListo: () => void;
  } = $props();

  interface Persona { uid: string; nombre: string; color: string; codigo: string }
  let personas = $state<Persona[]>([]);
  let fuera = $state<string[]>([]);
  let modo = $state<'mitad' | 'iguales' | 'montos'>('iguales');
  let montos = $state<Record<string, number>>({});
  let agregando = $state(true);
  let error = $state('');
  let ocupado = $state(false);
  let hecho = $state(false);
  let elegido = $state<string | null>(null);
  /** Lo cobrado (para seguir mostrándolo después de pagar, cuando el pedido ya no está "sin pagar") */
  let foto = $state<{ monto: number; sub: string; partes: Record<string, number> } | null>(null);

  // Libre: los pedidos de hoy que faltan por pagar
  const sinPagar = $derived(libre ? pedidos().filter((p) => diaColombia(p.created_at) === diaColombia(new Date().toISOString()) && !p.pagado_en && p.estado !== 'pagado' && p.estado !== 'cancelado' && !p.cuenta_id) : []);
  const pedidoLibre = $derived(sinPagar.find((p) => p.id === elegido) ?? null);
  const monto = $derived(libre ? pedidoLibre?.total ?? 0 : total);
  const refFinal = $derived(libre ? pedidoLibre?.id ?? null : ref);
  const subFinal = $derived(libre ? (pedidoLibre ? `Pedido #${pedidoLibre.numero} · ${pedidoLibre.ubicacion} · ${pesos(pedidoLibre.total)}` : 'Elige qué cuenta se divide') : sub || `Total ${pesos(total)}`);

  function agregar(texto: string) {
    const c = leerCodigoCuenta(texto);
    const p = c ? perfilDeTarjeta(c) : null;
    if (!p) { error = c ? `Ninguna tarjeta tiene el código ${c}` : 'Ese QR no es una tarjeta Quilombo'; return; }
    const uid = p.user_id as string;
    error = '';
    hecho = false;
    if (personas.some((x) => x.uid === uid)) { fuera = fuera.filter((x) => x !== uid); return; }
    personas = [...personas, { uid, nombre: p.nombre as string, color: (p.color as string) || '#1e7fd0', codigo: tarjetaDe(uid) }];
    navigator.vibrate?.(40);
    if (personas.length >= 2) agregando = false;
  }
  const alternar = (uid: string) => { hecho = false; fuera = fuera.includes(uid) ? fuera.filter((x) => x !== uid) : [...fuera, uid]; };

  const activos = $derived(personas.filter((x) => !fuera.includes(x.uid)));
  // Mitad y mitad solo tiene sentido con dos
  $effect.pre(() => { if (modo === 'mitad' && activos.length !== 2) modo = 'iguales'; });
  const iguales = $derived(partesIguales(monto, activos.length));
  const partes = $derived(activos.map((x, i) => ({ user_id: x.uid, monto: modo === 'montos' ? Math.max(0, Math.round(montos[x.uid] ?? 0)) : iguales[i] })));
  const asignado = $derived(partes.reduce((s, p) => s + p.monto, 0));
  const saldos = $derived(Object.fromEntries(personas.map((x) => [x.uid, saldoQuilombo(x.uid)])));
  const sinSaldo = $derived(partes.filter((p) => (saldos[p.user_id] ?? 0) < p.monto));
  const listo = $derived(activos.length > 0 && monto > 0 && asignado === monto && !sinSaldo.length && !ocupado && (!!refFinal || !!crear));

  function aMontos() {
    modo = 'montos';
    montos = Object.fromEntries(activos.map((x, i) => [x.uid, iguales[i] ?? 0]));
  }

  async function cobrar() {
    if (hecho) { onListo(); return; }
    if (!listo) return;
    ocupado = true;
    // Foto de lo que se cobra antes de cobrar (al pagarse, el pedido sale de "sin pagar")
    foto = { monto, sub: subFinal, partes: Object.fromEntries(partes.map((x) => [x.user_id, x.monto])) };
    let id = refFinal;
    let creado = false;
    if (!id && crear) {
      const r = await crear(activos.map((x) => x.nombre.split(' ')[0]).join(' y '));
      if (r.error || !r.id) { ocupado = false; error = r.error ?? 'No se pudo crear el pedido'; return; }
      id = r.id; creado = true;
    }
    if (!id) { ocupado = false; return; }
    const p = (await db.club_pedidos.get(id)) as Pedido | undefined;
    const err = await dividirEnElActo({ tipo: 'pedido', ref: id, total: foto.monto, concepto: `Pedido #${p?.numero ?? ''}`.trim(), partes, club: p?.club_id ?? CLUB_DEMO, mesero: m.yo });
    ocupado = false;
    if (err) {
      if (creado) await cancelarPedido(id);
      error = err;
      return;
    }
    hecho = true;
    m.avisar(activos.length === 1 ? `Pagado con saldo ✓ · ${activos[0].nombre.split(' ')[0]}` : `Pagado entre ${activos.length} con saldo ✓`);
  }
</script>

<div class="m-fondo arriba" role="presentation" onclick={onCerrar}></div>
<div class="m-hoja arriba" role="dialog" aria-modal="true" aria-label={titulo}>
  <div class="m-agarre"></div>
  <div class="m-hoja-cab">
    <span><b class="m-titulo">{titulo}</b><small>{hecho && foto ? `${foto.sub} · pagado ✓` : subFinal}</small></span>
    <button class="m-x" onclick={onCerrar} aria-label="Cerrar">✕</button>
  </div>

  <div class="cuerpo">
    {#if libre && !hecho}
      <div class="m-over">¿Qué cuenta se divide?</div>
      {#if sinPagar.length}
        <div class="pedidos">
          {#each sinPagar as p (p.id)}
            <button class:on={elegido === p.id} onclick={() => { elegido = p.id; hecho = false; }}>
              <b class="m-titulo">{p.ubicacion}</b><small>#{p.numero} · {p.cliente}</small><span class="m-num">{pesos(p.total)}</span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="vacio">No hay pedidos sin pagar. Tómalo en Nuevo y divídelo al cobrar.</div>
      {/if}
    {/if}

    <div class="m-over">Tarjetas {personas.length ? `· ${activos.length} pagan` : ''}</div>
    <div class="caras">
      {#each personas as x (x.uid)}
        {@const on = !fuera.includes(x.uid)}
        <button class="cara" style="opacity:{on ? 1 : 0.4}" onclick={() => alternar(x.uid)} aria-pressed={on} aria-label="{on ? 'Sacar' : 'Incluir'} a {x.nombre}">
          <span class="ini" class:on style="background:{x.color}">{iniciales(x.nombre)}</span>
          <small>{x.nombre.split(' ')[0]}</small>
        </button>
      {/each}
      {#if personas.length}
        <button class="cara" onclick={() => (agregando = !agregando)} aria-expanded={agregando} aria-label={agregando ? 'Ocultar el lector' : 'Agregar tarjeta'}>
          <span class="ini mas">{agregando ? '✓' : '＋'}</span><small>{agregando ? 'Ocultar' : 'Agregar'}</small>
        </button>
      {:else}
        <span class="pista">Escanea la tarjeta de cada uno o digita su código</span>
      {/if}
    </div>

    {#if agregando}
      <div class="agregar">
        <Visor alto={200} onleer={agregar} />
        <CodigoTarjeta onCodigo={agregar} />
      </div>
    {/if}
    {#if error}<p class="m-error" role="alert">{error}</p>{/if}

    {#if activos.length}
      <div class="m-seg">
        <button class:on={modo === 'mitad'} disabled={activos.length !== 2} onclick={() => (modo = 'mitad')}>Mitad y mitad</button>
        <button class:on={modo === 'iguales'} onclick={() => (modo = 'iguales')}>Iguales</button>
        <button class:on={modo === 'montos'} disabled={activos.length < 2} onclick={aMontos}>Montos</button>
      </div>
      <div class="partes">
        {#each activos as x, i (x.uid)}
          {@const parte = hecho && foto ? foto.partes[x.uid] ?? 0 : partes[i]?.monto ?? 0}
          {@const saldo = saldos[x.uid] ?? 0}
          <div class="parte">
            <span class="ini chico" style="background:{x.color}">{iniciales(x.nombre)}</span>
            <span class="nom">
              <b>{x.nombre}</b>
              {#if hecho}<small class="ok">✓ Pagado con saldo</small>
              {:else if saldo < parte}<small class="rojo">✖ Saldo insuficiente · que recargue</small>
              {:else}<small>{x.codigo} · saldo {pesos(saldo)}</small>{/if}
            </span>
            {#if modo === 'montos' && !hecho}
              <input class="monto" type="number" inputmode="numeric" min="0" step="100" value={montos[x.uid] ?? 0} oninput={(e) => (montos = { ...montos, [x.uid]: Number((e.currentTarget as HTMLInputElement).value) })} aria-label="Monto de {x.nombre}" />
            {:else}
              <b class="m-num cifra">{pesos(parte)}</b>
            {/if}
          </div>
        {/each}
      </div>
      {#if !hecho && asignado !== monto && monto > 0}<p class="m-error">{asignado < monto ? `Falta asignar ${pesos(monto - asignado)}` : `Sobran ${pesos(asignado - monto)}`}</p>{/if}
    {/if}

    <button class="m-btn" disabled={!hecho && !listo} onclick={cobrar}>
      {hecho ? 'Listo' : ocupado ? 'Cobrando…' : activos.length > 1 ? `Cobrar a cada uno · ${pesos(monto)}` : `Cobrar ${pesos(monto)} con saldo`}
    </button>
  </div>
</div>

<style>
  .arriba.m-fondo { z-index: 62; }
  .arriba.m-hoja { z-index: 63; max-height: 94dvh; }
  .cuerpo { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
  .pedidos { display: flex; flex-direction: column; gap: 6px; }
  .pedidos button { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; align-items: center; column-gap: 10px; padding: 10px 14px; border: 2px solid var(--q-line); border-radius: 14px; background: var(--q-card); text-align: left; }
  .pedidos button.on { border-color: var(--q-acc); background: var(--q-accs); }
  .pedidos b { font-size: 24px; }
  .pedidos small { grid-row: 2; font-size: 13px; font-weight: 700; color: var(--q-tx2); }
  .pedidos span { grid-row: 1 / 3; grid-column: 2; font-size: 26px; }
  .vacio { padding: 14px; border-radius: 14px; border: 1.5px dashed var(--q-borde); text-align: center; font-size: 14.5px; color: var(--q-tx2); }
  .caras { display: flex; gap: 10px; flex-wrap: wrap; }
  .cara { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0; border: 0; background: none; }
  .cara small { font-size: 12.5px; font-weight: 800; }
  .ini { width: 56px; height: 56px; border-radius: 28px; color: #fff; font-weight: 900; font-size: 17px; display: flex; align-items: center; justify-content: center; }
  .ini.on { box-shadow: 0 0 0 3px var(--q-card), 0 0 0 5px var(--q-acc); }
  .ini.mas { background: none; border: 2px dashed var(--q-borde); color: var(--q-tx2); font-size: 24px; }
  .ini.chico { width: 38px; height: 38px; flex: none; border-radius: 19px; font-size: 13px; }
  .agregar { display: flex; flex-direction: column; gap: 8px; }
  .pista { font-size: 14px; color: var(--q-tx2); font-weight: 600; }
  .partes { border-radius: 16px; border: 1px solid var(--q-line); overflow: hidden; }
  .parte { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
  .parte + .parte { border-top: 1px solid var(--q-line); }
  .nom { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .nom b { font-size: 15.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nom small { font-size: 12.5px; font-weight: 800; color: var(--q-tx2); }
  .nom small.ok { color: var(--q-ok); }
  .nom small.rojo { color: #d42a3a; }
  .cifra { font-size: 26px; }
  .monto { width: 110px; height: 44px; padding: 0 8px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-size: 17px; font-weight: 800; text-align: right; }
</style>
