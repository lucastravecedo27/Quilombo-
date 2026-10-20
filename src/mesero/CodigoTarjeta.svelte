<script lang="ts">
  // Digitar el código de 6 de una tarjeta Quilombo: 6 cajas grandes y un teclado con solo los caracteres que usan los
  // códigos (sin 0/O/1/I). Al completar los 6 avisa con onCodigo y se limpia.
  import { LARGO_TARJETA } from '$lib/club/domain/club';

  let { onCodigo, teclado = true }: { onCodigo: (codigo: string) => void; teclado?: boolean } = $props();
  const TECLAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('');
  let codigo = $state('');

  function tocar(t: string) {
    if (codigo.length >= LARGO_TARJETA) return;
    codigo += t;
    navigator.vibrate?.(10);
    if (codigo.length === LARGO_TARJETA) {
      const c = codigo;
      setTimeout(() => { onCodigo(c); codigo = ''; }, 180);
    }
  }
  const borrar = () => { codigo = codigo.slice(0, -1); };
</script>

<div class="codigo" role="group" aria-label="Código de la tarjeta">
  <div class="cajas" aria-live="polite">
    {#each Array.from({ length: LARGO_TARJETA }) as _, i (i)}
      <span class="caja m-num" class:actual={i === codigo.length}>{codigo[i] ?? ''}</span>
    {/each}
  </div>
  {#if teclado}
    <div class="teclas">
      {#each TECLAS as t (t)}
        <button class="m-num" onclick={() => tocar(t)} aria-label="Tecla {t}">{t}</button>
      {/each}
    </div>
    <div class="acciones">
      <button onclick={borrar} disabled={!codigo} aria-label="Borrar la última letra">⌫ Borrar</button>
      <button onclick={() => (codigo = '')} disabled={!codigo}>Limpiar</button>
    </div>
  {/if}
</div>

<style>
  .cajas { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
  .caja { height: 58px; border-radius: 12px; background: var(--q-card); border: 2px solid var(--q-line); display: flex; align-items: center; justify-content: center; font-size: 34px; color: var(--q-tx); }
  .caja.actual { border-color: var(--q-acc); }
  .teclas { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 5px; margin-top: 8px; }
  .teclas button { height: 42px; border: 0; border-radius: 9px; background: var(--q-sub); color: var(--q-tx); font-size: 20px; }
  .teclas button:active { background: var(--q-accs); color: var(--q-acct); }
  .acciones { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px; }
  .acciones button { height: 42px; border: 0; border-radius: 9px; background: var(--q-sub); color: var(--q-tx); font-size: 14.5px; font-weight: 900; }
  .acciones button:disabled { opacity: 0.4; }
</style>
