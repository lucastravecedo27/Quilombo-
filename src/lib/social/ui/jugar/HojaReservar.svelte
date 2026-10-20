<script lang="ts">
  // Reservar una cancha libre: todo lo de la reserva a la vista (club, cancha, día, hora, 90 min, precio), con quién
  // juegas (opcional: se puede reservar solo) y dos caminos: apartar y pagar después, o reservar y pagar ya.
  import Hoja from '$lib/ui/Hoja.svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import { franjaCompleta, pagarCancha, reservarCancha } from '../../app/jugar';
  import { genteActiva, primerNombre } from '../../app/rituales';
  import { nombreDe, perfilDe } from '../../app/vinculos';
  import FotoPerfil from '../perfil/FotoPerfil.svelte';
  import { horaColombia, pesos } from '../../domain/jugar';

  let abierto = $state(false);
  let fid = $state<string | null>(null);
  let con = $state<string[]>([]);
  let enviando = $state(false);
  let error = $state('');

  $effect(() => {
    const r = ui.reservar;
    if (!r) return;
    fid = r.franja; con = []; error = ''; abierto = true;
  });
  const f = $derived(franjaCompleta(fid));
  const gente = $derived(genteActiva());
  const dia = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).replace(/\./g, '');
  const alternar = (u: string) => { toque(4); con = con.includes(u) ? con.filter((x) => x !== u) : [...con, u]; };

  async function reservar(yPagar: boolean) {
    if (!f || enviando) return;
    enviando = true; error = '';
    const precio = f.precio, club = f.club.nombre, cancha = f.cancha.nombre;
    const r = await reservarCancha(f.id, $state.snapshot(con));
    enviando = false;
    if (r.error || !r.id) { error = r.error ?? 'No se pudo reservar'; return; }
    const pid = r.id;
    toque(18);
    abierto = false;
    ui.navegar(`/partido/${pid}/`);
    if (yPagar) {
      setTimeout(() => {
        ui.pagar = {
          concepto: `${club} · ${cancha}`, detalle: 'Reserva de cancha · 90 min', monto: precio, listo: '¡Reserva confirmada! Nos vemos en la cancha 🎾',
          accion: async (m) => (await pagarCancha(pid, m)).error ?? null
        };
      }, 450);
    } else {
      ui.avisar({ titulo: '¡Cancha apartada! 🎾', sub: 'Tienes 2 horas para pagarla', icono: 'check' });
    }
  }
</script>

<Hoja bind:abierto titulo="Reservar cancha" sub={f ? `${f.club.nombre} · ${f.club.direccion ?? f.club.zona ?? f.club.ciudad}` : 'Turno de 90 minutos'} alCerrar={() => (ui.reservar = null)}>
  {#if f}
    <div class="resumen">
      <span class="r-izq"><small>{dia(f.inicio)}</small><b>{horaColombia(f.inicio)}</b><small class="hasta">hasta {horaColombia(f.fin)} · 90 min</small></span>
      <span class="r-der"><small>PRECIO</small><b>{pesos(f.precio)}</b></span>
    </div>

    <p class="lbl">Cancha · {f.cancha.nombre}</p>
    <div class="tipos" aria-label="Cómo es la cancha">
      <span class:on={f.cancha.techada}>Techada</span>
      <span class:on={f.cancha.tipo === 'cristal' || f.cancha.tipo === 'muro'}>{f.cancha.tipo === 'muro' ? 'Muro' : 'Cristal'}</span>
      <span class:on={f.cancha.tipo === 'panoramica'}>Panorámica</span>
    </div>

    <p class="lbl">¿Con quién juegas? (opcional)</p>
    {#if gente.length}
      <div class="con">
        {#each gente as u (u)}
          <button class:on={con.includes(u)} aria-pressed={con.includes(u)} aria-label={primerNombre(nombreDe(u))} onclick={() => alternar(u)}>
            <span class="av"><FotoPerfil perfil={perfilDe(u) ?? { nombre: nombreDe(u), color: '#1e7fd0' }} size={48} /></span>
            <small>{primerNombre(nombreDe(u))}</small>
          </button>
        {/each}
      </div>
      <p class="nota">{con.length ? `Les llega la invitación a ${con.length === 1 ? primerNombre(nombreDe(con[0])) : `${con.length} personas`}.` : 'Puedes reservar solo e invitar después.'}</p>
    {:else}
      <p class="nota">Puedes reservar solo e invitar después.</p>
    {/if}
    {#if error}<p class="err">{error}</p>{/if}
  {/if}
  {#snippet pie()}
    <div class="botones">
      <button class="q-btn bloque" disabled={!f || enviando} onclick={() => reservar(true)}>Reservar y pagar · {f ? pesos(f.precio) : ''}</button>
      <button class="q-btn bloque suave" disabled={!f || enviando} onclick={() => reservar(false)}>Apartar (pagas después)</button>
    </div>
  {/snippet}
</Hoja>

<style>
  .resumen { display: flex; align-items: stretch; border-radius: 16px; background: #0e1b33; color: #fff; overflow: hidden; }
  :global(html.dark) .resumen { box-shadow: inset 0 0 0 1px rgba(220, 230, 255, 0.12); }
  .r-izq { flex: 1; min-width: 0; padding: 14px 16px; display: flex; flex-direction: column; }
  .r-izq small { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; opacity: 0.7; text-transform: uppercase; }
  .r-izq b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 36px; line-height: 1; text-transform: uppercase; }
  .r-izq .hasta { font-size: 13px; opacity: 0.8; letter-spacing: 0; text-transform: none; font-weight: 600; }
  .r-der { padding: 14px 16px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; border-left: 1.5px dashed rgba(255, 255, 255, 0.2); }
  .r-der small { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; opacity: 0.7; }
  .r-der b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 30px; line-height: 1; }
  .lbl { margin: 14px 0 8px; font-size: 11.5px; font-weight: 800; color: var(--q-tx2); text-transform: uppercase; letter-spacing: 0.1em; }
  .tipos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .tipos span { height: 40px; border: 1.5px solid var(--q-line); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 13.5px; font-weight: 900; color: var(--q-tx3); }
  .tipos span.on { border-color: var(--q-acc); background: var(--q-accs); color: var(--q-tx); }
  .con { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; padding: 4px 2px; }
  .con button { flex: none; display: flex; flex-direction: column; align-items: center; gap: 4px; border: 0; background: none; padding: 0; color: var(--q-tx); }
  .av { display: inline-flex; border-radius: 50%; opacity: 0.55; transition: opacity var(--q-dur-fast), box-shadow var(--q-dur-fast); }
  .on .av { opacity: 1; box-shadow: 0 0 0 2.5px var(--q-card), 0 0 0 4.5px var(--q-acc); }
  .con small { font-size: 12px; font-weight: 800; }
  .nota { font-size: 13.5px; color: var(--q-tx2); margin: 8px 0 0; }
  .err { color: var(--q-alr); font-size: 13.5px; }
  .botones { display: flex; flex-direction: column; gap: 8px; }
</style>
