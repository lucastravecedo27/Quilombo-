<script lang="ts">
  // Cómo va un pago entre varios: la parte de cada uno (✓ pagada / ⏳ pendiente / ✖ no pudo), lo que falta, y lo que
  // puedo hacer yo: pagar mi parte o decir que no puedo, o cubrir la parte de otro.
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { cubrirParte, pagarMiParte, rechazarParte } from '$lib/club/app/club';
  import { falta, pagado, type Division } from '$lib/club/domain/billetera';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { nombreDe, perfilDe, yo } from '../../app/vinculos';
  import { pesos } from '../../domain/jugar';

  let { d }: { d: Division } = $props();
  const pct = $derived(Math.round((pagado(d) / Math.max(1, d.total)) * 100));
  const mia = $derived(d.partes.find((p) => p.user_id === yo()));
  let ocupado = $state(false);

  async function hacer(fn: () => Promise<string | null | void>, ok: string) {
    if (ocupado) return;
    ocupado = true; toque(10);
    const err = await fn();
    ocupado = false;
    if (err) ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta', ...(err.includes('Saldo') ? { accion: { texto: 'Recargar', hacer: () => (ui.recargar = { sugerido: mia?.monto ?? 0 }) } } : {}) });
    else ui.avisar({ titulo: ok, icono: 'check' });
  }
  const ETQ = { pagada: '✓ Pagada', pendiente: '⏳ Pendiente', rechazada: '✖ No pudo' } as const;
</script>

<div class="div {d.estado}" aria-label="Pago entre varios">
  <div class="cab">
    <span class="tit">{d.estado === 'completa' ? '✓ Pagado entre ' + d.partes.length : '➗ Entre ' + d.partes.length}</span>
    <span class="cuanto q-num">{d.estado === 'completa' ? pesos(d.total) : `${pesos(pagado(d))} de ${pesos(d.total)}`}</span>
  </div>
  <div class="barra" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pagado"><i style="width:{pct}%"></i></div>
  <ul>
    {#each d.partes as p (p.user_id)}
      <li class={p.estado}>
        <FotoPerfil perfil={perfilDe(p.user_id) ?? { nombre: nombreDe(p.user_id), color: '#1e7fd0' }} size={34} />
        <span class="quien"><b>{p.user_id === yo() ? 'Tú' : nombreDe(p.user_id).split(' ')[0]} · {pesos(p.monto)}</b><small class="est">{ETQ[p.estado]}</small></span>
        {#if d.estado === 'abierta' && p.user_id !== yo() && p.estado !== 'pagada' && (d.creador === yo() || p.estado === 'rechazada')}
          <button class="cubrir" disabled={ocupado} onclick={() => hacer(() => cubrirParte(d.id, p.user_id, yo()), `Cubriste la parte de ${nombreDe(p.user_id).split(' ')[0]}`)}>Cubrir su parte</button>
        {/if}
      </li>
    {/each}
  </ul>
  {#if d.estado === 'abierta' && mia?.estado === 'pendiente'}
    <div class="mia">
      <button class="q-btn" disabled={ocupado} onclick={() => hacer(() => pagarMiParte(d.id, yo()), `Pagaste tu parte · ${pesos(mia.monto)}`)}>Pagar mi parte · {pesos(mia.monto)}</button>
      <button class="q-btn suave" disabled={ocupado} onclick={() => hacer(() => rechazarParte(d.id, yo()), 'Listo, le avisamos')}>No puedo</button>
    </div>
  {:else if d.estado === 'abierta'}
    <small class="falta">Faltan {pesos(falta(d))}: se completa cuando todos paguen su parte.</small>
  {/if}
</div>

<style>
  .div { padding: 12px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); display: flex; flex-direction: column; gap: 10px; }
  .cab { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .tit { font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-weight: 800; font-size: 17px; }
  .completa .tit { color: var(--q-ok); }
  .cuanto { font-weight: 800; font-size: 14px; }
  .barra { height: 6px; border-radius: 3px; background: var(--q-sub); overflow: hidden; }
  .barra i { display: block; height: 100%; background: var(--q-acc); transition: width 0.4s var(--q-ease); }
  .completa .barra i { background: var(--q-ok); }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  li { display: flex; align-items: center; gap: 10px; padding: 10px 0 0; margin-top: 10px; border-top: 1px solid var(--q-line); }
  li:first-child { margin-top: 0; }
  .quien { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .quien b { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .est { font-size: 12.5px; font-weight: 800; color: var(--q-acct); }
  .pagada .est { color: var(--q-ok); }
  .rechazada .est { color: var(--q-alr); }
  .cubrir { flex: none; height: 34px; padding: 0 11px; border: 0; border-radius: 9px; background: var(--q-sub); color: var(--q-tx); font-size: 13px; font-weight: 900; }
  .mia { display: grid; grid-template-columns: 1.6fr 1fr; gap: 8px; }
  .mia .q-btn { padding: 0 10px; font-size: 15px; height: 46px; }
  .falta { font-size: 12.5px; color: var(--q-tx2); }
</style>
