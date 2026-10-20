<script lang="ts">
  // "Yo voy" a un torneo: categoría, pareja y el pago. Con tarjeta queda inscrito de una (pasa por la hoja de pago);
  // con comprobante se transfiere a la cuenta del club, se adjunta la foto/captura y el club la revisa.
  // Si el club rechazó el comprobante, la hoja abre directo para subir otro.
  import { untrack } from 'svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { club, inscribirme, miInscripcion, reenviarComprobante, torneo } from '../../app/jugar';
  import { genteActiva, primerNombre } from '../../app/rituales';
  import { miPerfil } from '../../app/perfil.svelte';
  import { nombreDe } from '../../app/vinculos';
  import { pesos } from '../../domain/jugar';
  import { comprobanteDesde } from './comprobante';

  let abierto = $state(false);
  let tid = $state<string | null>(null);
  let categoria = $state<number | null>(null);
  let pareja = $state<string | null>(null);
  let fase = $state<'datos' | 'comprobante'>('datos');
  /** Con qué paga (cuando el torneo tiene precio): tarjeta/saldo o comprobante de transferencia */
  let metodo = $state<'tarjeta' | 'comprobante'>('tarjeta');
  let archivo: HTMLInputElement | undefined = $state();
  let nombreArchivo = $state('');
  function adjuntar(foto: boolean) {
    if (!archivo) return;
    toque(4);
    if (foto) archivo.setAttribute('capture', 'environment'); else archivo.removeAttribute('capture');
    archivo.click();
  }
  let imagen = $state<string | null>(null);
  let leyendo = $state(false);
  let enviando = $state(false);
  let error = $state('');

  const t = $derived(tid ? torneo(tid) : null);
  const sede = $derived(club(t?.club_id));
  const previa = $derived(tid ? miInscripcion(tid) : null);
  const reenvio = $derived(previa?.estado === 'rechazada' || previa?.estado === 'pendiente_pago' ? previa : null);

  $effect(() => {
    const r = ui.inscribir;
    if (!r) return;
    // Solo reacciona a que se pida abrir (no a cambios de los datos mientras está abierta)
    untrack(() => abrir(r.torneo));
  });
  function abrir(id: string) {
    const r = { torneo: id };
    const tt = torneo(r.torneo);
    if (!tt) return;
    tid = r.torneo; error = ''; imagen = null; pareja = null;
    const mia = miPerfil().categoria ?? 0;
    categoria = tt.categorias.includes(mia) ? mia : tt.categorias[0] ?? null;
    const p = miInscripcion(r.torneo);
    fase = p && (p.estado === 'rechazada' || p.estado === 'pendiente_pago') ? 'comprobante' : 'datos';
    metodo = fase === 'comprobante' ? 'comprobante' : 'tarjeta';
    nombreArchivo = '';
    abierto = true;
  }

  async function elegirArchivo(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    nombreArchivo = f.name || 'comprobante.jpg';
    leyendo = true; error = '';
    try { imagen = await comprobanteDesde(f); } catch (err) { error = (err as Error).message || 'No se pudo abrir esa imagen'; }
    leyendo = false;
  }

  function conTarjeta() {
    if (!t || !categoria) return;
    toque();
    const id = t.id, c = categoria, p = pareja;
    abierto = false; ui.inscribir = null;
    setTimeout(() => {
      ui.pagar = {
        concepto: `Inscripción · ${t.nombre}`, detalle: `Categoría ${c}ª${p ? ` · con ${primerNombre(nombreDe(p))}` : ''} · por pareja`, monto: t.precio,
        listo: '¡Quedaste inscrito! Nos vemos en el torneo 🏆',
        accion: (m) => inscribirme(id, c, p, m === 'saldo' ? { metodo: 'saldo' } : { metodo: 'tarjeta' })
      };
    }, 350);
  }
  async function gratis() {
    if (!t || !categoria || enviando) return;
    enviando = true;
    const err = await inscribirme(t.id, categoria, pareja);
    enviando = false;
    if (err) { error = err; return; }
    toque(18); abierto = false; ui.inscribir = null;
    ui.avisar({ titulo: '¡Quedaste inscrito! 🏆', sub: `${t.nombre} · ${categoria}ª`, icono: 'check' });
  }
  async function enviarComprobante() {
    if (!t || !imagen || enviando) return;
    enviando = true; error = '';
    const err = reenvio ? await reenviarComprobante(reenvio.id, imagen) : await inscribirme(t.id, categoria!, pareja, { metodo: 'comprobante', comprobante: imagen });
    enviando = false;
    if (err) { error = err; return; }
    toque(18); abierto = false; ui.inscribir = null;
    ui.avisar({ titulo: 'Comprobante enviado 📎', sub: `${sede?.nombre ?? 'El club'} lo revisa y te confirma aquí`, icono: 'check' });
  }
</script>

