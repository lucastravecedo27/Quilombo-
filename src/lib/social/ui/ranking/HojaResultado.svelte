<script lang="ts">
  // Registrar el resultado de un partido: tu pareja, los rivales y los sets. Tú quedas de acuerdo al proponerlo;
  // vale para el ranking cuando los otros tres confirman. En la demo, los demás pueden confirmar solos.
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { E2E } from '$lib/app/sesion.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { proponerResultado } from '../../app/resultados';
  import { genteActiva } from '../../app/rituales';
  import { nombreDe, perfilDe, yo } from '../../app/vinculos';
  import { setValido } from '../../domain/social';
  import { ganadorDeSets } from '../../domain/ranking';
  import { botsConfirman } from './ranking';

  let { abierto = $bindable(false), partido = null, club = null, gente = [] }:
    { abierto?: boolean; partido?: string | null; club?: string | null; gente?: string[] } = $props();

  type Lado = 'a' | 'b' | null;
  let lado = $state<Record<string, Lado>>({});
  let sets = $state<[number, number][]>([[6, 4], [6, 3]]);
  let solos = $state(true);
  let error = $state('');
  let enviando = $state(false);

  // Primero los del partido, luego el resto de tu gente
  const candidatos = $derived([...new Set([...gente, ...genteActiva()])].filter((u) => u !== yo()));
  $effect(() => {
    if (!abierto) return;
    // Al abrir: el primero de los del partido de pareja y los dos siguientes de rivales (se puede cambiar)
    const del = gente.filter((u) => u !== yo());
    lado = Object.fromEntries(del.slice(0, 3).map((u, k) => [u, k === 0 ? 'a' : 'b']));
    sets = [[6, 4], [6, 3]]; error = ''; solos = true;
  });
  const equipoA = $derived([yo(), ...candidatos.filter((u) => lado[u] === 'a')]);
  const equipoB = $derived(candidatos.filter((u) => lado[u] === 'b'));
  const setsOk = $derived(sets.length > 0 && sets.every(setValido) && ganadorDeSets(sets) !== null);
  const listo = $derived(equipoA.length === 2 && equipoB.length === 2 && setsOk);
  const ganan = $derived(ganadorDeSets(sets));

  function poner(u: string, l: Lado) {
    toque(4);
    const n = { ...lado, [u]: lado[u] === l ? null : l };
    // Máximo: 1 de pareja y 2 rivales; si se pasa, sale el más viejo de ese lado
    const de = (x: Lado) => candidatos.filter((c) => n[c] === x);
    if (l === 'a' && de('a').length > 1) for (const c of de('a')) if (c !== u) n[c] = null;
    if (l === 'b' && de('b').length > 2) n[de('b').find((c) => c !== u)!] = null;
    lado = n;
  }
  const cambiarSet = (k: number, i: 0 | 1, v: number) => { const s = sets.map((x) => [...x] as [number, number]); s[k][i] = v; sets = s; };

  async function enviar() {
    if (!listo || enviando) return;
    enviando = true; error = '';
    const r = await proponerResultado({ partido_id: partido, club_id: club, equipo_a: $state.snapshot(equipoA), equipo_b: $state.snapshot(equipoB), sets: $state.snapshot(sets) });
    enviando = false;
    if (r.error || !r.id) { error = r.error ?? 'No se pudo'; return; }
    toque(18);
    if (solos) botsConfirman(r.id, { equipo_a: equipoA, equipo_b: equipoB });
    ui.avisar({ titulo: 'Resultado enviado', sub: 'Vale cuando los 4 lo confirmen', icono: 'check' });
    abierto = false;
    ui.navegar(`/resultado/${r.id}/`);
  }
</script>

