<script lang="ts">
  import { colorMarca } from '$lib/ui/avatares';
  // Buscar jugadores (como Instagram): por @usuario o nombre, consulta la base mientras escribes.
  // Debajo: tu @usuario (para que te encuentren) y "personas que quizás conozcas".
  import { Page, Navbar } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { buscarPersonas, guardarBuscable, guardarUsuario, miUsuario, sugerencias, sugerirUsuario, usuarioValido, type Encontrado } from '../app/buscador';
  import { ini } from '../app/rituales';
  import { nombreDe, yo } from '../app/vinculos';

  let q = $state('');
  let resultados = $state<Encontrado[]>([]);
  let buscando = $state(false);
  let error = $state('');
  let sugeridas = $state<Encontrado[]>([]);
  let campo = $state<HTMLInputElement | undefined>();
  let turno = 0;
  let t: ReturnType<typeof setTimeout> | null = null;

  // Consulta con un respiro de 280 ms (no una por tecla); solo vale la respuesta de la última búsqueda
  $effect(() => {
    const texto = q;
    if (t) clearTimeout(t);
    if (texto.trim().replace(/^@/, '').length < 2) { resultados = []; buscando = false; error = ''; return; }
    buscando = true;
    t = setTimeout(async () => {
      const mio = ++turno;
      const r = await buscarPersonas(texto);
      if (mio !== turno) return;
      resultados = r.lista; error = r.error ?? ''; buscando = false;
    }, 280);
  });
  onMount(async () => {
    setTimeout(() => campo?.focus(), 350);
    sugeridas = await sugerencias();
  });

  function agregar(p: Encontrado) {
    toque();
    ui.agregar = { codigo: p.codigo, qr: false };
  }

  // ── Mi @usuario
  const yoPerfil = $derived(miUsuario());
  let editando = $state(false);
  let nuevo = $state('');
  let guardando = $state(false);
  let errorUsuario = $state('');
  function editar() {
    nuevo = yoPerfil?.usuario ?? sugerirUsuario(nombreDe(yo()));
    errorUsuario = ''; editando = true;
  }
  async function guardar() {
    guardando = true;
    errorUsuario = (await guardarUsuario(nuevo)) ?? '';
    guardando = false;
    if (!errorUsuario) { toque(18); editando = false; ui.avisar({ titulo: `Listo, ahora eres @${nuevo.trim().replace(/^@/, '').toLowerCase()}`, icono: 'check' }); }
  }
  async function alternarBuscable() {
    const e = await guardarBuscable(!(yoPerfil?.buscable ?? true));
    if (e) ui.avisar({ titulo: 'No se pudo', sub: e, icono: 'alerta' });
  }
</script>

