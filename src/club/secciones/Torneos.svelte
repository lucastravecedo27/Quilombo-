<script lang="ts">
  // Torneos del club: el calendario del mes, cada torneo con sus inscritos (pagaron con tarjeta, subieron comprobante
  // para revisar, rechazados), los resultados oficiales que digita el club y crear torneos nuevos, que salen de una en el
  // calendario de los jugadores.
  import { datos } from '$lib/data/datos.svelte';
  import { aprobarInscripcion, cerrarInscripciones, crearTorneo, detallesTorneo, inscripcionesDe, rechazarInscripcion, torneosDe } from '$lib/club/app/club';
  import { CLUB_DEMO } from '$lib/club/domain/club';
  import { registrarOficial } from '$lib/social/app/resultados';
  import { CATEGORIAS } from '$lib/social/domain/padel';
  import { ganadorDeSets, type Resultado } from '$lib/social/domain/ranking';
  import { cuando, diaColombia, pesos, type Inscripcion, type Torneo } from '$lib/social/domain/jugar';
  import { panel } from '../estado.svelte';

  const lista = $derived(torneosDe());
  const t = $derived(lista.find((x) => x.id === panel.torneo) ?? lista.find((x) => x.estado !== 'terminado') ?? lista[0] ?? null);
  const fechaCrea = (i: Inscripcion) => i.created_at ?? '';
  const inscritos = $derived(t ? inscripcionesDe(t.id).slice().sort((a, b) => fechaCrea(b).localeCompare(fechaCrea(a))) : []);
  const nombre = (uid: string | null) => (uid ? (datos.perfiles.find((p) => p.user_id === uid)?.nombre as string | undefined) ?? 'Jugador' : 'Sin pareja');
  const pareja = (i: Inscripcion) => `${nombre(i.user_id)}${i.pareja ? ` & ${nombre(i.pareja)}` : ''}`;
  const pagadas = $derived(inscritos.filter((i) => i.estado === 'inscrito'));
  const recaudado = $derived(t ? pagadas.length * t.precio : 0);
  const porRevisarT = (tid: string) => inscripcionesDe(tid).filter((i) => i.estado === 'comprobante').length;
  const ESTADO_T = { inscripciones: 'Inscripciones abiertas', en_juego: 'En juego', terminado: 'Terminado' } as const;
  const fecha = (iso: string) => cuando(iso).split(' · ')[0];
  let pestana = $state<'inscritos' | 'resultados' | 'info'>('inscritos');

  // ── Calendario: 5 semanas desde el lunes de esta semana
  const hoy = $derived(diaColombia(new Date(panel.ahora).toISOString()));
  const semanas = $derived.by(() => {
    const d0 = new Date(hoy + 'T12:00:00Z');
    const lunes = new Date(d0.getTime() - ((d0.getUTCDay() + 6) % 7) * 86_400_000);
    return Array.from({ length: 35 }, (_, k) => new Date(lunes.getTime() + k * 86_400_000).toISOString().slice(0, 10));
  });
  const COLORES = ['linear-gradient(150deg, #d3521a, #a8370a)', 'linear-gradient(150deg, #3d4fc0, #27338a)', 'linear-gradient(150deg, #1f9a68, #136a47)', 'linear-gradient(150deg, #c79a12, #8c6a00)', 'linear-gradient(150deg, #2a8de0, #165d9c)', 'linear-gradient(150deg, #e2566a, #b02a3e)'];
  const colorDe = (id: string) => COLORES[Math.max(0, lista.findIndex((x) => x.id === id)) % COLORES.length];
  const enDia = (d: string) => lista.filter((x) => diaColombia(x.inicio) <= d && diaColombia(x.fin) >= d);
  const mesTitulo = $derived(new Date(semanas[10] + 'T12:00:00Z').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }));

  // ── Comprobante
  let revisando = $state<Inscripcion | null>(null);
  let rechazando = $state(false);
  let motivo = $state('');
  async function aprobar() {
    if (!revisando) return;
    await aprobarInscripcion(revisando.id);
    revisando = null;
  }
  const MOTIVOS = ['El monto no coincide', 'Comprobante ilegible', 'Cuenta equivocada'];
  async function rechazar(m = motivo) {
    if (!revisando) return;
    await rechazarInscripcion(revisando.id, m.trim());
    revisando = null; rechazando = false; motivo = '';
  }

  // ── Resultados oficiales
  const oficiales = $derived(t ? (datos.resultados as Resultado[]).filter((r) => r.torneo_id === t.id).sort((a, b) => b.created_at.localeCompare(a.created_at)) : []);
  let rA = $state(''), rB = $state('');
  let sets = $state<[string, string][]>([['', ''], ['', ''], ['', '']]);
  let msgRes = $state('');
  const setsNum = $derived(sets.filter(([a, b]) => a !== '' && b !== '').map(([a, b]) => [Number(a), Number(b)] as [number, number]));
  const ganaRes = $derived(ganadorDeSets(setsNum));
  const parejaDe = (iid: string) => inscritos.find((i) => i.id === iid);
  const equipo = (i: Inscripcion | undefined) => (i ? [i.user_id, ...(i.pareja ? [i.pareja] : [])] : []);
  const listoRes = $derived(!!rA && !!rB && rA !== rB && !!ganaRes);
  async function registrar() {
    if (!t || !listoRes) return;
    const err = await registrarOficial({ torneo_id: t.id, club_id: CLUB_DEMO, equipo_a: equipo(parejaDe(rA)), equipo_b: equipo(parejaDe(rB)), sets: setsNum });
    msgRes = err ?? '✓ Resultado oficial registrado: sumó al ranking de los cuatro';
    if (!err) { rA = ''; rB = ''; sets = [['', ''], ['', ''], ['', '']]; }
    setTimeout(() => (msgRes = ''), 5000);
  }
  const nombresEq = (us: string[]) => us.map((u) => nombre(u).split(' ')[0]).join(' & ');

  // ── Nuevo torneo
  let creando = $state(false);
  const enDias = (k: number) => diaColombia(new Date(panel.ahora + k * 86_400_000).toISOString());
  const vacio = () => ({ nombre: '', inicio: enDias(14), fin: enDias(15), cierre: enDias(11), categorias: [4, 5] as number[], cupos: '16', precio: '150000', formato: 'Grupos + eliminación directa', premios: '', descripcion: '', cuenta: 'Nequi 300 555 7070 · Pádel Club La 70' });
  let f = $state(vacio());
  function abrirNuevo() { f = vacio(); creando = true; }
  const alternarCat = (c: number) => (f.categorias = f.categorias.includes(c) ? f.categorias.filter((x) => x !== c) : [...f.categorias, c].sort());
  const valido = $derived(!!f.nombre.trim() && !!f.inicio && !!f.fin && f.fin >= f.inicio && !!f.cierre && f.categorias.length > 0 && Number(f.cupos) > 1);
  const iso = (d: string, h: string) => new Date(`${d}T${h}:00-05:00`).toISOString();
  async function crear() {
    if (!valido) return;
    const id = await crearTorneo({ nombre: f.nombre.trim(), inicio: iso(f.inicio, '08:00'), fin: iso(f.fin, '20:00'), cierre: iso(f.cierre, '23:59'), categorias: [...f.categorias], cupos: Math.round(Number(f.cupos)), precio: Math.round(Number(f.precio) || 0) });
    await detallesTorneo(id, { formato: f.formato.trim() || null, premios: f.premios.trim() || null, descripcion: f.descripcion.trim() || null, cuenta_pago: f.cuenta.trim() || null });
    panel.torneo = id;
    creando = false;
    pestana = 'inscritos';
  }
  const elegir = (x: Torneo) => { panel.torneo = x.id; creando = false; };
  const textoFecha = (x: Torneo) => {
    const a = new Date(x.inicio), b = new Date(x.fin);
    const f = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('es-CO', { ...o, timeZone: 'America/Bogota' }).replace(/\./g, '').toUpperCase();
    return diaColombia(x.inicio) === diaColombia(x.fin) ? `${f(a, { weekday: 'short', day: 'numeric', month: 'short' })}` : `${f(a, { day: 'numeric' })} – ${f(b, { day: 'numeric', month: 'short' })}`;
  };
