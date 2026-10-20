<script lang="ts">
  // Mis clases reservadas que vienen: con quién, día, hora y club. Tocar abre el perfil del profe; Cancelar devuelve
  // el saldo.
  import { f7 } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { cancelarReservaClase, clubDeClase, misClases } from '../../app/clases';
  import { franjaCompleta } from '../../app/jugar';
  import { nombreDe, perfilDe } from '../../app/vinculos';
  import { diaColombia, horaColombia, pesos } from '../../domain/jugar';
  import type { Clase } from '../../domain/clases';
  import { nombreDia } from './fechas';

  let { titulo = 'Mis clases' }: { titulo?: string } = $props();
  const lista = $derived(misClases());
  function cancelar(c: Clase) {
    f7.dialog.confirm(`Te devolvemos ${pesos(c.precio)} a tu saldo.`, 'Cancelar tu clase', async () => {
      await cancelarReservaClase(c.id);
      ui.avisar({ titulo: 'Clase cancelada', sub: `Te devolvimos ${pesos(c.precio)} a tu saldo`, icono: 'check' });
    });
  }
</script>

{#if lista.length}
  <h2 class="tit">{titulo}</h2>
  <div class="mis">
    {#each lista as c (c.id)}
      {@const f = franjaCompleta(c.franja_id)}
      <div class="mia">
        <button class="cuerpo" onclick={() => { toque(); ui.navegar(`/profesor/${c.profesor}/`); }}>
          <FotoPerfil perfil={perfilDe(c.profesor) ?? { nombre: nombreDe(c.profesor), color: '#3346a8' }} size={42} />
          <span class="txt">
            <b>Clase con {nombreDe(c.profesor).split(' ')[0]}</b>
            <small>{nombreDia(diaColombia(c.inicio)).split(' · ')[0]} · {horaColombia(c.inicio)} · {clubDeClase(c)?.nombre ?? 'Club'}{f ? ` · ${f.cancha.nombre}` : ''}</small>
          </span>
        </button>
        <button class="cancelar" onclick={() => cancelar(c)}>Cancelar</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .tit { margin: 22px 20px 10px; font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 22px; font-weight: 800; }
  .mis { display: flex; flex-direction: column; gap: 8px; margin: 0 16px; }
  .mia { display: flex; align-items: center; gap: 8px; padding: 12px; border: 1px solid var(--q-line); border-left: 4px solid var(--q-ok); border-radius: 14px; background: var(--q-card); }
  .cuerpo { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 0; border: 0; background: none; color: var(--q-tx); text-align: left; font-family: inherit; }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .txt b { font-size: 15px; font-weight: 800; }
  .txt small { font-size: 12.5px; color: var(--q-tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cancelar { flex: none; height: 34px; padding: 0 11px; border: 0; border-radius: 9px; background: var(--q-sub); color: var(--q-tx); font-family: inherit; font-size: 12.5px; font-weight: 900; }
</style>
