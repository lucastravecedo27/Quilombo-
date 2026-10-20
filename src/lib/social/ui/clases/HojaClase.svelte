<script lang="ts">
  // Reservar una clase: tiquete lila con el día, la hora, el club y la cancha y el precio; individual o grupal; y el
  // pago (saldo Quilombo primero; si no alcanza, se recarga ahí mismo en la hoja de pago).
  import { untrack } from 'svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { saldoQuilombo } from '$lib/club/app/club';
  import { clase, clubDeClase, reservarClase } from '../../app/clases';
  import { franjaCompleta } from '../../app/jugar';
  import { nombreDe, yo } from '../../app/vinculos';
  import { puedoReservar, quedan } from '../../domain/clases';
  import { cuando, diaColombia, horaColombia, pesos } from '../../domain/jugar';
  import { nombreDia } from './fechas';

  let abierto = $state(false);
  let id = $state('');
  $effect(() => {
    const c = ui.clase;
    if (!c) return;
    untrack(() => { id = c.id; abierto = true; });
  });
  const c = $derived(id ? clase(id) : null);
  const club = $derived(c ? clubDeClase(c) : null);
  const cancha = $derived(c ? franjaCompleta(c.franja_id)?.cancha ?? null : null);
  const v = $derived(c ? puedoReservar(c, yo()) : { ok: false });
  const saldo = $derived(saldoQuilombo(yo()));

  function reservar() {
    if (!c || !v.ok) return;
    toque(8);
    const cid = c.id;
    const profe = nombreDe(c.profesor).split(' ')[0];
    abierto = false;
    ui.pagar = {
      concepto: `Clase con ${nombreDe(c.profesor)}`,
      detalle: `${cuando(c.inicio)} · ${club?.nombre ?? ''}`,
      monto: c.precio,
      listo: `¡Clase reservada con ${profe}! La cancha quedó a nombre de la clase.`,
      accion: (m) => reservarClase(cid, yo(), m)
    };
  }
</script>

<Hoja bind:abierto titulo="Reservar clase" sub={c ? `Con ${nombreDe(c.profesor)}` : ''} alCerrar={() => (ui.clase = null)}>
  {#if c}
    <div class="tiquete">
      <span class="izq">
        <small>{nombreDia(diaColombia(c.inicio)).toUpperCase()}</small>
        <b>{horaColombia(c.inicio)}</b>
        <span>{club?.nombre ?? 'Club'}{cancha ? ` · ${cancha.nombre}` : ''}</span>
      </span>
      <span class="der"><small>PRECIO</small><b>{pesos(c.precio)}</b></span>
    </div>
    <div class="tipo"><span>{c.tipo === 'individual' ? '👤 Individual' : `👥 Grupal · quedan ${quedan(c)} de ${c.cupos}`}</span><span>90 min</span></div>
    {#if c.nota}<p class="info">📝 {c.nota}</p>{/if}
    <p class="info">La cancha queda reservada en el club a nombre de la clase. Si cancelas, te devolvemos el saldo.</p>
    <p class="saldo">Tu saldo Quilombo: <b>{pesos(saldo)}</b>{saldo < c.precio ? ` · te faltan ${pesos(c.precio - saldo)} (puedes recargar al pagar)` : ''}</p>
    {#if !v.ok}<p class="err">{v.motivo}</p>{/if}
  {/if}
  {#snippet pie()}
    <button class="reservar" disabled={!c || !v.ok} onclick={reservar}>Reservar y pagar · {c ? pesos(c.precio) : ''}</button>
  {/snippet}
</Hoja>

<style>
  .tiquete { display: flex; align-items: stretch; border-radius: 16px; background: var(--q-lila); color: #fff; overflow: hidden; }
  .izq { flex: 1; min-width: 0; padding: 14px 16px; display: flex; flex-direction: column; }
  .izq small, .der small { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; opacity: 0.75; }
  .izq b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 36px; line-height: 1; }
  .izq span { font-size: 13px; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .der { padding: 14px 16px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; border-left: 1.5px dashed rgba(255, 255, 255, 0.25); }
  .der b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 30px; line-height: 1; white-space: nowrap; }
  .tipo { display: flex; justify-content: space-between; margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: var(--q-sub); font-size: 14px; font-weight: 700; }
  .info { margin: 12px 2px 0; font-size: 13.5px; line-height: 1.4; color: var(--q-tx2); }
  .saldo { margin: 8px 2px 0; font-size: 14px; color: var(--q-tx2); }
  .saldo b { color: var(--q-tx); }
  .err { color: var(--q-alr); font-weight: 700; font-size: 14px; }
  .reservar { width: 100%; height: 54px; border: 0; border-radius: 12px; background: var(--q-acc); color: var(--q-acctx); font-family: inherit; font-size: 16.5px; font-weight: 900; }
  .reservar:disabled { opacity: 0.4; }
</style>
