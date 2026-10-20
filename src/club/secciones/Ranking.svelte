<script lang="ts">
  // Ranking y resultados: los partidos jugados aquí solo suman cuando los cuatro confirman el marcador. Si alguno no está
  // de acuerdo queda en disputa y el club decide (o lo anula). También los que esperan confirmación y el ranking de los
  // jugadores del club.
  import { datos } from '$lib/data/datos.svelte';
  import { CLUB_DEMO, hace } from '$lib/club/domain/club';
  import { resolverDisputa } from '$lib/social/app/resultados';
  import { faltanPorConfirmar, ganadorDeSets, tablaRanking, textoRacha, type PerfilRanking, type Resultado } from '$lib/social/domain/ranking';
  import { panel } from '../estado.svelte';
  import Contador from '../ui/Contador.svelte';

  const CLUB_NOMBRE = 'Pádel Club La 70';
  const delClub = $derived((datos.resultados as Resultado[]).filter((r) => r.club_id === CLUB_DEMO));
  const disputas = $derived(delClub.filter((r) => r.estado === 'disputado'));
  const pendientes = $derived(delClub.filter((r) => r.estado === 'pendiente'));
  const validos = $derived(delClub.filter((r) => r.estado === 'valido').slice(0, 8));
  const tabla = $derived(tablaRanking((datos.perfiles as PerfilRanking[]).filter((p) => p.club_base === CLUB_NOMBRE)));
  const nombre = (u: string | null) => (u ? (datos.perfiles.find((p) => p.user_id === u)?.nombre as string | undefined) ?? 'Jugador' : '');
  const corto = (us: string[]) => us.map((u) => nombre(u).split(' ')[0]).join(' y ');
  const largo = (us: string[]) => us.map((u) => nombre(u)).join(' · ');
  const quienNo = (r: Resultado) => Object.entries(r.confirmaciones).filter(([, v]) => v === 'no').map(([u]) => u);
  const marcador = (r: Resultado) => r.sets.map(([a, b]) => `${a}-${b}`).join('  ');

  // Resolver: el club elige el marcador real (por defecto, el propuesto)
  let resolviendo = $state<string | null>(null);
  let sets = $state<[string, string][]>([]);
  let msg = $state('');
  function abrir(r: Resultado) {
    resolviendo = r.id;
    sets = [...r.sets.map(([a, b]) => [String(a), String(b)] as [string, string]), ...(r.sets.length < 3 ? [['', ''] as [string, string]] : [])];
  }
  const setsNum = $derived(sets.filter(([a, b]) => a !== '' && b !== '').map(([a, b]) => [Number(a), Number(b)] as [number, number]));
  const gana = $derived(ganadorDeSets(setsNum));
  async function confirmar(r: Resultado) {
    if (!gana) return;
    const err = await resolverDisputa(r.id, { ganador: gana, sets: setsNum });
    msg = err ?? `✓ Resuelto: ganaron ${corto(gana === 'a' ? r.equipo_a : r.equipo_b)}. Ya cuenta para el ranking.`;
    resolviendo = null;
    setTimeout(() => (msg = ''), 6000);
  }
  async function anular(r: Resultado) {
    await resolverDisputa(r.id, 'anular');
    msg = '✓ Resultado anulado: no suma para nadie.';
    resolviendo = null;
    setTimeout(() => (msg = ''), 6000);
  }
  const medalla = (p: number) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : String(p));
  /** El club dice quién ganó: si el marcador propuesto ya da ese ganador se usa tal cual; si no, que corrija el marcador */
  async function gano(r: Resultado, quien: 'a' | 'b') {
    if (ganadorDeSets(r.sets) === quien) {
      const err = await resolverDisputa(r.id, { ganador: quien, sets: r.sets });
      msg = err ?? `✓ Resuelto: ganaron ${corto(quien === 'a' ? r.equipo_a : r.equipo_b)}. Ya cuenta para el ranking.`;
      setTimeout(() => (msg = ''), 6000);
    } else abrir(r);
  }
  const lugar = (r: Resultado) => {
    const d = new Date(r.created_at).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace(/\./g, '').toUpperCase();
    return `${d} · ${r.torneo_id ? 'TORNEO' : 'AMISTOSO'}`;
  };
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">Solo cuenta si los 4 confirman · el club desempata</span>
    <h1 class="c-titulo c-h1">Ranking y resultados</h1>
  </div>