<Hoja bind:abierto titulo={fase === 'comprobante' ? 'Adjuntar comprobante' : 'Yo voy'} sub={t ? `${t.nombre}${t.precio ? ` · ${pesos(t.precio)} por pareja` : ' · gratis'}` : ''} alCerrar={() => (ui.inscribir = null)}>
  {#if t}
    {#if fase === 'datos'}
      <div class="grupo">
        <small class="lbl">Categoría</small>
        <div class="chips" role="radiogroup" aria-label="Categoría">
          {#each t.categorias as c (c)}<button role="radio" aria-checked={categoria === c} class:on={categoria === c} onclick={() => { toque(4); categoria = c; }}>{c}ª</button>{/each}
        </div>
      </div>
      <div class="grupo">
        <small class="lbl">Pareja</small>
        <div class="chips" role="radiogroup" aria-label="Pareja">
          {#each genteActiva() as u (u)}<button role="radio" aria-checked={pareja === u} class:on={pareja === u} onclick={() => { toque(4); pareja = u; }}>{primerNombre(nombreDe(u))}</button>{/each}
          <button role="radio" aria-checked={pareja === null} class:on={pareja === null} onclick={() => (pareja = null)}>🔎 Busco pareja</button>
        </div>
      </div>
      {#if t.precio}
        <div class="seg">
          <button aria-pressed={metodo === 'tarjeta'} class:on={metodo === 'tarjeta'} onclick={() => { toque(4); metodo = 'tarjeta'; }} aria-label="Pagar con tarjeta o saldo">💳 Tarjeta o saldo</button>
          <button aria-pressed={metodo === 'comprobante'} class:on={metodo === 'comprobante'} onclick={() => { toque(4); metodo = 'comprobante'; }} aria-label="Adjuntar comprobante">📎 Comprobante</button>
        </div>
      {/if}
    {/if}
    {#if fase === 'comprobante' || (t.precio && metodo === 'comprobante')}
      <div class="cuenta">
        <small class="lbl">Transfiere a la cuenta del club</small>
        <b class="club">{sede?.nombre ?? 'El club'}</b>
        <span class="num">{t.cuenta_pago ?? `${sede?.nombre ?? 'El club'} te comparte la cuenta`}</span>
        <span class="monto">Monto: <b>{pesos(t.precio)}</b> · Nequi también vale</span>
      </div>
      {#if reenvio?.estado === 'rechazada'}<p class="rechazo">El club rechazó el anterior: {reenvio.nota_club ?? 'no pudo validarlo'}</p>{/if}
      <input bind:this={archivo} class="oculto" type="file" accept="image/*" onchange={elegirArchivo} aria-label="Comprobante de pago" />
      {#if imagen}
        <div class="adjunto">
          <img src={imagen} alt="Comprobante adjunto" />
          <span class="a-txt"><b>{nombreArchivo || 'comprobante.jpg'}</b><small>{pesos(t.precio)} · listo para enviar</small></span>
          <button class="quitar" aria-label="Quitar comprobante" onclick={() => { imagen = null; nombreArchivo = ''; }}>✕</button>
        </div>
      {:else}
        <div class="dos">
          <button class="punteado" disabled={leyendo} onclick={() => adjuntar(true)}>📷 Tomar foto</button>
          <button class="punteado" disabled={leyendo} onclick={() => adjuntar(false)}>{leyendo ? 'Abriendo…' : '🖼️ Elegir captura'}</button>
        </div>
      {/if}
    {/if}
    {#if error}<p class="err">{error}</p>{/if}
  {/if}
  {#snippet pie()}
    {#if t && fase === 'datos' && !t.precio}
      <button class="principal" disabled={!categoria || enviando} onclick={gratis}>{enviando ? 'Inscribiendo…' : 'Inscribirme · gratis'}</button>
    {:else if t && fase === 'datos' && metodo === 'tarjeta'}
      <button class="principal" disabled={!categoria} onclick={conTarjeta}>💳 Pagar · saldo o tarjeta · {pesos(t.precio)}</button>
    {:else if t}
      <button class="principal" disabled={!imagen || enviando || leyendo || (fase === 'datos' && !categoria)} onclick={enviarComprobante}>{enviando ? 'Enviando…' : 'Enviar comprobante'}</button>
    {/if}
  {/snippet}
</Hoja>

<style>
  .grupo { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .grupo:first-child { margin-top: 4px; }
  .lbl { font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--q-tx2); text-transform: uppercase; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { height: 40px; min-width: 56px; padding: 0 12px; border: 1.5px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); font-family: inherit; font-weight: 900; font-size: 14px; }
  .chips button.on { border-color: var(--q-acc); background: var(--q-accs); }
  .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 14px; padding: 4px; border-radius: 12px; background: var(--q-sub); }
  .seg button { height: 40px; border: 0; border-radius: 9px; background: transparent; color: var(--q-tx); font-family: inherit; font-size: 14px; font-weight: 900; }
  .seg button.on { background: var(--q-card); box-shadow: 0 2px 6px rgba(14, 27, 51, 0.12); }
  .cuenta { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; padding: 14px; border-radius: 14px; border: 1px solid var(--q-line); }
  .club { font-size: 15.5px; }
  .num { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 21px; letter-spacing: 0.02em; line-height: 1.1; user-select: all; -webkit-user-select: all; }
  .monto { font-size: 14px; color: var(--q-tx2); }
  .monto b { color: var(--q-tx); }
  .rechazo { margin: 10px 0 0; font-size: 14px; font-weight: 700; color: var(--q-alr); }
  .oculto { display: none; }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
  .punteado { height: 48px; border: 1.5px dashed var(--q-borde); border-radius: 12px; background: none; color: var(--q-tx); font-family: inherit; font-size: 14px; font-weight: 900; }
  .adjunto { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 10px; border-radius: 12px; background: var(--q-accs); animation: q-pop 0.4s var(--q-spring) both; }
  .adjunto img { width: 44px; height: 58px; object-fit: cover; border-radius: 6px; }
  .a-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .a-txt b { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .a-txt small { font-size: 12.5px; color: var(--q-tx2); }
  .quitar { width: 30px; height: 30px; flex: none; border: 0; border-radius: 15px; background: var(--q-sub); color: var(--q-tx); font-weight: 900; }
  .principal { width: 100%; height: 54px; border: 0; border-radius: 12px; background: var(--q-acc); color: var(--q-acctx); font-family: inherit; font-size: 16.5px; font-weight: 900; }
  .principal:disabled { opacity: 0.4; }
  .err { color: var(--q-alr); font-size: 13.5px; }
</style>
