// Acceso: login con correo y contraseña (o crear cuenta) → app. En la build de pruebas (VITE_E2E=1) entra directo
// con datos de demo. Versión reducida de la máquina de estados de Selffin (sin MFA ni Face ID por ahora).
import type { User } from '@supabase/supabase-js';
import { supabase } from '$lib/data/supabase';
import { db } from '$lib/data/db';
import { datos } from '$lib/data/datos.svelte';
import { iniciarSincronizacionAutomatica, sincronizar } from '$lib/data/sync';

export const E2E = import.meta.env.VITE_E2E === '1';
export const DEMO_UID = '00000000-0000-4000-a000-000000000001';

/** En la demo cada equipo puede ser otro jugador (Perfil → "Usar la demo como…"), p. ej. para confirmar un resultado */
export function usuarioDemo(): string {
  // ?como=<uid> manda sobre lo guardado: así la sala de demo tiene a la vez un jugador y un profe en dos marcos
  const url = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('como') : null;
  if (url) return url;
  try { return localStorage.getItem('q-demo-uid') || DEMO_UID; } catch { return DEMO_UID; }
}
export function usarDemoComo(uid: string) {
  try { if (uid === DEMO_UID) localStorage.removeItem('q-demo-uid'); else localStorage.setItem('q-demo-uid', uid); } catch { /* sin almacenamiento */ }
  location.reload();
}

export type Fase = 'cargando' | 'login' | 'app';

class Sesion {
  fase = $state<Fase>('cargando');
  usuario = $state<User | null>(null);
  error = $state('');
  ocupado = $state(false);
  #listo = false;

  async iniciar() {
    if (E2E) {
      const { arrancarDemo } = await import('./hub');
      await arrancarDemo();
      this.usuario = { id: usuarioDemo(), email: 'demo@quilombo.invalid' } as User;
      this.fase = new URLSearchParams(location.search).has('acceso') ? 'login' : 'app';
      return;
    }
    supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'SIGNED_OUT') { this.usuario = null; this.fase = 'login'; }
      else if (s?.user) this.usuario = s.user;
    });
    const { data } = await supabase.auth.getSession();
    if (data.session) await this.#entrar(data.session.user);
    else this.fase = 'login';
  }

  async #entrar(u: User) {
    this.usuario = u;
    datos.iniciar();
    // Mi perfil de jugador existe desde el primer momento (lo crea el servidor si falta)
    await supabase.rpc('social_yo', { p_nombre: null, p_color: null }).then(undefined, () => undefined);
    if (!this.#listo) { this.#listo = true; iniciarSincronizacionAutomatica(); }
    void sincronizar().catch(() => undefined);
    this.fase = 'app';
  }

  async entrar(email: string, clave: string) {
    this.ocupado = true; this.error = '';
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: clave });
    this.ocupado = false;
    if (error || !data.user) { this.error = /invalid/i.test(error?.message ?? '') ? 'Correo o contraseña incorrectos.' : error?.message ?? 'No se pudo entrar.'; return; }
    await this.#entrar(data.user);
  }
  /** Crear cuenta: con el nombre queda listo su perfil de jugador (y ya puede entrar a un torneo) */
  async registrarse(nombre: string, email: string, clave: string) {
    if (clave.length < 8) { this.error = 'Usa al menos 8 caracteres.'; return; }
    this.ocupado = true; this.error = '';
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password: clave, options: { data: { nombre: nombre.trim() } } });
    this.ocupado = false;
    if (error) { this.error = error.message; return; }
    if (!data.session || !data.user) { this.error = 'Revisa tu correo para confirmar la cuenta y luego entra.'; return; }
    await this.#entrar(data.user);
  }

  async cerrarSesion() {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    try { localStorage.removeItem('q-auth'); } catch { /* sin almacenamiento */ }
    await Promise.all(db.tables.map((t) => t.clear()));
    this.usuario = null;
    this.fase = 'login';
  }
}

export const sesion = new Sesion();
