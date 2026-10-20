<script lang="ts">
  // Reseña al profe después de una clase: estrellas y un comentario corto
  import { untrack } from 'svelte';
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { resenarProfesor } from '../../app/clases';
  import { nombreDe } from '../../app/vinculos';

  let abierto = $state(false);
  let profe = $state('');
  let estrellas = $state(5);
  let texto = $state('');
  $effect(() => {
    const r = ui.resenar;
    if (!r) return;
    untrack(() => { profe = r.profesor; estrellas = 5; texto = ''; abierto = true; });
  });
  async function enviar() {
    await resenarProfesor(profe, estrellas, texto.trim() || null);
    toque(18);
    ui.avisar({ titulo: '¡Gracias por tu reseña!', sub: 'Le ayuda a otros jugadores a elegir profe', icono: 'check' });
    abierto = false;
  }
</script>

<Hoja bind:abierto titulo="¿Cómo te fue en la clase?" sub={profe ? `Con ${nombreDe(profe)}` : ''} alCerrar={() => (ui.resenar = null)}>
  <div class="estrellas" role="radiogroup" aria-label="Estrellas">
    {#each [1, 2, 3, 4, 5] as n (n)}
      <button role="radio" aria-checked={estrellas === n} aria-label="{n} estrellas" class:on={n <= estrellas} onclick={() => { toque(4); estrellas = n; }}>★</button>
    {/each}
  </div>
  <textarea class="txt" rows="3" maxlength="200" placeholder="Cuéntale a otros jugadores cómo son sus clases" bind:value={texto} aria-label="Tu reseña"></textarea>
  {#snippet pie()}<button class="publicar" onclick={enviar}>Publicar reseña</button>{/snippet}
</Hoja>

<style>
  .estrellas { display: flex; justify-content: center; gap: 8px; margin: 4px 0 14px; }
  .estrellas button { width: 52px; height: 52px; border: 0; border-radius: 14px; background: var(--q-sub); font-size: 30px; color: var(--q-tx3); padding: 0; }
  .estrellas button.on { color: #f5b301; }
  .txt { width: 100%; box-sizing: border-box; border: 0; border-radius: 12px; background: var(--q-sub); color: var(--q-tx); padding: 12px 14px; font: inherit; font-size: 16px; outline: none; resize: none; }
  .publicar { width: 100%; height: 54px; border: 0; border-radius: 12px; background: var(--q-lila); color: #fff; font-family: inherit; font-size: 16.5px; font-weight: 900; }
</style>
