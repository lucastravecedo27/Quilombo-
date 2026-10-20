<script lang="ts">
  import { colorMarca } from '$lib/ui/avatares';
  // La actividad de tu gente (resultados, ranking, torneos, partidos, gestos, conexiones, canchas divididas…)
  // con 7 reacciones. Tocar un momento lleva a lo suyo. Se carga de 12 en 12.
  import { datos } from '$lib/data/datos.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { hace, ini, relacionCon } from '../../app/rituales';
  import { nombreDe, perfilDe, reaccionar, yo } from '../../app/vinculos';
  import { estiloEvento, REACCIONES, type EventoMuro } from '../../domain/social';

  let { eventos, paso = 12 }: { eventos: EventoMuro[]; paso?: number } = $props();
  let paginas = $state(1);
  const cuantos = $derived(paginas * paso);
  let abierto = $state<string | null>(null);
  const visibles = $derived(eventos.slice(0, cuantos));
  const reaccionesDe = (ev: string) => (datos.reacciones as { evento_id: string; user_id: string; reaccion: string }[]).filter((r) => r.evento_id === ev);
  const otroDe = (ev: EventoMuro) => (ev.actor !== yo() ? ev.actor : ev.participantes.find((p) => p !== yo()) ?? null);

  function ir(ev: EventoMuro) {
    toque();
    const otro = otroDe(ev);
    if ((ev.tipo === 'foto' || ev.tipo === 'resultado_partido') && ev.ref) { ui.navegar(`/publicacion/${ev.ref}/`); return; }
    if (ev.tipo === 'partido' && ev.ref) { ui.navegar(`/partido/${ev.ref}/`); return; }
    if (ev.tipo === 'torneo' && ev.ref) { ui.navegar(`/torneo/${ev.ref}/`); return; }
    if ((ev.tipo === 'cobro' || ev.tipo === 'pago') && otro) {
      const r = relacionCon(otro);
      if (r) { ui.navegar(`/chat/r/${r.id}/`); return; }
    }
    if (ev.tipo === 'subio_ranking') { ui.navegar(`/persona/${ev.actor}/`); return; }
    if (otro) ui.navegar(`/persona/${otro}/`);
  }
  async function reaccion(ev: string, r: string) {
    toque(8);
    abierto = null;
    const mia = reaccionesDe(ev).find((x) => x.user_id === yo());
    const err = await reaccionar(ev, mia?.reaccion === r ? null : r);
    if (err) ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta' });
  }
</script>

<div class="muro">
  {#each visibles as ev (ev.id)}
    {@const rs = reaccionesDe(ev.id)}
    {@const e = estiloEvento(ev.tipo, ev.gesto)}
    {@const conteo = REACCIONES.map((r) => ({ ...r, n: rs.filter((x) => x.reaccion === r.id).length, mia: rs.some((x) => x.reaccion === r.id && x.user_id === yo()) })).filter((r) => r.n)}
    <div class="post" class:especial={ev.tipo === 'subio_ranking' || ev.tipo === 'torneo'}>
      <span class="av" style="background:{colorMarca(perfilDe(ev.actor)?.color ?? 'var(--q-fiesta-lila)')}">{ev.actor === yo() ? 'TÚ' : ini(nombreDe(ev.actor))}<i style="background:{e.color}">{e.emoji}</i></span>
      <div class="cuerpo">
        <button class="burbuja" onclick={() => ir(ev)}>{ev.texto}<small>{hace(ev.created_at)}</small></button>
        <div class="reacc">
          {#each conteo as r (r.id)}
            <button class="r" class:mia={r.mia} onclick={() => reaccion(ev.id, r.id)} aria-label="{r.nombre}: {r.n}">{r.emoji} {r.n}</button>
          {/each}
          <button class="r mas" class:on={abierto === ev.id} aria-label="Reaccionar" aria-expanded={abierto === ev.id} onclick={() => { toque(4); abierto = abierto === ev.id ? null : ev.id; }}>{abierto === ev.id ? '✕' : '＋😊'}</button>
        </div>
        {#if abierto === ev.id}
          <div class="selector q-pop" role="group" aria-label="Elige una reacción">
            {#each REACCIONES as r (r.id)}<button onclick={() => reaccion(ev.id, r.id)} aria-label={r.nombre} title={r.nombre}>{r.emoji}</button>{/each}
          </div>
        {/if}
      </div>
    </div>
  {/each}
  {#if eventos.length > cuantos}
    <button class="ver-mas" onclick={() => { toque(); paginas += 1; }}>Ver más</button>
  {/if}
</div>

<style>
  .muro { display: flex; flex-direction: column; gap: 12px; font-family: var(--q-font-fiesta); }
  .post { display: flex; gap: 10px; align-items: flex-start; }
  .av { position: relative; width: 42px; height: 42px; border-radius: 21px; color: var(--q-fiesta-tinta); font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .av i { position: absolute; right: -6px; bottom: -4px; width: 22px; height: 22px; border-radius: 11px; font-style: normal; font-size: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--q-bg); }
  .cuerpo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .burbuja { align-self: stretch; border: 0; background: var(--q-sub); color: var(--q-tx); border-radius: 14px 14px 14px 6px; padding: 10px 14px; font-family: inherit; font-size: 14.5px; line-height: 1.35; text-align: left; display: flex; flex-direction: column; gap: 2px; }
  .especial .burbuja { background: color-mix(in srgb, var(--q-fiesta-lima) 24%, var(--q-sub)); font-weight: 800; }
  .burbuja small { font-size: 11px; color: var(--q-tx3); font-weight: 600; }
  .reacc { display: flex; gap: 6px; flex-wrap: wrap; }
  .r { height: 30px; padding: 0 10px; border-radius: 10px; border: 0; background: var(--q-sub); color: var(--q-tx2); font-family: inherit; font-size: 13px; font-weight: 800; }
  .r.mia { background: var(--q-fiesta-lima); color: var(--q-fiesta-tinta); }
  .r.mas { padding: 0 9px; font-size: 12px; opacity: 0.85; }
  .r.mas.on { background: var(--q-fiesta-tinta); color: #fff; }
  .selector { display: flex; gap: 2px; align-self: flex-start; padding: 4px; border-radius: 14px; background: var(--q-card); border: 0.5px solid var(--q-line); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18); }
  .selector button { width: 38px; height: 38px; border: 0; border-radius: 19px; background: none; font-size: 22px; transition: transform var(--q-dur-fast) var(--q-spring); }
  .selector button:active { transform: scale(1.35); }
  .ver-mas { align-self: center; height: 38px; padding: 0 18px; border-radius: 10px; border: 0; background: var(--q-sub); color: var(--q-tx); font-family: inherit; font-size: 14px; font-weight: 800; }
</style>
