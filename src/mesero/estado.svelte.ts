// Estado de la app del mesero: quién soy, en qué pestaña estoy, el pedido que se está armando y avisos.
export type Pestana = 'pedidos' | 'canchas' | 'cuentas' | 'nuevo';

class Mesero {
  yo = $state<string | null>(leer());
  tab = $state<Pestana>('pedidos');
  /** Ubicación con la que abre "Nuevo" (al tocar una cancha) */
  ubicacion = $state<string | null>(null);
  aviso = $state<{ texto: string; id: number; error: boolean } | null>(null);
  ahora = $state(Date.now());
  /** Reservas que entraron en vivo (franja → cuándo llegó), para resaltarlas en Canchas */
  reservasNuevas = $state<Record<string, number>>({});
  /** Modo crucero: "Nuevo" carga el pedido a esta cuenta (id) en vez de cobrarlo aparte */
  cuenta = $state<string | null>(null);
  /** Hoja del escáner de QR abierta */
  escaneando = $state(false);
  /** Cuenta abierta en la hoja de detalle */
  verCuenta = $state<string | null>(null);

  elegir(nombre: string | null) {
    this.yo = nombre;
    try { if (nombre) localStorage.setItem('q-mesero', nombre); else localStorage.removeItem('q-mesero'); } catch { /* sin almacenamiento */ }
  }
  avisar(texto: string, error = false) {
    const id = Date.now();
    this.aviso = { texto, id, error };
    setTimeout(() => { if (this.aviso?.id === id) this.aviso = null; }, 2600);
  }
}
/** Color del cuadrito de cada mesero (Camilo naranja, Daniela verde; los demás en orden) */
const COLORES = ['#ff5b1f', '#18895b', '#1e7fd0', '#3346a8', '#b98500'];
export function colorMesero(nombre: string, i = 0) {
  if (nombre === 'Camilo') return COLORES[0];
  if (nombre === 'Daniela') return COLORES[1];
  return COLORES[Math.max(0, i) % COLORES.length];
}
/** Iniciales para los avatares: "Mateo Restrepo" → "MR" */
export const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('');

function leer() {
  try { return localStorage.getItem('q-mesero'); } catch { return null; }
}
export const m = new Mesero();

// Sonido de pedido nuevo: el navegador solo deja sonar después de que la persona toca la pantalla
let audio: AudioContext | null = null;
export function desbloquearSonido() {
  if (audio) return;
  try {
    audio = new AudioContext();
    void audio.resume();
  } catch { audio = null; }
}
export function timbre() {
  if (!audio) return;
  const t = audio.currentTime;
  for (const [i, f] of [880, 1320].entries()) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.16);
    g.gain.exponentialRampToValueAtTime(0.3, t + i * 0.16 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.15);
    o.connect(g).connect(audio.destination);
    o.start(t + i * 0.16);
    o.stop(t + i * 0.16 + 0.16);
  }
  navigator.vibrate?.([120, 60, 120]);
}
