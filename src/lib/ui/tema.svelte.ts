// Apariencia (siempre clara: es la decisión de diseño para toda la app) y háptica. De Selffin solo queda lo que usa el módulo social.
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { nativo } from '$lib/app/plataforma';

class Apariencia {
  oscuro = $state(false);
  iniciar() {
    this.aplicar();
  }
  aplicar() {
    // Tono claro en toda la app (el modo oscuro del sistema no se sigue)
    this.oscuro = false;
    document.documentElement.classList.toggle('dark', this.oscuro);
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--q-bg').trim() || (this.oscuro ? '#0f1420' : '#ffffff');
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  }
}
export const apariencia = new Apariencia();

/** Reacciones rápidas para responder una historia (van al chat) */
export const REACCIONES_HISTORIA = ['🔥 ¡Qué nivel!', '🎾 ¿Jugamos?', '😂 Jajaja'];

export const reducirMovimiento = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Vibración según la intensidad pedida: ≤6 selección, 8 leve, 10–16 media, 18 éxito, ≥20 fuerte */
export const toque = (ms = 8) => {
  try {
    if (nativo) {
      if (ms <= 6) void Haptics.selectionChanged();
      else if (ms === 18) void Haptics.notification({ type: NotificationType.Success });
      else void Haptics.impact({ style: ms <= 8 ? ImpactStyle.Light : ms < 20 ? ImpactStyle.Medium : ImpactStyle.Heavy });
    } else if (navigator.vibrate) navigator.vibrate(ms);
  } catch { /* sin háptica */ }
};
