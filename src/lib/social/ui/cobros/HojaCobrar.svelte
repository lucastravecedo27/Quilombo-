<script lang="ts">
  import { colorMarca } from '$lib/ui/avatares';
  // Dividir la cancha (o lo que sea) con tu gente: a cada persona le llega a su app lo que le toca.
  import { Sheet } from 'framework7-svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { cobrar, nombreDe, perfilDe, vinculos, yo } from '../../app/vinculos';
  import { ini } from '../../app/rituales';
  import { activas, otroDe, repartirIgual } from '../../domain/vinculos';
  import { pesos } from '../../domain/jugar';

  /** "120.000" ↔ 120000 (pesos colombianos, sin decimales) */
  const pesosDeTexto = (t: string) => Number(t.replace(/\D/g, '')) || 0;
  const textoDePesos = (n: number) => (n ? n.toLocaleString('es-CO') : '');

  let elegidos = $state<string[]>([]);
  let totalTxt = $state('');
  let concepto = $state('');
  let incluirme = $state(true);
  let enviando = $state(false);
  let error = $state('');

  const gente = $derived(activas(vinculos()).map((v) => otroDe(v, yo())));
  const total = $derived(pesosDeTexto(totalTxt));
  const partes = $derived(repartirIgual(total, elegidos.length + (incluirme ? 1 : 0)));
  // si me incluyo, mi parte es la primera; a los demás les toca el resto
  const aCobrar = $derived(incluirme ? partes.slice(1) : partes);
  const porPersona = $derived(aCobrar[0] ?? 0);

  $effect(() => {
    const c = ui.cobrar;
    if (!c) return;
    elegidos = (c.para ?? []).filter((x) => gente.includes(x));
    totalTxt = c.monto ? textoDePesos(c.monto) : '';
    concepto = c.concepto ?? '';
    incluirme = true; error = '';
  });

  const alternar = (uid: string) => { toque(); elegidos = elegidos.includes(uid) ? elegidos.filter((x) => x !== uid) : [...elegidos, uid]; };

  async function enviar() {
    if (enviando || !elegidos.length || !total || !concepto.trim()) return;
    toque(14); enviando = true; error = '';
    const err = await cobrar(elegidos, aCobrar, concepto.trim());
    enviando = false;
    if (err) { error = err; return; }
    ui.avisar({ titulo: '¡Cobro enviado!', sub: `A ${elegidos.length === 1 ? nombreDe(elegidos[0]).split(' ')[0] : `${elegidos.length} personas`} le llegó a su app`, icono: 'check' });
    ui.cobrar = null;
  }

  // Framework7 pisa `opened` por dentro; con una expresión (!!x) la hoja no volvía a abrir tras cerrarla con atrás,
  // Escape o deslizando. Un booleano propio sí se vuelve a leer.
  let abierta = $state(false);
  $effect.pre(() => { abierta = !!ui.cobrar; });
</script>

