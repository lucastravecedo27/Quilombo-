// Reportar y bloquear desde cualquier parte de la red (publicaciones, comentarios, mensajes, personas).
// Requisito de la App Store para contenido de usuarios.
import { f7 } from 'framework7-svelte';
import { ui } from '$lib/app/ui.svelte';
import { toque } from '$lib/ui/tema.svelte';
import { MOTIVOS_REPORTE, bloquear, reportar, type MotivoReporte } from '../app/social';

type Tipo = 'publicacion' | 'comentario' | 'mensaje' | 'persona';
const QUE: Record<Tipo, string> = { publicacion: 'esta publicación', comentario: 'este comentario', mensaje: 'este mensaje', persona: 'a esta persona' };

/** Pregunta el motivo y envía el reporte. alListo() corre si quedó reportado (para ocultarlo en pantalla). */
export function pedirReporte(tipo: Tipo, ref: string, alListo?: () => void) {
  f7.actions.create({
    buttons: [
      [{ text: `¿Por qué reportas ${QUE[tipo]}?`, label: true }, ...MOTIVOS_REPORTE.map((m) => ({ text: m.nombre, onClick: () => void enviar(tipo, ref, m.id, alListo) }))],
      [{ text: 'Cancelar' }]
    ]
  }).open();
}
async function enviar(tipo: Tipo, ref: string, motivo: MotivoReporte, alListo?: () => void) {
  const error = await reportar(tipo, ref, motivo);
  if (error) { ui.avisar({ titulo: 'No se pudo reportar', sub: error, icono: 'alerta' }); return; }
  toque(18);
  ui.avisar({ titulo: 'Gracias por avisar', sub: 'Lo revisamos en menos de 24 horas', icono: 'check' });
  alListo?.();
}

/** Bloquear con confirmación */
export function pedirBloqueo(uid: string, nombre: string, alListo?: () => void) {
  f7.dialog.confirm(`${nombre} deja de estar en tu gente, se cancela lo pendiente entre los dos y no podrá volver a escribirte ni pedirte conexión.`, `¿Bloquear a ${nombre}?`, async () => {
    const error = await bloquear(uid);
    if (error) { ui.avisar({ titulo: 'No se pudo bloquear', sub: error, icono: 'alerta' }); return; }
    toque(18);
    ui.avisar({ titulo: `${nombre} quedó bloqueado(a)`, icono: 'check' });
    alListo?.();
  });
}

/** Menú "···" de un contenido ajeno: reportarlo o bloquear a su autor */
export function menuContenido(tipo: Exclude<Tipo, 'persona'>, ref: string, autor: string, nombreAutor: string, alOcultar?: () => void) {
  f7.actions.create({
    buttons: [
      [
        { text: `Reportar ${tipo === 'publicacion' ? 'la publicación' : tipo === 'comentario' ? 'el comentario' : 'el mensaje'}`, color: 'red', onClick: () => pedirReporte(tipo, ref, alOcultar) },
        { text: `Bloquear a ${nombreAutor}`, color: 'red', onClick: () => pedirBloqueo(autor, nombreAutor, alOcultar) }
      ],
      [{ text: 'Cancelar' }]
    ]
  }).open();
}
/** Menú de una persona */
export function menuPersona(uid: string, nombre: string, alListo?: () => void) {
  f7.actions.create({
    buttons: [
      [
        { text: `Reportar a ${nombre}`, color: 'red', onClick: () => pedirReporte('persona', uid) },
        { text: `Bloquear a ${nombre}`, color: 'red', onClick: () => pedirBloqueo(uid, nombre, alListo) }
      ],
      [{ text: 'Cancelar' }]
    ]
  }).open();
}
