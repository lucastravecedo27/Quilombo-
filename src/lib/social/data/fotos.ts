// Fotos del módulo social: comprimir antes de subir (< 500 KB) y promesas con tope de tiempo.
const MAX_BYTES = 500 * 1024;

/** Una promesa que no puede quedarse colgada: si no termina en `ms`, falla con `mensaje` */
export function conTiempo<T>(p: PromiseLike<T>, ms: number, mensaje: string): Promise<T> {
  let h: ReturnType<typeof setTimeout>;
  return Promise.race([Promise.resolve(p), new Promise<never>((_, no) => { h = setTimeout(() => no(new Error(mensaje)), ms); })]).finally(() => clearTimeout(h));
}

/**
 * Abre la imagen. createImageBitmap falla con algunas fotos del iPhone (HEIC, iOS viejos): entonces se usa una <img>.
 * Si ninguna la abre, el error lo dice (antes se quedaba "Subiendo…").
 */
async function abrirImagen(archivo: Blob): Promise<{ fuente: CanvasImageSource; ancho: number; alto: number; soltar: () => void }> {
  try {
    const b = await createImageBitmap(archivo);
    return { fuente: b, ancho: b.width, alto: b.height, soltar: () => b.close() };
  } catch {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { URL.revokeObjectURL(url); throw new Error('Esa foto no se pudo abrir. Prueba con otra o tómala de nuevo.'); }
    return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, soltar: () => URL.revokeObjectURL(url) };
  }
}

/** Comprime una imagen a JPEG < 500 KB (reduce lado mayor y calidad progresivamente) */
export async function comprimir(archivo: Blob): Promise<Blob> {
  const img = await abrirImagen(archivo);
  if (!img.ancho || !img.alto) { img.soltar(); throw new Error('Esa foto no se pudo abrir. Prueba con otra o tómala de nuevo.'); }
  let lado = 1600;
  let calidad = 0.82;
  try {
    for (let intento = 0; intento < 8; intento++) {
      const escala = Math.min(1, lado / Math.max(img.ancho, img.alto));
      const c = document.createElement('canvas');
      c.width = Math.round(img.ancho * escala);
      c.height = Math.round(img.alto * escala);
      c.getContext('2d')!.drawImage(img.fuente, 0, 0, c.width, c.height);
      // En el iPhone toBlob puede devolver null (sin memoria): es un error, no un blob vacío
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', calidad));
      c.width = c.height = 0; // libera la memoria del lienzo ya (Safari la retiene)
      if (!blob) throw new Error('El iPhone no pudo preparar la foto. Cierra otras apps e inténtalo de nuevo.');
      if (blob.size <= MAX_BYTES) return blob;
      calidad = Math.max(0.5, calidad - 0.1);
      lado = Math.round(lado * 0.85);
    }
  } finally {
    img.soltar();
  }
  throw new Error('No se pudo comprimir la imagen por debajo de 500 KB');
}
