<script lang="ts">
  // Agregar a alguien a tu gente (desde el buscador o un link ?amigo=): ¿qué es para ti? amigo, pareja de juego o rival.
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { proponer, verJugador } from '../../app/vinculos';
  import { TIPOS, type TipoVinculo } from '../../domain/vinculos';

  let abierto = $state(false);
  let vista = $state<{ nombre: string; color: string; soyYo: boolean; yaRelacion: string | null } | null>(null);
  let error = $state('');
  let enviando = $state(false);
  let elegido = $state<TipoVinculo>('amigo');

  $effect(() => {
    const a = ui.agregar;
    if (!a) return;
    abierto = true; vista = null; error = ''; elegido = 'amigo';
    void verJugador(a.codigo).then((r) => { if ('error' in r) error = r.error; else vista = r; });
  });

  async function enviar() {
    const a = ui.agregar;
    if (!a || enviando) return;
    enviando = true;
    const err = await proponer(a.codigo, elegido, null, a.qr);
    enviando = false;
    if (err) { error = err; return; }
    toque(18);
    ui.avisar({ titulo: 'Solicitud enviada', sub: `Cuando ${vista?.nombre.split(' ')[0] ?? 'acepte'} acepte, quedan conectados`, icono: 'check' });
    abierto = false;
  }
</script>

<Hoja bind:abierto titulo="Agregar a tu gente" sub={vista ? vista.nombre : 'Buscando…'} alCerrar={() => (ui.agregar = null)}>
  {#if error}
    <p class="err">{error}</p>
  {:else if vista?.soyYo}
    <p class="err">Ese eres tú 😅</p>
  {:else if vista?.yaRelacion}
    <p class="nota">{vista.yaRelacion === 'activa' ? 'Ya están conectados.' : 'Ya hay una solicitud pendiente.'}</p>
  {:else if vista}
    <p class="pregunta">¿Qué es {vista.nombre.split(' ')[0]} para ti?</p>
    <div class="tipos" role="radiogroup" aria-label="Tipo de relación">
      {#each TIPOS as t (t.id)}
        <button role="radio" aria-checked={elegido === t.id} class:on={elegido === t.id} style="--c:{t.color}" onclick={() => { toque(4); elegido = t.id; }}>
          <b>{t.nombre}</b><small>{t.desbloquea[0]}</small>
        </button>
      {/each}
    </div>
    <button class="q-btn bloque" disabled={enviando} onclick={enviar}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
  {/if}
</Hoja>

<style>
  .err { color: var(--q-alr); font-size: 15px; }
  .nota, .pregunta { font-size: 15px; font-weight: 800; color: var(--q-tx2); }
  .tipos { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; font-family: var(--q-font-fiesta); }
  .tipos button { border: 0; border-radius: 10px; padding: 12px 14px; background: var(--q-sub); color: var(--q-tx); text-align: left; display: flex; flex-direction: column; gap: 2px; }
  .tipos button.on { background: var(--c); color: var(--q-fiesta-tinta); }
  .tipos b { font-size: 16px; font-weight: 900; }
  .tipos small { font-size: 13px; font-weight: 700; opacity: 0.8; }
</style>