<Hoja bind:abierto titulo="Registrar resultado" sub="Vale para el ranking cuando los 4 confirmen">
  <p class="lbl">¿Quién jugó con quién?</p>
  <div class="q-lista gente">
    <div class="q-fila">
      <FotoPerfil perfil={perfilDe(yo()) ?? { nombre: nombreDe(yo()), color: '#ff5b1f' }} size={34} />
      <span class="cuerpo"><span class="titulo">Tú</span></span>
      <span class="seg"><span class="fijo">Tu lado</span></span>
    </div>
    {#each candidatos as u (u)}
      <div class="q-fila">
        <FotoPerfil perfil={perfilDe(u) ?? { nombre: nombreDe(u), color: '#1e7fd0' }} size={34} />
        <span class="cuerpo"><span class="titulo">{nombreDe(u)}</span>{#if gente.includes(u)}<span class="sub">Del partido</span>{/if}</span>
        <span class="seg" role="group" aria-label="Lado de {nombreDe(u)}">
          <button class:on={lado[u] === 'a'} aria-pressed={lado[u] === 'a'} onclick={() => poner(u, 'a')}>Pareja</button>
          <button class:on={lado[u] === 'b'} class="riv" aria-pressed={lado[u] === 'b'} onclick={() => poner(u, 'b')}>Rival</button>
        </span>
      </div>
    {/each}
  </div>
  <p class="resumen">{equipoA.map((u) => (u === yo() ? 'Tú' : nombreDe(u).split(' ')[0])).join(' y ')} <i>vs</i> {equipoB.length ? equipoB.map((u) => nombreDe(u).split(' ')[0]).join(' y ') : '…'}</p>

  <p class="lbl">Sets (tu lado primero)</p>
  <div class="sets">
    {#each sets as s, k (k)}
      <div class="set" class:mal={!setValido(s)}>
        <span>Set {k + 1}</span>
        <select class="q-input" value={s[0]} onchange={(e) => cambiarSet(k, 0, +(e.currentTarget as HTMLSelectElement).value)} aria-label="Set {k + 1}, tu lado">{#each [0, 1, 2, 3, 4, 5, 6, 7] as n (n)}<option value={n}>{n}</option>{/each}</select>
        <b>–</b>
        <select class="q-input" value={s[1]} onchange={(e) => cambiarSet(k, 1, +(e.currentTarget as HTMLSelectElement).value)} aria-label="Set {k + 1}, rivales">{#each [0, 1, 2, 3, 4, 5, 6, 7] as n (n)}<option value={n}>{n}</option>{/each}</select>
        {#if sets.length > 1}<button class="quitar" aria-label="Quitar set {k + 1}" onclick={() => (sets = sets.filter((_, i) => i !== k))}>✕</button>{/if}
      </div>
    {/each}
    {#if sets.length < 3}<button class="mas" onclick={() => (sets = [...sets, [6, 4]])}>+ Agregar set</button>{/if}
  </div>
  {#if !setsOk}<p class="err">Revisa los sets: se gana a 6 con diferencia de 2, 7-5 o 7-6, y alguien tiene que ganar más sets.</p>
  {:else}<p class="gana">{ganan === 'a' ? '🏆 Ganaron ustedes' : 'Ganaron los rivales'}</p>{/if}

  {#if E2E}
    <label class="demo"><input type="checkbox" bind:checked={solos} /> <span><b>Demo:</b> que los demás confirmen solos (apágalo si otro iPhone confirma como esa persona)</span></label>
  {/if}
  {#if error}<p class="err">{error}</p>{/if}
  {#snippet pie()}
    <button class="q-btn bloque" disabled={!listo || enviando} onclick={enviar}>{enviando ? 'Enviando…' : equipoA.length < 2 || equipoB.length < 2 ? 'Elige tu pareja y 2 rivales' : 'Enviar para confirmar'}</button>
  {/snippet}
</Hoja>

<style>
  .lbl { margin: 10px 0 6px; font-size: 13px; font-weight: 800; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.06em; }
  .gente { margin: 0; }
  .gente .q-fila { min-height: 52px; }
  .seg { display: flex; gap: 4px; flex-shrink: 0; }
  .seg button { height: 32px; padding: 0 10px; border: 0; border-radius: 8px; background: var(--q-sub); color: var(--q-tx); font-size: 13px; font-weight: 800; }
  .seg button.on { background: var(--q-azul); color: #fff; }
  .seg button.riv.on { background: var(--q-naranja); }
  .fijo { font-size: 13px; font-weight: 800; color: var(--q-azul); padding: 0 6px; }
  .resumen { margin: 8px 2px 0; font-size: 15px; font-weight: 800; }
  .resumen i { font-style: normal; color: var(--q-naranja); margin: 0 4px; }
  .sets { display: flex; flex-direction: column; gap: 8px; }
  .set { display: grid; grid-template-columns: 56px 1fr 14px 1fr 32px; align-items: center; gap: 8px; }
  .set span { font-size: 14px; font-weight: 800; color: var(--q-tx2); }
  .set select { height: 44px; text-align: center; font-weight: 800; }
  .set.mal select { box-shadow: inset 0 0 0 2px var(--q-alr); }
  .quitar { width: 32px; height: 32px; border: 0; border-radius: 8px; background: var(--q-sub); color: var(--q-tx2); }
  .mas { align-self: flex-start; height: 36px; padding: 0 12px; border: 0; border-radius: 8px; background: none; color: var(--q-link); font-weight: 800; font-size: 14px; }
  .err { color: var(--q-alr); font-size: 13.5px; }
  .gana { font-size: 14px; font-weight: 800; color: var(--q-ok); }
  .demo { display: flex; gap: 8px; align-items: flex-start; margin-top: 8px; padding: 10px; border-radius: 10px; background: var(--q-sub); font-size: 13px; color: var(--q-tx2); }
  .demo input { margin-top: 2px; accent-color: var(--q-naranja); }
</style>
