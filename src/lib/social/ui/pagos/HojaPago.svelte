<script lang="ts">
  // Pagar en la app (demo). Primero el saldo Quilombo (si alcanza, va elegido); si no alcanza, se recarga ahí mismo y
  // se sigue. También Nequi, PSE o tarjeta: "Procesando…" y aprobado. Al aprobarse se hace la acción del cobro (pagar
  // la cancha, el pedido o la inscripción) con el medio elegido. La pasarela real (Wompi) queda pendiente.
  import { untrack } from 'svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui, type Cobro } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { saldoQuilombo } from '$lib/club/app/club';
  import { yo } from '../../app/vinculos';
  import { pesos } from '../../domain/jugar';
  import FormRecarga from '../saldo/FormRecarga.svelte';

  type Metodo = 'saldo' | 'nequi' | 'pse' | 'tarjeta';
  const METODOS: { id: Exclude<Metodo, 'saldo'>; nombre: string; sub: string; marca: string; color: string }[] = [
    { id: 'nequi', nombre: 'Nequi', sub: '300 ••• 4521', marca: 'N', color: '#2b0a3d' },
    { id: 'pse', nombre: 'PSE', sub: 'Bancolombia · ahorros', marca: 'PSE', color: '#0f5aa8' },
    { id: 'tarjeta', nombre: 'Tarjeta', sub: 'Visa •••• 4242', marca: 'VISA', color: '#1a1f71' }
  ];

  let abierto = $state(false);
  let cobro = $state<Cobro | null>(null);
  let metodo = $state<Metodo>('saldo');
  let fase = $state<'elegir' | 'recargar' | 'procesando' | 'listo'>('elegir');
  let error = $state('');
  let referencia = $state('');
  const saldo = $derived(saldoQuilombo(yo()));
  const alcanza = $derived(!!cobro && saldo >= cobro.monto);

  $effect(() => {
    const c = ui.pagar;
    if (!c) return;
    // Solo cuando llega un cobro nuevo (no cuando cambia el saldo por este mismo pago)
    untrack(() => {
      cobro = c; fase = 'elegir'; error = ''; abierto = true;
      metodo = saldoQuilombo(yo()) >= c.monto ? 'saldo' : 'nequi';
    });
  });

  async function pagar() {
    if (!cobro || fase !== 'elegir' || (metodo === 'saldo' && !alcanza)) return;
    toque(8);
    fase = 'procesando'; error = '';
    await new Promise((r) => setTimeout(r, metodo === 'saldo' ? 700 : 1500));
    const err = await cobro.accion(metodo === 'saldo' ? 'saldo' : 'app');
    if (err) { fase = 'elegir'; error = err; return; }
    referencia = 'QLB-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    toque(20);
    fase = 'listo';
  }
  const nombreMetodo = (m: Metodo) => (m === 'saldo' ? 'Saldo Quilombo' : METODOS.find((x) => x.id === m)?.nombre ?? '');
</script>

