<script lang="ts">
  // Un resultado: aviso de estado, marcador estilo TV (las dos parejas y sus sets), quién lo propuso y qué dijo cada
  // uno. Para que nadie haga trampa, un partido amistoso solo vale cuando los cuatro confirman; si alguno no está de
  // acuerdo, lo resuelve el club.
  import { Page } from 'framework7-svelte';
  import { ui } from '$lib/app/ui.svelte';
  import { toque } from '$lib/ui/tema.svelte';
  import Cabecera from '../ui/ranking/Cabecera.svelte';
  import FotoPerfil from '../ui/perfil/FotoPerfil.svelte';
  import { elClub } from '$lib/club/app/club';
  import { confirmarResultado, resultado } from '../app/resultados';
  import { nombreDe, perfilDe, yo } from '../app/vinculos';
  import { franjaCompleta, partido, torneo } from '../app/jugar';
  import { faltanPorConfirmar, participantes } from '../domain/ranking';
  import { hace } from '../app/rituales';

  let { id }: { id: string } = $props();
  const r = $derived(resultado(id));
  const club = $derived(r?.club_id ? elClub(r.club_id) : null);
  const juego = $derived(!!r && participantes(r).includes(yo()));
  const meToca = $derived(!!r && juego && r.estado === 'pendiente' && !r.confirmaciones[yo()]);
  const faltan = $derived(r ? faltanPorConfirmar(r) : []);
  const total = $derived(r ? participantes(r).length : 0);
  const nombre = (u: string) => (u === yo() ? 'Tú' : nombreDe(u));
  const corto = (u: string) => (u === yo() ? 'Tú' : nombreDe(u).split(' ')[0]);
  const cara = (u: string) => perfilDe(u) ?? { nombre: nombreDe(u), color: '#1e7fd0' };
  const misPts = $derived(r?.puntos?.[yo()] ?? null);
  /** Dónde se jugó: el torneo, o el club y la cancha del partido */
  const lugar = $derived.by(() => {
    if (!r) return '';
    const t = r.torneo_id ? torneo(r.torneo_id) : null;
    const f = r.partido_id ? franjaCompleta(partido(r.partido_id)?.franja_id) : null;
    return [t?.nombre ?? (r.oficial ? 'Oficial' : 'Amistoso'), f?.club.nombre ?? club?.nombre ?? null, f?.cancha.nombre ?? null].filter(Boolean).join(' · ');
  });
  const banner = $derived.by(() => {
    if (!r) return null;
    if (r.estado === 'pendiente') return { ico: '⏳', t: `Vale cuando los ${total} confirmen`, s: `${total - faltan.length} de ${total} confirmaron · falta${faltan.length === 1 ? '' : 'n'} ${faltan.map(corto).join(' y ')}`, bg: '#a86b00' };
    if (r.estado === 'valido') return { ico: '✓', t: r.oficial ? 'Oficial · lo registró el club' : `Válido · confirmado por todos${misPts !== null ? ` · ${misPts > 0 ? '+' : ''}${misPts} pts` : ''}`, s: 'Ya cuenta para el ranking nacional', bg: '#18895b' };
    if (r.estado === 'disputado') return { ico: '⚖️', t: 'En disputa · lo resuelve el club', s: `${club?.nombre ?? 'El club donde jugaron'} lo revisa; mientras tanto no suma`, bg: '#e8475b' };
    return { ico: '✕', t: 'Anulado', s: `${club?.nombre ?? 'El club'} lo anuló: no cuenta para el ranking`, bg: '#5b6478' };
  });
  let noEstoy = $state(false);
  let motivo = $state('');
  let ocupado = $state(false);

  async function votar(v: 'si' | 'no') {
    if (ocupado) return;
    ocupado = true; toque(v === 'si' ? 16 : 8);
    const err = await confirmarResultado(id, v, v === 'no' ? motivo.trim() || null : null);
    ocupado = false; noEstoy = false;
    if (err) ui.avisar({ titulo: 'No se pudo', sub: err, icono: 'alerta' });
    else if (v === 'si') ui.avisar({ titulo: 'Confirmado ✓', sub: faltan.length > 1 ? 'Falta que confirmen los demás' : '¡Ya vale para el ranking!', icono: 'check' });
    else ui.avisar({ titulo: 'Quedó en disputa', sub: `Lo revisa ${club?.nombre ?? 'el club'}`, icono: 'info' });
  }
