// La sala de demo (/demo) maneja las apps que tiene en sus marcos: les pide ir a una pantalla con postMessage.
// Solo se aceptan mensajes del mismo origen (la sala y las apps salen del mismo servidor).
export interface OrdenSala { tipo: 'q-ir'; destino: string }

export function escucharSala(ir: (destino: string) => void): () => void {
  const f = (e: MessageEvent) => {
    if (e.origin !== location.origin) return;
    const d = e.data as Partial<OrdenSala> | null;
    if (d?.tipo === 'q-ir' && typeof d.destino === 'string') ir(d.destino);
  };
  window.addEventListener('message', f);
  return () => window.removeEventListener('message', f);
}
