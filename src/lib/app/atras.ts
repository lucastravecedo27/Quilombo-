// "Atrás" para lo que se abre encima de la app (visor de fotos, historias): Escape y el botón atrás del navegador
// cierran lo de arriba. Versión reducida del gestor de Selffin (allá también apila hojas y pantallas de Framework7).
type Unidad = { id: symbol; cerrar: () => void };
const pila: Unidad[] = [];
let listo = false;
let ignorar = 0;

function iniciar() {
  if (listo || typeof window === 'undefined') return;
  listo = true;
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pila.length) { e.preventDefault(); history.back(); } });
  window.addEventListener('popstate', () => {
    if (ignorar) { ignorar--; return; }
    pila.pop()?.cerrar();
  });
}

/** Registra algo que se cierra con "atrás"; devuelve la función para liberarlo si se cierra por su cuenta */
export function registrarAtras(cerrar: () => void): () => void {
  iniciar();
  const u: Unidad = { id: Symbol('atras'), cerrar };
  pila.push(u);
  try { history.pushState({ q: pila.length }, ''); } catch { /* sin historial */ }
  return () => {
    const i = pila.indexOf(u);
    if (i < 0) return;
    pila.splice(i, 1);
    ignorar++;
    try { history.back(); } catch { ignorar--; }
  };
}
