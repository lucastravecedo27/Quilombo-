<script lang="ts">
  // Ranking nacional: podio (2.º · 1.º · 3.º), filtros (todos, mi categoría, ciudades), la tabla con puntos, V–D y
  // cuánto se movió cada uno en su último resultado, y una barra fija con tu posición. Los puntos solo se mueven con
  // resultados que confirmaron los cuatro jugadores (o que digitó el club en un torneo).
  import { Page } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Cabecera from '../ui/ranking/Cabecera.svelte';
  import FotoPerfil from '../ui/perfil/FotoPerfil.svelte';
  import { perfilesRanking } from '../ui/ranking/ranking';
  import { tablaRanking, type PerfilRanking } from '../domain/ranking';
  import { resultados } from '../app/resultados';
  import { yo } from '../app/vinculos';
  import { miPerfil } from '../app/perfil.svelte';

  type Filtro = { tipo: 'todos' } | { tipo: 'cat'; v: number } | { tipo: 'ciudad'; v: string };
  let filtro = $state<Filtro>({ tipo: 'todos' });
  const miCat = $derived(miPerfil().categoria ?? null);
  const ciudades = $derived([...new Set(perfilesRanking().filter((p) => (p.puntos_ranking ?? 0) > 0 && p.ciudad).map((p) => p.ciudad as string))].sort());
  const chips = $derived<{ t: string; f: Filtro }[]>([
    { t: 'Todos', f: { tipo: 'todos' } },
    ...(miCat ? [{ t: `${miCat}ª`, f: { tipo: 'cat', v: miCat } as Filtro }] : []),
    ...ciudades.map((c) => ({ t: c, f: { tipo: 'ciudad', v: c } as Filtro }))
  ]);
  const igual = (a: Filtro, b: Filtro) => a.tipo === b.tipo && (a.tipo === 'todos' || (a as { v: unknown }).v === (b as { v: unknown }).v);
  const tabla = $derived(tablaRanking(perfilesRanking(), {
    categoria: filtro.tipo === 'cat' ? filtro.v : null,
    ciudad: filtro.tipo === 'ciudad' ? filtro.v : null
  }));
  const podio = $derived(tabla.slice(0, 3));
  // Mi posición siempre es la nacional (sin filtro)
  const mia = $derived(tablaRanking(perfilesRanking()).find((f) => f.perfil.user_id === yo()) ?? null);
  /** Lo que se movió cada uno en su último resultado válido */
  const deltas = $derived.by(() => {
    const m = new Map<string, number>();
    for (const r of resultados()) if (r.estado === 'valido' && r.puntos) for (const [u, d] of Object.entries(r.puntos)) if (!m.has(u)) m.set(u, d);
    return m;
  });
  const cara = (p: PerfilRanking) => ({ nombre: p.nombre, color: p.color ?? '#1e7fd0', avatar: p.avatar ?? null, foto: p.foto ?? null });
  const abrir = (uid: string) => { toque(); if (uid !== yo()) ui.navegar(`/persona/${uid}/`); else ui.irA('perfil'); };
  const PODIO = [
    { k: 1, h: 92, bg: '#5b6478', aro: '#9aa1b0', av: 52 },
    { k: 0, h: 120, bg: '#b98500', aro: '#b98500', av: 62 },
    { k: 2, h: 72, bg: '#c2410c', aro: '#c2410c', av: 52 }
  ];
  let tablaEl: HTMLElement | undefined = $state();
  function irAMi() {
    toque();
    if (filtro.tipo !== 'todos') filtro = { tipo: 'todos' };
    requestAnimationFrame(() => tablaEl?.querySelector('.fila.yo')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
</script>

<Page name="ranking" class="pa-ranking" noNavbar>
  <Cabecera titulo="Ranking nacional" />

  {#if podio.length}
    <section class="podio" aria-label="Podio">
      {#each PODIO as p (p.k)}
        {@const f = podio[p.k]}
        {#if f}
          <button class="escalon p{f.pos}" class:yo={f.perfil.user_id === yo()} onclick={() => abrir(f.perfil.user_id)}>
            <span class="aro" style="--aro:{p.aro}"><FotoPerfil perfil={cara(f.perfil)} size={p.av} /></span>
            <b class="nom">{f.perfil.user_id === yo() ? 'Tú' : f.perfil.nombre}</b>
            <span class="base" style="height:{p.h}px; background:{p.bg}"><i>{f.pos}</i><small>{f.puntos.toLocaleString('es-CO')}</small></span>
          </button>
        {:else}
          <span></span>
        {/if}
      {/each}
    </section>
  {/if}

  <div class="chips" role="radiogroup" aria-label="Filtrar el ranking">
    {#each chips as c (c.t)}
      <button role="radio" aria-checked={igual(filtro, c.f)} class:on={igual(filtro, c.f)} onclick={() => { toque(4); filtro = c.f; }}>{c.t}</button>
    {/each}
  </div>

  {#if tabla.length}
    <div class="tabla" bind:this={tablaEl} aria-label="Ranking">
      {#each tabla as f (f.perfil.user_id)}
        {@const d = deltas.get(f.perfil.user_id) ?? 0}
        <button class="fila" class:yo={f.perfil.user_id === yo()} onclick={() => abrir(f.perfil.user_id)}>
          <b class="pos">{f.pos}</b>
          <FotoPerfil perfil={cara(f.perfil)} size={34} />
          <span class="jug">
            <b>{f.perfil.user_id === yo() ? `Tú · ${f.perfil.nombre}` : f.perfil.nombre}</b>
            <small>{f.perfil.categoria ? `${f.perfil.categoria}ª` : '—'}{f.perfil.ciudad ? ` · ${f.perfil.ciudad}` : ''} · {f.victorias}–{f.derrotas}{f.racha >= 3 ? ` · 🔥${f.racha}` : ''}</small>
          </span>
          <span class="pts">
            <b>{f.puntos.toLocaleString('es-CO')}</b>
            <small class:sube={d > 0} class:baja={d < 0}>{d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : '—'}</small>
          </span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="q-vacio"><b>Nadie en este filtro</b>Prueba con otra categoría o ciudad.</p>
  {/if}
  <p class="nota">Solo suman los partidos que confirmaron los 4 jugadores y los resultados oficiales de torneos.</p>
  <div class="espacio"></div>

  {#if mia}
    <button class="mi-pos" onclick={irAMi} aria-label="Tu posición: {mia.pos}">
      <span class="izq"><small>TU POSICIÓN</small><b>#{mia.pos}</b></span>
      <span class="der"><b>{mia.puntos.toLocaleString('es-CO')} pts</b><small>{mia.victorias}–{mia.derrotas} · {mia.pct}%</small></span>
    </button>
  {/if}
</Page>

<style>
  :global(.page.pa-ranking .page-content) { font-family: var(--q-font); padding-top: 0 !important; }
  .podio { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: 8px; margin: 6px 16px 0; }
  .escalon { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; border: 0; background: none; padding: 0; color: var(--q-tx); font-family: inherit; }
  .aro { display: inline-flex; border-radius: 50%; box-shadow: 0 0 0 3px var(--aro); }
  .nom { max-width: 100%; font-size: 13.5px; font-weight: 800; line-height: 1.1; text-align: center; }
  .escalon.yo .nom { color: var(--q-acct); }
  .base { width: 100%; border-radius: 12px 12px 0 0; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 8px; box-sizing: border-box; }
  .base i { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 40px; line-height: 1; }
  .base small { font-size: 12px; font-weight: 800; opacity: 0.9; }
  .chips { display: flex; gap: 6px; overflow-x: auto; padding: 14px 16px 10px; scrollbar-width: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chips button { flex: none; height: 34px; padding: 0 13px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-family: inherit; font-size: 13.5px; font-weight: 900; }
  .chips button.on { background: var(--q-noche); color: #fff; }
  :global(html.dark) .chips button.on { background: var(--q-tx); color: var(--q-bg); }
  .tabla { margin: 0 16px; border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .fila { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 0; background: transparent; color: var(--q-tx); text-align: left; font-family: inherit; }
  .fila + .fila { border-top: 1px solid var(--q-line); }
  .fila.yo { background: var(--q-accs); }
  .fila:active { background: var(--q-sub); }
  .pos { width: 34px; flex: none; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 20px; }
  .jug { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .jug b { font-size: 14.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .jug small { font-size: 12px; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pts { display: flex; flex-direction: column; align-items: flex-end; }
  .pts b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 20px; line-height: 1; }
  .pts small { font-size: 11.5px; font-weight: 800; color: var(--q-tx3); }
  .pts small.sube { color: var(--q-ok); }
  .pts small.baja { color: var(--q-rojo); }
  .nota { margin: 12px 20px 0; font-size: 12.5px; color: var(--q-tx2); line-height: 1.4; }
  .mi-pos { position: fixed; z-index: 20; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + var(--q-tabbar-h) + 28px); display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 0; border-radius: 16px; background: var(--q-noche); color: #fff; box-shadow: 0 12px 30px rgba(14, 27, 51, 0.3); font-family: inherit; text-align: left; }
  :global(html.dark) .mi-pos { background: var(--q-card); border: 1px solid var(--q-borde); }
  .izq, .der { display: flex; flex-direction: column; }
  .der { align-items: flex-end; }
  .izq small { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; opacity: 0.7; }
  .izq b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 32px; line-height: 1; }
  .der b { font-size: 16px; font-weight: 800; }
  .der small { font-size: 12.5px; opacity: 0.75; }
  .espacio { height: calc(var(--q-tabbar-h) + env(safe-area-inset-bottom, 0px) + 110px); }
</style>
