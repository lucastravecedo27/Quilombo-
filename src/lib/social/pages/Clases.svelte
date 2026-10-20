<script lang="ts">
  // Clases con profe: invitación lila, mis clases reservadas, filtros (ciudad —la mía—, nivel —el mío o iniciación—
  // y tipo de clase) y la lista de profes. Toca un profe para ver su perfil y sus horarios.
  import { Page } from 'framework7-svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Cabecera from '../ui/ranking/Cabecera.svelte';
  import TarjetaProfe from '../ui/clases/TarjetaProfe.svelte';
  import MisClases from '../ui/clases/MisClases.svelte';
  import { ciudadesDe, disponiblesDe, profesores } from '../app/clases';
  import { miPerfil } from '../app/perfil.svelte';
  import { yo } from '../app/vinculos';
  import { NIVEL_INICIACION, textoNivel } from '../domain/clases';

  let ciudadElegida = $state<string | null>(null);
  let nivel = $state<number | null>(null);
  let tipo = $state<'todas' | 'individual' | 'grupal'>('todas');
  const todas = $derived([...new Set(profesores().flatMap(ciudadesDe))].sort());
  const ciudad = $derived(ciudadElegida ?? (miPerfil().ciudad && todas.includes(miPerfil().ciudad!) ? miPerfil().ciudad! : 'Todas'));
  const NIVELES = [NIVEL_INICIACION, 6, 5, 4, 3, 2, 1];
  const lista = $derived(profesores()
    .filter((p) => p.user_id !== yo())
    .filter((p) => ciudad === 'Todas' || ciudadesDe(p).includes(ciudad))
    .filter((p) => !nivel || p.niveles.includes(nivel))
    .filter((p) => tipo === 'todas' || disponiblesDe(p.user_id).some((c) => c.tipo === tipo))
    .sort((a, b) => b.estrellas - a.estrellas || b.resenas - a.resenas));
</script>

<Page name="clases" class="pa-clases" noNavbar>
  <Cabecera titulo="Clases con profe" />
  <header class="intro">
    <span class="aro" aria-hidden="true"></span>
    <b>Elige con quién mejorar</b>
    <p>Reservas, pagas con tu saldo y la cancha queda lista a nombre de la clase.</p>
  </header>

  <MisClases />

  <div class="filtros">
    <div class="chips" role="tablist" aria-label="Ciudad">
      {#each ['Todas', ...todas] as c (c)}<button role="tab" aria-selected={ciudad === c} class:on={ciudad === c} onclick={() => { toque(4); ciudadElegida = c; }}>{c === 'Todas' ? '🇨🇴 Todas' : `📍 ${c}`}</button>{/each}
    </div>
    <div class="chips" role="tablist" aria-label="Nivel">
      <button role="tab" aria-selected={!nivel} class:on={!nivel} onclick={() => { toque(4); nivel = null; }}>Todo nivel</button>
      {#each NIVELES as n (n)}<button role="tab" aria-selected={nivel === n} class:on={nivel === n} onclick={() => { toque(4); nivel = n; }}>{textoNivel(n)}{miPerfil().categoria === n ? ' · tú' : ''}</button>{/each}
    </div>
    <div class="chips" role="tablist" aria-label="Tipo de clase">
      {#each [['todas', 'Individual y grupal'], ['individual', '👤 Individual'], ['grupal', '👥 Grupal']] as [id, txt] (id)}
        <button role="tab" aria-selected={tipo === id} class:on={tipo === id} onclick={() => { toque(4); tipo = id as typeof tipo; }}>{txt}</button>
      {/each}
    </div>
  </div>

  <h2>{lista.length} profe{lista.length === 1 ? '' : 's'}{ciudad !== 'Todas' ? ` en ${ciudad}` : ''}</h2>
  {#if lista.length}
    <div class="lista">{#each lista as p (p.user_id)}<TarjetaProfe {p} />{/each}</div>
  {:else}
    <p class="nota">No hay profes con esos filtros. Prueba otra ciudad o nivel.</p>
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-clases .page-content) { font-family: var(--q-font); padding-top: 0 !important; }
  .intro { position: relative; margin: 0 16px; padding: 16px 18px; border-radius: 18px; background: var(--q-lila); color: #fff; overflow: hidden; }
  .aro { position: absolute; right: -50px; bottom: -70px; width: 170px; height: 170px; border-radius: 50%; border: 22px solid rgba(255, 255, 255, 0.12); box-sizing: border-box; }
  .intro b { position: relative; display: block; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 34px; line-height: 0.95; text-transform: uppercase; }
  .intro p { position: relative; margin: 8px 0 0; font-size: 14px; line-height: 1.4; opacity: 0.9; max-width: 290px; }
  .filtros { display: flex; flex-direction: column; gap: 6px; margin-top: 16px; }
  .chips { display: flex; gap: 6px; overflow-x: auto; padding: 0 16px; scrollbar-width: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chips button { flex: none; height: 34px; padding: 0 12px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-family: inherit; font-size: 13.5px; font-weight: 800; }
  .chips button.on { background: var(--q-noche); color: #fff; }
  :global(html.dark) .chips button.on { background: var(--q-tx); color: var(--q-bg); }
  h2 { margin: 20px 20px 10px; font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 22px; font-weight: 800; }
  .lista { display: flex; flex-direction: column; gap: 10px; margin: 0 16px; }
  .nota { margin: 0 20px; font-size: 14px; color: var(--q-tx2); }
</style>