<Page name="parche-buscar" class="bu">
  <Navbar title="Buscar jugadores" backLink="Atrás" />

  <label class="caja">
    <Icon name="buscar" size={18} />
    <input bind:this={campo} type="search" placeholder="@usuario o nombre" bind:value={q} aria-label="Buscar jugadores" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" />
    {#if q}<button class="limpiar" aria-label="Borrar búsqueda" onclick={() => (q = '')}><Icon name="cerrar" size={13} stroke={2.8} /></button>{/if}
  </label>

  {#if q.trim().replace(/^@/, '').length >= 2}
    <div class="lista">
      {#if buscando && !resultados.length}
        <p class="nota">Buscando…</p>
      {:else if error}
        <p class="nota">{error}</p>
      {:else if !resultados.length}
        <p class="nota">No encontramos a nadie con «{q.trim()}». Pídele su @usuario.</p>
      {/if}
      {#each resultados as p (p.codigo)}
        {@render fila(p)}
      {/each}
    </div>
  {:else}
    <section class="mio">
      {#if editando}
        <form class="editar" onsubmit={(e) => { e.preventDefault(); void guardar(); }}>
          <span class="arroba">@</span>
          <input bind:value={nuevo} maxlength="20" autocapitalize="off" autocomplete="off" spellcheck="false" aria-label="Tu usuario" />
          <button class="q-btn chico" disabled={guardando || !usuarioValido(nuevo.trim().replace(/^@/, '').toLowerCase())}>{guardando ? '…' : 'Guardar'}</button>
        </form>
        {#if errorUsuario}<p class="err">{errorUsuario}</p>{:else}<p class="nota izq">Letras, números, punto o guion bajo. Así te encuentra tu gente.</p>{/if}
      {:else}
        <button class="yo" onclick={editar}>
          <span><small>Tu usuario</small><b>{yoPerfil?.usuario ? '@' + yoPerfil.usuario : 'Elige tu @usuario'}</b></span>
          <Icon name="editar" size={17} />
        </button>
      {/if}
      <label class="interruptor">
        <span><b>Que me encuentren en el buscador</b><small>Se ve tu nombre, tu @usuario, tu categoría y tu ciudad.</small></span>
        <input type="checkbox" role="switch" checked={yoPerfil?.buscable ?? true} onchange={alternarBuscable} aria-label="Que me encuentren en el buscador" />
      </label>
    </section>

    {#if sugeridas.length}
      <h3>Jugadores que quizás conozcas</h3>
      <div class="lista">
        {#each sugeridas as p (p.codigo)}{@render fila(p)}{/each}
      </div>
    {/if}
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

{#snippet fila(p: Encontrado)}
  <div class="fila">
    <span class="av" style="background:{colorMarca(p.color)}">{ini(p.nombre)}</span>
    <span class="tx">
      <b>{p.nombre}</b>
      <small>{p.usuario ? '@' + p.usuario : 'Sin usuario'}{p.categoria ? ` · ${p.categoria}ª` : ''}{p.ciudad ? ` · ${p.ciudad}` : ''}{p.en_comun ? ` · ${p.en_comun} amigo${p.en_comun === 1 ? '' : 's'} en común` : ''}</small>
    </span>
    {#if p.estado === 'activa'}
      <span class="estado">Conectados</span>
    {:else if p.estado === 'pendiente'}
      <span class="estado">Pendiente</span>
    {:else}
      <button class="q-btn chico" onclick={() => agregar(p)}>Agregar</button>
    {/if}
  </div>
{/snippet}

<style>
  :global(.page.bu .page-content) { font-family: var(--q-font-fiesta); }
  .caja { display: flex; align-items: center; gap: 10px; height: 46px; margin: 12px 16px; padding: 0 14px; border-radius: 14px; background: var(--q-sub); color: var(--q-tx2); }
  .caja input::-webkit-search-cancel-button { display: none; -webkit-appearance: none; }
  .caja input { flex: 1; min-width: 0; border: 0; background: none; color: var(--q-tx); font: inherit; font-size: 16px; outline: none; }
  .limpiar { width: 22px; height: 22px; border-radius: 11px; border: 0; background: var(--q-tx3); color: var(--q-bg); display: flex; align-items: center; justify-content: center; padding: 0; }
  .lista { margin: 0 16px; display: flex; flex-direction: column; }
  .fila { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 0.5px solid var(--q-line); }
  .av { width: 48px; height: 48px; border-radius: 24px; color: var(--q-fiesta-tinta); font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .tx b { font-size: 15.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tx small { font-size: 13px; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .estado { font-size: 13px; font-weight: 700; color: var(--q-tx2); padding: 0 6px; }
  .nota { color: var(--q-tx2); font-size: 14px; text-align: center; margin: 18px 8px; line-height: 1.4; }
  .nota.izq { text-align: left; margin: 6px 4px 0; font-size: 12.5px; }
  .err { color: var(--q-alr); font-size: 13px; margin: 6px 4px 0; }
  .mio { margin: 4px 16px 8px; padding: 14px; border-radius: 14px; background: var(--q-card); display: flex; flex-direction: column; gap: 12px; }
  .yo { display: flex; align-items: center; justify-content: space-between; border: 0; background: none; padding: 0; color: var(--q-tx); text-align: left; font: inherit; }
  .yo span { display: flex; flex-direction: column; }
  .yo small { font-size: 12px; color: var(--q-tx2); }
  .yo b { font-size: 18px; font-weight: 900; }
  .editar { display: flex; align-items: center; gap: 6px; }
  .arroba { font-size: 20px; font-weight: 900; color: var(--q-tx2); }
  .editar input { flex: 1; min-width: 0; height: 42px; padding: 0 12px; border-radius: 10px; border: 0; background: var(--q-sub); color: var(--q-tx); font: inherit; font-size: 16px; outline: none; }
  .interruptor { display: flex; align-items: center; gap: 12px; }
  .interruptor span { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .interruptor b { font-size: 14.5px; }
  .interruptor small { font-size: 12.5px; color: var(--q-tx2); line-height: 1.35; }
  .interruptor input { appearance: none; -webkit-appearance: none; position: relative; width: 51px; height: 31px; margin: 0; border-radius: 10px; background: var(--q-sub); flex-shrink: 0; transition: background 0.2s; cursor: pointer; }
  .interruptor input::after { content: ''; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25); transition: transform 0.2s; }
  .interruptor input:checked { background: var(--q-acc); }
  .interruptor input:checked::after { transform: translateX(20px); }
  h3 { margin: 18px 20px 4px; font-size: 16px; font-weight: 900; }
</style>