</script>

<Page name="resultado" class="pa-resultado" noNavbar>
  <Cabecera titulo="Resultado" />
  {#if !r || !banner}
    <p class="q-vacio">Este resultado ya no está.</p>
  {:else}
    <section class="estado {r.estado}" class:oficial={r.oficial} style="background:{banner.bg}" aria-live="polite">
      <span class="ico">{banner.ico}</span>
      <span class="txt"><b>{banner.t}</b><small>{banner.s}</small></span>
    </section>

    <section class="tv" aria-label="Marcador">
      <div class="tv-cab">
        <span class="lugar">{lugar}</span>
        <span class="sets-cab">{#each r.sets as _, k (k)}<span>S{k + 1}</span>{/each}</span>
      </div>
      {#each [['a', r.equipo_a], ['b', r.equipo_b]] as [lado, eq] (lado)}
        {@const gana = r.ganador === lado}
        <div class="pareja" class:gana>
          <span class="caras">{#each eq as u (u)}<span class="cara"><FotoPerfil perfil={cara(u)} size={30} /></span>{/each}</span>
          <span class="noms">{(eq as string[]).map(corto).join(' · ')}</span>
          <span class="sets">{#each r.sets as s, k (k)}<b class:gano={lado === 'a' ? s[0] > s[1] : s[1] > s[0]}>{lado === 'a' ? s[0] : s[1]}</b>{/each}</span>
        </div>
      {/each}
    </section>
    <small class="meta">{r.propuesto_por ? (r.propuesto_por === yo() ? 'Lo propusiste tú' : `Lo propuso ${nombreDe(r.propuesto_por)}`) : `Lo registró ${club?.nombre ?? 'el club'}`} · {hace(r.created_at)}</small>

    <h2>{r.oficial ? 'Jugadores' : 'Confirmaciones'}</h2>
    <div class="lista">
      {#each participantes(r) as u (u)}
        {@const c = r.confirmaciones[u]}
        {@const d = r.estado === 'valido' && r.puntos ? r.puntos[u] ?? 0 : null}
        <div class="conf">
          <FotoPerfil perfil={cara(u)} size={38} />
          <span class="cuerpo"><b>{nombre(u)}</b>{#if c === 'no' && r.motivo}<small>“{r.motivo}”</small>{/if}</span>
          {#if d !== null}
            <b class="pts" class:neg={d < 0}>{d > 0 ? '+' : ''}{d} pts</b>
          {:else if !r.oficial}
            <span class="voto {c ?? 'falta'}">{r.propuesto_por === u ? '✓ Lo propuso' : c === 'si' ? '✓ Confirmó' : c === 'no' ? '✖ No está de acuerdo' : '⏳ Falta'}</span>
          {/if}
        </div>
      {/each}
    </div>

    {#if meToca}
      {#if noEstoy}
        <div class="disputa">
          <textarea rows="2" maxlength="120" placeholder="¿Qué pasó? Ej.: el segundo set fue 6-4 para nosotros" bind:value={motivo} aria-label="Motivo"></textarea>
          <div class="dos">
            <button class="b-sub" onclick={() => (noEstoy = false)}>Volver</button>
            <button class="b-rojo" disabled={ocupado} onclick={() => votar('no')}>Enviar al club</button>
          </div>
        </div>
      {:else}
        <div class="dos botones">
          <button class="b-ok" disabled={ocupado} onclick={() => votar('si')}>✓ Confirmo</button>
          <button class="b-sub" disabled={ocupado} onclick={() => (noEstoy = true)}>No estoy de acuerdo</button>
        </div>
      {/if}
    {/if}
    {#if r.estado === 'valido'}
      <button class="b-noche" onclick={() => { toque(); ui.navegar('/ranking/'); }}>Ver cómo quedó el ranking ›</button>
    {/if}
  {/if}
  <div class="q-espacio-tabbar"></div>
</Page>

<style>
  :global(.page.pa-resultado .page-content) { font-family: var(--q-font); padding-top: 0 !important; }
  .estado { margin: 0 16px 12px; padding: 12px 14px; border-radius: 14px; color: #fff; display: flex; align-items: center; gap: 10px; }
  .ico { font-size: 22px; }
  .txt { display: flex; flex-direction: column; min-width: 0; }
  .txt b { font-size: 15.5px; font-weight: 800; }
  .txt small { font-size: 13px; opacity: 0.9; }
  .tv { margin: 0 16px; border-radius: 18px; background: #0e1b33; color: #fff; overflow: hidden; }
  :global(html.dark) .tv { background: var(--q-card); border: 1px solid var(--q-borde); }
  .tv-cab { display: flex; justify-content: space-between; gap: 10px; padding: 10px 14px; background: rgba(255, 255, 255, 0.06); font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  .lugar { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sets-cab { display: flex; gap: 16px; flex: none; }
  .sets-cab span { width: 28px; text-align: center; }
  .pareja { display: flex; align-items: center; gap: 10px; padding: 14px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
  .caras { display: flex; flex: none; }
  .cara { display: inline-flex; margin-right: -6px; border-radius: 50%; box-shadow: 0 0 0 2px #0e1b33; }
  .noms { flex: 1; min-width: 0; padding-left: 10px; font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gana .noms { font-weight: 900; }
  .sets { display: flex; gap: 16px; flex: none; }
  .sets b { width: 28px; text-align: center; font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 32px; line-height: 1; color: rgba(255, 255, 255, 0.45); }
  .sets b.gano { color: var(--q-accd); }
  .meta { display: block; margin: 10px 20px 0; font-size: 13px; color: var(--q-tx2); }
  h2 { margin: 22px 20px 10px; font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 22px; font-weight: 800; }
  .lista { margin: 0 16px; border-radius: 16px; background: var(--q-card); border: 1px solid var(--q-line); overflow: hidden; }
  .conf { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
  .conf + .conf { border-top: 1px solid var(--q-line); }
  .cuerpo { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .cuerpo b { font-size: 15px; font-weight: 800; }
  .cuerpo small { font-size: 12.5px; color: var(--q-tx2); }
  .voto { font-size: 13px; font-weight: 900; white-space: nowrap; }
  .voto.si { color: var(--q-ok); }
  .voto.no { color: var(--q-alr); }
  .voto.falta { color: var(--q-wrn); }
  .pts { font-size: 14px; font-weight: 900; color: var(--q-ok); }
  .pts.neg { color: var(--q-alr); }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .botones { margin: 16px 16px 0; }
  .disputa { margin: 16px 16px 0; display: flex; flex-direction: column; gap: 8px; }
  .disputa textarea { border: 0; border-radius: 12px; background: var(--q-sub); color: var(--q-tx); padding: 12px 14px; font: inherit; font-size: 16px; outline: none; resize: none; }
  .b-ok, .b-sub, .b-rojo, .b-noche { height: 52px; border: 0; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 900; }
  .b-ok { background: var(--q-ok); color: #fff; font-size: 16px; }
  .b-sub { background: var(--q-sub); color: var(--q-tx); }
  .b-rojo { background: var(--q-alr); color: #fff; }
  .b-noche { display: block; width: calc(100% - 32px); margin: 16px 16px 0; background: var(--q-noche); color: #fff; font-size: 16px; animation: q-pop 0.5s var(--q-spring) both; }
  :global(html.dark) .b-noche { background: var(--q-sub); }
  button:disabled { opacity: 0.5; }
</style>
