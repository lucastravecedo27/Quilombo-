<script lang="ts">
  // Modo demo: QR para abrir la app del jugador y la del mesero en los celulares (misma red wifi que este Mac),
  // y reiniciar la demo en todos los equipos.
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';
  import { reiniciarDemo } from '$lib/app/hub';

  let { cerrar }: { cerrar: () => void } = $props();
  let urls = $state<string[]>([]);
  let base = $state('');
  let qrs = $state<{ jugador: string; mesero: string } | null>(null);
  let confirmar = $state(false);
  let reiniciando = $state(false);

  onMount(async () => {
    try {
      const r = await fetch('/__hub/red');
      if (r.ok && r.headers.get('content-type')?.includes('json')) urls = ((await r.json()) as { urls: string[] }).urls;
    } catch { /* sin central */ }
    base = urls[0] ?? location.origin;
  });
  $effect(() => {
    if (!base) return;
    const op = { width: 220, margin: 1, color: { dark: '#0e1b33', light: '#ffffff' } };
    void Promise.all([QRCode.toDataURL(`${base}/`, op), QRCode.toDataURL(`${base}/mesero`, op)]).then(([jugador, mesero]) => (qrs = { jugador, mesero }));
  });
  async function reiniciar() {
    reiniciando = true;
    await reiniciarDemo();
  }
  const teclas = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
</script>

<svelte:window onkeydown={teclas} />
<div class="fondo" role="presentation" onclick={cerrar}></div>
<div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-demo">
  <header>
    <h2 id="titulo-demo" class="c-titulo">Abrir en los celulares</h2>
    <button class="x" aria-label="Cerrar" onclick={cerrar}>×</button>
  </header>
  <p class="ayuda">Conecta los iPhone al mismo wifi que este Mac y escanea con la cámara. Todo lo que pase en un equipo aparece en los demás al instante.</p>
  {#if urls.length > 1}
    <div class="c-chips redes">
      {#each urls as u (u)}<button class="c-chip" class:on={base === u} onclick={() => (base = u)}>{u.replace('http://', '')}</button>{/each}
    </div>
  {/if}
  <div class="qrs">
    <figure>
      {#if qrs}<img src={qrs.jugador} alt="QR de la app del jugador" />{/if}
      <figcaption><b>📱 Jugador</b><span>{base}/</span></figcaption>
    </figure>
    <figure>
      {#if qrs}<img src={qrs.mesero} alt="QR de la app del mesero" />{/if}
      <figcaption><b>🧾 Mesero</b><span>{base}/mesero</span></figcaption>
    </figure>
  </div>
  {#if !urls.length}<p class="nota">No encontré la red local: abre la demo con <code>npm run demo</code> para usarla desde los celulares.</p>{/if}
  <footer>
    {#if confirmar}
      <span class="pregunta">¿Borrar todo lo que se hizo y volver a los datos de ejemplo en todos los equipos?</span>
      <button class="c-btn sec" onclick={() => (confirmar = false)}>No</button>
      <button class="c-btn peligro" disabled={reiniciando} onclick={reiniciar}>{reiniciando ? 'Reiniciando…' : 'Sí, reiniciar'}</button>
    {:else}
      <button class="c-btn peligro" onclick={() => (confirmar = true)}>Reiniciar demo</button>
      <button class="c-btn noche" onclick={cerrar}>Listo</button>
    {/if}
  </footer>
</div>

<style>
  .fondo { position: fixed; inset: 0; background: rgba(10, 18, 38, 0.45); z-index: 60; }
  .modal { position: fixed; z-index: 61; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 620px; max-width: calc(100vw - 40px); background: #fff; border: 1px solid var(--q-borde); border-radius: 20px; padding: 24px 26px 20px; box-shadow: 0 30px 80px rgba(14, 27, 51, 0.35); }
  header { display: flex; align-items: center; justify-content: space-between; }
  h2 { font-size: 30px; }
  .x { width: 34px; height: 34px; border-radius: 8px; border: 0; background: var(--q-sub); font-size: 20px; }
  .ayuda { color: var(--q-tx2); font-size: 14px; line-height: 1.45; margin: 8px 0 14px; }
  .redes { margin-bottom: 12px; }
  .qrs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  figure { margin: 0; padding: 16px; border: 1px solid var(--q-line); border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
  img { width: 200px; height: 200px; }
  figcaption { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  figcaption b { font-size: 16px; }
  figcaption span { font-size: 12.5px; color: var(--q-tx2); font-family: ui-monospace, monospace; }
  .nota { font-size: 13px; color: var(--q-wrn); background: var(--q-wrnbg); padding: 8px 12px; border-radius: 8px; }
  footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 18px; }
  .pregunta { flex: 1; font-size: 13.5px; font-weight: 600; }
</style>
