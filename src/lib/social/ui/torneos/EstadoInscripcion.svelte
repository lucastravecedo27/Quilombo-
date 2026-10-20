<script lang="ts">
  // Cómo va mi inscripción a un torneo, en vivo, como aviso de color: ✓ inscrito, ⏳ comprobante en revisión,
  // ✕ rechazado (con el motivo del club y para subir otro) o falta pagar.
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { pagarTorneoEnApp } from '$lib/club/app/club';
  import { club } from '../../app/jugar';
  import { nombreDe, yo } from '../../app/vinculos';
  import { pesos, type Inscripcion, type Torneo } from '../../domain/jugar';

  let { inscripcion: i, torneo: t, compacto = false }: { inscripcion: Inscripcion; torneo: Torneo; compacto?: boolean } = $props();
  const sede = $derived(club(t.club_id)?.nombre ?? 'El club');
  const pareja = $derived(i.pareja ? `con ${nombreDe(i.pareja).split(' ')[0]}` : 'pareja por asignar');

  function pagarConTarjeta() {
    toque();
    const ii = $state.snapshot(i) as Inscripcion, tt = $state.snapshot(t) as Torneo;
    ui.pagar = { concepto: `Inscripción · ${t.nombre}`, detalle: `Categoría ${i.categoria}ª · por pareja`, monto: t.precio, listo: '¡Inscripción pagada! Nos vemos en el torneo 🏆', accion: (m) => pagarTorneoEnApp(ii, tt, nombreDe(yo()), m) };
  }
</script>

<div class="estado {i.estado}" class:compacto role="status">
  {#if i.estado === 'inscrito'}
    <span class="txt">
      <b>✓ Inscrito</b>
      {#if !compacto}<small>Categoría {i.categoria}ª · {pareja}</small><small>{i.metodo === 'comprobante' ? 'El club aprobó tu comprobante.' : i.metodo === 'saldo' ? 'Pagado con tu saldo Quilombo.' : t.precio ? 'Pagado con tarjeta. ¡A entrenar!' : 'Torneo gratis. ¡A entrenar!'}</small>{/if}
    </span>
  {:else if i.estado === 'comprobante'}
    <span class="txt">
      <b>⏳ Comprobante en revisión</b>
      {#if !compacto}<small>Comprobante enviado · {sede} lo revisa y te confirma aquí.</small>{/if}
    </span>
    {#if !compacto && i.comprobante}<img src={i.comprobante} alt="Tu comprobante" />{/if}
  {:else if i.estado === 'rechazada'}
    <span class="txt">
      <b>✕ Comprobante rechazado</b>
      {#if !compacto}<small>Rechazado: {i.nota_club ?? 'el club no pudo validarlo'}</small>{/if}
    </span>
    {#if !compacto}<button class="blanco" onclick={() => { toque(); ui.inscribir = { torneo: t.id }; }}>📎 Subir otro comprobante</button>{/if}
  {:else if i.estado === 'pendiente_pago'}
    <span class="txt">
      <b>Falta pagar la inscripción</b>
      {#if !compacto}<small>{pesos(t.precio)} por pareja. Paga con saldo o tarjeta, o sube el comprobante de la transferencia.</small>{/if}
    </span>
    {#if !compacto}
      <div class="dos">
        <button class="blanco" onclick={pagarConTarjeta}>💳 Pagar inscripción</button>
        <button class="trans" onclick={() => { toque(); ui.inscribir = { torneo: t.id }; }}>📎 Comprobante</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .estado { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; color: #fff; background: var(--q-noche); animation: q-pop 0.45s var(--q-spring) both; }
  .inscrito { background: #18895b; }
  .comprobante { background: #a86b00; }
  .rechazada { background: #e8475b; }
  .pendiente_pago { background: var(--q-acc); color: var(--q-acctx); }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .txt b { font-size: 15.5px; font-weight: 800; }
  .txt small { font-size: 13px; opacity: 0.92; line-height: 1.35; }
  img { width: 44px; height: 58px; object-fit: cover; border-radius: 6px; border: 2px solid rgba(255, 255, 255, 0.5); }
  .dos { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  button { height: 40px; padding: 0 11px; border: 0; border-radius: 10px; font-family: inherit; font-size: 13.5px; font-weight: 900; }
  .blanco { background: #fff; color: var(--q-tx); }
  :global(html.dark) .blanco { color: #0e1b33; }
  .rechazada .blanco { color: #e8475b; }
  .trans { background: rgba(255, 255, 255, 0.2); color: inherit; }
  .compacto { padding: 0; margin-top: 2px; background: none !important; color: inherit; animation: none; }
  .compacto .txt b { font-size: 13px; }
  .compacto.inscrito b { color: var(--q-ok); }
  .compacto.comprobante b { color: var(--q-wrn); }
  .compacto.rechazada b { color: var(--q-alr); }
  .compacto.pendiente_pago b { color: var(--q-acct); }
</style>
