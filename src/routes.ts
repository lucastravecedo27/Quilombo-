import Social from '$lib/social/pages/Social.svelte';
import Jugar from '$lib/social/pages/Jugar.svelte';
import Chats from '$lib/social/pages/Chats.svelte';
import MiPerfil from '$lib/social/pages/MiPerfil.svelte';

// Las raíces de las pestañas van en el paquete inicial; las demás pantallas se descargan la primera vez que se abren.
export const routes = [
  { path: '/', component: Social },
  { path: '/jugar/', component: Jugar },
  { path: '/chat/', component: Chats },
  { path: '/perfil/', component: MiPerfil },
  { path: '/chat/r/:id/', asyncComponent: () => import('$lib/social/pages/Chat.svelte') },
  { path: '/gente/', asyncComponent: () => import('$lib/social/pages/Gente.svelte') },
  { path: '/buscar/', asyncComponent: () => import('$lib/social/pages/Buscar.svelte') },
  { path: '/persona/:uid/', asyncComponent: () => import('$lib/social/pages/Historia.svelte') },
  { path: '/publicacion/:id/', asyncComponent: () => import('$lib/social/pages/Publicacion.svelte') },
  { path: '/partido/:id/', asyncComponent: () => import('$lib/social/pages/Partido.svelte') },
  { path: '/torneo/:id/', asyncComponent: () => import('$lib/social/pages/Torneo.svelte') },
  { path: '/ranking/', asyncComponent: () => import('$lib/social/pages/Ranking.svelte') },
  { path: '/resultado/:id/', asyncComponent: () => import('$lib/social/pages/Resultado.svelte') },
  { path: '/calendario/', asyncComponent: () => import('$lib/social/pages/Calendario.svelte') },
  { path: '/cuenta/', asyncComponent: () => import('$lib/social/pages/Cuenta.svelte') },
  { path: '/saldo/', asyncComponent: () => import('$lib/social/pages/Saldo.svelte') },
  { path: '/clases/', asyncComponent: () => import('$lib/social/pages/Clases.svelte') },
  { path: '/profesor/:uid/', asyncComponent: () => import('$lib/social/pages/Profesor.svelte') }
];
