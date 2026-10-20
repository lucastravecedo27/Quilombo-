<script lang="ts">
  // Tu perfil de jugador: tu foto o un dibujo de la app, tu nombre, tu @usuario, tu color y lo de pádel
  // (categoría 1ª–6ª, puntos de ranking, club base y ciudad). Es lo que ve tu gente. Abajo: cerrar sesión.
  import { Page, f7 } from 'framework7-svelte';
  import { untrack } from 'svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { DEMO_UID, E2E, sesion, usarDemoComo } from '$lib/app/sesion.svelte';
  import { datos } from '$lib/data/datos.svelte';
  import Record from '../ui/ranking/Record.svelte';
  import ModoProfesor from '../ui/clases/ModoProfesor.svelte';
  import TarjetaJugador from '../ui/ranking/TarjetaJugador.svelte';
  import { esProfesor, misClases } from '../app/clases';
  import { saldoQuilombo, tarjetaDe } from '$lib/club/app/club';
  import { pesos } from '../domain/jugar';
  import type { PerfilRanking } from '../domain/ranking';
  import { AVATARES } from '$lib/ui/avatares';
  import Icon from '$lib/ui/Icon.svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import FotoPerfil from '../ui/perfil/FotoPerfil.svelte';
  import { miPerfil, elegirAvatar, quitarImagen, subirFoto, cambiarNombre, cambiarColor, guardarPadel } from '../app/perfil.svelte';
  import { guardarUsuario } from '../app/buscador';
  import { CATEGORIAS, CIUDADES, textoPuntos } from '../domain/padel';

  const yo = $derived(miPerfil());
  const soyProfe = $derived(esProfesor(yo.user_id));
  // Demo: este equipo puede ser otro de los jugadores (p. ej. para confirmar un resultado desde el otro iPhone)
  const DEMO_GENTE = /^00000000-0000-4000-b(000-00000000000[1-5]|300-00000000000[1-4])$/;
  const comoQuien = $derived(E2E ? datos.perfiles.filter((p) => p.user_id === DEMO_UID || DEMO_GENTE.test(p.user_id)).sort((a, b) => (a.user_id === DEMO_UID ? -1 : b.user_id === DEMO_UID ? 1 : 0)) : []);
  function usarComo(uid: string, nombre: string) {
    if (uid === yo.user_id) return;
    f7.dialog.confirm(`Este equipo pasa a ser ${nombre} en la demo.`, 'Usar la demo como…', () => usarDemoComo(uid));
  }
  const COLORES = ['#3346a8', '#e8475b', '#1e7fd0', '#c2410c', '#ff5b1f', '#18895b', '#b98500', '#4fd8c4'];

  let nombre = $state('');
  let usuario = $state('');
  // Los campos siguen al perfil guardado, salvo mientras la persona escribe en ellos (una sincronización no la pisa)
  let editandoNombre = $state(false);
  let editandoUsuario = $state(false);
  $effect(() => { const n = yo.nombre; if (!untrack(() => editandoNombre)) nombre = n; });
  $effect(() => { const u = yo.usuario ?? ''; if (!untrack(() => editandoUsuario)) usuario = u; });
  let hojaFoto = $state(false);
  // Lo de pádel: los campos siguen al perfil salvo mientras se escribe en ellos
  let club = $state('');
  let ciudad = $state('');
  let editandoClub = $state(false);
  let editandoCiudad = $state(false);
  $effect(() => { const c = yo.club_base ?? ''; if (!untrack(() => editandoClub)) club = c; });
  $effect(() => { const c = yo.ciudad ?? ''; if (!untrack(() => editandoCiudad)) ciudad = c; });
  const padel = (cambios: Partial<{ categoria: number | null; club_base: string | null; ciudad: string | null }>) =>
    guardarPadel({ categoria: yo.categoria ?? null, club_base: yo.club_base ?? null, ciudad: yo.ciudad ?? null, ...cambios });
  async function categoria(n: number) {
    toque(6);
    avisar(await padel({ categoria: yo.categoria === n ? null : n }), yo.categoria === n ? 'Categoría quitada' : `¡${n}ª categoría!`);
  }
  async function guardarClub() { if (club.trim() !== (yo.club_base ?? '')) avisar(await padel({ club_base: club }), 'Club guardado'); }
  async function guardarCiudad() { if (ciudad.trim() !== (yo.ciudad ?? '')) avisar(await padel({ ciudad }), 'Ciudad guardada'); }
  let subiendo = $state(false);
  let archivo: HTMLInputElement | undefined = $state();

  const avisar = (err: string | null, ok: string) => ui.avisar(err ? { titulo: 'No se pudo', sub: err, icono: 'alerta' } : { titulo: ok, icono: 'check' });

  async function dibujo(id: string) {
    toque(6);
    hojaFoto = false;
    avisar(await elegirAvatar(id), 'Listo, ese eres tú');
  }
  async function foto(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    (e.currentTarget as HTMLInputElement).value = '';
    if (!f) return;
    hojaFoto = false;
    subiendo = true;
    const err = await subirFoto(f);
    subiendo = false;
    avisar(err, 'Foto actualizada');
  }
  async function quitar() {
    hojaFoto = false;
    avisar(await quitarImagen(), 'Quedan tus iniciales');
  }
  async function guardarNombre() {
    if (nombre.trim() === yo.nombre) return;
    avisar(await cambiarNombre(nombre), 'Nombre guardado');
  }
  async function guardarUsu() {
    const u = usuario.trim().replace(/^@/, '');
    if (!u || u === (yo.usuario ?? '')) return;
    avisar(await guardarUsuario(u), 'Usuario guardado');
  }
  async function color(c: string) {
    toque(4);
    avisar(await cambiarColor(c), 'Color guardado');
  }
  function salir() {
    f7.dialog.confirm('Tendrás que iniciar sesión de nuevo con tu correo y tu contraseña.', 'Cerrar sesión', () => void sesion.cerrarSesion());
  }
