<script lang="ts">
  // La tarjeta de un jugador (mi perfil y el de los demás): portada azul noche con el aro de acento y la categoría
  // gigante, la foto superpuesta, nombre, @usuario · club · ciudad y 4 cifras (puntos, puesto nacional, V–D, racha).
  import type { Snippet } from 'svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { posicionDe } from './ranking';
  import type { PerfilRanking } from '../../domain/ranking';

  let { perfil, alTocarFoto, fotoExtra }: { perfil: PerfilRanking; alTocarFoto?: () => void; fotoExtra?: Snippet } = $props();
  const pos = $derived(posicionDe(perfil.user_id));
  const v = $derived(perfil.victorias ?? 0);
  const d = $derived(perfil.derrotas ?? 0);
  const racha = $derived(perfil.racha ?? 0);
  const linea = $derived([perfil.usuario ? `@${perfil.usuario}` : null, perfil.club_base, perfil.ciudad].filter(Boolean).join(' · '));
  const cara = $derived({ nombre: perfil.nombre, color: perfil.color ?? '#3346a8', avatar: perfil.avatar ?? null, foto: perfil.foto ?? null });
</script>

<section class="tj">
  <div class="portada">
    <span class="aro" aria-hidden="true"></span>
    {#if perfil.categoria}<b class="cat" aria-hidden="true">{perfil.categoria}ª</b>{/if}
  </div>
  {#if alTocarFoto}
    <button class="foto" onclick={alTocarFoto} aria-label="Cambiar tu foto o tu dibujo"><FotoPerfil perfil={cara} size={88} />{#if fotoExtra}{@render fotoExtra()}{/if}</button>
  {:else}
    <span class="foto"><FotoPerfil perfil={cara} size={88} /></span>
  {/if}
  <div class="quien">
    <h1>{perfil.nombre}</h1>
    {#if linea}<small>{linea}</small>{/if}
  </div>
  <div class="stats">
    <div><b>{(perfil.puntos_ranking ?? 0).toLocaleString('es-CO')}</b><small>Puntos</small></div>
    <button onclick={() => { toque(); ui.navegar('/ranking/'); }} aria-label="Ver el ranking nacional"><b>#{pos?.pos ?? '—'}</b><small>Nacional</small></button>
    <div><b>{v}–{d}</b><small>V–D</small></div>
    <div><b>{racha > 0 ? `🔥${racha}` : racha < 0 ? `${racha}` : '—'}</b><small>Racha</small></div>
  </div>
</section>

<style>
  .tj { position: relative; margin: 0 16px; border-radius: 20px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .portada { position: relative; height: 96px; background: #0e1b33; overflow: hidden; }
  :global(html.dark) .portada { background: #1b2847; }
  .aro { position: absolute; right: -30px; top: -60px; width: 180px; height: 180px; border-radius: 50%; border: 22px solid var(--q-accd); box-sizing: border-box; }
  .cat { position: absolute; left: 16px; top: 10px; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 88px; line-height: 1; color: rgba(255, 255, 255, 0.1); }
  .foto { position: absolute; left: 16px; top: 52px; display: inline-flex; padding: 0; border: 0; border-radius: 50%; background: none; box-shadow: 0 0 0 4px var(--q-card); }
  button.foto:active { transform: scale(0.96); }
  .quien { padding: 52px 16px 16px; display: flex; flex-direction: column; gap: 2px; }
  h1 { margin: 0; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 32px; line-height: 1; text-transform: uppercase; }
  .quien small { font-size: 14px; color: var(--q-tx2); font-weight: 600; }
  .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--q-line); }
  .stats > * { display: flex; flex-direction: column; align-items: center; padding: 12px 4px; border: 0; background: none; color: var(--q-tx); font-family: inherit; min-width: 0; }
  .stats > * + * { border-left: 1px solid var(--q-line); }
  .stats b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 28px; line-height: 1; white-space: nowrap; }
  .stats small { font-size: 11.5px; font-weight: 800; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.06em; }
  .stats button b { color: var(--q-acct); }
</style>
