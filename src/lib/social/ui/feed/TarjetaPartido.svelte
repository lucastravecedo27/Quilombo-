<script lang="ts">
  // Un partido abierto en el feed: cuándo, dónde, quiénes van y cuántos faltan, con "Voy" / "No puedo".
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { franjaCompleta, miRespuesta, responderPartido, respuestas } from '../../app/jugar';
  import { nombreDe, perfilDe, yo } from '../../app/vinculos';
  import { primerNombre } from '../../app/rituales';
  import { confirmados, cuando, faltan, pesos, type Partido } from '../../domain/jugar';

  let { partido }: { partido: Partido } = $props();
  const p = $derived(partido);
  const f = $derived(franjaCompleta(p.franja_id));
  const van = $derived(confirmados(p, respuestas()));
  const quedan = $derived(faltan(p, respuestas()));
  const mia = $derived(miRespuesta(p.id));
  const soyCreador = $derived(p.creador === yo());

  async function respondiendo(id: string, r: 'voy' | 'no') {
    toque(r === 'voy' ? 14 : 6);
    const err = await responderPartido(id, r);
    if (err) ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta' });
    else if (r === 'voy') ui.avisar({ titulo: '¡Listo, vas!', sub: 'Le avisamos a quien lo armó', icono: 'check' });
  }
</script>

<div class="partido" id="partido-{p.id}">
  <button class="cuerpo" onclick={() => { toque(); ui.navegar(`/partido/${p.id}/`); }}>
    <span class="cara"><FotoPerfil perfil={perfilDe(p.creador) ?? { nombre: nombreDe(p.creador), color: '#1e7fd0' }} size={40} /></span>
    <span class="tx">
      <b>{soyCreador ? 'Tu partido' : `${primerNombre(nombreDe(p.creador))} arma partido · ¿jugamos?`}</b>
      <small>{cuando(p.cuando)} · {f ? f.club.nombre : `${p.ciudad} · cancha por apartar`}{quedan ? ` · faltan ${quedan}` : ' · ¡completos!'}</small>
      {#if p.nota || f}<small class="nota">{[f ? `${f.cancha.nombre} · ${pesos(f.precio)}` : '', p.nota ?? ''].filter(Boolean).join(' · ')}</small>{/if}
    </span>
    <span class="caras" aria-label="{van.length} van">{#each van.slice(0, 4) as u (u)}<span class="c"><FotoPerfil perfil={perfilDe(u) ?? { nombre: nombreDe(u), color: '#3346a8' }} size={26} /></span>{/each}</span>
  </button>
  {#if !soyCreador}
    {#if mia === 'voy' || mia === 'no'}
      <div class="hecho">{mia === 'voy' ? `✓ Vas · le avisamos a ${primerNombre(nombreDe(p.creador))}` : `Le dijiste a ${primerNombre(nombreDe(p.creador))} que no puedes`}<button class="cambiar" onclick={() => respondiendo(p.id, mia === 'voy' ? 'no' : 'voy')}>Cambiar</button></div>
    {:else}
      <div class="resp">
        <button class="voy" onclick={() => respondiendo(p.id, 'voy')}>Voy</button>
        <button onclick={() => respondiendo(p.id, 'no')}>No puedo</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .partido { margin: 0; padding: 14px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); color: var(--q-tx); font-family: var(--q-font); display: flex; flex-direction: column; gap: 12px; }
  .cuerpo { border: 0; background: none; padding: 0; color: inherit; text-align: left; display: flex; align-items: center; gap: 10px; }
  .cara { flex: none; display: inline-flex; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  b { font-size: 15px; font-weight: 800; }
  small { font-size: 13px; color: var(--q-tx2); }
  .nota { font-size: 12.5px; }
  .caras { display: flex; flex: none; }
  .c { display: inline-flex; margin-left: -6px; border-radius: 50%; box-shadow: 0 0 0 2px var(--q-card); }
  .resp { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .resp button { height: 42px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-size: 15px; font-weight: 900; }
  .resp .voy { background: var(--q-acc); color: var(--q-acctx); }
  .hecho { height: 42px; border-radius: 10px; background: var(--q-sub); display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14.5px; font-weight: 900; }
  .cambiar { border: 0; background: none; color: var(--q-acct); font-size: 13px; font-weight: 800; padding: 0; text-decoration: underline; }
</style>
