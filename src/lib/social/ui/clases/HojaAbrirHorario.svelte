<script lang="ts">
  // Modo profesor: abrir un horario de clase en 4 pasos. 1 · Club (de los míos) → 2 · Día → 3 · Cancha libre de ese
  // club ese día → 4 · Tipo (individual o grupal con cupos) y precio. La cancha queda apartada para la clase y los
  // alumnos ya la pueden reservar.
  import { untrack } from 'svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { datos } from '$lib/data/datos.svelte';
  import { profesor, publicarClase } from '../../app/clases';
  import { canchas, clubes, franjas } from '../../app/jugar';
  import { yo } from '../../app/vinculos';
  import { diaColombia, horaColombia, pesos } from '../../domain/jugar';

  let abierto = $state(false);
  let club = $state('');
  let dia = $state('');
  let franja = $state<string | null>(null);
  let tipo = $state<'individual' | 'grupal'>('individual');
  let cupos = $state(4);
  let precio = $state(0);
  let nota = $state('');
  let enviando = $state(false);
  let error = $state('');

  const yoProfe = $derived(profesor(yo()));
  const misClubes = $derived(clubes().filter((c) => yoProfe?.clubes.includes(c.id)));
  const dias = Array.from({ length: 7 }, (_, i) => diaColombia(new Date(Date.now() + i * 86_400_000).toISOString()));
  const arriba = (d: string, i: number) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'America/Bogota' }).replace('.', ''));
  const numero = (d: string) => String(Number(d.slice(8)));

  $effect(() => {
    const a = ui.abrirHorario;
    if (!a) return;
    untrack(() => {
      const p = profesor(yo());
      club = p?.clubes[0] ?? clubes()[0]?.id ?? '';
      dia = a.dia ?? dias[0];
      franja = null; tipo = 'individual'; cupos = 4; nota = ''; error = '';
      precio = p?.precio_individual ?? 100_000;
      abierto = true;
    });
  });
  // Al cambiar el tipo se sugiere el precio del perfil
  function elegirTipo(t: 'individual' | 'grupal') {
    toque(4);
    tipo = t;
    precio = (t === 'individual' ? yoProfe?.precio_individual : yoProfe?.precio_grupal) ?? precio;
  }

  const libres = $derived.by(() => {
    void datos.franjas.length;
    const ids = new Set(canchas().filter((c) => c.club_id === club).map((c) => c.id));
    return franjas()
      .filter((f) => f.estado === 'libre' && ids.has(f.cancha_id) && diaColombia(f.inicio) === dia && Date.parse(f.inicio) > Date.now())
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  });
  const canchaDe = (id: string) => canchas().find((c) => c.id === id)?.nombre ?? 'Cancha';

  async function abrir() {
    if (!franja || enviando || precio < 10_000) return;
    enviando = true; error = '';
    const err = await publicarClase({ franja_id: franja, tipo, cupos: tipo === 'individual' ? 1 : cupos, precio, nota: nota.trim() || null });
    enviando = false;
    if (err) { error = err; return; }
    toque(18);
    ui.avisar({ titulo: '¡Horario abierto! 🎓', sub: 'Ya te pueden reservar · la cancha quedó apartada para la clase', icono: 'check' });
    abierto = false;
  }
</script>

