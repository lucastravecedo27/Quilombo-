<script lang="ts">
  // Lista de conversaciones: una con cada persona de tu gente, la más reciente arriba.
  import { Page, Navbar } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import FotoPerfil from '../ui/perfil/FotoPerfil.svelte';
  import { conversaciones, nombreDe, perfilDe, sinLeer, yo } from '../app/vinculos';

  // Como pestaña de la barra es la raíz (título grande, sin Atrás); abierta desde otra pestaña, con Atrás.
  // Se decide por la vista donde vive esta pantalla (no por la pestaña activa: al arrancar todas se montan juntas)
  let { f7router }: { f7router?: { view?: { params?: { url?: string } } } } = $props();
  const raiz = $derived(f7router?.view?.params?.url === '/chat/');
  const lista = $derived(conversaciones());
  // Lo visto se guarda al salir de cada chat: al volver a esta pantalla se recalculan los no leídos
  let vuelta = $state(0);
  const nuevo = (c: (typeof lista)[number]) => (void vuelta, sinLeer(c.id, c.ultimo));
  const hora = (iso: string) => {
    const f = new Date(iso), hoy = new Date();
    return f.toDateString() === hoy.toDateString() ? f.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }) : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };
</script>

<Page name="chats" class="pa-chats" noNavbar={raiz} onPageBeforeIn={() => vuelta++}>
  {#if raiz}
    <header class="cab">
      <h1>Chat</h1>
      <p>Cuadren el partido, dividan la cancha y chicaneen.</p>
    </header>
  {:else}
    <Navbar title="Chat" backLink="Atrás" />
  {/if}
  {#if lista.length}
    <div class="q-lista grupo q-entra">
      {#each lista as c (c.id)}
        <button class="q-fila" class:nuevo={nuevo(c)} onclick={() => { toque(); ui.navegar(`/chat/r/${c.id}/`); }}>
          <FotoPerfil perfil={perfilDe(c.uid) ?? { nombre: c.titulo, color: c.color }} size={46} />
          <span class="cuerpo"><span class="titulo">{c.titulo}</span><span class="sub">{c.ultimo ? `${c.ultimo.autor === yo() ? 'Tú' : nombreDe(c.ultimo.autor).split(' ')[0]}: ${c.ultimo.deleted_at ? 'mensaje eliminado' : c.ultimo.texto}` : 'Saluda 👋'}</span></span>
          {#if c.ultimo}<span class="der"><small class="h">{hora(c.ultimo.created_at)}</small>{#if nuevo(c)}<i class="punto" aria-label="Mensajes sin leer"></i>{/if}</span>{/if}
        </button>
      {/each}
    </div>
  {:else}
    <div class="q-vacio"><b>Sin conversaciones</b>Busca a tus compañeros de cancha para chatear y cuadrar partidos.</div>
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-chats .page-content) { font-family: var(--q-font-fiesta); }
  .cab { position: relative; padding: calc(env(safe-area-inset-top, 0px) + 22px) 20px 8px; }
  .cab h1 { margin: 0; font-size: 38px; font-weight: 900; }
  .cab p { margin: 6px 0 0; font-size: 15px; font-weight: 700; color: var(--q-tx2); }
  .grupo { position: relative; margin: 8px 16px; }
  .nuevo { background: var(--q-sub); }
  .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .h { font-size: 12px; color: var(--q-tx3); }
  .der { flex-shrink: 0; align-self: flex-start; margin-top: 4px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .punto { width: 10px; height: 10px; border-radius: 5px; background: var(--q-fiesta-rosa); box-shadow: 0 0 0 2px var(--q-card); }
  .nuevo .titulo { font-weight: 900; }
  .nuevo .sub { color: var(--q-tx); font-weight: 700; }
  .nuevo .h { color: var(--q-tx); font-weight: 700; }
</style>