</script>

<Page name="mi-perfil" class="mp" noNavbar>
  <header class="cab-pest"><h1>Perfil</h1></header>

  {#if soyProfe}<ModoProfesor />{/if}

  <div class="bloque-jugador" class:con-profe={soyProfe}>
    <TarjetaJugador perfil={yo as unknown as PerfilRanking} alTocarFoto={() => { toque(); hojaFoto = true; }}>
      {#snippet fotoExtra()}<span class="lapiz">{#if subiendo}<span class="giro"></span>{:else}<Icon name="camara" size={14} stroke={2.4} />{/if}</span>{/snippet}
    </TarjetaJugador>
    <Record perfil={yo as unknown as PerfilRanking} />
    <div class="botones">
      <button class="b-noche" onclick={() => { toque(); ui.navegar('/cuenta/'); }} aria-label="Tu tarjeta Quilombo">🛳️ Tu tarjeta <small>{tarjetaDe(yo.user_id)}</small></button>
      <button class="b-card saldo-p" onclick={() => { toque(); ui.navegar('/saldo/'); }} aria-label="Saldo Quilombo {pesos(saldoQuilombo(yo.user_id))}">Saldo · {pesos(saldoQuilombo(yo.user_id))}</button>
      <button class="b-card" onclick={() => { toque(); ui.navegar('/calendario/'); }}>🗓️ Mi calendario</button>
      <button class="b-card" onclick={() => { toque(); ui.navegar('/ranking/'); }}>🏆 Ranking</button>
      <button class="b-clases" onclick={() => { toque(); ui.navegar('/clases/'); }}>🎓 Clases con profe{misClases().length ? ` · ${misClases().length}` : ''}</button>
      <button class="b-recargar" onclick={() => { toque(); ui.recargar = {}; }}>＋ Recargar saldo</button>
    </div>
  </div>

  {#if !soyProfe}<div class="crear-profe"><ModoProfesor /></div>{/if}

  <h2 class="sec">Tu juego</h2>
  <div class="q-lista">
    <div class="q-fila colores">
      <span class="cuerpo"><span class="sub">Categoría</span>
        <span class="cats" role="radiogroup" aria-label="Tu categoría">{#each CATEGORIAS as c (c.id)}<button role="radio" aria-checked={yo.categoria === c.id} class:on={yo.categoria === c.id} onclick={() => categoria(c.id)} title={c.nivel}>{c.nombre}</button>{/each}</span></span>
    </div>
    <div class="q-fila">
      <span class="cuerpo"><span class="sub">Puntos de ranking</span><span class="titulo">{textoPuntos(yo.puntos_ranking) ?? 'Juega torneos para sumar puntos'}</span></span>
    </div>
    <label class="q-fila campo">
      <span class="cuerpo"><span class="sub">Club base</span>
        <input class="entrada" bind:value={club} maxlength="60" placeholder="¿Dónde juegas casi siempre?" onfocus={() => (editandoClub = true)} onblur={() => { editandoClub = false; void guardarClub(); }} onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} aria-label="Tu club base" /></span>
      <Icon name="editar" size={16} />
    </label>
    <label class="q-fila campo">
      <span class="cuerpo"><span class="sub">Ciudad</span>
        <input class="entrada" bind:value={ciudad} maxlength="40" list="q-ciudades" placeholder="Bogotá, Medellín, Cali…" onfocus={() => (editandoCiudad = true)} onblur={() => { editandoCiudad = false; void guardarCiudad(); }} onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} aria-label="Tu ciudad" /></span>
      <Icon name="editar" size={16} />
    </label>
    <datalist id="q-ciudades">{#each CIUDADES as c (c)}<option value={c}></option>{/each}</datalist>
  </div>

  <h2 class="sec">Lo que ve tu gente</h2>
  <div class="q-lista">
    <label class="q-fila campo">
      <span class="cuerpo"><span class="sub">Nombre</span>
        <input class="entrada" bind:value={nombre} maxlength="40" autocomplete="name" onfocus={() => (editandoNombre = true)} onblur={() => { editandoNombre = false; void guardarNombre(); }} onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} aria-label="Tu nombre" /></span>
      <Icon name="editar" size={16} />
    </label>
    <label class="q-fila campo">
      <span class="cuerpo"><span class="sub">Usuario (para que te encuentren)</span>
        <span class="usu">@<input class="entrada" bind:value={usuario} maxlength="21" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="tu.usuario" onfocus={() => (editandoUsuario = true)} onblur={() => { editandoUsuario = false; void guardarUsu(); }} onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} aria-label="Tu usuario" /></span></span>
      <Icon name="editar" size={16} />
    </label>
    <div class="q-fila colores">
      <span class="cuerpo"><span class="sub">Tu color (si no tienes foto ni dibujo)</span>
        <span class="chips">{#each COLORES as c (c)}<button class="color" class:on={yo.color === c} style="background:{c}" aria-label="Color {c}" aria-pressed={yo.color === c} onclick={() => color(c)}></button>{/each}</span></span>
    </div>
  </div>
  <p class="nota">Tu gente ve tu foto o tu dibujo, tu nombre, tu usuario y tu perfil de jugador.</p>

  <h2 class="sec">Tu red</h2>
  <div class="q-lista">
    <button class="q-fila" onclick={() => ui.navegar('/gente/')}><span class="cuerpo"><span class="titulo">Tu gente</span><span class="sub">Amigos, parejas de juego y rivales</span></span><Icon name="chevron" size={16} /></button>
    <button class="q-fila" onclick={() => ui.navegar('/buscar/')}><span class="cuerpo"><span class="titulo">Buscar jugadores</span><span class="sub">{sesion.usuario?.email ?? ''}</span></span><Icon name="chevron" size={16} /></button>
  </div>
  {#if comoQuien.length}
    <h2 class="sec">Demo · usar la app como…</h2>
    <div class="q-lista">
      {#each comoQuien as p (p.user_id)}
        <button class="q-fila" onclick={() => usarComo(p.user_id, p.nombre)} aria-pressed={p.user_id === yo.user_id}>
          <FotoPerfil perfil={p} size={36} />
          <span class="cuerpo"><span class="titulo">{p.nombre}</span><span class="sub">{p.user_id === yo.user_id ? 'Eres tú en este equipo' : p.profesor ? '🎓 Profe · ver sus clases y alumnos' : 'Tocar para usar la demo como esta persona'}</span></span>
          {#if p.user_id === yo.user_id}<Icon name="check" size={18} />{/if}
        </button>
      {/each}
    </div>
    <p class="nota">Útil para la reunión: un iPhone puede ser Juan y confirmar el resultado que propuso el otro, o ser un profe y ver llegar a sus alumnos.</p>
  {/if}
  <div class="salir"><button class="q-btn suave bloque" onclick={salir}><Icon name="salir" size={18} /> Cerrar sesión</button></div>
  <div class="q-espacio-tabbar"></div>
</Page>

<input bind:this={archivo} class="oculto" type="file" accept="image/*" aria-label="Elegir foto de perfil" onchange={foto} />

<Hoja bind:abierto={hojaFoto} titulo="Tu foto" sub="Una foto tuya o uno de nuestros dibujos">
  <button class="q-btn bloque" onclick={() => archivo?.click()}><Icon name="camara" size={18} /> Tomar o elegir una foto</button>
  <div class="q-seccion"><span>O elige un dibujo</span></div>
  <div class="avatares">
    {#each AVATARES as a (a.id)}
      <button class="av" class:on={!yo.foto && yo.avatar === a.id} onclick={() => dibujo(a.id)} aria-label={a.nombre}>
        <FotoPerfil perfil={{ nombre: a.nombre, color: a.fondo, avatar: a.id }} size={68} />
        <small>{a.nombre}</small>
      </button>
    {/each}
  </div>
  {#if yo.foto || yo.avatar}<button class="quitar" onclick={quitar}>Quitar y usar mis iniciales</button>{/if}
</Hoja>

<style>
  :global(.page.mp .page-content) { font-family: var(--q-font); padding-top: 0 !important; }
  .cab-pest { padding: calc(env(safe-area-inset-top, 0px) + 18px) 18px 14px 20px; }
  .cab-pest h1 { margin: 0; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 50px; line-height: 0.9; text-transform: uppercase; }
  .bloque-jugador.con-profe { margin-top: 24px; }
  .lapiz { position: absolute; right: 0; bottom: 0; width: 28px; height: 28px; border-radius: 14px; background: var(--q-acc); color: var(--q-acctx); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px var(--q-card); }
  .giro { width: 13px; height: 13px; border-radius: 50%; border: 2.5px solid currentColor; border-right-color: transparent; animation: gira 0.8s linear infinite; }
  @keyframes gira { to { transform: rotate(360deg); } }
  .botones { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 16px 0; }
  .botones button { height: 56px; border-radius: 14px; font-family: inherit; font-size: 15px; font-weight: 900; color: var(--q-tx); }
  .b-noche { border: 0; background: var(--q-noche); color: #fff !important; display: flex; align-items: center; justify-content: center; gap: 6px; }
  :global(html.dark) .b-noche { background: var(--q-sub); }
  .b-noche small { font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; opacity: 0.7; }
  .b-card { border: 1px solid var(--q-line); background: var(--q-card); }
  .b-clases { grid-column: 1 / -1; border: 1.5px dashed var(--q-lila); background: none; }
  :global(html.dark) .b-clases { border-color: #8a9bff; }
  .b-recargar { grid-column: 1 / -1; height: 48px !important; border: 0; background: var(--q-accs); color: var(--q-acct) !important; }
  .crear-profe { margin-top: 12px; }
  .sec { margin: 24px 20px 10px; font-family: var(--q-font-titulo); font-style: italic; font-weight: 800; font-size: 22px; text-transform: uppercase; }
  .campo { cursor: text; }
  .entrada { width: 100%; min-width: 0; border: 0; background: none; padding: 0; color: var(--q-tx); font: inherit; font-size: 17px; outline: none; }
  .usu { display: flex; align-items: center; gap: 1px; font-size: 17px; color: var(--q-tx2); }
  .cats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 8px; }
  .cats button { height: 40px; border: 0; border-radius: 10px; background: var(--q-sub); color: var(--q-tx); font-family: var(--q-font-fiesta); font-size: 16px; font-weight: 900; }
  .cats button.on { background: var(--q-acc); color: var(--q-acctx); }
  .colores .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
  .color { width: 32px; height: 32px; border-radius: 16px; border: 0; padding: 0; }
  .color.on { box-shadow: 0 0 0 3px var(--q-bg), 0 0 0 5px var(--q-tx); }
  .colores { padding-block: 12px; }
  .nota { margin: -4px 20px 8px; font-size: 13px; color: var(--q-tx2); }
  .salir { padding: 4px 16px 0; }
  .oculto { display: none; }
  .avatares { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 6px; padding: 4px 0 8px; }
  .av { display: flex; flex-direction: column; align-items: center; gap: 4px; border: 0; background: none; padding: 4px 0; color: var(--q-tx); font-family: var(--q-font-fiesta); border-radius: 10px; }
  .av small { font-size: 12px; font-weight: 800; }
  .av.on { background: color-mix(in srgb, var(--q-acc) 22%, transparent); }
  .av:active { transform: scale(0.94); }
  .quitar { width: 100%; height: 44px; border: 0; background: none; color: var(--q-tx2); font-size: 15px; font-weight: 600; }
</style>
