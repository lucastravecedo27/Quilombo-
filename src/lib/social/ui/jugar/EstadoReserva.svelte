<script lang="ts">
  // El estado de una reserva, grande y claro: APARTADA (naranja, con el plazo para pagar) o PAGADA (verde).
  import { horaColombia, type Franja } from '../../domain/jugar';

  let { franja, grande = false }: { franja: Franja; grande?: boolean } = $props();
  let ahora = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (ahora = Date.now()), 30_000);
    return () => clearInterval(t);
  });
  const hasta = $derived(franja.apartada_hasta ? Date.parse(franja.apartada_hasta) : null);
  const quedan = $derived(hasta ? Math.max(0, Math.round((hasta - ahora) / 60_000)) : null);
  const texto = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);
</script>

{#if franja.estado === 'pagada'}
  <div class="estado pagada" class:grande role="status">
    <span class="pill">✓ Pagada</span>
    {#if grande}<span class="sub">Reserva confirmada</span>{/if}
  </div>
{:else if franja.estado === 'apartada'}
  <div class="estado apartada" class:grande role="status">
    <span class="pill">⏳ Apartada</span>
    {#if hasta}<span class="sub">{grande ? `Tienes hasta las ${horaColombia(franja.apartada_hasta!)} para pagar` : `Paga antes de las ${horaColombia(franja.apartada_hasta!)}`}{grande && quedan !== null ? ` · quedan ${texto(quedan)}` : ''}</span>
    {:else}<span class="sub">Falta pagar</span>{/if}
  </div>
{/if}

<style>
  .estado { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .pill { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: 8px; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 15px; text-transform: uppercase; letter-spacing: 0.03em; color: #fff; }
  .apartada .pill { background: var(--q-naranja); }
  .pagada .pill { background: var(--q-ok); }
  .sub { font-size: 13px; font-weight: 700; color: var(--q-tx2); }
  .grande { flex-direction: column; align-items: flex-start; gap: 6px; }
  .grande .pill { height: 34px; padding: 0 14px; font-size: 20px; border-radius: 10px; }
  .grande .sub { font-size: 14px; color: var(--q-tx); }
  .apartada.grande .sub { color: var(--q-link); }
  .pagada.grande .sub { color: var(--q-ok); }
</style>