</header>

{#if msg}<p class="hecho">{msg}</p>{/if}

<div class="dos">
  <div class="col">
    <h2 class="c-sec rojo">⚖️ En disputa · {disputas.length}</h2>
    {#each disputas as r (r.id)}
      <article class="disputa">
        <div class="arriba"><small class="c-mini">{lugar(r)}</small><small>{hace(r.created_at, panel.ahora)}</small></div>
        <div class="marcador">
          {#each [['a', r.equipo_a], ['b', r.equipo_b]] as const as [k, eq] (k)}
            <div class="linea"><b>{largo(eq)}</b><span class="nums">{#each r.sets as st, i (i)}<span class="c-num">{k === 'a' ? st[0] : st[1]}</span>{/each}</span></div>
          {/each}
        </div>
        {#if r.motivo}<p class="motivo">“{r.motivo}” — {quienNo(r).map((u) => nombre(u)).join(', ')}</p>{/if}
        {#if resolviendo === r.id}
          <div class="resolver">
            <span class="c-mini">Marcador real (pareja A – pareja B)</span>
            <div class="sets">
              {#each sets as st, k (k)}<div class="set"><input class="c-input" type="number" min="0" max="7" bind:value={st[0]} aria-label="Set {k + 1} A" /><span>-</span><input class="c-input" type="number" min="0" max="7" bind:value={st[1]} aria-label="Set {k + 1} B" /></div>{/each}
            </div>
            <p class="gana-tx">{gana ? `Ganan ${corto(gana === 'a' ? r.equipo_a : r.equipo_b)}` : 'El marcador no tiene ganador'}</p>
            <div class="fila-b">
              <button class="c-btn suave" onclick={() => (resolviendo = null)}>Cancelar</button>
              <button class="c-btn verde" disabled={!gana} onclick={() => confirmar(r)}>Dar por válido</button>
            </div>
          </div>
        {:else}
          <div class="fila-b">
            <button class="c-btn" onclick={() => gano(r, 'a')}>Ganó {corto(r.equipo_a)}</button>
            <button class="c-btn suave" onclick={() => gano(r, 'b')}>Ganó {corto(r.equipo_b)}</button>
            <button class="c-btn peligro" onclick={() => anular(r)}>Anular</button>
            <button class="c-btn peligro corr" onclick={() => abrir(r)}>Corregir marcador</button>
          </div>
        {/if}
      </article>
    {:else}
      <p class="c-vacio">No hay disputas. 🙌</p>
    {/each}

    <h2 class="c-sec">⏳ Pendientes de confirmar</h2>
    {#each pendientes as r (r.id)}
      {@const faltan = faltanPorConfirmar(r)}
      <div class="pend">
        <span class="txt"><b>{corto(r.equipo_a)} vs {corto(r.equipo_b)} · {marcador(r).replace(/  /g, ' ')}</b><small>{r.torneo_id ? 'Torneo' : 'Amistoso'} · propuesto por {nombre(r.propuesto_por).split(' ')[0]} · falta{faltan.length === 1 ? '' : 'n'} {faltan.map((u) => nombre(u).split(' ')[0]).join(', ')}</small></span>
        <b class="falta">Falta{faltan.length === 1 ? '' : 'n'} {faltan.length}</b>
      </div>
    {:else}
      <p class="c-vacio">Nada pendiente.</p>
    {/each}
    {#if validos.length}
      <h2 class="c-sec">✓ Últimos confirmados</h2>
      {#each validos as r (r.id)}
        <div class="pend">
          <span class="txt"><b><span class:gana={r.ganador === 'a'}>{corto(r.equipo_a)}</span> vs <span class:gana={r.ganador === 'b'}>{corto(r.equipo_b)}</span> · {marcador(r).replace(/  /g, ' ')}</b></span>
          <span class="c-insignia {r.oficial ? 'azul' : 'ok'}">{r.oficial ? 'Oficial' : '✓ Los 4'}</span>
        </div>
      {/each}
    {/if}
  </div>

  <section class="c-tarjeta tabla-r">
    <h2 class="c-sec">Ranking del club</h2>
    <ol>
      {#each tabla as f (f.perfil.user_id)}
        <li>
          <span class="pos c-num" class:oro={f.pos === 1}>{f.pos}</span>
          <span class="nom"><b>{f.perfil.nombre}</b><small>{f.perfil.categoria ? `${f.perfil.categoria}ª` : '—'} · {f.victorias}-{f.derrotas}{f.racha >= 3 ? ` · ${textoRacha(f.racha)}` : ''}</small></span>
          <b class="pts c-num">{f.puntos.toLocaleString('es-CO')}</b>
        </li>
      {:else}
        <li class="c-vacio">Aún no hay jugadores del club en el ranking.</li>
      {/each}
    </ol>
  </section>
</div>

<style>
  .hecho { margin: 0 0 12px; padding: 10px 14px; border-radius: 10px; background: rgba(60, 207, 142, 0.14); color: var(--c-verde); font-weight: 800; font-size: 14px; }
  .dos { display: grid; grid-template-columns: 1.5fr 1fr; gap: 12px; align-items: start; }
  .col { display: flex; flex-direction: column; gap: 10px; }
  .c-sec.rojo { color: var(--c-error); }
  .col .c-sec:not(:first-child) { margin-top: 8px; }
  .disputa { padding: 14px; border-radius: 16px; background: rgba(232, 71, 91, 0.08); border: 1px solid rgba(232, 71, 91, 0.35); display: flex; flex-direction: column; gap: 10px; }
  .arriba { display: flex; justify-content: space-between; align-items: baseline; }
  .arriba small:last-child { font-size: 12px; color: var(--q-tx2); }
  .marcador { border-radius: 12px; background: var(--q-noche); color: #fff; overflow: hidden; }
  .linea { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; }
  .linea + .linea { border-top: 1px solid rgba(255, 255, 255, 0.1); }
  .linea b { font-size: 15px; }
  .nums { display: flex; gap: 14px; }
  .nums .c-num { font-size: 26px; min-width: 22px; text-align: center; }
  .motivo { margin: 0; color: var(--c-error); font-size: 13.5px; }
  .fila-b { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .corr { margin-left: auto; color: var(--q-tx2); font-size: 12.5px; padding: 0 4px; }
  .resolver { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: #fff; }
  .sets { display: flex; gap: 12px; }
  .set { display: flex; align-items: center; gap: 6px; }
  .set .c-input { width: 54px; text-align: center; }
  .gana-tx { margin: 0; font-weight: 800; font-size: 13.5px; }
  .pend { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: #fff; border: var(--c-borde); }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .txt b { font-size: 14.5px; }
  .txt small { font-size: 12.5px; color: var(--q-tx2); }
  .gana { color: var(--q-acct); }
  .falta { font-size: 13px; font-weight: 900; color: var(--c-oro); white-space: nowrap; }
  .tabla-r { padding: 16px 16px 6px; }
  ol { list-style: none; margin: 10px 0 0; padding: 0; }
  ol li { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
  ol li + li { border-top: var(--c-borde); }
  .pos { width: 28px; font-size: 26px; color: var(--q-tx3); }
  .pos.oro { color: var(--c-dorado); }
  .nom { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .nom b { font-size: 14.5px; }
  .nom small { font-size: 12px; color: var(--q-tx2); }
  .pts { font-size: 22px; }
</style>
