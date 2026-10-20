<script lang="ts">
  // Mi perfil de profe (crearlo o editarlo): bio, especialidad, niveles que enseño, precios, clubes donde doy clase,
  // años, certificaciones e idiomas. Es lo que ven los jugadores al elegir profesor.
  import { untrack } from 'svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { guardarProfesor, profesor } from '../../app/clases';
  import { clubes } from '../../app/jugar';
  import { yo } from '../../app/vinculos';
  import { NIVEL_INICIACION, textoNivel } from '../../domain/clases';

  let abierto = $state(false);
  let bio = $state('');
  let especialidad = $state('');
  let niveles = $state<number[]>([]);
  let precioI = $state(100_000);
  let precioG = $state(45_000);
  let misClubes = $state<string[]>([]);
  let anos = $state(1);
  let certs = $state('');
  let idiomas = $state('Español');
  let error = $state('');
  let nuevo = $state(true);
  const NIVELES = [NIVEL_INICIACION, 6, 5, 4, 3, 2, 1];

  $effect(() => {
    if (!ui.editarProfe) return;
    untrack(() => {
      const p = profesor(yo());
      nuevo = !p;
      bio = p?.bio ?? ''; especialidad = p?.especialidad ?? ''; niveles = p ? [...p.niveles] : [NIVEL_INICIACION, 6, 5];
      precioI = p?.precio_individual ?? 100_000; precioG = p?.precio_grupal ?? 45_000;
      misClubes = p ? [...p.clubes] : clubes().slice(0, 1).map((c) => c.id);
      anos = p?.anos ?? 1; certs = p?.certificaciones.join(', ') ?? ''; idiomas = p?.idiomas.join(', ') ?? 'Español';
      error = ''; abierto = true;
    });
  });
  const alternar = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
  const lista = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  async function guardar() {
    if (!especialidad.trim() || !niveles.length || !misClubes.length) { error = 'Pon tu especialidad, al menos un nivel y un club'; return; }
    await guardarProfesor({ bio: bio.trim(), especialidad: especialidad.trim(), niveles, precio_individual: precioI, precio_grupal: precioG, clubes: misClubes, anos, certificaciones: lista(certs), idiomas: lista(idiomas) });
    toque(18);
    ui.avisar({ titulo: nuevo ? '¡Ya eres profe en Quilombo! 🎓' : 'Perfil de profe guardado', sub: nuevo ? 'Abre tu primer horario para que te reserven' : undefined, icono: 'check' });
    abierto = false;
  }
</script>

<Hoja bind:abierto titulo={nuevo ? 'Crea tu perfil de profe' : 'Tu perfil de profe'} sub="Lo ven los jugadores al elegir con quién tomar clase" alCerrar={() => (ui.editarProfe = false)}>
  <label class="campo"><span class="lbl">Especialidad</span><input class="q-input" maxlength="40" placeholder="Técnica, táctica, iniciación…" bind:value={especialidad} aria-label="Especialidad" /></label>
  <label class="campo"><span class="lbl">Sobre ti</span><textarea class="q-input" rows="3" maxlength="240" placeholder="Cómo son tus clases, tu experiencia…" bind:value={bio} aria-label="Bio"></textarea></label>
  <span class="lbl">Niveles que enseñas</span>
  <div class="chips">{#each NIVELES as n (n)}<button class:on={niveles.includes(n)} aria-pressed={niveles.includes(n)} onclick={() => { toque(4); niveles = alternar(niveles, n); }}>{textoNivel(n)}</button>{/each}</div>
  <div class="dos">
    <label class="campo"><span class="lbl">Individual</span><input class="q-input" type="number" inputmode="numeric" step="5000" bind:value={precioI} aria-label="Precio clase individual" /></label>
    <label class="campo"><span class="lbl">Grupal (por alumno)</span><input class="q-input" type="number" inputmode="numeric" step="5000" bind:value={precioG} aria-label="Precio clase grupal" /></label>
  </div>
  <span class="lbl">Clubes donde das clase</span>
  <div class="chips envolver">{#each clubes() as c (c.id)}<button class:on={misClubes.includes(c.id)} aria-pressed={misClubes.includes(c.id)} onclick={() => { toque(4); misClubes = alternar(misClubes, c.id); }}>{c.nombre}</button>{/each}</div>
  <div class="dos">
    <label class="campo"><span class="lbl">Años enseñando</span><input class="q-input" type="number" inputmode="numeric" min="0" max="50" bind:value={anos} aria-label="Años enseñando" /></label>
    <label class="campo"><span class="lbl">Idiomas</span><input class="q-input" maxlength="60" bind:value={idiomas} aria-label="Idiomas" /></label>
  </div>
  <label class="campo"><span class="lbl">Certificaciones (separadas por coma)</span><input class="q-input" maxlength="120" placeholder="Instructor FEP nivel 2, PTR…" bind:value={certs} aria-label="Certificaciones" /></label>
  {#if error}<p class="err">{error}</p>{/if}
  {#snippet pie()}<button class="guardar" onclick={guardar}>{nuevo ? 'Crear mi perfil de profe' : 'Guardar'}</button>{/snippet}
</Hoja>

<style>
  .lbl { display: block; margin: 14px 0 6px; font-size: 11.5px; font-weight: 800; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.1em; }
  .guardar { width: 100%; height: 54px; border: 0; border-radius: 12px; background: var(--q-lila); color: #fff; font-family: inherit; font-size: 16.5px; font-weight: 900; }
  .campo { display: block; }
  .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .chips.envolver { flex-wrap: wrap; }
  .chips button { flex-shrink: 0; height: 40px; padding: 0 12px; border: 1.5px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); font-weight: 900; font-size: 13.5px; }
  .chips button.on { border-color: var(--q-lila); background: var(--q-lila); color: #fff; }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .err { color: var(--q-alr); font-size: 14px; font-weight: 700; }
</style>
