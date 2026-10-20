<script lang="ts">
  // Un profesor en la lista o en el carrusel: borde superior lila, foto, nombre, especialidad, estrellas y años,
  // niveles, clubes, desde cuánto y su próxima clase con cupo. Toca y abre su perfil.
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { nombresClubes, proximaDe } from '../../app/clases';
  import { perfilDe } from '../../app/vinculos';
  import { textoNiveles, type Profesor } from '../../domain/clases';
  import { diaColombia, horaColombia, pesos } from '../../domain/jugar';
  import { nombreDia } from './fechas';

  let { p, compacto = false }: { p: Profesor; compacto?: boolean } = $props();
  const perfil = $derived(perfilDe(p.user_id));
  const nombre = $derived(perfil?.nombre ?? 'Profe');
  const prox = $derived(proximaDe(p.user_id));
  const desde = $derived(Math.min(p.precio_grupal || p.precio_individual, p.precio_individual || p.precio_grupal));
  const proxTxt = $derived(prox ? `Próxima: ${nombreDia(diaColombia(prox.inicio)).split(' · ')[0]} ${horaColombia(prox.inicio)}` : 'Sin horarios esta semana');
</script>

<button class="profe" class:compacto onclick={() => { toque(); ui.navegar(`/profesor/${p.user_id}/`); }} aria-label="Profe {nombre}, {p.especialidad}, {p.estrellas} estrellas">
  <span class="cab">
    <FotoPerfil perfil={perfil ?? { nombre, color: '#3346a8' }} size={compacto ? 48 : 56} />
    <span class="quien">
      <b>{nombre}</b>
      <small class="esp">🎓 {p.especialidad}</small>
      <small class="est"><span class="estrella">★</span> {p.estrellas.toFixed(1).replace('.', ',')} ({p.resenas}) · {p.anos} años</small>
    </span>
  </span>
  <span class="niveles">{textoNiveles(p.niveles)}</span>
  {#if !compacto}<small class="clubes">📍 {nombresClubes(p).join(' · ')}</small>{/if}
  <span class="pie">
    <span class="desde">desde <b>{pesos(desde)}</b></span>
    <span class="prox" class:sin={!prox}>{proxTxt}</span>
  </span>
</button>

<style>
  .profe { width: 100%; display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid var(--q-line); border-top: 4px solid var(--q-lila); border-radius: 14px; background: var(--q-card); color: var(--q-tx); text-align: left; font-family: inherit; }
  :global(html.dark) .profe { border-top-color: #6f82ff; }
  .profe.compacto { width: 248px; flex-shrink: 0; }
  .profe:active { transform: scale(0.99); }
  .cab { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .quien { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .quien b { font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 22px; font-weight: 900; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .esp { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .est { font-size: 12.5px; color: var(--q-tx2); font-weight: 600; }
  .estrella { color: var(--q-dorado); }
  :global(html.dark) .estrella { color: #ffc247; }
  .niveles { align-self: flex-start; padding: 3px 9px; border-radius: 8px; background: rgba(51, 70, 168, 0.12); color: var(--q-lila); font-size: 12.5px; font-weight: 800; }
  :global(html.dark) .niveles { color: #a9b6ff; background: rgba(120, 140, 255, 0.16); }
  .clubes { font-size: 12.5px; color: var(--q-tx2); }
  .pie { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; border-top: 1px dashed var(--q-line); padding-top: 8px; }
  .desde { font-size: 13px; color: var(--q-tx2); white-space: nowrap; }
  .desde b { color: var(--q-tx); font-size: 15px; }
  .prox { font-size: 12px; font-weight: 800; color: var(--q-lila); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :global(html.dark) .prox { color: #a9b6ff; }
  .prox.sin { color: var(--q-tx3); }
</style>
