// ¿Corre como app de iPhone (Capacitor) o en el navegador? En la app nativa location.origin es capacitor://localhost,
// así que los links que se comparten (QR, invitaciones) usan siempre el dominio público.
import { Capacitor } from '@capacitor/core';

export const SITIO = 'https://quilombo.app';
export const nativo = Capacitor.isNativePlatform();
/** Origen para links que salen de la app */
export const origen = () => (nativo ? SITIO : location.origin);
