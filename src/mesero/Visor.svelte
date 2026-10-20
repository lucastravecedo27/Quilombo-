<script lang="ts">
  // El visor para escanear la tarjeta Quilombo: cuadro oscuro con esquinas del color de acento y una línea que
  // escanea. Adentro va la cámara (LectorQR) cuando el navegador la permite (https o localhost); si no, explica que
  // se digite el código (tocar el visor lleva al teclado).
  import LectorQR from '$lib/ui/LectorQR.svelte';

  let { onleer, alto = 280, onSinCamara }: { onleer: (texto: string) => void; alto?: number; onSinCamara?: () => void } = $props();
  const hayCamara = typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
</script>

<div class="visor-q" style="height:{alto}px;--m:{Math.min(190, alto - 70)}px">
  <span class="rayas" aria-hidden="true"></span>
  {#if hayCamara}
    <div class="capa"><LectorQR {onleer} /></div>
  {/if}
  <span class="marco" aria-hidden="true">
    <i class="e1"></i><i class="e2"></i><i class="e3"></i><i class="e4"></i>
    <i class="linea"></i>
  </span>
  {#if hayCamara}
    <span class="ayuda">Apunta al QR de la tarjeta en el celular del jugador</span>
  {:else}
    <button class="ayuda boton" onclick={() => onSinCamara?.()}>Sin cámara aquí (abre la demo con https) · digita el código abajo</button>
  {/if}
</div>

<style>
  .visor-q { position: relative; width: 100%; border-radius: 20px; background: #0a1226; overflow: hidden; }
  .rayas { position: absolute; inset: 0; background: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0 12px, transparent 12px 24px); }
  .visor-q .capa { position: absolute; inset: 0; }
  .visor-q .capa :global(.visor) { position: absolute; inset: 0; width: 100%; height: 100%; max-height: none; aspect-ratio: auto; border-radius: 0; background: #0a1226; }
  .visor-q .capa :global(.marco) { display: none; }
  .visor-q .capa :global(.abriendo) { align-items: flex-start; padding-top: 18px; font-size: 14px; }
  .visor-q .capa :global(.sin) { position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 2; padding: 10px 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.1); color: #fff; font-size: 13.5px; text-align: center; }
  .visor-q:has(:global(.sin)) .ayuda { display: none; }
  .visor-q:has(:global(.sin)) .marco { top: calc(50% - 36px); width: calc(var(--m) - 50px); height: calc(var(--m) - 50px); }
  .marco { position: absolute; left: 50%; top: calc(50% - 14px); width: var(--m); height: var(--m); transform: translate(-50%, -50%); pointer-events: none; }
  .marco i { position: absolute; width: 42px; height: 42px; border: 0 solid var(--q-accd); }
  .e1 { left: 0; top: 0; border-left-width: 6px !important; border-top-width: 6px !important; border-radius: 14px 0 0 0; }
  .e2 { right: 0; top: 0; border-right-width: 6px !important; border-top-width: 6px !important; border-radius: 0 14px 0 0; }
  .e3 { left: 0; bottom: 0; border-left-width: 6px !important; border-bottom-width: 6px !important; border-radius: 0 0 0 14px; }
  .e4 { right: 0; bottom: 0; border-right-width: 6px !important; border-bottom-width: 6px !important; border-radius: 0 0 14px 0; }
  .marco .linea { left: 10%; right: 10%; width: auto; height: 3px; border-radius: 2px; background: var(--q-accd); box-shadow: 0 0 18px var(--q-accd); animation: scan 2.4s ease-in-out infinite; }
  @keyframes scan { 0%, 100% { top: 14%; } 50% { top: 82%; } }
  .ayuda { position: absolute; left: 12px; right: 12px; bottom: 14px; color: #fff; font-size: 14.5px; font-weight: 700; opacity: 0.85; text-align: center; }
  .ayuda.boton { border: 0; background: none; padding: 0; }
  @media (prefers-reduced-motion: reduce) { .marco .linea { animation: none; top: 48%; } }
</style>
