<script lang="ts">
  // Clases con profesor en el club: los horarios que abren los profes (la cancha queda apartada para la clase) y los
  // alumnos que reservan (pagan con saldo y la cancha queda pagada). Por día de la semana, con lo que entra al club.
  import { datos } from '$lib/data/datos.svelte';
  import { canchaDe } from '$lib/club/app/club';
  import { CLUB_DEMO } from '$lib/club/domain/club';
  import type { Clase, Profesor } from '$lib/social/domain/clases';
  import { textoNiveles } from '$lib/social/domain/clases';
  import { diaColombia, horaColombia, pesos, type Franja } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';
  import Contador from '../ui/Contador.svelte';

  const nombreDe = (u: string) => (datos.perfiles.find((p) => p.user_id === u)?.nombre as string | undefined) ?? 'Jugador';
  const hoy = $derived(diaColombia(new Date(panel.ahora).toISOString()));
  const dias = $derived(Array.from({ length: 7 }, (_, i) => diaColombia(new Date(panel.ahora + i * 86_400_000).toISOString())));
  const etiqueta = (iso: string) => {
    const d = diaColombia(iso);
    if (d === hoy) return 'HOY';
    return new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', timeZone: 'America/Bogota' }).replace('.', '').toUpperCase();
  };

  const delClub = $derived((datos.clases as Clase[]).filter((c) => c.club_id === CLUB_DEMO && c.estado !== 'cancelada'));
  const semana = $derived(delClub.filter((c) => dias.includes(diaColombia(c.inicio))));
  const lista = $derived(semana.filter((c) => Date.parse(c.fin) > panel.ahora).sort((a, b) => a.inicio.localeCompare(b.inicio)));
  const hoyN = $derived(semana.filter((c) => diaColombia(c.inicio) === hoy).length);
  const COLORES = ['#3346a8', '#e8475b', '#18895b', '#b98500', '#1e7fd0'];
  const ingresos = $derived(semana.reduce((s, c) => s + c.precio * c.alumnos.length, 0));
  const alumnos = $derived(semana.reduce((s, c) => s + c.alumnos.length, 0));
  const profes = $derived((datos.profesores as Profesor[]).filter((p) => p.clubes.includes(CLUB_DEMO)));
  const canchaDeClase = (c: Clase) => {
    const f = c.franja_id ? (datos.franjas as Franja[]).find((x) => x.id === c.franja_id) : null;
    return f ? canchaDe(f.cancha_id)?.nombre ?? 'Cancha' : '—';
  };
  const porProfe = (uid: string) => semana.filter((c) => c.profesor === uid);
  const verEnAgenda = (c: Clase) => {
    const f = c.franja_id ? (datos.franjas as Franja[]).find((x) => x.id === c.franja_id) : null;
    if (f) panel.verFranja(f);
  };
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">Los profes abren horarios · los jugadores reservan con saldo</span>
    <h1 class="c-titulo c-h1">Clases con profe</h1>
  </div>
</header>

<div class="kpis">
  <article class="kpi lila"><small class="c-mini">En clases esta semana</small><b class="c-num"><Contador valor={ingresos} formato={(n) => pesos(n).replace('$ ', '$')} /></b><small class="sub">{alumnos} alumno{alumnos === 1 ? '' : 's'} · {semana.length} horarios</small></article>
  <article class="kpi"><small class="c-mini">Clases hoy</small><b class="c-num">{hoyN}</b></article>
  <article class="kpi"><small class="c-mini">Profes en el club</small><b class="c-num">{profes.length}</b></article>
</div>

<div class="dos">
  <section class="lista">
    {#each lista as c (c.id)}
      {@const llena = c.alumnos.length >= c.cupos}
      <button class="clase" class:llena onclick={() => verEnAgenda(c)}>
        <span class="cuando"><small>{etiqueta(c.inicio)}</small><b class="c-num">{horaColombia(c.inicio)}</b></span>
        <span class="info">
          <b>🎓 {nombreDe(c.profesor)}</b>
          <small>{canchaDeClase(c)} · {c.tipo === 'individual' ? 'Individual' : `Grupal ${c.alumnos.length}/${c.cupos}`} · {pesos(c.precio).replace('$ ', '$')}</small>
          {#if c.alumnos.length}<span class="alumnos">{#each c.alumnos as a (a)}<em>{nombreDe(a)}</em>{/each}</span>{/if}
        </span>
        <span class="estado">{llena ? '✓ Llena · pagada' : c.alumnos.length || c.tipo === 'grupal' ? 'Cupos libres' : 'Sin alumno'}</span>
      </button>
    {:else}
      <p class="c-vacio">No hay clases esta semana.</p>
    {/each}
  </section>

  <section class="c-tarjeta profes">
    <h2 class="c-sec">Profes del club</h2>
    {#each profes as p, k (p.user_id)}
      {@const cs = porProfe(p.user_id)}
      <div class="profe">
        <span class="av" style="background:{COLORES[k % COLORES.length]}">{nombreDe(p.user_id).split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
        <span class="pi">
          <b>{nombreDe(p.user_id)}</b>
          <small>{p.especialidad} · ★ {p.estrellas.toFixed(1)}</small>
        </span>
        <b class="monto">{pesos(cs.reduce((s, c) => s + c.precio * c.alumnos.length, 0)).replace('$ ', '$')}</b>
      </div>
    {/each}
  </section>
</div>

<style>
  .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 16px; background: #fff; border: var(--c-borde); }
  .kpi b { font-size: 44px; }
  .kpi.lila { background: rgba(91, 79, 208, 0.12); border-color: rgba(91, 79, 208, 0.25); }
  .sub { font-size: 12.5px; font-weight: 700; color: var(--c-clase); }
  .dos { display: grid; grid-template-columns: minmax(0, 1fr) 316px; gap: 12px; align-items: start; }
  .lista { display: flex; flex-direction: column; gap: 8px; }
  .clase { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border: 1px solid rgba(91, 79, 208, 0.18); border-left: 4px solid var(--c-clase); border-radius: 12px; background: rgba(91, 79, 208, 0.08); text-align: left; }
  .clase:hover { background: rgba(91, 79, 208, 0.12); }
  .clase.llena { border-left-color: var(--c-verde); }
  .cuando { display: flex; flex-direction: column; align-items: center; min-width: 92px; }
  .cuando small { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; }
  .cuando b { font-size: 24px; white-space: nowrap; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .info b { font-size: 16px; }
  .info small { font-size: 12.5px; color: var(--q-tx2); }
  .alumnos { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
  .alumnos em { font-style: normal; padding: 2px 8px; border-radius: 6px; background: rgba(91, 79, 208, 0.14); color: var(--c-clase); font-size: 11.5px; font-weight: 800; }
  .estado { font-size: 12.5px; font-weight: 900; color: var(--c-clase); white-space: nowrap; }
  .llena .estado { color: var(--c-verde); }
  .profes { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .profe { display: flex; align-items: center; gap: 10px; }
  .av { width: 40px; height: 40px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; flex-shrink: 0; }
  .pi { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .pi b { font-size: 14.5px; }
  .pi small { font-size: 12px; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .monto { font-size: 14px; font-weight: 900; }
</style>
