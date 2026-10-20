// El comprobante de pago (foto o captura): se comprime y se reduce a ~900 px para guardarlo como imagen en la fila
// de la inscripción (en la demo no hay almacenamiento de archivos).
import { comprimir } from '../../data/fotos';

export async function comprobanteDesde(archivo: Blob, lado = 900): Promise<string> {
  const blob = await comprimir(archivo);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * escala));
    c.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.75);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** El color de la portada de un torneo (fijo para cada torneo): ladrillo, lila, verde cancha o azul cancha */
const COLORES_TORNEO = ['#c2410c', '#3346a8', '#18895b', '#1e7fd0'];
export function colorTorneo(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORES_TORNEO[h % COLORES_TORNEO.length];
}
