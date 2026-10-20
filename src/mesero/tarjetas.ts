// Abrir la tarjeta Quilombo de un jugador a partir de lo que leyó la cámara o se digitó: queda en su cuenta del club
// (si no tenía una abierta, se abre en ese momento) y se muestra la hoja de la tarjeta.
import { cuentaParaTarjeta } from '$lib/club/app/club';
import { leerCodigoCuenta } from '$lib/club/domain/club';
import { m } from './estado.svelte';

export async function abrirTarjeta(texto: string): Promise<boolean> {
  const c = leerCodigoCuenta(texto);
  const cuenta = c ? await cuentaParaTarjeta(c) : null;
  if (!cuenta) {
    m.avisar(c ? `Ninguna tarjeta tiene el código ${c} · revísalo` : 'Ese QR no es una tarjeta Quilombo', true);
    return false;
  }
  m.escaneando = false;
  m.verCuenta = cuenta.id;
  navigator.vibrate?.(60);
  return true;
}