<Hoja bind:abierto titulo={fase === 'listo' ? 'Pago aprobado' : fase === 'recargar' ? 'Recargar saldo' : 'Pagar'} sub={fase === 'listo' || fase === 'elegir' ? '' : cobro?.concepto ?? ''} alCerrar={() => (ui.pagar = null)}>
  {#if cobro}
    {#if fase === 'listo'}
      <div class="ok" role="status">
        <span class="chulo q-pop"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></span>
        <b>{pesos(cobro.monto)}</b>
        <span>{nombreMetodo(metodo)}{metodo === 'saldo' ? ` · te quedan ${pesos(saldo)}` : ''}</span>
        <small>{cobro.listo ?? '¡Listo! Ya quedó pagado.'}</small>
        <small>Referencia {referencia}</small>
      </div>
    {:else if fase === 'recargar'}
      <button class="volver" onclick={() => (fase = 'elegir')}>‹ Volver al pago</button>
      <FormRecarga sugerido={cobro.monto - saldo} onlisto={() => { metodo = 'saldo'; fase = 'elegir'; }} />
    {:else if fase === 'procesando'}
      <div class="proc" role="status"><i class="spin-g" aria-hidden="true"></i><b>Procesando…</b></div>
    {:else}
      <div class="monto">
        <small>{cobro.concepto}</small>
        <b>{pesos(cobro.monto)}</b>
        {#if cobro.detalle}<span>{cobro.detalle}</span>{/if}
      </div>
      <div class="metodos" role="radiogroup" aria-label="Medio de pago">
        <button role="radio" aria-checked={metodo === 'saldo'} class:on={metodo === 'saldo'} onclick={() => { toque(4); metodo = 'saldo'; }}>
          <span class="sigla q" aria-hidden="true">Q</span>
          <span class="txt"><b>Saldo Quilombo</b><small class:falta={!alcanza}>{alcanza ? `Disponible ${pesos(saldo)} · te quedan ${pesos(saldo - cobro.monto)}` : `Disponible ${pesos(saldo)}`}</small></span>
          <span class="radio" aria-hidden="true"><i></i></span>
        </button>
        {#each METODOS as m (m.id)}
          <button role="radio" aria-checked={metodo === m.id} class:on={metodo === m.id} onclick={() => { toque(4); metodo = m.id; }}>
            <span class="sigla" style="background:{m.color}" aria-hidden="true">{m.marca}</span>
            <span class="txt"><b>{m.nombre}</b><small>{m.sub}</small></span>
            <span class="radio" aria-hidden="true"><i></i></span>
          </button>
        {/each}
      </div>
      {#if !alcanza}
        <div class="faltan"><b>Te faltan {pesos(cobro.monto - saldo)}</b><button onclick={() => { toque(); fase = 'recargar'; }}>Recargar</button></div>
      {/if}
      {#if error}<p class="err">{error}</p>{/if}
      <p class="seguro">🔒 Pago seguro · demo, no se cobra dinero real</p>
    {/if}
  {/if}
  {#snippet pie()}
    {#if fase === 'listo'}
      <button class="q-btn bloque noche" onclick={() => (abierto = false)}>¡Listo!</button>
    {:else if fase === 'elegir'}
      <button class="q-btn bloque" disabled={metodo === 'saldo' && !alcanza} onclick={pagar}>Pagar {cobro ? pesos(cobro.monto) : ''}{metodo === 'saldo' ? ' con saldo' : ''}</button>
    {/if}
  {/snippet}
</Hoja>

<style>
  .monto { display: flex; flex-direction: column; margin-bottom: 14px; }
  .monto small { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; color: var(--q-tx2); text-transform: uppercase; }
  .monto b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 56px; line-height: 1; }
  .monto span { font-size: 13.5px; color: var(--q-tx2); }
  .metodos { display: flex; flex-direction: column; border-radius: 16px; border: 1px solid var(--q-line); overflow: hidden; }
  .metodos button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 13px 14px; border: 0; background: var(--q-card); color: var(--q-tx); text-align: left; }
  .metodos button + button { border-top: 1px solid var(--q-line); }
  .metodos button.on { background: var(--q-accs); }
  .sigla { width: 38px; height: 38px; flex: none; border-radius: 10px; color: #fff; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 15px; display: flex; align-items: center; justify-content: center; }
  .sigla.q { background: var(--q-acc); color: var(--q-acctx); font-size: 20px; }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .txt b { font-size: 15px; }
  .txt small { font-size: 12.5px; color: var(--q-tx2); font-weight: 700; }
  .txt small.falta { color: var(--q-alr); }
  .radio { width: 22px; height: 22px; flex: none; border-radius: 11px; border: 2px solid var(--q-tx3); box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
  .radio i { width: 10px; height: 10px; border-radius: 5px; background: transparent; }
  .on .radio { border-color: var(--q-acc); }
  .on .radio i { background: var(--q-acc); }
  .faltan { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: #ffe9b8; color: #7a4e00; }
  .faltan b { font-size: 14px; }
  .faltan button { height: 34px; padding: 0 12px; border: 0; border-radius: 9px; background: #0e1b33; color: #fff; font-size: 13px; font-weight: 900; }
  .err { color: var(--q-alr); font-size: 14px; }
  .volver { border: 0; background: none; padding: 0 0 4px; color: var(--q-link); font-weight: 800; font-size: 15px; }
  .seguro { margin: 12px 0 0; text-align: center; font-size: 12.5px; color: var(--q-tx2); }
  .proc { height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
  .proc b { font-size: 17px; }
  .spin-g { width: 54px; height: 54px; border-radius: 50%; border: 5px solid var(--q-sub); border-top-color: var(--q-acc); box-sizing: border-box; animation: q-gira 0.8s linear infinite; }
  .ok { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0 4px; text-align: center; }
  .chulo { width: 76px; height: 76px; border-radius: 38px; background: var(--q-ok); color: #fff; display: flex; align-items: center; justify-content: center; }
  .ok b { font-family: var(--q-font-titulo); font-style: italic; font-size: 34px; font-weight: 900; margin-top: 6px; line-height: 1; }
  .ok span { font-size: 15px; color: var(--q-tx2); }
  .ok small { font-size: 13px; color: var(--q-tx2); }
  :global(.q-btn.noche) { background: #0e1b33; color: #fff; }
</style>