</script>

<header class="c-cab">
  <div>
    <span class="c-sobre">Calendario del club · {mesTitulo}</span>
    <h1 class="c-titulo c-h1">Torneos</h1>
  </div>
  <button class="c-btn sec grande" onclick={abrirNuevo}>＋ Crear torneo</button>
</header>

<div class="torneos">
  {#each lista as x (x.id)}
    {@const rev = porRevisarT(x.id)}
    <button class="torneo" class:on={t?.id === x.id && !creando} style="--g:{colorDe(x.id)}" onclick={() => elegir(x)}>
      <span class="aro" aria-hidden="true"></span>
      <small>{textoFecha(x)}</small>
      <b class="c-titulo">{x.nombre}</b>
      <small class="det">{x.inscritos} de {x.cupos} parejas · {x.precio ? `${pesos(x.precio).replace('$ ', '$')} por pareja` : 'Gratis'}</small>
      {#if rev}<span class="rev">🧾 {rev} comprobante{rev === 1 ? '' : 's'} por revisar</span>{/if}
    </button>
  {:else}
    <p class="c-vacio">Aún no hay torneos. Crea el primero.</p>
  {/each}
</div>

{#if creando}
  <section class="c-tarjeta panel-t">
    <header class="ph"><h2 class="c-sec">Nuevo torneo</h2><small>Apenas lo abras sale en el calendario de los jugadores de la ciudad.</small></header>
    <div class="form">
      <label class="c-campo ancho">Nombre<input class="c-input" bind:value={f.nombre} placeholder="Ej. Copa La 70 · Noviembre" /></label>
      <label class="c-campo">Empieza<input class="c-input" type="date" bind:value={f.inicio} /></label>
      <label class="c-campo">Termina<input class="c-input" type="date" bind:value={f.fin} /></label>
      <label class="c-campo">Cierran inscripciones<input class="c-input" type="date" bind:value={f.cierre} /></label>
      <label class="c-campo">Cupos (parejas)<input class="c-input" type="number" min="2" bind:value={f.cupos} /></label>
      <label class="c-campo">Inscripción por pareja<input class="c-input" type="number" step="10000" min="0" bind:value={f.precio} /></label>
      <label class="c-campo">Formato<input class="c-input" bind:value={f.formato} placeholder="Americano, grupos + llaves…" /></label>
      <div class="c-campo ancho">Categorías (nivel)
        <div class="c-chips">
          {#each CATEGORIAS as c (c.id)}<button class="c-chip" class:on={f.categorias.includes(c.id)} aria-pressed={f.categorias.includes(c.id)} onclick={() => alternarCat(c.id)}>{c.id}ª · {c.nivel}</button>{/each}
        </div>
      </div>
      <label class="c-campo ancho">Premios<input class="c-input" bind:value={f.premios} placeholder="Ej. $ 2.000.000 en premios + palas" /></label>
      <label class="c-campo ancho">Descripción<textarea class="c-input" rows="2" bind:value={f.descripcion} placeholder="Lo que deben saber los jugadores"></textarea></label>
      <label class="c-campo ancho">Cuenta para el comprobante<input class="c-input" bind:value={f.cuenta} placeholder="Nequi / Bancolombia a nombre del club" /></label>
    </div>
    <div class="pie">
      <button class="c-btn sec" onclick={() => (creando = false)}>Cancelar</button>
      <button class="c-btn" disabled={!valido} onclick={crear}>Abrir inscripciones</button>
    </div>
  </section>
{:else if t}
  <section class="c-tarjeta panel-t">
    <header class="ph">
      <h2 class="c-sec">{pestana === 'inscritos' ? 'Inscritos' : pestana === 'resultados' ? 'Resultados' : 'Info'} · {t.nombre}</h2>
      <small>{t.formato ?? ''}{t.formato ? ' · ' : ''}{t.inscritos}/{t.cupos} parejas · recaudado {pesos(recaudado).replace('$ ', '$')}</small>
    </header>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={pestana === 'inscritos'} class:on={pestana === 'inscritos'} onclick={() => (pestana = 'inscritos')}>Inscritos · {inscritos.length}{#if porRevisarT(t.id)}<span class="pto">{porRevisarT(t.id)}</span>{/if}</button>
      <button role="tab" aria-selected={pestana === 'resultados'} class:on={pestana === 'resultados'} onclick={() => (pestana = 'resultados')}>Resultados · {oficiales.length}</button>
      <button role="tab" aria-selected={pestana === 'info'} class:on={pestana === 'info'} onclick={() => (pestana = 'info')}>Info</button>
      <button class="c-btn suave chico cerrar" onclick={() => cerrarInscripciones(t.id)}>{t.estado === 'inscripciones' ? 'Cerrar inscripciones' : 'Reabrir inscripciones'}</button>
    </div>

    {#if pestana === 'inscritos'}
      {#each inscritos as i (i.id)}
        <div class="ins" class:nueva={panel.inscNuevas.includes(i.id)}>
          <b>{pareja(i).replace(' & ', ' y ')}</b>
          <span class="cat">{i.categoria}ª</span>
          <span class="met">{i.metodo === 'comprobante' ? '📎 Comprobante' : i.metodo === 'tarjeta' ? '💳 Tarjeta' : i.metodo === 'saldo' ? '🛳️ Saldo' : '—'}</span>
          {#if i.estado === 'inscrito'}<span class="est ok">✓ Inscrito</span>
          {:else if i.estado === 'comprobante'}<span class="est wrn">⏳ Comprobante</span>
          {:else if i.estado === 'rechazada'}<span class="est mal">✕ Rechazado</span>
          {:else}<span class="est">Pendiente pago</span>{/if}
          <span class="acc">{#if i.comprobante}<button class="c-btn chico {i.estado === 'comprobante' ? '' : 'suave'}" onclick={() => { revisando = i; rechazando = false; motivo = ''; }}>{i.estado === 'comprobante' ? 'Revisar comprobante' : 'Ver comprobante'}</button>{/if}</span>
        </div>
      {:else}
        <p class="c-vacio">Nadie se ha inscrito todavía. Ya aparece en el calendario de los jugadores.</p>
      {/each}
    {:else if pestana === 'resultados'}
      <div class="form-res">
        <p class="meta">En los torneos el resultado lo digita el club: es oficial de una vez y suma al ranking nacional (cuenta más que un amistoso).</p>
        <div class="eqs">
          <label class="c-campo">Pareja A
            <select class="c-input" bind:value={rA}><option value="">Elige…</option>{#each pagadas as i (i.id)}<option value={i.id} disabled={i.id === rB}>{pareja(i)}</option>{/each}</select>
          </label>
          <span class="vs c-titulo">VS</span>
          <label class="c-campo">Pareja B
            <select class="c-input" bind:value={rB}><option value="">Elige…</option>{#each pagadas as i (i.id)}<option value={i.id} disabled={i.id === rA}>{pareja(i)}</option>{/each}</select>
          </label>
        </div>
        <div class="sets">
          {#each sets as st, k (k)}
            <div class="set"><span class="c-mini">Set {k + 1}</span><input class="c-input" type="number" min="0" max="7" bind:value={st[0]} aria-label="Set {k + 1} pareja A" /><span>-</span><input class="c-input" type="number" min="0" max="7" bind:value={st[1]} aria-label="Set {k + 1} pareja B" /></div>
          {/each}
          <button class="c-btn" disabled={!listoRes} onclick={registrar}>{ganaRes ? `Registrar · gana pareja ${ganaRes.toUpperCase()}` : 'Registrar resultado'}</button>
        </div>
        {#if msgRes}<p class="ok-msg">{msgRes}</p>{/if}
      </div>
      {#each oficiales as r (r.id)}
        <div class="res">
          <span class="eq" class:gana={r.ganador === 'a'}>{nombresEq(r.equipo_a)}</span>
          <span class="marc c-num">{r.sets.map(([a, b]) => `${a}-${b}`).join('  ')}</span>
          <span class="eq der" class:gana={r.ganador === 'b'}>{nombresEq(r.equipo_b)}</span>
          <span class="c-insignia ok">Oficial</span>
        </div>
      {:else}
        <p class="c-vacio">Aún no hay resultados de este torneo.</p>
      {/each}
    {:else}
      <dl class="info">
        <dt>Fechas</dt><dd>{fecha(t.inicio)} – {fecha(t.fin)} · cierre {fecha(t.cierre)}</dd>
        <dt>Categorías</dt><dd>{t.categorias.map((c) => c + 'ª').join(' · ')}</dd>
        <dt>Formato</dt><dd>{t.formato ?? '—'}</dd>
        <dt>Premios</dt><dd>{t.premios ?? '—'}</dd>
        <dt>Descripción</dt><dd>{t.descripcion ?? '—'}</dd>
        <dt>Cuenta para comprobante</dt><dd>{t.cuenta_pago ?? '—'}</dd>
      </dl>
    {/if}
  </section>
{/if}

{#if revisando}
  {@const tr = lista.find((x) => x.id === revisando?.torneo_id)}
  <div class="c-modal-fondo" role="presentation" onclick={() => (revisando = null)}></div>
  <div class="c-modal comp" role="dialog" aria-label="Revisar comprobante">
    <img src={revisando.comprobante} alt="Comprobante de pago" />
    <div class="lado-c">
      <span class="c-sobre">Comprobante de pago</span>
      <h3 class="c-titulo">{pareja(revisando).replace(' & ', ' y ')}</h3>
      <dl>
        <dt>Torneo</dt><dd>{tr?.nombre}</dd>
        <dt>Categoría</dt><dd>{revisando.categoria}ª</dd>
        <dt>Debe pagar</dt><dd><b>{tr ? pesos(tr.precio) : ''}</b></dd>
        <dt>A la cuenta</dt><dd>{tr?.cuenta_pago ?? '—'}</dd>
        <dt>Enviado</dt><dd>{revisando.created_at ? cuando(revisando.created_at) : ''}</dd>
      </dl>
      {#if revisando.estado === 'comprobante'}
        {#if rechazando}
          <div class="motivos">
            {#each MOTIVOS as m (m)}<button class="motivo" onclick={() => rechazar(m)}>{m}</button>{/each}
          </div>
          <div class="fila-b"><input class="c-input" bind:value={motivo} placeholder="Otro motivo…" aria-label="Otro motivo" /><button class="c-btn rojo" disabled={!motivo.trim()} onclick={() => rechazar()}>Rechazar</button></div>
        {/if}
        <div class="fila-b abajo">
          <button class="c-btn verde alto" onclick={aprobar}>✓ Aprobar</button>
          <button class="c-btn alto rechazo" onclick={() => (rechazando = !rechazando)}>Rechazar con motivo</button>
        </div>
      {:else}
        <p class="meta">{revisando.estado === 'inscrito' ? '✓ Ya aprobado' : revisando.estado === 'rechazada' ? `Rechazado: ${revisando.nota_club ?? ''}` : ''}</p>
        <button class="c-btn sec" onclick={() => (revisando = null)}>Cerrar</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .grande { height: 46px; font-size: 15px; font-weight: 900; }
  .torneos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
  .torneo { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 0; border-radius: 16px; background: var(--g); color: #fff; text-align: left; overflow: hidden; min-height: 150px; }
  .torneo.on { box-shadow: 0 0 0 3px var(--q-noche), 0 12px 30px rgba(14, 27, 51, 0.25); }
  .aro { position: absolute; right: -30px; top: -30px; width: 110px; height: 110px; border-radius: 50%; border: 16px solid rgba(255, 255, 255, 0.14); }
  .torneo small { position: relative; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; opacity: 0.85; }
  .torneo b { position: relative; font-size: 26px; line-height: 1; }
  .torneo .det { font-size: 13px; letter-spacing: 0; font-weight: 700; opacity: 0.9; }
  .rev { position: relative; align-self: flex-start; margin-top: 6px; padding: 4px 9px; border-radius: 8px; background: #fff; color: var(--q-noche); font-size: 12px; font-weight: 900; animation: c-pulso 1.6s infinite; }

  .panel-t { overflow: hidden; }
  .ph { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 14px 16px; }
  .ph small { font-size: 12.5px; color: var(--q-tx2); }
  .tabs { display: flex; align-items: center; gap: 4px; padding: 0 16px 10px; }
  .tabs [role='tab'] { height: 32px; padding: 0 12px; border: 0; border-radius: 8px; background: none; font-size: 13px; font-weight: 800; color: var(--q-tx2); display: inline-flex; align-items: center; gap: 6px; }
  .tabs [role='tab'].on { background: var(--q-accs); color: var(--q-acct); }
  .pto { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--q-acc); color: var(--q-acctx); font-size: 11px; display: inline-flex; align-items: center; justify-content: center; }
  .cerrar { margin-left: auto; }
  .ins { display: grid; grid-template-columns: 2.2fr 0.7fr 1fr 1.2fr 1.2fr; gap: 10px; align-items: center; padding: 11px 16px; border-top: 1px solid rgba(14, 27, 51, 0.08); }
  .ins.nueva { animation: c-resalta 4s ease-out; }
  .ins b { font-size: 14.5px; }
  .cat { font-size: 13.5px; font-weight: 800; }
  .met { font-size: 13px; color: var(--q-tx2); }
  .est { justify-self: start; padding: 4px 9px; border-radius: 8px; background: var(--q-sub); color: var(--q-tx2); font-size: 12px; font-weight: 900; white-space: nowrap; }
  .est.ok { background: rgba(60, 207, 142, 0.16); color: var(--c-verde); }
  .est.wrn { background: rgba(255, 194, 71, 0.16); color: var(--c-oro); }
  .est.mal { background: rgba(232, 71, 91, 0.16); color: var(--c-error); }
  .acc { justify-self: end; }

  .form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 0 16px 14px; }
  .ancho { grid-column: 1 / -1; }
  .pie { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 16px; }
  .form-res { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(14, 27, 51, 0.08); padding-top: 12px; }
  .meta { margin: 0; font-size: 13px; color: var(--q-tx2); }
  .eqs { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: end; }
  .vs { font-size: 26px; padding-bottom: 6px; }
  .sets { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; }
  .set { display: flex; align-items: center; gap: 6px; }
  .set .c-input { width: 54px; text-align: center; }
  .ok-msg { margin: 0; color: var(--c-verde); font-weight: 800; font-size: 13.5px; }
  .res { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-top: 1px solid rgba(14, 27, 51, 0.08); font-size: 14px; }
  .eq { flex: 1; color: var(--q-tx2); }
  .eq.gana { color: var(--q-tx); font-weight: 900; }
  .eq.der { text-align: right; }
  .marc { font-size: 20px; }
  .info { display: grid; grid-template-columns: 200px 1fr; gap: 10px 16px; margin: 0; padding: 4px 16px 18px; font-size: 14px; }
  .info dt { font-weight: 800; color: var(--q-tx2); font-size: 13px; }
  .info dd { margin: 0; }

  .comp { width: 720px; display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
  .comp img { width: 100%; border-radius: 12px; border: var(--c-borde); background: var(--q-bg); }
  .lado-c { display: flex; flex-direction: column; gap: 10px; }
  .lado-c h3 { font-size: 30px; }
  .lado-c dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 0; font-size: 13.5px; }
  .lado-c dt { color: var(--q-tx2); font-weight: 700; }
  .lado-c dd { margin: 0; }
  .motivos { display: flex; flex-wrap: wrap; gap: 6px; }
  .motivo { height: 36px; padding: 0 12px; border: 1px solid rgba(232, 71, 91, 0.5); border-radius: 9px; background: rgba(232, 71, 91, 0.1); font-size: 13px; font-weight: 800; }
  .fila-b { display: flex; gap: 8px; }
  .fila-b.abajo { margin-top: auto; }
  .alto { flex: 1; height: 50px; font-size: 16px; border-radius: 12px; }
  .rechazo { background: none; border: 1px solid rgba(232, 71, 91, 0.5); color: var(--c-error); }
  .rojo { background: var(--c-error); color: #fff; }
</style>
