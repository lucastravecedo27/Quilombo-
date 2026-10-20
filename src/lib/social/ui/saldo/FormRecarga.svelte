<script lang="ts">
  // Recargar saldo Quilombo (demo): cuánto (montos rápidos u otro) y con qué (PSE con su banco, tarjeta o Nequi);
  // "Procesando…" y el saldo queda cargado. La pasarela real (Wompi/PSE) queda pendiente.
  import { toque } from '$lib/ui/tema.svelte';
  import { recargar } from '$lib/club/app/club';
  import { RECARGAS_RAPIDAS, type MetodoRecarga } from '$lib/club/domain/billetera';
  import { yo } from '../../app/vinculos';
  import { pesos } from '../../domain/jugar';

  let { sugerido = 0, onlisto }: { sugerido?: number; onlisto: (monto: number, metodo: MetodoRecarga) => void } = $props();

  const BANCOS = ['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá', 'Banco de Occidente', 'Banco Popular', 'Scotiabank Colpatria', 'Nequi', 'Daviplata', 'Nu Colombia'];
  /** Lo que falta, redondeado a los $10.000 de arriba (mínimo $10.000) */
  const minimo = $derived(sugerido > 0 ? Math.max(10_000, Math.ceil(sugerido / 10_000) * 10_000) : 0);
  const opciones = $derived([...new Set([...(minimo ? [minimo] : []), ...RECARGAS_RAPIDAS])].sort((a, b) => a - b).slice(0, 5));
  let monto = $state(0);
  let otro = $state('');
  let metodo = $state<MetodoRecarga>('pse');
  let banco = $state('Bancolombia');
  let fase = $state<'elegir' | 'procesando'>('elegir');
  let error = $state('');
  $effect.pre(() => { if (!monto) monto = minimo || 200_000; });

  const valor = $derived(otro ? Math.round(Number(otro.replace(/\D/g, ''))) : monto);
  const valido = $derived(valor >= 10_000 && valor <= 5_000_000 && (!minimo || valor >= minimo));

  async function hacer() {
    if (!valido || fase !== 'elegir') return;
    toque(8);
    fase = 'procesando'; error = '';
    await new Promise((r) => setTimeout(r, 1500));
    const err = await recargar(yo(), valor, metodo);
    fase = 'elegir';
    if (err) { error = err; return; }
    toque(20);
    onlisto(valor, metodo);
  }
</script>

<div class="recarga">
  <p class="lbl">¿Cuánto recargas?</p>
  <div class="montos" role="radiogroup" aria-label="Monto a recargar">
    {#each opciones as m (m)}
      <button role="radio" aria-checked={!otro && monto === m} class:on={!otro && monto === m} onclick={() => { toque(4); monto = m; otro = ''; }}>{pesos(m)}</button>
    {/each}
  </div>
  <input class="q-input otro" inputmode="numeric" placeholder="Otro valor" aria-label="Otro valor" value={otro} oninput={(e) => (otro = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, ''))} />
  {#if minimo}<small class="nota">Te faltan {pesos(sugerido)}: recarga al menos {pesos(minimo)}.</small>{/if}

  <p class="lbl">Con qué</p>
  <div class="metodos" role="radiogroup" aria-label="Medio de recarga">
    <button role="radio" aria-checked={metodo === 'pse'} class:on={metodo === 'pse'} onclick={() => { toque(4); metodo = 'pse'; }}><span class="marca" style="background:#0f5aa8">PSE</span><span class="txt"><b>PSE</b><small>Débito desde tu banco</small></span><span class="radio" aria-hidden="true"></span></button>
    {#if metodo === 'pse'}
      <select class="q-input banco" bind:value={banco} aria-label="Banco">{#each BANCOS as b (b)}<option value={b}>{b}</option>{/each}</select>
    {/if}
    <button role="radio" aria-checked={metodo === 'tarjeta'} class:on={metodo === 'tarjeta'} onclick={() => { toque(4); metodo = 'tarjeta'; }}><span class="marca" style="background:#1a1f71">VISA</span><span class="txt"><b>Tarjeta</b><small>Visa •••• 4242</small></span><span class="radio" aria-hidden="true"></span></button>
    <button role="radio" aria-checked={metodo === 'nequi'} class:on={metodo === 'nequi'} onclick={() => { toque(4); metodo = 'nequi'; }}><span class="marca" style="background:#2b0a3d">N</span><span class="txt"><b>Nequi</b><small>300 ••• 4521</small></span><span class="radio" aria-hidden="true"></span></button>
  </div>
  {#if error}<p class="err">{error}</p>{/if}
  <button class="q-btn bloque ir" disabled={!valido || fase === 'procesando'} onclick={hacer}>
    {#if fase === 'procesando'}<span class="spin" aria-hidden="true"></span>{metodo === 'pse' ? `Conectando con ${banco}…` : 'Procesando…'}{:else}Recargar {valido ? pesos(valor) : ''}{/if}
  </button>
  <p class="seguro">🔒 Demo: no se cobra dinero real</p>
</div>

<style>
  .lbl { margin: 12px 0 6px; font-size: 13px; font-weight: 800; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.06em; }
  .montos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .montos button { height: 46px; border: 1.5px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); font-weight: 800; font-size: 15px; font-variant-numeric: tabular-nums; }
  .montos button.on { border-color: var(--q-acc); background: var(--q-acc); color: var(--q-acctx); }
  .otro { margin-top: 8px; }
  .nota { display: block; margin-top: 6px; font-size: 13px; color: var(--q-tx2); }
  .metodos { display: flex; flex-direction: column; gap: 8px; }
  .metodos button { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: 1.5px solid var(--q-line); background: var(--q-card); color: var(--q-tx); text-align: left; }
  .metodos button.on { border-color: var(--q-acc); }
  .marca { width: 46px; height: 32px; border-radius: 6px; color: #fff; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; font-style: italic; flex-shrink: 0; }
  .txt { flex: 1; display: flex; flex-direction: column; }
  .txt b { font-size: 16px; }
  .txt small { font-size: 13px; color: var(--q-tx2); }
  .radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--q-tx3); box-sizing: border-box; }
  .on .radio { border: 6px solid var(--q-acc); }
  .banco { height: 46px; font-size: 16px; }
  .err { color: var(--q-alr); font-size: 14px; }
  .ir { margin-top: 14px; }
  .seguro { margin: 8px 0 0; text-align: center; font-size: 12.5px; color: var(--q-tx2); }
  .spin { width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid rgba(255, 255, 255, 0.35); border-top-color: #fff; animation: girar 0.8s linear infinite; }
  @keyframes girar { to { transform: rotate(360deg); } }
</style>
