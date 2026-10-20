<script lang="ts">
  // Lector de QR con la cámara (iPhone, Android o la cámara del Mac). Usa el lector nativo del navegador si existe
  // (BarcodeDetector) y si no, jsQR. La cámara solo funciona en contexto seguro: https (`npm run demo`) o localhost.
  // Sin cámara avisa y la pantalla que lo usa ofrece digitar el código.
  import jsQR from 'jsqr';

  let { onleer, frontal = false }: { onleer: (texto: string) => void; frontal?: boolean } = $props();

  type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  const hayCamara = typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

  let video = $state<HTMLVideoElement | null>(null);
  let estado = $state<'abriendo' | 'lista' | 'negada' | 'sin'>(hayCamara ? 'abriendo' : 'sin');

  $effect(() => {
    if (!hayCamara || !video) return;
    const v = video;
    let flujo: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let vivo = true;
    let ultimo = '';
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    const detector = BD ? new BD({ formats: ['qr_code'] }) : null;

    const leer = async () => {
      if (!vivo) return;
      try {
        if (v.readyState >= 2 && v.videoWidth) {
          let texto = '';
          if (detector) texto = (await detector.detect(v))[0]?.rawValue ?? '';
          else if (ctx) {
            const k = Math.min(1, 720 / v.videoWidth);
            lienzo.width = Math.round(v.videoWidth * k); lienzo.height = Math.round(v.videoHeight * k);
            ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
            const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
            // attemptBoth: también lee QR claros sobre fondo oscuro (pantallas en modo oscuro)
            texto = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data ?? '';
          }
          if (texto && texto !== ultimo) { ultimo = texto; navigator.vibrate?.(40); onleer(texto); setTimeout(() => (ultimo = ''), 2500); }
        }
      } catch { /* siguiente cuadro */ }
      timer = setTimeout(leer, 140);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: frontal ? 'user' : { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(async (s) => {
        if (!vivo) { s.getTracks().forEach((t) => t.stop()); return; }
        flujo = s;
        v.srcObject = s;
        await v.play().catch(() => undefined);
        estado = 'lista';
        void leer();
      })
      .catch(() => { estado = 'negada'; });
    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  });
</script>

{#if estado === 'sin' || estado === 'negada'}
  <p class="sin">
    {estado === 'negada' ? 'No hay permiso para la cámara: actívalo en Ajustes del navegador.' : 'La cámara necesita la demo segura (https). Abre la app con la dirección https://…'} Mientras tanto, digita el código.
  </p>
{:else}
  <div class="visor" class:espejo={frontal}>
    <video bind:this={video} playsinline muted autoplay></video>
    <span class="marco" aria-hidden="true"></span>
    {#if estado !== 'lista'}<span class="abriendo">Abriendo la cámara…</span>{/if}
  </div>
{/if}

<style>
  .visor { position: relative; aspect-ratio: 1; max-height: 46dvh; width: 100%; margin: 0 auto; border-radius: 14px; overflow: hidden; background: #000; }
  .visor video { width: 100%; height: 100%; object-fit: cover; }
  .espejo video { transform: scaleX(-1); }
  .marco { position: absolute; inset: 16%; border: 4px solid var(--q-naranja); border-radius: 14px; box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.35); }
  .abriendo { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
  .sin { margin: 0; padding: 12px 14px; border-radius: 10px; background: var(--q-wrnbg); color: var(--q-tx); font-size: 15px; font-weight: 600; line-height: 1.35; }
</style>
