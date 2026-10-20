<script lang="ts">
  // Pagar entre varios: la cancha, un pedido del bar o lo consumido. Mitad y mitad (tú y otro), entre todos (partes
  // iguales) o a la medida (cada uno cuánto). Tu parte se paga de una con tu saldo; a los demás les llega para que
  // paguen la suya con su saldo. En la demo los demás pueden pagar solos (bots).
  import { untrack } from 'svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui, type PedidoDivision } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { E2E } from '$lib/app/sesion.svelte';
  import { dividirPago, saldoQuilombo } from '$lib/club/app/club';
  import { partesIguales } from '$lib/club/domain/billetera';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { genteActiva } from '../../app/rituales';
  import { bots, primero } from '../../app/saldo';
  import { nombreDe, perfilDe, yo } from '../../app/vinculos';
  import { pesos } from '../../domain/jugar';

  let abierto = $state(false);
  let pd = $state<PedidoDivision | null>(null);
  let modo = $state<'mitad' | 'todos' | 'medida'>('todos');
  let con = $state<string[]>([]);
  let montos = $state<Record<string, string>>({});
  let solos = $state(true);
  let enviando = $state(false);
  let error = $state('');

  $effect(() => {
    const d = ui.dividir;
    if (!d) return;
    untrack(() => {
      pd = d; error = ''; montos = {}; solos = true;
      const otros = d.gente.filter((u) => u !== yo());
      con = otros.length ? otros : [];
      modo = otros.length === 1 ? 'mitad' : 'todos';
      abierto = true;
    });
  });

  /** Para elegir: los del partido primero y luego tu gente */
  const candidatos = $derived(pd ? [...new Set([...pd.gente.filter((u) => u !== yo()), ...genteActiva()])] : []);
  const elegidos = $derived(modo === 'mitad' ? con.slice(0, 1) : con);
  const personas = $derived([yo(), ...elegidos]);
  const partes = $derived.by(() => {
    if (!pd) return [] as { user_id: string; monto: number }[];
    if (modo === 'medida') return personas.map((u) => ({ user_id: u, monto: Math.round(Number((montos[u] ?? '').replace(/\D/g, '')) || 0) }));
    const m = partesIguales(pd.total, personas.length);
    return personas.map((u, i) => ({ user_id: u, monto: m[i] }));
  });
  const suma = $derived(partes.reduce((s, p) => s + p.monto, 0));
  const mia = $derived(partes.find((p) => p.user_id === yo())?.monto ?? 0);
  const saldo = $derived(saldoQuilombo(yo()));
  const listo = $derived(!!pd && elegidos.length >= 1 && suma === pd.total && partes.every((p) => p.monto > 0) && saldo >= mia);

  function alternar(u: string) {
    toque(4);
    if (modo === 'mitad') { con = [u]; return; }
    con = con.includes(u) ? con.filter((x) => x !== u) : [...con, u];
  }
  function cambiarModo(m: typeof modo) {
    toque(4);
    modo = m;
    if (m === 'medida' && pd) {
      const iguales = partesIguales(pd.total, personas.length);
      montos = Object.fromEntries(personas.map((u, i) => [u, String(iguales[i])]));
    }
  }
  async function enviar() {
    if (!pd || !listo || enviando) return;
    enviando = true; error = '';
    const d = $state.snapshot(pd);
    const ps = $state.snapshot(partes);
    const r = await dividirPago({ tipo: d.tipo, ref: d.ref, total: d.total, concepto: d.concepto, partes: ps, creador: yo(), club: d.club });
    enviando = false;
    if (r.error || !r.id) { error = r.error ?? 'No se pudo'; return; }
    toque(18);
    const otros = ps.filter((p) => p.user_id !== yo()).map((p) => p.user_id);
    if (E2E && solos) {
      bots(r.id, otros, (u, ok) => ui.avisar(ok
        ? { titulo: `${primero(u)} pagó su parte ✓`, sub: 'Con su saldo Quilombo', icono: 'check' }
        : { titulo: `${primero(u)} no pudo pagar`, sub: 'No le alcanzó el saldo: puedes cubrir su parte', icono: 'alerta' }));
    }
    abierto = false;
    ui.avisar({ titulo: `Pagaste tu parte · ${pesos(mia)}`, sub: `A ${otros.map(primero).join(', ')} les llegó la suya`, icono: 'check' });
  }
</script>

