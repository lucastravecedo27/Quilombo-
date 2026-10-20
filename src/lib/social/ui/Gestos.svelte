<script lang="ts">
  // Un toque a alguien de tu gente: ¿jugamos?, qué nivel, fuerza… Le llega un aviso y queda en la actividad de los dos.
  import { saludar } from '../app/social';
  import { ui } from '$lib/app/ui.svelte';
  import { GESTOS, type Gesto } from '../domain/social';
  import { reducirMovimiento, toque } from '$lib/ui/tema.svelte';

  let { relacion, nombre, compacto = false, titulo = '' }: { relacion: string; nombre: string; compacto?: boolean; titulo?: string } = $props();
  let enviando = $state<Gesto | null>(null);
  let vuelos = $state<{ k: number; emoji: string; x: number; y: number }[]>([]);
  let n = 0;
  /** "Un tinto" → "Tinto" (el botón ya lleva el emoji) */
  const corto = (t: string) => t;

  /** Los emojis vuelan sobre todo (fuera de hojas y páginas que tienen transform) */
  function alCuerpo(nodo: HTMLElement) {
    document.body.appendChild(nodo);
    return { destroy: () => nodo.remove() };
  }

  async function mandar(g: (typeof GESTOS)[number], e: MouseEvent) {
    if (enviando) return;
    toque(14);
    enviando = g.id;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!reducirMovimiento()) {
      const k = ++n;
      vuelos = [...vuelos, { k, emoji: g.emoji, x: r.left + r.width / 2, y: r.top + r.height / 2 }];
      setTimeout(() => (vuelos = vuelos.filter((v) => v.k !== k)), 1300);
    }
    const err = await saludar(relacion, g.id);
    enviando = null;
    if (err) { ui.avisar({ titulo: /ratico/.test(err) ? 'Ya le llegó' : 'No se pudo', sub: err, icono: /ratico/.test(err) ? 'info' : 'alerta' }); return; }
    toque(18);
    ui.avisar({ titulo: `${g.emoji} ¡Le llegó a ${nombre}!`, sub: 'Queda en la actividad de los dos' });
  }
</script>

{#if titulo}<p class="g-tit">{titulo}</p>{/if}
<div class="gestos" class:compacto role="group" aria-label="Mandarle algo a {nombre}">
  {#each GESTOS as g (g.id)}
    <button class="gesto" style="--c:{g.color}" disabled={!!enviando} onclick={(e) => mandar(g, e)} aria-label="{g.nombre} para {nombre}">
      <span class="e" class:latido={enviando === g.id}>{g.emoji}</span>
      {#if !compacto}<small>{corto(g.nombre)}</small>{/if}
    </button>
  {/each}
</div>

<div class="capa-vuelos" use:alCuerpo aria-hidden="true">
  {#each vuelos as v (v.k)}<span class="vuela" style="left:{v.x}px;top:{v.y}px">{v.emoji}</span>{/each}
</div>

<style>
  .g-tit { margin: 0 0 8px; font-family: var(--q-font-fiesta); font-size: 14px; font-weight: 800; color: inherit; opacity: 0.85; }
  .gestos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-family: var(--q-font-fiesta); }
  .gesto { min-width: 0; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 5px; height: 50px; padding: 0 6px; border: 0; border-radius: 10px; background: var(--c); color: var(--q-fiesta-tinta); font-family: inherit; transition: transform var(--q-dur-fast) var(--q-spring); }
  .gesto:active { transform: scale(0.9); }
  .gesto:disabled { opacity: 0.7; }
  .e { font-size: 22px; line-height: 1; flex-shrink: 0; }
  .gesto small { font-size: 13px; font-weight: 900; line-height: 1.05; text-align: left; min-width: 0; }
  .compacto { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .compacto::-webkit-scrollbar { display: none; }
  .compacto .gesto { flex-shrink: 0; width: 42px; height: 38px; padding: 0; border-radius: 10px; justify-content: center; }
  .compacto .e { font-size: 20px; }
  .latido { animation: latido 0.6s ease-in-out infinite; }
  @keyframes latido { 50% { transform: scale(1.25); } }
  .capa-vuelos { position: fixed; inset: 0; pointer-events: none; z-index: 13000; }
  .vuela { position: fixed; font-size: 34px; line-height: 1; transform: translate(-50%, -50%); animation: vuela 1.25s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
  @keyframes vuela {
    0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
    15% { transform: translate(-50%, -80%) scale(1.4); opacity: 1; }
    100% { transform: translate(calc(-50% + 40px), -420px) scale(2.2) rotate(18deg); opacity: 0; }
  }
</style>
