// Estado de interfaz compartido: pestaña activa, hojas globales del módulo social y aviso inferior.
import { f7 } from 'framework7-svelte';

export interface Aviso { titulo: string; sub?: string; accion?: { texto: string; hacer: () => void }; icono?: string }

/** Un pago en la app. accion recibe con qué se pagó: 'saldo' (saldo Quilombo) o 'app' (tarjeta, PSE o Nequi) */
export interface Cobro { concepto: string; detalle?: string; monto: number; listo?: string; accion: (metodo: 'app' | 'saldo') => Promise<string | null> }
/** Pagar entre varios: la cancha (ref = franja), un pedido o lo consumido en una cuenta */
export interface PedidoDivision { tipo: 'cancha' | 'pedido' | 'cuenta'; ref: string; total: number; concepto: string; club: string | null; gente: string[] }

export const PESTANAS = [
  { id: 'social', label: 'Social', url: '/', icono: 'parche' },
  { id: 'jugar', label: 'Jugar', url: '/jugar/', icono: 'estrella' },
  { id: 'chat', label: 'Chat', url: '/chat/', icono: 'chat' },
  { id: 'perfil', label: 'Perfil', url: '/perfil/', icono: 'persona' }
] as const;
export type TabId = (typeof PESTANAS)[number]['id'];

/** Pantallas de pantalla completa que esconden la barra de pestañas */
const PAGINAS_SIN_BARRA = new Set(['chat']);

class UI {
  tab = $state<TabId>('social');
  /** Agregar a alguien (código de su perfil o link ?amigo=) */
  agregar = $state<{ codigo: string; qr: boolean } | null>(null);
  /** Dividir y cobrar (la cancha): a quiénes, cuánto y por qué */
  cobrar = $state<{ para?: string[]; monto?: number; concepto?: string } | null>(null);
  /** Invitar a jugar: con quiénes ya elegidos y, si viene de una franja, esa cancha */
  invitar = $state<{ con?: string[]; franja?: string } | null>(null);
  /** Reservar una cancha libre (sola o con gente) */
  reservar = $state<{ franja: string } | null>(null);
  /** Pedir del bar del club: a la cancha de un partido, o cargado a mi tarjeta Quilombo en ese club (modo crucero) */
  pedir = $state<{ partido: string } | { tarjeta: string; dividir?: boolean } | null>(null);
  /** Inscribirse a un torneo ("Yo voy"): categoría, pareja y pago (tarjeta o comprobante) */
  inscribir = $state<{ torneo: string } | null>(null);
  /** Pagar en la app (cancha, pedido o torneo): lo que se cobra y qué hacer cuando el pago se aprueba */
  pagar = $state<Cobro | null>(null);
  /** Recargar saldo Quilombo (con un monto sugerido) */
  recargar = $state<{ sugerido?: number } | null>(null);
  /** Dividir un pago entre varios (mitad y mitad, entre todos o a la medida) */
  dividir = $state<PedidoDivision | null>(null);
  /** Reservar una clase con un profesor (el horario elegido) */
  clase = $state<{ id: string } | null>(null);
  /** Modo profesor: abrir un horario de clase, o editar el perfil de profe */
  abrirHorario = $state<{ dia?: string } | null>(null);
  editarProfe = $state(false);
  /** Dejarle una reseña a un profesor */
  resenar = $state<{ profesor: string } | null>(null);
  /** La Tarjeta Quilombo (QR + saldo) a pantalla completa: se abre con el botón Q del centro desde cualquier pestaña */
  tarjeta = $state(false);
  /** Publicar (foto o resultado de un partido) */
  publicar = $state<{ tipo: 'foto' | 'resultado_partido' } | null>(null);
  /** data-name de la página que se ve en la pestaña activa (la barra se esconde en el chat) */
  paginaActual = $state('');
  get sinBarra() { return PAGINAS_SIN_BARRA.has(this.paginaActual); }
  aviso = $state<Aviso | null>(null);
  #t: ReturnType<typeof setTimeout> | null = null;

  /** Cambia de pestaña (y abre `ruta` dentro si se pide) */
  irA(tab: TabId, ruta?: string) {
    if (this.tab === tab && !ruta) {
      document.querySelector(`#view-${tab} .page-current .page-content`)?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.tab = tab;
    f7.tab.show('#view-' + tab);
    if (ruta) f7.views.get('#view-' + tab)?.router.navigate(ruta);
  }
  /** Vuelve a la pantalla anterior de la pestaña actual */
  volver() {
    f7.views.get('#view-' + this.tab)?.router.back();
  }
  /** Navega dentro de la pestaña actual */
  navegar(ruta: string) {
    f7.views.get('#view-' + this.tab)?.router.navigate(ruta);
  }
  avisar(a: Aviso, segundos = 3.5) {
    this.aviso = a;
    if (this.#t) clearTimeout(this.#t);
    this.#t = setTimeout(() => (this.aviso = null), segundos * 1000);
  }
  cerrarAviso() { this.aviso = null; }
}
export const ui = new UI();