<Sheet class="hoja-cobrar" opened={abierta} onSheetClosed={() => (ui.cobrar = null)} swipeToClose backdrop push style="height:auto;max-height:94vh">
  <div class="q-agarre"></div>
  <div class="q-hoja-cab">
    <h2>Dividir y cobrar</h2>
    <button class="q-cerrar" aria-label="Cerrar" onclick={() => (ui.cobrar = null)}><Icon name="cerrar" size={15} stroke={2.6} /></button>
  </div>
  <div class="cuerpo">
    {#if !gente.length}
      <p class="estado">Primero conecta con tu gente: búscalos por su @usuario.</p>
      <button class="enviar" onclick={() => { ui.cobrar = null; ui.navegar('/buscar/'); }}><Icon name="buscar" size={18} stroke={2.2} /> Buscar jugadores</button>
    {:else}
      <label class="campo-total">
        <span>$</span>
        <input inputmode="numeric" placeholder="0" value={totalTxt} oninput={(e) => (totalTxt = textoDePesos(pesosDeTexto((e.target as HTMLInputElement).value)))} aria-label="Total de la cuenta" />
      </label>
      <input class="q-input" placeholder="¿De qué? Cancha, pelotas, inscripción…" maxlength="80" bind:value={concepto} aria-label="Concepto" />

      <span class="pregunta">¿Con quiénes?</span>
      <div class="gente">
        {#each gente as uid (uid)}
          {@const sel = elegidos.includes(uid)}
          <button class="persona" class:sel onclick={() => alternar(uid)} aria-pressed={sel}>
            <span class="av" style="background:{colorMarca(perfilDe(uid)?.color ?? 'var(--q-fiesta-lila)')}">{ini(nombreDe(uid))}{#if sel}<i><Icon name="check" size={12} stroke={3} /></i>{/if}</span>
            <span class="nom">{nombreDe(uid).split(' ')[0]}</span>
          </button>
        {/each}
      </div>
      <label class="yo"><input type="checkbox" bind:checked={incluirme} /> Yo también pongo mi parte</label>

      {#if elegidos.length && total}
        <div class="resumen">
          <span>A cada uno le toca</span>
          <b class="q-num">{pesos(porPersona)}</b>
        </div>
      {/if}
      <button class="enviar" disabled={enviando || !elegidos.length || !total || !concepto.trim()} onclick={enviar}>
        {enviando ? 'Enviando…' : elegidos.length ? `Cobrarle a ${elegidos.length === 1 ? nombreDe(elegidos[0]).split(' ')[0] : `${elegidos.length} personas`}` : 'Elige a quién cobrarle'}
      </button>
    {/if}
    {#if error}<p class="error"><Icon name="alerta" size={15} /> {error}</p>{/if}
  </div>
  <div class="pie"></div>
</Sheet>

<style>
  .cuerpo { padding: 2px 16px 0; display: flex; flex-direction: column; gap: 12px; font-family: var(--q-font-fiesta); }
  .estado { margin: 6px 0; text-align: center; color: var(--q-tx2); font-size: 15px; line-height: 1.4; }
  .campo-total { display: flex; align-items: baseline; justify-content: center; gap: 4px; padding: 6px 0; }
  .campo-total span { font-size: 28px; font-weight: 800; color: var(--q-tx2); }
  .campo-total input { width: 70%; border: 0; background: none; color: var(--q-tx); font-family: inherit; font-size: 44px; font-weight: 900; letter-spacing: -0.03em; text-align: center; outline: none; font-variant-numeric: tabular-nums; }
  .pregunta { font-size: 15px; font-weight: 800; color: var(--q-tx2); }
  .gente { display: flex; gap: 12px; overflow-x: auto; padding: 4px 2px 6px; scrollbar-width: none; }
  .gente::-webkit-scrollbar { display: none; }
  .nom { display: block; max-width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .persona { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 5px; width: 64px; border: 0; background: none; padding: 0; color: var(--q-tx); font-family: inherit; font-size: 12.5px; font-weight: 800; }
  .av { position: relative; width: 54px; height: 54px; border-radius: 27px; color: var(--q-fiesta-tinta); font-weight: 900; display: flex; align-items: center; justify-content: center; opacity: 0.55; transition: opacity var(--q-dur), transform var(--q-dur) var(--q-spring); }
  .persona.sel .av { opacity: 1; transform: scale(1.06); box-shadow: 0 0 0 3px var(--q-acc); }
  .av i { position: absolute; right: -3px; bottom: -3px; width: 20px; height: 20px; border-radius: 10px; background: var(--q-acc); color: var(--q-acctx); display: flex; align-items: center; justify-content: center; font-style: normal; }
  .yo { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--q-tx2); min-height: 32px; }
  .resumen { display: flex; flex-direction: column; align-items: center; padding: 12px; border-radius: 14px; background: var(--q-fiesta-lila); color: var(--q-fiesta-tinta); }
  .resumen span { font-size: 13px; font-weight: 800; }
  .resumen b { font-size: 30px; font-weight: 900; }
  .enviar { height: 52px; border: 0; border-radius: 14px; background: var(--q-acc); color: var(--q-acctx); font-family: inherit; font-size: 16px; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .enviar:disabled { opacity: 0.5; }
  .error { display: flex; gap: 6px; margin: 0; font-size: 14px; color: var(--q-alr); line-height: 1.35; }
  .pie { height: calc(16px + env(safe-area-inset-bottom)); }
</style>