<Hoja bind:abierto titulo={pd?.tipo === 'pedido' ? 'Dividir el pedido' : pd?.tipo === 'cuenta' ? 'Dividir lo consumido' : 'Dividir la cancha'} sub={pd ? `Cada uno paga su parte con su saldo · ${pesos(pd.total)}` : ''} alCerrar={() => (ui.dividir = null)}>
  {#if pd}
    <div class="modos" role="radiogroup" aria-label="Cómo dividir">
      <button role="radio" aria-checked={modo === 'mitad'} class:on={modo === 'mitad'} onclick={() => cambiarModo('mitad')}>Mitad y mitad</button>
      <button role="radio" aria-checked={modo === 'todos'} class:on={modo === 'todos'} onclick={() => cambiarModo('todos')}>Entre {personas.length > 2 && modo === 'todos' ? `los ${personas.length}` : 'todos'}</button>
      <button role="radio" aria-checked={modo === 'medida'} class:on={modo === 'medida'} onclick={() => cambiarModo('medida')}>Por montos</button>
    </div>

    <p class="lbl">{modo === 'mitad' ? '¿Con quién vas a medias?' : '¿Entre quiénes?'}</p>
    {#if candidatos.length}
      <div class="chips">
        {#each candidatos as u (u)}
          <button class:on={elegidos.includes(u)} aria-pressed={elegidos.includes(u)} onclick={() => alternar(u)}>{primero(u)}</button>
        {/each}
      </div>
    {:else}
      <p class="nota">Primero agrega a tu gente desde el buscador.</p>
    {/if}

    <div class="partes" aria-label="Lo que paga cada uno">
      {#each partes as p (p.user_id)}
        <div class="parte">
          <FotoPerfil perfil={perfilDe(p.user_id) ?? { nombre: nombreDe(p.user_id), color: '#1e7fd0' }} size={36} />
          <span class="quien">{p.user_id === yo() ? 'Tú' : nombreDe(p.user_id)}<small>{p.user_id === yo() ? 'se paga ya con tu saldo' : 'le llega para pagar con su saldo'}</small></span>
          {#if modo === 'medida'}
            <input class="q-input monto" inputmode="numeric" aria-label="Parte de {p.user_id === yo() ? 'ti' : nombreDe(p.user_id)}" value={montos[p.user_id] ?? ''} oninput={(e) => (montos = { ...montos, [p.user_id]: (e.currentTarget as HTMLInputElement).value.replace(/\D/g, '') })} />
          {:else}
            <b class="cuanto">{pesos(p.monto)}</b>
          {/if}
        </div>
      {/each}
    </div>
    {#if modo === 'medida' && suma !== pd.total}
      <p class="err">{suma > pd.total ? `Te pasaste ${pesos(suma - pd.total)}` : `Faltan ${pesos(pd.total - suma)} por repartir`}</p>
    {/if}
    {#if saldo < mia}
      <p class="err">Tu parte es {pesos(mia)} y tienes {pesos(saldo)}. <button class="link" onclick={() => (ui.recargar = { sugerido: mia - saldo })}>Recargar</button></p>
    {/if}
    {#if E2E}
      <label class="demo"><input type="checkbox" bind:checked={solos} /> Demo: que los demás paguen solos</label>
    {/if}
    {#if error}<p class="err">{error}</p>{/if}
  {/if}
  {#snippet pie()}
    <button class="q-btn bloque" disabled={!listo || enviando} onclick={enviar}>{enviando ? 'Enviando…' : `Enviar cobros y pagar mi parte · ${pesos(mia)}`}</button>
  {/snippet}
</Hoja>

<style>
  .modos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .modos button { height: 44px; border: 1.5px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); font-weight: 900; font-size: 13.5px; }
  .modos button.on { border-color: var(--q-acc); background: var(--q-accs); }
  .lbl { margin: 14px 0 8px; font-size: 11.5px; font-weight: 800; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.1em; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { height: 36px; padding: 0 14px; border: 1.5px solid var(--q-line); border-radius: 10px; background: var(--q-card); color: var(--q-tx); font-weight: 900; }
  .chips button.on { border-color: var(--q-acc); background: var(--q-acc); color: var(--q-acctx); }
  .partes { margin-top: 14px; border-radius: 16px; border: 1px solid var(--q-line); overflow: hidden; }
  .parte { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
  .parte + .parte { border-top: 1px solid var(--q-line); }
  .quien { flex: 1; min-width: 0; display: flex; flex-direction: column; font-weight: 900; font-size: 15px; }
  .quien small { font-weight: 600; font-size: 12.5px; color: var(--q-tx2); }
  .cuanto { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 24px; white-space: nowrap; }
  .monto { width: 120px; height: 42px; text-align: right; }
  .nota { font-size: 13.5px; color: var(--q-tx2); }
  .err { color: var(--q-alr); font-size: 14px; }
  .link { border: 0; background: none; padding: 0; color: var(--q-link); font-weight: 800; text-decoration: underline; }
  .demo { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 13.5px; color: var(--q-tx2); }
</style>