<Hoja bind:abierto titulo="Abrir horario de clase" sub="Los jugadores lo ven en tu perfil y lo reservan" alCerrar={() => (ui.abrirHorario = null)}>
  <div class="paso">
    <small>1 · Club</small>
    <div class="chips">
      {#each misClubes as c (c.id)}<button class:on={club === c.id} onclick={() => { toque(4); club = c.id; franja = null; }}>{c.nombre}</button>{/each}
    </div>
  </div>
  <div class="paso">
    <small>2 · Día</small>
    <div class="chips dias">
      {#each dias as d, i (d)}<button class="dia" class:on={dia === d} onclick={() => { toque(4); dia = d; franja = null; }}><small>{arriba(d, i)}</small><b>{numero(d)}</b></button>{/each}
    </div>
  </div>
  <div class="paso">
    <small>3 · Cancha libre</small>
    {#if libres.length}
      <div class="franjas" role="radiogroup" aria-label="Canchas libres">
        {#each libres as f (f.id)}
          <button role="radio" aria-checked={franja === f.id} class:on={franja === f.id} onclick={() => { toque(4); franja = f.id; }}>
            <b>{horaColombia(f.inicio)}</b><small>{canchaDe(f.cancha_id)}</small>
          </button>
        {/each}
      </div>
    {:else}
      <p class="nota">No hay canchas libres en ese club ese día. Prueba otro día.</p>
    {/if}
  </div>
  <div class="paso">
    <small>4 · Tipo y precio</small>
    <div class="seg" role="radiogroup" aria-label="Tipo de clase">
      <button role="radio" aria-checked={tipo === 'individual'} class:on={tipo === 'individual'} onclick={() => elegirTipo('individual')}>👤 Individual</button>
      <button role="radio" aria-checked={tipo === 'grupal'} class:on={tipo === 'grupal'} onclick={() => elegirTipo('grupal')}>👥 Grupal</button>
    </div>
    <div class="fila">
      {#if tipo === 'grupal'}
        <div class="cupos">
          <span>Cupos</span>
          <span class="ctrl"><button aria-label="Menos cupos" onclick={() => (cupos = Math.max(2, cupos - 1))}>−</button><b>{cupos}</b><button aria-label="Más cupos" onclick={() => (cupos = Math.min(8, cupos + 1))}>+</button></span>
        </div>
      {/if}
      <label class="precio"><span>$</span><input type="number" inputmode="numeric" min="10000" step="5000" bind:value={precio} aria-label="Precio de la clase" /></label>
    </div>
    <input class="nota-in" maxlength="80" placeholder="Nota (opcional): traer pala, nivel…" bind:value={nota} aria-label="Nota" />
  </div>
  {#if error}<p class="err">{error}</p>{/if}
  {#snippet pie()}
    <button class="abrir" disabled={!franja || enviando || precio < 10_000} onclick={abrir}>{enviando ? 'Abriendo…' : franja ? `Abrir horario · ${pesos(precio)}` : 'Elige una cancha libre'}</button>
  {/snippet}
</Hoja>

<style>
  .paso { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
  .paso:first-child { margin-top: 4px; }
  .paso > small { font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--q-tx2); text-transform: uppercase; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chips.dias { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .chips.dias::-webkit-scrollbar { display: none; }
  .chips button { height: 40px; padding: 0 12px; border: 1.5px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); font-family: inherit; font-size: 13.5px; font-weight: 900; }
  .chips button.on { border-color: var(--q-lila); background: rgba(51, 70, 168, 0.1); }
  :global(html.dark) .chips button.on { border-color: #8a9bff; background: rgba(120, 140, 255, 0.16); }
  .chips button.dia { flex: none; min-width: 54px; height: 50px; padding: 0 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .dia small { font-size: 10.5px; font-weight: 800; text-transform: uppercase; opacity: 0.75; }
  .dia b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 20px; line-height: 1; }
  .franjas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .franjas button { display: flex; flex-direction: column; align-items: flex-start; padding: 8px 10px; border: 1.5px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); text-align: left; font-family: inherit; }
  .franjas button.on { border-color: var(--q-lila); background: rgba(51, 70, 168, 0.1); }
  :global(html.dark) .franjas button.on { border-color: #8a9bff; background: rgba(120, 140, 255, 0.16); }
  .franjas b { font-size: 15px; font-weight: 800; }
  .franjas small { font-size: 12px; color: var(--q-tx2); }
  .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: var(--q-sub); }
  .seg button { height: 40px; border: 0; border-radius: 9px; background: transparent; color: var(--q-tx); font-family: inherit; font-size: 14px; font-weight: 900; }
  .seg button.on { background: var(--q-card); box-shadow: 0 2px 6px rgba(14, 27, 51, 0.12); }
  .fila { display: flex; gap: 8px; }
  .cupos { flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 14px; height: 50px; border-radius: 12px; background: var(--q-sub); }
  .cupos > span:first-child { font-size: 14px; font-weight: 800; }
  .ctrl { display: flex; align-items: center; gap: 8px; }
  .ctrl button { width: 32px; height: 32px; border: 0; border-radius: 16px; background: var(--q-card); color: var(--q-tx); font-weight: 900; }
  .ctrl b { width: 14px; text-align: center; font-size: 17px; }
  .precio { flex: 1; display: flex; align-items: center; gap: 6px; padding: 0 14px; height: 50px; border-radius: 12px; background: var(--q-sub); }
  .precio span { font-size: 14px; font-weight: 800; color: var(--q-tx2); }
  .precio input { flex: 1; min-width: 0; border: 0; background: none; color: var(--q-tx); font: inherit; font-size: 17px; font-weight: 800; outline: none; }
  .nota-in { height: 46px; border: 0; border-radius: 12px; background: var(--q-sub); color: var(--q-tx); padding: 0 14px; font: inherit; font-size: 16px; outline: none; }
  .nota { font-size: 14px; color: var(--q-tx2); margin: 0; }
  .err { color: var(--q-alr); font-size: 14px; font-weight: 700; }
  .abrir { width: 100%; height: 54px; border: 0; border-radius: 12px; background: var(--q-lila); color: #fff; font-family: inherit; font-size: 16.5px; font-weight: 900; }
  .abrir:disabled { opacity: 0.4; }
</style>
