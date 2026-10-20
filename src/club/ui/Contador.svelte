<script lang="ts">
  // Número que sube (o baja) animado hasta su valor nuevo, como un marcador de transmisión
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  let { valor, formato = (n: number) => Math.round(n).toLocaleString('es-CO') }: { valor: number; formato?: (n: number) => string } = $props();
  const t = new Tween(0, { duration: 900, easing: cubicOut });
  let cambio = $state(false);
  let previo: number | null = null;
  $effect(() => {
    const v = valor;
    if (previo !== null && v !== previo) { cambio = true; setTimeout(() => (cambio = false), 1200); }
    previo = v;
    void t.set(v);
  });
</script>

<span class="contador" class:cambio>{formato(t.current)}</span>

<style>
  .contador { display: inline-block; transition: color 0.3s, text-shadow 0.3s; }
  .cambio { color: var(--q-acct); text-shadow: 0 0 18px var(--c-accg); }
</style>
