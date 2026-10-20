<script lang="ts">
  // El perfil de un profesor, como ficha de entrenador: portada lila con líneas de cancha (foto, sello de profe
  // certificado, nombre, especialidad y su frase), la trayectoria en números, la próxima clase libre para reservar
  // de una, lo que enseña (golpes y niveles), cómo es una clase, tarifas, horarios por día (toca uno para reservar
  // y pagar con saldo), credenciales y las reseñas de sus alumnos. Si es mi perfil, así me ven los alumnos.
  import { Page } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Cabecera from '../ui/ranking/Cabecera.svelte';
  import FotoPerfil from '../ui/perfil/FotoPerfil.svelte';
  import { clasesDe, clasesTomadasCon, clubDeClase, nombresClubes, profesor, proximaDe, resenasDe, yaResene } from '../app/clases';
  import { nombreDe, perfilDe, yo } from '../app/vinculos';
  import { NIVEL_INICIACION, quedan, textoNivel, type Clase } from '../domain/clases';
  import { diaColombia, horaColombia, pesos } from '../domain/jugar';
  import { nombreDia, partirHora } from '../ui/clases/fechas';

  let { uid }: { uid: string } = $props();
  const p = $derived(profesor(uid));
  const perfil = $derived(perfilDe(uid));
  const nombre = $derived(perfil?.nombre ?? 'Profe');
  const corto = $derived(nombre.split(' ')[0]);
  const esYo = $derived(uid === yo());
  const horarios = $derived(clasesDe(uid).filter((c) => Date.parse(c.inicio) > Date.now()));
  const porDia = $derived.by(() => {
    const m = new Map<string, Clase[]>();
    for (const c of horarios) { const d = diaColombia(c.inicio); m.set(d, [...(m.get(d) ?? []), c]); }
    return [...m];
  });
  const proxima = $derived(esYo ? null : proximaDe(uid));
  const resenas = $derived(resenasDe(uid));
  const puedoResenar = $derived(!esYo && clasesTomadasCon(uid).length > 0 && !yaResene(uid));
  const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace('.', '');
  const estadoDe = (c: Clase) => (c.alumnos.includes(yo()) ? 'mia' : quedan(c) === 0 ? 'llena' : 'libre');
  const miles = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k` : String(n));
  const ESCALA = [NIVEL_INICIACION, 6, 5, 4, 3, 2, 1];
  const ciudad = $derived(perfil?.ciudad ?? '');
  let horariosEl = $state<HTMLElement | null>(null);
  const reservar = (c: Clase) => { toque(); ui.clase = { id: c.id }; };
</script>

<Page name="profesor" class="pa-profesor" noNavbar>
  {#if !p}
    <Cabecera titulo={corto} />
    <p class="q-vacio"><b>Este profe ya no está</b>Busca otro en Clases con profe.</p>
  {:else}
    <section class="portada">
      <svg class="cancha" viewBox="0 0 200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect x="10" y="10" width="180" height="380" rx="2" />
        <line x1="10" y1="200" x2="190" y2="200" class="red" />
        <line x1="10" y1="80" x2="190" y2="80" /><line x1="10" y1="320" x2="190" y2="320" />
        <line x1="100" y1="80" x2="100" y2="320" />
      </svg>
      <Cabecera sobreColor />
      <div class="ficha">
        <span class="av"><FotoPerfil perfil={perfil ?? { nombre, color: '#3346a8' }} size={104} /><span class="check" aria-label="Verificado">✓</span></span>
        <span class="sello">🎓 Coach Quilombo · Certificado</span>
        <h1>{nombre}</h1>
        <b class="esp">{p.especialidad}{ciudad ? ` · ${ciudad}` : ''}</b>
        {#if p.frase}<q class="frase">{p.frase}</q>{/if}
      </div>
      <div class="numeros">
        <span><b>★ {p.estrellas.toFixed(1).replace('.', ',')}</b><small>{p.resenas} reseñas</small></span>
        <span><b>{p.anos}</b><small>años</small></span>
        <span><b>{miles(p.alumnos_total ?? p.resenas * 3)}</b><small>alumnos</small></span>
        <span><b>{miles(p.clases_total ?? p.anos * 120)}</b><small>clases</small></span>
      </div>
    </section>

    {#if esYo}
      <div class="yo">
        <span>👀 Así te ven tus alumnos</span>
        <button onclick={() => { toque(); ui.abrirHorario = {}; }}>＋ Abrir horario</button>
      </div>
    {:else if proxima}
      {@const [hc, ampm] = partirHora(proxima.inicio)}
      <button class="proxima" onclick={() => reservar(proxima)}>
        <span class="px-tag">Próxima clase libre</span>
        <span class="px-cuando"><b>{nombreDia(diaColombia(proxima.inicio))}</b> · {hc} {ampm}</span>
        <span class="px-donde">{clubDeClase(proxima)?.nombre ?? 'Club'} · {proxima.tipo === 'individual' ? '👤 Individual' : `👥 Grupal · quedan ${quedan(proxima)}`}</span>
        <span class="px-pie"><b>{pesos(proxima.precio)}</b><em>Reservar con saldo →</em></span>
      </button>
    {:else}
      <button class="ver-horarios" onclick={() => horariosEl?.scrollIntoView({ behavior: 'smooth' })}>Ver horarios de {corto}</button>
    {/if}

    {#if p.bio}
      <h2>Sobre {corto}</h2>
      <p class="bio">{p.bio}</p>
    {/if}

    {#if p.golpes?.length}
      <h2>Lo que enseña</h2>
      <div class="golpes">
        {#each p.golpes as g (g.nombre)}
          <div class="golpe"><span class="g-nom">{g.nombre}</span><span class="g-barra"><span style="width: {g.nivel}%"></span></span><b>{g.nivel}</b></div>
        {/each}
      </div>
    {/if}

    <h2>Para qué nivel</h2>
    <div class="escala" role="list">
      {#each ESCALA as n (n)}
        <span role="listitem" class:si={p.niveles.includes(n)}>{n === NIVEL_INICIACION ? 'Inic.' : textoNivel(n)}</span>
      {/each}
    </div>
    <p class="leyenda">De iniciación a 1ª · en color, las categorías con las que trabaja</p>

    {#if p.metodo?.length}
      <h2>Así es una clase</h2>
      <ol class="metodo">
        {#each p.metodo as paso, k (paso)}<li><span class="num">{k + 1}</span>{paso}</li>{/each}
      </ol>
    {/if}

    <h2>Tarifas</h2>
    <div class="precios">
      <div><small>👤 Individual</small><b>{pesos(p.precio_individual)}</b><span>90 min · cancha incluida</span></div>
      <div><small>👥 Grupal</small><b>{pesos(p.precio_grupal)}</b><span>por persona · hasta 4</span></div>
    </div>

    <h2 bind:this={horariosEl}>Horarios disponibles</h2>
    {#if porDia.length}
      {#each porDia as [d, cs] (d)}
        <p class="dia">{nombreDia(d)}</p>
        <div class="horarios">
          {#each cs as c (c.id)}
            {@const e = estadoDe(c)}
            {@const [hc, ampm] = partirHora(c.inicio)}
            <button class="horario {e}" disabled={esYo || e === 'llena'} onclick={() => { if (e !== 'mia') reservar(c); }} aria-label="{horaColombia(c.inicio)}, {clubDeClase(c)?.nombre}, {c.tipo}, {pesos(c.precio)}">
              <span class="h-hora"><b>{hc}</b><small>{ampm}</small></span>
              <span class="h-club">{clubDeClase(c)?.nombre ?? 'Club'}</span>
              <small class="h-tipo">{c.tipo === 'individual' ? '👤 Individual' : `👥 Grupal · quedan ${quedan(c)} de ${c.cupos}`}</small>
              <span class="h-pie"><b>{pesos(c.precio)}</b>{#if e === 'mia'}<em class="ya">✓ Reservada</em>{:else if e === 'llena'}<em>Llena</em>{:else if !esYo}<em class="res">Reservar</em>{/if}</span>
            </button>
          {/each}
        </div>
      {/each}
    {:else}
      <p class="nota">{esYo ? 'Aún no tienes horarios abiertos.' : `${corto} no tiene horarios libres esta semana.`}</p>
    {/if}

    <h2>Credenciales</h2>
    <div class="credenciales">
      {#each p.certificaciones as c (c)}<span class="cred"><i>🏅</i><b>{c}</b><small>Certificación</small></span>{/each}
      {#each p.logros ?? [] as l (l)}<span class="cred"><i>🏆</i><b>{l}</b><small>Trayectoria</small></span>{/each}
      {#each nombresClubes(p) as c (c)}<span class="cred"><i>📍</i><b>{c}</b><small>Da clase aquí</small></span>{/each}
      {#if p.idiomas.length}<span class="cred"><i>🗣️</i><b>{p.idiomas.join(' · ')}</b><small>Idiomas</small></span>{/if}
    </div>

    <h2>Reseñas</h2>
    <div class="resumen">
      <b>{p.estrellas.toFixed(1).replace('.', ',')}</b>
      <span><span class="r-est">{'★'.repeat(Math.round(p.estrellas))}</span><small>{p.resenas} alumnos lo calificaron</small></span>
    </div>
    {#if puedoResenar}<button class="resenar" onclick={() => { toque(); ui.resenar = { profesor: uid }; }}>★ Cuéntale a otros cómo te fue</button>{/if}
    {#if resenas.length}
      <div class="resenas">
        {#each resenas as r (r.id)}
          <div class="resena">
            <span class="r-cab"><FotoPerfil perfil={perfilDe(r.alumno) ?? { nombre: nombreDe(r.alumno), color: '#1e7fd0' }} size={30} /><b>{nombreDe(r.alumno).split(' ')[0]}</b><span class="r-est">{'★'.repeat(r.estrellas)}</span><small>{fecha(r.created_at)}</small></span>
            {#if r.texto}<p>{r.texto}</p>{/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="nota">Aún no tiene reseñas en Quilombo.</p>
    {/if}
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-profesor .page-content) { font-family: var(--q-font); padding-top: 0 !important; }
  .portada { position: relative; padding-bottom: 16px; background: linear-gradient(165deg, #3346a8 0%, #26358a 70%, #1d2a72 100%); color: #fff; overflow: hidden; border-radius: 0 0 26px 26px; }
  .cancha { position: absolute; right: -40px; top: -20px; width: 230px; height: 330px; transform: rotate(-14deg); opacity: 0.16; fill: none; stroke: #fff; stroke-width: 3; }
  .cancha .red { stroke-width: 6; stroke-dasharray: 6 4; }
  .ficha { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 18px; margin-top: -8px; text-align: center; }
  .av { position: relative; display: inline-flex; border-radius: 50%; box-shadow: 0 0 0 4px #fff, 0 10px 24px rgba(0, 0, 0, 0.25); }
  .check { position: absolute; right: 0; bottom: 2px; width: 28px; height: 28px; border-radius: 50%; background: var(--q-ok); border: 3px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; }
  .sello { margin-top: 12px; padding: 4px 10px; border-radius: 999px; background: #ffc247; color: #1d2a72; font-size: 11.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
  h1 { margin: 4px 0 0; font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 40px; font-weight: 900; line-height: 0.95; }
  .esp { font-size: 15.5px; opacity: 0.92; }
  .frase { margin-top: 8px; font-size: 15px; font-style: italic; font-weight: 600; opacity: 0.9; text-wrap: balance; }
  .frase::before { content: '“'; } .frase::after { content: '”'; }
  .numeros { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); margin: 16px 14px 0; padding: 10px 4px; border-radius: 16px; background: rgba(255, 255, 255, 0.12); }
  .numeros span { display: flex; flex-direction: column; align-items: center; gap: 1px; }
  .numeros span + span { border-left: 1px solid rgba(255, 255, 255, 0.18); }
  .numeros b { font-family: var(--q-font-titulo); font-style: italic; font-size: 24px; font-weight: 900; line-height: 1; white-space: nowrap; }
  .numeros small { font-size: 11.5px; font-weight: 700; opacity: 0.8; }

  .yo { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 14px 16px 0; padding: 10px 10px 10px 14px; border-radius: 14px; background: var(--q-card); border: 1.5px dashed rgba(51, 70, 168, 0.45); }
  .yo span { font-weight: 800; font-size: 14px; }
  .yo button { height: 38px; padding: 0 14px; border: 0; border-radius: 10px; background: var(--q-lila); color: #fff; font-family: inherit; font-weight: 900; font-size: 14px; }
  .proxima { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; width: calc(100% - 32px); margin: 14px 16px 0; padding: 14px; border: 0; border-radius: 16px; background: var(--q-card); color: var(--q-tx); text-align: left; font-family: inherit; box-shadow: 0 0 0 1.5px rgba(51, 70, 168, 0.35), 0 10px 24px rgba(51, 70, 168, 0.12); }
  .proxima:active { transform: scale(0.98); }
  .px-tag { font-size: 11.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: var(--q-lila); }
  .px-cuando { font-size: 15px; } .px-cuando b { font-family: var(--q-font-titulo); font-style: italic; font-size: 24px; text-transform: uppercase; }
  .px-donde { font-size: 13.5px; color: var(--q-tx2); font-weight: 600; }
  .px-pie { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 8px; }
  .px-pie b { font-size: 18px; font-weight: 900; }
  .px-pie em { font-style: normal; padding: 8px 12px; border-radius: 10px; background: var(--q-lila); color: #fff; font-weight: 900; font-size: 14px; }
  .ver-horarios { display: block; width: calc(100% - 32px); margin: 14px 16px 0; height: 48px; border: 0; border-radius: 12px; background: var(--q-lila); color: #fff; font-family: inherit; font-size: 15px; font-weight: 900; }

  h2 { margin: 24px 20px 8px; font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 22px; font-weight: 800; }
  .bio { margin: 0 20px; font-size: 15px; line-height: 1.45; text-wrap: pretty; }
  .golpes { display: flex; flex-direction: column; gap: 10px; margin: 0 16px; padding: 14px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); }
  .golpe { display: grid; grid-template-columns: 112px 1fr 26px; align-items: center; gap: 10px; }
  .g-nom { font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .g-barra { height: 8px; border-radius: 4px; background: var(--q-sub); overflow: hidden; }
  .g-barra span { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #5b6fe0, var(--q-lila)); }
  .golpe b { font-size: 13px; font-weight: 900; color: var(--q-lila); text-align: right; font-variant-numeric: tabular-nums; }
  .escala { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin: 0 16px; }
  .escala span { padding: 9px 0; border-radius: 9px; background: var(--q-sub); color: var(--q-tx3); text-align: center; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 16px; }
  .escala span.si { background: var(--q-lila); color: #fff; }
  .leyenda { margin: 6px 20px 0; font-size: 12.5px; color: var(--q-tx2); }
  .metodo { list-style: none; margin: 0 16px; padding: 0; display: flex; flex-direction: column; gap: 0; }
  .metodo li { position: relative; display: flex; align-items: center; gap: 12px; padding: 8px 0; font-size: 14.5px; font-weight: 600; }
  .metodo li + li::before { content: ''; position: absolute; left: 15px; top: -8px; height: 16px; width: 2px; background: rgba(51, 70, 168, 0.25); }
  .num { flex: none; width: 32px; height: 32px; border-radius: 50%; background: rgba(51, 70, 168, 0.12); color: var(--q-lila); display: flex; align-items: center; justify-content: center; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 17px; }
  .precios { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 16px; }
  .precios div { padding: 12px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); display: flex; flex-direction: column; gap: 2px; }
  .precios small { font-size: 12.5px; font-weight: 800; color: var(--q-tx2); }
  .precios b { font-family: var(--q-font-titulo); font-style: italic; font-size: 28px; font-weight: 900; line-height: 1; }
  .precios span { font-size: 12px; color: var(--q-tx2); }
  .dia { margin: 12px 20px 6px; font-size: 13px; font-weight: 800; color: var(--q-tx2); }
  .horarios { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0 16px; }
  .horario { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 12px; border: 1.5px solid var(--q-line); border-radius: 12px; background: var(--q-card); color: var(--q-tx); text-align: left; font-family: inherit; min-width: 0; }
  .horario.libre { border-color: rgba(51, 70, 168, 0.4); }
  .horario.mia { border-color: var(--q-ok); }
  .horario:disabled { opacity: 0.55; }
  .h-hora { display: flex; align-items: baseline; gap: 4px; }
  .h-hora b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; line-height: 1; }
  .h-hora small { font-size: 12px; font-weight: 800; color: var(--q-tx2); }
  .h-club { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .h-tipo { font-size: 12px; color: var(--q-tx2); }
  .h-pie { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 6px; }
  .h-pie b { font-size: 14px; font-weight: 800; }
  .h-pie em { font-style: normal; font-size: 12px; font-weight: 900; padding: 3px 8px; border-radius: 8px; background: var(--q-sub); color: var(--q-tx2); }
  .h-pie em.res { background: var(--q-lila); color: #fff; }
  .h-pie em.ya { background: var(--q-ok); color: #fff; }
  .credenciales { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 16px; }
  .cred { display: flex; flex-direction: column; gap: 2px; padding: 12px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); min-width: 0; }
  .cred i { font-style: normal; font-size: 20px; }
  .cred b { font-size: 13.5px; line-height: 1.25; }
  .cred small { font-size: 11.5px; font-weight: 700; color: var(--q-tx3); text-transform: uppercase; letter-spacing: 0.04em; }
  .nota { margin: 8px 20px 0; font-size: 14px; color: var(--q-tx2); }
  .resumen { display: flex; align-items: center; gap: 12px; margin: 0 20px 10px; }
  .resumen > b { font-family: var(--q-font-titulo); font-style: italic; font-size: 48px; font-weight: 900; line-height: 1; }
  .resumen > span { display: flex; flex-direction: column; }
  .resumen small { font-size: 13px; color: var(--q-tx2); }
  .resenar { display: block; width: calc(100% - 32px); margin: 6px 16px 10px; height: 48px; border: 0; border-radius: 12px; background: var(--q-lila); color: #fff; font-family: inherit; font-size: 15px; font-weight: 900; }
  .resenas { display: flex; flex-direction: column; gap: 8px; margin: 6px 16px 0; }
  .resena { padding: 12px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); }
  .r-cab { display: flex; align-items: center; gap: 8px; }
  .r-cab b { font-size: 14.5px; }
  .r-est { color: #f5b301; font-size: 14px; letter-spacing: 1px; }
  .r-cab small { margin-left: auto; font-size: 12px; color: var(--q-tx3); }
  .resena p { margin: 6px 0 0; font-size: 14px; line-height: 1.4; }
</style>
