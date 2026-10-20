<script lang="ts">
  // "Juan te pide $60.000 de la cancha": las partes que me tocan de un pago entre varios, para pagarlas con mi saldo
  // o decir que no puedo.
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { pagarMiParte, rechazarParte, saldoQuilombo } from '$lib/club/app/club';
  import { meTocaPagar, miParte, primero } from '../../app/saldo';
  import { nombreDe, perfilDe, yo } from '../../app/vinculos';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { pesos } from '../../domain/jugar';

  const lista = $derived(meTocaPagar());
  let ocupado = $state(false);
  async function pagar(did: string, monto: number) {
    if (ocupado) return;
    if (saldoQuilombo(yo()) < monto) { ui.recargar = { sugerido: monto - saldoQuilombo(yo()) }; return; }
    ocupado = true; toque(12);
    const err = await pagarMiParte(did, yo());
    ocupado = false;
    ui.avisar(err ? { titulo: 'No se pudo', sub: err, icono: 'alerta' } : { titulo: `Pagaste tu parte · ${pesos(monto)}`, sub: 'Con tu saldo Quilombo', icono: 'check' });
  }
  async function noPuedo(did: string) {
    toque(6);
    await rechazarParte(did, yo());
    ui.avisar({ titulo: 'Listo, le avisamos' });
  }
</script>

{#each lista as d (d.id)}
  {@const p = miParte(d)}
  {#if p}
    <div class="aviso" role="status">
      <span class="cara"><FotoPerfil perfil={perfilDe(d.creador) ?? { nombre: nombreDe(d.creador), color: '#1e7fd0' }} size={40} /></span>
      <div class="txt">
        <b>{primero(d.creador)} te pide {pesos(p.monto)}</b>
        <small>Tu parte {d.tipo === 'cancha' ? 'de la cancha' : d.tipo === 'pedido' ? 'del pedido' : 'de lo consumido'} · {d.concepto}</small>
        <button class="no" onclick={() => noPuedo(d.id)}>No puedo</button>
      </div>
      <button class="pagar" disabled={ocupado} onclick={() => pagar(d.id, p.monto)}>{saldoQuilombo(yo()) >= p.monto ? 'Pagar mi parte' : 'Recargar y pagar'}</button>
    </div>
  {/if}
{/each}

<style>
  .aviso { margin: 0 16px 8px; padding: 12px 12px 12px 14px; border-radius: 14px; background: var(--q-card); border: 1px solid var(--q-line); color: var(--q-tx); display: flex; align-items: center; gap: 12px; animation: q-ov 0.45s both; }
  .cara { flex: none; display: inline-flex; }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
  .txt b { font-size: 15px; }
  .txt small { font-size: 13px; color: var(--q-tx2); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pagar { flex: none; height: 38px; padding: 0 13px; border: 0; border-radius: 10px; background: var(--q-acc); color: var(--q-acctx); font-size: 13.5px; font-weight: 900; }
  .pagar:disabled { opacity: 0.5; }
  .no { border: 0; background: none; color: var(--q-tx2); font-size: 12.5px; font-weight: 800; padding: 2px 0 0; text-decoration: underline; }
</style>
