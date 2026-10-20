<script lang="ts">
  import { colorMarca } from '$lib/ui/avatares';
  // Un cobro entre dos personas (p. ej. su parte de la cancha): lo ven las dos. Tocarlo muestra lo que cada una puede hacer.
  import { f7 } from 'framework7-svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { accionCobro, nombreDe, perfilDe, recordarCobro, yo, type Cobro } from '../../app/vinculos';
  import { hayAbiertoCon, ini } from '../../app/rituales';
  import { pesos } from '../../domain/jugar';

  let { c, compacto = false }: { c: Cobro; compacto?: boolean } = $props();
  const meDeben = $derived(c.acreedor === yo());
  const otro = $derived(meDeben ? c.deudor : c.acreedor);
  const nombre = $derived(nombreDe(otro).split(' ')[0]);
  const ESTADO: Record<string, string> = { pendiente: 'Pendiente', avisado: 'Dice que pagó', pagado: 'Pagado', rechazado: 'No es suyo', cancelado: 'Cancelado' };

  async function hacer(accion: 'pague' | 'no_es_mio' | 'recibido' | 'cancelar', ok: string) {
    const err = await accionCobro(c.id, accion);
    if (err) { ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta' }); return; }
    toque(accion === 'recibido' ? 18 : 14);
    ui.avisar({ titulo: accion === 'recibido' && !hayAbiertoCon(otro) ? `¡A paz y salvo con ${nombre}! 🤝` : ok, icono: 'check' });
  }
  function abrir() {
    toque();
    const b: { text: string; color?: string; bold?: boolean; onClick?: () => void }[] = [];
    if (meDeben) {
      if (c.estado === 'pendiente' || c.estado === 'avisado') b.push({ text: '¡Ya me pagó!', bold: true, onClick: () => hacer('recibido', 'Listo, quedó pagado') });
      if (c.estado === 'pendiente') b.push({ text: 'Recordarle con cariño', onClick: () => { recordarCobro(c.id); ui.avisar({ titulo: 'Recordatorio enviado', sub: `A ${nombre} le llega un aviso amable`, icono: 'campana' }); } });
      if (c.estado !== 'pagado' && c.estado !== 'cancelado') b.push({ text: 'Cancelar el cobro', color: 'red', onClick: () => hacer('cancelar', 'Cobro cancelado') });
    } else {
      if (c.estado === 'pendiente') b.push({ text: 'Ya le pagué', bold: true, onClick: () => hacer('pague', `Le avisamos a ${nombre}`) });
      if (c.estado === 'pendiente' || c.estado === 'avisado') b.push({ text: 'Esto no es mío', color: 'red', onClick: () => hacer('no_es_mio', 'Listo, le avisamos') });
    }
    if (!b.length) return;
    f7.actions.create({ buttons: [[{ text: `${c.concepto} · ${meDeben ? `${nombre} te debe` : `le debes a ${nombre}`}`, label: true }, ...b], [{ text: 'Cerrar' }]] }).open();
  }
</script>

<button class="fila" class:compacto onclick={abrir}>
  <span class="av" style="background:{colorMarca(perfilDe(otro)?.color ?? 'var(--q-fiesta-lila)')}">{ini(nombreDe(otro))}</span>
  <span class="t">
    <b>{meDeben ? `${nombre} te debe` : `Le debes a ${nombre}`}</b>
    <small>{c.concepto}</small>
  </span>
  <span class="d">
    <b class="q-num" class:pos={meDeben}>{pesos(c.monto)}</b>
    <i class="est {c.estado}">{ESTADO[c.estado] ?? c.estado}</i>
  </span>
  {#if !compacto}<Icon name="chevron" size={13} />{/if}
</button>

<style>
  .fila { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 58px; border: 0; background: none; padding: 4px 0; color: var(--q-tx); font-family: var(--q-font-fiesta); text-align: left; }
  .fila > :global(svg) { color: var(--q-tx3); flex-shrink: 0; }
  .av { width: 42px; height: 42px; border-radius: 21px; color: var(--q-fiesta-tinta); font-size: 14px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .t b { font-size: 15px; font-weight: 800; }
  .t small { font-size: 12.5px; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .d { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
  .d b { font-size: 16px; font-weight: 900; }
  .pos { color: var(--q-link); }
  .est { font-style: normal; font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 8px; background: var(--q-sub); color: var(--q-tx2); }
  .est.avisado { background: var(--q-wrnbg); color: var(--q-wrn); }
  .est.pagado { background: var(--q-fiesta-lima); color: var(--q-fiesta-tinta); }
</style>
