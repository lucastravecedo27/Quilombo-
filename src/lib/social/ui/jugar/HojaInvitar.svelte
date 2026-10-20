<script lang="ts">
  // Invitar a jugar (una cita de pádel): con quiénes, en qué ciudad y qué día. Se ven las canchas libres de esa ciudad
  // ese día; al elegir una queda apartada para el partido. Sin cancha, se pone la hora y se aparta después.
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { datos } from '$lib/data/datos.svelte';
  import { buscarFranjas, canchas, ciudades, clubes, franjaCompleta, franjas, invitarAJugar } from '../../app/jugar';
  import { genteActiva, primerNombre } from '../../app/rituales';
  import { nombreDe } from '../../app/vinculos';
  import { miPerfil } from '../../app/perfil.svelte';
  import { diaColombia, disponibles, horaColombia, pesos } from '../../domain/jugar';

  let abierto = $state(false);
  let con = $state<string[]>([]);
  let ciudad = $state('');
  let dia = $state('');
  let hora = $state('19:00');
  let franja = $state<string | null>(null);
  let nota = $state('');
  let enviando = $state(false);
  let error = $state('');

  const hoy = () => diaColombia(new Date().toISOString());
  $effect(() => {
    const i = ui.invitar;
    if (!i) return;
    const f = franjaCompleta(i.franja);
    con = i.con ?? []; franja = f?.id ?? null; nota = ''; error = '';
    ciudad = f?.club.ciudad ?? miPerfil().ciudad ?? ciudades()[0] ?? 'Bogotá';
    dia = f ? diaColombia(f.inicio) : hoy();
    abierto = true;
  });
  $effect(() => { if (abierto && ciudad && dia) void buscarFranjas(ciudad, dia); });

  const gente = $derived(genteActiva());
  const libres = $derived((void datos.franjas.length, disponibles(franjas(), canchas(), clubes(), ciudad, dia)));
  const elegida = $derived(franjaCompleta(franja));
  const listo = $derived(con.length > 0 && !!dia && (!!franja || !!hora));

  const alternar = (u: string) => { toque(4); con = con.includes(u) ? con.filter((x) => x !== u) : [...con, u]; };
  async function enviar() {
    if (!listo || enviando) return;
    enviando = true; error = '';
    // Sin cancha: la hora escrita, en hora de Colombia (UTC-5)
    const cuando = elegida?.inicio ?? new Date(`${dia}T${hora}:00-05:00`).toISOString();
    const r = await invitarAJugar({ cuando, ciudad, invitados: $state.snapshot(con), nota: nota.trim() || null, franja });
    enviando = false;
    if (r.error || !r.id) { error = r.error ?? 'No se pudo'; return; }
    toque(18);
    ui.avisar({ titulo: '¡Invitación enviada! 🎾', sub: elegida ? `Cancha apartada en ${elegida.club.nombre}` : 'Cuando quieran, aparten cancha desde el partido', icono: 'check' });
    abierto = false;
    ui.navegar(`/partido/${r.id}/`);
  }
</script>

<Hoja bind:abierto titulo="Invitar a jugar" sub="Cuadren la cita y aparten cancha" alCerrar={() => (ui.invitar = null)}>
  <p class="lbl">¿Con quién?</p>
  {#if gente.length}
    <div class="chips">{#each gente as u (u)}<button class:on={con.includes(u)} aria-pressed={con.includes(u)} onclick={() => alternar(u)}>{primerNombre(nombreDe(u))}</button>{/each}</div>
  {:else}
    <p class="nota">Primero agrega a tu gente desde el buscador.</p>
  {/if}

  <div class="fila2">
    <label><span class="lbl">Ciudad</span>
      <select class="q-input" bind:value={ciudad} aria-label="Ciudad">
        {#each [...new Set([...ciudades(), ciudad])] as c (c)}<option value={c}>{c}</option>{/each}
      </select>
    </label>
    <label><span class="lbl">Día</span><input class="q-input" type="date" min={hoy()} bind:value={dia} aria-label="Día" onchange={() => (franja = null)} /></label>
  </div>

  <p class="lbl">Canchas libres ese día</p>
  {#if libres.length}
    <div class="franjas" role="radiogroup" aria-label="Canchas libres">
      {#each libres as f (f.id)}
        <button role="radio" aria-checked={franja === f.id} class:on={franja === f.id} onclick={() => { toque(4); franja = franja === f.id ? null : f.id; }}>
          <b>{horaColombia(f.inicio)}</b><span>{f.club.nombre}</span><small>{f.cancha.nombre} · {pesos(f.precio)}</small>
        </button>
      {/each}
    </div>
  {:else}
    <p class="nota">No hay canchas libres en {ciudad} ese día. Pongan la hora y aparten después.</p>
  {/if}
  {#if !franja}
    <label class="hora"><span class="lbl">Hora</span><input class="q-input" type="time" bind:value={hora} aria-label="Hora" /></label>
  {/if}
  <input class="q-input nota-in" maxlength="80" placeholder="Nota (opcional): llevo pelotas nuevas 🎾" bind:value={nota} aria-label="Nota" />
  {#if error}<p class="err">{error}</p>{/if}
  {#snippet pie()}
    <button class="q-btn bloque" disabled={!listo || enviando} onclick={enviar}>{enviando ? 'Enviando…' : con.length ? `Invitar a ${con.length === 1 ? primerNombre(nombreDe(con[0])) : `${con.length} personas`}` : 'Elige con quién'}</button>
  {/snippet}
</Hoja>

<style>
  .lbl { display: block; margin: 10px 0 6px; font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { height: 36px; padding: 0 14px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-weight: 800; }
  .chips button.on { background: var(--q-acc); color: var(--q-acctx); }
  .fila2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .franjas { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
  .franjas button { flex-shrink: 0; width: 140px; border: 0; border-radius: 10px; padding: 10px 12px; background: var(--q-sub); color: var(--q-tx); text-align: left; display: flex; flex-direction: column; gap: 2px; font-family: var(--q-font-fiesta); }
  .franjas button.on { background: var(--q-fiesta-lima); color: var(--q-fiesta-tinta); }
  .franjas b { font-size: 18px; font-weight: 900; }
  .franjas span { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .franjas small { font-size: 12px; opacity: 0.75; }
  .nota { font-size: 13.5px; color: var(--q-tx2); }
  .nota-in { margin-top: 12px; }
  .err { color: var(--q-alr); font-size: 13.5px; }
</style>
