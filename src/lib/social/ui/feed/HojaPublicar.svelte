<script lang="ts">
  // Publicar en tu red: una foto (o varias) o el resultado de un partido (sets, con quién jugaste y contra quién).
  import Hoja from '$lib/ui/Hoja.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { pedirTerminos, publicar } from '../../app/social';
  import { genteActiva, primerNombre } from '../../app/rituales';
  import { nombreDe } from '../../app/vinculos';
  import { miPerfil } from '../../app/perfil.svelte';
  import { setValido } from '../../domain/social';

  let abierto = $state(false);
  let tipo = $state<'foto' | 'resultado_partido'>('foto');
  let fotos = $state<File[]>([]);
  let texto = $state('');
  let sets = $state<[number, number][]>([[6, 4], [6, 4]]);
  let companero = $state<string | null>(null);
  let rivales = $state<string[]>([]);
  let enviando = $state(false);
  let progreso = $state(0);
  let error = $state('');
  let archivo: HTMLInputElement | undefined = $state();

  $effect(() => {
    const p = ui.publicar;
    if (!p) return;
    tipo = p.tipo; fotos = []; texto = ''; sets = [[6, 4], [6, 4]]; companero = null; rivales = []; error = ''; progreso = 0;
    abierto = true;
  });
  const gente = $derived(genteActiva());
  const setsOk = $derived(sets.every(setValido));
  const listo = $derived(tipo === 'foto' ? fotos.length > 0 : setsOk);

  function elegir(e: Event) {
    const i = e.currentTarget as HTMLInputElement;
    fotos = [...fotos, ...Array.from(i.files ?? [])].slice(0, 6);
    i.value = '';
  }
  const alternarRival = (u: string) => { toque(4); rivales = rivales.includes(u) ? rivales.filter((x) => x !== u) : [...rivales, u].slice(-2); if (companero === u) companero = null; };
  async function enviar() {
    if (!listo || enviando || !(await pedirTerminos())) return;
    enviando = true; error = '';
    const yoP = miPerfil();
    // $state.snapshot: los arreglos reactivos son proxies y IndexedDB no los puede guardar
    const marcadorSets = $state.snapshot(sets) as [number, number][], conRivales = $state.snapshot(rivales);
    const r = await publicar({
      tipo, texto: texto.trim() || undefined, fotos: $state.snapshot(fotos) as File[],
      marcador: tipo === 'resultado_partido' ? { sets: marcadorSets, companero, rivales: conRivales, club: yoP.club_base ?? null } : null,
      con: [companero, ...conRivales].filter((x): x is string => !!x), club: yoP.club_base ?? null, ciudad: yoP.ciudad ?? null
    }, (p) => (progreso = p));
    enviando = false;
    if (r.error) { error = r.error; return; }
    toque(18);
    ui.avisar({ titulo: tipo === 'foto' ? '¡Foto publicada!' : '¡Resultado publicado!', sub: 'Ya la ve tu gente', icono: 'check' });
    abierto = false;
  }
</script>

<Hoja bind:abierto titulo={tipo === 'foto' ? 'Subir foto' : 'Resultado del partido'} alCerrar={() => (ui.publicar = null)}>
  <div class="tipo" role="tablist">
    <button role="tab" aria-selected={tipo === 'foto'} class:on={tipo === 'foto'} onclick={() => (tipo = 'foto')}>📸 Foto</button>
    <button role="tab" aria-selected={tipo === 'resultado_partido'} class:on={tipo === 'resultado_partido'} onclick={() => (tipo = 'resultado_partido')}>🎾 Resultado</button>
  </div>

  {#if tipo === 'resultado_partido'}
    <p class="lbl">Sets (tú – ellos)</p>
    {#each sets as s, i (i)}
      <div class="set" class:mal={!setValido(s)}>
        <span>Set {i + 1}</span>
        <input type="number" inputmode="numeric" min="0" max="7" bind:value={s[0]} aria-label="Set {i + 1}: tus juegos" />
        <i>–</i>
        <input type="number" inputmode="numeric" min="0" max="7" bind:value={s[1]} aria-label="Set {i + 1}: sus juegos" />
        {#if sets.length > 1}<button class="x" aria-label="Quitar set {i + 1}" onclick={() => (sets = sets.filter((_, k) => k !== i))}><Icon name="cerrar" size={12} stroke={2.6} /></button>{/if}
      </div>
    {/each}
    {#if sets.length < 3}<button class="mas" onclick={() => (sets = [...sets, [6, 4]])}>＋ Tercer set</button>{/if}
    {#if !setsOk}<p class="err">Un set va a 6 (con 2 de diferencia), 7-5 o 7-6.</p>{/if}
    {#if gente.length}
      <p class="lbl">Tu pareja</p>
      <div class="chips">{#each gente as u (u)}<button class:on={companero === u} onclick={() => { toque(4); companero = companero === u ? null : u; rivales = rivales.filter((x) => x !== u); }}>{primerNombre(nombreDe(u))}</button>{/each}</div>
      <p class="lbl">Rivales</p>
      <div class="chips">{#each gente.filter((u) => u !== companero) as u (u)}<button class:on={rivales.includes(u)} onclick={() => alternarRival(u)}>{primerNombre(nombreDe(u))}</button>{/each}</div>
    {/if}
  {/if}

  <button class="q-btn suave bloque elegir" onclick={() => archivo?.click()}><Icon name="camara" size={18} /> {fotos.length ? `${fotos.length} foto${fotos.length === 1 ? '' : 's'} · agregar más` : tipo === 'foto' ? 'Elegir fotos' : 'Agregar una foto (opcional)'}</button>
  <input bind:this={archivo} type="file" accept="image/*" multiple hidden onchange={elegir} aria-label="Elegir fotos" />
  <textarea class="q-input" rows="2" maxlength="300" placeholder="Escribe algo… (opcional)" bind:value={texto} aria-label="Texto"></textarea>
  {#if error}<p class="err">{error}</p>{/if}
  {#snippet pie()}
    <button class="q-btn bloque" disabled={!listo || enviando} onclick={enviar}>{enviando ? `Subiendo… ${Math.round(progreso * 100)}%` : 'Publicar'}</button>
  {/snippet}
</Hoja>

<style>
  .tipo { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 10px; background: var(--q-sub); margin-bottom: 12px; }
  .tipo button { height: 36px; border: 0; border-radius: 10px; background: none; font-weight: 900; color: var(--q-tx2); }
  .tipo button.on { background: var(--q-card); color: var(--q-tx); }
  .lbl { margin: 10px 0 6px; font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .set { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .set span { width: 52px; font-size: 14px; font-weight: 800; }
  .set input { width: 56px; height: 42px; border: 0; border-radius: 12px; background: var(--q-sub); color: var(--q-tx); text-align: center; font: inherit; font-size: 20px; font-weight: 900; }
  .set.mal input { box-shadow: 0 0 0 2px var(--q-alr); }
  .x { width: 28px; height: 28px; border: 0; border-radius: 14px; background: var(--q-sub); color: var(--q-tx2); display: flex; align-items: center; justify-content: center; padding: 0; }
  .mas { border: 0; background: none; color: var(--q-link); font-weight: 900; padding: 4px 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { height: 34px; padding: 0 14px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-weight: 800; }
  .chips button.on { background: var(--q-acc); color: var(--q-acctx); }
  .elegir { margin: 14px 0 10px; }
  .err { color: var(--q-alr); font-size: 13.5px; margin: 6px 0; }
</style>
