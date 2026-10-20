<script lang="ts">
  // Aviso tipo transmisión: baja arriba al centro cuando llega algo en vivo (reserva en acento, pago verde, pedido azul,
  // torneo dorado, clase lila, disputa roja). Al tocarlo lleva a su sección. Se apilan si llegan varios.
  import { franjasDe } from '$lib/club/app/club';
  import { panel, type Toast } from '../estado.svelte';

  const ICONO: Record<Toast['tipo'], string> = { reserva: '🎾', pago: '💵', pedido: '🍹', torneo: '🏆', cuenta: '🛳️', resultado: '⚖️', clase: '🎓' };
  function abrir(t: Toast) {
    const f = t.franja ? franjasDe().find((x) => x.id === t.franja) : null;
    if (f) panel.verFranja(f);
    else panel.seccion = t.destino;
    if (t.torneo) panel.torneo = t.torneo;
    panel.quitar(t.id);
  }
</script>

<div class="avisos" aria-live="polite">
  {#each panel.toasts.slice(0, 3) as t (t.id)}
    <div class="aviso {t.tipo}" role="status">
      <button class="cuerpo" onclick={() => abrir(t)}>
        <span class="ic" aria-hidden="true">{ICONO[t.tipo]}</span>
        <span class="tx">
          <b>{t.titulo}</b>
          <small>{t.sub}{#if t.app} · 📱 Quilombo{/if}</small>
        </span>
      </button>
      <button class="x" aria-label="Cerrar aviso" onclick={() => panel.quitar(t.id)}>×</button>
    </div>
  {/each}
</div>

<style>
  .avisos { position: fixed; top: 18px; left: 50%; width: 480px; margin-left: -240px; z-index: 50; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
  .aviso { pointer-events: auto; display: flex; align-items: stretch; border-radius: 16px; background: #1e7fd0; color: #fff; box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45); overflow: hidden; animation: baja 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both; }
  .aviso.reserva { background: var(--q-acc); color: var(--q-acctx); }
  .aviso.pago { background: #18895b; }
  .aviso.pedido { background: #1e7fd0; }
  .aviso.cuenta { background: #3346a8; }
  .aviso.clase { background: #5b4fd0; }
  .aviso.torneo { background: #b98500; }
  .aviso.resultado { background: #e8475b; }
  .cuerpo { flex: 1; min-width: 0; display: flex; align-items: center; gap: 14px; padding: 14px 6px 14px 18px; border: 0; background: none; color: inherit; text-align: left; }
  .ic { font-size: 30px; }
  .tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .tx b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; line-height: 1; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tx small { font-size: 14px; font-weight: 600; opacity: 0.95; }
  .x { width: 40px; border: 0; background: rgba(0, 0, 0, 0.12); color: inherit; font-size: 20px; }
  @keyframes baja { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: none; } }
</style>
