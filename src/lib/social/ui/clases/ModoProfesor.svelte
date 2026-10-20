<script lang="ts">
  // Modo profesor (en mi perfil): tarjeta lila con lo que gano esta semana, mis alumnos y horarios; abrir un horario,
  // editar mi perfil de profe o verlo como alumno; y mi agenda de clases por día (cancelar devuelve el saldo a los
  // alumnos). Si no soy profe: la invitación a crear el perfil.
  import { f7 } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { cancelarClase, clasesDe, clubDeClase, ingresosDe, profesor } from '../../app/clases';
  import { franjaCompleta } from '../../app/jugar';
  import { nombreDe, perfilDe, yo } from '../../app/vinculos';
  import { quedan, type Clase } from '../../domain/clases';
  import { diaColombia, pesos } from '../../domain/jugar';
  import { nombreDia, partirHora } from './fechas';

  const p = $derived(profesor(yo()));
  const yoPerfil = $derived(perfilDe(yo()) ?? { nombre: nombreDe(yo()), color: '#0e1b33' });
  const mias = $derived(p ? clasesDe(yo()) : []);
  const porDia = $derived.by(() => {
    const m = new Map<string, Clase[]>();
    for (const c of mias) { const d = diaColombia(c.inicio); m.set(d, [...(m.get(d) ?? []), c]); }
    return [...m];
  });
  const lunes = $derived.by(() => { const d = new Date(Date.now() - 5 * 3_600_000); const dow = (d.getUTCDay() + 6) % 7; return Date.parse(new Date(d.getTime() - dow * 86_400_000).toISOString().slice(0, 10) + 'T00:00:00-05:00'); });
  const semana = $derived(p ? ingresosDe(yo(), lunes, lunes + 7 * 86_400_000) : 0);
  const alumnosSemana = $derived(mias.filter((c) => Date.parse(c.inicio) < lunes + 7 * 86_400_000).reduce((s, c) => s + c.alumnos.length, 0));

  function cancelar(c: Clase) {
    const n = c.alumnos.length;
    f7.dialog.confirm(n ? `Tiene ${n} alumno${n === 1 ? '' : 's'}: se les devuelve el saldo y la cancha se libera.` : 'La cancha se libera para el club.', 'Cancelar este horario', async () => {
      await cancelarClase(c.id);
      ui.avisar({ titulo: 'Horario cancelado', sub: n ? 'Se devolvió el saldo a tus alumnos' : 'La cancha quedó libre para el club', icono: 'check' });
    });
  }
</script>

{#if p}
  <section class="modo">
    <span class="aro" aria-hidden="true"></span>
    <div class="quien">
      <span class="av"><FotoPerfil perfil={{ ...yoPerfil, color: '#0e1b33' }} size={72} /></span>
      <span class="q-txt">
        <span class="sello">🎓 Modo profesor</span>
        <b>{nombreDe(yo())}</b>
        <small>{p.especialidad} · ★ {p.estrellas.toFixed(1).replace('.', ',')} ({p.resenas})</small>
      </span>
    </div>
    <div class="cifras">
      <div><small>Esta semana</small><b>{pesos(semana)}</b></div>
      <div><small>Alumnos</small><b>{alumnosSemana}</b></div>
      <div><small>Horarios</small><b>{mias.length}</b></div>
    </div>
    <div class="botones">
      <button class="blanco" onclick={() => { toque(); ui.abrirHorario = {}; }}>＋ Abrir horario</button>
      <button onclick={() => { toque(); ui.editarProfe = true; }}>Editar perfil</button>
      <button onclick={() => { toque(); ui.navegar(`/profesor/${yo()}/`); }}>Ver como alumno</button>
    </div>
  </section>

  <h2 class="sec">Mi agenda de clases</h2>
  {#if porDia.length}
    {#each porDia as [d, cs] (d)}
      <p class="dia">{nombreDia(d)}</p>
      <div class="agenda">
        {#each cs as c (c.id)}
          {@const f = franjaCompleta(c.franja_id)}
          {@const [hc, ampm] = partirHora(c.inicio)}
          <div class="clase" class:llena={quedan(c) <= 0} data-clase={c.id}>
            <span class="hora"><b>{hc}</b><small>{ampm}</small></span>
            <span class="txt">
              <b>{clubDeClase(c)?.nombre ?? 'Club'}{f ? ` · ${f.cancha.nombre}` : ''}</b>
              <small>{c.tipo === 'individual' ? 'Individual' : `Grupal · ${c.alumnos.length}/${c.cupos}`} · {pesos(c.precio)}{c.alumnos.length ? ` · ${pesos(c.precio * c.alumnos.length)}` : ''}</small>
              {#if c.alumnos.length}
                <span class="alumnos">{#each c.alumnos as a (a)}<em>{nombreDe(a)}</em>{/each}</span>
              {:else}
                <span class="libre">Sin alumnos aún · {quedan(c)} cupo{quedan(c) === 1 ? '' : 's'}</span>
              {/if}
            </span>
            <button class="x" aria-label="Cancelar horario" onclick={() => cancelar(c)}>✕</button>
          </div>
        {/each}
      </div>
    {/each}
  {:else}
    <p class="vacio">No tienes horarios abiertos. Abre uno para que te reserven.</p>
  {/if}
{:else}
  <button class="crear" onclick={() => { toque(); ui.editarProfe = true; }}>
    <span class="c-ico">🎓</span>
    <span class="c-txt"><b>¿Eres profesor?</b><small>Crea tu perfil de profe: publica horarios y los jugadores te reservan y pagan con saldo.</small></span>
  </button>
{/if}

<style>
  .modo { position: relative; margin: 0 16px; border-radius: 20px; background: var(--q-lila); color: #fff; overflow: hidden; }
  .aro { position: absolute; right: -40px; top: -60px; width: 190px; height: 190px; border-radius: 50%; border: 24px solid rgba(255, 255, 255, 0.12); box-sizing: border-box; }
  .quien { position: relative; display: flex; gap: 14px; align-items: center; padding: 18px 16px 4px; }
  .av { display: inline-flex; flex: none; border-radius: 50%; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.25); }
  .q-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sello { align-self: flex-start; padding: 3px 9px; border-radius: 8px; background: rgba(255, 255, 255, 0.16); font-size: 11.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
  .q-txt b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 30px; line-height: 1; text-transform: uppercase; }
  .q-txt small { font-size: 13px; opacity: 0.85; }
  .cifras { position: relative; display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 8px; padding: 14px 16px 0; }
  .cifras div { padding: 9px 10px; border-radius: 12px; background: rgba(255, 255, 255, 0.12); display: flex; flex-direction: column; min-width: 0; }
  .cifras small { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8; }
  .cifras b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .botones { position: relative; display: flex; flex-wrap: wrap; gap: 6px; padding: 14px 16px 16px; }
  .botones button { height: 40px; padding: 0 14px; border: 0; border-radius: 10px; background: rgba(255, 255, 255, 0.16); color: #fff; font-family: inherit; font-size: 14px; font-weight: 900; }
  .botones button.blanco { background: #fff; color: var(--q-lila); }
  .sec { margin: 24px 20px 4px; font-family: var(--q-font-titulo); font-style: italic; font-weight: 800; font-size: 22px; text-transform: uppercase; }
  .dia { margin: 12px 20px 6px; font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .agenda { display: flex; flex-direction: column; gap: 6px; margin: 0 16px; }
  .clase { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border: 1px solid var(--q-line); border-left: 4px solid var(--q-lila); border-radius: 12px; background: var(--q-card); animation: q-sube 0.35s var(--q-ease) both; }
  :global(html.dark) .clase { border-left-color: #6f82ff; }
  .clase.llena { border-left-color: var(--q-ok) !important; }
  .hora { display: flex; flex-direction: column; align-items: center; min-width: 58px; }
  .hora b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 22px; line-height: 1; }
  .hora small { font-size: 11px; font-weight: 800; color: var(--q-tx2); }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .txt b { font-size: 15px; font-weight: 800; }
  .txt small { font-size: 12.5px; color: var(--q-tx2); }
  .alumnos { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
  .alumnos em { font-style: normal; padding: 2px 8px; border-radius: 8px; background: rgba(51, 70, 168, 0.12); color: var(--q-tx); font-size: 12.5px; font-weight: 800; }
  :global(html.dark) .alumnos em { background: rgba(120, 140, 255, 0.18); }
  .libre { font-size: 12.5px; color: var(--q-tx3); font-weight: 800; margin-top: 2px; }
  .x { width: 32px; height: 32px; flex: none; border: 0; border-radius: 8px; background: var(--q-sub); color: var(--q-tx2); font-weight: 900; }
  .vacio { margin: 8px 20px; font-size: 14px; color: var(--q-tx2); }
  .crear { display: flex; align-items: center; gap: 12px; width: calc(100% - 32px); margin: 0 16px; padding: 14px; border: 1.5px dashed var(--q-lila); border-radius: 14px; background: none; color: var(--q-tx); text-align: left; font-family: inherit; }
  :global(html.dark) .crear { border-color: #8a9bff; }
  .c-ico { font-size: 28px; }
  .c-txt { display: flex; flex-direction: column; gap: 2px; }
  .c-txt b { font-size: 16px; font-weight: 800; }
  .c-txt small { font-size: 13px; color: var(--q-tx2); line-height: 1.35; }
</style>
